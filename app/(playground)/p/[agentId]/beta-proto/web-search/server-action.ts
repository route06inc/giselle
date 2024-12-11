"use server";

import { langfuseModel } from "@/lib/llm";
import {
	ExternalServiceName,
	createLogger,
	withCountMeasurement,
	withTokenMeasurement,
} from "@/lib/opentelemetry";
import { fetchCurrentUser } from "@/services/accounts/fetch-current-user";
import { openai } from "@ai-sdk/openai";
import FirecrawlApp from "@mendable/firecrawl-js";
import { createId } from "@paralleldrive/cuid2";
import { put } from "@vercel/blob";
import { waitUntil } from "@vercel/functions";
import { streamObject } from "ai";
import { createStreamableValue } from "ai/rsc";
import Langfuse from "langfuse";
import type { GiselleNode } from "../giselle-node/types";
import type { SourceIndex } from "../source/types";
import { sourceIndexesToSources, sourcesToText } from "../source/utils";
import type { AgentId } from "../types";
import type { FirecrawlResponse } from "./firecrawl";
import { webSearchSchema } from "./schema";
import { type WebSearchResult, search } from "./tavily";
import {
	type WebSearch,
	type WebSearchItemReference,
	webSearchItemStatus,
	webSearchStatus,
} from "./types";

interface GenerateWebSearchStreamInputs {
	agentId: AgentId;
	userPrompt: string;
	systemPrompt?: string;
	node: GiselleNode;
	sourceIndexes: SourceIndex[];
}
export async function generateWebSearchStream(
	inputs: GenerateWebSearchStreamInputs,
) {
	const startTime = performance.now();
	const lf = new Langfuse();
	const currentUser = await fetchCurrentUser();
	const trace = lf.trace({
		id: `giselle-${Date.now()}`,
		userId: currentUser.dbId.toString(),
	});

	const logger = createLogger("web-search");
	const sources = await sourceIndexesToSources({
		input: {
			agentId: inputs.agentId,
			sourceIndexes: inputs.sourceIndexes,
		},
	});

	const system = `
You are an AI assistant specialized in web scraping and searching. Your task is to help users find specific information on websites and extract relevant data based on their requests. Follow these guidelines:

1. Understand the user's request:
   - Identify the type of information they're looking for
   - Determine any specific websites or domains they want to search
   - Note any constraints or preferences in the data format

2. Formulate a search strategy:
   - Suggest appropriate search queries with relevant keywords at least 3-5 words long
   - Use the current date as ${new Date().toLocaleDateString()}, in the search query if necessary


--
${sourcesToText(sources)}
--
`;

	const stream = createStreamableValue();

	(async () => {
		const model = "gpt-4o-mini";
		const generation = trace.generation({
			name: "generate-search-keywords",
			input: inputs.userPrompt,
			model: langfuseModel(model),
		});
		const { partialObjectStream, object } = await streamObject({
			model: openai(model),
			system,
			prompt: inputs.userPrompt,
			schema: webSearchSchema,
			onFinish: async (result) => {
				await withTokenMeasurement(
					logger,
					async () => {
						generation.end({ output: result });
						await lf.shutdownAsync();
						waitUntil(
							new Promise((resolve) =>
								setTimeout(
									resolve,
									Number.parseInt(
										process.env.OTEL_EXPORT_INTERVAL_MILLIS ?? "1000",
									) +
										Number.parseInt(process.env.WAITUNTIL_OFFSET_MILLIS ?? "0"),
								),
							),
						); // wait until telemetry sent
						return result;
					},
					startTime,
				);
			},
		});
		for await (const partialObject of partialObjectStream) {
			stream.update(partialObject);
		}

		const result = await object;

		const webSearchSpan = trace.span({
			name: "web-search",
			input: {
				searchKeywords: result.keywords,
			},
		});

		const searchResults = await Promise.all(
			result.keywords.map((keyword) =>
				withCountMeasurement<WebSearchResult[]>(
					logger,
					() => search(keyword),
					ExternalServiceName.Tavily,
				),
			),
		)
			.then((results) => [...new Set(results.flat())] as WebSearchResult[])
			.then((results) => results.sort((a, b) => b.score - a.score).slice(0, 2));

		webSearchSpan.end({
			output: {
				searchResults: searchResults,
			},
		});

		const webSearch: WebSearch = {
			id: `wbs_${createId()}`,
			generatorNode: {
				id: inputs.node.id,
				category: inputs.node.category,
				archetype: inputs.node.archetype,
				name: inputs.node.name,
				properties: inputs.node.properties,
				object: "node.webSearchElement",
			},
			object: "webSearch",
			name: result.name,
			status: "pending",
			items: searchResults.map((searchResult) => ({
				id: `wbs.cnt_${createId()}`,
				object: "webSearch.item.reference",
				title: searchResult.title,
				url: searchResult.url,
				status: "pending",
				relevance: searchResult.score,
			})),
		};

		stream.update({
			...result,
			webSearch,
		});

		if (process.env.FIRECRAWL_API_KEY === undefined) {
			throw new Error("FIRECRAWL_API_KEY is not set");
		}
		const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
		let mutableItems = webSearch.items;
		const numberOfSubArrays = 5;
		const subArrayLength = Math.ceil(
			webSearch.items.length / numberOfSubArrays,
		);
		const chunkedArray: WebSearchItemReference[][] = [];

		for (let i = 0; i < numberOfSubArrays; i++) {
			chunkedArray.push(
				webSearch.items.slice(i * subArrayLength, (i + 1) * subArrayLength),
			);
		}

		const webScrapeSpan = trace.span({
			name: "web-scrape",
			input: {
				scrapeItems: chunkedArray,
			},
		});

		await Promise.all(
			chunkedArray.map(async (webSearchItems) => {
				for (const webSearchItem of webSearchItems) {
					try {
						const scrapeResponse =
							await withCountMeasurement<FirecrawlResponse>(
								logger,
								() =>
									app.scrapeUrl(webSearchItem.url, {
										formats: ["markdown"],
									}),
								ExternalServiceName.Firecrawl,
							);

						if (scrapeResponse.success) {
							const blob = await put(
								`webSearch/${webSearchItem.id}.md`,
								scrapeResponse.markdown ?? "",
								{
									access: "public",
									contentType: "text/markdown",
								},
							);
							mutableItems = mutableItems.map((item) => {
								if (item.id !== webSearchItem.id) {
									return item;
								}
								return {
									...webSearchItem,
									contentBlobUrl: blob.url,
									status: webSearchItemStatus.completed,
								};
							});
							stream.update({
								...result,
								webSearch: {
									...webSearch,
									items: mutableItems,
								},
							});
						}
					} catch {
						mutableItems = mutableItems.map((item) => {
							if (item.id !== webSearchItem.id) {
								return item;
							}
							return {
								...webSearchItem,
								status: webSearchItemStatus.failed,
							};
						});
						stream.update({
							...result,
							webSearch: {
								...webSearch,
								items: mutableItems,
							},
						});
					}
				}
			}),
		);

		webScrapeSpan.end({
			output: {
				items: mutableItems,
			},
		});
		await lf.shutdownAsync();

		stream.update({
			...result,
			webSearch: {
				...webSearch,
				status: webSearchStatus.completed,
				items: mutableItems,
			},
		});

		stream.done();
	})();

	waitUntil(
		new Promise((resolve) =>
			setTimeout(
				resolve,
				Number.parseInt(process.env.OTEL_EXPORT_INTERVAL_MILLIS ?? "1000"),
			),
		),
	); // wait until telemetry sent
	return { object: stream.value, traceId: trace.id };
}

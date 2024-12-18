import { openai } from "@ai-sdk/openai";
import FirecrawlApp from "@mendable/firecrawl-js";
import { createId } from "@paralleldrive/cuid2";
import { put } from "@vercel/blob";
import { generateObject } from "ai";
import { createArtifactId } from "../../artifact/factory";
import type { ArtifactId } from "../../artifact/types";
import type { GiselleNodeArtifactElement } from "../../giselle-node/types";
import { webSearchSchema } from "../../web-search/schema";
import { search } from "../../web-search/tavily";
import type { Source } from "../source/types";
import { sourcesToText } from "../source/utils";

export interface WebSearchArtifact {
	id: ArtifactId;
	object: "artifact.webSearch";
	keywords: string[];
	scrapingTasks: ScrapingTask[];
}
export type BuildWebSearchArtifactInput = Omit<
	WebSearchArtifact,
	"id" | "object"
>;
export function buildWebSearchArtifact(
	input: BuildWebSearchArtifactInput,
): WebSearchArtifact {
	return {
		...input,
		object: "artifact.webSearch",
		id: createArtifactId(),
	};
}

interface GenerateWebSearchArtifactObjectInput {
	prompt: string;
	sources: Source[];
}
type ScrapingTaskId = `scr_${string}`;
interface BaseScrapingTask {
	id: ScrapingTaskId;
	url: string;
	title: string;
	relevance: number;
}
interface QueuedScrapingTask extends BaseScrapingTask {
	state: "queued";
}
interface ProcessingScrapingTask extends BaseScrapingTask {
	state: "processing";
}
interface FailedScrapingTask extends BaseScrapingTask {
	state: "failed";
}
interface CompletedScrapingTask extends BaseScrapingTask {
	state: "completed";
	content: string;
	contentBlobUrl: string;
}

type ScrapingTask =
	| QueuedScrapingTask
	| ProcessingScrapingTask
	| CompletedScrapingTask
	| FailedScrapingTask;

interface WebSearchArtifactObject {
	keywords: string[];
	scrapingTasks: ScrapingTask[];
}
interface GenerateWebSearchArtifactObjectOptions {
	onStreamPartialObject?: (
		partialObject: Partial<WebSearchArtifactObject>,
	) => void;
}
export async function generateWebSearchArtifactObject({
	input,
	options,
}: {
	input: GenerateWebSearchArtifactObjectInput;
	options?: GenerateWebSearchArtifactObjectOptions;
}) {
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
 ${sourcesToText(input.sources)}
 --
 `;
	const { object } = await generateObject<
		Pick<WebSearchArtifactObject, "keywords">
	>({
		prompt: input.prompt,
		model: openai("gpt-4o-mini"),
		schema: webSearchSchema,
		system,
	});

	const scrapingTasks = await Promise.all(
		object.keywords.map((keyword) => search(keyword)),
	)
		.then((results) => [...new Set(results.flat())])
		.then((results) =>
			results.map(
				(result) =>
					({
						id: `scr_${createId()}`,
						url: result.url,
						title: result.title,
						relevance: result.score,
						state: "queued",
					}) as ScrapingTask,
			),
		);
	options?.onStreamPartialObject?.({
		scrapingTasks,
	});

	const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
	let mutableItems = scrapingTasks;
	const numberOfSubArrays = 5;
	const subArrayLength = Math.ceil(scrapingTasks.length / numberOfSubArrays);
	const chunkedArray: ScrapingTask[][] = [];

	for (let i = 0; i < numberOfSubArrays; i++) {
		chunkedArray.push(
			scrapingTasks.slice(i * subArrayLength, (i + 1) * subArrayLength),
		);
	}

	await Promise.all(
		chunkedArray.map(async (scrapingTasks) => {
			for (const scrapingTask of scrapingTasks) {
				try {
					const scrapeResponse = await app.scrapeUrl(scrapingTask.url, {
						formats: ["markdown"],
					});
					if (scrapeResponse.success) {
						const blob = await put(
							`webSearch/${scrapingTask.id}.md`,
							scrapeResponse.markdown ?? "",
							{
								access: "public",
								contentType: "text/markdown",
							},
						);
						mutableItems = mutableItems.map((item) => {
							if (item.id !== scrapingTask.id) {
								return item;
							}
							return {
								...scrapingTask,
								content: scrapeResponse.markdown ?? "",
								contentBlobUrl: blob.url,
								state: "completed",
							} satisfies CompletedScrapingTask;
						});
						options?.onStreamPartialObject?.({
							scrapingTasks: mutableItems,
						});
					}
				} catch {
					mutableItems = mutableItems.map((item) => {
						if (item.id !== scrapingTask.id) {
							return item;
						}
						return {
							...scrapingTask,
							state: "failed",
						} satisfies FailedScrapingTask;
					});
					options?.onStreamPartialObject?.({
						scrapingTasks: mutableItems,
					});
				}
			}
		}),
	);
	return {
		keywords: object.keywords,
		scrapingTasks: mutableItems,
	};
}

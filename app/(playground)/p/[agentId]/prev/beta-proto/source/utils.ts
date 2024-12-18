import { db } from "@/drizzle";
import type { ArtifactReference } from "../artifact/types";
import {
	type GiselleFile,
	type StructuredData,
	fileStatuses,
} from "../files/types";
import type { GiselleNode } from "../giselle-node/types";
import type { TextContent, TextContentId } from "../text-content/types";
import type { AgentId } from "../types";
import {
	type WebSearchItem,
	type WebSearch as WebSearchReference,
	webSearchItemStatus,
	webSearchStatus,
} from "../web-search/types";
import type { Source, SourceIndex, WebSearch } from "./types";

interface SourceIndexesToSourcesInput {
	agentId: AgentId;
	sourceIndexes: SourceIndex[];
}
export async function sourceIndexesToSources({
	input,
}: { input: SourceIndexesToSourcesInput }) {
	const agent = await db.query.agents.findFirst({
		where: (agents, { eq }) => eq(agents.id, input.agentId),
	});
	if (agent === undefined) {
		return [];
	}
	const sources: Source[] = await Promise.all(
		input.sourceIndexes.map(async (sourceIndex) => {
			switch (sourceIndex.object) {
				case "artifact.reference": {
					const artifact = agent.graphv2.artifacts.find(
						(artifact) => artifact.id === sourceIndex.id,
					);
					if (artifact === undefined) {
						return null;
					}
					return artifact;
				}
				case "webSearch": {
					const webSearch = agent.graphv2.webSearches.find(
						(webSearch) => webSearch.id === sourceIndex.id,
					);
					if (webSearch === undefined) {
						return null;
					}
					const items = await Promise.all(
						webSearch.items.map(async (item) => {
							if (item.status !== webSearchItemStatus.completed) {
								return null;
							}
							const webSearchData = await fetch(item.contentBlobUrl).then(
								(res) => res.text(),
							);
							return {
								id: item.id,
								object: "webSearch.item",
								url: item.url,
								title: item.title,
								content: webSearchData,
								relevance: item.relevance,
							} satisfies WebSearchItem;
						}),
					).then((items) => items.filter((item) => item !== null));
					return {
						...webSearch,
						items,
					} satisfies WebSearch;
				}
				case "file": {
					if (sourceIndex.status !== fileStatuses.processed) {
						return null;
					}
					const structuredData = await fetch(
						sourceIndex.structuredDataBlobUrl,
					).then((res) => res.text());
					return {
						id: sourceIndex.id,
						title: sourceIndex.name,
						object: "file",
						content: structuredData,
					} satisfies StructuredData;
				}
				case "textContent": {
					return sourceIndex;
				}
				default:
					return null;
			}
		}),
	).then((sources) => sources.filter((source) => source !== null));
	return sources;
}

export function sourcesToText(sources: Source[]) {
	return `
${sources
	.map((source) =>
		source.object === "webSearch"
			? `
<WebSearch title="${source.name}" id="${source.id}">
  ${source.items
		.map(
			(item) => `
  <WebPage title="${item.title}" type="${item.object}" rel="${item.url}" id="${item.id}">
    ${item.content}
  </WebPage>`,
		)
		.join("\n")}
</WebSearch>`
			: source.object === "artifact.webSearch"
				? `
<WebSearch id="${source.id}">
  ${source.scrapingTasks
		.filter((scrapingTask) => scrapingTask.state === "completed")
		.map(
			(scrapingTask) => `
  <WebPage title="${scrapingTask.title}" rel="${scrapingTask.url}" id="${scrapingTask.id}">
    ${scrapingTask.content}
  </WebPage>`,
		)
		.join("\n")}
</WebSearch>`
				: source.object === "artifact" ||
						source.object === "file" ||
						source.object === "textContent"
					? `
<Source title="${source.title}" type="${source.object}" id="${source.id}">
  ${source.content}
</Source>
`
					: "",
	)
	.join("\n")}`;
}

export function extractSourceIndexesFromNode(node: GiselleNode): SourceIndex[] {
	if (!Array.isArray(node.properties.sources)) {
		return [];
	}
	return node.properties.sources
		.map((source) => {
			if (
				typeof source !== "object" ||
				source === null ||
				typeof source.id !== "string" ||
				typeof source.object !== "string"
			) {
				return null;
			}

			if (source.object === "textContent") {
				return {
					id: source.id as TextContentId,
					object: "textContent",
					title: source.title as string,
					content: source.content as string,
				} satisfies TextContent;
			}
			if (source.object === "artifact.reference") {
				return {
					object: "artifact.reference",
					id: source.id,
				} satisfies ArtifactReference;
			}
			if (source.object === "file") {
				if (
					typeof source.status !== "string" ||
					source.status !== fileStatuses.processed ||
					typeof source.structuredDataBlobUrl !== "string" ||
					typeof source.name !== "string"
				) {
					return null;
				}
				return {
					object: "file",
					id: source.id,
					blobUrl: source.blobUrl,
					structuredDataBlobUrl: source.structuredDataBlobUrl,
					name: source.name,
					status: "processed",
				} satisfies GiselleFile;
			}
			if (source.object === "webSearch") {
				if (
					typeof source.status !== "string" ||
					source.status !== webSearchStatus.completed ||
					!Array.isArray(source.items)
				) {
					return null;
				}
				return {
					object: "webSearch",
					id: source.id,
					name: source.name,
					items: source.items,
					generatorNode: source.generatorNode,
					status: webSearchStatus.completed,
				} satisfies WebSearchReference;
			}
			return null;
		})
		.filter((sourceIndex) => sourceIndex !== null);
}

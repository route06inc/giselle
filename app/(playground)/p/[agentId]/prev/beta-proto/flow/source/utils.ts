import type { Source } from "./types";

export function sourcesToText(sources: Source[]) {
	return `
${sources
	.map((source) =>
		source.object === "artifact.webSearch"
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
			: source.object === "artifact.text" ||
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

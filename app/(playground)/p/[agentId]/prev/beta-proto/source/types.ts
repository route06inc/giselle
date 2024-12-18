import type { Artifact, ArtifactReference } from "../artifact/types";
import type { GiselleFile, StructuredData } from "../files/types";
import type { WebSearchArtifact } from "../flow/server-actions/websearch";
import type { GiselleNodeWebSearchElement } from "../giselle-node/types";
import type { TextContent } from "../text-content/types";
import type {
	WebSearchId,
	WebSearchItem,
	WebSearch as WebSearchReference,
} from "../web-search/types";

export type SourceIndex =
	| ArtifactReference
	| WebSearchReference
	| GiselleFile
	| TextContent;

export interface WebSearch {
	id: WebSearchId;
	object: "webSearch";
	name: string;
	items: WebSearchItem[];
	generatorNode: GiselleNodeWebSearchElement;
}
export type Source =
	| Artifact
	| WebSearch
	| StructuredData
	| TextContent
	| WebSearchArtifact;

import type { StructuredData } from "../../files/types";
import type { WebSearchArtifact } from "../../flow/server-actions/websearch";
import type { TextContent } from "../../text-content/types";
import type { TextArtifact } from "../server-actions/generate-text";

export type Source =
	| TextArtifact
	| WebSearchArtifact
	| StructuredData
	| TextContent;

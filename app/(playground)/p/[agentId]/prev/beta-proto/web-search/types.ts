import type {
	GiselleNodeId,
	GiselleNodeWebSearchElement,
} from "../giselle-node/types";

export type WebSearchId = `wbs_${string}`;

export const webSearchStatus = {
	pending: "pending",
	processing: "processing",
	completed: "completed",
} as const;

type WebSearchStatus = (typeof webSearchStatus)[keyof typeof webSearchStatus];

export interface WebSearch {
	id: WebSearchId;
	object: "webSearch";
	status: WebSearchStatus;
	name: string;
	items: WebSearchItemReference[];
	generatorNode: GiselleNodeWebSearchElement;
}

type WebSearchContentId = `wbs.cnt_${string}`;

export const webSearchItemStatus = {
	pending: "pending",
	processing: "processing",
	completed: "completed",
	failed: "failed",
} as const;

type WebSearchItemStatus =
	(typeof webSearchItemStatus)[keyof typeof webSearchItemStatus];

export interface WebSearchItem {
	id: WebSearchContentId;
	object: "webSearch.item";
	title: string;
	content: string;
	url: string;
	relevance: number;
}
interface PendingWebSearchItemReference {
	id: WebSearchContentId;
	object: "webSearch.item.reference";
	status: Extract<WebSearchItemStatus, "pending">;
	title: string;
	url: string;
	relevance: number;
}
interface CompletedWebSearchItemReference {
	id: WebSearchContentId;
	object: "webSearch.item.reference";
	status: Extract<WebSearchItemStatus, "completed">;
	title: string;
	contentBlobUrl: string;
	url: string;
	relevance: number;
}
export interface FailedWebSearchItemReference {
	id: WebSearchContentId;
	object: "webSearch.item.reference";
	status: Extract<WebSearchItemStatus, "failed">;
	title: string;
	url: string;
	relevance: number;
}
export type WebSearchItemReference =
	| PendingWebSearchItemReference
	| CompletedWebSearchItemReference
	| FailedWebSearchItemReference;
export interface GeneratedObject {
	plan: string;
	webSearch: WebSearch;
	description: string;
}

export type PartialGeneratedObject = Partial<GeneratedObject>;

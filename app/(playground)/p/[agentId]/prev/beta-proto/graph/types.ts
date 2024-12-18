import type { Artifact } from "../artifact/types";
import type { ConnectorObject } from "../connector/types";
import type { Flow, FlowIndex } from "../flow/types";
import type { GiselleNode } from "../giselle-node/types";
import type { ReactFlowEdge, ReactFlowNode } from "../react-flow-adapter/types";
import type { AgentId } from "../types";
import type { WebSearch } from "../web-search/types";

export const playgroundModes = {
	edit: "edit",
	view: "view",
} as const;
export type PlaygroundMode =
	(typeof playgroundModes)[keyof typeof playgroundModes];
export interface XYFlow {
	nodes: ReactFlowNode[];
	edges: ReactFlowEdge[];
}
export type Graph = {
	agentId: AgentId;
	nodes: GiselleNode[];
	xyFlow: XYFlow;
	connectors: ConnectorObject[];
	artifacts: Artifact[];
	webSearches: WebSearch[];
	mode: PlaygroundMode;
	flowIndexes: FlowIndex[];
};

export type GraphState = {
	graph: Graph;
	flow?: Flow | undefined | null;
};

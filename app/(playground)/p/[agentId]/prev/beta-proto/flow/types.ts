import type { ConnectorObject } from "../connector/types";
import type { StructuredData } from "../files/types";
import type { GiselleNode, GiselleNodeId } from "../giselle-node/types";
import type { TextContent } from "../text-content/types";
import type { AgentId } from "../types";
import type { WebSearch } from "../web-search/types";
import type {
	ModelConfiguration,
	TextArtifact,
} from "./server-actions/generate-text";
import type { WebSearchArtifact } from "./server-actions/websearch";
import type { StepNode } from "./step-nodes/types";

export type FlowId = `flw_${string}`;

export const flowStatuses = {
	initializing: "initializing",
	queued: "queued",
	running: "running",
} as const;

type FlowStatus = (typeof flowStatuses)[keyof typeof flowStatuses];

interface BaseFlow {
	agentId: AgentId;
	object: "flow";
	id: FlowId;
	finalNodeId: GiselleNodeId;
	graph: {
		nodes: GiselleNode[];
		connectors: ConnectorObject[];
	};
	jobs: Job[];
	artifacts: Artifact[];
	webSearches: WebSearch[];
}

export interface InitializingFlow extends BaseFlow {
	status: Extract<FlowStatus, "initializing">;
}
export interface QueuedFlow extends BaseFlow {
	status: Extract<FlowStatus, "queued">;
	dataUrl: string;
}

export interface RunningFlow extends BaseFlow {
	status: Extract<FlowStatus, "running">;
	dataUrl: string;
}

export type Flow = InitializingFlow | QueuedFlow | RunningFlow;

export type JobId = `jb_${string}`;
export const jobStatuses = {
	queued: "queued",
	running: "running",
	completed: "completed",
	failed: "failed",
} as const;
type JobStatus = (typeof jobStatuses)[keyof typeof jobStatuses];
interface BaseJob {
	object: "job";
	id: JobId;
	steps: Step[];
}
interface QueuedJob extends BaseJob {
	status: Extract<JobStatus, "queued">;
}
interface RunningJob extends BaseJob {
	status: Extract<JobStatus, "running">;
}
export type Job = QueuedJob | RunningJob;

export type StepId = `stp_${string}`;
export const stepStatuses = {
	queued: "queued",
	running: "running",
	streaming: "streaming",
	completed: "completed",
} as const;

export type StepStatus = (typeof stepStatuses)[keyof typeof stepStatuses];

export type Artifact = TextArtifact | WebSearchArtifact;
export interface GeneratorNode {
	nodeId: GiselleNodeId;
	object: "generator-node";
	name: string;
	archetype: string;
}
export type GenerateResultId = `gnr_${string}`;
export interface GenerateResult {
	id: GenerateResultId;
	object: "generate-result";
	generator: GeneratorNode;
	artifact: Artifact;
}

interface BaseStep {
	id: StepId;
	object: "step";
	node: StepNode;
	prompt: string;
	action: string;
	sources: (StructuredData | TextContent)[];
	sourceNodeIds: GiselleNodeId[];
}
interface QueuedStep extends BaseStep {
	status: Extract<StepStatus, "queued">;
}
interface RunningStep extends BaseStep {
	status: Extract<StepStatus, "running">;
}
interface StreamingStep extends BaseStep {
	status: Extract<StepStatus, "streaming">;
	output: Artifact;
}
interface CompletedStep extends BaseStep {
	status: Extract<StepStatus, "completed">;
	output: Artifact;
}

export type StatusStep =
	| QueuedStep
	| RunningStep
	| StreamingStep
	| CompletedStep;

export interface GenerateTextAction {
	action: "generate-text";
	modelConfiguration: ModelConfiguration;
}
export interface SearchWebAction {
	action: "search-web";
}

export type GenerateTextStep = StatusStep & GenerateTextAction;

export type SearchWebStep = StatusStep & SearchWebAction;

export type Step = GenerateTextStep | SearchWebStep;

interface BaseFlowIndex {
	object: "flow.index";
	id: FlowId;
}
export interface InitializingFlowIndex extends BaseFlowIndex {
	status: Extract<FlowStatus, "initializing">;
}
export interface QueuedFlowIndex extends BaseFlowIndex {
	status: Extract<FlowStatus, "queued">;
}
export interface RunningFlowIndex extends BaseFlowIndex {
	status: Extract<FlowStatus, "running">;
	dataUrl: string;
}
export type FlowIndex =
	| InitializingFlowIndex
	| QueuedFlowIndex
	| RunningFlowIndex;

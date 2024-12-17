"use client";

import { type StreamableValue, readStreamableValue } from "ai/rsc";
import {
	type ReactNode,
	createContext,
	useCallback,
	useContext,
	useState,
} from "react";
import {
	createArtifactId,
	createExecutionId,
	createJobExecutionId,
	createStepExecutionId,
	toErrorWithMessage,
} from "../lib/utils";
import type {
	Artifact,
	ArtifactId,
	Execution,
	ExecutionId,
	Flow,
	FlowId,
	JobExecution,
	NodeId,
	StepExecution,
	StepId,
	TextArtifactObject,
} from "../types";
import { useGraph } from "./graph";
import { usePlaygroundMode } from "./playground-mode";
import { usePropertiesPanel } from "./properties-panel";
import { useToast } from "./toast";

// Helper functions for execution state management
const createInitialJobExecutions = (flow: Flow): JobExecution[] => {
	return flow.jobs.map((job) => ({
		id: createJobExecutionId(),
		jobId: job.id,
		status: "pending",
		stepExecutions: job.steps.map((step) => ({
			id: createStepExecutionId(),
			stepId: step.id,
			nodeId: step.nodeId,
			status: "pending",
		})),
	}));
};

const createInitialExecution = (
	flowId: FlowId,
	executionId: ExecutionId,
	jobExecutions: JobExecution[],
): Execution => ({
	id: executionId,
	status: "running",
	runStartedAt: Date.now(),
	flowId,
	jobExecutions,
	artifacts: [],
});

const processStreamContent = async (
	stream: StreamableValue<TextArtifactObject, unknown>,
	updateArtifact: (content: TextArtifactObject) => void,
): Promise<TextArtifactObject> => {
	let textArtifactObject: TextArtifactObject = {
		type: "text",
		title: "",
		content: "",
		messages: { plan: "", description: "" },
	};

	for await (const streamContent of readStreamableValue(stream)) {
		if (streamContent === undefined) continue;
		textArtifactObject = { ...textArtifactObject, ...streamContent };
		updateArtifact(textArtifactObject);
	}

	return textArtifactObject;
};

const executeStep = async (
	flowId: FlowId,
	executionId: ExecutionId,
	stepExecution: StepExecution,
	artifacts: Artifact[],
	executeStepAction: ExecuteStepAction,
	updateExecution: (
		updater: (prev: Execution | null) => Execution | null,
	) => void,
): Promise<number> => {
	const stepRunStartedAt = Date.now();
	const artifactId = createArtifactId();

	// Initialize step execution
	updateExecution((prev) => {
		if (!prev) return null;
		return {
			...prev,
			jobExecutions: prev.jobExecutions.map((job) => ({
				...job,
				stepExecutions: job.stepExecutions.map((step) =>
					step.id === stepExecution.id
						? { ...step, status: "running", runStartedAt: stepRunStartedAt }
						: step,
				),
			})),
			artifacts: [
				...prev.artifacts,
				{
					id: artifactId,
					type: "streamArtifact",
					creatorNodeId: stepExecution.nodeId,
					object: {
						type: "text",
						title: "",
						content: "",
						messages: { plan: "", description: "" },
					},
				},
			],
		};
	});

	// Execute step and process stream
	const stream = await executeStepAction(
		flowId,
		executionId,
		stepExecution.stepId,
		artifacts,
	);
	const finalArtifact = await processStreamContent(stream, (content) => {
		updateExecution((prev) => {
			if (!prev || prev.status !== "running") return null;
			return {
				...prev,
				artifacts: prev.artifacts.map((artifact) =>
					artifact.id === artifactId
						? { ...artifact, object: content }
						: artifact,
				),
			};
		});
	});

	// Complete step execution
	const stepDurationMs = Date.now() - stepRunStartedAt;
	updateExecution((prev) => {
		if (!prev || prev.status !== "running") return null;

		return {
			...prev,
			jobExecutions: prev.jobExecutions.map((job) => ({
				...job,
				stepExecutions: job.stepExecutions.map((step) =>
					step.id === stepExecution.id
						? {
								...step,
								status: "completed",
								runStartedAt: stepRunStartedAt,
								durationMs: stepDurationMs,
							}
						: step,
				),
			})),
			artifacts: prev.artifacts.map((artifact) =>
				artifact.id === artifactId
					? {
							id: artifactId,
							type: "generatedArtifact",
							creatorNodeId: stepExecution.nodeId,
							createdAt: Date.now(),
							object: finalArtifact,
						}
					: artifact,
			),
		};
	});

	return stepDurationMs;
};

const executeJob = async (
	flowId: FlowId,
	executionId: ExecutionId,
	jobExecution: JobExecution,
	artifacts: Artifact[],
	executeStepAction: ExecuteStepAction,
	updateExecution: (
		updater: (prev: Execution | null) => Execution | null,
	) => void,
): Promise<number> => {
	const jobRunStartedAt = Date.now();

	// Start job execution
	updateExecution((prev) => {
		if (!prev) return null;
		return {
			...prev,
			jobExecutions: prev.jobExecutions.map((job) =>
				job.id === jobExecution.id
					? { ...job, status: "running", runStartedAt: jobRunStartedAt }
					: job,
			),
		};
	});

	// Execute all steps in parallel
	const stepDurations = await Promise.all(
		jobExecution.stepExecutions.map((step) =>
			executeStep(
				flowId,
				executionId,
				step,
				artifacts,
				executeStepAction,
				updateExecution,
			),
		),
	);

	const jobDurationMs = stepDurations.reduce(
		(sum, duration) => sum + duration,
		0,
	);

	// Complete job execution
	updateExecution((prev) => {
		if (!prev) return null;
		return {
			...prev,
			jobExecutions: prev.jobExecutions.map((job) =>
				job.id === jobExecution.id
					? {
							...job,
							status: "completed",
							runStartedAt: jobRunStartedAt,
							durationMs: jobDurationMs,
						}
					: job,
			),
		};
	});

	return jobDurationMs;
};

interface ExecutionContextType {
	execution: Execution | null;
	execute: (nodeId: NodeId) => Promise<void>;
	executeFlow: (flowId: FlowId) => Promise<void>;
}

const ExecutionContext = createContext<ExecutionContextType | undefined>(
	undefined,
);

type ExecuteStepAction = (
	flowId: FlowId,
	executionId: ExecutionId,
	stepId: StepId,
	artifacts: Artifact[],
) => Promise<StreamableValue<TextArtifactObject, unknown>>;
interface ExecutionProviderProps {
	children: ReactNode;
	executeAction: (
		artifactId: ArtifactId,
		nodeId: NodeId,
	) => Promise<StreamableValue<TextArtifactObject, unknown>>;
	executeStepAction: ExecuteStepAction;
	putExecutionAction: (execution: Execution) => Promise<{ blobUrl: string }>;
}

export function ExecutionProvider({
	children,
	executeAction,
	executeStepAction,
	putExecutionAction,
}: ExecutionProviderProps) {
	const { dispatch, flush, graph } = useGraph();
	const { setTab } = usePropertiesPanel();
	const { addToast } = useToast();
	const { setPlaygroundMode } = usePlaygroundMode();
	const [execution, setExecution] = useState<Execution | null>(null);

	const execute = useCallback(
		async (nodeId: NodeId) => {
			const artifactId = createArtifactId();
			dispatch({
				type: "upsertArtifact",
				input: {
					nodeId,
					artifact: {
						id: artifactId,
						type: "streamArtifact",
						creatorNodeId: nodeId,
						object: {
							type: "text",
							title: "",
							content: "",
							messages: {
								plan: "",
								description: "",
							},
						},
					},
				},
			});
			setTab("Result");
			await flush();
			try {
				const stream = await executeAction(artifactId, nodeId);

				let textArtifactObject: TextArtifactObject = {
					type: "text",
					title: "",
					content: "",
					messages: {
						plan: "",
						description: "",
					},
				};
				for await (const streamContent of readStreamableValue(stream)) {
					if (streamContent === undefined) {
						continue;
					}
					dispatch({
						type: "upsertArtifact",
						input: {
							nodeId,
							artifact: {
								id: artifactId,
								type: "streamArtifact",
								creatorNodeId: nodeId,
								object: streamContent,
							},
						},
					});
					textArtifactObject = {
						...textArtifactObject,
						...streamContent,
					};
				}
				dispatch({
					type: "upsertArtifact",
					input: {
						nodeId,
						artifact: {
							id: artifactId,
							type: "generatedArtifact",
							creatorNodeId: nodeId,
							createdAt: Date.now(),
							object: textArtifactObject,
						},
					},
				});
			} catch (error) {
				addToast({
					type: "error",
					title: "Execution failed",
					message: toErrorWithMessage(error).message,
				});
				dispatch({
					type: "upsertArtifact",
					input: {
						nodeId,
						artifact: null,
					},
				});
			}
		},
		[executeAction, dispatch, flush, setTab, addToast],
	);

	const executeFlow = useCallback(
		async (flowId: FlowId) => {
			const flow = graph.flows.find((flow) => flow.id === flowId);
			if (!flow) throw new Error("Flow not found");

			setPlaygroundMode("viewer");
			await flush();
			const executionId = createExecutionId();
			const jobExecutions = createInitialJobExecutions(flow);
			const flowRunStartedAt = Date.now();

			// Initialize flow execution
			let currentExecution = createInitialExecution(
				flowId,
				executionId,
				jobExecutions,
			);
			setExecution(currentExecution);

			let totalFlowDurationMs = 0;

			// Execute jobs sequentially
			for (const jobExecution of jobExecutions) {
				const jobDurationMs = await executeJob(
					flowId,
					executionId,
					jobExecution,
					currentExecution.artifacts,
					executeStepAction,
					(updater) => {
						const updated = updater(currentExecution);
						if (updated) {
							currentExecution = updated;
							setExecution(updated);
						}
					},
				);
				totalFlowDurationMs += jobDurationMs;
			}

			currentExecution = {
				...currentExecution,
				status: "completed",
				runStartedAt: flowRunStartedAt,
				durationMs: totalFlowDurationMs,
				resultArtifact:
					currentExecution.artifacts[currentExecution.artifacts.length - 1],
			};

			// Complete flow execution
			setExecution(currentExecution);
			const { blobUrl } = await putExecutionAction(currentExecution);
			dispatch({
				type: "addExecutionIndex",
				input: {
					executionIndex: {
						executionId,
						blobUrl,
						completedAt: Date.now(),
					},
				},
			});
		},
		[
			setPlaygroundMode,
			graph.flows,
			executeStepAction,
			putExecutionAction,
			dispatch,
			flush,
		],
	);
	return (
		<ExecutionContext.Provider value={{ execution, execute, executeFlow }}>
			{children}
		</ExecutionContext.Provider>
	);
}

export function useExecution() {
	const context = useContext(ExecutionContext);
	if (!context) {
		throw new Error("useExecution must be used within an ExecutionProvider");
	}
	return context;
}

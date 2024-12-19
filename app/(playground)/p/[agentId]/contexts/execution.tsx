"use client";

import { type StreamableValue, readStreamableValue } from "ai/rsc";
import {
	type ReactNode,
	createContext,
	useCallback,
	useContext,
	useState,
} from "react";
import { deriveFlows } from "../lib/graph";
import {
	createArtifactId,
	createExecutionId,
	createExecutionSnapshotId,
	createJobExecutionId,
	createStepExecutionId,
	toErrorWithMessage,
} from "../lib/utils";
import type {
	Artifact,
	ArtifactId,
	CompletedExecution,
	CompletedJobExecution,
	CompletedStepExecution,
	Connection,
	Execution,
	ExecutionId,
	ExecutionSnapshot,
	FailedExecution,
	FailedJobExecution,
	FailedStepExecution,
	Flow,
	FlowId,
	JobExecution,
	Node,
	NodeId,
	SkippedJobExecution,
	StepExecution,
	StepId,
	TextArtifact,
	TextArtifactObject,
} from "../types";
import { useGraph } from "./graph";
import { usePlaygroundMode } from "./playground-mode";
import { usePropertiesPanel } from "./properties-panel";
import { useToast } from "./toast";

export function createExecutionSnapshot({
	flow,
	execution,
	nodes,
	connections,
}: {
	flow: Flow;
	execution: Execution;
	nodes: Node[];
	connections: Connection[];
}) {
	return {
		id: createExecutionSnapshotId(),
		execution,
		nodes,
		connections,
		flow,
	} as ExecutionSnapshot;
}

function buildJobExecutionsFromSnapshot(
	executionSnapshot: ExecutionSnapshot,
	forceRetryStepId?: StepId,
): JobExecution[] {
	return executionSnapshot.execution.jobExecutions.map((jobExecution) => {
		const hasForceRetryStep = jobExecution.stepExecutions.some(
			(stepExecution) => stepExecution.stepId === forceRetryStepId,
		);
		if (hasForceRetryStep || jobExecution.status !== "completed") {
			return {
				...jobExecution,
				status: "pending",
				stepExecutions: jobExecution.stepExecutions.map((stepExecution) =>
					stepExecution.stepId === forceRetryStepId ||
					stepExecution.status !== "completed"
						? {
								...stepExecution,
								status: "pending",
							}
						: stepExecution,
				),
			};
		}
		return jobExecution;
	});
}
function buildArtifactsFromSnapshot(
	executionSnapshot: ExecutionSnapshot,
	forceRetryStepId?: StepId,
) {
	const retryStepNodeId = executionSnapshot.flow.jobs
		.flatMap((job) => job.steps)
		.find((step) => step.id === forceRetryStepId)?.nodeId;
	return executionSnapshot.execution.artifacts.filter(
		(artifact) => artifact.creatorNodeId !== retryStepNodeId,
	);
}

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

const executeStep = async ({
	stepExecution,
	executeStepAction,
	updateExecution,
	updateArtifact,
	onStepFinish,
	onStepFail,
}: {
	stepExecution: StepExecution;
	executeStepAction: (
		stepId: StepId,
	) => Promise<StreamableValue<TextArtifactObject, unknown>>;
	updateExecution: (
		updater: (prev: Execution | null) => Execution | null,
	) => void;
	updateArtifact: (artifactId: ArtifactId, content: TextArtifactObject) => void;
	onStepFinish?: (
		stepExecution: CompletedStepExecution,
		artifact: TextArtifact,
	) => void;
	onStepFail?: (stepExecution: FailedStepExecution) => void;
}): Promise<CompletedStepExecution | FailedStepExecution> => {
	if (stepExecution.status === "completed") {
		return stepExecution;
	}
	const stepRunStartedAt = Date.now();
	const artifactId = createArtifactId();

	// Initialize step execution
	updateExecution((prev) => {
		if (!prev) return null;
		return {
			...prev,
			jobExecutions: prev.jobExecutions.map((prevJob) => ({
				...prevJob,
				stepExecutions: prevJob.stepExecutions.map((prevStep) =>
					prevStep.id === stepExecution.id
						? { ...prevStep, status: "running", runStartedAt: stepRunStartedAt }
						: prevStep,
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

	try {
		// Execute step and process stream
		const stream = await executeStepAction(stepExecution.stepId);
		const finalArtifact = await processStreamContent(stream, (content) =>
			updateArtifact(artifactId, content),
		);

		// Complete step execution
		const stepDurationMs = Date.now() - stepRunStartedAt;

		const completedStepExecution: CompletedStepExecution = {
			...stepExecution,
			status: "completed",
			runStartedAt: stepRunStartedAt,
			durationMs: stepDurationMs,
		};
		const generatedArtifact = {
			id: artifactId,
			type: "generatedArtifact",
			creatorNodeId: stepExecution.nodeId,
			createdAt: Date.now(),
			object: finalArtifact,
		} satisfies TextArtifact;
		updateExecution((prev) => {
			if (!prev || prev.status !== "running") return null;

			return {
				...prev,
				jobExecutions: prev.jobExecutions.map((job) => ({
					...job,
					stepExecutions: job.stepExecutions.map((step) =>
						step.id === stepExecution.id ? completedStepExecution : step,
					),
				})),
				artifacts: prev.artifacts.map((artifact) =>
					artifact.id === artifactId ? generatedArtifact : artifact,
				),
			};
		});
		onStepFinish?.(completedStepExecution, generatedArtifact);
		return completedStepExecution;
	} catch (unknownError) {
		const error = toErrorWithMessage(unknownError).message;
		const stepDurationMs = Date.now() - stepRunStartedAt;
		const failedStepExecution: FailedStepExecution = {
			...stepExecution,
			status: "failed",
			runStartedAt: stepRunStartedAt,
			durationMs: stepDurationMs,
			error,
		};
		updateExecution((prev) => {
			if (!prev || prev.status !== "running") return null;

			return {
				...prev,
				jobExecutions: prev.jobExecutions.map((job) => ({
					...job,
					stepExecutions: job.stepExecutions.map((step) =>
						step.id === stepExecution.id ? failedStepExecution : step,
					),
				})),
				artifacts: prev.artifacts.filter(
					(prevArtifact) => prevArtifact.creatorNodeId !== stepExecution.nodeId,
				),
			};
		});
		onStepFail?.(failedStepExecution);
		return failedStepExecution;
	}
};

const executeJob = async ({
	jobExecution,
	executeStepAction,
	updateArtifact,
	updateExecution,
	onStepFinish,
	onStepFail,
}: {
	jobExecution: JobExecution;
	executeStepAction: (
		stepId: StepId,
	) => Promise<StreamableValue<TextArtifactObject, unknown>>;
	updateExecution: (
		updater: (prev: Execution | null) => Execution | null,
	) => void;
	updateArtifact: (artifactId: ArtifactId, content: TextArtifactObject) => void;
	onStepFinish?: (
		stepExecution: CompletedStepExecution,
		artifact: TextArtifact,
	) => void;
	onStepFail?: (stepExecution: FailedStepExecution) => void;
}): Promise<CompletedJobExecution | FailedJobExecution> => {
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
	const stepExecutions = await Promise.all(
		jobExecution.stepExecutions.map((stepExecution) =>
			executeStep({
				stepExecution,
				executeStepAction,
				updateExecution,
				updateArtifact,
				onStepFinish,
				onStepFail,
			}),
		),
	);

	const jobDurationMs = stepExecutions.reduce(
		(sum, duration) => sum + duration.durationMs,
		0,
	);
	const allStepsCompleted = stepExecutions.every(
		(step) => step.status === "completed",
	);

	if (allStepsCompleted) {
		// Complete job execution
		const completedJobExecution: CompletedJobExecution = {
			...jobExecution,
			stepExecutions,
			status: "completed",
			runStartedAt: jobRunStartedAt,
			durationMs: jobDurationMs,
		};
		updateExecution((prev) => {
			if (!prev) return null;
			return {
				...prev,
				jobExecutions: prev.jobExecutions.map((job) =>
					job.id === jobExecution.id ? completedJobExecution : job,
				),
			};
		});
		return completedJobExecution;
	}

	const failedJobExecution: FailedJobExecution = {
		...jobExecution,
		stepExecutions,
		status: "failed",
		runStartedAt: jobRunStartedAt,
		durationMs: jobDurationMs,
	};
	updateExecution((prev) => {
		if (!prev) return null;
		return {
			...prev,
			jobExecutions: prev.jobExecutions.map((job) =>
				job.id === jobExecution.id ? failedJobExecution : job,
			),
		};
	});
	return failedJobExecution;
};

interface ExecutionContextType {
	execution: Execution | null;
	executeNode: (nodeId: NodeId) => Promise<void>;
	executeFlow: (flowId: FlowId) => Promise<void>;
	retryFlowExecution: (
		executionId: ExecutionId,
		forceRetryStepId?: StepId,
	) => Promise<void>;
	onFinishPerformExecutionAction: (
		startedAt: number,
		endedAt: number,
		totalDurationMs: number,
	) => Promise<void>;
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

type RetryStepAction = (
	retryExecutionSnapshotUrl: string,
	executionId: ExecutionId,
	stepId: StepId,
	artifacts: Artifact[],
) => Promise<StreamableValue<TextArtifactObject, unknown>>;
interface ExecutionProviderProps {
	children: ReactNode;
	executeStepAction: ExecuteStepAction;
	putExecutionAction: (
		executionSnapshot: ExecutionSnapshot,
	) => Promise<{ blobUrl: string }>;
	retryStepAction: RetryStepAction;
	executeNodeAction: (
		executionId: ExecutionId,
		nodeId: NodeId,
	) => Promise<StreamableValue<TextArtifactObject, unknown>>;
	onFinishPerformExecutionAction: (
		startedAt: number,
		endedAt: number,
		totalDurationMs: number,
	) => Promise<void>;
}

export function ExecutionProvider({
	children,
	executeStepAction,
	putExecutionAction,
	retryStepAction,
	executeNodeAction,
	onFinishPerformExecutionAction,
}: ExecutionProviderProps) {
	const { dispatch, flush, graph } = useGraph();
	const { setTab } = usePropertiesPanel();
	const { addToast } = useToast();
	const { setPlaygroundMode } = usePlaygroundMode();
	const [execution, setExecution] = useState<Execution | null>(null);

	interface ExecuteFlowParams {
		initialExecution: Execution;
		flow: Flow;
		nodes: Node[];
		connections: Connection[];
		executeStepCallback: (
			stepId: StepId,
		) => Promise<StreamableValue<TextArtifactObject, unknown>>;
		updateArtifactCallback: (
			artifactId: ArtifactId,
			content: TextArtifactObject,
		) => void;
		onStepFinish?: (
			stepExecution: CompletedStepExecution,
			artifact: TextArtifact,
		) => void;
		onFinishPerformExecution: (
			endedAt: number,
			durationMs: number,
		) => Promise<void>;
	}
	const performFlowExecution = useCallback(
		async ({
			initialExecution,
			flow,
			nodes,
			connections,
			executeStepCallback,
			updateArtifactCallback,
			onStepFinish,
			onFinishPerformExecution,
		}: ExecuteFlowParams) => {
			let currentExecution = initialExecution;
			let totalFlowDurationMs = 0;
			let hasFailed = false;

			// Execute jobs sequentially
			for (const jobExecution of currentExecution.jobExecutions) {
				if (hasFailed) {
					const skippedJob: SkippedJobExecution = {
						...jobExecution,
						status: "skipped",
						stepExecutions: jobExecution.stepExecutions.map((step) => ({
							...step,
							status: "skipped",
						})),
					};
					currentExecution = {
						...currentExecution,
						jobExecutions: currentExecution.jobExecutions.map((job) =>
							job.id === jobExecution.id ? skippedJob : job,
						),
					};
					setExecution(currentExecution);
					continue;
				}

				// Skip completed jobs for retry flows
				if (jobExecution.status === "completed") {
					continue;
				}

				const executedJob = await executeJob({
					jobExecution,
					executeStepAction: executeStepCallback,
					updateExecution: (updater) => {
						const updated = updater(currentExecution);
						if (updated) {
							currentExecution = updated;
							setExecution(updated);
						}
					},
					updateArtifact: updateArtifactCallback,
					onStepFinish,
					onStepFail: (failedStep) => {
						addToast({
							type: "error",
							message: failedStep.error,
						});
					},
				});

				totalFlowDurationMs += executedJob.durationMs;
				if (executedJob.status === "failed") {
					hasFailed = true;
				}
			}

			// Update final execution state
			if (hasFailed) {
				currentExecution = {
					...currentExecution,
					status: "failed",
					durationMs: totalFlowDurationMs,
				} as FailedExecution;
			} else {
				currentExecution = {
					...currentExecution,
					status: "completed",
					durationMs: totalFlowDurationMs,
					resultArtifact:
						currentExecution.artifacts[currentExecution.artifacts.length - 1],
				} as CompletedExecution;
			}

			// Create and store execution snapshot
			const executionSnapshot = createExecutionSnapshot({
				flow,
				execution: currentExecution,
				nodes,
				connections,
			});

			const { blobUrl } = await putExecutionAction(executionSnapshot);
			const runEndedAt = Date.now();
			dispatch({
				type: "addExecutionIndex",
				input: {
					executionIndex: {
						executionId: currentExecution.id,
						blobUrl,
						completedAt: runEndedAt,
					},
				},
			});
			await onFinishPerformExecution(runEndedAt, totalFlowDurationMs);
			return currentExecution;
		},
		[dispatch, putExecutionAction, addToast],
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
			const initialExecution: Execution = {
				id: executionId,
				status: "running",
				flowId,
				jobExecutions,
				artifacts: [],
				runStartedAt: flowRunStartedAt,
			};
			setExecution(initialExecution);

			const finalExecution = await performFlowExecution({
				initialExecution,
				flow,
				nodes: graph.nodes,
				connections: graph.connections,
				executeStepCallback: (stepId) =>
					executeStepAction(
						flowId,
						executionId,
						stepId,
						initialExecution.artifacts,
					),
				updateArtifactCallback: (artifactId, content) => {
					setExecution((prev) => {
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
				},
				onFinishPerformExecution: async (
					endedAt: number,
					totalDurationMs: number,
				) => {
					await onFinishPerformExecutionAction(
						flowRunStartedAt,
						endedAt,
						totalDurationMs,
					);
				},
			});
			setExecution(finalExecution);
		},
		[
			setPlaygroundMode,
			executeStepAction,
			flush,
			graph,
			performFlowExecution,
			onFinishPerformExecutionAction,
		],
	);

	const retryFlowExecution = useCallback(
		async (retryExecutionId: ExecutionId, forceRetryStepId?: StepId) => {
			const executionIndex = graph.executionIndexes.find(
				(executionIndex) => executionIndex.executionId === retryExecutionId,
			);
			if (executionIndex === undefined) {
				throw new Error("Execution not found");
			}
			const retryExecutionSnapshot = (await fetch(executionIndex.blobUrl).then(
				(res) => res.json(),
			)) as unknown as ExecutionSnapshot;

			await flush();
			const flowRunStartedAt = Date.now();
			const initialExecution: Execution = {
				id: createExecutionId(),
				flowId: retryExecutionSnapshot.flow.id,
				jobExecutions: buildJobExecutionsFromSnapshot(
					retryExecutionSnapshot,
					forceRetryStepId,
				),
				artifacts: buildArtifactsFromSnapshot(
					retryExecutionSnapshot,
					forceRetryStepId,
				),
				status: "running",
				runStartedAt: flowRunStartedAt,
			};
			const finalExecution = await performFlowExecution({
				initialExecution,
				flow: retryExecutionSnapshot.flow,
				nodes: retryExecutionSnapshot.nodes,
				connections: retryExecutionSnapshot.connections,
				executeStepCallback: (stepId) =>
					retryStepAction(
						executionIndex.blobUrl,
						initialExecution.id,
						stepId,
						initialExecution.artifacts,
					),
				updateArtifactCallback: (artifactId, content) => {
					setExecution((prev) => {
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
				},
				onFinishPerformExecution: async (endedAt, durationMs) => {
					await onFinishPerformExecutionAction(
						flowRunStartedAt,
						endedAt,
						durationMs,
					);
				},
			});
			setExecution(finalExecution);
		},
		[
			graph.executionIndexes,
			flush,
			retryStepAction,
			performFlowExecution,
			onFinishPerformExecutionAction,
		],
	);

	const executeNode = useCallback(
		async (nodeId: NodeId) => {
			setTab("Result");
			const executionId = createExecutionId();
			const flowRunStartedAt = Date.now();
			const node = graph.nodes.find((node) => node.id === nodeId);
			if (node === undefined) {
				throw new Error("Node not found");
			}

			const tmpFlows = deriveFlows({
				nodes: [node],
				connections: [],
			});
			if (tmpFlows.length !== 1) {
				throw new Error("Unexpected number of flows");
			}
			const tmpFlow = tmpFlows[0];

			// Initialize flow execution
			const initialExecution: Execution = {
				id: executionId,
				status: "running",
				jobExecutions: createInitialJobExecutions(tmpFlow),
				artifacts: [],
				runStartedAt: flowRunStartedAt,
			};
			setExecution(initialExecution);
			const finalExecution = await performFlowExecution({
				initialExecution,
				flow: tmpFlow,
				nodes: graph.nodes,
				connections: graph.connections,
				executeStepCallback: (stepId) =>
					executeNodeAction(executionId, node.id),
				updateArtifactCallback: (artifactId, content) => {
					dispatch({
						type: "upsertArtifact",
						input: {
							nodeId,
							artifact: {
								id: artifactId,
								type: "streamArtifact",
								creatorNodeId: nodeId,
								object: content,
							},
						},
					});
				},
				onStepFinish: (execution, artifact) => {
					dispatch({
						type: "upsertArtifact",
						input: {
							nodeId,
							artifact,
						},
					});
				},
				onFinishPerformExecution: async (endedAt, durationMs) => {
					await onFinishPerformExecutionAction(
						flowRunStartedAt,
						endedAt,
						durationMs,
					);
				},
			});
			setExecution(finalExecution);
		},
		[
			setTab,
			executeNodeAction,
			graph.connections,
			graph.nodes,
			performFlowExecution,
			dispatch,
			onFinishPerformExecutionAction,
		],
	);

	return (
		<ExecutionContext.Provider
			value={{
				execution,
				executeFlow,
				retryFlowExecution,
				executeNode,
				onFinishPerformExecutionAction,
			}}
		>
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

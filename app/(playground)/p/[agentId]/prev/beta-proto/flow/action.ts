import {
	type Artifact,
	type Flow,
	type FlowIndex,
	type GenerateResult,
	type Step,
	type StepId,
	type StepStatus,
	stepStatuses,
} from "./types";

const v2FlowIndexActionTypes = {
	setFlowIndex: "v2.setFlowIndex",
} as const;

type V2FlowIndexActionType =
	(typeof v2FlowIndexActionTypes)[keyof typeof v2FlowIndexActionTypes];

interface SetFlowIndexAction {
	type: Extract<V2FlowIndexActionType, "v2.setFlowIndex">;
	input: SetFlowIndexActionInput;
}
interface SetFlowIndexActionInput {
	flowIndexes: FlowIndex[];
}

export type V2FlowIndexAction = SetFlowIndexAction;

export function isV2FlowIndexAction(
	action: unknown,
): action is V2FlowIndexAction {
	return Object.values(v2FlowIndexActionTypes).includes(
		(action as V2FlowIndexAction).type,
	);
}

export function setFlowIndexes({ input }: { input: SetFlowIndexActionInput }) {
	return {
		type: v2FlowIndexActionTypes.setFlowIndex,
		input,
	};
}

export function v2FlowIndexReducer(
	flowIndexes: FlowIndex[],
	action: V2FlowIndexAction,
): FlowIndex[] {
	switch (action.type) {
		case v2FlowIndexActionTypes.setFlowIndex:
			return action.input.flowIndexes;
	}
	return flowIndexes;
}

const v2FlowActionTypes = {
	setFlow: "v2.setFlow",
	updateStep: "v2.updateStep",
	addArtifact: "v2.addArtifact",
} as const;

type V2FlowActionType =
	(typeof v2FlowActionTypes)[keyof typeof v2FlowActionTypes];

interface SetFlowAction {
	type: Extract<V2FlowActionType, "v2.setFlow">;
	input: SetFlowActionInput;
}
interface SetFlowActionInput {
	flow: Flow | null | undefined;
}
export function setFlow({ input }: { input: SetFlowActionInput }) {
	return {
		type: v2FlowActionTypes.setFlow,
		input,
	};
}

interface UpdateStepAction {
	type: Extract<V2FlowActionType, "v2.updateStep">;
	input: UpdateStepActionInput;
}
interface UpdateStepActionInput {
	stepId: StepId;
	status?: StepStatus;
	output?: Artifact;
}
export function updateStep({
	input,
}: {
	input: UpdateStepActionInput;
}): UpdateStepAction {
	return {
		type: v2FlowActionTypes.updateStep,
		input,
	};
}

interface AddArtifactAction {
	type: Extract<V2FlowActionType, "v2.addArtifact">;
	input: AddArtifactActionInput;
}
interface AddArtifactActionInput {
	artifact: Artifact;
}
export function addArtifact({
	input,
}: {
	input: AddArtifactActionInput;
}): AddArtifactAction {
	return {
		type: v2FlowActionTypes.addArtifact,
		input,
	};
}

export type V2FlowAction = SetFlowAction | UpdateStepAction | AddArtifactAction;

export function isV2FlowAction(action: unknown): action is V2FlowAction {
	return Object.values(v2FlowActionTypes).includes(
		(action as V2FlowAction).type,
	);
}

export function v2FlowReducer(
	flow: Flow | null | undefined,
	action: V2FlowAction,
): Flow | null | undefined {
	switch (action.type) {
		case v2FlowActionTypes.setFlow:
			return action.input.flow;
		case v2FlowActionTypes.addArtifact:
			if (flow == null) {
				return flow;
			}
			return {
				...flow,
				artifacts: [...flow.artifacts, action.input.artifact],
			};
		case v2FlowActionTypes.updateStep:
			if (flow == null) {
				return flow;
			}
			return {
				...flow,
				jobs: flow.jobs.map((job) => ({
					...job,
					steps: job.steps.map((step) => {
						if (step.id !== action.input.stepId) {
							return step;
						}
						const isInProgressStep =
							action.input.status === stepStatuses.queued ||
							action.input.status === stepStatuses.running;

						const updatedStatus =
							action.input.status !== undefined
								? {
										status: action.input.status,
									}
								: {};

						const updatedOutput =
							action.input.output !== undefined && !isInProgressStep
								? {
										output: action.input.output,
									}
								: {};

						return {
							...step,
							...updatedStatus,
							...updatedOutput,
						} as Step;
					}),
				})),
			};
	}
}

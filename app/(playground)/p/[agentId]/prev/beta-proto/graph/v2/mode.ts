import type { PlaygroundMode } from "../types";

const v2ModeActionTypes = {
	updateMode: "v2.updateMode",
} as const;
type V2ModeActionType =
	(typeof v2ModeActionTypes)[keyof typeof v2ModeActionTypes];

export function isV2ModeAction(action: unknown): action is V2ModeAction {
	return Object.values(v2ModeActionTypes).includes(
		(action as V2ModeAction).type,
	);
}

interface UpdateModeAction {
	type: Extract<V2ModeActionType, "v2.updateMode">;
	input: UpdateModeInput;
}

interface UpdateModeInput {
	mode: PlaygroundMode;
}

export function updateMode({ input }: { input: UpdateModeInput }) {
	return {
		type: v2ModeActionTypes.updateMode,
		input,
	};
}

export type V2ModeAction = UpdateModeAction;

export function v2ModeReducer(
	mode: PlaygroundMode,
	action: V2ModeAction,
): PlaygroundMode {
	switch (action.type) {
		case v2ModeActionTypes.updateMode:
			return action.input.mode;
	}
	return mode;
}

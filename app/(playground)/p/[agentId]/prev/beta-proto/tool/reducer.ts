import { ToolActionTypes, type ToolActions } from "./actions";
import type { ToolState } from "./types"; // Adjust import paths accordingly

export const toolReducer = (
	state: ToolState,
	action: ToolActions,
): ToolState => {
	switch (action.type) {
		case ToolActionTypes.SetTool:
			return {
				...state,
				activeTool: action.payload,
			};
		default:
			return state;
	}
};

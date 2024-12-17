import { readStreamableValue } from "ai/rsc";
import type { GiselleNode } from "../giselle-node/types";
import type { CompositeAction } from "../graph/context";
import { playgroundModes } from "../graph/types";
import { updateMode } from "../graph/v2/mode";
import { setFlow } from "./action";
import { executeFlow as executeFlowOnServer } from "./server-action";

export function executeFlow(finalNode: GiselleNode): CompositeAction {
	return async (dispatch, getState) => {
		dispatch(setFlow({ input: { flow: null } }));
		dispatch(
			updateMode({
				input: {
					mode: playgroundModes.view,
				},
			}),
		);
		try {
			const { streamableValue } = await executeFlowOnServer(
				getState().graph.agentId,
				finalNode.id,
			);
			for await (const streamContent of readStreamableValue(streamableValue)) {
				if (streamContent === undefined) {
					continue;
				}
				dispatch(streamContent);
			}
		} catch (error: unknown) {
			if (error instanceof Error) {
				global.alert(error.message);
			}
		}
	};
}

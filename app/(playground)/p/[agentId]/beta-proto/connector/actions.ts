import type { ConnectorObject } from "./types";

const v2ConnectorActionTypes = {
	set: "v2.setConnectors",
} as const;
type V2ConnectorActionType =
	(typeof v2ConnectorActionTypes)[keyof typeof v2ConnectorActionTypes];

interface SetConnectorsAction {
	type: Extract<V2ConnectorActionType, "v2.setConnectors">;
	input: SetConnectorsInput;
}
interface SetConnectorsInput {
	connectors: ConnectorObject[];
}
export function setConnectors({
	input,
}: { input: SetConnectorsInput }): SetConnectorsAction {
	return {
		type: v2ConnectorActionTypes.set,
		input,
	};
}
export type V2ConnectorAction = SetConnectorsAction;
export function isV2ConnectorAction(
	action: unknown,
): action is V2ConnectorAction {
	return Object.values(v2ConnectorActionTypes).includes(
		(action as V2ConnectorAction).type,
	);
}

export function v2ConnectorReducer(
	connectors: ConnectorObject[],
	action: V2ConnectorAction,
): ConnectorObject[] {
	switch (action.type) {
		case v2ConnectorActionTypes.set:
			return action.input.connectors;
	}
	return connectors;
}

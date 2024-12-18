import type { Parameter, ParameterBlueprint } from "./parameter/types";

export type GiselleNodeId = `nd_${string}`;

export function assertGiselleNodeId(id: string): asserts id is GiselleNodeId {
	if (!id.startsWith("nd_")) {
		throw new Error(`Invalid GiselleNodeId: ${id}`);
	}
}

export const giselleNodeCategories = {
	instruction: "instruction",
	action: "action",
} as const;
export type GiselleNodeCategory =
	(typeof giselleNodeCategories)[keyof typeof giselleNodeCategories];

export type GiselleNodeBlueprint = {
	object: "nodeBlueprint";
	category: GiselleNodeCategory;
	archetype: string;
	parameters?: ParameterBlueprint;
	resultPortLabel: string;
};

export type XYPosition = {
	x: number;
	y: number;
};

export const panelTabs = {
	prompt: "prompt",
	property: "property",
	status: "status",
	result: "result",
} as const;

export type PanelTab = (typeof panelTabs)[keyof typeof panelTabs];

export const giselleNodeState = {
	idle: "idle",
	inProgress: "inProgress",
	streaming: "streaming",
	completed: "completed",
} as const;

export type GiselleNodeState =
	(typeof giselleNodeState)[keyof typeof giselleNodeState];

export type GiselleNode = {
	id: GiselleNodeId;
	object: "node";
	name: string;
	category: GiselleNodeCategory;
	archetype: string;
	parameters?: Parameter;
	ui: {
		position: XYPosition;
		selected?: boolean;
		panelTab?: PanelTab;
		isInflluencable?: boolean;
		forceFocus?: boolean;
	};
	state: GiselleNodeState;
	resultPortLabel: string;
	properties: Record<string, unknown>;
	output: unknown;
	isFinal: boolean;
};

export type GiselleNodeArtifactElement = {
	id: GiselleNodeId;
	object: "node.artifactElement";
	name: string;
	archetype: string;
};

export type GiselleNodeWebSearchElement = {
	id: GiselleNodeId;
	object: "node.webSearchElement";
	name: string;
	category: GiselleNodeCategory;
	archetype: string;
	properties: Record<string, unknown>;
};

export type InferGiselleNodeObject<T extends GiselleNodeBlueprint> = {
	id: GiselleNodeId;
	object: "node";
	archetype: T["archetype"];
	category: T["category"];
	parameters?: T["parameters"] extends ParameterBlueprint
		? Parameter
		: undefined;
	ui: {
		position: XYPosition;
	};
	resultPortLabel: T["resultPortLabel"];
};

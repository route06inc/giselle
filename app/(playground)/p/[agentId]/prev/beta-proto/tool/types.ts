import type { GiselleNodeBlueprint } from "../giselle-node/types";

type SelectTool = { type: "select" };
export const selectTool: SelectTool = { type: "select" };
type HandTool = { type: "hand" };
export const handTool: HandTool = { type: "hand" };
type AddGiselleNodeTool = {
	type: "addGiselleNode";
	giselleNodeBlueprint: GiselleNodeBlueprint;
};

export type Tool = SelectTool | HandTool | AddGiselleNodeTool;

export type ToolState = {
	activeTool: Tool;
};

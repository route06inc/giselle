import { expect, test } from "bun:test";
import type { ConnectorObject } from "../connector/types";
import type { GiselleNode } from "../giselle-node/types";
import { allFlowEdges } from "./utils";

function psuedoGiselleNodes(arg: Partial<GiselleNode>[]): GiselleNode[] {
	return arg as GiselleNode[];
}
function psuedoConnectorObjects(
	arg: Partial<ConnectorObject>[],
): ConnectorObject[] {
	return arg as ConnectorObject[];
}
test("allFlowEdges", () => {
	const nodes = psuedoGiselleNodes([
		{
			id: "nd_q8s95392q17qqxhcpuwh5m2y",
			category: "instruction",
			isFinal: false,
		},
		{
			id: "nd_xt0yvo7t7yfag1g3zwo251ls",
			category: "action",
			isFinal: false,
		},
		{
			id: "nd_ap977wadp3ilr56y6dhzohic",
			category: "instruction",
			isFinal: false,
		},
		{
			id: "nd_zghyvjoxfhajvf62wz02f075",
			category: "action",
			isFinal: true,
		},
		{
			id: "nd_rmwwddl6pbvxr7bovsa38yfc",
			category: "instruction",
			isFinal: false,
		},
		{
			id: "nd_s6nkhge20wpjfudjbqdtqhhz",
			category: "action",
			isFinal: true,
		},
	]);
	const connectors = psuedoConnectorObjects([
		{
			source: "nd_q8s95392q17qqxhcpuwh5m2y",
			target: "nd_xt0yvo7t7yfag1g3zwo251ls",
			sourceNodeCategory: "instruction",
		},
		{
			source: "nd_ap977wadp3ilr56y6dhzohic",
			target: "nd_zghyvjoxfhajvf62wz02f075",
			sourceNodeCategory: "instruction",
		},
		{
			source: "nd_xt0yvo7t7yfag1g3zwo251ls",
			target: "nd_zghyvjoxfhajvf62wz02f075",
			sourceNodeCategory: "action",
		},
		{
			source: "nd_rmwwddl6pbvxr7bovsa38yfc",
			target: "nd_s6nkhge20wpjfudjbqdtqhhz",
			sourceNodeCategory: "instruction",
		},
		{
			source: "nd_xt0yvo7t7yfag1g3zwo251ls",
			target: "nd_s6nkhge20wpjfudjbqdtqhhz",
			sourceNodeCategory: "action",
		},
	]);
	expect(allFlowEdges(nodes, connectors)).toStrictEqual([
		{
			end: "nd_zghyvjoxfhajvf62wz02f075",
			start: "nd_xt0yvo7t7yfag1g3zwo251ls",
		},
		{
			end: "nd_s6nkhge20wpjfudjbqdtqhhz",
			start: "nd_xt0yvo7t7yfag1g3zwo251ls",
		},
	]);
});

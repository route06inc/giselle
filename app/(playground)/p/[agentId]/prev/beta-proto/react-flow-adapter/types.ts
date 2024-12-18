import type { Edge, Node } from "@xyflow/react";
import type { ConnectorObject } from "../connector/types";
import type { GiselleNode } from "../giselle-node/types";

export const giselleNodeType = "giselleNode";
export type ReactFlowNode = Node<GiselleNode>;

export const giselleEdgeType = "giselleEdge";
export type ReactFlowEdge = Edge<ConnectorObject>;

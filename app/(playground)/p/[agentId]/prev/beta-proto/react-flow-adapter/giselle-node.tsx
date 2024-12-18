import {
	BaseEdge,
	type Edge,
	type EdgeProps,
	type EdgeTypes,
	Handle,
	type Node,
	type NodeProps,
	type NodeTypes,
	Position,
	getBezierPath,
	useEdges,
} from "@xyflow/react";
import clsx from "clsx/lite";
import type { FC } from "react";
import type { ConnectorObject } from "../connector/types";
import { useFeatureFlags } from "../feature-flags/context";
import { GiselleNode } from "../giselle-node/components";
import {
	type GiselleNode as GiselleNodeType,
	giselleNodeCategories,
} from "../giselle-node/types";
import {
	type ReactFlowEdge as ReactFlowEdgeType,
	type ReactFlowNode as ReactFlowNodeType,
	giselleEdgeType,
	giselleNodeType,
} from "./types";

export const ReactFlowNode: FC<NodeProps<ReactFlowNodeType>> = ({
	data,
	selected,
	positionAbsoluteX,
	positionAbsoluteY,
}) => {
	const edges = useEdges<ReactFlowEdgeType>();
	const { debugFlag } = useFeatureFlags();
	return (
		<GiselleNode
			{...data}
			ui={{
				...data.ui,
				position: {
					x: positionAbsoluteX,
					y: positionAbsoluteY,
				},
				selected,
			}}
			parameterPortHandle={({ id, className }) => (
				<Handle
					id={id}
					className={className}
					type="target"
					position={Position.Left}
				/>
			)}
			resultPortHandle={({ id, className, state }) => (
				<Handle
					id={id}
					className={className}
					type="source"
					position={Position.Right}
					data-state={state}
				/>
			)}
			incomingConnections={edges
				.filter((edge) => edge.target === data.id)
				.map((edge) => edge.data)
				.filter((connector) => connector != null)}
			outgoingConnections={edges
				.filter((edge) => edge.source === data.id)
				.map((edge) => edge.data)
				.filter((connector) => connector != null)}
			debug={debugFlag}
		/>
	);
};

export const ReactFlowEdge: FC<EdgeProps<ReactFlowEdgeType>> = ({
	id,
	sourceX,
	sourceY,
	sourcePosition,
	targetX,
	targetY,
	targetPosition,
	data,
}) => {
	const [edgePath] = getBezierPath({
		sourceX,
		sourceY,
		sourcePosition,
		targetX,
		targetY,
		targetPosition,
	});
	if (data == null) {
		return null;
	}
	return (
		<>
			<BaseEdge
				id={id}
				path={edgePath}
				className={clsx(
					"!stroke-[2px] bg-white drop-shadow-[0px_0px_16px_0px_hsla(187,_79%,_54%,_0.5)]",
					data.sourceNodeCategory === giselleNodeCategories.instruction &&
						data.targetNodeCategory === giselleNodeCategories.action &&
						" !stroke-[url(#instructionToAction)]",
					data.sourceNodeCategory === giselleNodeCategories.action &&
						data.targetNodeCategory === giselleNodeCategories.action &&
						" !stroke-[url(#actionToAction)]",
				)}
			/>
		</>
	);
};

export const nodeTypes: NodeTypes = {
	[giselleNodeType]: ReactFlowNode,
};

export const edgeTypes: EdgeTypes = {
	[giselleEdgeType]: ReactFlowEdge,
};

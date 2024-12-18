import {
	BaseEdge,
	type EdgeProps,
	type Edge as XYFlowEdge,
	getBezierPath,
} from "@xyflow/react";
import clsx from "clsx/lite";
import type { Connection } from "../types";

export type Edge = XYFlowEdge<{ connection: Connection }>;

export function Edge({
	id,
	sourceX,
	sourceY,
	sourcePosition,
	targetX,
	targetY,
	targetPosition,
	data,
}: EdgeProps<Edge>) {
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
		<g
			className="group"
			data-source-node-type={data.connection.sourceNodeType}
			data-target-node-type={data.connection.targetNodeType}
		>
			<BaseEdge
				id={id}
				path={edgePath}
				className={clsx(
					"!stroke-[2px] bg-white drop-shadow-[0px_0px_16px_0px_hsla(187,_79%,_54%,_0.5)]",
					"group-data-[source-node-type=variable]:group-data-[target-node-type=action]:!stroke-[url(#instructionToAction)]",
					"group-data-[source-node-type=action]:group-data-[target-node-type=action]:!stroke-[url(#actionToAction)]",
				)}
			/>
			<defs>
				<linearGradient
					id="instructionToAction"
					x1="0%"
					y1="0%"
					x2="100%"
					y2="0%"
				>
					<stop offset="0%" stopColor="#FFFBF7" />
					<stop offset="100%" stopColor="#24BED2" />
				</linearGradient>
				<linearGradient id="actionToAction" x1="0%" y1="0%" x2="100%" y2="0%">
					<stop offset="0%" stopColor="#24BED2" />
					<stop offset="100%" stopColor="#24BED2" />
				</linearGradient>
			</defs>
		</g>
	);
}

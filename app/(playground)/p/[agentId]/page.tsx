import "@xyflow/react/dist/style.css";
import { getTeamMembershipByAgentId } from "@/app/(auth)/lib/get-team-membership-by-agent-id";
import { agents, db } from "@/drizzle";
import {
	debugFlag as getDebugFlag,
	uploadFileToPromptNodeFlag as getUploadFileToPromptNodeFlag,
	viewFlag as getViewFlag,
	webSearchNodeFlag as getWebSearchNodeFlag,
} from "@/flags";
import { getUser } from "@/lib/supabase";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Playground } from "./beta-proto/component";
import type { Graph } from "./beta-proto/graph/types";
import {
	type ReactFlowEdge,
	type ReactFlowNode,
	giselleEdgeType,
	giselleNodeType,
} from "./beta-proto/react-flow-adapter/types";
import type { AgentId } from "./beta-proto/types";

// 5 minutes
export const maxDuration = 1000 * 60 * 5;

function graphToReactFlow(grpah: Graph) {
	const nodes: ReactFlowNode[] = grpah.nodes.map((node) => {
		return {
			id: node.id,
			type: giselleNodeType,
			position: node.ui.position,
			selected: node.ui.selected,
			data: {
				...node,
			},
		};
	});

	const edges: ReactFlowEdge[] = grpah.connectors.map((connector) => {
		return {
			id: connector.id,
			type: giselleEdgeType,
			source: connector.source,
			target: connector.target,
			targetHandle: connector.targetHandle,
			data: connector,
		};
	});

	return {
		nodes,
		edges,
	};
}

async function getAgent(agentId: AgentId) {
	const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));
	const xyFlow = graphToReactFlow(agent.graphv2);
	return {
		...agent,
		graphv2: {
			...agent.graphv2,
			xyFlow,
		},
	};
}

export default async function AgentPlaygroundPage({
	params,
}: {
	params: Promise<{ agentId: AgentId }>;
}) {
	const { agentId } = await params;
	const user = await getUser();

	const teamMembership = await getTeamMembershipByAgentId(agentId, user.id);

	if (!teamMembership) {
		notFound();
	}

	const uploadFileToPromptNodeFlag = await getUploadFileToPromptNodeFlag();
	const webSearchNodeFlag = await getWebSearchNodeFlag();
	const debugFlag = await getDebugFlag();
	const viewFlag = await getViewFlag();

	const agent = await getAgent(agentId);

	return (
		<Playground
			agentId={agentId}
			graph={agent.graphv2}
			featureFlags={{
				uploadFileToPromptNodeFlag,
				webSearchNodeFlag,
				debugFlag,
				viewFlag,
			}}
		/>
	);
}

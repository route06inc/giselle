import { getCurrentTeam } from "@/app/(auth)/lib";
import { putGraph } from "@/app/(playground)/p/[agentId]/canary/actions";
import { Button } from "@/components/ui/button";
import { agents, db, supabaseUserMappings, teamMemberships } from "@/drizzle";
import { getUser } from "@/lib/supabase";
import { createId } from "@paralleldrive/cuid2";
import { put } from "@vercel/blob";
import { and, eq, isNotNull } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { vercelBlobGraphFolder } from "../../(playground)/p/[agentId]/canary/constants";
import {
	buildGraphPath,
	initGraph,
	pathJoin,
} from "../../(playground)/p/[agentId]/canary/utils";

async function AgentList({
	userId,
	createAgentAction,
}: { userId: string; createAgentAction: () => void }) {
	const dbAgents = await db
		.select({ id: agents.id, name: agents.name })
		.from(agents)
		.innerJoin(teamMemberships, eq(agents.teamDbId, teamMemberships.teamDbId))
		.innerJoin(
			supabaseUserMappings,
			eq(teamMemberships.userDbId, supabaseUserMappings.userDbId),
		)
		.where(
			and(
				eq(supabaseUserMappings.supabaseUserId, userId),
				isNotNull(agents.graphUrl),
			),
		);
	if (dbAgents.length === 0) {
		return (
			<div className="flex justify-center items-center h-full">
				<div className="grid gap-[12px] justify-center text-center">
					<div>No agents found</div>
					<Button type="button" onClick={createAgentAction}>
						Create an agent
					</Button>
				</div>
			</div>
		);
	}
	return (
		<div className="mt-[24px] px-[16px]">
			<div className="flex justify-end">
				<Button type="button" onClick={createAgentAction} className="w-[200px]">
					Create an agent
				</Button>
			</div>
			{dbAgents.map((agent) => (
				<div key={agent.id}>
					<Link href={`/p/${agent.id}/canary`}>
						{agent.name ?? "Unname Agent"}
					</Link>
				</div>
			))}
		</div>
	);
}
export async function AgentListV2() {
	const user = await getUser();
	async function createAgentAction() {
		"use server";

		const graph = initGraph();
		const agentId = `agnt_${createId()}` as const;
		const { url } = await putGraph(graph);
		const team = await getCurrentTeam();
		await db.insert(agents).values({
			id: agentId,
			teamDbId: team.dbId,
			graphUrl: url,
			graphv2: {
				agentId,
				nodes: [],
				xyFlow: {
					nodes: [],
					edges: [],
				},
				connectors: [],
				artifacts: [],
				webSearches: [],
				mode: "edit",
				flowIndexes: [],
			},
		});
		redirect(`/p/${agentId}`);
	}

	return <AgentList userId={user.id} createAgentAction={createAgentAction} />;
}

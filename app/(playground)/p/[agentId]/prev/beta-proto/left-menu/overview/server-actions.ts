"use server";

import { agents, db } from "@/drizzle";
import { revalidateGetAgents } from "@/services/agents/actions/get-agent";
import { fetchCurrentTeam } from "@/services/teams";
import { eq } from "drizzle-orm";
import type { AgentId } from "../../types";

interface UpdateAgentNameInput {
	agentId: AgentId;
	name: string;
}
export async function updateAgentName(input: UpdateAgentNameInput) {
	const currentTeam = await fetchCurrentTeam();
	await db
		.update(agents)
		.set({ name: input.name })
		.where(eq(agents.id, input.agentId));
	revalidateGetAgents({ teamDbId: currentTeam.dbId });
}

"use server";

import { db, gitHubIntegrations } from "@/drizzle";
import type {
	GitHubNextAction,
	GitHubTriggerEvent,
} from "@/services/external/github/types";
import type { GiselleNodeId } from "../../giselle-node/types";
import type { GitHubIntegrationId } from "../../github-integration/types";
import { generateId } from "../../github-integration/utils";
import type { AgentId } from "../../types";

interface SaveInput {
	id: GitHubIntegrationId | undefined;
	agentId: AgentId;
	repositoryFullName: string;
	callSign: string;
	event: GitHubTriggerEvent;
	nextAction: GitHubNextAction;
	startNodeId: GiselleNodeId;
	endNodeId: GiselleNodeId;
}
export async function save(input: SaveInput) {
	const agent = await db.query.agents.findFirst({
		where: (agents, { eq }) => eq(agents.id, input.agentId),
	});
	if (agent === undefined) {
		throw new Error(`Agent with id ${input.agentId} not found`);
	}
	await db
		.insert(gitHubIntegrations)
		.values({
			id: input.id ?? generateId(),
			agentDbId: agent.dbId,
			repositoryFullName: input.repositoryFullName,
			callSign: input.callSign,
			event: input.event,
			startNodeId: input.startNodeId,
			endNodeId: input.endNodeId,
			nextAction: input.nextAction,
		})
		.onConflictDoUpdate({
			target: gitHubIntegrations.id,
			set: {
				agentDbId: agent.dbId,
				repositoryFullName: input.repositoryFullName,
				callSign: input.callSign,
				event: input.event,
				startNodeId: input.startNodeId,
				endNodeId: input.endNodeId,
				nextAction: input.nextAction,
			},
		});
}

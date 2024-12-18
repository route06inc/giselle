"use server";

import { playgroundModes } from "@/app/(playground)/p/[agentId]/prev/beta-proto/graph/types";
import { agents, db } from "@/drizzle";
import { createId } from "@paralleldrive/cuid2";
import { revalidateGetAgents } from "./get-agent";

type CreateAgentArgs = {
	teamDbId: number;
	creatorDbId: number;
};
export const createAgent = async (args: CreateAgentArgs) => {
	const id = `agnt_${createId()}` as const;
	await db.insert(agents).values({
		id,
		teamDbId: args.teamDbId,
		creatorDbId: args.creatorDbId,
		graphv2: {
			agentId: id,
			nodes: [],
			xyFlow: {
				nodes: [],
				edges: [],
			},
			connectors: [],
			artifacts: [],
			webSearches: [],
			mode: playgroundModes.edit,
			flowIndexes: [],
		},
	});
	revalidateGetAgents({
		teamDbId: args.teamDbId,
	});
	return { id };
};

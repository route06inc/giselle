import { agentActivities, agents, db } from "@/drizzle";
import type { AgentActivity } from "@/services/agents/activities";
import { eq } from "drizzle-orm";

export async function saveAgentActivity(activity: AgentActivity) {
	if (activity.endedAt == null) {
		throw new Error("Activity must be ended before saving");
	}
	const records = await db
		.select({ agentDbId: agents.dbId })
		.from(agents)
		.where(eq(agents.id, activity.agentId));
	if (records.length === 0) {
		throw new Error(`Agent with id ${activity.agentId} not found`);
	}
	const agentDbId = records[0].agentDbId;

	await db.insert(agentActivities).values({
		agentDbId,
		startedAt: activity.startedAt,
		endedAt: activity.endedAt,
		totalDurationMs: activity.totalDurationMs().toString(),
	});
}

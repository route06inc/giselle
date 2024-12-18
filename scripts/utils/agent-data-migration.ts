import { giselleNodeCategories } from "@/app/(playground)/p/[agentId]/prev/beta-proto/giselle-node/types";
import { agents, db } from "@/drizzle";
import { eq } from "drizzle-orm";

function splitArrayIntoChunks<T>(array: T[], chunkSize: number): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < array.length; i += chunkSize) {
		chunks.push(array.slice(i, i + chunkSize));
	}
	return chunks;
}
export type MigrateGraphV2Function = (
	agent: typeof agents.$inferSelect,
) => (typeof agents.$inferSelect)["graphv2"];

interface AgentMigrationhandler {
	migrateGraphV2: MigrateGraphV2Function;
}
export async function migrateAgents(input: AgentMigrationhandler) {
	const listOfAgents = await db.select().from(agents);
	console.log(`Updating ${listOfAgents.length} agents...`);

	const agentChunks = splitArrayIntoChunks(listOfAgents, 10);

	for (let i = 0; i < agentChunks.length; i++) {
		const chunk = agentChunks[i];
		console.log(
			`  ├ Processing chunk ${i + 1}/${agentChunks.length} (${chunk.length} agents)`,
		);

		await Promise.all(
			chunk.map(async (agent) => {
				const migrateGraphV2 = input.migrateGraphV2(agent);
				await db
					.update(agents)
					.set({
						graphv2: migrateGraphV2,
					})
					.where(eq(agents.id, agent.id));
			}),
		);

		console.log(`  │ └ Completed chunk ${i + 1}/${agentChunks.length}`);
	}
}

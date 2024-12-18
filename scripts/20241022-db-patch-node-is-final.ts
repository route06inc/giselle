import { giselleNodeCategories } from "@/app/(playground)/p/[agentId]/prev/beta-proto/giselle-node/types";
import { agents, db } from "@/drizzle";
import { eq } from "drizzle-orm";

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < array.length; i += chunkSize) {
		chunks.push(array.slice(i, i + chunkSize));
	}
	return chunks;
}

console.log("Add 'isFinal' to the all of the nodes...");
const listOfAgents = await db.select().from(agents);
console.log(`Updating ${listOfAgents.length} agents...`);

const agentChunks = chunkArray(listOfAgents, 10);

for (let i = 0; i < agentChunks.length; i++) {
	const chunk = agentChunks[i];
	console.log(
		`  ├ Processing chunk ${i + 1}/${agentChunks.length} (${chunk.length} agents)`,
	);

	await Promise.all(
		chunk.map(async (agent) => {
			const instructionNodes = agent.graphv2.nodes.filter(
				(node) => node.category === giselleNodeCategories.instruction,
			);
			const actionNodes = agent.graphv2.nodes.filter(
				(node) => node.category === giselleNodeCategories.action,
			);
			await db
				.update(agents)
				.set({
					graphv2: {
						...agent.graphv2,
						nodes: [
							...instructionNodes.map((node) => ({
								...node,
								isFinal: false,
							})),
							...actionNodes.map((node, index) => ({
								...node,
								isFinal: index === actionNodes.length - 1,
							})),
						],
					},
				})
				.where(eq(agents.id, agent.id));
		}),
	);

	console.log(`  │ └ Completed chunk ${i + 1}/${i + 1}`);
}
console.log("All agents have been updated!");

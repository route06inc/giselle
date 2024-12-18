import { giselleNodeArchetypes } from "@/app/(playground)/p/[agentId]/prev/beta-proto/giselle-node/blueprints";
import { agents, db } from "@/drizzle";
import { eq } from "drizzle-orm";

const listOfAgents = await db.select().from(agents);
for (const agent of listOfAgents) {
	const updateAgents = [];
	let newGraph = agent.graphv2;
	let hasChanged = false;
	for (const node of agent.graphv2.nodes) {
		if (node.archetype !== giselleNodeArchetypes.prompt) {
			continue;
		}
		if (!Array.isArray(node.properties.sources)) {
			continue;
		}
		const newProperties = {
			...node.properties,
			sources: node.properties.sources.map((source) =>
				typeof source !== "string"
					? null
					: {
							id: source,
							object: "artifact.reference",
						},
			),
		};
		hasChanged = true;
		newGraph = {
			...newGraph,
			nodes: newGraph.nodes.map((n) =>
				n.id === node.id ? { ...n, properties: newProperties } : n,
			),
		};
	}
	if (hasChanged) {
		await db
			.update(agents)
			.set({ graphv2: newGraph })
			.where(eq(agents.id, agent.id));
	}
}

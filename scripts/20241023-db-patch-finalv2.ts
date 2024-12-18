import { playgroundModes } from "@/app/(playground)/p/[agentId]/prev/beta-proto/graph/types";
import {
	type MigrateGraphV2Function,
	migrateAgents,
} from "./utils/agent-data-migration";

// Logging the start of the operation with more detail
console.log(
	"Starting the update of agent data to set 'isFinal' property on nodes.",
);

// Function to update the graph of an agent
const updateAgentGraph: MigrateGraphV2Function = (agent) => {
	const updatedNodes = agent.graphv2.nodes.map((node) => ({
		...node,
		isFinal: !agent.graphv2.connectors.some(
			(connector) => connector.source === node.id,
		),
	}));

	return {
		...agent.graphv2,
		nodes: updatedNodes,
		mode: playgroundModes.edit,
	};
};

await migrateAgents({
	migrateGraphV2: updateAgentGraph, // Pass the function instead of inline definition
});

// Final log statement completion
console.log("All agents have been successfully updated!");

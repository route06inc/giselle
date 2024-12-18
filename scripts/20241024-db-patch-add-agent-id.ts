import { playgroundModes } from "@/app/(playground)/p/[agentId]/prev/beta-proto/graph/types";
import {
	type MigrateGraphV2Function,
	migrateAgents,
} from "./utils/agent-data-migration";

// Logging the start of the operation with more detail
console.log(
	"Starting the update of agent data to set 'agentId' property on graph.",
);

// Function to update the graph of an agent
const updateAgentGraph: MigrateGraphV2Function = (agent) => ({
	...agent.graphv2,
	agentId: agent.id,
});

await migrateAgents({
	migrateGraphV2: updateAgentGraph, // Pass the function instead of inline definition
});

// Final log statement completion
console.log("All agents have been successfully updated!");

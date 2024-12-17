import { agents, db } from "@/drizzle";
import { developerFlag } from "@/flags";
import { fetchCurrentUser } from "@/services/accounts";
import { fetchCurrentTeam } from "@/services/teams";
import { createId } from "@paralleldrive/cuid2";
import { notFound } from "next/navigation";
import { putGraph } from "../../(playground)/p/[agentId]/canary/actions";
import type {
	AgentId,
	Graph,
} from "../../(playground)/p/[agentId]/canary/types";
import AgentIdForm from "./agent-id-form";

export default async function CopyAgentPage() {
	const developerMode = await developerFlag();
	if (!developerMode) {
		return notFound();
	}

	return (
		<div className="font-mono p-8 text-black-30">
			<p>
				Please fill in the agent id, then copy it in your
				account.(agnt_[0-9a-zA-Z]+)
			</p>
			<AgentIdForm />
		</div>
	);
}

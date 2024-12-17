import { fetchCurrentTeam, isProPlan } from "@/services/teams";
import { calculateAgentTimeUsageMs } from "./agent-time-usage";
import { AGENT_TIME_CHARGE_LIMIT_MINUTES } from "./constants";

export async function hasEnoughAgentTimeCharge() {
	const curerntTeam = await fetchCurrentTeam();
	// If team is on a pro plan, proceed
	if (isProPlan(curerntTeam)) {
		return true;
	}

	// If team is on a free plan, check agent time usage
	const timeUsageMs = await calculateAgentTimeUsageMs(curerntTeam.dbId);
	const limitsInMs = AGENT_TIME_CHARGE_LIMIT_MINUTES.FREE * 60 * 1000;
	if (timeUsageMs >= limitsInMs) {
		return false;
	}

	return true;
}

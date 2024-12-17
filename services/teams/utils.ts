import type { CurrentTeam } from "./types";

export function isProPlan(team: CurrentTeam) {
	return team.activeSubscriptionId != null || team.type === "internal";
}

import { updateGiselleSession } from "@/lib/giselle-session";
import { fetchUserTeams } from "./";

export async function setCurrentTeam(teamDbId: number) {
	const teams = await fetchUserTeams();
	const team = teams.find((t) => t.dbId === teamDbId);
	if (team == null) {
		throw new Error("Team not found");
	}
	await updateGiselleSession({ teamDbId: teamDbId });
}

import { fetchCurrentTeam, fetchUserTeams } from "../";
import { TeamSelectionForm } from "./team-selection-form";

export async function TeamSelection() {
	const allTeams = await fetchUserTeams();
	const currentTeam = await fetchCurrentTeam();

	return <TeamSelectionForm allTeams={allTeams} currentTeam={currentTeam} />;
}

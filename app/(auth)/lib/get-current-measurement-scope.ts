import { fetchCurrentTeam } from "@/services/teams";

/**
 * Get the current measurement scope.
 *
 * @returns The current measurement scope.
 */
export async function getCurrentMeasurementScope() {
	const currentTeam = await fetchCurrentTeam();
	return currentTeam.dbId;
}

import { Card } from "@/app/(main)/settings/components/card";
import { fetchCurrentTeam, isProPlan } from "@/services/teams";
import { getCurrentUserRole } from "./actions";
import { TeamMembersForm } from "./team-members-form";
import { TeamMembersList } from "./team-members-list";

export async function TeamMembers() {
	const team = await fetchCurrentTeam();
	const { data: teamRole } = await getCurrentUserRole();

	return (
		<Card title="Team members">
			{isProPlan(team) && teamRole === "admin" && <TeamMembersForm />}
			<TeamMembersList />
		</Card>
	);
}

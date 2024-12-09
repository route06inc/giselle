import { Card } from "@/app/(main)/settings/components/card";
import { fetchCurrentTeam, isProPlan } from "@/services/teams";
import { getCurrentUserRole, getTeamMembers } from "./actions";
import { TeamMembersForm } from "./team-members-form";
import { TeamMembersList } from "./team-members-list";

export async function TeamMembers() {
	const team = await fetchCurrentTeam();
	const { data: teamRole } = await getCurrentUserRole();

	const result = await getTeamMembers();
	const currentUserRoleResult = await getCurrentUserRole();

	if (!result.success || !result.data) {
		return (
			<Card title="Team members">
				<div className="text-sm text-destructive">
					Failed to load team members
				</div>
			</Card>
		);
	}

	if (!currentUserRoleResult.success || !currentUserRoleResult.data) {
		return (
			<Card title="Team members">
				<div className="text-sm text-destructive">
					Failed to get current user role
				</div>
			</Card>
		);
	}

	return (
		<Card title="Team members">
			{isProPlan(team) && teamRole === "admin" && <TeamMembersForm />}
			<TeamMembersList
				members={result.data}
				currentUserRole={currentUserRoleResult.data}
			/>
		</Card>
	);
}

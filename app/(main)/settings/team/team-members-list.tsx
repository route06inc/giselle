"use client";

import type { TeamRole } from "@/drizzle";
import { useState } from "react";
import { TeamMemberListItem } from "./team-members-list-item";

type TeamMembersListProps = {
	members: {
		userId: string;
		displayName: string | null;
		email: string | null;
		role: TeamRole;
	}[];
	currentUserRole: TeamRole;
};

export function TeamMembersList({
	members,
	currentUserRole,
}: TeamMembersListProps) {
	const currentUserRoleState = useState(currentUserRole);

	return (
		<div className="font-avenir rounded-[16px]">
			<div className="grid grid-cols-[1fr_1fr_200px] gap-4 border-b border-zinc-800 bg-zinc-900/50 p-4 font-medium text-zinc-200">
				<div>Display name</div>
				<div>Email</div>
				<div>Role</div>
			</div>
			<div className="divide-y divide-zinc-800">
				{members.map((member) => (
					<TeamMemberListItem
						key={member.userId}
						userId={member.userId}
						displayName={member.displayName}
						email={member.email}
						role={member.role}
						currentUserRoleState={currentUserRoleState}
					/>
				))}
			</div>
		</div>
	);
}

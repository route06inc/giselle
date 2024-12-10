"use server";

import {
	type TeamRole,
	type UserId,
	db,
	supabaseUserMappings,
	teamMemberships,
	teams,
	users,
} from "@/drizzle";
import { getUser } from "@/lib/supabase";
import { fetchCurrentTeam, isProPlan } from "@/services/teams";
import { and, asc, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function isUserId(value: string): value is UserId {
	return value.startsWith("usr_");
}

function isTeamRole(role: string): role is TeamRole {
	return role === "admin" || role === "member";
}

export async function updateTeamName(teamDbId: number, formData: FormData) {
	const newName = formData.get("name") as string;
	const user = await getUser();

	try {
		await db.transaction(async (tx) => {
			const team = await tx
				.select({ dbId: teams.dbId })
				.from(teams)
				.for("update")
				.innerJoin(teamMemberships, eq(teams.dbId, teamMemberships.teamDbId))
				.innerJoin(
					supabaseUserMappings,
					eq(teamMemberships.userDbId, supabaseUserMappings.userDbId),
				)
				.where(
					and(
						eq(supabaseUserMappings.supabaseUserId, user.id),
						eq(teams.dbId, teamDbId),
					),
				);

			if (team.length === 0) {
				throw new Error("Team not found");
			}

			await tx
				.update(teams)
				.set({ name: newName })
				.where(eq(teams.dbId, team[0].dbId));
		});
		revalidatePath("/settings/team");

		return { success: true };
	} catch (error) {
		console.error("Failed to update team name:", error);
		return { success: false, error };
	}
}

export async function getTeamMembers() {
	try {
		const supabaseUser = await getUser();

		// Subquery: Get current user's team
		// TODO: In the future, this query will be changed to retrieve from the selected team ID
		const currentUserTeam = db
			.select({
				teamDbId: teams.dbId,
			})
			.from(teams)
			.innerJoin(teamMemberships, eq(teams.dbId, teamMemberships.teamDbId))
			.innerJoin(
				supabaseUserMappings,
				eq(teamMemberships.userDbId, supabaseUserMappings.userDbId),
			)
			.where(eq(supabaseUserMappings.supabaseUserId, supabaseUser.id))
			.limit(1);

		// Main query: Get team members list
		const teamMembers = await db
			.select({
				userId: users.id,
				email: users.email,
				displayName: users.displayName,
				role: teamMemberships.role,
			})
			.from(users)
			.innerJoin(
				teamMemberships,
				and(
					eq(users.dbId, teamMemberships.userDbId),
					eq(teamMemberships.teamDbId, currentUserTeam),
				),
			)
			.orderBy(asc(teamMemberships.id));

		return {
			success: true,
			data: teamMembers,
		};
	} catch (error) {
		console.error("Failed to get team members:", error);

		return {
			success: false,
			error:
				error instanceof Error ? error.message : "Failed to get team members",
		};
	}
}

export async function addTeamMember(formData: FormData) {
	try {
		const email = formData.get("email") as string;
		const role = formData.get("role") as string;

		if (!isTeamRole(role)) {
			throw new Error("Invalid role");
		}

		// 1. Get current team
		const currentTeam = await fetchCurrentTeam();
		if (!isProPlan(currentTeam)) {
			throw new Error("Only pro plan teams can add members");
		}

		// 2. Get current user role and verify admin permission
		const currentUserRoleResult = await getCurrentUserRole();
		if (
			!currentUserRoleResult.success ||
			currentUserRoleResult.data !== "admin"
		) {
			throw new Error("Only admin users can add team members");
		}

		// 3. Find user by email
		const user = await db
			.select()
			.from(users)
			.where(eq(users.email, email))
			.limit(1);

		if (user.length === 0) {
			throw new Error("User not found");
		}

		// 4. Check if user is already a team member
		const existingMembership = await db
			.select()
			.from(teamMemberships)
			.where(
				and(
					eq(teamMemberships.teamDbId, currentTeam.dbId),
					eq(teamMemberships.userDbId, user[0].dbId),
				),
			);

		if (existingMembership.length > 0) {
			throw new Error("User is already a team member");
		}

		// 5. Create team membership
		await db.insert(teamMemberships).values({
			teamDbId: currentTeam.dbId,
			userDbId: user[0].dbId,
			role,
		});

		revalidatePath("/settings/team");

		return { success: true };
	} catch (error) {
		console.error("Failed to add team member:", error);

		return {
			success: false,
			error:
				error instanceof Error ? error.message : "Failed to add team member",
		};
	}
}

export async function updateTeamMemberRole(formData: FormData) {
	try {
		const userId = formData.get("userId") as string;
		const role = formData.get("role") as string;

		if (!isUserId(userId)) {
			throw new Error("Invalid user ID");
		}

		if (!isTeamRole(role)) {
			throw new Error("Invalid role");
		}

		// 1. Get current user info and verify admin permission
		const currentUserRoleResult = await getCurrentUserRole();
		if (
			!currentUserRoleResult.success ||
			currentUserRoleResult.data !== "admin"
		) {
			throw new Error("Only admin users can update member roles");
		}

		const supabaseUser = await getUser();
		const currentUser = await db
			.select({ id: users.id })
			.from(users)
			.innerJoin(
				supabaseUserMappings,
				eq(users.dbId, supabaseUserMappings.userDbId),
			)
			.where(eq(supabaseUserMappings.supabaseUserId, supabaseUser.id))
			.limit(1);

		const isUpdatingSelf = currentUser[0].id === userId;

		// 2. Get current team
		const currentTeam = await fetchCurrentTeam();

		// 3. Get target user's dbId from users table
		const user = await db
			.select({ dbId: users.dbId })
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		if (user.length === 0) {
			throw new Error("User not found");
		}

		// 4. If changing from admin to member, check if this is the last admin
		if (role === "member") {
			const adminCount = await db
				.select({
					count: count(),
				})
				.from(teamMemberships)
				.where(
					and(
						eq(teamMemberships.teamDbId, currentTeam.dbId),
						eq(teamMemberships.role, "admin"),
					),
				);

			// Check if the user being updated is currently an admin
			const targetUserRole = await db
				.select({ role: teamMemberships.role })
				.from(teamMemberships)
				.where(
					and(
						eq(teamMemberships.teamDbId, currentTeam.dbId),
						eq(teamMemberships.userDbId, user[0].dbId),
					),
				)
				.limit(1);

			if (targetUserRole[0].role === "admin" && adminCount[0].count === 1) {
				throw new Error("Cannot remove the last admin from the team");
			}
		}

		// 5. Update team membership role
		await db
			.update(teamMemberships)
			.set({ role })
			.where(
				and(
					eq(teamMemberships.teamDbId, currentTeam.dbId),
					eq(teamMemberships.userDbId, user[0].dbId),
				),
			);

		revalidatePath("/settings/team");

		return {
			success: true,
			isUpdatingSelf,
		};
	} catch (error) {
		console.error("Failed to update team member role:", error);

		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: "Failed to update team member role",
			isUpdatingSelf: false,
		};
	}
}

export async function getCurrentUserRole() {
	try {
		const supabaseUser = await getUser();
		const currentTeam = await fetchCurrentTeam();

		const result = await db
			.select({
				role: teamMemberships.role,
			})
			.from(teamMemberships)
			.innerJoin(
				supabaseUserMappings,
				eq(teamMemberships.userDbId, supabaseUserMappings.userDbId),
			)
			.where(
				and(
					eq(supabaseUserMappings.supabaseUserId, supabaseUser.id),
					eq(teamMemberships.teamDbId, currentTeam.dbId),
				),
			)
			.limit(1);

		if (result.length === 0) {
			throw new Error("User role not found");
		}

		return {
			success: true,
			data: result[0].role,
		};
	} catch (error) {
		console.error("Failed to get current user role:", error);

		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: "Failed to get current user role",
		};
	}
}

"use server";

import {
	db,
	supabaseUserMappings,
	teamMemberships,
	teams,
	users,
} from "@/drizzle";
import { isEmailFromRoute06 } from "@/lib/utils";
import { createId } from "@paralleldrive/cuid2";
import type { User } from "@supabase/auth-js";

export const initializeAccount = async (
	supabaseUserId: User["id"],
	supabaseUserEmail: User["email"],
) => {
	const result = await db.transaction(async (tx) => {
		const userId = `usr_${createId()}` as const;
		const [user] = await tx
			.insert(users)
			.values({
				id: userId,
				email: supabaseUserEmail,
			})
			.returning({
				dbId: users.dbId,
			});
		await tx.insert(supabaseUserMappings).values({
			userDbId: user.dbId,
			supabaseUserId,
		});
		const [team] = await tx
			.insert(teams)
			.values({
				name: "default",
				type: isEmailFromRoute06(supabaseUserEmail ?? "")
					? "internal"
					: "customer",
			})
			.returning({
				id: teams.dbId,
			});

		await tx.insert(teamMemberships).values({
			userDbId: user.dbId,
			teamDbId: team.id,
			role: "admin",
		});
		return { id: userId };
	});
	return result;
};

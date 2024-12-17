import { db, supabaseUserMappings, users } from "@/drizzle";
import { getUser } from "@/lib/supabase";
import { eq } from "drizzle-orm";
import { cache } from "react";

async function fetchCurrentUser() {
	const supabaseUser = await getUser();
	const user = await db
		.select({ dbId: users.dbId })
		.from(users)
		.innerJoin(
			supabaseUserMappings,
			eq(supabaseUserMappings.userDbId, users.dbId),
		)
		.where(eq(supabaseUserMappings.supabaseUserId, supabaseUser.id));
	if (user.length === 0) {
		throw new Error("User not found");
	}
	return user[0];
}

const cachedFetchCurrentUser = cache(fetchCurrentUser);
export { cachedFetchCurrentUser as fetchCurrentUser };

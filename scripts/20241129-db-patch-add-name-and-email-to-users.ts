/**
 * Script to update email addresses in the users table by synchronizing with Supabase Auth.
 *
 * This script:
 * 1. Fetches all users from Supabase Auth API (up to 500 users)
 * 2. Updates email addresses in the users table using supabaseUserMappings as a join table
 * 3. Handles errors gracefully and logs any issues
 * 4. Performs updates in a single batch operation
 *
 * Requirements:
 * - Supabase service role key for authentication
 * - Access to users and supabaseUserMappings tables
 * - Proper database permissions for UPDATE operations
 */

import { db, supabaseUserMappings, users as usersSchema } from "@/drizzle";
import { createClient } from "@supabase/supabase-js";
import { sql } from "drizzle-orm";

async function main() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
	const key = process.env.SUPABASE_SERVICE_KEY as string;
	const supabase = createClient(url, key);

	// Fetch all users from Supabase Auth (up to 500)
	const {
		data: { users },
		error,
	} = await supabase.auth.admin.listUsers({
		perPage: 500,
	});

	if (error) {
		throw error;
	}

	console.log(`Found ${users.length} users`);

	// Filter out users without email
	const validUsers = users.filter((user) => user.email);

	if (validUsers.length === 0) {
		console.log("No users to update");
		return;
	}

	// Perform update for all valid users
	try {
		for (const user of validUsers) {
			const { id: supabaseUserId, email } = user;

			await db.execute(
				sql`
          UPDATE ${usersSchema}
          SET email = ${email}
          FROM ${supabaseUserMappings}
          WHERE ${usersSchema.dbId} = ${supabaseUserMappings.userDbId}
          AND ${supabaseUserMappings.supabaseUserId} = ${supabaseUserId}
        `,
			);

			console.log(`Updated user ${supabaseUserId} with email ${email}`);
		}
	} catch (err) {
		console.error("Failed to update users:", err);
		throw err;
	}

	console.log("Successfully finished updating all users");
}

main().catch((error) => {
	console.error("error", error);
	process.exit(1);
});

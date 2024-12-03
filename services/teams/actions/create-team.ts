"use server";

import {
	db,
	supabaseUserMappings,
	teamMemberships,
	teams,
	users,
} from "@/drizzle";
import { getUser } from "@/lib/supabase";
import { isEmailFromRoute06 } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import invariant from "tiny-invariant";
import {
	DRAFT_TEAM_NAME_METADATA_KEY,
	DRAFT_TEAM_USER_DB_ID_METADATA_KEY,
} from "../constants";
import { createCheckoutSession } from "./create-checkout-session";

export async function createTeam(formData: FormData) {
	const teamName = formData.get("teamName") as string;
	const selectedPlan = formData.get("selectedPlan") as string;

	const supabaseUser = await getUser();
	if (!supabaseUser) {
		throw new Error("User not found");
	}

	const isInternalUser =
		supabaseUser.email != null && isEmailFromRoute06(supabaseUser.email);
	if (isInternalUser) {
		createInternalTeam(supabaseUser, teamName);
		// FIXME: change context to the new team
		redirect("/settings/team");
	}

	if (selectedPlan === "free") {
		createFreeTeam(supabaseUser, teamName);
		// FIXME: change context to the new team
		redirect("/settings/team");
	}

	const checkoutUrl = await prepareProTeamCreation(supabaseUser, teamName);
	redirect(checkoutUrl);
}

/**
 * 1. Create a new draft team
 * 2. Set the draft team informations in metadata (https://support.stripe.com/questions/using-metadata-with-checkout-sessions)
 */
async function prepareProTeamCreation(supabaseUser: User, teamName: string) {
	const userDbId = await getUserDbId(supabaseUser);
	return createCheckout(userDbId, teamName);
}

async function createCheckout(userDbId: number, teamName: string) {
	const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
	const serviceSiteUrl = process.env.NEXT_PUBLIC_SERVICE_SITE_URL;
	invariant(siteUrl, "NEXT_PUBLIC_SITE_URL is not set");
	invariant(serviceSiteUrl, "NEXT_PUBLIC_SERVICE_SITE_URL is not set");

	// FIXME: change context to the new team
	const successUrl = `${siteUrl}/settings/team`;
	const cancelUrl = `${serviceSiteUrl}/pricing`;

	const subscriptionMetadata: Record<string, string> = {
		[DRAFT_TEAM_USER_DB_ID_METADATA_KEY]: userDbId.toString(),
		[DRAFT_TEAM_NAME_METADATA_KEY]: teamName,
	};

	return createCheckoutSession(subscriptionMetadata, successUrl, cancelUrl);
}

async function createInternalTeam(supabaseUser: User, teamName: string) {
	await createTeamInDatabase(supabaseUser, teamName, true);
}

async function createFreeTeam(supabaseUser: User, teamName: string) {
	await createTeamInDatabase(supabaseUser, teamName, false);
}

async function createTeamInDatabase(
	supabaseUser: User,
	teamName: string,
	isInternal: boolean,
) {
	const [result] = await db
		.insert(teams)
		.values({
			name: teamName,
			type: isInternal ? "internal" : "customer",
		})
		.returning({ dbid: teams.dbId });

	const teamDbId = result.dbid;
	const userDbId = await getUserDbId(supabaseUser);

	// add membership
	await db.insert(teamMemberships).values({
		teamDbId,
		userDbId,
		role: "admin",
	});
}

async function getUserDbId(supabaseUser: User) {
	const [result] = await db
		.select()
		.from(users)
		.innerJoin(
			supabaseUserMappings,
			eq(users.dbId, supabaseUserMappings.userDbId),
		)
		.where(eq(supabaseUserMappings.supabaseUserId, supabaseUser.id));
	return result.users.dbId;
}

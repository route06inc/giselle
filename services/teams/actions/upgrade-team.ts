"use server";

import { redirect } from "next/navigation";
import invariant from "tiny-invariant";
import { UPGRADING_TEAM_DB_ID_KEY } from "../constants";
import { createCheckoutSession } from "./create-checkout-session";

export async function upgradeTeam(teamDbId: number) {
	const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
	const serviceSiteUrl = process.env.NEXT_PUBLIC_SERVICE_SITE_URL;
	invariant(siteUrl, "NEXT_PUBLIC_SITE_URL is not set");
	invariant(serviceSiteUrl, "NEXT_PUBLIC_SERVICE_SITE_URL is not set");

	// FIXME: change context to the new team
	const successUrl = `${siteUrl}/settings/team`;
	const cancelUrl = `${serviceSiteUrl}/pricing`;

	const subscriptionMetadata: Record<string, string> = {
		[UPGRADING_TEAM_DB_ID_KEY]: teamDbId.toString(),
	};

	const checkoutUrl = await createCheckoutSession(
		subscriptionMetadata,
		successUrl,
		cancelUrl,
	);
	redirect(checkoutUrl);
}

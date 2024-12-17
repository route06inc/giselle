import { db, subscriptions, teams } from "@/drizzle";
import { getGiselleSession, updateGiselleSession } from "@/lib/giselle-session";
import { stripe } from "@/services/external/stripe";
import { captureException } from "@sentry/nextjs";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function GET(_request: Request) {
	const session = await getGiselleSession();
	const checkoutSessionId = session?.checkoutSessionId;
	if (checkoutSessionId == null) {
		// no checkout session id, redirect to /settings/team
		redirect("/settings/team");
	}

	try {
		const checkoutSession =
			await stripe.checkout.sessions.retrieve(checkoutSessionId);
		const subscription = checkoutSession.subscription;
		if (subscription == null) {
			throw new Error("Subscription not found");
		}

		const subscriptionId =
			typeof subscription === "string" ? subscription : subscription.id;
		const teamDbId = await getTeamDbIdFromSubscription(subscriptionId);
		await updateGiselleSession({ teamDbId, checkoutSessionId: undefined });
		redirect("/settings/team");
	} catch (error) {
		// fallback
		captureException(error);
		redirect("/settings/team");
	}
}

async function getTeamDbIdFromSubscription(subscriptionId: string) {
	const records = await db
		.select({
			teamDbId: teams.dbId,
		})
		.from(subscriptions)
		.innerJoin(teams, eq(subscriptions.teamDbId, teams.dbId))
		.where(
			and(
				eq(subscriptions.status, "active"),
				eq(subscriptions.id, subscriptionId),
			),
		);
	if (records.length === 0) {
		throw new Error("Subscription not found");
	}
	return records[0].teamDbId;
}

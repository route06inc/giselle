import { getUser } from "@/lib/supabase";
import { isEmailFromRoute06 } from "@/lib/utils";
import { formatStripePrice, stripe } from "@/services/external/stripe";
import invariant from "tiny-invariant";
import { fetchUserTeams } from "..";
import { TeamCreationForm } from "./team-creation-form";

export default async function TeamCreation() {
	const user = await getUser();
	if (!user) {
		throw new Error("User not found");
	}
	const isInternalUser = user.email != null && isEmailFromRoute06(user.email);
	const teams = await fetchUserTeams();
	const hasExistingFreeTeam = teams.some(
		(team) => team.type === "customer" && !team.activeSubscriptionId,
	);
	const proPlanPriceId = process.env.STRIPE_PRO_PLAN_PRICE_ID;
	invariant(proPlanPriceId, "STRIPE_PRO_PLAN_PRICE_ID is not set");
	const proPlan = await stripe.prices.retrieve(proPlanPriceId);
	const proPlanPrice = formatStripePrice(proPlan);

	return (
		<TeamCreationForm
			canCreateFreeTeam={!isInternalUser && !hasExistingFreeTeam}
			proPlanPrice={proPlanPrice}
		/>
	);
}

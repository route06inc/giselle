import { stripe } from "@/services/external/stripe/config";
import invariant from "tiny-invariant";

export async function createCheckoutSession(
	subscriptionMetadata: Record<string, string>,
	successUrl: string,
	cancelUrl: string,
) {
	const proPlanPriceId = process.env.STRIPE_PRO_PLAN_PRICE_ID;
	const agentTimeChargePriceId = process.env.STRIPE_AGENT_TIME_CHARGE_PRICE_ID;
	const userSeatPriceId = process.env.STRIPE_USER_SEAT_PRICE_ID;

	invariant(proPlanPriceId, "STRIPE_PRO_PLAN_PRICE_ID is not set");
	invariant(
		agentTimeChargePriceId,
		"STRIPE_AGENT_TIME_CHARGE_PRICE_ID is not set",
	);
	invariant(userSeatPriceId, "STRIPE_USER_SEAT_PRICE_ID is not set");

	const checkoutSession = await stripe.checkout.sessions.create({
		mode: "subscription",
		line_items: [
			{
				price: proPlanPriceId,
				quantity: 1,
			},
			{
				price: agentTimeChargePriceId,
			},
			{
				price: userSeatPriceId,
			},
		],
		automatic_tax: { enabled: true },
		success_url: successUrl,
		cancel_url: cancelUrl,
		subscription_data: {
			metadata: subscriptionMetadata,
		},
	});

	if (checkoutSession.url == null) {
		throw new Error("checkoutSession.url is null");
	}

	return { id: checkoutSession.id, url: checkoutSession.url };
}

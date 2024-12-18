import { stripe } from "@/services/external/stripe";
import { upsertSubscription } from "@/services/external/stripe/actions/upsert-subscription";
import type Stripe from "stripe";
import { handleSubscriptionCycleInvoice } from "./handle-subscription-cycle-invoice";

const relevantEvents = new Set([
	"checkout.session.completed",
	"customer.subscription.updated",
	"customer.subscription.deleted",
	"invoice.created",
]);

export async function POST(req: Request) {
	const body = await req.text();
	const sig = req.headers.get("stripe-signature") as string;
	const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
	let event: Stripe.Event;

	try {
		if (!sig || !webhookSecret)
			return new Response("Webhook secret not found.", { status: 400 });
		event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
		console.log(`🔔  Webhook received: ${event.type}`);

		// biome-ignore lint: lint/suspicious/noExplicitAny: @todo error handling
	} catch (err: any) {
		console.log(`❌ Error message: ${err.message}`);
		return new Response(`Webhook Error: ${err.message}`, { status: 400 });
	}

	if (!relevantEvents.has(event.type)) {
		return new Response(`Unsupported event type: ${event.type}`, {
			status: 400,
		});
	}

	try {
		switch (event.type) {
			case "checkout.session.completed":
				if (event.data.object.mode !== "subscription") {
					throw new Error("Unhandled relevant event!");
				}
				if (
					event.data.object.subscription == null ||
					typeof event.data.object.subscription !== "string"
				) {
					throw new Error(
						"The checkout session is missing a valid subscription ID. Please check the session data.",
					);
				}
				if (
					event.data.object.customer == null ||
					typeof event.data.object.customer !== "string"
				) {
					throw new Error(
						"The checkout session is missing a valid customer ID. Please check the session data.",
					);
				}
				await upsertSubscription(event.data.object.subscription);
				break;

			case "customer.subscription.updated":
			case "customer.subscription.deleted":
				if (
					event.data.object.customer == null ||
					typeof event.data.object.customer !== "string"
				) {
					throw new Error(
						"The checkout session is missing a valid customer ID. Please check the session data.",
					);
				}
				await upsertSubscription(event.data.object.id);
				break;

			case "invoice.created":
				console.log(`🔔  Invoice created: ${event.data.object.id}`);
				if (event.data.object.billing_reason === "subscription_cycle") {
					await handleSubscriptionCycleInvoice(event.data.object);
				}
				break;

			default:
				throw new Error("Unhandled relevant event!");
		}
	} catch (error) {
		console.log(error);
		return new Response(
			"Webhook handler failed. View your Next.js function logs.",
			{
				status: 400,
			},
		);
	}
	return new Response(JSON.stringify({ received: true }));
}

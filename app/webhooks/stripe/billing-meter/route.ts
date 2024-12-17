/**
 * Handle Stripe Billing Meter webhooks
 *
 * Error codes: https://docs.stripe.com/billing/subscriptions/usage-based/recording-usage-api#error-codes
 */
import { stripe } from "@/services/external/stripe";
import { captureEvent, captureException } from "@sentry/nextjs";
import type Stripe from "stripe";

const relevantEvents = new Set([
	"v1.billing.meter.error_report_triggered",
	"v1.billing.meter.no_meter_found",
]);

export async function POST(req: Request) {
	const body = await req.text();
	const sig = req.headers.get("stripe-signature") as string;
	const webhookSecret = process.env.STRIPE_BILLING_METER_WEBHOOK_SECRET;
	let thinEvent: Stripe.ThinEvent;

	try {
		if (!sig || !webhookSecret)
			return new Response("Webhook secret not found.", { status: 400 });
		thinEvent = stripe.parseThinEvent(body, sig, webhookSecret);
		console.log(`🔔  Webhook received: ${thinEvent.type}`);
	} catch (err: unknown) {
		console.log(`❌ Error: ${err}`);
		captureException(err);
		return new Response(`Webhook Error: ${err}`, { status: 400 });
	}

	if (!relevantEvents.has(thinEvent.type)) {
		return new Response(`Unsupported event type: ${thinEvent.type}`, {
			status: 400,
		});
	}

	const event = await stripe.v2.core.events.retrieve(thinEvent.id);
	try {
		console.error(
			`
				Stripe Billing Meter Error Report:
				Period: ${event.data.validation_start} - ${event.data.validation_end}
				Summary: ${event.data.developer_message_summary}
				Error Count: ${event.data.reason.error_count}`
				.trim()
				.replace(/^\s+/gm, "    "),
		);

		for (const errorType of event.data.reason.error_types) {
			console.error(
				`Error Type: ${errorType.code} (${errorType.error_count} occurrences)`,
			);
			for (const error of errorType.sample_errors) {
				console.error(`  - ${error.error_message}`);
			}
		}
		if ("related_object" in event && event.related_object != null) {
			console.error(
				`
				Related Object:
        ID: ${event.related_object.id}
        Type: ${event.related_object.type}
        URL: ${event.related_object.url}`
					.trim()
					.replace(/^\s+/gm, "    "),
			);
		}

		captureEvent({
			message: "Stripe Billing Meter Error",
			level: "error",
			extra: {
				validationPeriod: {
					start: event.data.validation_start,
					end: event.data.validation_end,
				},
				summary: event.data.developer_message_summary,
				errors: event.data.reason.error_types,
				relatedObject: "related_object" in event ? event.related_object : null,
			},
		});
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

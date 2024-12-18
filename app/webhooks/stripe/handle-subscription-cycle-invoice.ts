import { toUTCDate } from "@/lib/date";
import { reportUserSeatUsage } from "@/services/usage-based-billing";
import type Stripe from "stripe";
import invariant from "tiny-invariant";

export async function handleSubscriptionCycleInvoice(invoice: Stripe.Invoice) {
	if (invoice.status !== "draft") {
		/**
		 * User seat usage must be reported while the invoice is in draft status.
		 * If this error occurs in production, consider adjusting the invoice finalization grace period:
		 * https://docs.stripe.com/billing/subscriptions/usage-based/configure-grace-period
		 *
		 * Note: Extending the grace period will delay the invoice delivery to customers.
		 * To minimize billing delays, we should consider manually calling finalizeInvoice()
		 * immediately after reporting the usage.
		 */
		throw new Error("Invoice is not in draft status");
	}

	const subscription = invoice.subscription;
	invariant(subscription, "Invoice is missing a subscription ID");
	const subscriptionId =
		typeof subscription === "string" ? subscription : subscription.id;

	const customer = invoice.customer;
	invariant(customer, "Invoice is missing a customer ID");
	const customerId = typeof customer === "string" ? customer : customer.id;
	const periodEnd = new Date(invoice.period_end * 1000);
	const periodEndUTC = toUTCDate(periodEnd);

	await reportUserSeatUsage(subscriptionId, customerId, periodEndUTC);
}

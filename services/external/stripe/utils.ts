import type Stripe from "stripe";

export function formatStripePrice(price: Stripe.Price): string {
	const unit_amount = price.unit_amount ?? 0;
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: price.currency,
		minimumFractionDigits: 0,
	}).format(unit_amount / 100);
}

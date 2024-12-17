import { Stripe } from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
	// https://github.com/stripe/stripe-node#configuration
	apiVersion: "2024-11-20.acacia",
});

import { stripe } from "../config";

export async function deleteSubscription(subscriptionId: string) {
	const subscription = await stripe.subscriptions.retrieve(subscriptionId);

	console.log("deleteSubscription");
	console.log("subscription.id", subscription.id);
	console.log("subscription.object", subscription.object);
	console.log("subscription.status", subscription.status);
}

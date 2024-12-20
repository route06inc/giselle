import { retrieveActiveStripeSubscriptionBySupabaseUserId } from "@/services/accounts/actions";
import { NextResponse } from "next/server";
import { freePlanFlag } from "./flags";
import { supabaseMiddleware } from "./lib/supabase";
import { isEmailFromRoute06 } from "./lib/utils";

export default supabaseMiddleware(async (user, request) => {
	if (user == null) {
		// no user, potentially respond by redirecting the user to the login page
		const url = request.nextUrl.clone();
		url.pathname = "/login";
		return NextResponse.redirect(url);
	}

	// Users can use giselle without subscription if the free plan is enabled
	const freePlanEnabled = await freePlanFlag();
	if (freePlanEnabled) {
		return;
	}

	// Proceeding to check the user's subscription status since the email is not from the route06.co.jp
	if (!isEmailFromRoute06(user.email ?? "")) {
		const subscription = await retrieveActiveStripeSubscriptionBySupabaseUserId(
			user.id,
		);
		if (subscription == null) {
			const url = request.nextUrl.clone();
			// We are planning a pricing revision.
			// Temporarily hide new signups until the new plan is ready.
			// url.pathname = "/subscriptions/checkout";
			url.pathname = "/subscriptions/coming-soon";
			return NextResponse.redirect(url);
		}
		/** @todo Validate subscription status */
	}
});

export const config = {
	matcher: [
		"/((?!_next/static|_next/image|.well-known|dev|webhooks|legal|login|signup|pricing|password_reset|subscription|auth|api/cron|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};

import { timingSafeEqual } from "node:crypto";
import { captureException } from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import invariant from "tiny-invariant";
import { processDailySalesSummary } from "./process-daily-sales-summary";

/**
 * Cron job handler for daily sales summary.
 *
 * Target date is optional
 * - default: yeserday
 * - format: YYYY-MM-DD
 * - timezone: handled as UTC
 *
 * @example
 * curl -H "Authorization: Bearer [CRON_SECRET]" http://localhost:3000/api/cron/daily-sales-summary
 * curl -H "Authorization: Bearer [CRON_SECRET]" http://localhost:3000/api/cron/daily-sales-summary?targetDate=2022-01-01
 */
export async function GET(req: NextRequest) {
	if (!isValid(req)) {
		return new Response("Unauthorized", {
			status: 401,
		});
	}

	const params = req.nextUrl.searchParams;
	const targetDate = parseTargetDateParam(params.get("targetDate"));

	console.log("Daily sales summary cron job started");
	console.log("Target date:", targetDate.toISOString());
	try {
		await processDailySalesSummary(targetDate);
	} catch (error: unknown) {
		console.error("Daily sales summary cron job failed:", error);
		captureException(error);
		return new Response("Internal Server Error", { status: 500 });
	}

	console.log("Daily sales summary cron job completed");
	return new Response("ok", { status: 200 });
}

function isValid(req: NextRequest) {
	invariant(process.env.CRON_SECRET, "CRON_SECRET is not set");
	const cronSecret = process.env.CRON_SECRET;
	const authHeader = req.headers.get("authorization");

	if (!authHeader?.startsWith("Bearer ")) {
		return false;
	}
	const providedToken = new Uint8Array(Buffer.from(authHeader.slice(7)));
	const validToken = new Uint8Array(Buffer.from(cronSecret));
	return (
		providedToken.length === validToken.length &&
		timingSafeEqual(providedToken, validToken)
	);
}

/**
 * Convert string or null date to UTC date
 * if date is not provided, return yesterday's date
 *
 * @param dateString - Date string in YYYY-MM-DD format (optional)
 * @returns Date object set to 00:00:00 UTC
 */
function parseTargetDateParam(dateString: string | null): Date {
	try {
		if (dateString != null) {
			// Validate input format
			if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
				throw new Error("Invalid date format. Expected: YYYY-MM-DD");
			}
			return new Date(
				Date.UTC(
					Number(dateString.slice(0, 4)),
					Number(dateString.slice(5, 7)) - 1,
					Number(dateString.slice(8, 10)),
				),
			);
		}

		// Return yesterday's date
		const now = new Date();
		return new Date(
			Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1),
		);
	} catch (error) {
		console.error("Date parsing error:", error);
		throw error;
	}
}

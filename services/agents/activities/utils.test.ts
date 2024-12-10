import { describe, expect, test } from "bun:test";
import { getMonthlyBillingCycle } from "./utils";

function formatDateTime(date: Date): string {
	const Y = date.getFullYear();
	const M = String(date.getMonth() + 1).padStart(2, "0");
	const D = String(date.getDate()).padStart(2, "0");
	const h = String(date.getHours()).padStart(2, "0");
	const m = String(date.getMinutes()).padStart(2, "0");
	const s = String(date.getSeconds()).padStart(2, "0");
	return `${Y}-${M}-${D} ${h}:${m}:${s}`;
}

describe("getMonthlyBillingCycle with times", () => {
	test("preserve exact times", () => {
		// referenceDate: December 15, 2024, 13:00:15
		// currentDate: December 20, 2024, 14:00:00
		// The next billing date should be January 15, 2025, at the same time 13:00:15
		const referenceDate = new Date(2024, 11, 15, 13, 0, 15);
		const currentDate = new Date(2024, 11, 20, 14, 0, 0);

		const { start, end } = getMonthlyBillingCycle(referenceDate, currentDate);
		expect(formatDateTime(start)).toBe("2024-12-15 13:00:15");
		expect(formatDateTime(end)).toBe("2025-01-15 13:00:15");
	});

	test("reference time is older than 2 month ago", () => {
		const referenceDate = new Date(2024, 8, 15, 13, 0, 15);
		const currentDate = new Date(2024, 11, 20, 14, 0, 0);

		const { start, end } = getMonthlyBillingCycle(referenceDate, currentDate);
		expect(formatDateTime(start)).toBe("2024-12-15 13:00:15");
		expect(formatDateTime(end)).toBe("2025-01-15 13:00:15");
	});

	test("handle end-of-month", () => {
		// referenceDate: January 31, 2024, 22:30:45
		// currentDate: February 15, 2024, 10:00:00
		// Since February doesn't have the 31st, the billing date should be on Feb 29, 2024 (leap year),
		// preserving the time 22:30:45.
		// The cycle should be from Jan 31, 22:30:45 to Feb 29, 22:30:45.
		const referenceDate = new Date(2024, 0, 31, 22, 30, 45);
		const currentDate = new Date(2024, 1, 15, 10, 0, 0);

		const { start, end } = getMonthlyBillingCycle(referenceDate, currentDate);
		expect(formatDateTime(start)).toBe("2024-01-31 22:30:45");
		expect(formatDateTime(end)).toBe("2024-02-29 22:30:45");
	});

	test("exact one-month span", () => {
		// referenceDate: March 15, 2023, 09:15:00
		// currentDate: March 20, 2023, 12:00:00
		// The next billing date should be April 15, 2023, 09:15:00
		const referenceDate = new Date(2023, 2, 15, 9, 15, 0);
		const currentDate = new Date(2023, 2, 20, 12, 0, 0);

		const { start, end } = getMonthlyBillingCycle(referenceDate, currentDate);
		expect(formatDateTime(start)).toBe("2023-03-15 09:15:00");
		expect(formatDateTime(end)).toBe("2023-04-15 09:15:00");
	});

	test("before the first full billing cycle completes", () => {
		// referenceDate: July 10, 2024, 05:00:00
		// currentDate: July 10, 2024, 06:00:00 (the same day, just one hour later)
		// The next billing date should be August 10, 2024, 05:00:00
		const referenceDate = new Date(2024, 6, 10, 5, 0, 0);
		const currentDate = new Date(2024, 6, 10, 6, 0, 0);

		const { start, end } = getMonthlyBillingCycle(referenceDate, currentDate);
		expect(formatDateTime(start)).toBe("2024-07-10 05:00:00");
		expect(formatDateTime(end)).toBe("2024-08-10 05:00:00");
	});
});

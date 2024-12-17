export function getMonthlyBillingCycle(
	referenceDate: Date,
	currentDate: Date,
): { start: Date; end: Date } {
	// Add validation for invalid dates
	if (
		!referenceDate ||
		!currentDate ||
		Number.isNaN(referenceDate.getTime()) ||
		Number.isNaN(currentDate.getTime())
	) {
		throw new Error("Invalid date provided");
	}

	// Get the base time and date from referenceDate
	const refDay = referenceDate.getUTCDate();
	const refHours = referenceDate.getUTCHours();
	const refMinutes = referenceDate.getUTCMinutes();
	const refSeconds = referenceDate.getUTCSeconds();
	const refMilliseconds = referenceDate.getUTCMilliseconds();

	// Calculate the billing date for the current month based on currentDate
	// 1. Find the billing date for the current year and month
	let candidateBilling = createBillingDate(
		currentDate.getUTCFullYear(),
		currentDate.getUTCMonth(),
		refDay,
		refHours,
		refMinutes,
		refSeconds,
		refMilliseconds,
	);

	// If candidateBilling is after currentDate, go back to the previous month's billing date
	if (candidateBilling.getTime() > currentDate.getTime()) {
		const prevMonthYear =
			candidateBilling.getUTCMonth() === 0
				? candidateBilling.getUTCFullYear() - 1
				: candidateBilling.getUTCFullYear();
		const prevMonth =
			candidateBilling.getUTCMonth() === 0
				? 11
				: candidateBilling.getUTCMonth() - 1;
		candidateBilling = createBillingDate(
			prevMonthYear,
			prevMonth,
			refDay,
			refHours,
			refMinutes,
			refSeconds,
			refMilliseconds,
		);
	}

	const cycleStart = candidateBilling;

	// Calculate next billing date as one month later
	const nextMonthYear =
		cycleStart.getUTCMonth() === 11
			? cycleStart.getUTCFullYear() + 1
			: cycleStart.getUTCFullYear();
	const nextMonth = (cycleStart.getUTCMonth() + 1) % 12;
	const nextBilling = createBillingDate(
		nextMonthYear,
		nextMonth,
		refDay,
		refHours,
		refMinutes,
		refSeconds,
		refMilliseconds,
	);

	// Cycle end time is the same as the next billing date
	const cycleEnd = nextBilling;

	return { start: cycleStart, end: cycleEnd };
}

// see: https://docs.stripe.com/billing/subscriptions/billing-cycle
function createBillingDate(
	year: number,
	month: number,
	day: number,
	hours: number,
	minutes: number,
	seconds: number,
	ms: number,
): Date {
	// Check the number of days in the month
	const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
	const billingDay = Math.min(day, lastDay);
	return new Date(
		Date.UTC(year, month, billingDay, hours, minutes, seconds, ms),
	);
}

export function getMonthlyBillingCycle(
	referenceDate: Date,
	currentDate: Date,
): { start: Date; end: Date } {
	// Get the base time and date from referenceDate
	const refDay = referenceDate.getDate();
	const refHours = referenceDate.getHours();
	const refMinutes = referenceDate.getMinutes();
	const refSeconds = referenceDate.getSeconds();
	const refMilliseconds = referenceDate.getMilliseconds();

	// Calculate the billing date for the current month based on currentDate
	// 1. Find the billing date for the current year and month
	let candidateBilling = createBillingDate(
		currentDate.getFullYear(),
		currentDate.getMonth(),
		refDay,
		refHours,
		refMinutes,
		refSeconds,
		refMilliseconds,
	);

	// If candidateBilling is after currentDate, go back to the previous month's billing date
	if (candidateBilling.getTime() > currentDate.getTime()) {
		const prevMonthYear =
			candidateBilling.getMonth() === 0
				? candidateBilling.getFullYear() - 1
				: candidateBilling.getFullYear();
		const prevMonth =
			candidateBilling.getMonth() === 0 ? 11 : candidateBilling.getMonth() - 1;
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
		cycleStart.getMonth() === 11
			? cycleStart.getFullYear() + 1
			: cycleStart.getFullYear();
	const nextMonth = (cycleStart.getMonth() + 1) % 12;
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
	const lastDay = new Date(year, month + 1, 0).getDate();
	const billingDay = Math.min(day, lastDay);
	return new Date(year, month, billingDay, hours, minutes, seconds, ms);
}

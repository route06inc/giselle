import type {
	SubscriptionCycleInvoiceEvidence,
	SubscriptionInvoiceEvidence,
} from "./types";

export function formatSubscriptionEvidence(
	evidence: SubscriptionInvoiceEvidence,
) {
	return {
		invoiceId: evidence.invoiceId,
		invoiceCreatedAt: evidence.invoiceCreatedAt.toISOString(),
		subscriptionId: evidence.subscriptionId.toString(),
		teamDbId: evidence.teamDbId,
		teamName: evidence.teamName,
	};
}

export function formatAgentTimeUsageEvicence(
	evidence: SubscriptionCycleInvoiceEvidence,
) {
	return evidence.agentTimeUsages.map((usage) => ({
		invoiceId: evidence.invoiceId,
		agentDbId: usage.agentDbId,
		agentName: usage.agentName,
		startedAt: usage.startedAt.toISOString(),
		endedAt: usage.endedAt.toISOString(),
		totalDurationMs: usage.totalDurationMs,
	}));
}

export function formatUserSeatEvidence(
	evidence: SubscriptionCycleInvoiceEvidence,
) {
	return evidence.userSeats.map((seat) => ({
		invoiceId: evidence.invoiceId,
		userDbId: seat.userDbId,
	}));
}

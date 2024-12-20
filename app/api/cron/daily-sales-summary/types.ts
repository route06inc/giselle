export type SubscriptionInvoiceEvidence = {
	invoiceId: string;
	invoiceCreatedAt: Date;
	subscriptionId: string;
	teamDbId: number;
	teamName: string;
};
export type SubscriptionCreateInvoiceEvidence = SubscriptionInvoiceEvidence & {
	kind: "subscription_create";
};
export type SubscriptionCycleInvoiceEvidence = SubscriptionInvoiceEvidence & {
	kind: "subscription_cycle";
	agentTimeUsages: {
		agentDbId: number;
		agentName: string;
		startedAt: Date;
		endedAt: Date;
		totalDurationMs: number;
	}[];
	userSeats: {
		userDbId: number;
	}[];
};

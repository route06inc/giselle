import { createId } from "@paralleldrive/cuid2";
import type { ConnectorId } from "./types";

export function createConnectorId(): ConnectorId {
	return `cn_${createId()}`;
}

import { createId } from "@paralleldrive/cuid2";
import type { GitHubIntegrationId } from "./types";

export function generateId() {
	return `gthb_${createId()}` satisfies GitHubIntegrationId;
}

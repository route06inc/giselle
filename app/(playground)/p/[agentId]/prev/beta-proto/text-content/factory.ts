import { createId } from "@paralleldrive/cuid2";
import type { TextContentId } from "./types";

export function createTextContentId(): TextContentId {
	return `txt_${createId()}`;
}

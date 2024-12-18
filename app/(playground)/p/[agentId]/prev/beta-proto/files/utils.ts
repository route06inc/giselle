import { createId } from "@paralleldrive/cuid2";
import type { FileId } from "./types";

export function createFileId(): FileId {
	return `fld_${createId()}`;
}

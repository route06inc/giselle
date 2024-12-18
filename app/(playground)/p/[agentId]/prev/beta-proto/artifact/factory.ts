import { createId } from "@paralleldrive/cuid2";
import type { ArtifactId } from "./types";

export function createArtifactId(): ArtifactId {
	return `art_${createId()}`;
}

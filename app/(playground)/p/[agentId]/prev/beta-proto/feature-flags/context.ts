import { createContext, useContext } from "react";
import type { FeatureFlags } from "./types";

export const FeatureFlagContext = createContext<FeatureFlags | null>(null);

export const useFeatureFlags = () => {
	const flags = useContext(FeatureFlagContext);
	if (flags === null) {
		throw new Error(
			"useFeatureFlags must be used within a FeatureFlagProvider",
		);
	}
	return flags;
};

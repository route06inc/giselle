import type { ReactNode } from "react";
import { FeatureFlagContext } from "./context";
import type { FeatureFlags } from "./types";

interface FeatureFlagProviderProps extends FeatureFlags {
	children: ReactNode;
}
export function FeatureFlagProvider({
	children,
	...props
}: FeatureFlagProviderProps) {
	return (
		<FeatureFlagContext.Provider value={props}>
			{children}
		</FeatureFlagContext.Provider>
	);
}

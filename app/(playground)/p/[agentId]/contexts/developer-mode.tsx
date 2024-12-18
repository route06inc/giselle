"use client";

import { type ReactNode, createContext, useContext, useState } from "react";

const DeveloperModeContext = createContext<boolean | undefined>(undefined);

export function DeveloperModeProvider({
	children,
	developerMode,
}: { children: ReactNode; developerMode: boolean }) {
	return (
		<DeveloperModeContext.Provider value={developerMode}>
			{children}
		</DeveloperModeContext.Provider>
	);
}

export const useDeveloperMode = () => {
	const context = useContext(DeveloperModeContext);
	if (context === undefined) {
		throw new Error(
			"useDeveloperMode must be used within a DeveloperModeProvider",
		);
	}
	return context;
};

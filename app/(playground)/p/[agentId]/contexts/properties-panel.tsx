"use client";

import { type ReactNode, createContext, useContext, useState } from "react";

interface PropertiesPanelContextType {
	open: boolean;
	setOpen: (open: boolean) => void;
	tab: string;
	setTab: (tab: string) => void;
}

const PropertiesPanelContext = createContext<
	PropertiesPanelContextType | undefined
>(undefined);

interface PropertiesPanelProviderProps {
	defaultOpen?: boolean;
	children: ReactNode;
	defaultTab?: string;
}

export function PropertiesPanelProvider({
	children,
	defaultOpen = false,
	defaultTab = "",
}: PropertiesPanelProviderProps) {
	const [tab, setTab] = useState<string>(defaultTab);
	const [open, setOpen] = useState<boolean>(defaultOpen);

	const value = {
		open,
		setOpen,
		tab,
		setTab,
	};

	return (
		<PropertiesPanelContext.Provider value={value}>
			{children}
		</PropertiesPanelContext.Provider>
	);
}

export function usePropertiesPanel() {
	const context = useContext(PropertiesPanelContext);
	if (context === undefined) {
		throw new Error(
			"usePropertiesPanelTab must be used within a PropertiesPanelTabProvider",
		);
	}
	return context;
}

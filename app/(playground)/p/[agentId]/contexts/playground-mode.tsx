"use client";

import { type ReactNode, createContext, useContext, useState } from "react";

export type PlaygroundMode = "editor" | "viewer";

interface PlaygroundModeContextType {
	playgroundMode: PlaygroundMode;
	setPlaygroundMode: (mode: PlaygroundMode) => void;
}

const PlaygroundModeContext = createContext<
	PlaygroundModeContextType | undefined
>(undefined);

export const PlaygroundModeProvider = ({
	children,
}: { children: ReactNode }) => {
	const [playgroundMode, setPlaygroundMode] =
		useState<PlaygroundMode>("editor");

	return (
		<PlaygroundModeContext.Provider
			value={{
				playgroundMode: playgroundMode,
				setPlaygroundMode: setPlaygroundMode,
			}}
		>
			{children}
		</PlaygroundModeContext.Provider>
	);
};

export const usePlaygroundMode = () => {
	const context = useContext(PlaygroundModeContext);
	if (!context) {
		throw new Error("useMode must be used within a ModeProvider");
	}
	return context;
};

"use client";

import { type ReactNode, createContext, useContext, useState } from "react";
import type { Tool } from "../types";

type ToolbarSection = "main" | "star";
type ToolbarVisibility = Record<ToolbarSection, boolean>;

interface ToolbarContext {
	selectedTool: Tool;
	selectTool: (tool: Tool["action"]) => void;
	reset: () => void;
}

const ToolbarContext = createContext<ToolbarContext | undefined>(undefined);

export function ToolbarContextProvider({
	children,
}: {
	children: ReactNode;
}) {
	// Initially all sections are closed
	const [activeToolbarSection, setActiveToolbarSection] =
		useState<ToolbarVisibility>({
			main: false,
			star: false,
		});

	const [selectedTool, setSelectedTool] = useState<Tool>({
		action: "move",
		category: "move",
	});

	// Handle tool selection
	const selectTool = (tool: Tool["action"] | undefined) => {
		switch (tool) {
			case "addTextNode":
				return setSelectedTool({
					action: "addTextNode",
					category: "edit",
				});
			case "addFileNode":
				return setSelectedTool({
					action: "addFileNode",
					category: "edit",
				});
			case "addTextGenerationNode":
				return setSelectedTool({
					action: "addTextGenerationNode",
					category: "edit",
				});
			case "move":
				return setSelectedTool({
					action: "move",
					category: "move",
				});
			default:
				return setSelectedTool({
					action: "move",
					category: "move",
				});
		}
	};

	// Reset the toolbar
	const reset = () => {
		selectTool("move");
	};

	return (
		<ToolbarContext.Provider
			value={{
				selectedTool,
				selectTool,
				reset,
			}}
		>
			{children}
		</ToolbarContext.Provider>
	);
}

export function useToolbar() {
	const context = useContext(ToolbarContext);
	if (context === undefined) {
		throw new Error("useToolbar must be used within a ToolbarContextProvider");
	}
	return context;
}

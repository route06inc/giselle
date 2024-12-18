import { type Dispatch, createContext, useContext } from "react";
import type { ToolActions } from "./actions";
import type { ToolState } from "./types";

type ToolContext = {
	state: ToolState;
	dispatch: Dispatch<ToolActions>;
};

export const ToolContext = createContext<ToolContext | null>(null);

export const useTool = () => {
	const context = useContext(ToolContext);
	if (!context) {
		throw new Error("useTool must be used within a ToolProvider");
	}
	return context;
};

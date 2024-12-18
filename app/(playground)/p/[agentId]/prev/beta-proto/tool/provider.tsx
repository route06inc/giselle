import { type FC, type PropsWithChildren, useReducer } from "react";
import { ToolContext } from "./context";
import { toolReducer } from "./reducer";
import { type ToolState, selectTool } from "./types";

const initialState: ToolState = {
	activeTool: selectTool,
};

export const ToolProvider: FC<PropsWithChildren> = ({ children }) => {
	const [state, dispatch] = useReducer(toolReducer, {
		activeTool: selectTool,
	});

	return (
		<ToolContext.Provider value={{ state, dispatch }}>
			{children}
		</ToolContext.Provider>
	);
};

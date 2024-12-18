import {
	type FC,
	type PropsWithChildren,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import type { AgentId } from "../types";
import { type EnhancedDispatch, GraphContext } from "./context";
import { graphReducer } from "./reducer";
import { setGraphToDb } from "./server-actions";
import type { Graph } from "./types";

const initialState = {
	graph: {
		nodes: [],
		connectors: [],
		artifacts: [],
	},
};

type GraphProviderProps = {
	agentId: AgentId;
	defaultGraph: Graph;
};

export const GraphProvider: FC<PropsWithChildren<GraphProviderProps>> = ({
	children,
	agentId,
	defaultGraph,
}) => {
	const isInitialMount = useRef(true);
	const stateRef = useRef({ graph: defaultGraph });
	const [state, setState] = useState(stateRef.current);
	const timeoutRef = useRef<Timer | null>(null);

	const enhancedDispatch: EnhancedDispatch = useCallback(
		async (action) => {
			if (typeof action === "function") {
				await action(enhancedDispatch, () => stateRef.current);
			} else {
				stateRef.current = graphReducer(stateRef.current, action);
				if (timeoutRef.current) {
					clearTimeout(timeoutRef.current);
				}
				timeoutRef.current = setTimeout(async () => {
					await setGraphToDb(agentId, stateRef.current.graph);
				}, 500);
			}
			setState(stateRef.current);
		},
		[agentId],
	);
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);
	return (
		<GraphContext.Provider value={{ state, dispatch: enhancedDispatch }}>
			{children}
		</GraphContext.Provider>
	);
};

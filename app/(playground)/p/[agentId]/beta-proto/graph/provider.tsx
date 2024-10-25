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
import { useDebounce } from "./use-debounce";

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

	const deboucedSetGraphToDb = useDebounce(async (graph: Graph) => {
		setGraphToDb(agentId, graph);
	}, 500);
	const enhancedDispatch: EnhancedDispatch = useCallback(async (action) => {
		if (typeof action === "function") {
			await action(enhancedDispatch, () => stateRef.current);
		} else {
			stateRef.current = graphReducer(stateRef.current, action);
		}
		setState(stateRef.current);
	}, []);
	useEffect(() => {
		if (isInitialMount.current) {
			isInitialMount.current = false;
		} else {
			deboucedSetGraphToDb(stateRef.current.graph);
		}
	}, [deboucedSetGraphToDb]);
	return (
		<GraphContext.Provider value={{ state, dispatch: enhancedDispatch }}>
			{children}
		</GraphContext.Provider>
	);
};

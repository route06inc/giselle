import {
	type ReactNode,
	createContext,
	useCallback,
	useContext,
	useState,
} from "react";

interface AgentNameState {
	name: string;
	setName: (name: string) => void;
}

const AgentNameContext = createContext<AgentNameState | null>(null);

export function useAgentName() {
	const context = useContext(AgentNameContext);
	if (!context) {
		throw new Error("useAgentName must be used within AgentNameProvider");
	}
	return context;
}

interface AgentNameProviderProps {
	children: ReactNode;
	initialName?: string;
}

export function AgentNameProvider({
	children,
	initialName = "",
}: AgentNameProviderProps) {
	const [name, setNameState] = useState(initialName);

	const setName = useCallback((newName: string) => {
		setNameState(newName);
	}, []);

	return (
		<AgentNameContext.Provider value={{ name, setName }}>
			{children}
		</AgentNameContext.Provider>
	);
}

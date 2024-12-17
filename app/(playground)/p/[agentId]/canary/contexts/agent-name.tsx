"use client";

import {
	type ReactNode,
	createContext,
	useCallback,
	useContext,
	useOptimistic,
	useState,
	useTransition,
} from "react";

const AgentNameContext = createContext<
	| {
			agentName: string;
			updateAgentName: (name: string) => Promise<void>;
			isPending: boolean;
	  }
	| undefined
>(undefined);

export function useAgentName() {
	const context = useContext(AgentNameContext);
	if (!context) {
		throw new Error("useAgentName must be used within an AgentNameProvider");
	}
	return context;
}

export function AgentNameProvider({
	children,
	defaultValue,
	updateAgentNameAction,
}: {
	children: ReactNode;
	defaultValue: string;
	updateAgentNameAction: (name: string) => Promise<string>;
}) {
	const [serverAgentName, setServerAgentName] = useState(defaultValue);
	const [agentName, setAgentName] = useOptimistic<string, string>(
		serverAgentName,
		(_, newAgentName) => newAgentName,
	);
	const [isPending, startTransition] = useTransition();

	const handleUpdateAgentName = useCallback(
		async (newAgentName: string) => {
			if (agentName === newAgentName) {
				return;
			}
			startTransition(async () => {
				setAgentName(newAgentName);
				await updateAgentNameAction(newAgentName);
				setServerAgentName(newAgentName);
			});
		},
		[agentName, setAgentName, updateAgentNameAction],
	);
	return (
		<AgentNameContext.Provider
			value={{
				agentName,
				updateAgentName: handleUpdateAgentName,
				isPending,
			}}
		>
			{children}
		</AgentNameContext.Provider>
	);
}

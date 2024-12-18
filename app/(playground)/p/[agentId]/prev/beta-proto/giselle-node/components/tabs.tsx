"use client";

import {
	type FC,
	type PropsWithChildren,
	type ReactNode,
	createContext,
	useContext,
	useMemo,
	useState,
} from "react";
import { setPanelTab } from "../../graph/actions";
import { useGraph } from "../../graph/context";
import type { PanelTab } from "../types";

type TabProps = {
	value: PanelTab;
};

export const TabTrigger: React.FC<PropsWithChildren<TabProps>> = ({
	value,
	children,
}) => {
	const { state, dispatch } = useGraph();
	const currentNode = useMemo(
		() => state.graph.nodes.find((node) => node.ui.selected),
		[state.graph.nodes],
	);
	if (currentNode == null) {
		return null;
	}

	return (
		<button
			className="font-rosart text-[16px] text-black-70 data-[state=active]:text-black-30"
			type="button"
			onClick={() =>
				dispatch(
					setPanelTab({
						node: {
							id: currentNode.id,
							panelTab: value,
						},
					}),
				)
			}
			data-state={currentNode.ui.panelTab === value ? "active" : "inactive"}
		>
			{children}
		</button>
	);
};

"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { forwardRef } from "react";
import { SparklesIcon } from "../../components/icons/sparkles";
import type { GiselleNode } from "../../giselle-node/types";
import { useGraph } from "../../graph/context";
import { executeFlow } from "../composite-actions";

interface RunButtonInnerProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	onClick?: () => void;
}
const RunButtonInner = forwardRef<HTMLButtonElement, RunButtonInnerProps>(
	(props: RunButtonInnerProps, ref) => {
		return (
			<button
				type="button"
				className="px-[16px] py-[8px] rounded-[8px] flex items-center gap-[2px] bg-[hsla(207,19%,77%,0.3)] font-rosart"
				style={{
					boxShadow: "0px 0px 3px 0px hsla(0, 0%, 100%, 0.25) inset",
				}}
				ref={ref}
				{...props}
			>
				<SparklesIcon className="w-[18px] h-[18px] fill-white drop-shadow-[0.66px_1.32px_2.64px_hsla(0,0%,100%,0.25)]" />
				<span>Run</span>
			</button>
		);
	},
);

export function RunButton() {
	const { state, dispatch } = useGraph();
	const finalNodes = state.graph.nodes.filter((node) => node.isFinal);
	const handleClickRunButton = (node: GiselleNode) => {
		dispatch(executeFlow(node));
	};
	if (finalNodes.length === 1) {
		return (
			<RunButtonInner
				onClick={() => {
					handleClickRunButton(finalNodes[0]);
				}}
			/>
		);
	}
	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger asChild>
				<RunButtonInner />
			</DropdownMenu.Trigger>

			<DropdownMenu.Portal>
				<DropdownMenu.Content
					align="end"
					className="z-50 bg-black-100 border-[0.5px] border-black-70 rounded-[16px] px-[16px] py-[8px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
				>
					{finalNodes.map((node) => (
						<DropdownMenu.Item key={node.id} className="">
							<button
								type="button"
								onClick={() => {
									handleClickRunButton(node);
								}}
							>
								{node.name}
							</button>
						</DropdownMenu.Item>
					))}
					<DropdownMenu.Arrow />
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
}

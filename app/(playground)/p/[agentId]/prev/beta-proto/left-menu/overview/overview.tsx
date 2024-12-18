import { XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAgentName } from "../../contexts/agent-name";
import { useGraph } from "../../graph/context";
import { updateAgentName as updateAgentNameAction } from "./server-actions";

interface OverviewProps {
	setTabValue: (value: string) => void;
}
export function Overview(props: OverviewProps) {
	const [editTitle, setEditTitle] = useState(false);
	const { name, setName } = useAgentName();
	const inputRef = useRef<HTMLInputElement>(null);
	const transitionToEditTitle = useCallback(() => {
		setEditTitle(true);
	}, []);
	const { state } = useGraph();
	const updateAgentName = useCallback(async () => {
		if (inputRef.current) {
			setName(inputRef.current.value);
			await updateAgentNameAction({
				agentId: state.graph.agentId,
				name: inputRef.current.value,
			});
		}
	}, [state.graph.agentId, setName]);
	const handleBlur = useCallback(async () => {
		setEditTitle(false);
		updateAgentName();
	}, [updateAgentName]);
	useEffect(() => {
		if (inputRef.current === null) {
			return;
		}
		if (editTitle) {
			inputRef.current.focus();
			inputRef.current.select();
		}

		const callback = (e: KeyboardEvent) => {
			if (e.key === "Enter") {
				inputRef.current?.blur();
			}
		};
		inputRef.current.addEventListener("keydown", callback);
		return () => {
			inputRef.current?.removeEventListener("keydown", callback);
		};
	}, [editTitle]);
	return (
		<div className="grid gap-[24px] px-[24px] py-[24px]">
			<header className="flex justify-between">
				<p
					className="text-[22px] font-rosart text-black--30"
					style={{ textShadow: "0px 0px 20px hsla(207, 100%, 48%, 1)" }}
				>
					Overview
				</p>
				<button type="button">
					<XIcon
						className="w-[16px] h-[16px] text-black-30"
						onClick={() => props.setTabValue("")}
					/>
				</button>
			</header>
			{editTitle ? (
				<input
					type="text"
					className="text-[16px] text-black-30 p-[4px] text-left outline-black-70 rounded-[8px]"
					onBlur={handleBlur}
					ref={inputRef}
					defaultValue={name}
				/>
			) : (
				<button
					type="button"
					onClick={() => transitionToEditTitle()}
					className="text-[16px] text-black-30 p-[4px] text-left"
				>
					{name}
				</button>
			)}
		</div>
	);
}

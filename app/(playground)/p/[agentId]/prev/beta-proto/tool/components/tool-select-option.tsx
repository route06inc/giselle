import { CheckIcon } from "lucide-react";
import { type FC, type ReactNode, useCallback } from "react";
import { ListItem } from "../../components/list-item";
import { setTool } from "../actions";
import { useTool } from "../context";
import type { Tool } from "../types";

type ToolSelectOptionProps = {
	icon: ReactNode;
	tool: Tool;
	label: string;
};

export const ToolSelectOption: FC<ToolSelectOptionProps> = ({
	icon,
	tool,
	label,
}) => {
	const { dispatch, state } = useTool();
	const handleClick = useCallback(() => {
		dispatch(setTool(tool));
	}, [dispatch, tool]);
	return (
		<button type="button" onClick={handleClick}>
			<ListItem
				leftIcon={icon}
				title={label}
				rightIcon={
					state.activeTool.type === tool.type ? <CheckIcon size={16} /> : null
				}
			/>
		</button>
	);
};

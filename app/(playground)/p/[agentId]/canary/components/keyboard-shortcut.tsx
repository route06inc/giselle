import { type ReactNode, useEffect } from "react";
import { useToast } from "../contexts/toast";
import { useToolbar } from "../contexts/toolbar";

const ignoredTags = ["INPUT", "TEXTAREA", "SELECT"];

export function KeyboardShortcut() {
	const { selectTool } = useToolbar();
	const { addToast } = useToast();

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const activeElement = document.activeElement;
			const tagName = activeElement?.tagName;

			if (tagName !== undefined && ignoredTags.includes(tagName)) {
				return;
			}
			switch (event.key) {
				case "v":
					selectTool("move");
					break;
				case "t":
					selectTool("addTextNode");
					break;
				case "f":
					selectTool("addFileNode");
					break;
				case "g":
					selectTool("addTextGenerationNode");
					break;
				case "a":
					/**
					 * Toast test
					 * @todo remove this if not needed
					 */
					addToast({
						title: "Action failed(TEST)",
						message: "Unable to connect to server.",
						type: "error",
					});
					break;
			}
			if (event.code === "Escape") {
				selectTool("move");
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [selectTool, addToast]);

	return <></>;
}

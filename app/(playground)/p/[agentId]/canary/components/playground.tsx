"use client";

import { usePlaygroundMode } from "../contexts/playground-mode";
import { Editor } from "./editor";
import { Viewer } from "./viewer";

export function Playground() {
	const { playgroundMode } = usePlaygroundMode();
	if (playgroundMode === "editor") {
		return <Editor />;
	}
	if (playgroundMode === "viewer") {
		return <Viewer />;
	}
	throw new Error("Invalid playground mode");
}

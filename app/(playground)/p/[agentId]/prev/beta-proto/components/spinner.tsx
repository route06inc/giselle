"use client";

import { type FC, useEffect, useState } from "react";

export const Spinner: FC = () => {
	const [loaderState, setLoaderState] = useState(0);
	const loaderChars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

	useEffect(() => {
		const timer = setInterval(() => {
			setLoaderState((prevState) => (prevState + 1) % loaderChars.length);
		}, 100);

		return () => clearInterval(timer);
	}, []);

	return (
		<span className="text-rosepine-text" aria-hidden="true">
			{loaderChars[loaderState]}
		</span>
	);
};

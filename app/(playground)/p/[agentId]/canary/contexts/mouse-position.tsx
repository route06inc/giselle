"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface MousePosition {
	x: number;
	y: number;
}

const MousePositionContext = createContext<MousePosition>({ x: 0, y: 0 });

export function MousePositionProvider({
	children,
}: { children: React.ReactNode }) {
	const [mousePosition, setMousePosition] = useState<MousePosition>({
		x: 0,
		y: 0,
	});

	useEffect(() => {
		const handleMouseMove = (event: MouseEvent) => {
			setMousePosition({ x: event.clientX, y: event.clientY });
		};

		window.addEventListener("mousemove", handleMouseMove);

		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
		};
	}, []);

	return (
		<MousePositionContext.Provider value={mousePosition}>
			{children}
		</MousePositionContext.Provider>
	);
}

export const useMousePosition = () => useContext(MousePositionContext);

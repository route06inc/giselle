import {
	type FC,
	type PropsWithChildren,
	createContext,
	useContext,
	useEffect,
	useState,
} from "react";

const MousePositionContext = createContext({ x: 0, y: 0 });

export const MousePositionProvider: FC<PropsWithChildren> = ({ children }) => {
	const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

	useEffect(() => {
		const updateMousePosition = (ev: MouseEvent) => {
			setMousePosition({ x: ev.clientX, y: ev.clientY });
		};

		window.addEventListener("mousemove", updateMousePosition);

		return () => {
			window.removeEventListener("mousemove", updateMousePosition);
		};
	}, []);

	return (
		<MousePositionContext.Provider value={mousePosition}>
			{children}
		</MousePositionContext.Provider>
	);
};

export const useMousePosition = () => {
	return useContext(MousePositionContext);
};

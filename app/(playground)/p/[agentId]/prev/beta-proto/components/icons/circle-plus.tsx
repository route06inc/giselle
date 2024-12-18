import type { FC, SVGProps } from "react";

export const CirclePlusIcon: FC<SVGProps<SVGSVGElement>> = (props) => (
	<svg
		width="20"
		height="20"
		viewBox="0 0 20 20"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		{...props}
	>
		<title>Circle Plus Icon</title>
		<circle cx="10" cy="10" r="10" />
		<path
			fillRule="evenodd"
			clipRule="evenodd"
			d="M9.5001 13.9284C9.5001 14.2046 9.72396 14.4284 10.0001 14.4284C10.2762 14.4284 10.5001 14.2046 10.5001 13.9284V10.4999H13.9287C14.2048 10.4999 14.4287 10.276 14.4287 9.99986C14.4287 9.72372 14.2048 9.49986 13.9287 9.49986L10.5001 9.49986V6.07129C10.5001 5.79515 10.2762 5.57129 10.0001 5.57129C9.72396 5.57129 9.5001 5.79515 9.5001 6.07129V9.49986L6.07153 9.49986C5.79539 9.49986 5.57153 9.72372 5.57153 9.99986C5.57153 10.276 5.79539 10.4999 6.07153 10.4999H9.5001V13.9284Z"
		/>
	</svg>
);

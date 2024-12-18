import type { FC, SVGProps } from "react";

export const CircleCheckIcon: FC<SVGProps<SVGSVGElement>> = (props) => (
	<svg
		width="20"
		height="21"
		viewBox="0 0 20 21"
		xmlns="http://www.w3.org/2000/svg"
		{...props}
	>
		<title>Circle Check Icon</title>
		<g clipPath="url(#clip0_6417_28902)">
			<path d="M9.90909 0.5C4.43636 0.5 0 4.93636 0 10.4091C0 15.8818 4.43636 20.3182 9.90909 20.3182C15.3818 20.3182 19.8182 15.8818 19.8182 10.4091C19.8182 4.93636 15.3818 0.5 9.90909 0.5ZM14.4727 8.18182L9.05455 13.6C8.92727 13.7273 8.75455 13.8 8.57273 13.8C8.39091 13.8 8.21818 13.7273 8.09091 13.6L5.35455 10.8636C5.09091 10.6 5.09091 10.1636 5.35455 9.9C5.61818 9.63636 6.05455 9.63636 6.31818 9.9L8.57273 12.1545L13.5091 7.21818C13.7727 6.95455 14.2091 6.95455 14.4727 7.21818C14.7364 7.48182 14.7364 7.91818 14.4727 8.18182Z" />
		</g>
		<defs>
			<clipPath id="clip0_6417_28902">
				<rect width="20" height="20" transform="translate(0 0.5)" />
			</clipPath>
		</defs>
	</svg>
);

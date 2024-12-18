import type { ReactNode } from "react";

export function EmptyState({
	title,
	icon,
	description,
	children,
}: {
	title: string;
	icon: ReactNode;
	description: string;
	children?: ReactNode;
}) {
	return (
		<div className="flex flex-col items-center gap-[8px]">
			{icon}
			<p className="font-[800] text-black-30">{title}</p>
			<p className="text-black-70 text-[12px] text-center leading-5">
				{description}
			</p>
			{children}
		</div>
	);
}

import type { FC, ReactNode } from "react";

type ListItemProps = {
	leftIcon: ReactNode;
	title: string;
	rightIcon?: ReactNode | undefined | null;
};
export const ListItem: FC<ListItemProps> = ({ leftIcon, title, rightIcon }) => (
	<div
		className={"flex gap-[8px] px-[16[px] py-[8px] min-w-[150px] items-center"}
	>
		<div className="flex items-center">{leftIcon}</div>
		<div className="font-avenir text-[14px] text-black-30">{title}</div>
		{rightIcon ? (
			<div className="flex items-center ml-auto">{rightIcon}</div>
		) : (
			<div className="w-[16px]" />
		)}
	</div>
);

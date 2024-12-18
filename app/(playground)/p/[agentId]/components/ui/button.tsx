import clsx from "clsx/lite";
import type { ButtonHTMLAttributes, DetailedHTMLProps } from "react";

export function Button({
	className,
	...props
}: DetailedHTMLProps<
	ButtonHTMLAttributes<HTMLButtonElement>,
	HTMLButtonElement
>) {
	return (
		<button
			className={clsx(
				"px-[16px] py-[8px] rounded-[8px] flex items-center gap-[2px] bg-[hsla(207,19%,77%,0.3)] font-rosart",
			)}
			style={{
				boxShadow: "0px 0px 3px 0px hsla(0, 0%, 100%, 0.25) inset",
			}}
			{...props}
		/>
	);
}

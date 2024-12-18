import clsx from "clsx/lite";
import type { ReactNode } from "react";

type BlockSize = "default" | "large";
export function Block({
	children,
	size = "default",
	...props
}: { children: ReactNode; size?: BlockSize }) {
	return (
		<div
			data-size={size}
			className={clsx(
				"rounded-[4px] relative bg-[hsla(202,52%,46%,0.1)] text-left group",
				"data-[size=default]:px-[12px] data-[size=default]:py-[8px]",
				"data-[size=large]:px-[16px] data-[size=large]:py-[8px]",
			)}
			{...props}
		>
			<div className="z-10 relative">{children}</div>
			<div className="absolute z-0 rounded-[4px] inset-0 border mask-fill bg-gradient-to-br bg-origin-border bg-clip-boarder border-transparent to-[hsla(233,4%,37%,1)] from-[hsla(233,62%,22%,1)]" />
		</div>
	);
}

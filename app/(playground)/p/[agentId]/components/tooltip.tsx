import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

type TooltipProps = {
	children: ReactNode;
	text: ReactNode;
	sideOffset?: number;
	delayDuration?: number;
};

export function Tooltip({
	children,
	text,
	sideOffset = 4,
	delayDuration = 300,
}: TooltipProps) {
	return (
		<TooltipPrimitive.Provider>
			<TooltipPrimitive.Root delayDuration={delayDuration}>
				<TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
				<TooltipPrimitive.Portal>
					<TooltipPrimitive.Content
						sideOffset={sideOffset}
						className="z-50 overflow-hidden rounded-md bg-black-30 px-2 py-0.5 text-xs text-black-100 shadow-sm animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
					>
						{text}
					</TooltipPrimitive.Content>
				</TooltipPrimitive.Portal>
			</TooltipPrimitive.Root>
		</TooltipPrimitive.Provider>
	);
}

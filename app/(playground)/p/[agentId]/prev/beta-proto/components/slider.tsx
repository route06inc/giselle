"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";

import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
	React.ElementRef<typeof SliderPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
	<SliderPrimitive.Root
		ref={ref}
		className={cn(
			"relative flex w-full touch-none select-none items-center",
			className,
		)}
		{...props}
	>
		<SliderPrimitive.Track className="relative h-[4px] w-full grow overflow-hidden bg-[hsla(0,0%,99%,0.1)]">
			<SliderPrimitive.Range className="absolute h-full bg-black-40" />
		</SliderPrimitive.Track>
		<SliderPrimitive.Thumb className="block h-[12px] w-[12px] rounded-full bg-black--50" />
	</SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };

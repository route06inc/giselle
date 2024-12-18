import { cn } from "@/lib/utils";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { type ComponentProps, useState } from "react";

function SliderInner({
	className,
	...props
}: ComponentProps<typeof SliderPrimitive.Root>) {
	return (
		<SliderPrimitive.Root
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
	);
}
SliderInner.displayName = SliderPrimitive.Root.displayName;

interface SliderProps
	extends Pick<
		ComponentProps<typeof SliderPrimitive.Root>,
		"max" | "min" | "step"
	> {
	label: string;
	value: number;
	onChange?: (topP: number) => void;
}
export function Slider(props: SliderProps) {
	const [value, setValue] = useState(props.value);
	return (
		<div className="flex items-center gap-[8px]">
			<div className="font-rosart text-[14px] text-black-40 w-[90px] shrink-0">
				{props.label}
			</div>
			<SliderInner
				max={props.max}
				min={props.min}
				step={props.step}
				defaultValue={[value]}
				onValueChange={(v) => setValue(v[0])}
				onValueCommit={(v) => props.onChange?.(v[0])}
			/>
			<div className="text-[12px] text-black-40 w-[3em] text-right">
				{value.toFixed(2)}
			</div>
		</div>
	);
}

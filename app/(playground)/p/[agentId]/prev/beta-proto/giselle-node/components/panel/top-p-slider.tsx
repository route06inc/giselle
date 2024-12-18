import { useState } from "react";
import { Slider } from "../../../components/slider";

interface TopPSliderProps {
	value: number;
	onChange: (topP: number) => void;
}
export function TopPSlider(props: TopPSliderProps) {
	const [topP, setTopP] = useState(props.value);
	return (
		<div className="flex items-center gap-[8px]">
			<div className="font-rosart text-[14px] text-black-40 w-[90px] shrink-0">
				Top P
			</div>
			<Slider
				max={1.0}
				min={0.0}
				step={0.01}
				defaultValue={[topP]}
				onValueChange={(v) => setTopP(v[0])}
				onValueCommit={(v) => props.onChange(v[0])}
			/>
			<div className="text-[12px] text-black-40 w-[3em] text-right">
				{topP.toFixed(2)}
			</div>
		</div>
	);
}

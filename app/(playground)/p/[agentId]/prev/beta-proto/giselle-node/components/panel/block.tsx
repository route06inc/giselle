import { Trash2Icon } from "lucide-react";
import type { ReactNode } from "react";

type BlockProps = {
	icon: ReactNode;
	title: string;
	description?: string;
	onDelete?: () => void;
};
export function Block(props: BlockProps) {
	return (
		<div className="px-[16px] py-[8px] rounded-[4px] relative bg-[hsla(202,52%,46%,0.1)] text-left flex items-center  justify-between group">
			<div className="flex items-center gap-[16px] overflow-x-hidden">
				<div className="w-[18px]">{props.icon}</div>
				<div className="overflow-x-hidden">
					<p className="truncate text-[14px] font-rosart">{props.title}</p>
					{props.description && (
						<p className="line-clamp-1 font-rosart text-black-70 text-[8px]">
							{props.description}
						</p>
					)}
				</div>
			</div>

			{props.onDelete && (
				<button
					type="button"
					className="z-10 hidden group-hover:block p-[2px] rounded-[4px] hover:bg-[hsla(0,0%,100%,0.2)] transition-colors duration-200 ease-in-out"
					onClick={props.onDelete}
				>
					<Trash2Icon size={16} className="stroke-black-30" />
				</button>
			)}
			<div className="absolute z-0 rounded-[4px] inset-0 border mask-fill bg-gradient-to-br bg-origin-border bg-clip-boarder border-transparent to-[hsla(233,4%,37%,1)] from-[hsla(233,62%,22%,1)]" />
		</div>
	);
}

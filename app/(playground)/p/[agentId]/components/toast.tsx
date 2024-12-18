import * as ToastPrimitive from "@radix-ui/react-toast";
import clsx from "clsx";
import { CircleXIcon } from "./icons/circle-x";

export interface Toast {
	title?: string;
	message?: string;
	type?: "success" | "error" | "warning" | "info";
}

export function Toast({ title, message, type }: Toast) {
	return (
		<>
			<ToastPrimitive.Root
				className={clsx(
					"bg-black-100 rounded-[8px] border border-black-40 py-[8px] px-[16px] backdrop-blur-[67px]",
					"data-[type=error]:text-red-50",
					"grid grid-cols-[auto_max-content] items-center gap-x-[15px] [grid-template-areas:_'title_action'_'description_action'] data-[swipe=cancel]:translate-x-0 data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[state=closed]:animate-hide data-[state=open]:animate-slideIn data-[swipe=end]:animate-swipeOut data-[swipe=cancel]:transition-[transform_200ms_ease-out]",
				)}
				data-type={type}
				open={true}
			>
				{title && (
					<ToastPrimitive.Title className="text-[18px] font-[800] [grid-area:_title] flex items-center gap-[8px]">
						{type === "error" && (
							<CircleXIcon className="w-[20px] h-[20px] fill-current" />
						)}
						{title}
					</ToastPrimitive.Title>
				)}
				{message && (
					<ToastPrimitive.Description asChild>
						<p className=" [grid-area:_description] text-[12px]">{message}</p>
					</ToastPrimitive.Description>
				)}
			</ToastPrimitive.Root>
		</>
	);
}

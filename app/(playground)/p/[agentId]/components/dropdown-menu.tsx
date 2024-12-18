import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import clsx from "clsx/lite";
import { CheckIcon, DotIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
export const DropdownMenu = DropdownMenuPrimitive.Root;

export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export const DropdownMenuGroup = DropdownMenuPrimitive.Group;

export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

export function DropdownMenuContent({
	align,
	sideOffset,
	children,
	onEscapeKeyDown,
	onCloseAutoFocus,
	onPointerDownOutside,
	onFocusOutside,
}: Pick<
	ComponentProps<typeof DropdownMenuPrimitive.Content>,
	| "children"
	| "align"
	| "sideOffset"
	| "onEscapeKeyDown"
	| "onCloseAutoFocus"
	| "onPointerDownOutside"
	| "onFocusOutside"
>) {
	return (
		<DropdownMenuPrimitive.Portal>
			<DropdownMenuPrimitive.Content
				sideOffset={sideOffset}
				align={align}
				className={clsx(
					"z-50 min-w-[8rem] overflow-hidden rounded-[16px] border border-black-70 bg-black-100 p-[8px] text-black-30 shadow-[0px_0px_2px_0px_hsla(0,_0%,_100%,_0.1)_inset]",
					"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
				)}
				onEscapeKeyDown={onEscapeKeyDown}
				onCloseAutoFocus={onCloseAutoFocus}
				onPointerDownOutside={onPointerDownOutside}
				onFocusOutside={onFocusOutside}
			>
				{children}
			</DropdownMenuPrimitive.Content>
		</DropdownMenuPrimitive.Portal>
	);
}
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

export function DropdownMenuCheckboxItem({
	children,
	...props
}: Omit<
	ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>,
	"className"
>) {
	return (
		<DropdownMenuPrimitive.CheckboxItem
			className="relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
			{...props}
		>
			{children}
			<span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
				<DropdownMenuPrimitive.ItemIndicator>
					<CheckIcon className="h-4 w-4" />
				</DropdownMenuPrimitive.ItemIndicator>
			</span>
		</DropdownMenuPrimitive.CheckboxItem>
	);
}
DropdownMenuCheckboxItem.displayName =
	DropdownMenuPrimitive.CheckboxItem.displayName;

export function DropdownMenuLabel({ children }: { children: ReactNode }) {
	return (
		<DropdownMenuPrimitive.Label className="px-2 py-[2px] text-[12px] text-black-70">
			{children}
		</DropdownMenuPrimitive.Label>
	);
}
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

export function DropdownMenuSeparator() {
	return (
		<DropdownMenuPrimitive.Separator className="-mx-1 my-1 h-px bg-muted" />
	);
}
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

export function DropdownMenuRadioItem({
	children,
	value,
}: {
	children: ReactNode;
	value: ComponentProps<typeof DropdownMenuPrimitive.RadioItem>["value"];
}) {
	return (
		<DropdownMenuPrimitive.RadioItem
			className="relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
			value={value}
		>
			<span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
				<DropdownMenuPrimitive.ItemIndicator>
					<DotIcon className="h-8 w-8 fill-current" />
				</DropdownMenuPrimitive.ItemIndicator>
			</span>
			{children}
		</DropdownMenuPrimitive.RadioItem>
	);
}
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

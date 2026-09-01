import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "./utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

/**
 * TooltipContent — TECH NOIR styled.
 *
 * Visually distinct from menus/dialogs (which share --popover as a solid
 * surface) via three signature touches:
 * 1. A pointing Radix Arrow (set withArrow={false} to suppress).
 * 2. A soft cyan halo layered over a neutral depth shadow — the neon-on-
 * navy character of the rest of the app, instead of a flat shadow-md.
 * 3. Tighter typography (text-xs, medium, tracking-tight) + a 16rem
 * max-width default so long hints wrap instead of stretching edge to
 * edge.
 *
 * `overflow-hidden` is intentionally OMITTED so the arrow can poke out of
 * the content box toward the trigger. Per-call-site className overrides
 * (text-xs, max-w-xs, text-[10px], …) still win via tailwind-merge.
 */
const TooltipContent = React.forwardRef<
 React.ElementRef<typeof TooltipPrimitive.Content>,
 React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
 /** Render the pointing arrow. Defaults to true. */
 withArrow?: boolean
 }
>(({ className, children, sideOffset = 6, withArrow = true, ...props }, ref) => (
 <TooltipPrimitive.Content
 ref={ref}
 sideOffset={sideOffset}
 className={cn(
 "relative z-50 max-w-[16rem]",
 "rounded-md border border-white/10",
 "bg-popover px-2.5 py-1.5",
 "text-xs font-medium leading-tight tracking-tight text-popover-foreground",
 // depth + signature cyan glow (neon-on-noir)
 "shadow-[0_2px_8px_-2px_rgba(0,0,0,0.6),0_8px_28px_-12px_oklch(0.84_0.158_196/0.45)]",
 "animate-in fade-in-0 zoom-in-95",
 "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
 "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
 className
 )}
 {...props}
 >
 {children}
 {withArrow && (
 <TooltipPrimitive.Arrow
 className="fill-[var(--popover)] drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]"
 width={11}
 height={6}
 />
 )}
 </TooltipPrimitive.Content>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }

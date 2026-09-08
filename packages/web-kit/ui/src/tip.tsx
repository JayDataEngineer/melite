/**
 * Tip — the app-wide tooltip wrapper (promoted from the E4.9 IconTip
 * prototype in surfaces/generate; 2026-08-14 tooltip unification).
 *
 * Wraps any single trigger element in the styled Radix Tooltip so
 * hovering or focusing it reveals a short text label. This is the visual
 * affordance for icon-only controls; the caller is still responsible for
 * setting an `aria-label` on the trigger for screen readers (tooltips
 * don't provide an accessible name).
 *
 * Usage:
 * <Tip tip="Undo" shortcut="⌘Z">
 *   <Button size="icon" aria-label="Undo"><UndoIcon /></Button>
 * </Tip>
 *
 * When `tip` is undefined the children render BARE — no Tooltip is
 * mounted at all (zero Radix overhead for conditional labels).
 *
 * The Radix TooltipProvider is mounted once at the app root (App.tsx),
 * so Tip can be used anywhere without re-wrapping in a provider.
 */
import type { ReactElement } from 'react'
import { Tooltip, TooltipTrigger, TooltipContent } from "./tooltip"
import { cn } from "./utils"

type TooltipSide = 'top' | 'bottom' | 'left' | 'right'

interface TipProps {
  /** Short human-readable label shown in the tooltip bubble. When
   *  undefined the trigger renders bare (no Tooltip). */
  tip?: string
  /** Optional keyboard shortcut shown after the label (e.g. "⌘Z"). */
  shortcut?: string
  /** Which side of the trigger the tooltip appears on. Defaults to top. */
  side?: TooltipSide
  /** Delay (ms) before the tooltip appears. Defaults to 300ms. */
  delayDuration?: number
  /** Passthrough to TooltipContent; tailwind-merge overrides win. */
  className?: string
  /** Render the pointing arrow. Defaults to true. */
  withArrow?: boolean
  /**
   * The trigger element — MUST be a single element that forwards ref
   * (asChild is used). Typically a <Button> or <button>.
   */
  children: ReactElement
}

export function Tip({
  tip,
  shortcut,
  side = 'top',
  delayDuration = 300,
  className,
  withArrow = true,
  children,
}: TipProps) {
  if (tip === undefined) return children
  return (
    <Tooltip delayDuration={delayDuration}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={side}
        withArrow={withArrow}
        className={cn('text-[10px] font-medium px-2 py-1', className)}
        data-tip-content
      >
        <span data-tip-label>{tip}</span>
        {shortcut && (
          <kbd
            data-tip-shortcut
            className="ml-1 px-1 py-px rounded border border-white/15 bg-white/[0.06] font-mono text-[9px] leading-none text-popover-foreground/65"
          >
            {shortcut}
          </kbd>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

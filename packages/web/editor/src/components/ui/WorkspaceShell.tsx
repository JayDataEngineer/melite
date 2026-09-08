/**
 * WorkspaceShell — the shared layout frame for every workspace tab.
 *
 * Provides the common structure all three tabs (Flow, Video, Motion)
 * share:
 *
 *   ┌─ TopBar (sticky actions bar) ───────────────────────────┐
 *   ├─ Strip (horizontal thumbnail scroll, optional) ─────────┤
 *   ├─ Content (sliding panels: left | center | right) ────────┤
 *   └──────────────────────────────────────────────────────────┘
 *
 * The content area uses framer-motion (the SAME library the card system
 * uses) so the side panels SLIDE in/out — AnimatePresence holds the
 * exiting rail while it animates away, so both enter AND exit are real
 * animations (not hard cuts / teleports). The rails are flex siblings
 * of the center (fixed width from the RightPanel/LeftPanel className).
 *
 * ThreePaneLayout / TwoPaneLayout are CONTROLLED — the parent owns
 * showLeft/showRight and renders its own toggle buttons.
 */
import { type ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@melite/ui"
import { PANEL_SLIDE, slideFromLeft, slideFromRight } from "@/surfaces/shared/panelSlide"

// ── TopBar ───────────────────────────────────────────────────────────────

export function TopBar({
  left, center, right,
  className = "",
}: {
  left?: ReactNode
  center?: ReactNode
  right?: ReactNode
  className?: string
}) {
  return (
    <div className={`flex items-center gap-2 px-4 h-11 border-b border-white/10 bg-black/30 text-xs shrink-0 ${className}`}>
      {left}
      {center && <div className="flex-1 flex items-center justify-center">{center}</div>}
      {!center && <div className="flex-1" />}
      {right}
    </div>
  )
}

// ── Strip (horizontal thumbnail scroll) ─────────────────────────────────

export function Strip({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`flex gap-1.5 px-3 py-2 overflow-x-auto scrollbar-thin border-b border-white/10 shrink-0 ${className}`}>
      {children}
    </div>
  )
}

// ── ThreePaneLayout ─────────────────────────────────────────────────────
//
// A flex row: [left rail] [center] [right rail]. The side rails slide
// in/out via framer-motion + AnimatePresence (enter AND exit). The center
// is flex-1 and fills the remaining space. Rail widths come from the
// LeftPanel/RightPanel className (w-64, w-72, …).
//
// NOTE (2026-08-09): the prior react-resizable-panels layout was replaced
// because Panels must be DIRECT children of PanelGroup — AnimatePresence
// cannot wrap a Panel, so there was no way to animate the exit (the rail
// teleported out). The slide animation is the operator's explicit demand;

export interface ThreePaneLayoutProps {
  left?: ReactNode
  center: ReactNode
  right?: ReactNode
  /** Left pane visibility — controlled by parent. Defaults true. */
  showLeft?: boolean
  /** Right pane visibility — controlled by parent. Defaults true. */
  showRight?: boolean
}

export function ThreePaneLayout({
  left, center, right,
  showLeft = true, showRight = true,
}: ThreePaneLayoutProps) {
  return (
    <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">
      <AnimatePresence>
        {showLeft && left && (
          <motion.div
            key="left-rail"
            data-rail="left"
            {...slideFromLeft}
            transition={PANEL_SLIDE}
            className="h-full shrink-0 overflow-hidden"
          >
            {left}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex min-h-0 min-w-0 flex-1">{center}</div>
      <AnimatePresence>
        {showRight && right && (
          <motion.div
            key="right-rail"
            data-rail="right"
            {...slideFromRight}
            transition={PANEL_SLIDE}
            className="h-full shrink-0 overflow-hidden"
          >
            {right}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── PaneContainer (wrapper for pane content) ────────────────────────────

export function PaneContainer({
  title, children, onClose, icon: Icon, headerExtra,
  className = "",
}: {
  title: string
  children: ReactNode
  onClose?: () => void
  icon?: React.ComponentType<{ className?: string }>
  headerExtra?: ReactNode
  className?: string
}) {
  return (
    <div className={`h-full flex flex-col min-w-0 ${className}`}>
      <div className="flex items-center gap-1.5 px-3 h-8 border-b border-white/10 bg-white/[0.02] shrink-0">
        {Icon && <Icon className="h-3 w-3 text-muted-foreground shrink-0" />}
        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground truncate flex-1">
          {title}
        </span>
        {headerExtra}
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  )
}

// ── RightPanel / LeftPanel (consistent chrome wrappers) ─────────────────
//
// The single source of truth for side-panel chrome. Every tab's right (or
// left) rail MUST be wrapped in one of these so bg / border / header height
// / typography match across the whole editor. Before this primitive existed,
// each tab invented its own (InpaintToolbar w-72, BodyStudio w-[460px],
// DirectorStudio w-[420px], PoseStudioSidebar w-[260/340px], ServicesSidebar
// w-56) — five different sizes + five different border tints stacked on the
// same screen. Now there is one.
//
// Used in tandem with TwoPaneLayout / ThreePaneLayout (resizable) or mounted
// directly with a fixed width when a tab brings its own non-resizable layout.

interface SidePanelProps {
  title: string
  children: ReactNode
  onClose?: () => void
  icon?: React.ComponentType<{ className?: string }>
  headerExtra?: ReactNode
  /** Optional sub-label under the title (e.g. "Inspector"). */
  subtitle?: string
  /** Replace the standard title header entirely (the rail's tab bar).
   *  When set, title/subtitle/icon/headerExtra/onClose are ignored. */
  header?: ReactNode
  className?: string
  /** Body wrapper class — appended to "flex-1 min-h-0 min-w-0". Defaults to a
   *  scrollable column. Pass "overflow-hidden" (+ your own layout) when the
   *  consumer manages its own internal scroll regions. */
  bodyClassName?: string
}

export function RightPanel({
  title, children, onClose, icon: Icon, headerExtra, subtitle, header,
  className = "", bodyClassName = "overflow-y-auto scrollbar-thin",
}: SidePanelProps) {
  return (
    <aside
      // cn() — NOT string concat: callers pass a width (w-64 shrink-0) that
      // must WIN over the base w-full. String concat made the base class
      // first-come-first-served and the rail swallowed the whole workspace
      // (2026-08-07 two-surfaces bug).
      //
      // The SLIDE animation is handled by the enclosing TwoPaneLayout /
      // ThreePaneLayout (motion.div + AnimatePresence) — or by an explicit
      // motion.div wrapper at the call site. This aside stays a plain
      // element so there's no double animation.
      className={cn(
        "flex h-full min-h-0 w-max min-w-0 flex-col border-l border-sidebar-border/60 bg-sidebar tn-seam",
        className,
      )}
    >
      {header !== undefined ? (
        header
      ) : (
        <SidePanelHeader title={title} subtitle={subtitle} icon={Icon} headerExtra={headerExtra} onClose={onClose} />
      )}
      <div className={cn("flex-1 min-h-0 min-w-0", bodyClassName)}>
        {children}
      </div>
    </aside>
  )
}

export function LeftPanel({
  title, children, onClose, icon: Icon, headerExtra, subtitle, header,
  className = "", bodyClassName = "overflow-y-auto scrollbar-thin",
}: SidePanelProps) {
  return (
    <aside
      className={cn(
        "flex h-full min-h-0 w-max min-w-0 flex-col border-r border-sidebar-border/60 bg-sidebar tn-seam",
        className,
      )}
    >
      {header !== undefined ? (
        header
      ) : (
        <SidePanelHeader title={title} subtitle={subtitle} icon={Icon} headerExtra={headerExtra} onClose={onClose} />
      )}
      <div className={cn("flex-1 min-h-0 min-w-0", bodyClassName)}>
        {children}
      </div>
    </aside>
  )
}

function SidePanelHeader({
  title, subtitle, icon: Icon, headerExtra, onClose,
}: {
  title: string
  subtitle?: string
  icon?: React.ComponentType<{ className?: string }>
  headerExtra?: ReactNode
  onClose?: () => void
}) {
  return (
    <header className="relative flex h-11 shrink-0 items-center gap-2 px-3">
      {Icon && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand/12 text-brand">
          <Icon className="h-3.5 w-3.5" />
        </span>
      )}
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-xs font-semibold uppercase tracking-wide text-foreground/80">
          {title}
        </span>
        {subtitle && (
          <span className="text-[10px] text-muted-foreground/80">{subtitle}</span>
        )}
      </div>
      {headerExtra && <div className="ml-auto flex items-center gap-1">{headerExtra}</div>}
      {onClose && (
        // H-RIGHT fix (2026-08-21): the X previously required !headerExtra,
        // so ANY header content (e.g. a tab strip) deleted the only close
        // control. It now sits beside it; ml-auto applies only when there
        // is nothing to its right.
        <button
          onClick={onClose}
          aria-label={`Close ${title} panel`}
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-accent/60 hover:text-foreground",
            !headerExtra && "ml-auto",
          )}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -bottom-px h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, color-mix(in srgb, var(--brand) 18%, transparent) 50%, transparent)",
        }}
      />
    </header>
  )
}

// ── TwoPaneLayout (main + right, sliding) ───────────────────────────────
//
// A flex row: [center] [right rail]. The right rail slides in from the
// right + slides back out via framer-motion + AnimatePresence (both enter
// AND exit animate — no teleport). The center is flex-1 and fills the
// remaining space. The right rail's width comes from the RightPanel
// className passed by the caller (w-64, w-72, …).
//
// NOTE (2026-08-09): replaced the react-resizable-panels layout because
// AnimatePresence cannot wrap a Panel (Panels must be direct children of
// PanelGroup), making exit animation impossible — the rail teleported out.

export interface TwoPaneLayoutProps {
  /** Main content (left/center). */
  children: ReactNode
  /** Right pane content. When omitted, only the main pane renders. */
  right?: ReactNode
  /** Right pane visibility — controlled by parent. Defaults true. */
  showRight?: boolean
}

export function TwoPaneLayout({
  children, right,
  showRight = true,
}: TwoPaneLayoutProps) {
  return (
    <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">
      <div className="flex min-h-0 min-w-0 flex-1">{children}</div>
      <AnimatePresence>
        {showRight && right && (
          <motion.div
            key="right-rail"
            data-rail="right"
            {...slideFromRight}
            transition={PANEL_SLIDE}
            className="h-full shrink-0 overflow-hidden"
          >
            {right}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── WorkspaceShell (the full frame) ─────────────────────────────────────

export function WorkspaceShell({
  topBar, strip, children,
}: {
  topBar: ReactNode
  strip?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-col h-full w-full">
      {topBar}
      {strip}
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  )
}

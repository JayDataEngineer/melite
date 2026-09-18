/**
 * THE ESTATE'S LAYOUT GRAMMAR (2026-09-18, promoted from h3's studio
 * kit — the operator's question: "no other card will need ControlRow,
 * SectionLabel, PaneHeader in the future ever?"). Rows, section
 * headings, pane chrome, empty states, tooltip anchors: the grammar
 * EVERY card speaks. One definition in the shared base; cards compose
 * them — composition is the card's own geometry, these pieces are the
 * estate's. Moved VERBATIM (JSX + CSS) from the h3 kit; the kit
 * re-exports as a bridge so existing import sites keep one door.
 */
import type { ComponentProps, ReactElement, ReactNode } from 'react'
import { Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'
import { cn } from './chrome.ts'
import css from './card.module.css'

// ── Tip — DSH Tooltip over a layout-invisible anchor ────────────────

export function Tip({ tip, children }: { tip?: string; children: ReactElement }): ReactElement {
  if (tip === undefined) return children
  return (
    <Tooltip label={tip} side="top" delayMs={300}>
      <span className={css.tipAnchor}>{children}</span>
    </Tooltip>
  )
}

// ── ControlRow — the universal label+control line ───────────────────

export type ControlDensity = 'md' | 'sm'

export function ControlRow({
  label, hint, children, density = 'md', className,
}: {
  label: ReactNode
  hint?: ReactNode
  children: ReactNode
  density?: ControlDensity
  className?: string
}): ReactElement {
  return (
    <label className={cn(density === 'sm' ? css.ctlRowSm : css.ctlRow, className)}>
      <span>{label}{hint != null ? hint : null}</span>
      {children}
    </label>
  )
}

// ── SectionLabel — the uppercase group heading ──────────────────────

export function SectionLabel({
  children, tail, className,
}: {
  children: ReactNode
  tail?: ReactNode
  className?: string
}): ReactElement {
  return (
    <div className={cn(css.sectionLabel, className)}>
      <span className={css.sectionLabelText}>{children}</span>
      {tail != null ? <span className={css.sectionLabelTail}>{tail}</span> : null}
    </div>
  )
}

// ── EmptyState — the shared nothing-here block ──────────────────────

export function EmptyState({
  icon, title, hint, variant = 'pane', className,
}: {
  icon?: ReactNode
  title: ReactNode
  hint?: ReactNode
  variant?: 'overlay' | 'pane'
  className?: string
}): ReactElement {
  return (
    <div
      data-slot="empty-state"
      data-variant={variant}
      className={cn(variant === 'overlay' ? css.emptyOverlay : css.emptyPane, className)}
    >
      {icon}
      <p className={css.emptyTitle}>{title}</p>
      {hint != null ? <p className={css.emptyHint}>{hint}</p> : null}
    </div>
  )
}

// ── Skeleton — the pane grammar's loading face ───────────────────────

/** Skeleton — the quiet loading block (promoted 2026-09-18 from
 *  motion's kit, where it was the estate's only copy): a bare div
 *  with the estate pulse. EmptyState is the pane's empty face;
 *  Skeleton is its loading face. */
export function Skeleton({ className, ...props }: ComponentProps<'div'>): ReactElement {
  return <div data-slot='skeleton' className={cn(css.skeleton, className)} {...props} />
}

// ── PaneHeader + PaneShell — the shared pane chrome ─────────────────

export type PaneHeaderVariant = 'strip' | 'preview'

export function PaneHeader({
  title, meta, hint, lead, variant = 'strip', className,
}: {
  title?: ReactNode
  meta?: ReactNode
  hint?: ReactNode
  lead?: ReactNode
  variant?: PaneHeaderVariant
  className?: string
}): ReactElement {
  if (variant === 'preview') {
    return (
      <div data-slot="pane-header" data-variant="preview" className={cn(css.paneHeaderPreview, className)}>
        {lead}
        {title != null ? <span className={css.paneTitle}>{title}</span> : null}
        {meta != null ? <span className={css.paneMeta}>{meta}</span> : null}
        {hint}
      </div>
    )
  }
  return (
    <div data-slot="pane-header" data-variant="strip" className={cn(css.paneHeaderStrip, className)}>
      {lead}
      {title != null ? <span className={css.paneTitle}>{title}</span> : null}
      {meta != null ? <span className={css.paneMetaNum}>{meta}</span> : null}
      {hint != null ? <span className={css.paneHint}>{hint}</span> : null}
    </div>
  )
}

export function PaneShell({ children, className }: { children: ReactNode; className?: string }): ReactElement {
  return (
    <div data-slot="pane-shell" className={cn(css.paneShell, className)}>
      {children}
    </div>
  )
}

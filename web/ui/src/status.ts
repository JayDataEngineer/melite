/**
 * STATUS_STYLES — the single source of truth for status → visual mapping.
 *
 * Used by every workspace tab (Pipeline, Video/Director, Motion) so the
 * status language is identical everywhere: same colors, same dots, same
 * badges, same labels. Change a color here, it changes everywhere.
 *
 * Status keys are the superset of all three tabs' statuses:
 *   pipeline: pending | running | done | error | skipped | stopped
 *   video:    empty | pending | generating | ready | failed
 *   motion:   (same as pipeline — it IS a pipeline stage type)
 *
 * Aliases (completed→done, failed→error, generating→running) normalize
 * the legacy keys so each tab can use its own vocabulary without
 * branching at every call site.
 */

export type StatusKey =
  | "pending" | "running" | "done" | "error" | "skipped" | "stopped"
  | "empty" | "generating" | "ready" | "failed" | "completed"
  | "reused"

interface StatusStyle {
  /** Small status dot (8px circle in cards/strips). */
  dot: string
  /** Badge classes for inline pills. */
  badge: string
  /** Human-readable label. */
  label: string
  /** Ring color for selected card border. */
  ring: string
}

// Design language (neon-on-noir):
//   brand  = the project's electric-cyan accent (--brand) → active/working
//   amber  = waiting / queued / pending attention
//   emerald= success / done (universal green)
//   red    = failure (universal)
//   zinc   = inert / skipped / empty (low emphasis)
const _STYLES: Record<string, StatusStyle> = {
  pending:     { dot: "bg-amber-400",      badge: "bg-amber-500/15 text-amber-300/90",                                       label: "queued",    ring: "ring-amber-500/30" },
  running:     { dot: "bg-brand",          badge: "bg-brand/15 text-brand animate-pulse",                                    label: "working",   ring: "ring-brand/40" },
  generating:  { dot: "bg-brand",          badge: "bg-brand/15 text-brand animate-pulse",                                    label: "rendering", ring: "ring-brand/40" },
  done:        { dot: "bg-emerald-400",    badge: "bg-emerald-500/15 text-emerald-300",                                      label: "done",      ring: "ring-emerald-500/30" },
  ready:       { dot: "bg-emerald-400",    badge: "bg-emerald-500/15 text-emerald-300",                                      label: "ready",     ring: "ring-emerald-500/30" },
  completed:   { dot: "bg-emerald-400",    badge: "bg-emerald-500/15 text-emerald-300",                                      label: "done",      ring: "ring-emerald-500/30" },
  error:       { dot: "bg-red-400",        badge: "bg-red-500/15 text-red-300",                                              label: "failed",    ring: "ring-red-500/40" },
  failed:      { dot: "bg-red-400",        badge: "bg-red-500/15 text-red-300",                                              label: "failed",    ring: "ring-red-500/40" },
  skipped:     { dot: "bg-white/10",       badge: "bg-muted text-muted-foreground",                                          label: "off",       ring: "ring-border" },
  stopped:     { dot: "bg-muted-foreground", badge: "bg-muted text-muted-foreground/70",                                     label: "stopped",   ring: "ring-border" },
  empty:       { dot: "bg-white/10",       badge: "bg-white/5 text-foreground/30",                                                label: "empty",     ring: "ring-white/10" },
  reused:      { dot: "bg-brand/60",       badge: "bg-brand/10 text-brand/70",                                               label: "reused",    ring: "ring-brand/20" },
}

/** Normalize aliases + lookup. Returns a safe default for unknown keys. */
export function statusStyle(status: string): StatusStyle {
  return _STYLES[status] || _STYLES.pending
}

/** Just the dot class (most common call-site). */
export function statusDot(status: string): string {
  return statusStyle(status).dot
}

/** Just the badge class. */
export function statusBadge(status: string): string {
  return statusStyle(status).badge
}

/** Just the label. */
export function statusLabel(status: string): string {
  return statusStyle(status).label
}

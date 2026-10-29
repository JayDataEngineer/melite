/**
 * LaneHead — THE ONE LANE HEAD SHELL (SD-8 lane parity, operator item
 * c 2026-11-08: the keyframes bar's format was "not shared with the
 * audio sort of bar"). The gutter's four bespoke head grammars
 * (.laneHead / .laneHeadBeats / .audioHead / .laneRow) collapse into
 * this one anatomy: a glyph-or-dot slot, a label, an accent tint, a
 * title voice, and door/detach slots — every gutter head renders
 * through it, so no bespoke grammar can grow back. The heights stay
 * tenant-derived (the head takes the SAME number the lane body takes;
 * the height-mirror arm pins the pairing).
 */
import { clsx as cn } from "clsx"
import css from "./timeline.module.css"
import type * as React from "react"

export interface LaneHeadProps {
  /** The shell's variant — one of the four former grammars plus the
   *  commission row (§9's mod projection), kept as a data hook so
   *  tenants and walls can address each row class. */
  variant: "prompts" | "beats" | "audio" | "kf" | "commission"
  /** The identity slot: an icon element (prompts/beats/audio) or a
   *  dot color (kf tracks — the track's rgb). Exactly one. */
  glyph?: React.ReactNode
  /** The kf tracks' color dot (rendered in the glyph slot). */
  dotColor?: string
  label: string
  /** The accent tint (audio layers) — rides the shell's color so the
   *  glyph and label read like the clips. Absent → neutral. */
  accent?: string
  /** Row height px — the SAME number the lane body takes (the
   *  head↔body pairing, mirrored by the parity wall, not trusted to
   *  two call sites staying in sync by hand). */
  height: number
  /** The row's hover voice (the audio heads' bed/drop title; the kf
   *  head's pin-law title). Absent → no title. */
  title?: string
  /** The audio heads' glyph-name hook (data-audio-icon — the tenant
   *  wall tints and addresses the head by it). Absent → no attr. */
  iconAttr?: string
  /** The add-door slot (the upload button element). */
  door?: React.ReactNode
  /** The detach slot (the × button element). */
  detach?: React.ReactNode
  /** The row's stable id (`data-lane-head-id`) — how a tenant's dynamic
   *  rows (the commission heads) are addressed by walls and by the lane
   *  body they pair with. Absent → no attr, byte-identical. */
  rowId?: string
}

/** One head, one grammar (SD-8). */
export function LaneHead(props: LaneHeadProps) {
  const { variant, glyph, dotColor, label, accent, height, title, iconAttr, door, detach, rowId } = props
  return (
    <div
      className={cn(css.laneHeadShell)}
      data-lane-head={variant}
      data-lane-head-id={rowId}
      data-audio-icon={iconAttr}
      style={{ height, ...(accent ? { color: accent } : {}) }}
      title={title}
    >
      {glyph}
      {dotColor && (
        <span
          className={css.laneDot}
          data-lane-dot={variant}
          style={{ background: dotColor }}
          aria-hidden
        />
      )}
      <span className={css.gutterLabel}>{label}</span>
      {door}
      {detach}
    </div>
  )
}

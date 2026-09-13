/**
 * MotionTimelineBar — the motion card's bar, pose-studio display model.
 *
 * 2026-08-14 rethink: the vendored viser Timeline (canvas-drawn, Kimodo
 * demo parity) is replaced by the LEGACY POSE STUDIO's interaction model —
 * DOM clips you can SEE and GRAB: prompt cards drag (body = move, edges =
 * resize), double-click to edit inline, hover-X to delete; keyframe lanes
 * with draggable diamonds. The user's words: "I could click and drag prompt
 * in the motion studio, was useful."
 *
 * Zoom + horizontal scroll (pose-studio parity, round 2): the bar DEFAULTS
 * to fit (every frame on screen — no hidden content), but −/%/+ zooms in;
 * past fit the content scrolls horizontally (native thin scrollbar, wheel,
 * trackpad, shift-wheel) while the label gutter stays pinned. Zooming is
 * ANCHORED to the playhead — the frame under the playhead stays put, the
 * rest grows around it.
 *
 * Pull-the-tail (2026-08-14, the "stuck at 5 seconds" fix): the end is not
 * a wall. Dragging the LAST prompt card's right edge past the end EXTENDS
 * the timeline (onExtend → the parent grows its envelope + duration_sec),
 * with auto-scroll following the cursor — the DaVinci Resolve rule that
 * the sequence is as long as its content. Non-last cards clamp as before.
 *
 * What stayed: ALL the state + persistence beneath (tlPrompts /
 * tlKeyframes / constraintPayloads in MotionCardEditor, constraints.ts
 * serialize/hydrate, MOTION_TIMELINE_TRACKS lane colors from the Kimodo
 * demo). This is a view-layer swap only — every prop is one of the
 * callbacks the viser Timeline used to receive.
 *
 * Video-timeline re-tenanting round 2 (2026-08-16, "the bar needs to be
 * TALLER, show the videos, and have a beats row UNDER the calls"): the
 * row heights grew (ruler 28 / prompts 36 — the video studio passes 64),
 * call clips render their WINDOW PREVIEW inside the clip (first frame at
 * rest, plays on hover — NLE strip behavior), and a Layer C BEATS row
 * sits under the calls: prompt segments within a call, clickable (the
 * sidebar edits them), never cut-bearers. Clicking a call OR beat clip
 * selects it (`onSelect`) — the tenant's sidebar populates that item's
 * inputs/options; the selected clip gets a ring (calls brand cyan, beats
 * cyan-300). A click on the EMPTY timeline deselects (`onSelect(null)`)
 * — the sidebar shifts back to its global mode; a real drag never
 * deselects (the post-pointerup synthetic click is suppressed).
 *
 * Theme: the DSH tokens (bg --dsw-alias-bg-layer-1, playhead
 * --dsw-alias-brand-primary), the 2026-09-13 color law. The palette is
 * themeable per mount (the 2026-09-07 styling seam: className/style on
 * the root, theme.{barBg,playhead} for the accents) — defaults render
 * byte-identical, so no tenant changes.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"
import { Film, Image, ListMusic, Music, X, ZoomIn, ZoomOut } from "./icons"
import { clsx as cn } from "clsx"
import { ASSET_DRAG_MIME } from "./dragMime"
import { MOTION_TIMELINE_TRACKS } from "./viser-timeline/motionTimelineState"
import { PROMPT_COLORS } from "./viser-timeline/styles"
import { Button, Input } from "@deepseek-ai/dsh-client-ui-primitives"
import { Tip } from "./tip"
import css from "./timeline.module.css"
import type { TimelineKeyframe, TimelinePrompt, TimelineTrack } from "./viser-timeline/types"

/** One Layer C prompt segment (video timeline) rendered in its OWN row
 * UNDER the calls: {text, start, end} within a call — a SUBSET of the
 * call, never a timeline entity itself (the call row above carries the
 * cuts). `end_frame` is INCLUSIVE (the bar's frame vocabulary — the
 * studio translates the doc's exclusive end). */
export interface TimelineBeat {
  id: string
  callId: string
  text: string
  start_frame: number
  end_frame: number
  color?: [number, number, number]
}

const rgb = (c: [number, number, number]) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** Row heights (px): ruler, prompts, beats (Layer C), audio layers, keyframe lanes. */
const RULER_H = 28
const PROMPTS_H = 36
const BEATS_H = 26
const AUDIO_H = 26
const LANE_H = 24
/** Label gutter width. (audit F5, 2026-09-02: 88 → 112 — the pinned
 * header row now carries the timecode positioning indicator beside the
 * zoom cluster, DaVinci-style; every gutter row shares the one const.) */
const GUTTER_W = 112
/** Playhead accent — the DSH brand token. */
const PLAYHEAD = "var(--dsw-alias-brand-primary)"
/** Unified background for the timeline bar and its sticky timecode chip. */
const BAR_BG = "var(--dsw-alias-bg-layer-1)"
/** Zoom bounds: multiplier steps + the px-per-frame ceiling. */
const ZOOM_STEP = 1.6

/** mm:ss:ff at the bar's axis fps — the DaVinci position readout
 * (2026-09-01 audit F5: the bar had NO position indicator; the only
 * readout lived under the player with a different fps divisor). */
const fmtTimecode = (frame: number, fps: number): string => {
  const f = Math.max(0, Math.round(frame))
  const safeFps = Math.max(1, Math.round(fps))
  const ff = f % safeFps
  const totalSec = Math.floor(f / safeFps)
  const ss = totalSec % 60
  const mm = Math.floor(totalSec / 60)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${p(mm)}:${p(ss)}:${p(ff)}`
}

/** Pointer travel (px) before a gesture counts as a DRAG (audit F8: 2px
 * armed "moved" from jitter — a shaky click at high zoom rippled both
 * cuts a frame. 5px = click still selects, jitter stays a click). */
const DRAG_ARM_PX = 5
const MAX_PPF = 40

export interface MotionTimelineBarProps {
  prompts: TimelinePrompt[]
  keyframes: TimelineKeyframe[]
  /** Current playhead frame. */
  frameIdx: number
  /** Total frames T (the authoring envelope — bars map 0..T-1 across the width). */
  totalFrames: number
  fps: number
  /** Mount zoom (2026-09-02, operator: "the default zoom should show
   *  10 seconds — it starts out too zoomed in"): when set, the pinned
   *  scale shows this many SECONDS across the viewport — an absolute
   *  NLE default in both directions (long docs stop opening as
   *  postage stamps; short docs stop inflating to fill the width).
   *  Absent → fit at mount (the motion card's unchanged behavior).
   *  Fit re-pins from the dial as before; this only picks the FIRST
   *  pin. */
  initialSeconds?: number
  onFrameChange: (frame: number) => void
  /** ── SCRUB INTERACTION STATES (2026-09-01, davinci 1:1): fired around
   *  a ruler scrub's lifetime — pointerdown to pointerup/cancel. A tenant
   *  syncing a player gates its time reports STRICTLY on this pair (set a
   *  flag at start, clear at end) instead of a timer: a seek's own late
   *  onTime arriving mid-hold must never yank the thumb back. Absent →
   *  the bar is unchanged (the motion card never notices). */
  onScrubStart?: () => void
  onScrubEnd?: () => void
  onKeyframeAdd: (trackId: string, frame: number) => string
  onKeyframeMove: (id: string, frame: number) => void
  onKeyframeDelete: (id: string) => void
  onPromptUpdate: (id: string, text: string) => void
  onPromptMove: (id: string, startFrame: number, endFrame: number) => void
  onPromptResize: (id: string, startFrame: number, endFrame: number) => void
  onPromptDelete: (id: string) => void
  /** Pull-the-tail: dragging the LAST card's right edge past the end
   *  EXTENDS the timeline (the parent grows its envelope + duration) —
   *  DaVinci Resolve's "the sequence is as long as its content". Non-last
   *  cards still clamp at the end. */
  onExtend: (newTotal: number) => void
  /** ── Re-tenanting props (2026-08-15, the video timeline studio — S5).
   *  The bar is the interaction model, not the motion domain: another
   *  genre (video beats) drives the SAME DOM clips + diamonds with its
   *  OWN lanes/labels. All four default to the motion behavior, so the
   *  motion card is byte-for-byte unchanged. */
  /** The keyframe lanes (gutter labels + colors). Default: the motion
   *  card's 6 pose tracks. */
  tracks?: TimelineTrack[]
  /** Gutter label over the prompts row (motion: "Prompts"; video: "Calls"). */
  promptsLabel?: string
  /** The empty-lanes hint (motion names pose constraints; video names
   *  image/clip/audio guides). */
  laneHint?: string
  /** PACKED mode — the cards TILE the timeline with no gaps (video
   *  beats: a contiguous partition, compiler-enforced). Motion cards
   *  float in slack; their edge drags stop one frame short of the
   *  neighbor's START. A packed card's edges are SHARED BOUNDARIES —
   *  the drag may travel the FULL neighbor span (bounded by the
   *  neighbor's far edge, keeping every card ≥ 1 frame) and the parent
   *  ripples the cut (onPromptResize moves both sides). Without this
   *  the no-overlap clamps pin every interior boundary — a packed
   *  timeline would be uneditable. */
  packed?: boolean
  /** The empty prompts-row hint. */
  emptyPromptsHint?: string
  /** Taller prompts row (the video timeline passes 64 — room for the
   *  window preview + text; the motion card keeps the 36 default). */
  promptsHeight?: number
  /** Layer C row — prompt segments WITHIN a call (video timeline only).
   *  Absent → no beats row at all (the motion card is unchanged). The
   *  row is a SUBSET of the calls row above: no cuts, no drag — spans
   *  edit in the sidebar; a click selects the segment. */
  beats?: TimelineBeat[]
  beatsLabel?: string
  beatsHeight?: number
  /** The empty-beats-row hint. */
  beatsHint?: string
  /** Double-click the beats row at a frame → ADD a beat there (the
   *  row IS the entry point — the rail "+" is the second path, never
   *  the only one). The tenant resolves the frame → owning call and
   *  splits/promotes. Absent → no dblclick affordance (the row is a
   *  read-only lane; the cursor stays default). */
  onBeatAdd?: (frame: number) => void
  /** Double-click the CALLS row's non-clip area (or the ruler — the
   *  frame is always computable there) → ADD a clip at that frame.
   *  Clips keep their own double-click (inline edit, stopPropagation),
   *  so this is strictly the additive gesture on surfaces no clip
   *  owns: the ruler, gaps, the margin past the end. The tenant
   *  resolves split-vs-append (2026-08-16: "We don't need the add-call
   *  button. We can use the timeline to do this."). Absent → double-
   *  clicks stay inert (the motion card's clips float in slack; its
   *  Add button still carves). */
  onPromptAdd?: (frame: number) => void
  /** prompt uuid → video URL: the window render shown INSIDE the call
   *  clip (first frame at rest, plays on hover — NLE strip behavior).
   *  Best-effort mapping: window index ↔ call index (1:1 unless a
   *  forced mid-call split shifts it). */
  previews?: Record<string, string>
  /** The selected clip (call or beat) — the sidebar is editing it. */
  selectedId?: string | null
  /** Click a call or beat clip → the sidebar populates that item's
   *  inputs/options. null = a click on the empty timeline (deselect) —
   *  the tenant's sidebar shifts back to its global mode. */
  onSelect?: (id: string | null) => void
  /** ── AUDIO LAYERS — NATIVE timeline tracks (2026-08-16: "integrate
   *  the audio into the timeline. It should be native to it, not some
   *  3rd party row"). Each layer is a row INSIDE the bar: same gutter,
   *  same scroll, SAME SCALE — its slice segments sit at frameToPx
   *  positions, aligned with the calls row above. An ARRAY so a tenant
   *  can stack layers (music + dialogue); absent → no rows (the motion
   *  card is unchanged). `stem` = the wired artifact NAME (null = the
   *  dashed drop state). */
  audioLayers?: AudioLayer[]
  /** A tray drop on a layer's lane. The tenant owns the honesty rules
   *  (URL → upstream artifact NAME; foreign URLs write nothing). */
  onAudioDrop?: (layerId: string, url: string) => void
  /** (Layer A NLE law, 2026-08-31) A POSITIONED drop — the clip lands
   *  at the drop frame (DaVinci: where you let go is where it starts).
   *  Absent → the drop falls back to onAudioDrop (the legacy bed; the
   *  motion card never notices). */
  onAudioDropAt?: (layerId: string, url: string, frame: number) => void
  /** (Layer A NLE law) An OS FILE drop on the layer — the upload door.
   *  The tenant reads the file (data: URL) and appends a clip at the
   *  drop frame. Absent → file drops are ignored (no bad writes). */
  onAudioFileDrop?: (layerId: string, file: File, frame: number) => void
  /** Drag a clip body along the layer — translate, duration constant. */
  onAudioClipMove?: (layerId: string, clipId: string, frame: number) => void
  /** Delete one clip (its hover × on the block). */
  onAudioClipDelete?: (layerId: string, clipId: string) => void
  /** Detach a wired layer (its × in the gutter). */
  onAudioDetach?: (layerId: string) => void
  /** ── STYLING SEAM (2026-09-07, the shadcn rule): the bar is a
   *  shared component and takes className/style like every other
   *  primitive — the tenant's shell (border, rounding) rides the
   *  root; twMerge resolves conflicts. Absent → byte-identical. */
  className?: string
  style?: CSSProperties
  /** Palette overrides — the navy/cyan defaults ARE the 2026-08-14
   *  re-skin; a tenant restyles (e.g. matches a themed studio)
   *  without forking the bar. Partial: unset keys keep defaults. */
  theme?: MotionTimelineBarTheme
}

/** The bar's themeable palette (defaults: the navy/cyan tokens). */
export interface MotionTimelineBarTheme {
  /** The bar's background wash (the DSH bg-layer token). */
  barBg?: string
  /** The playhead + seam/extend accent (the DSH brand token). */
  playhead?: string
}

/** One persistent audio bed rendered as a native timeline track. */
export interface AudioLayer {
  id: string
  label: string
  /** The wired artifact NAME (null/"" = unwired — the dashed drop row). */
  stem?: string | null
  /** (Layer A NLE law, 2026-08-31) Positioned CLIPS — the DaVinci track:
   *  each clip starts at its own frame and runs its own length (across
   *  calls, under half a call, wherever). Present + non-empty → the row
   *  renders clips (draggable blocks); absent → the legacy stem bed
   *  (one bed under every cut) — byte-identical to before. */
  clips?: AudioClipView[]
}

/** One Layer A audio clip as the bar sees it (position in FRAMES on the
 *  bar's axis — the tenant translates to/from its doc space). */
export interface AudioClipView {
  id: string
  /** Display name (the clip's label inside the block). */
  name: string
  start_frame: number
  dur_frames: number
  /** 0..2 linear gain (drawn as the block's fill height; 1 = unity). */
  gain?: number
}

/** One in-flight pointer drag. `moved` distinguishes a click (select/
 * seek on pointerup) from a real drag. */
type Drag =
  (
  | { kind: "scrub"; startX: number; moved: boolean }
  | {
      kind: "prompt-move" | "prompt-l" | "prompt-r"
      id: string
      startX: number
      startF: number
      endF: number
      moved: boolean
    }
  | { kind: "kf"; id: string; startX: number; frame: number; moved: boolean }
  | {
      /** (Layer A NLE law) a Music-row clip body drag: translate the
       *  clip, duration constant, bounded by its clip neighbors. */
      kind: "audio-clip"
      layerId: string
      id: string
      startX: number
      startF: number
      durF: number
      moved: boolean
    }
  ) & {
    /** Total frames at gesture start — stamped by startDrag so the
     * extend-release pin test (audit F4b) can see doc growth. */
    t1AtStart?: number
  }

export function MotionTimelineBar({
  prompts,
  keyframes,
  frameIdx,
  onFrameChange,
  onScrubStart,
  onScrubEnd,
  totalFrames,
  fps,
  initialSeconds,
  onKeyframeAdd,
  onKeyframeMove,
  onKeyframeDelete,
  onPromptUpdate,
  onPromptMove,
  onPromptResize,
  onPromptDelete,
  onExtend,
  tracks = MOTION_TIMELINE_TRACKS,
  promptsLabel = "Prompts",
  laneHint = "Double-click a lane to pin a pose constraint at the playhead",
  packed = false,
  emptyPromptsHint = "No prompt cards — the Add button carves one",
  promptsHeight = PROMPTS_H,
  beats,
  beatsLabel = "Beats",
  beatsHeight = BEATS_H,
  beatsHint = "double-click to add a beat — prompt segments join into the call's one prompt",
  onBeatAdd,
  onPromptAdd,
  previews,
  selectedId = null,
  onSelect,
  audioLayers,
  onAudioDrop,
  onAudioDropAt,
  onAudioFileDrop,
  onAudioClipMove,
  onAudioClipDelete,
  onAudioDetach,
  className,
  style,
  theme,
}: MotionTimelineBarProps) {
  // Theme resolution — unset keys keep the verbatim defaults.
  const barBg = theme?.barBg ?? BAR_BG
  const playhead = theme?.playhead ?? PLAYHEAD
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<Drag | null>(null)
  // A drag that actually traveled suppresses the synthetic click the
  // browser fires right after its pointerup — a drag is a move/cut
  // gesture, never a deselect; only a true click on empty timeline is.
  const suppressClickRef = useRef(false)
  // The card with the furthest end (the tail). Live ref so the window
  // pointermove handler (which closes over render values) always sees the
  // current one after extend/delete re-renders.
  const lastPromptRef = useRef<string | null>(null)
  lastPromptRef.current = prompts.length
    ? prompts.reduce((a, b) => (b.end_frame > a.end_frame ? b : a)).uuid
    : null
  // The HEAD card (smallest start — packed tenants keep prompts sorted,
  // loose ones don't). Its left grip is structurally dead (frame-0 wall;
  // the tenants ignore start changes at index 0), so it renders DISABLED
  // (audit F7: an honest affordance, not a lying cursor).
  const firstPromptRef = useRef<string | null>(null)
  firstPromptRef.current = prompts.length
    ? prompts.reduce((a, b) => (b.start_frame < a.start_frame ? b : a)).uuid
    : null
  // Live prompts mirror — drag handlers read CURRENT card bounds (extends
  // mutate them mid-gesture; the pointerdown snapshot goes stale instantly).
  const promptsRef = useRef(prompts)
  promptsRef.current = prompts
  // The clip/diamond being dragged (drag ring highlight only — position is
  // committed live through the callbacks, so the element tracks the cursor).
  const [dragId, setDragId] = useState<string | null>(null)
  // Inline prompt editor: the clip being edited + its local text.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")

  // ── Zoom / horizontal scroll — ABSOLUTE ────────────────────────────────
  // 2026-08-16 (user: "the zoom is NOT absolute. It is always the size of
  // the largest card in the timeline"). The scale used to be FIT
  // (boxW / T1), so the ENVELOPE — the largest card's extent — dictated
  // px-per-frame: extend the tail and every card shrank under your
  // cursor; delete one and everything grew. The ppf is now ABSOLUTE:
  // pinned once the box is measured (fit at mount — a fresh doc still
  // fills the width), multiplied by the zoom buttons, and INVARIANT to
  // the document from then on. An envelope that outgrows the viewport
  // SCROLLS; it never rescales. Fit (the % button / zoom-out floor)
  // re-pins to the CURRENT fit — a deliberate act, never a side effect
  // of editing.
  const [boxW, setBoxW] = useState(0)
  const [ppf, setPpf] = useState<number | null>(null)   // null = not pinned yet
  // The readout's DENOMINATOR — the ppf at the last Fit (pinned with it).
  // Ratio against the LIVE fit would drift again the moment the envelope
  // changed (160% → 322% with nobody touching the dial); ratio against the
  // pinned base keeps the dialed number stable while the geometry stays
  // absolute underneath.
  const [basePpf, setBasePpf] = useState<number | null>(null)
  // SCALE FREEZE DURING A GESTURE (kept: a zoom change mid-gesture would
  // still jar; with absolute ppf it is a no-op unless the user zooms
  // mid-drag, which the freeze then smooths).
  const [dragScale, setDragScale] = useState<number | null>(null)
  // Playhead-anchored zoom: remember (frame, viewport offset) before the
  // width change; the layout effect restores scrollLeft so that frame stays
  // at the same on-screen x.
  const anchorRef = useRef<{ frame: number; off: number } | null>(null)

  const measure = () => {
    const el = scrollRef.current
    if (el && el.getBoundingClientRect().width > 0) {
      setBoxW(el.getBoundingClientRect().width)
    }
  }
  useEffect(() => {
    measure()
    // ResizeObserver, not just window.resize: the container's width changes
    // for reasons a window listener never sees (sidebar toggle, card expand,
    // modal mount). A stale boxW floored contentW at a dead size — zoom
    // clicks visibly did nothing until they blew past it. jsdom has no RO.
    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== "undefined" && scrollRef.current) {
      ro = new ResizeObserver(() => measure())
      ro.observe(scrollRef.current)
    }
    window.addEventListener("resize", measure)
    return () => {
      ro?.disconnect()
      window.removeEventListener("resize", measure)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Frames 0..T-1 map to 0..T1*effPpf px of content width.
  const T1 = Math.max(0, Math.floor(totalFrames) - 1)
  const fitPpf = boxW > 0 && T1 > 0 ? boxW / T1 : 10
  // Pin once measured. Container resizes do NOT re-pin —
  // the scale is absolute; only Fit re-pins, deliberately.
  // initialSeconds (2026-09-02): the mount pin shows N SECONDS across
  // the viewport instead of fitting the envelope — an absolute NLE
  // default (DaVinci-style), in BOTH directions: a long doc opens at
  // a readable 10s zoom instead of postage stamps, and a SHORT doc
  // stops blowing up to fill the width (operator: "it starts out too
  // zoomed in" — a fresh 4s doc at fit scale = giant clips). The pin
  // floors at 1px/frame (an absurdly narrow bar can't go sub-pixel).
  useEffect(() => {
    if (boxW > 0 && T1 > 0 && ppf == null) {
      let mount = Math.max(1, fitPpf)
      if (initialSeconds != null && initialSeconds > 0 && fps > 0) {
        mount = Math.max(1, boxW / (initialSeconds * fps))
      }
      setPpf(mount)
      setBasePpf(mount)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxW, T1])
  const effPpf = dragScale ?? ppf ?? Math.max(1, fitPpf)
  // TRAILING ROOM (2026-08-30, user: "the timeline bar doesn't let me go
  // past the end"): the content width used to END exactly at the last
  // frame — no scroll room past the end, so the pull-the-tail extend
  // gesture hit a visual wall (keepTailVisible clamps at scrollWidth)
  // and double-click-to-add had no empty space to land in. Every NLE
  // gives the sequence lead-out room: content = frames + trailing gap
  // (≥35% of the viewport, ≥240px). The empty area is scrollable,
  // droppable (onPromptAdd), and the tail drag grows into it while
  // onExtend round-trips the bigger envelope.
  const LEAD_OUT = Math.max(240, boxW * 0.35)
  const contentW = Math.max(boxW, T1 * effPpf + LEAD_OUT)
  const frameToPx = (f: number) => f * effPpf

  const zoom = (factor: number) => {
    const el = scrollRef.current
    if (el) anchorRef.current = { frame: frameIdx, off: frameToPx(frameIdx) - el.scrollLeft }
    const cur = ppf ?? Math.max(1, fitPpf)
    const next = cur * factor
    // At/below the CURRENT fit floors to fit (re-pinned AND re-based there
    // — an honest 100%, never a phantom); the absolute ceiling keeps short
    // motions from exploding the content width.
    if (next <= fitPpf * 1.0001) {
      setPpf(Math.max(1, fitPpf))
      setBasePpf(Math.max(1, fitPpf))
    } else {
      setPpf(Math.min(MAX_PPF, next))
    }
  }

  useLayoutEffect(() => {
    const el = scrollRef.current
    const a = anchorRef.current
    if (el && a) el.scrollLeft = Math.max(0, a.frame * effPpf - a.off)
    anchorRef.current = null
  }, [effPpf])

  // Client x → frame: content coordinates (scrollLeft included — the ruler
  // and lanes live INSIDE the scrolled strip).
  const frameAt = (clientX: number): number | null => {
    const el = scrollRef.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    if (r.width <= 0 && boxW <= 0) return null
    const x = clientX - r.left + el.scrollLeft
    return Math.round(x / effPpf) // UNclamped: callers clamp (the tail
    // extend legitimately reads frames PAST T1).
  }
  const xToFrame = (clientX: number): number | null => {
    const f = frameAt(clientX)
    return f == null ? null : clamp(f, 0, T1)
  }

  // Keep the card's right end INSIDE the viewport while its tail is pulled
  // (2026-08-14, user: "during this drag expand I should always let me see
  // the right side end of the prompt card"). Zoomed in, the growing content
  // pushes the end past the right edge — pan so it sits 24px inside. No-op
  // at fit (content always == viewport, max scroll = 0).
  const keepTailVisible = (endFrame: number) => {
    const el = scrollRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    if (r.width <= 0) return
    const rightPx = endFrame * effPpf
    if (rightPx > el.scrollLeft + r.width - 24) {
      const max = Math.max(0, el.scrollWidth - r.width)
      el.scrollLeft = Math.min(max, rightPx - r.width + 24)
    }
  }

  const startDrag = (e: React.PointerEvent, d: Drag) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    // Stamp the envelope at gesture start — the extend-release pin test
    // (audit F4b) compares it against T1 on pointerup.
    dragRef.current = { ...d, t1AtStart: T1 }
    setDragScale(effPpf)
    if (d.kind !== "scrub") setDragId(d.id)
  }

  // ── One global pointer session: scrub + clip drag/resize + keyframe drag.
  // The pose-studio pattern (window listeners + live-ref drag state) — the
  // handlers below are pure math on the ORIGINAL positions + the pixel
  // delta, so rapid re-renders can't desync a drag. Delta is in FRAMES via
  // the current px-per-frame (scroll-independent).
  useEffect(() => {
    const endDrag = () => {
      const d = dragRef.current
      dragRef.current = null
      setDragId(null)
      setDragScale(null)
      // The pointerup that ended a REAL drag still fires a click — arm
      // the suppress so the content's deselect handler skips it.
      if (d?.moved) suppressClickRef.current = true
      // EXTEND-RELEASE PIN (audit F4b, DaVinci "no rubber band"): while
      // the scale is still the LIVE fit (ppf unpinned) a gesture that
      // GREW the doc must PIN the frozen gesture scale before the freeze
      // clears — otherwise effPpf falls back to a fit over the BIGGER
      // doc and the whole sequence visibly snaps smaller on release,
      // taking back the tail the user just pulled. The absolute-scale
      // law: growth SCROLLS, never rescales. (Gesture-stable reads: ppf
      // is null for the whole gesture — only a zoom button could pin it
      // mid-drag, and a held pointer makes that impossible; dragScale is
      // set once at startDrag.)
      const grewDoc = d ? T1 > (d.t1AtStart ?? T1) : false
      if (d && grewDoc && ppf == null && dragScale != null) {
        setPpf(dragScale)
        setBasePpf(dragScale)
      }
      // SCRUB END (2026-09-01, the davinci 1:1 round): the scrub drag's
      // lifetime is an INTERACTION STATE, not a timer — the tenant pairs
      // this with onScrubStart to gate player time reports strictly
      // (a seek's own late-arriving onTime must never yank the released
      // thumb back).
      if (d && d.kind === "scrub") onScrubEnd?.()
      // A keyframe pointerup with no movement = click → seek to it
      // (pose-studio pin parity: click a pin to jump).
      if (d && d.kind === "kf" && !d.moved) onFrameChange(d.frame)
      // A prompt pointerup with no movement = click → SELECT the clip
      // (the tenant's sidebar populates that call's inputs/options).
      // The kind check narrows the union before `moved` (scrub has none).
      if (d
          && (d.kind === "prompt-move" || d.kind === "prompt-l" || d.kind === "prompt-r")
          && !d.moved) {
        onSelect?.(d.id)
      }
      // (Layer A NLE) an audio-clip pointerup with no movement = a click
      // on the clip — not a deselect of the timeline's selection.
      if (d && d.kind === "audio-clip" && !d.moved) suppressClickRef.current = true
    }
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      // SELF-HEAL (2026-08-15, "sometimes the first endpoint gets stuck,
      // stretching the card"): a swallowed pointerup — the browser firing
      // pointercancel for a native pan, alt-tab, focus theft — left the
      // drag ALIVE, and later button-less mouse moves kept resizing the
      // card with no press at all. A mouse pointermove with ZERO buttons
      // ends the session; a real drag always reports its held buttons, and
      // synthetic/test events carry no pointerType and pass through.
      if (e.pointerType === "mouse" && e.buttons === 0) { endDrag(); return }
      if (d.kind === "scrub") {
        if (Math.abs(e.clientX - d.startX) > 2) d.moved = true
        const f = xToFrame(e.clientX)
        if (f != null) onFrameChange(f)
        return
      }
      const dxF = (e.clientX - d.startX) / effPpf
      if (Math.abs(e.clientX - d.startX) > DRAG_ARM_PX) d.moved = true
      if (d.kind === "kf") {
        onKeyframeMove(d.id, clamp(Math.round(d.frame + dxF), 0, T1))
      } else if (d.kind === "audio-clip") {
        // (Layer A NLE law) TRANSLATE the clip: duration constant, the
        // body drag never resizes. Bounds: [0, T1 - dur] against the
        // envelope, and loose no-overlap against the layer's OTHER
        // clips (one frame of air each side — clips are a sequence on
        // one track, same rule as the motion cards).
        const L = audioLayers?.find((x) => x.id === d.layerId)
        const others = (L?.clips ?? []).filter((c) => c.id !== d.id)
        const prevEnd = others
          .filter((c) => c.start_frame < d.startF)
          .reduce<number | null>(
            (m, c) => Math.max(m ?? 0, c.start_frame + c.dur_frames), null)
        const nextStart = others
          .filter((c) => c.start_frame > d.startF)
          .reduce<number | null>(
            (m, c) => Math.min(m ?? T1, c.start_frame), null)
        let ns = clamp(Math.round(d.startF + dxF), 0, Math.max(0, T1 - d.durF))
        if (prevEnd != null) ns = Math.max(ns, prevEnd + 1)
        if (nextStart != null) ns = Math.min(ns, Math.max(0, nextStart - 1 - d.durF))
        onAudioClipMove?.(d.layerId, d.id, ns)
      } else {
        // NO-OVERLAP (2026-08-15, "the prompt cards can overlap — they get
        // tangled; they should be prevented from going over each other in
        // the first place"): cards are a SEQUENCE, not a pile. Every
        // gesture is bounded by the dragged card's positional neighbors —
        // a move slides within its slot (duration constant), an edge stops
        // one frame short of the neighbor. The TAIL keeps its past-the-
        // wall freedom (extend); the first card keeps frame 0.
        const neighborsOf = (id: string): {
          prevEnd: number | null; prevStart: number | null
          nextStart: number | null; nextEnd: number | null
        } => {
          const sorted = [...promptsRef.current].sort((a, b) => a.start_frame - b.start_frame)
          const i = sorted.findIndex((p) => p.uuid === id)
          if (i === -1) return { prevEnd: null, prevStart: null, nextStart: null, nextEnd: null }
          return {
            prevEnd: i > 0 ? sorted[i - 1]!.end_frame : null,
            prevStart: i > 0 ? sorted[i - 1]!.start_frame : null,
            nextStart: i < sorted.length - 1 ? sorted[i + 1]!.start_frame : null,
            nextEnd: i < sorted.length - 1 ? sorted[i + 1]!.end_frame : null,
          }
        }
        if (d.kind === "prompt-move") {
          // BODY DRAG = MOVE, NEVER RESIZE (two 2026-08-15 reports):
          // (1) "dragging right would STRETCH from the first second
          // instead of move the prompt card" — the old flush-tail branch
          // grew the END while the START sat pinned at 0. (2) The first
          // fix's clamp parked the full-span seed dead ("can no longer
          // click and drag"). The contract that answers both: a body drag
          // TRANSLATES the card — DURATION constant, start AND end move
          // together — and when the LAST card is dragged past the wall it
          // moves into new territory with the envelope growing to fit
          // (DaVinci's rule, the same one the right-edge grip follows;
          // the dragged distance becomes room on the left). Non-last
          // cards clamp at T1; nothing ever grows leftward past frame 0.
          const live = promptsRef.current.find((x) => x.uuid === d.id)
          const endF = live?.end_frame ?? d.endF
          const startF = live?.start_frame ?? d.startF
          const dur = Math.max(1, endF - startF)
          const { prevEnd, prevStart, nextStart, nextEnd } = neighborsOf(d.id)
          let ns = Math.max(0, Math.round(d.startF + dxF))
          if (prevEnd != null) {
            // …PACKED: the start is the CUT shared with the previous
            // card — a body drag travels it like an edge drag (down to
            // one frame of the previous card's span — prevStart+1, the
            // prompt-l rule). Loose (motion): stop one frame past its
            // END (the cards can't touch).
            ns = Math.max(ns, packed ? (prevStart ?? 0) + 1 : prevEnd + 1)
          }
          const ne = ns + dur
          if (ne > T1 && d.id === lastPromptRef.current) {
            // The tail card moves past the wall — grow the timeline to
            // fit the MOVED card (never its duration: dur is untouched).
            onExtend(ne + 1)
            onPromptMove(d.id, ns, ne)
            keepTailVisible(ne)
          } else {
            const maxNs = Math.max(0, T1 - dur)
            let c = clamp(ns, 0, maxNs)
            // Stop one frame short of the next card… PACKED: the END is
            // the CUT shared with the next card — it travels with the
            // drag (up to one frame of the next card's span — the
            // prompt-r rule). Loose: one frame before its START.
            if (nextStart != null) {
              c = Math.min(
                c,
                Math.max(0, packed ? (nextEnd ?? T1) - 1 - dur : nextStart - 1 - dur),
              )
            }
            onPromptMove(d.id, c, c + dur)
          }
        } else if (d.kind === "prompt-l") {
          // LIVE far edge (2026-08-15, "the first endpoint gets stuck,
          // stretching the card"): committing the pointerdown SNAPSHOT
          // end teleported the far edge whenever anything else had touched
          // the card since the grab (a prior extend, the envelope
          // rescale) — the near edge tracked the cursor while the far one
          // sat at a stale frame: a stretched card. The dragged edge keeps
          // the delta math (position-independent, immune to scroll/zoom).
          const live = promptsRef.current.find((x) => x.uuid === d.id)
          const endF = live?.end_frame ?? d.endF
          const { prevEnd, prevStart } = neighborsOf(d.id)
          let ns = clamp(Math.round(d.startF + dxF), 0, endF - 1)
          if (prevEnd != null) {
            // PACKED: the left edge is the CUT shared with the previous
            // card — it may travel the previous card's whole span (down
            // to prevStart+1, one frame of it survives). Loose (motion):
            // the cards can't touch, stop one frame past its END.
            ns = Math.max(ns, packed ? (prevStart ?? 0) + 1 : prevEnd + 1)
          }
          onPromptResize(d.id, ns, endF)
          // TRIM-FOLLOW (audit F5b, DaVinci parity): an edge drag scrubs
          // the viewer to the trim frame — the playhead rides the cut
          // being made, so the indicator and the edit point stay linked
          // mid-gesture (rAF-coalesced downstream by the player wrapper).
          onFrameChange(ns)
        } else {
          // prompt-r — LIVE start for the same reason.
          const live = promptsRef.current.find((x) => x.uuid === d.id)
          const startF = live?.start_frame ?? d.startF
          const { nextStart, nextEnd } = neighborsOf(d.id)
          let ne = Math.round(d.endF + dxF)
          if (ne > T1 && d.id === lastPromptRef.current) {
            // The tail extends the timeline instead of hitting a wall —
            // DaVinci's rule: the sequence grows to fit its content. The
            // parent (onExtend) grows the envelope + syncs duration_sec, so
            // the next Run generates the longer motion.
            onExtend(ne + 1)
          } else {
            ne = clamp(ne, startF + 1, T1)
            // Stop one frame short of the next card…
            if (nextStart != null) {
              // …PACKED: the right edge is the CUT shared with the next
              // card — it may travel the next card's whole span (up to
              // nextEnd-1, one frame of it survives). Loose (motion):
              // the cards can't touch, stop one frame before its START.
              ne = Math.min(
                ne,
                Math.max(startF + 1, packed ? (nextEnd ?? T1) - 1 : nextStart - 1),
              )
            }
          }
          onPromptResize(d.id, startF, ne)
          onFrameChange(ne) // TRIM-FOLLOW (audit F5b): the playhead rides the trimmed edge.
          if (d.id === lastPromptRef.current) keepTailVisible(ne)
        }
      }
    }
    // pointercancel = the browser taking the gesture (touch pan, pen
    // palm) — WITHOUT this the drag outlived the finger and ghost-resized.
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", endDrag)
    window.addEventListener("pointercancel", endDrag)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", endDrag)
      window.removeEventListener("pointercancel", endDrag)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [T1, effPpf, onFrameChange, onKeyframeMove, onPromptMove, onPromptResize, onExtend])

  // ── Ruler ticks: seconds (0.5s steps on short motions, adaptive after).
  // The ticks cover the CONTENT — including the trailing lead-out room,
  // so the empty space past the end reads as timeline, not dead canvas. ──
  const viewSec = totalFrames / Math.max(1, fps)
  const fullSec = contentW / Math.max(1, effPpf) / Math.max(1, fps)
  const stepSec = viewSec <= 4 ? 0.5 : Math.max(1, Math.ceil(viewSec / 16))
  const ticks: number[] = []
  for (let s = 0; s <= fullSec + 1e-6; s += stepSec) ticks.push(Math.round(s * 10) / 10)

  const commitEdit = (id: string) => {
    setEditingId(null)
    const text = editText.trim()
    const p = prompts.find((x) => x.uuid === id)
    if (p && text !== p.text) onPromptUpdate(id, text)
  }

  const seek = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    dragRef.current = { kind: "scrub", startX: e.clientX, moved: false }
    onScrubStart?.()
    const f = xToFrame(e.clientX)
    if (f != null) onFrameChange(f)
  }

  return (
    <div
      data-testid="motion-timeline-bar"
      className={cn(css.root, className)}
      style={{ background: barBg, ...style }}
    >
      {/* ── Label gutter (pinned — never scrolls) ────────────────────────── */}
      <div
        className={css.gutter}
        style={{ width: GUTTER_W }}
      >
        {/* Header row = the ZOOM CLUSTER (was a lone "Time" label). 2026-08-14
            move: the cluster used to float over the ruler's right end and
            covered the max-time label ("I can't see the max"). The gutter is
            pinned and always 112×28 — a natural home, NLE-style. */}
        <div
          className={css.zoomRow}
          style={{ height: RULER_H }}
        >
          <Tip tip="Zoom out (back toward fit)">
          <Button variant="ghost" size="sm"
            onClick={() => zoom(1 / ZOOM_STEP)}
            aria-label="Zoom out"
            className={css.zoomBtn}
          >
            <ZoomOut />
          </Button>
          </Tip>
          <Tip tip="Fit the whole motion in view">
          <Button variant="ghost" size="sm"
            onClick={() => {
              anchorRef.current = { frame: frameIdx, off: frameToPx(frameIdx) - (scrollRef.current?.scrollLeft ?? 0) }
              setPpf(Math.max(1, fitPpf))
              setBasePpf(Math.max(1, fitPpf))
            }}
            className={css.zoomPct}
          >
            {Math.round((effPpf / (basePpf ?? fitPpf)) * 100)}%
          </Button>
          </Tip>
          <Tip tip="Zoom in — more pixels per frame (the bar scrolls horizontally)">
          <Button variant="ghost" size="sm"
            onClick={() => zoom(ZOOM_STEP)}
            aria-label="Zoom in"
            className={css.zoomBtn}
          >
            <ZoomIn />
          </Button>
          </Tip>
        </div>
        <div
          className={css.laneHead}
          style={{ height: promptsHeight }}
        >
          <Film aria-hidden />
          <span className={css.gutterLabel}>{promptsLabel}</span>
        </div>
        {beats && (
          <div
            className={css.laneHeadBeats}
            style={{ height: beatsHeight }}
          >
            <ListMusic aria-hidden />
            <span className={css.gutterLabel}>{beatsLabel}</span>
          </div>
        )}
        {audioLayers?.map((L) => (
          <div
            key={L.id}
            className={css.audioHead}
            style={{ height: AUDIO_H }}
            title={L.stem
              ? `${L.stem} — one bed under every cut; each window hears its own slice in time`
              : "drop an audio / music track — sliced to each window in time"}
          >
            <Music aria-hidden />
            <span className={css.gutterLabelDim}>{L.label}</span>
            {/* (2026-09-02) detach shows for CLIPS too — the NLE Music
                row's clips are the primary content now; a clips-only
                layer had no way to clear the whole row at once. */}
            {(L.stem || (L.clips?.length ?? 0) > 0) && onAudioDetach && (
              <Button variant="ghost" size="sm"
                onClick={() => onAudioDetach(L.id)}
                aria-label={`Detach ${L.label}`}
                className={css.detachBtn}
              >
                <X aria-hidden />
              </Button>
            )}
          </div>
        ))}
        {tracks.map((t) => (
          <div
            key={t.uuid}
            className={css.laneRow}
            style={{ height: LANE_H }}
          >
            <span
              className={css.laneDot}
              style={{ background: rgb(t.color ?? [176, 180, 186]) }}
              aria-hidden
            />
            <span className={css.laneName}>{t.name}</span>
          </div>
        ))}
      </div>

      {/* ── Scrollable content (ruler + prompts + lanes + playhead) ──────── */}
      <div className={css.contentWrap}>
        <div ref={scrollRef} data-testid="motion-timeline-scroll" className={css.scroller}>
          <div
            data-testid="motion-timeline-content"
            className={css.content}
            style={{ width: contentW, minWidth: "100%" }}
            onClick={(e) => {
              // Click-away deselect (the sidebar shifts back to global
              // params): a true click on empty timeline — not a clip (the
              // clip's own select wins; stopPropagation isn't needed since
              // we check the target's ancestors), and never the click a
              // browser fires right after a real drag's pointerup.
              if (suppressClickRef.current) {
                suppressClickRef.current = false
                return
              }
              // Click-away deselect … plus the RULER: parking the
              // playhead is a SEEK, never a deselect (audit F3 — a
              // plain playhead click used to kick the sidebar's call
              // editor back to global; DaVinci: playhead moves never
              // change selection).
              if ((e.target as HTMLElement).closest('[data-prompt-clip],[data-beat-clip],[data-testid="motion-timeline-ruler"]')) return
              onSelect?.(null)
            }}
          >
            {/* Ruler — click/drag scrubs; double-click ADDS a clip at that
                frame (the additive gesture's always-computable home — the
                calls row's clips own their own double-click for editing). */}
            <Tip
              tip={
                onPromptAdd
                  ? "Click or drag to move the playhead — double-click to add a call at that frame"
                  : "Click or drag to move the playhead"
              }
            >
              <div
                data-testid="motion-timeline-ruler"
                className={css.ruler}
                style={{ height: RULER_H }}
                onPointerDown={seek}
                onDoubleClick={(e) => {
                  if (!onPromptAdd) return
                  // UNclamped (the tail-pull precedent): a double-click
                  // PAST the end means "append" — the tenant resolves.
                  const f = frameAt(e.clientX)
                  if (f != null) onPromptAdd(f)
                }}
              >
              {ticks.map((s) => (
                <div key={s} className={css.tick} style={{ left: frameToPx(s * fps) }}>
                  <div className={css.tickLine} />
                  <span className={css.tickLabel}>
                    {stepSec < 1 ? `${s.toFixed(1)}s` : `${s}s`}
                  </span>
                </div>
              ))}
              {/* POSITION INDICATOR (audit F5a, DaVinci parity): the
                  playhead's timecode mm:ss:ff, sticky-pinned at the
                  bar's left edge — 1:1 with the playhead (same frameIdx,
                  same fps axis the clips are drawn on; audit F2 unifies
                  the axis in the tenant). It IS part of the ruler
                  surface: clicking or dragging it scrubs. */}
              <span
                data-testid="motion-timeline-timecode"
                className={css.timecode}
                style={{ background: barBg, boxShadow: "2px 0 6px -2px color-mix(in srgb, var(--dsw-alias-bg-base) 80%, transparent)" }}
              >
                {fmtTimecode(frameIdx, fps)}
              </span>
              </div>
            </Tip>

            {/* Prompts — draggable/resizeable clips (the pose-studio affordance). */}
            <div
              className={cn(css.promptsLane, onPromptAdd && css.canAdd)}
              style={{ height: promptsHeight, background: "var(--dsw-alias-bg-layer-1)" }}
              onDoubleClick={(e) => {
                // The additive gesture on the surfaces no clip owns (gaps,
                // the past-the-end margin) — a clip's own double-click is
                // inline edit and never reaches here (stopPropagation;
                // the closest() guard covers the editor input's path).
                if (!onPromptAdd) return
                if ((e.target as HTMLElement).closest("[data-prompt-clip]")) return
                // UNclamped — the past-the-end margin is this surface's
                // whole point (double-click past the last frame = append).
                const f = frameAt(e.clientX)
                if (f != null) onPromptAdd(f)
              }}
            >
              {prompts.length === 0 && (
                <div className={css.emptyCenter}>
                  <span className={css.emptyHint}>
                    {emptyPromptsHint}
                  </span>
                </div>
              )}
              {prompts.map((p, i) => {
                const color = rgb(PROMPT_COLORS[i % PROMPT_COLORS.length]!)
                const isEditing = editingId === p.uuid
                const isMoving = dragId === p.uuid
                const isLast = p.uuid === lastPromptRef.current
                const isFirst = p.uuid === firstPromptRef.current
                const isSelected = selectedId === p.uuid
                const previewUrl = previews?.[p.uuid]
                const wPx = frameToPx(Math.max(1, p.end_frame - p.start_frame))
                const clipTip = `${p.text || "(empty)"} — frames ${p.start_frame}–${p.end_frame} (${(
                  (p.end_frame - p.start_frame) / Math.max(1, fps)
                ).toFixed(1)}s)\n\nDrag body: move · Drag edges: resize · Double-click: edit · Click: select`
                return (
                  <Tip key={p.uuid} tip={clipTip}>
                  <div
                    data-prompt-clip={p.uuid}
                    className={cn(css.promptClip, isMoving ? css.clipMoving : isSelected ? css.clipSelected : undefined)}
                    style={{
                      left: frameToPx(p.start_frame),
                      width: `max(26px, ${wPx}px)`,
                      background: `linear-gradient(135deg, ${color}33, ${color}14)`,
                      borderLeft: `3px solid ${color}`,
                      transition: isMoving ? "none" : "border-color .12s",
                    }}
                    // The preview video is pointer-events-none, so hover
                    // handlers live on the clip: rest = first frame,
                    // hover = plays (NLE strip behavior).
                    onMouseEnter={(e) => {
                      const v = e.currentTarget.querySelector("video")
                      if (v) v.play().catch(() => {})
                    }}
                    onMouseLeave={(e) => {
                      const v = e.currentTarget.querySelector("video")
                      if (v) v.pause()
                    }}
                    onPointerDown={(e) =>
                      !isEditing &&
                      startDrag(e, {
                        kind: "prompt-move",
                        id: p.uuid,
                        startX: e.clientX,
                        startF: p.start_frame,
                        endF: p.end_frame,
                        moved: false,
                      })
                    }
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      setEditText(p.text)
                      setEditingId(p.uuid)
                    }}
                  >
                    {/* Left resize handle — DEAD on the FIRST card (the
                        frame-0 wall: nothing exists before it to trim
                        into). Audit F7: render the grip disabled with
                        the reason on hover instead of a cursor that
                        slides over a handle that moves nothing. */}
                    <div
                      data-prompt-edge="l"
                      title={isFirst ? "First call — nothing before it to trim into" : undefined}
                      className={cn(css.edgeL, isFirst && css.edgeDead)}
                      onPointerDown={(e) =>
                        !isFirst &&
                        startDrag(e, {
                          kind: "prompt-l",
                          id: p.uuid,
                          startX: e.clientX,
                          startF: p.start_frame,
                          endF: p.end_frame,
                          moved: false,
                        })
                      }
                    >
                      <div className={css.gripPill} />
                    </div>
                    {/* Seam indicator (F9 — motion-context visibility):
                        a small glyph at the clip's LEFT edge (the join
                        point) so the author sees at a glance whether this
                        cut chains motion (extend) or breaks it (cut).
                        Extend = cyan dot (matches brand/playhead).
                        Cut = no extra glyph — the default, unmarked. */}
                    {p.seam === "extend" && !isFirst && (
                      <div
                        className={css.seamDot}
                        style={{ background: playhead, boxShadow: `0 0 4px ${playhead}` }}
                        title="extend — latent tail carries across this seam"
                      />
                    )}
                    {/* Right resize handle — on the LAST card this is the
                        PULL-TO-EXTEND grip: wider + always visible (the
                        hover-only 12px handle was undiscoverable, and users
                        bounced off the duration wall). */}
                    <Tip
                      tip={
                        isLast
                          ? "PULL to extend the motion — the timeline + duration grow as you drag"
                          : "Drag to resize this card"
                      }
                    >
                    <div
                      data-prompt-edge="r"
                      className={cn(css.edgeR, isLast && css.edgeWide)}
                      onPointerDown={(e) =>
                        startDrag(e, {
                          kind: "prompt-r",
                          id: p.uuid,
                          startX: e.clientX,
                          startF: p.start_frame,
                          endF: p.end_frame,
                          moved: false,
                        })
                      }
                    >
                      <div
                        className={cn(css.gripPillR, isLast && css.gripPillBright)}
                      />
                    </div>
                    </Tip>

                    {/* Clip body */}
                    {isEditing ? (
                      <Input
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onBlur={() => commitEdit(p.uuid)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit(p.uuid)
                          if (e.key === "Escape") setEditingId(null)
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => e.stopPropagation()}
                        placeholder="Enter prompt…"
                        className={css.clipEditor}
                      />
                    ) : previewUrl ? (
                      // The window render INSIDE the clip (video timeline):
                      // first frame at rest, plays on hover, gradient scrim
                      // keeps the text legible over the frame.
                      <div className={css.previewWrap}>
                        <video
                          src={previewUrl}
                          muted
                          loop
                          playsInline
                          preload="metadata"
                          className={css.previewVideo}
                        />
                        <div className={css.scrim} />
                        <div className={css.clipTextCol}>
                          <span className={css.clipTitle} style={{ color }}>
                            {p.text || <span className={css.clipEmpty}>(empty)</span>}
                          </span>
                          {wPx > 72 && (
                            <span className={css.clipDur}>
                              {((p.end_frame - p.start_frame) / Math.max(1, fps)).toFixed(1)}s
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className={css.clipTextStack}>
                        <span className={css.clipTitle} style={{ color }}>
                          {p.text || <span className={css.clipEmpty}>(empty)</span>}
                        </span>
                        {wPx > 64 && (
                          <span className={css.clipDur}>
                            {((p.end_frame - p.start_frame) / Math.max(1, fps)).toFixed(1)}s
                          </span>
                        )}
                      </div>
                    )}

                    {/* Layer B knob-override dot (video timeline): cyan
                        when the call carries per-call knobs — the window
                        renders differently from the run's globals. */}
                    {p.override && !isEditing && (
                      <span
                        title="This call overrides run knobs (per-call)"
                        className={css.knobDot}
                      />
                    )}

                    {/* Layer B reference-audio dot (2026-08-31): violet —
                        this call carries an audio guide (calls[i].audio);
                        absent badge = no reference audio. The two dots
                        stack (override top, audio below it). */}
                    {p.audio && !isEditing && (
                      <Music
                        aria-hidden
                        className={css.refAudioBadge}
                      />
                    )}

                    {/* Layer B reference-image count badge: emerald —
                        this call carries reference images (guide +
                        per-call refs.images extras). Icon + count, stacked
                        below the audio badge when present, otherwise at
                        the same position as audio. */}
                    {(p.refImages ?? 0) > 0 && !isEditing && (
                      <span
                        data-testid="tl-ref-badge"
                        className={css.refBadge}
                        title={`${p.refImages} reference image${p.refImages === 1 ? "" : "s"} (guide + extras)`}
                      >
                        <Image aria-hidden />
                        <span className={css.refCount}>
                          {p.refImages}
                        </span>
                      </span>
                    )}

                    {/* Hover delete — TOP-RIGHT (2026-09-02, operator:
                        "move the X to the top right, instead of top
                        left"). History: right-1 top-1 originally sat
                        over the last card's pull-to-extend grip and a
                        high grab DELETED instead of extending (audit
                        F4a relocated it to top-center). Now it returns
                        to the corner and the conflict is split by
                        GEOMETRY: the X owns the top corner (z-40) and
                        the grip column starts at top-4, BELOW the X —
                        corner = delete, edge below = extend. */}
                    {!isEditing && (
                      <Tip tip="Delete this prompt card">
                        <Button variant="ghost" size="sm"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation()
                            onPromptDelete(p.uuid)
                          }}
                          aria-label="Delete this prompt card"
                          className={css.promptDelete}
                        >
                          <X />
                        </Button>
                      </Tip>
                    )}
                  </div>
                  </Tip>
                )
              })}
            </div>

            {/* Layer C — prompt beats (video timeline): segments WITHIN the
                calls, in their OWN row under the calls. No cuts, no drag —
                spans edit in the sidebar call card; a click selects.
                DOUBLE-CLICK = ADD a beat at that frame (the row is the
                entry point — same gesture as the keyframe lanes' pin). */}
            {beats && (
              <div
                data-beats-row
                className={cn(css.beatsLane, onBeatAdd && css.beatsAdd)}
                style={{ height: beatsHeight, background: "var(--dsw-alias-bg-layer-1)" }}
                onDoubleClick={(e) => {
                  if (!onBeatAdd) return
                  const f = xToFrame(e.clientX)
                  if (f != null) onBeatAdd(f)
                }}
              >
                {beats.length === 0 && (
                  <div className={css.beatsEmpty}>
                    <span className={css.hintLine}>{beatsHint}</span>
                  </div>
                )}
                {beats.map((b) => {
                  const color = rgb(b.color ?? [176, 180, 186])
                  const isSelected = selectedId === b.id
                  const bW = frameToPx(Math.max(1, b.end_frame - b.start_frame))
                  return (
                    <Tip
                      key={b.id}
                      tip={`${b.text || "(empty)"} — frames ${b.start_frame}–${b.end_frame} (${(
                        (b.end_frame - b.start_frame) / Math.max(1, fps)
                      ).toFixed(1)}s)\n\nClick: edit in the call card`}
                    >
                      <div
                        data-beat-clip={b.id}
                        onClick={() => onSelect?.(b.id)}
                        className={cn(css.beatClip, isSelected && css.beatSelected)}
                        style={{
                          left: frameToPx(b.start_frame),
                          width: `max(14px, ${bW}px)`,
                          background: `linear-gradient(135deg, ${color}2e, ${color}12)`,
                          borderLeft: `3px solid ${color}`,
                        }}
                      >
                        <span className={css.beatLabel}>
                          <span className={css.truncate}>
                            {b.text || <span className={css.beatEmpty}>(empty)</span>}
                          </span>
                        </span>
                      </div>
                    </Tip>
                  )
                })}
              </div>
            )}

            {/* ── AUDIO LAYERS — native tracks (2026-08-16: "integrate the
                audio into the timeline. It should be native to it, not some
                3rd party row"). Same scroll, same scale as the calls row:
                the slice segments sit at frameToPx positions, EXACTLY
                under the call they condition. Wired = the violet bed with
                one segment per call (the span of the bed its window is
                fed — in-point at the call's timeline position, same
                length in time); unwired = the dashed drop row (a tray
                drop goes through onAudioDrop — the tenant maps URL →
                artifact NAME; foreign URLs write nothing). */}
            {audioLayers?.map((L) => {
              const clips = L.clips ?? []
              return (
              <div
                key={L.id}
                data-audio-layer={L.id}
                data-wired={L.stem ? "true" : "false"}
                data-clips={clips.length ? "true" : "false"}
                className={css.audioLane}
                style={{ height: AUDIO_H, background: "color-mix(in srgb, var(--dsw-alias-state-business-primary) 3%, transparent)" }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  // (2026-09-02 NaN guard) `?? 0` catches null but NOT
                  // NaN — a coordinate-less drop produced NaN frames
                  // that serialized as start_frame: null.
                  const t = xToFrame(e.clientX)
                  const f = t != null && Number.isFinite(t) ? t : 0
                  // (Layer A NLE law) the upload door FIRST: an OS file
                  // drop lands as a positioned clip through the tenant's
                  // file reader. No handler → ignored (never a bad write).
                  const file = e.dataTransfer.files?.[0]
                  if (file) { onAudioFileDrop?.(L.id, file, f); return }
                  try {
                    const payload = JSON.parse(
                      e.dataTransfer.getData(ASSET_DRAG_MIME) || "null")
                    if (payload && typeof payload.url === "string") {
                      if (onAudioDropAt) onAudioDropAt(L.id, payload.url, f)
                      else onAudioDrop?.(L.id, payload.url)
                    }
                  } catch { /* not our payload — ignore, never a bad write */ }
                }}
              >
                {clips.length ? (
                  clips.map((c) => {
                    const a = (c.start_frame / Math.max(1, fps)).toFixed(1)
                    const b = ((c.start_frame + c.dur_frames) / Math.max(1, fps)).toFixed(1)
                    return (
                      <div
                        key={c.id}
                        data-audio-clip={c.id}
                        title={`${c.name} · ${a}–${b}s${c.gain != null ? ` · gain ${c.gain.toFixed(2)}` : ""} — drag to move`}
                        className={css.audioClip}
                        style={{
                          left: frameToPx(c.start_frame),
                          width: `max(6px, ${frameToPx(Math.max(1, c.dur_frames))}px)`,
                        }}
                        onPointerDown={(e) => {
                          if (!onAudioClipMove) return
                          startDrag(e, {
                            kind: "audio-clip",
                            layerId: L.id,
                            id: c.id,
                            startX: e.clientX,
                            startF: c.start_frame,
                            durF: c.dur_frames,
                            moved: false,
                          })
                        }}
                      >
                        {/* gain fill — the block's inner bar (unity = full) */}
                        {c.gain != null && (
                          <span
                            aria-hidden
                            className={css.gainFill}
                            style={{ height: `${Math.max(4, Math.min(100, c.gain * 50))}%` }}
                          />
                        )}
                        <span className={css.audioClipLabel}>
                          <span className={css.audioName}>{c.name}</span>
                          <span className={css.audioTime}>{a}s</span>
                        </span>
                        {onAudioClipDelete && (
                          <Button variant="ghost" size="sm"
                            data-audio-clip-delete={c.id}
                            aria-label={`Delete ${c.name}`}
                            onClick={(e) => { e.stopPropagation(); onAudioClipDelete(L.id, c.id) }}
                            className={css.audioClipDelete}
                          >
                            <X aria-hidden />
                          </Button>
                        )}
                      </div>
                    )
                  })
                ) : L.stem ? (
                  prompts.map((p, i) => {
                    const a = (p.start_frame / Math.max(1, fps)).toFixed(1)
                    const b = (p.end_frame / Math.max(1, fps)).toFixed(1)
                    return (
                      <div
                        key={p.uuid}
                        data-audio-slice={i}
                        title={`call #${i} · window hears bed ${a}–${b}s`}
                        className={css.audioSlice}
                        style={{
                          left: frameToPx(p.start_frame),
                          width: `max(4px, ${frameToPx(Math.max(1, p.end_frame - p.start_frame))}px)`,
                        }}
                      >
                        <span className={css.sliceLabel}>
                          {a}–{b}s
                        </span>
                      </div>
                    )
                  })
                ) : (
                  <div className={css.audioDrop}>
                    <span className={css.dropHint}>
                      drop or upload audio — clips land where you drop them, drag to move
                    </span>
                  </div>
                )}
              </div>
              )
            })}

            {/* Keyframe lanes — double-click to pin, drag to move, hover-X to
                delete, click (no drag) to seek. Every diamond is a REAL pose
                constraint (see onKeyframeAdd in MotionCardEditor). */}
            {tracks.map((track, ti) => {
              const kfs = keyframes.filter((k) => k.track_id === track.uuid)
              const color = rgb(track.color ?? [176, 180, 186])
              return (
                <div
                  key={track.uuid}
                  data-lane={track.uuid}
                  className={css.kfLane}
                  style={{ height: LANE_H }}
                  onDoubleClick={(e) => {
                    const f = xToFrame(e.clientX)
                    if (f != null) onKeyframeAdd(track.uuid, f)
                  }}
                >
                  {keyframes.length === 0 && ti === 0 && (
                    <span className={css.laneHint}>
                      {laneHint}
                    </span>
                  )}
                  {kfs.map((kf) => {
                    const isMoving = dragId === kf.uuid
                    return (
                      <div
                        key={kf.uuid}
                        className={css.kfWrap}
                        style={{ left: frameToPx(kf.frame) }}
                      >
                        <Tip
                          tip={`${track.name} constraint @ frame ${kf.frame} — drag to move, click to jump, hover ✕ to delete`}
                        >
                        <Button variant="ghost" size="sm"
                          data-kf={kf.uuid}
                          aria-label={`${track.name} keyframe at frame ${kf.frame}`}
                          onPointerDown={(e) =>
                            startDrag(e, {
                              kind: "kf",
                              id: kf.uuid,
                              startX: e.clientX,
                              frame: kf.frame,
                              moved: false,
                            })
                          }
                          onDoubleClick={(e) => e.stopPropagation()}
                          className={css.kfBtn}
                        >
                          <span
                            className={cn(css.kfDiamond, isMoving && css.kfMoving)}
                            style={{ background: color, borderColor: color }}
                          />
                        </Button>
                        </Tip>
                        <Tip tip={`Delete ${track.name} keyframe at frame ${kf.frame}`}>
                        <Button variant="ghost" size="sm"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation()
                            onKeyframeDelete(kf.uuid)
                          }}
                          aria-label={`Delete ${track.name} keyframe at frame ${kf.frame}`}
                          className={css.kfDelete}
                        >
                          <X />
                        </Button>
                        </Tip>
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {/* Playhead — brand cyan, spans every row, above the clips. */}
            <div
              data-testid="motion-timeline-playhead"
              className={css.playhead}
              style={{
                left: frameToPx(frameIdx),
                width: 2,
                background: playhead,
                boxShadow: `0 0 6px color-mix(in srgb, ${playhead} 40%, transparent)`,
                transform: "translateX(-50%)",
              }}
            >
              <span
                className={css.playheadCap}
                style={{ background: playhead }}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

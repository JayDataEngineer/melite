/**
 * MotionTimelineBarChrome — the bar's pinned + ruler + playhead chrome
 * (split from MotionTimelineBar.tsx, pure move): the label gutter
 * (zoom cluster + lane heads), the scrollable content shell with the
 * click-away deselect, the ruler, the playhead. Lane bodies live in
 * MotionTimelineBarLanes.
 */
import { Film, ListMusic, Mic, Music, Upload, X, Zap, ZoomIn, ZoomOut } from "./icons"
import { clsx as cn } from "clsx"
import { Button } from "@deepseek-ai/dsh-client-ui-primitives"
import { AUDIO_CARDS_H, AUDIO_H, GUTTER_W, LANE_H, RULER_H, ZOOM_STEP, fmtTimecode, rgb } from "./MotionTimelineBarLayout"
import { Tip } from "./tip"
import css from "./timeline.module.css"
import type * as React from "react"
import type { TimelineTrack } from "./viser-timeline/types"
import type { AudioLayer, TimelineBeat } from "./MotionTimelineBar"

export interface TimelineGutterScale {
  zoom: (factor: number) => void
  anchorRef: React.MutableRefObject<{ frame: number; off: number } | null>
  frameToPx: (f: number) => number
  setPpf: (v: number) => void
  setBasePpf: (v: number) => void
  fitPpf: number
  effPpf: number
  basePpf: number | null
}

export interface TimelineGutterProps {
  scale: TimelineGutterScale
  scrollRef: React.MutableRefObject<HTMLDivElement | null>
  frameIdx: number
  promptsHeight: number
  promptsLabel: string
  beats?: TimelineBeat[]
  beatsLabel: string
  beatsHeight: number
  audioLayers?: AudioLayer[]
  onAudioDetach?: (layerId: string) => void
  /** (2026-09-22, the D-M-E card law) cards-mode heads match the lanes. */
  audioClipCards?: boolean
  tracks: TimelineTrack[]
}

/** The pinned label gutter (bar line 820): the zoom cluster + lane
 *  heads. The Fit pin reads the live scale — the body is the bar's. */
export function TimelineGutter(props: TimelineGutterProps) {
  const {
    scale, scrollRef, frameIdx, promptsHeight, promptsLabel,
    beats, beatsLabel, beatsHeight, audioLayers, onAudioDetach, tracks, audioClipCards,
  } = props
  const {
    zoom, anchorRef, frameToPx, setPpf, setBasePpf, fitPpf, effPpf, basePpf,
  } = scale
  return (
    <>
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
        {audioLayers?.map((L) => {
          // (2026-09-22, the D-M-E card law) the lane's OWN glyph +
          // accent — dialogue a mic, sfx a bolt, music the note; the
          // accent tints the glyph so the gutter reads like the clips.
          const Glyph = L.icon === "mic" ? Mic : L.icon === "zap" ? Zap : Music
          return (
          <div
            key={L.id}
            className={css.audioHead}
            data-audio-icon={L.icon ?? "music"}
            style={{
              height: audioClipCards ? AUDIO_CARDS_H : AUDIO_H,
              ...(L.accent ? { color: L.accent } : {}),
            }}
            title={L.stem
              ? `${L.stem} — one bed under every cut; each window hears its own slice in time`
              : "drop an audio / music track — sliced to each window in time"}
          >
            <Glyph aria-hidden />
            <span className={css.gutterLabelDim}>{L.label}</span>
            {/* (2026-09-22, the lane-picker law) the add door beside the
                title — the host opens its source picker (From flow /
                From media / From file) anchored at THIS button. */}
            {L.onUpload && (
              <Button variant="ghost" size="sm"
                data-audio-upload={L.id}
                aria-label={`Add ${L.label} clip`}
                title={`Add a ${L.label} clip — from flow, from media, or from file`}
                className={css.uploadBtn}
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => { L.onUpload?.(e.currentTarget) }}
              >
                <Upload aria-hidden />
              </Button>
            )}
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
          )
        })}
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
    </>
  )
}

export interface TimelineContentProps {
  scrollRef: React.MutableRefObject<HTMLDivElement | null>
  contentW: number
  suppressClickRef: React.MutableRefObject<boolean>
  onSelect?: (id: string | null) => void
  children: React.ReactNode
}

/** The scrollable shell + click-away deselect (bar line 921). */
export function TimelineContent(props: TimelineContentProps) {
  const { scrollRef, contentW, suppressClickRef, onSelect, children } = props
  return (
    <>
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
          {children}
        </div>
      </div>
    </div>
    </>
  )
}

export interface TimelineRulerProps {
  ticks: number[]
  stepSec: number
  fps: number
  frameIdx: number
  barBg: string
  frameToPx: (f: number) => number
  frameAt: (clientX: number) => number | null
  seek: (e: React.PointerEvent) => void
  onPromptAdd?: (frame: number) => void
}

/** The ruler: scrub surface, ticks, sticky timecode (bar line 947). */
export function TimelineRuler(props: TimelineRulerProps) {
  const {
    ticks, stepSec, fps, frameIdx, barBg,
    frameToPx, frameAt, seek, onPromptAdd,
  } = props
  return (
    <>
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
    </>
  )
}

export interface TimelinePlayheadProps {
  frameIdx: number
  frameToPx: (f: number) => number
  playhead: string
}

/** The playhead, spanning every row (bar line 1517). */
export function TimelinePlayhead(props: TimelinePlayheadProps) {
  const { frameIdx, frameToPx, playhead } = props
  return (
    <>
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
    </>
  )
}

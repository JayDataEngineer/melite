/**
 * MotionTimelineBarChrome — the bar's pinned + ruler + playhead chrome
 * (split from MotionTimelineBar.tsx, pure move): the label gutter
 * (zoom cluster + lane heads), the scrollable content shell with the
 * click-away deselect, the ruler, the playhead. Lane bodies live in
 * MotionTimelineBarLanes.
 */
import { Film, ListMusic, Mic, Music, Upload, Zap, ZoomIn, ZoomOut } from './icons.tsx'
import { clsx as cn } from "clsx"
import { Button, IconCloseOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { AUDIO_CARDS_H, AUDIO_H, GUTTER_W, LANE_H, RULER_H, ZOOM_STEP, rgb } from "./MotionTimelineBarLayout.ts"
import { Tip } from "@melite/card-base/client"
import css from "./timeline.module.css"
import type * as React from "react"
import type { TimelineTrack } from "./viser-timeline/types.ts"
import type { AudioLayer, TimelineBeat } from "./MotionTimelineBar.tsx"
import { timelineCopy } from "../timelineCopy.ts"
import { LaneHead } from "./LaneHead.tsx"
import { COMMISSION_H, type CommissionRow } from "./CommissionsRail.tsx"

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
  /** (2026-11-06, the lane-add parity law) the track rows' add door:
   *  when the host wires it, every track row carries the SAME upload
   *  verb the audio heads do (anchored at THIS button — the host
   *  opens its source picker); unwired renders no button. The
   *  keyframes lane is a first-class lane: its head owns the door
   *  exactly like Dialogue/Music/SFX. */
  onTrackAdd?: (trackUuid: string, anchor: HTMLButtonElement) => void
  /** (2026-09-22, the D-M-E card law) cards-mode heads match the lanes. */
  audioClipCards?: boolean
  /** (SD-8 lane parity, 2026-11-08) the kf heads ride the audio
   *  heads' card height (44) when the tenant opts in — the
   *  audioClipCards precedent; absent → the 24px block, byte-identical. */
  kfLaneCards?: boolean
  /** (§9's mod projection) the commission heads — one per armed mod
   *  bag, mirroring the body rows the bar renders under the prompts
   *  lane. Opt-in; absent/empty → no head, byte-identical. */
  commissions?: CommissionRow[]
  tracks: TimelineTrack[]
}

/** The pinned label gutter (bar line 820): the zoom cluster + lane
 *  heads. The Fit pin reads the live scale — the body is the bar's. */
export function TimelineGutter(props: TimelineGutterProps) {
  const {
    scale, scrollRef, frameIdx, promptsHeight, promptsLabel,
    beats, beatsLabel, beatsHeight, audioLayers, onAudioDetach, tracks, audioClipCards,
    onTrackAdd, kfLaneCards, commissions,
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
            aria-label={timelineCopy.zoomOutAria}
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
            aria-label={timelineCopy.zoomInAria}
            className={css.zoomBtn}
          >
            <ZoomIn />
          </Button>
          </Tip>
        </div>
        <LaneHead
          variant="prompts"
          glyph={<Film aria-hidden />}
          label={promptsLabel}
          height={promptsHeight}
        />
        {commissions?.map((row) => (
          <LaneHead
            key={row.id}
            variant="commission"
            rowId={row.id}
            glyph={<Film aria-hidden />}
            label={row.label}
            accent={row.accent}
            height={COMMISSION_H}
            title={row.title}
          />
        ))}
        {beats && (
          <LaneHead
            variant="beats"
            glyph={<ListMusic aria-hidden />}
            label={beatsLabel}
            height={beatsHeight}
          />
        )}
        {audioLayers?.map((L) => {
          // (2026-09-22, the D-M-E card law) the lane's OWN glyph +
          // accent — dialogue a mic, sfx a bolt, music the note; the
          // accent tints the glyph so the gutter reads like the clips.
          const Glyph = L.icon === "mic" ? Mic : L.icon === "zap" ? Zap : Music
          return (
          <LaneHead
            key={L.id}
            variant="audio"
            iconAttr={L.icon ?? "music"}
            glyph={<Glyph aria-hidden />}
            label={L.label}
            accent={L.accent}
            height={audioClipCards ? AUDIO_CARDS_H : AUDIO_H}
            title={L.stem
              ? timelineCopy.audioBedTitle({ stem: L.stem })
              : timelineCopy.audioDropTitle}
            door={L.onUpload && (
              <Button variant="ghost" size="sm"
                data-audio-upload={L.id}
                aria-label={timelineCopy.addClipAria({ label: L.label })}
                title={timelineCopy.addClipTitle({ label: L.label })}
                className={css.uploadBtn}
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => { L.onUpload?.(e.currentTarget) }}
              >
                <Upload aria-hidden />
              </Button>
            )}
            detach={(L.stem || (L.clips?.length ?? 0) > 0) && onAudioDetach && (
              <Button variant="ghost" size="sm"
                onClick={() => onAudioDetach(L.id)}
                aria-label={timelineCopy.detachAria({ label: L.label })}
                className={css.detachBtn}
              >
                <IconCloseOutlineRegular />
              </Button>
            )}
          />
          )
        })}
        {tracks.map((t) => (
          <LaneHead
            key={t.uuid}
            variant="kf"
            dotColor={rgb(t.color ?? [176, 180, 186])}
            label={t.name}
            height={kfLaneCards ? AUDIO_CARDS_H : LANE_H}
            title={timelineCopy.kfLaneTitle({ track: t.name })}
            door={onTrackAdd && (
              <Button variant="ghost" size="sm"
                data-track-upload={t.uuid}
                aria-label={timelineCopy.addTrackAria({ track: t.name })}
                title={timelineCopy.addTrackTitle({ track: t.name })}
                className={css.uploadBtn}
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => { onTrackAdd?.(t.uuid, e.currentTarget) }}
              >
                <Upload aria-hidden />
              </Button>
            )}
          />
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
  barBg: string
  frameToPx: (f: number) => number
  frameAt: (clientX: number) => number | null
  onPromptAdd?: (frame: number) => void
}

/** The ruler: ticks only. NOT a scrub surface and NOT a seek surface
 *  (operator, told 10+ times, 2026-10-29: the playhead moves ONLY by
 *  dragging the CAP — the white circle at the top of the line — never
 *  a click anywhere on the timeline): the P6 single-click seek and
 *  its click-voice chip are DEAD, and the sticky timecode chip is
 *  DEAD with them (it read the bar's fps axis, which can mismatch
 *  the film's own rate — a readout that can lie is removed, not
 *  patched). The ruler's one gesture is the double-click ADD. */
export function TimelineRuler(props: TimelineRulerProps) {
  const {
    ticks, stepSec, fps, barBg,
    frameToPx, frameAt, onPromptAdd,
  } = props
  return (
    <>
      {/* Ruler — double-click ADDS a clip at that frame (the additive
          gesture's always-computable home — the calls row's clips own
          their own double-click for editing). Single-click does
          NOTHING (the playhead moves only by the cap, operator told
          10+ times). fill (E2-10 THE SHRINK): the Tip anchor is
          block-level and DEFINITE — the width-auto band fills it. */}
      <Tip
        fill
        tip={
          onPromptAdd
            ? "Drag the playhead cap to scrub — double-click here to add a call at that frame"
            : "Drag the playhead cap to scrub"
        }
      >
        <div
          data-testid="motion-timeline-ruler"
          className={css.ruler}
          style={{ height: RULER_H }}
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
              {timelineCopy.tickSeconds({ value: stepSec < 1 ? s.toFixed(1) : String(s) })}
            </span>
          </div>
        ))}
        </div>
      </Tip>
    </>
  )
}

export interface TimelinePlayheadProps {
  frameIdx: number
  frameToPx: (f: number) => number
  playhead: string
  onGrab: (e: React.PointerEvent) => void
}

/** The playhead, spanning every row (bar line 1517). The cap at its
 *  top is THE scrub handle (operator 2026-11: the gesture lives on
 *  the white circle, never the bar's middle) — the line itself
 *  SWALLOWS its pixels (E2-10: pointer-dead is pass-through, and the
 *  pass-through woke every seat beneath — the ruler's seek over the
 *  ruler band, clip drags over clips, click-away deselect over empty
 *  track. The line intercepts and eats the gesture: no session, no
 *  seek, no select. The cap is carved out — a press bubbling from the
 *  cap still opens the scrub). */
export function TimelinePlayhead(props: TimelinePlayheadProps) {
  const { frameIdx, frameToPx, playhead, onGrab } = props
  // THE SWALLOW GUARD: a press bubbling up from the cap is the scrub's
  // own — every other target on this 2px column is silence.
  const fromCap = (e: React.SyntheticEvent): boolean =>
    (e.target as HTMLElement | null)?.closest?.('[data-testid="motion-timeline-playhead-cap"]') != null
  // Inert + capturing: the press's pointer is captured to the line so
  // a press-drag-release starting here can never land its click on the
  // content's click-away seat (or the ruler's) — the gesture dies here.
  const swallow = (e: React.PointerEvent): void => {
    if (fromCap(e)) return
    e.stopPropagation()
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch (captureErr) {
      // No capture face (jsdom/happy-dom): the stopPropagation above
      // already holds the silence — capture is the drag-tail's lock.
      void captureErr
    }
  }
  const swallowClick = (e: React.SyntheticEvent): void => {
    if (fromCap(e)) return
    e.stopPropagation()
    e.preventDefault()
  }
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
        onPointerDown={swallow}
        onPointerUp={swallowClick}
        onPointerCancel={swallowClick}
        onClick={swallowClick}
        onDoubleClick={swallowClick}
      >
        <span
          data-testid="motion-timeline-playhead-cap"
          className={css.playheadCap}
          style={{ background: playhead }}
          onPointerDown={onGrab}
        />
      </div>
    </>
  )
}

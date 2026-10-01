/**
 * MotionTimelineBarLanes — the bar's lane bodies (split from
 * MotionTimelineBar.tsx, pure move): prompt clips, beats, audio
 * tracks, keyframe lanes. Chrome (gutter/ruler/playhead) lives in
 * MotionTimelineBarChrome.
 */
import { Image, Mic, Music, X, Zap } from "./icons"
import { clsx as cn } from "clsx"
import { ASSET_DRAG_MIME, Tip } from '@melite/card-base/client'
import { PROMPT_COLORS } from "./viser-timeline/styles"
import { AUDIO_CARDS_H, AUDIO_H, LANE_H, rgb } from "./MotionTimelineBarLayout"
import { Button, Input } from "@deepseek-ai/dsh-client-ui-primitives"
import css from "./timeline.module.css"
import { useState } from "react"
import type * as React from "react"
import type { TimelineKeyframe, TimelinePrompt, TimelineTrack } from "./viser-timeline/types"
import type { AudioLayer, TimelineBeat } from "./MotionTimelineBar"
import type { Drag } from "./MotionTimelineBarDrag"

export interface TimelinePromptsLaneProps {
  prompts: TimelinePrompt[]
  fps: number
  promptsHeight: number
  emptyPromptsHint: string
  onPromptAdd?: (frame: number) => void
  dragId: string | null
  lastPromptRef: React.RefObject<string | null>
  firstPromptRef: React.RefObject<string | null>
  selectedId: string | null
  previews?: Record<string, string>
  frameToPx: (f: number) => number
  frameAt: (clientX: number) => number | null
  startDrag: (e: React.PointerEvent, d: Drag) => void
  playhead: string
  onPromptUpdate: (id: string, text: string) => void
  onPromptDelete: (id: string) => void
}

/** Draggable/resizable prompt clips (bar line 994). */
export function TimelinePromptsLane(props: TimelinePromptsLaneProps) {
  const {
    prompts, fps, promptsHeight, emptyPromptsHint, onPromptAdd, dragId,
    lastPromptRef, firstPromptRef, selectedId, previews,
    frameToPx, frameAt, startDrag, playhead,
    onPromptUpdate, onPromptDelete,
  } = props
  // Inline prompt editor: the clip being edited + its local text.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const commitEdit = (id: string) => {
    setEditingId(null)
    const text = editText.trim()
    const p = prompts.find((x) => x.uuid === id)
    if (p && text !== p.text) onPromptUpdate(id, text)
  }
  return (
    <>
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
    </>
  )
}

export interface TimelineBeatsLaneProps {
  beats: TimelineBeat[] | undefined
  beatsHeight: number
  beatsHint: string
  fps: number
  selectedId: string | null
  onSelect?: (id: string | null) => void
  onBeatAdd?: (frame: number) => void
  xToFrame: (clientX: number) => number | null
  frameToPx: (f: number) => number
}

/** Layer C prompt beats within the calls (bar line 1261). */
export function TimelineBeatsLane(props: TimelineBeatsLaneProps) {
  const {
    beats, beatsHeight, beatsHint, fps, selectedId,
    onSelect, onBeatAdd, xToFrame, frameToPx,
  } = props
  if (beats == null) return null
  return (
    <>
      {/* Layer C — prompt beats (video timeline): segments WITHIN the
          calls, in their OWN row under the calls. No cuts, no drag —
          spans edit in the sidebar call card; a click selects.
          DOUBLE-CLICK = ADD a beat at that frame (the row is the
          entry point — same gesture as the keyframe lanes' pin). */}
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
    </>
  )
}

export interface TimelineAudioLanesProps {
  audioLayers?: AudioLayer[]
  prompts: TimelinePrompt[]
  fps: number
  /** (2026-09-22, the D-M-E card law) clips as SMALL CALL CARDS —
   * gradient + accent edge + glyph, 44px lanes. Absent → blocks. */
  audioClipCards?: boolean
  frameToPx: (f: number) => number
  xToFrame: (clientX: number) => number | null
  startDrag: (e: React.PointerEvent, d: Drag) => void
  onAudioDrop?: (layerId: string, url: string) => void
  onAudioDropAt?: (layerId: string, url: string, frame: number) => void
  onAudioFileDrop?: (layerId: string, file: File, frame: number) => void
  onAudioClipMove?: (layerId: string, clipId: string, frame: number) => void
  onAudioClipDelete?: (layerId: string, clipId: string) => void
}

/** Native audio tracks, same scroll + scale (bar line 1316). */
export function TimelineAudioLanes(props: TimelineAudioLanesProps) {
  const {
    audioLayers, prompts, fps, frameToPx, xToFrame, startDrag, audioClipCards,
    onAudioDrop, onAudioDropAt, onAudioFileDrop, onAudioClipMove, onAudioClipDelete,
  } = props
  return (
    <>
      {audioLayers?.map((L) => {
        const clips = L.clips ?? []
        // (2026-09-22, the D-M-E card law) the lane's glyph + accent
        // ride its clips: dialogue a mic, sfx a bolt, music the note.
        const Glyph = L.icon === "mic" ? Mic : L.icon === "zap" ? Zap : Music
        const accent = L.accent
        return (
        <div
          key={L.id}
          data-audio-layer={L.id}
          data-wired={L.stem ? "true" : "false"}
          data-clips={clips.length ? "true" : "false"}
          data-lane-cards={audioClipCards ? "true" : "false"}
          className={css.audioLane}
          style={{ height: audioClipCards ? AUDIO_CARDS_H : AUDIO_H, background: "color-mix(in srgb, var(--dsw-alias-state-business-primary) 3%, transparent)" }}
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
                  data-card={audioClipCards ? "true" : undefined}
                  title={`${c.name} · ${a}–${b}s${c.gain != null ? ` · gain ${c.gain.toFixed(2)}` : ""} — drag to move`}
                  className={cn(css.audioClip, audioClipCards && css.audioCard)}
                  style={{
                    left: frameToPx(c.start_frame),
                    width: `max(6px, ${frameToPx(Math.max(1, c.dur_frames))}px)`,
                    ...(audioClipCards && accent ? {
                      background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 32%, transparent), color-mix(in srgb, ${accent} 10%, transparent))`,
                      borderColor: `color-mix(in srgb, ${accent} 45%, transparent)`,
                      borderLeftColor: accent,
                      borderLeftWidth: 3,
                    } : {}),
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
                  {/* (cards) the lane's glyph — a small card reads by
                      its class, not just its seat */}
                  {audioClipCards && (
                    <span
                      aria-hidden
                      className={css.audioCardIcon}
                      style={accent ? { color: accent } : undefined}
                    >
                      <Glyph />
                    </span>
                  )}
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
    </>
  )
}

export interface TimelineKeyframeLanesProps {
  tracks: TimelineTrack[]
  keyframes: TimelineKeyframe[]
  laneHint: string
  dragId: string | null
  frameToPx: (f: number) => number
  xToFrame: (clientX: number) => number | null
  startDrag: (e: React.PointerEvent, d: Drag) => void
  onKeyframeAdd: (trackId: string, frame: number) => string
  onKeyframeDelete: (id: string) => void
}

/** Keyframe lanes: pin, drag, hover-X delete (bar line 1443). */
export function TimelineKeyframeLanes(props: TimelineKeyframeLanesProps) {
  const {
    tracks, keyframes, laneHint, dragId,
    frameToPx, xToFrame, startDrag, onKeyframeAdd, onKeyframeDelete,
  } = props
  return (
    <>
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
    </>
  )
}

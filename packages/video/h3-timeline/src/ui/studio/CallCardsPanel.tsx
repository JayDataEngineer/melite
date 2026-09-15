/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import { Button, Input } from "@deepseek-ai/dsh-client-ui-primitives"
import { NumberControl, Tip } from "./kit"
import { cn } from "@melite/card-base/chrome"
import { ChevronLeft } from "@melite/card-base/icons"
import s from "./studio.module.css"
import { VIDEO_TIMELINE_TRACKS } from "./docModel"
import { CallCard } from "./CallCard"
import type { DocBeatSegment, DocCall, DocKeyframe, LayerA } from "./docModel"
import type { LinkArtifact } from "./refUtils"
import type { TimelineSelection } from "./useViewSelection"

/** Handlers + bags the call-card tree needs (all owned by the tenant). */
export interface CallCardDeps {
  selected: TimelineSelection | null
  fps: number
  /** The run's Layer A — feeds the knob fold's inherited ghosts
   *  (the 2026-09-15 "inherit" wall: an unset knob shows the value
   *  it inherits from the run, never the bare word "inherit"). */
  layerA?: LayerA
  callCardRefs: { current: (HTMLDivElement | null)[] }
  beatRowRefs: { current: (HTMLDivElement | null)[][] }
  artifactIndex: { byName: Map<string, string>; byUrl: Map<string, string> }
  linkGroups: LinkArtifact[]
  isRef2va: boolean
  refArtifacts: Array<{ name: string; url: string }>
  handlePromptDelete: (id: string) => void
  handlePromptUpdate: (id: string, text: string) => void
  setBeatSegment: (i: number, j: number, patch: Partial<DocBeatSegment>) => void
  addBeatSegment: (i: number) => void
  deleteBeatSegment: (i: number, j: number) => void
  enhanceOne: (key: string, text: string, apply: (t: string) => void) => void
  undoEnhance: (key: string, apply: (t: string) => void) => void
  enhancing: Record<string, boolean>
  enhanceErr: Record<string, string | null>
  enhanceUndo: Record<string, string>
  setCallSpan: (i: number, which: "start" | "end", frame: number) => void
  setCallGuide: (i: number, kind: "image" | "clip" | "audio" | "last_frame", source: string) => void
  setCallPrevSec: (i: number, sec: number | null) => void
  setCallTransition: (i: number, t: "extend" | "cut") => void
  setCallRefs: (i: number, key: "images" | "videos" | "audios" | "video_audios", value: string) => void
  setCallKnob: (i: number, key: string, value: number | string | boolean | undefined) => void
}

/** Layer B rail: compact call rows ⇄ focused call editor + legacy
 *  keyframes (monolith lines 3320–3416 + 3847–3924; per-call bodies
 *  render through CallCard). */
export function CallCardsPanel({
  calls, selected, setSelected, fps, sourceOptions, keyframes,
  handleKeyframeMove, handleKeyframeDelete, setKeyframeSource,
  deps,
}: {
  calls: DocCall[]
  selected: TimelineSelection | null
  setSelected: (s: TimelineSelection | null) => void
  fps: number
  sourceOptions: Array<{ title: string; name: string }>
  keyframes: DocKeyframe[]
  handleKeyframeMove: (id: string, frame: number) => void
  handleKeyframeDelete: (id: string) => void
  setKeyframeSource: (i: number, source: string) => void
  deps: CallCardDeps
}) {
  return (
    <>
  {/* ── LAYER B — THE CALL CARDS — IN THE RAIL (2026-08-16, the
      user's directive: "the LEFT SIDEBAR populates the inputs and
      options" — clicking a CALL or BEAT clip in the bar selects
      it; the rail scrolls the card / segment row into view with
      its ring). One structured card per MODEL CALL — prompt (text
      XOR beat segments), editable span, the three guides, and the
      per-call knob fold. The compiler cuts windows at CALL
      boundaries — a new call = a new model invocation at that
      cut; beats (Layer C) are prompt segments WITHIN a call that
      join into its single prompt and never cut. */}
  <div className={s.panel} data-testid="tl-call-panel">
    {selected == null ? (
      <div className={s.rowsHead}>
        <span className={s.rowsTitle}>
          Model calls
        </span>
        <span className={s.rowsHint}>
          click a row — or its clip in the bar — to edit that call here · a call's prompt is text, or beat segments within it · guides + knobs ride
          the call · the compiler cuts windows at call boundaries
        </span>
      </div>
    ) : (
      <div className={s.focusHead}>
        <Tip tip="Back to the run's global parameters — or click any empty spot in the timeline">
          <Button variant="ghost"
            onClick={() => setSelected(null)}
            aria-label="Back to global parameters"
            data-testid="tl-back-to-global"
            className={s.backBtn}
          >
            <ChevronLeft className={s.sz12} aria-hidden /> Global
          </Button>
        </Tip>
        <span className={s.focusTitle}>
          #{selected.callIdx} · Model call {selected.callIdx + 1}
        </span>
        {selected.beatIdx != null && (
          <span className={s.beatFlag}>
            beat {selected.beatIdx + 1} selected
          </span>
        )}
      </div>
    )}
    <datalist id="tl-kf-sources">
      {sourceOptions.map((o) => (
        <option key={`${o.title}:${o.name}`} value={o.name}>
          {o.title} · {o.name}
        </option>
      ))}
    </datalist>
    {selected == null && (
      <div className={s.compactList}>
        {calls.map((c, i) => {
          const segCount = c.beats?.length ?? 0
          const activeKnobs = c.knobs ? Object.keys(c.knobs).length : 0
          const excerpt = segCount
            ? c.beats!.map((s) => s.text || "(empty)").join(" · ")
            : c.text ?? ""
          return (
            <Button variant="ghost"
              key={i}
              type="button"
              data-call-row={i}
              onClick={() => setSelected({ callIdx: i })}
              className={s.callRow}
            >
              <span className={s.callIdx}>
                #{i}
              </span>
              <span
                className={cn(s.excerpt, excerpt.trim() ? s.excerptFull : s.excerptEmpty)}
              >
                {excerpt.trim() || "(empty — needs a prompt)"}
              </span>
              {segCount > 0 && (
                <span className={s.beatCount}>
                  {segCount} beat{segCount === 1 ? "" : "s"}
                </span>
              )}
              {activeKnobs > 0 && (
                <span className={s.knobBadge}>
                  {activeKnobs}
                </span>
              )}
              <span className={s.callDur}>
                {((c.end_frame - c.start_frame) / fps).toFixed(1)}s
              </span>
            </Button>
          )
        })}
      </div>
    )}
    {selected != null && (
    <div className={s.focusList}>
            {calls.map((c, i) => (
              <CallCard key={i} c={c} i={i} deps={deps} />
            ))}
    </div>
    )}

    {/* ── Legacy frame-exact keyframes — the escape hatch, only when
        the document carries them (agent-authored or hand-JSON). The
        calls are the guide surface now; these render + edit + delete
        but the call panel is where guides are authored. Global mode
        only — the focused rail is one call's editor. */}
    {selected == null && keyframes.length > 0 && (
      <div className={s.kfPanel} data-testid="tl-keyframe-panel">
        <div className={s.kfHead}>
          <span className={s.kfTitle}>
            Frame-exact keyframes
          </span>
          <span className={s.kfHint}>
            legacy vocabulary — prefer a beat's guides; a hand image at a cut is that window's first frame
          </span>
        </div>
        <div className={s.compactList}>
          {keyframes.map((k, i) => {
            const track = VIDEO_TIMELINE_TRACKS.find((t) => t.uuid === k.kind)!
            const color = `rgb(${track.color?.[0] ?? 176}, ${track.color?.[1] ?? 180}, ${track.color?.[2] ?? 186})`
            return (
              <div
                key={i}
                data-kf-row={i}
                data-wired={k.source.trim() ? "true" : "false"}
                className={s.kfRow}
              >
                <span
                  className={s.kfKind}
                  style={{ color, background: `${color}1f`, border: `1px solid ${color}55` }}
                >
                  {k.kind}
                </span>
                <NumberControl
                  value={k.frame}
                  ariaLabel={`Keyframe ${i} frame`}
                  onChange={(v) => {
                    if (v !== undefined) handleKeyframeMove(`kf-${i}`, Math.round(v))
                  }}
                  align="center"
                  width="w-16"
                  placeholder=""
                />
                <Input
                  list="tl-kf-sources"
                  value={k.source}
                  placeholder={sourceOptions.length ? "artifact name or filename…" : "uploaded filename…"}
                  aria-label={`Keyframe ${i} source`}
                  data-testid="tl-kf-source"
                  onChange={(e) => setKeyframeSource(i, e.target.value)}
                  className={cn(s.kfIn, !k.source.trim() && s.textInEmpty)}
                />
                <span className={s.kfTime}>
                  {(k.frame / fps).toFixed(2)}s
                </span>
                <Tip tip={`Delete this ${k.kind} keyframe`}>
                  <Button variant="ghost"
                    onClick={() => handleKeyframeDelete(`kf-${i}`)}
                    aria-label={`Delete keyframe ${i}`}
                    className={s.kfDel}
                  >
                    ×
                  </Button>
                </Tip>
              </div>
            )
          })}
        </div>
      </div>
    )}
  </div>
    </>
  )
}

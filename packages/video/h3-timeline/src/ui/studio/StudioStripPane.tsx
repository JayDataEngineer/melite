/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx.
 *
 * DEFECT B (operator 2026-11-06): the keyframes lane's upload icon is
 * DEAD — the add door rides the rail's keyframes subview, an upload
 * icon beside its title (the audio-input grammar). The strip keeps the
 * lane itself (double-click pins, drag moves) and gains the SUBVIEW
 * DOOR in its header: one button, the rail swaps to the editor.
 */
import { useRef, useState } from "react"
import { Button, Input, Menu } from "@deepseek-ai/dsh-client-ui-primitives"
import { MotionTimelineBar } from "@melite-plugin/timeline/ui/timeline"
import type { TimelineKeyframe, TimelinePrompt } from "@melite-plugin/timeline/ui/timeline"
import { useSquareProvider, readAsDataURL, fetchMediaLibrary, PaneHeader, PaneShell } from '@melite/card-base/client'
import type { SpecField } from '@melite/card-base/client'
import { refUploadError, REF_READ_ERROR, FOREIGN_URL_REFUSAL, estateMediaChip, commitKeyframePinImage, fitImageToAspect, loadImageMedia, IMAGE_ROW_RE } from './refUtils.ts'
import s from "./studio.module.css"
import { VIDEO_TIMELINE_TRACKS } from "./docModel.ts"
import type { DocCall, DocKeyframe, LayerA, SetLayerAKey } from "./docModel.ts"
import type { DocCommission } from "./commissions.ts"
import { callsLaneFace, isStarterCallText, windowSpans } from "./commissions.ts"
import type { CommissionRow } from "@melite-plugin/timeline/ui/timeline"
import { isCarriedShape, pinDropVerdict, snapSplitFrame } from "./docGrid.ts"
import { studioCopy } from "./studioCopy.ts"

/** Pinned strip: the bar IS the document (monolith lines 4078–4162).
 *
 *  The chrome rides the shared kit (2026-09-07): PaneShell + the
 *  strip PaneHeader — the same box/header the motion bar carries
 *  (the aspirational TimelineFooter twin is deleted; this pane is
 *  the one strip). */
// audio-kind rows only — both picker sources (the run's artifacts
// and the media library) narrow to what a clip lane can hold.
const AUDIO_ROW_RE = /\.(mp3|wav|flac|ogg|m4a|aac|aif|aiff|opus|webm)(\?|$)/i
type LaneCls = "dialogue" | "sfx" | "music"
const LANE_OF: Record<string, LaneCls> = { "audio:dialogue": "dialogue", "audio:sfx": "sfx", "audio:music": "music" }
/** (D-19) the derived whole-film window's reserved row uuid — a
 *  stable id the door guards and the wall pin; it can never collide
 *  with a call's uuid (callsToPrompts mints row ids off the call's
 *  own identity, never this spelling). */
export const V2V_DERIVED_WINDOW_UUID = "v2v-derived-whole-film"
/** THE DEP LAW (2026-09-22, the From-media freeze): the provider's
 *  modal effect keys on the loadMedia FUNCTION'S IDENTITY — an
 *  inline arrow in the component is a fresh identity every render,
 *  and the effect re-fires per render into an infinite load loop
 *  that freezes the card (the base's own comment: the 4GB OOM). The
 *  audio filter wrapper lives at MODULE SCOPE — one identity,
 *  forever; the effect fires once per modal opening. */
const loadAudioMedia = async (_kind: string, signal: AbortSignal) => {
  const rows = await fetchMediaLibrary("all", signal)
  return rows.filter((r) => AUDIO_ROW_RE.test(r.url) || AUDIO_ROW_RE.test(r.name))
}

export function StudioStripPane({
  calls, fps,
  barPrompts, barLanes, barAudioClips, barTotal, frameIdx,
  commissions,
  callPreviews, selectedBarId, filmMap,
  handleBarFrame, handleScrubStart, handleScrubEnd,
  handleKeyframeMove, handleKeyframeDelete,
  handlePromptUpdate, handlePromptMove, handlePromptResize, handlePromptDelete,
  handleExtend, addCallAt, addFirstWindowCut, handleTimelineSelect,
  layerA, refAudiosBlocked, addAudioClip, takeAudioFile, moveAudioClip, deleteAudioClip,
  updateAudioClip,
  setLayerAKey, artifactIndex, docFromFilm, keyframes, addKeyframeWithImage, enterKfView, enterAudioView,
  setCallTransition,
}: {
  calls: DocCall[]
  fps: number
  barPrompts: TimelinePrompt[]
  barLanes: TimelineKeyframe[]
  barAudioClips: Array<{ id: string; name: string; start_frame: number; dur_frames: number; gain?: number; class?: "dialogue" | "sfx" | "music"; text?: string }>
  barTotal: number
  frameIdx: number
  /** (§9's mod projection) the doc's ARMED mod bags, derived — one rail
   *  row per armed commission (read-only; the studio authors no bag). */
  commissions: DocCommission[]
  callPreviews: Record<string, string>
  selectedBarId: string | null
  filmMap: { fps?: number } | null
  handleBarFrame: (frame: number) => void
  handleScrubStart: () => void
  handleScrubEnd: () => void
  /** (2026-11-05, the lane upload door) — the atomic pin+image write
   *  the keyframes lane's upload icon commits (one write, the
   *  audio-lane grammar mirrored for frames). */
  handleKeyframeMove: (id: string, frame: number) => void
  handleKeyframeDelete: (id: string) => void
  handlePromptUpdate: (id: string, text: string) => void
  handlePromptMove: (id: string, s: number, e: number) => void
  handlePromptResize: (id: string, s: number, e: number) => void
  handlePromptDelete: (id: string) => void
  handleExtend: (newTotal: number) => void
  /** (§0.5) the second arg is the no-legal-split refusal — the strip
   *  routes it to the shared laneErr slot (the mutation owns the law). */
  addCallAt: (frame: number, onRefuse?: () => void) => void
  /** (D-19, the v2v lane-mirror cure) the derived whole-film window's
   *  first cut — the ONLY state this arm serves is the empty-calls
   *  doc under the armed edit bag (the mutation owns the law; the
   *  refusal is the same no-legal-split voice). */
  addFirstWindowCut: (extent: number, at: number, onRefuse?: () => void) => void
  handleTimelineSelect: (id: string | null) => void
  layerA: LayerA
  /** THE BLOCKER (2026-09-22): reference audio wired on any call —
   * the D-M-E lanes LOCK (no adds on any lane) until it is cleared. */
  refAudiosBlocked: boolean
  addAudioClip: (name: string, src: string, startFrame: number, cls?: "dialogue" | "sfx" | "music") => void
  takeAudioFile: (file: File, startFrame: number, cls?: "dialogue" | "sfx" | "music", onError?: (msg: string) => void) => void
  moveAudioClip: (clipId: string, docFrame: number) => void
  deleteAudioClip: (clipId: string) => void
  updateAudioClip: (clipId: string, patch: { class?: "dialogue" | "sfx" | "music", text?: string }) => void
  setLayerAKey: SetLayerAKey
  artifactIndex: { byUrl: Map<string, string> }
  docFromFilm: (g: number) => number
  keyframes: DocKeyframe[]
  /** (D7, the lane-add parity law, 2026-11-06) the ATOMIC pin+image
   *  verb — the track head's add door commits BOTH in one write
   *  (the same law the rail subview's add door rides). */
  addKeyframeWithImage: (image: string, frame: number) => string
  /** THE SEAM (the collapse's cuts, 2026-11-09): the strip's own
   *  seam chip writes the call's transition — the add-call surface is
   *  the one home for the cut choice (the rail select retired). */
  setCallTransition: (i: number, t: "extend" | "cut" | "carry+keyframe") => void
  /** THE SUBVIEW DOOR (defect B): opens the rail's standalone
   *  keyframes editor — the strip head's one keyframes verb. */
  enterKfView: () => void
  /** (the submenu law) an audio-lane click on the bar opens the
   *  rail's audio submenu — the bar is the navigation surface. */
  enterAudioView: (laneId: string) => void
}) {
  // ── THE LANE PICKER (2026-09-22, the operator's law: the add door
  // is an upload icon beside each lane TITLE in the gutter, opening
  // the GENERIC source grammar — never a bespoke upload button). The
  // provider is the estate's ONE definition (the same three-entry
  // menu, the same picker modal the call cards ride); the lanes'
  // pseudo-fields route the pick back through the SAME verbs the lane
  // drops use. THE BLOCKER holds at this door too.
  const pickLane = useRef<LaneCls>("music")
  // THE STRIP UPLOAD FACE (the every-seat law, 2026-10-26): every
  // refusal a lane gesture can hit renders HERE — wrong-type /
  // oversize / unreadable files, a foreign URL drop, a blocked-lane
  // gesture. Same message vocabulary as the call card's lanes.
  const [laneErr, setLaneErr] = useState<string | null>(null)
  const laneField = (lane: LaneCls): SpecField =>
    ({ name: `audio:${lane}`, label: lane, type: "file" })
  const { square, wireMenu } = useSquareProvider(
    (name, v) => {
      // From flow / From media — v is the picked URL; the artifact
      // index names it when it can (the same door as a lane drop).
      if (typeof v !== "string" || v === "") return
      if (refAudiosBlocked) { setLaneErr(studioCopy.laneBlockedMessage); return }
      // THE FROM-MEDIA COMMIT CHIP (S9, 2026-10-26): a picked http(s)
      // URL outside this run's artifacts used to commit VERBATIM and
      // die later at the run's refs resolution — the buckets' M1 arm
      // refuses the identical gesture, so this seat refuses it with
      // the face's own vocabulary. Bare names and data: URLs ride
      // (the wire law: the estate re-resolves names).
      const laneMedia = estateMediaChip(v)
      if (laneMedia !== null) { setLaneErr(null); addAudioClip(laneMedia, laneMedia, 0, LANE_OF[name]); return }
      if (/^https?:\/\//.test(v) && !artifactIndex.byUrl.has(v)) { setLaneErr(FOREIGN_URL_REFUSAL); return }
      setLaneErr(null)
      const label = artifactIndex.byUrl.get(v) ?? v
      addAudioClip(label, v, 0, LANE_OF[name])
    },
    {
      // From flow: the run's own artifacts, audio rows only.
      candidates: Array.from(artifactIndex.byUrl.entries())
        .filter(([url]) => AUDIO_ROW_RE.test(url))
        .map(([url, name2]) => ({ id: url, label: name2, url })),
      // From media: the estate library through its one door, audio
      // rows only — the STABLE module-level wrapper (THE DEP LAW:
      // never an inline arrow here).
      loadMedia: loadAudioMedia,
      // From file: the OS dialog, audio family — the clip verb.
      accept: "audio/*",
      onFile: (file: File) => {
        setLaneErr(null)
        if (refAudiosBlocked) { setLaneErr(studioCopy.laneBlockedMessage); return }
        takeAudioFile(file, 0, pickLane.current, setLaneErr)
      },
    },
  )
  // (defect B SUPERSEDED by the lane-add parity law, operator
  // 2026-11-06: "WHERE IS MY UP ARROW ICON FOR THE KEYFRAMES? THE
  // AUDIO INPUTS HAVE THEM") — the keyframes lane head now carries
  // the SAME add door the audio heads carry: an upload icon on the
  // lane row, opening the generic source grammar (From flow / From
  // media / From file). The rail's keyframes subview KEEPS its own
  // add door; the lane keeps its document gestures (double-click
  // pins, drag moves, ✕ deletes). The subview door below stays.

  const openLanePicker = (lane: LaneCls) => (anchor: HTMLElement): void => {
    pickLane.current = lane
    // (the slot-shape proof) type 'file' always hosts; the verb is
    // optional in the InputSquareVerbs interface — both belts ride ?.
    square(laneField(lane))?.verbs.onPick?.(anchor)
  }

  // ── THE TRACK-HEAD ADD DOOR (D7, the lane-add parity law,
  // 2026-11-06) ─────────────────────────────────────────────────
  // The keyframes lane row's upload icon — the SAME grammar the
  // audio lane heads ride (useSquareProvider's three-entry picker).
  // The commit is the ATOMIC pin+image law at the CURRENT PLAYHEAD
  // (docFromFilm(frameIdx) — the same frame a double-click pins).
  // (D9, the keyframe-image identity) ONE spelling for the whole
  // commit — refUtils' commitKeyframePinImage, the judge AND the fit
  // in one seat: the same source dropped through either keyframe door
  // (this lane head or the rail subview's pickers) stamps the SAME
  // identity into the doc — the name arm's fitted data:, never the
  // unfittable bare name.
  const [kfErr, setKfErr] = useState<string | null>(null)
  const kfAddField: SpecField =
    { name: "kf:add", label: studioCopy.imageGuideLane, type: "file" }
  const { square: kfAddSquare, wireMenu: kfAddMenu } = useSquareProvider(
    (_name, v) => {
      if (typeof v !== "string" || v === "") return
      // (D9) the ONE commit spine — the judge + the fit in one seat,
      // the same value the rail subview's doors stamp. The refusal
      // lands after the spine resolves (one microtask — the panel's
      // own E7 shape).
      void commitKeyframePinImage(v, artifactIndex.byUrl, layerA.width ?? 1344, layerA.height ?? 768)
        .then((got) => {
          if ("refusal" in got) { setKfErr(got.refusal); return }
          setKfErr(null)
          addKeyframeWithImage(got.image, docFromFilm(frameIdx))
        })
    },
    {
      // From flow: the run's own artifacts, image rows only.
      candidates: Array.from(artifactIndex.byUrl.entries())
        .filter(([url]) => IMAGE_ROW_RE.test(url))
        .map(([url, name2]) => ({ id: url, label: name2, url })),
      // From media: the estate library through its one door, image
      // rows only — the STABLE module-level wrapper (THE DEP LAW:
      // never an inline arrow here).
      loadMedia: loadImageMedia,
      // From file: the OS dialog, image family — the atomic verb.
      accept: "image/*",
      onFile: (file: File) => {
        setKfErr(null)
        const refusal = refUploadError(file, "image")
        if (refusal !== null) { setKfErr(refusal); return }
        readAsDataURL(file).then(
          (data) => {
            void fitImageToAspect(data, layerA.width ?? 1344, layerA.height ?? 768)
              .then((fitted) => { addKeyframeWithImage(fitted, docFromFilm(frameIdx)) })
          },
          () => { setKfErr(REF_READ_ERROR) },
        )
      },
    },
  )
  const openTrackAdd = (_trackUuid: string, anchor: HTMLButtonElement): void => {
    // (2026-11-06) no uuid gate: VIDEO_TIMELINE_TRACKS is this pane's
    // ONE keyframes track — every track head the bar renders IS the
    // kf door (a uuid check here was uncoverable defensive code).
    kfAddSquare(kfAddField)?.verbs.onPick?.(anchor)
  }
  // ── THE KEYFRAME CHIP FACES (slice 3, 2026-11-05) ──────────────────
  // The bar renders WHAT it is given; the words are the dictionary's
  // (locale-owned), the verdict is the grid law's (docGrid.pinDropVerdict
  // — the plan gate's own window predicate over GRID_STEP_FRAMES), the
  // thumb rides the derived view's index resolution. barLanes[i] ↔
  // keyframes[i]: keyframesToLanes maps the doc pins 1:1 in order and
  // the film map translates frames in place. Hints are VISUAL ONLY —
  // the drag still writes the raw frame through the spine.
  // ── THE COMMISSION RAIL (§9's mod projection, 2026-11-12) ──────────
  // The tenant's half of the mapping: the kit draws spans, the studio
  // supplies the words. One row per ARMED bag; the extend's geometry
  // becomes its N window segments (the operator finally sees the
  // windows an agent strung together); a doomed composition shows the
  // compose door's own refusal voice instead of a lane that looks fine.
  // (THE STACKED-ID LAW, 2026-11-14) the stacked kinds (loras,
  // refine) project ONE ROW PER ENTRY, and every row rode the bare
  // kind as its id — two adapters armed drew two rail rows sharing one
  // React key and one data-commission-lane value. The FIRST row of
  // each kind keeps the bare id (every existing selector's contract);
  // each subsequent row is entry-qualified (`loras-2`) — unique keys,
  // addressable rows.
  const seenKinds = new Map<string, number>()
  // THE PLANNED TAIL (the frame-offset segments, 2026-11-03): the
  // armed extend's delivered frames extend the bar's AXIS (the hatched
  // band beyond the film's end) and its windows position at their
  // frame offsets — window k at filmEnd + k*(windowFrames − overlap),
  // the carry seam visible. The geometry-derived rows only; a doomed
  // composition (refusal voice) seats no tail it will never build.
  const planned = commissions.find((c) => c.geometry !== undefined)
  const plannedFrames = planned?.geometry?.deliveredFrames
  const commissionRows: CommissionRow[] = commissions.map((c) => {
    const nth = seenKinds.get(c.kind) ?? 0
    seenKinds.set(c.kind, nth + 1)
    const detail = studioCopy.commissionSeats(c.seats)
    const segments = c.geometry !== undefined
      ? Array.from({ length: c.geometry.windows }, (_v, i) =>
          studioCopy.commissionWindowSegment(i, c.geometry!.windowFrames))
      : undefined
    const segmentSpans = c.geometry !== undefined
      ? windowSpans(c.geometry, barTotal)
      : undefined
    const geometryLine = c.geometry !== undefined
      ? studioCopy.commissionGeometry(c.geometry)
      : undefined
    return {
      id: nth === 0 ? c.kind : `${c.kind}-${nth + 1}`,
      label: studioCopy.commissionKindLabel(c.kind),
      detail: [detail, geometryLine].filter((x): x is string => x !== undefined && x !== "").join(studioCopy.commissionDetailJoin),
      segments,
      segmentSpans,
      title: c.refusal
        ?? (c.note === "malformed" ? studioCopy.commissionMalformed(c.kind)
          : c.note === "bad-entry" ? studioCopy.commissionBadEntry(c.kind)
            : studioCopy.commissionRowTitle(c.kind)),
    }
  })

  // ── THE MOD-MODE CALLS FACE (operator 2026-11-14: "there is still
  // the default call in the timeline bar that tells them to describe
  // their video there, when that isn't used at all") ────────────────
  // The lane names its calls-readership: under a NON-reading armed
  // commission the starter placeholder stands down (it is view state
  // inviting prose the armed run will never read — the exact lie the
  // report names) and the add door closes (no dead-text authoring);
  // authored prose still paints — it is doc truth, merely unread by
  // this run, and hiding operator content is not this lane's call.
  // Under a READING commission (reshoot, loras) the lane stays fully
  // live — its DOORS, not the placeholder: authored prose paints and
  // the dictionary's prompt-seat hint is the invitation. The words
  // are the dictionary's; the kit stays tenant-dumb (label + hint).
  const callsFace = callsLaneFace(commissions)
  // The bar row's text is the clip-header composite (clipHeader wraps
  // the call's prose), so the placeholder judges its SOURCE call —
  // barPrompts[i] ↔ calls[i], one row per call in order.
  // (THE V2V STAND-DOWN, operator 2026-11-16: "WHY DO I SEE THE
  // DEFAULT CALL ON THE REPAIR VIDEO TO VIDEO. I SAID REPLACED" —
  // the armed EDIT bag's face stands the starter down exactly as the
  // dormant face does: the lane IS the video-to-video shape and the
  // starter's "describe the action" prose is an invitation the armed
  // run never reads (the edit composes from the mod's own prompt
  // seat). The span doors stay live — AUTHORED windows still paint.)
  // (THE PROMPT-SEAT STAND-DOWN, operator 2026-11-18: "I still see
  // THIS PROMPT ON RESHOOT BY DEFAULT IN THE TIMELINE — 'A single
  // shot — describe the action, camera, and mood.' WHAT? WHY DO I
  // SEE THIS PROMPT THAT DOESN'T DO ANYTHING?" — under a READING arm
  // the stand-down is MORE owed than under dormant: the lane is
  // labeled the run's prompt seat, so the film route's placeholder
  // prose reads as content the run will book, and it would — the
  // projection no longer mints it (the plain-face law,
  // projectDoc/hydrateCalls). This filter is the belt for docs that
  // PERSIST the starter verbatim (pre-gate saves, agent-authored):
  // the starter paints ONLY on the plain face. AUTHORED prose and
  // every door stay live — the stand-down never hides operator
  // content, only the studio's own placeholder.)
  const shownPrompts = callsFace.face !== "plain"
    ? barPrompts.filter((_p, i) => !(calls[i] !== undefined && isStarterCallText(calls[i]!.text ?? "")))
    : barPrompts

  // THE DERIVED WHOLE-FILM WINDOW (D-19, the v2v lane-mirror audit
  // 2026-11-18 — the founding axiom: the lane MIRRORS the chain). The
  // armed edit with zero authored spans composes ONE implicit window
  // (the whole film, derived join) — the lane paints it in the
  // AUTHORING lane where the cut doors live, read from the bag + the
  // axis extent (never an invented span): Add cut and the divide seat
  // gain their object, and the first press materializes REAL calls
  // rows through the split law (addFirstWindowCut). The row is
  // READ-ONLY — a geometry gesture on it answers LOUD (the derived
  // window mirrors the run; cuts author the spans). This is NOT the
  // starter's return: nothing is authored, nothing persists, no prose
  // is invited — the row paints exactly what the compose will build
  // and dies the moment authored spans exist.
  const derivedV2vActive = callsFace.face === "v2v" && calls.length === 0 && barTotal > 0
  const lanePrompts = derivedV2vActive
    ? [{
        uuid: V2V_DERIVED_WINDOW_UUID,
        text: studioCopy.v2vDerivedWindowText,
        start_frame: 0,
        end_frame: barTotal,
        color: null,
      }]
    : shownPrompts
  // the derived window's own verbs: the loud read-only refusal for
  // geometry gestures (the stock handlers resolve no call and would
  // drop the gesture SILENT — the disease class), and the first cut
  // for the two cut doors.
  const derivedGuard = (id: string): boolean => {
    if (id !== V2V_DERIVED_WINDOW_UUID) return false
    setLaneErr(studioCopy.v2vDerivedReadonly)
    return true
  }

  const kfChips = barLanes.map((k, i) => {
    const docFrame = keyframes[i]?.frame
    const verdict = typeof docFrame === "number" ? pinDropVerdict(calls, docFrame) : null
    // (C6, the imageless pin) the double-click's write lands PENDING —
    // the frame rides first, the image only through the picker doors.
    // ONE judge, the gate's own spelling (useFilmSync's unwired walk):
    // blank = no image. A pending chip names its state on every face
    // (aria, readout, drop hint) and carries no thumb — the row the
    // card cannot compose never looks settled; the compose door's
    // "image is required" refusal stays the backstop at the run.
    const pending = typeof docFrame === "number" && keyframes[i]!.image.trim() === ""
    return {
      ...k,
      ariaLabel: pending
        ? studioCopy.keyframePendingAria(docFrame)
        : typeof docFrame === "number" ? studioCopy.keyframeLaneChipAria(docFrame) : undefined,
      readout: pending
        ? studioCopy.keyframePendingReadout(docFrame)
        : typeof docFrame === "number" ? studioCopy.keyframeFrameReadout(docFrame) : undefined,
      dropHint: pending
        ? studioCopy.keyframePendingHint
        : verdict === null
          ? undefined
          : verdict === "snap" ? studioCopy.dropSnapHint : studioCopy.dropInteriorHint,
    }
  })
  // THE GAP REFUSAL SURFACED (slice 3): a pin outside every call window
  // is the plan door's own refusal (compose refuses loud at the run;
  // the write itself still lands — the UI never pre-refuses). The strip
  // says so in the SAME laneErr slot (the shared refusal face), in the
  // same law's wording (studioCopy.gapRefusal).
  const gapPin = keyframes.some((k) => pinDropVerdict(calls, k.frame) === null)
  const refusalFace = laneErr ?? (gapPin ? studioCopy.gapRefusal : null)
  // (THE MOD-MODE CALLS FACE — the edit doors' refusal, 2026-11-15)
  // under a dormant face the strip's four per-call edit doors answer
  // this, never the write: the dead-text law the add door already
  // carries, in the shared refusal slot, the dictionary's own voice.
  // (The four doors call this ONLY under a dormant face — the guard
  // narrows the union for the kind the hint names.)
  const refuseCallsEdit = () => {
    /* v8 ignore if -- the non-dormant return is a type fence: every caller wires this handler ONLY under callsFace.face === 'dormant' (the four edit doors' ternaries above; the seam chip passes undefined there), so the union is already narrowed when the body runs and this branch cannot fire — a fifth edit door wired on a non-dormant face would re-arm it */
    if (callsFace.face !== 'dormant') return
    setLaneErr(studioCopy.callsDormantHint(callsFace.kind))
  }
  // (THE V2V FACE, queue 11) the PROSE door's refusal under the
  // armed edit bag: the lane's windows and cuts are the run's own
  // spans (live), its TEXT is not read — the edit composes from the
  // mod's own prompt seat. Geometry doors stay LIVE under v2v.
  const refuseV2vProse = () => {
    /* v8 ignore if -- the non-v2v return is a type fence: the one prose door wires this handler ONLY under callsFace.face === 'v2v' (its ternary below), so the union is already narrowed when the body runs */
    if (callsFace.face !== 'v2v') return
    setLaneErr(studioCopy.callsV2vProseHint)
  }
  // (THE V2V FACE, queue 11's SECOND BLOCK) the TIMESTAMP SPLIT SEAT:
  // the operator's law — "the video2video form that would allow clips
  // to split by timestamp. I.e. split at 2 seconds, with the option
  // to select how context is carried." The seat rides the strip head
  // beside the Add cut button: a seconds input + the carry-mode menu
  // (stock / carry / carry+keyframe — the §0.9 states as the split's
  // own option, the same three the call card's seam seat serves).
  const [splitAtSec, setSplitAtSec] = useState("")
  const [splitCarry, setSplitCarry] = useState<"cut" | "extend" | "carry+keyframe">("cut")
  const [carryMenuOpen, setCarryMenuOpen] = useState(false)
  // (THE V2V FACE, queue 11) the strip's own visible cut door — the
  // operator's law: "THE ABILITY TO ADD CUTS" is a CONTROL on the
  // face, never a hidden gesture. THE PRESS ALWAYS CUTS (the visual
  // audit's critical 2: a fresh doc's playhead sits at frame 0, and
  // the raw verb's interior-split arm never matches there — the
  // past-end append arm fired instead, junking an empty window): a
  // playhead strictly inside a window cuts THERE; a playhead at a
  // boundary or past the end cuts the window it sits on (the last,
  // past the end) at its MIDPOINT — the same frame the per-window
  // split seat cuts when the operator names no interior point. The
  // write rides §0.5's split law (one window becomes its own two
  // halves, the seam states CUT); a window at its shape's floor
  // refuses LOUD in the shared slot.
  // THE TIMESTAMP OVERRIDE (queue 11's second block): when the
  // operator states a timestamp, the cut lands AT that second — the
  // same resolution law, the stated frame instead of the playhead.
  // THE CARRY (queue 11's second block): when a carry mode beyond
  // stock is selected, the new seam re-frames to that mode through
  // setCallTransition — the §0.9 verb, the same reframe the call
  // card's seam seat owns. The right half lands at the containing
  // window's index + 1 (addCallAt's split inserts there); both writes
  // are functional updaters on the same state, so the reframe sees
  // the post-split array. The reframe fires ONLY when the split will
  // land (snapSplitFrame non-null — the same predictor addCallAt
  // decides by): a refused split leaves the doc whole, and a reframe
  // against the un-split array would hit the WRONG window. This one
  // verb serves BOTH cut doors — the strip head's door and the
  // per-window divide seat (the operator: "allow people to cut in
  // the middle to split the clips into context carry").
  const cutWithCarry = (frame: number, onRefuse?: () => void) => {
    // (the empty doc refuses at the DOOR, before frame resolution —
    // both callers fence: the door guards calls.length, the divide
    // guards calls[idx]; this verb only ever sees a windowed doc)
    setLaneErr(null)
    addCallAt(frame, onRefuse)
    const containingIdx = calls.findIndex((c) => frame > c.start_frame && frame < c.end_frame)
    const willSplit = containingIdx >= 0 && snapSplitFrame(
      calls[containingIdx]!.start_frame, calls[containingIdx]!.end_frame,
      isCarriedShape(containingIdx, calls[containingIdx]!), true, frame,
    ) !== null
    if (willSplit && splitCarry !== "cut") setCallTransition(containingIdx + 1, splitCarry)
  }
  const addCutAtPlayhead = () => {
    // THE DERIVED WHOLE-FILM FIRST CUT (D-19, the v2v lane-mirror
    // cure): the empty doc under the armed edit bag now HAS its
    // object — the lane paints the run's one implicit window (the
    // whole film), and the press materializes REAL calls rows through
    // the split law (addFirstWindowCut): the same timestamp override,
    // the same no-legal-split refusal, the same carry reframe. The
    // pre-cure refusal ("nothing to cut") described a lane this face
    // no longer paints; the door NEVER falls to the stock append (an
    // ADD the face bars — addFirstWindowCut splits or refuses, never
    // appends).
    if (calls.length === 0) {
      const stated = Number(splitAtSec)
      const atStated = splitAtSec.trim() !== "" && Number.isFinite(stated) && stated >= 0
        ? Math.round(stated * (filmMap?.fps ?? fps))
        : null
      const at = atStated !== null ? atStated : docFromFilm(frameIdx)
      const extent = docFromFilm(barTotal)
      // the carry reframe rides the same predictor law as the stock
      // cut: the seam write fires ONLY when the split will land (a
      // refused cut leaves the doc empty — a reframe against nothing
      // would hit a row that does not exist)
      const shape = isCarriedShape(0, { transition: undefined })
      const willSplit = snapSplitFrame(0, extent, shape, true, at) !== null
      addFirstWindowCut(extent, at, () => setLaneErr(studioCopy.splitRefusal))
      if (willSplit && splitCarry !== "cut") setCallTransition(1, splitCarry)
      return
    }
    const stated = Number(splitAtSec)
    const atStated = splitAtSec.trim() !== "" && Number.isFinite(stated) && stated >= 0
      ? Math.round(stated * (filmMap?.fps ?? fps))
      : null
    const at = atStated !== null ? atStated : docFromFilm(frameIdx)
    const interior = calls.find((c) => at > c.start_frame && at < c.end_frame)
    // (the empty-doc guard above holds: the fallback window exists,
    // and the if-shape lets the narrowing prove it)
    let cutFrame: number
    if (interior !== undefined) {
      cutFrame = at
    } else {
      const target = calls.find((c) => at === c.start_frame) ?? calls[calls.length - 1]!
      cutFrame = Math.round((target.start_frame + target.end_frame) / 2)
    }
    cutWithCarry(cutFrame, () => setLaneErr(studioCopy.splitRefusal))
  }
  // (D3, operator 2026-11-06: "calls bar only goes to 5.5s vs film
  // 'Final cut 9.06s · frame 145/162'") — the meta line rides the
  // SAME truth the bar axis below rides: the FILM's frames + fps
  // when a map exists, the plan's otherwise. The plan spelling
  // (totalFrames/fps/seconds) is the DOC header's own — here it lied
  // beside the film's own bar.
  const barFps = filmMap?.fps ?? fps
  const barSeconds = (barTotal / barFps).toFixed(2)
  return (
  <PaneShell>
    <PaneHeader
      title={studioCopy.timelineTitle}
      meta={
        studioCopy.stripMeta({ calls: calls.length, frames: barTotal, fps: barFps, seconds: barSeconds })
      }
      hint={studioCopy.stripHint}
    />
    {/* THE STRIP TOOL ROW (2026-11-10, the corner-crush burn: the
        verbs rode INSIDE the pane hint's 9px text span, each clamped
        to the 22×22 upload-glyph box — input and buttons clipped
        into "s**t in the corner that doesn't even fit"). The hint is
        PROSE; the verbs are VERBS: their own row under the header,
        wrapped lawfully, full text, never clamped. */}
    <div className={s.stripTools}>
      {/* (THE V2V FACE, queue 11's SECOND BLOCK) the TIMESTAMP SPLIT
          SEAT — the operator's law: "the video2video form that would
          allow clips to split by timestamp. I.e. split at 2 seconds,
          with the option to select how context is carried." The seat
          rides the tool row beside the Add cut door: a seconds input
          + the carry-mode menu. A stated timestamp overrides the
          playhead; the carry mode re-frames the new seam (stock =
          the split's default). */}
      {callsFace.face === "v2v" && (
        <>
          <Input
            type="number"
            min={0}
            step={0.1}
            data-testid="tl-split-at"
            aria-label={studioCopy.splitAtLabel}
            title={studioCopy.splitAtTip}
            className={s.splitAtInput}
            placeholder={studioCopy.splitAtPlaceholder}
            value={splitAtSec}
            onInput={(e: unknown) => { setSplitAtSec((e as { target: { value: string } }).target.value) }}
            onChange={(e: unknown) => { setSplitAtSec((e as { target: { value: string } }).target.value) }}
          />
          <Menu
            open={carryMenuOpen}
            onClose={() => { setCarryMenuOpen(false) }}
            compact
            portal
            items={[
              { id: "cut", label: studioCopy.splitCarryStock },
              { id: "extend", label: studioCopy.splitCarryCarry },
              { id: "carry+keyframe", label: studioCopy.splitCarryKeyframe },
            ]}
            selectedId={splitCarry}
            onSelect={(id: string) => {
              setCarryMenuOpen(false)
              setSplitCarry(id as "cut" | "extend" | "carry+keyframe")
            }}
            anchor={
              <Button variant="outline" size="sm"
                data-testid="tl-split-carry"
                aria-label={studioCopy.splitCarryLabel}
                title={studioCopy.splitCarryTip}
                onClick={() => { setCarryMenuOpen(!carryMenuOpen) }}
              >
                {splitCarry === "cut" ? studioCopy.splitCarryStock
                  : splitCarry === "extend" ? studioCopy.splitCarryCarry
                    : studioCopy.splitCarryKeyframe}
              </Button>
            }
          />
          <Button variant="ghost" size="sm"
            data-testid="tl-add-cut"
            aria-label={studioCopy.addCutDoor}
            title={studioCopy.addCutDoorTip}
            onClick={addCutAtPlayhead}
          >
            {studioCopy.addCutDoor}
          </Button>
        </>
      )}
      {/* THE SUBVIEW DOOR (defect B): the strip's one keyframes verb
          — the rail swaps to the standalone editor, Layer A/B banned
          alongside it. */}
      <Button variant="ghost" size="sm"
        data-testid="tl-keyframes-door"
        aria-label={studioCopy.keyframesDoor}
        title={studioCopy.keyframesDoorTip}
        onClick={enterKfView}
      >
        {studioCopy.keyframesDoor}
      </Button>
    </div>
    <div className={s.blockerWrap}>
      {refusalFace !== null && (
        <div data-testid="tl-strip-file-error" className={s.fileErr} role="alert">{refusalFace}</div>
      )}
      {refAudiosBlocked && (
        <div data-testid="tl-lane-blocker" className={s.laneBlocker}>
          {studioCopy.laneBlockedMessage}
        </div>
      )}
      {kfErr !== null && (
        <div data-testid="tl-strip-kf-error" className={s.fileErr} role="alert">{kfErr}</div>
      )}
    <MotionTimelineBar
      prompts={lanePrompts}
      keyframes={kfChips}
      frameIdx={frameIdx}
      totalFrames={barTotal}
      plannedFrames={plannedFrames}
      fps={barFps}
      initialSeconds={10}
      onFrameChange={handleBarFrame}
      onScrubStart={handleScrubStart}
      onScrubEnd={handleScrubEnd}
      // (operator 2026-10-22) the bar's lane-add prop is NOT wired: the
      // lane click authored an imageless pin no door could fill — the
      // dead path is gone; the upload door below is the ONE add.
      onKeyframeMove={(id, frame) => handleKeyframeMove(id, docFromFilm(frame))}
      onKeyframeDelete={handleKeyframeDelete}
      // (D7, the lane-add parity law) the keyframes track head's add
      // door — the up-arrow icon, the audio heads' own grammar.
      onTrackAdd={openTrackAdd}
      // (THE MOD-MODE CALLS FACE — the edit doors, 2026-11-15) the four
      // per-call edit doors stand down under a dormant face: editing a
      // call the armed run will never read is the same dead-text
      // authoring the add door below already refuses — the refusal is
      // LOUD, in the shared laneErr slot, in the dictionary's dormant
      // voice. The plain and prompt faces keep every door. The bench
      // write door itself stays open — the agent's calls rewrite is
      // lawful doc authoring (the three-door accord); this is the
      // operator-posture law and it fires where the operator's
      // gesture enters.
      // (THE V2V FACE, queue 11) under the armed edit bag only the
      // PROSE door refuses: the lane's windows ARE the run's spans,
      // so every geometry door (move / resize / delete / add / seam /
      // split) stays live — this lane is the video-to-video and cuts
      // face, the edit's own authoring surface.
      onPromptUpdate={callsFace.face === "dormant" ? refuseCallsEdit
        : callsFace.face === "v2v" ? refuseV2vProse
          : handlePromptUpdate}
      // (D-19) the derived window guards: the stock handlers resolve
      // no call for the derived row's uuid and would drop the gesture
      // SILENT — the read-only answer is LOUD, in the shared slot.
      onPromptMove={callsFace.face === "dormant" ? refuseCallsEdit
        : (id, s, e) => { if (derivedGuard(id)) return; handlePromptMove(id, docFromFilm(s), docFromFilm(e)) }}
      onPromptResize={callsFace.face === "dormant" ? refuseCallsEdit
        : (id, s, e) => { if (derivedGuard(id)) return; handlePromptResize(id, docFromFilm(s), docFromFilm(e)) }}
      onPromptDelete={callsFace.face === "dormant" ? refuseCallsEdit
        : (id) => { if (derivedGuard(id)) return; handlePromptDelete(id) }}
      // (D3's ghost, 2026-11-06) the tail pull arrives in FILM
      // frames; the doc write rides the INVERSE map — never a raw
      // linear delta. With a scaled window (film 162 ↔ doc 132) the
      // delta path added FILM frames to the DOC total, the next run
      // re-scaled the overshoot, and the film demorphed past the
      // pull — a ghost tail no one authored.
      onExtend={(newTotal) => handleExtend(docFromFilm(newTotal))}
      // (operator 2026-11-05: "THERE IS NO TIMELINE ROW FOR THE
      // KEYFRAMES") — the lanes ride ALWAYS: a fresh doc's empty
      // keyframe lane is the PICK SURFACE (double-click pins); a
      // starved lane (tracks=[] until pins exist) hid the door.
      // (the lane-add parity law, 2026-11-06) the track head's add
      // door rides the bar (onTrackAdd) — the SAME upload-icon
      // grammar the audio lane heads carry.
      // (the copy is load-bearing: the bar stamps runtime state onto
      // its track objects — the module static must never be poisoned)
      tracks={VIDEO_TIMELINE_TRACKS.map((t) => ({ ...t }))}
      packed
      // (THE MOD-MODE CALLS FACE) the head + hint name the lane's
      // calls-readership under an armed commission — the dictionary's
      // words, the kit's existing props, no kit change. (THE V2V
      // FACE, queue 11) the edit bag's own head: this lane is the
      // video-to-video and cuts face.
      promptsLabel={callsFace.face === "dormant" ? studioCopy.callsDormantLabel(callsFace.kind)
        : callsFace.face === "v2v" ? studioCopy.callsV2vLabel
          : callsFace.face === "prompt" ? studioCopy.callsPromptSeatLabel(callsFace.kind)
            : studioCopy.callsLabel}
      commissions={commissionRows}
      // (F11, 2026-11-05) the strip's two hints are the dictionary's —
      // the pane feeds the atoms, it owns no literals. Under an armed
      // commission the hint is the face's own (why the starter stood
      // down / why this lane's text is the run's prompt).
      laneHint={studioCopy.keyframeLaneHint}
      emptyPromptsHint={callsFace.face === "dormant" ? studioCopy.callsDormantHint(callsFace.kind)
        : callsFace.face === "v2v" ? studioCopy.callsV2vHint
          : callsFace.face === "prompt" ? studioCopy.callsPromptSeatHint(callsFace.kind)
            : studioCopy.stripEmptyPromptsHint}
      promptsHeight={64}
      // (THE MOD-MODE CALLS FACE) under a NON-reading armed commission
      // the double-click add stands down — a new call authored into the
      // dormant lane is dead text the armed run will never read. The
      // plain and prompt faces keep the add door (the film's authoring
      // surface / the run's prompt seat). (THE V2V FACE, queue 11's
      // SECOND BLOCK, operator: "This section would no longer allow
      // people to add clips, as it would become the shape of the video
      // to video") the add DIES under v2v exactly as it dies under
      // dormant — the section is the video-to-video shape, cutting is
      // the only verb that grows windows.
      onPromptAdd={callsFace.face === "dormant" || callsFace.face === "v2v"
        ? undefined
        : (frame) => addCallAt(docFromFilm(frame))}
      // THE SEAM CHIP (the collapse's cuts): the kit hands the tenant
      // the row's uuid ONLY; the write resolves it to its call and
      // lands on the doc (setCallTransition — the judged channel).
      // Click toggles carried ⇄ cut. Under a DORMANT face the chip
      // stands down with the other four edit doors (a cut authored
      // into a lane the armed run never reads is dead authoring —
      // the mod-mode calls face's own law; the wall asserts the chip
      // is ABSENT there, so no filtered-face write path exists).
      // (THE V2V FACE, queue 11) the chip is LIVE under the edit bag
      // — the seam cut⇄extend is the video-to-video face's own verb.
      onSeamToggle={
        callsFace.face === "dormant"
          ? undefined
          : (id: string) => {
              const idx = barPrompts.findIndex((p) => p.uuid === id)
              /* v8 ignore else -- the idx < 0 skip is a type fence: the kit renders a seam chip only for rows of the prompts array it was handed, and the chip arms only where shownPrompts is the unfiltered barPrompts (the dormant face's filter carries no chip — onSeamToggle is undefined there), so every uuid through this door is a barPrompts row; a face that filters prompts while keeping the chip armed would re-arm it */
              if (idx >= 0) setCallTransition(idx, calls[idx]?.transition === "cut" ? "extend" : "cut")
            }
      }
      // THE SPLIT SEAT (§0.5, the window split): the clip's visible
      // divide verb — the kit hands the tenant the row's uuid, the
      // write rides addCallAt at the call's own midpoint (the
      // mutation owns the grid law, the identity carry and the cut
      // seam), and a window too short to split refuses LOUD in the
      // shared laneErr slot. Under a DORMANT face the seat stands
      // down with the other five edit doors (dead authoring). (THE
      // V2V FACE, queue 11) the seat is LIVE under the edit bag —
      // the divide IS a cut on the video-to-video face.
      onPromptSplit={
        callsFace.face === "dormant"
          ? undefined
          : (id: string) => {
              // (D-19) the derived window's divide is the FIRST CUT:
              // the row is not a call (barPrompts holds no uuid for
              // it) — routing it through the stock path would hit the
              // -1 type fence and drop SILENT. The same cut verb, the
              // derived window's own midpoint.
              if (id === V2V_DERIVED_WINDOW_UUID) {
                const extent = docFromFilm(barTotal)
                const mid = Math.round(extent / 2)
                const shape = isCarriedShape(0, { transition: undefined })
                const willSplit = snapSplitFrame(0, extent, shape, true, mid) !== null
                addFirstWindowCut(extent, mid, () => setLaneErr(studioCopy.splitRefusal))
                if (willSplit && splitCarry !== "cut") setCallTransition(1, splitCarry)
                return
              }
              const idx = barPrompts.findIndex((p) => p.uuid === id)
              /* v8 ignore else -- the idx < 0 skip is a type fence: the kit renders the split seat only for rows of the prompts array it was handed, and the seat arms only where shownPrompts is the unfiltered barPrompts (the dormant face carries no seat — onPromptSplit is undefined there) */
              if (idx < 0) return
              const call = calls[idx]
              if (call === undefined) return
              // THE DIVIDE RIDES THE CARRY (queue 11's second block):
              // "cut in the middle to split the clips into context
              // carry" — the per-window divide is the same cut verb
              // as the strip head's door, so the selected carry mode
              // frames its seam too.
              cutWithCarry(
                Math.round((call.start_frame + call.end_frame) / 2),
                () => setLaneErr(studioCopy.splitRefusal),
              )
            }
      }
      previews={callPreviews}
      selectedId={selectedBarId}
      onSelect={handleTimelineSelect}
      // THE THREE AUDIO LANES (D-M-E, 2026-09-22): dialogue, music,
      // sfx — one H3 audio input each. The lane id routes drops; the
      // effective class of a legacy clip (absent field) matches the
      // compose's auto law: text → dialogue, else music.
      // (2026-09-22, the operator's card law) the D-M-E lanes render
      // their clips as SMALL CALL CARDS — accent gradient, class glyph
      // (mic / note / bolt), name + span — at the cards lane height.
      audioClipCards
      // (SD-8 lane parity, 2026-11-08, operator item c) the keyframes
      // lane rides the SAME card height + tint the audio lanes carry —
      // the one kf lane reads as the D-M-E rows' peer, not a
      // second-class whisper row. Opt-in per tenant; the motion card's
      // six tracks keep their 24px blocks.
      kfLaneCards
      audioLayers={[
        { id: "dialogue", label: studioCopy.laneDialogue, icon: "mic", accent: "#22d3ee",
          onUpload: refAudiosBlocked ? undefined : openLanePicker("dialogue"),
          clips: barAudioClips.filter((c) => (c.class ?? (c.text ? "dialogue" : "music")) === "dialogue") },
        { id: "music", label: studioCopy.laneMusic, icon: "music", accent: "#a78bfa", stem: layerA.audio_stem ?? null,
          // (Layer A NLE) positioned clips — the row upgrades from the
          // one bed to a DaVinci track when clips exist; the stem bed
          // rendering stays for stem-only docs (byte-identical).
          onUpload: refAudiosBlocked ? undefined : openLanePicker("music"),
          clips: barAudioClips.filter((c) => (c.class ?? (c.text ? "dialogue" : "music")) === "music") },
        { id: "sfx", label: studioCopy.laneSfx, icon: "zap", accent: "#fb923c",
          onUpload: refAudiosBlocked ? undefined : openLanePicker("sfx"),
          clips: barAudioClips.filter((c) => (c.class ?? (c.text ? "dialogue" : "music")) === "sfx") },
      ]}
      onAudioDropAt={(id, url, frame) => {
        // POSITIONED drop (NLE): a known artifact lands as a CLIP on
        // the dropped LANE at the drop frame; a foreign URL refuses
        // VISIBLE (the upload audit's C2 — the identical gesture on
        // the anchor already refused loud; this seat did nothing).
        // THE BLOCKER: reference audio present → the drop is refused
        // on EVERY lane (mutual exclusion, not a hint).
        setLaneErr(null)
        if (refAudiosBlocked) { setLaneErr(studioCopy.laneBlockedMessage); return }
        const name = artifactIndex.byUrl.get(url)
        if (!name) { setLaneErr(FOREIGN_URL_REFUSAL); return }
        addAudioClip(name, name, docFromFilm(frame), id as "dialogue" | "music" | "sfx")
      }}
      onAudioFileDrop={(id, file, frame) => {
        // THE BLOCKER: same law, same refusal — no file adds either.
        setLaneErr(null)
        if (refAudiosBlocked) { setLaneErr(studioCopy.laneBlockedMessage); return }
        takeAudioFile(file, docFromFilm(frame), id as "dialogue" | "music" | "sfx", setLaneErr)
      }}
      onAudioClipMove={(_id, clipId, frame) => {
        moveAudioClip(clipId, docFromFilm(frame))
      }}
      onAudioClipDelete={(_id, clipId) => {
        deleteAudioClip(clipId)
      }}
      onAudioLaneActivate={(layerId) => {
        // (the submenu law, 2026-11-06) the LANE is the door: a
        // click that missed every clip opens the audio submenu. The
        // lane's own id rides through (h3-submenu M9/W1: the seam's
        // payload survives to the tenant verb — the door is lane-
        // keyed at the kit, and the tenant's future per-lane faces
        // read it here instead of re-deriving it).
        enterAudioView(layerId)
      }}
      onAudioDetach={(layerId) => {
        // Per-lane detach (D-M-E): clear the lane's clips only; the
        // music lane also releases the legacy stem (old docs
        // round-trip clean — stem won't re-convert on next load).
        // setLayerAKey carries the filtered array (layerA is the
        // current render's doc — the filter reads it).
        const laneCls = layerId === "music" ? "music" : layerId === "sfx" ? "sfx" : "dialogue"
        const kept = (layerA.audio_clips ?? []).filter((c) =>
          (c.class ?? (c.text ? "dialogue" : "music")) !== laneCls)
        setLayerAKey("audio_clips", kept.length ? kept : undefined)
        if (layerId === "music") setLayerAKey("audio_stem", undefined)
      }}
    />
    {/* the lane picker's anchored menu + modal + hidden file input —
        the provider's own tree, mounted once for all three lanes. */}
    {wireMenu}
    {/* (D7) the kf door's own picker seat — every provider's wireMenu
     * renders or its menu never opens */}
    {kfAddMenu}
    </div>
  </PaneShell>
  )
}

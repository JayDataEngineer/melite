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
import { Button } from "@deepseek-ai/dsh-client-ui-primitives"
import { MotionTimelineBar } from "@melite-plugin/timeline/ui/timeline"
import type { TimelineKeyframe, TimelinePrompt } from "@melite-plugin/timeline/ui/timeline"
import { useSquareProvider, readAsDataURL, fetchMediaLibrary, PaneHeader, PaneShell } from '@melite/card-base/client'
import type { SpecField } from '@melite/card-base/client'
import { refUploadError, REF_READ_ERROR, FOREIGN_URL_REFUSAL, estateMediaChip, commitKeyframePinImage, fitImageToAspect, loadImageMedia, IMAGE_ROW_RE } from './refUtils.ts'
import s from "./studio.module.css"
import { VIDEO_TIMELINE_TRACKS } from "./docModel.ts"
import type { DocCall, DocKeyframe, LayerA, SetLayerAKey } from "./docModel.ts"
import type { DocCommission } from "./commissions.ts"
import type { CommissionRow } from "@melite-plugin/timeline/ui/timeline"
import { pinDropVerdict } from "./docGrid.ts"
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
  handleExtend, addCallAt, handleTimelineSelect,
  layerA, refAudiosBlocked, addAudioClip, takeAudioFile, moveAudioClip, deleteAudioClip,
  updateAudioClip,
  setLayerAKey, artifactIndex, docFromFilm, keyframes, addKeyframeWithImage, enterKfView, enterAudioView,
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
  addCallAt: (frame: number) => void
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
  const commissionRows: CommissionRow[] = commissions.map((c) => {
    const detail = studioCopy.commissionSeats(c.seats)
    const segments = c.geometry !== undefined
      ? Array.from({ length: c.geometry.windows }, (_v, i) =>
          studioCopy.commissionWindowSegment(i, c.geometry!.windowFrames))
      : undefined
    const geometryLine = c.geometry !== undefined
      ? studioCopy.commissionGeometry(c.geometry)
      : undefined
    return {
      id: c.kind,
      label: studioCopy.commissionKindLabel(c.kind),
      detail: [detail, geometryLine].filter((x): x is string => x !== undefined && x !== "").join(studioCopy.commissionDetailJoin),
      segments,
      title: c.refusal
        ?? (c.note === "malformed" ? studioCopy.commissionMalformed(c.kind)
          : c.note === "bad-entry" ? studioCopy.commissionBadEntry(c.kind)
            : studioCopy.commissionRowTitle(c.kind)),
    }
  })

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
      hint={
        <>
          {studioCopy.stripHint}
          {/* THE SUBVIEW DOOR (defect B): the strip head's one
              keyframes verb — the rail swaps to the standalone
              editor, Layer A/B banned alongside it. */}
          <Button variant="ghost" size="sm"
            data-testid="tl-keyframes-door"
            aria-label={studioCopy.keyframesDoor}
            title={studioCopy.keyframesDoorTip}
            className={s.uploadBtn}
            onClick={enterKfView}
          >
            {studioCopy.keyframesDoor}
          </Button>
        </>
      }
    />
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
      prompts={barPrompts}
      keyframes={kfChips}
      frameIdx={frameIdx}
      totalFrames={barTotal}
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
      onPromptUpdate={handlePromptUpdate}
      onPromptMove={(id, s, e) => handlePromptMove(id, docFromFilm(s), docFromFilm(e))}
      onPromptResize={(id, s, e) => handlePromptResize(id, docFromFilm(s), docFromFilm(e))}
      onPromptDelete={handlePromptDelete}
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
      promptsLabel={studioCopy.callsLabel}
      commissions={commissionRows}
      // (F11, 2026-11-05) the strip's two hints are the dictionary's —
      // the pane feeds the atoms, it owns no literals.
      laneHint={studioCopy.keyframeLaneHint}
      emptyPromptsHint={studioCopy.stripEmptyPromptsHint}
      promptsHeight={64}
      onPromptAdd={(frame) => addCallAt(docFromFilm(frame))}
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

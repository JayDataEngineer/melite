/**
 * MotionCardEditor — the drill-down surface for a genre:"motion" card
 * (kimodo text→motion). Turns the card into a live 3D stage like the Body
 * Card: the somax mannequin rendered from the run's motion NPZ, a scrubber
 * strip, an 8-angle azimuth ring, click-drag joint refinement, and the
 * VNCCS export pair (mesh + openpose at an azimuth).
 *
 * Data flow (all client-side, mirrors MotionViewer):
 * 1. npzUrl from stage.result.artifacts["motion_npz"] (fallback: first
 * .npz asset) → loadMotionNpz (meters) + loadSomaSkin (neutral bind).
 * 2. precomputeDeformedVerts → (T, V, 3) meters → vertsToB64(…, cm) →
 * PoseViewer3D's deformedVerticesB64. The skin's bind mesh (meters →
 * cm) is handed over as customBindMesh so the viewer skips the
 * /poser/skin/mesh fetch entirely — the render is 1:1 with MotionViewer.
 * 3. Playback is PoseViewer3D's own AnimController (animate prop); the
 * scrubber reads frameIdx (throttled ~10fps) + seeks by state.
 *
 * FREEZE → STOP (2026-08-15): the studio SHELL owns the rail's Run row and
 * with it the interrupt (editorClient.stopRun → /v1/flows/stop → ComfyUI
 * /interrupt — the kimodo node's per-step hook makes the abort land
 * mid-generation). The tenant carries ZERO rpc imports: its only write
 * channel is onSave (E1, enforced by card-studio-boundary.test.ts).
 *
 * REPOSE (Phase B): edit mode drives PoseViewer3D's joint gizmos. The
 * sculpt is re-skinned client-side (edited joints cm→m → deformFrame →
 * vertsToB64 → editedDeformedB64). "Repose" patches the current frame's
 * rotations (patchFrame), truncates the motion to frameIdx+1, writes an NPZ
 * data URL, and saves it as prev_motion_artifact (the chain slot —
 * _upload_input_images converts the data URL to a bare .npz). The user hits
 * Run separately — kimodo conditions the next generation on the saved pose.
 * Zero backend changes.
 *
 * NO-RUN STATE (2026-08-10, policy: "compare it to the Kimodo Pose
 * Studio"): the stage ALWAYS renders. Before any run exists there is no NPZ,
 * so PoseViewer3D receives no deformed vertices and SkinnedHumanoid falls
 * back to the bind pose — the neutral somax mannequin, live and interactive
 * (orbit/zoom/azimuth), exactly like opening the pose studio. Scrubber,
 * Refine, and Export stay honestly disabled ("run the card" hints) — no
 * placeholder preview, no blank box.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
 AlertTriangle, Info, Pause, PlayAlt as Play, Download, EyeAlt as Eye, EyeOff,
 RefreshCw, Move, RotateCw, RotateCcw, Target, Plus, ImagePlus, X, Link2,
 PersonStanding, User,
} from "@melite/card-base/icons"
import * as THREE from "three"
import { PoseViewer3D, type CameraFraming } from "@melite-plugin/motion/ui/viewer3d"
import { Button } from "@deepseek-ai/dsh-client-ui-primitives"
import type { JointMoveEvent } from "@melite-plugin/motion/ui/viewer3d"
import { useToastStore } from "@melite/card-base/toast"
import { SpecPanel, resolveValue, useFormSpec } from "@melite/card-base"
import type { CardStage } from "@melite/contracts"
import { stageSlots } from "@melite/catalog"
import { formOf } from "@melite/catalog"
import { collectStageUrls, ensureDraftId, pollFlowRun } from "@melite/catalog"
import {
 loadMotionNpz, precomputeDeformedVerts, precomputeDeformedVertsChunked, vertsToB64, stepAzimuth,
 jointsToCm, jointsFromCm, patchFrame, writeNpz, npzToDataUrl,
 type MotionAzimuth, type MotionNpz,
} from "@melite/formats"
import { loadSomaSkin, deformFrame, type SomaSkin } from "@melite/formats"
import { loadGlbSkin, NotSomaxGlbError } from "@melite/formats"
import {
 MotionExportDialog, type ThreeCtx,
 type StageRect, DEFAULT_STAGE_RECT,
} from "./MotionExportDialog"
import {
 makeTimelineId,
 type TimelineKeyframe, type TimelineInterval, type TimelinePrompt,
} from "@melite-plugin/timeline/ui/timeline"
import {
  ASSET_DRAG_MIME, PaneHeader, PaneShell,
  Skeleton, SlotSquare, Tip,
  useMotionThumbStore, ViewportAnchor, ViewportFrame, WirePickerModal,
} from "./kit"
import { cn, readAsDataURL } from "@melite/card-base/chrome"
import { StudioShell, defineShellDeclaration } from "@melite/card-base/shell"
import s from "./component.module.css"
import { MotionTimelineBar } from "@melite-plugin/timeline/ui/timeline"
import {
 snapshotConstraint, serializeConstraints, hydrateConstraints,
 stampEditedPose, decodeF32,
 serializeMotionPrompts, hydrateMotionPrompts, carveNewPromptCard,
 untanglePrompts, MOTION_CONSTRAINTS_PARAM, MOTION_PROMPTS_PARAM,
 type MotionConstraint,
} from "@melite/formats/motionConstraints"

/** stage.params key for the Motion Card background image (option b). A user
 *  image rendered behind the mannequin in place of the dark #0e0e1a stage.
 *  UI-only — never sent to ComfyUI (registered in compile.ts's
 *  _KNOWN_NON_SIG_PARAMS so it's stripped before the run). Holds either a
 *  data: URL (file picker) or an asset URL (e.g. a scene-flow output). */
const MOTION_BG_IMAGE_PARAM = "motion_bg_image"

/** stage.params key for the Motion Card preview BODY (2026-08-15 character
 *  import): a SOMAX-rigged character GLB the motion previews ON — the
 *  studio's live viewport skins it client-side (lib/glbSkin.ts → the same
 *  LBS as the neutral mannequin), and the runner's post-run preview bake
 *  bakes each output NPZ onto it instead of the mannequin (the explicit-
 *  import carve-out of the 2026-07-31 mannequin-default policy).
 *
 *  A REAL wire-level param, NOT UI-only: kimodo_motion's family signature
 *  declares it (the card lane's input kind → glb, form_motion_kimodo
 *  input slot), so the agent can set it headlessly. In the studio it renders as
 *  an INPUT SUBCARD (a SlotSquare — the same square the image inputs use,
 *  per the user directive): file pick / asset drop / OS drop / WIRE to an
 *  upstream 3D card's GLB output (wired XOR attached — the SlotGrid
 *  contract). Holds a data: URL (upload) or an asset URL. */
const MOTION_PREVIEW_GLB_PARAM = "preview_glb"

const FLOOR_LIFT_Y = 0.02

interface MotionCardEditorProps {
 stage: CardStage
 onSave: (params: Record<string, unknown>) => void
 /** ALL stages of the enclosing run, in array order — the preview-body
 *  subcard's wire picker restricts to indices BEFORE this card. */
 upstreams?: CardStage[]
 /** Wire/unwire the preview_glb slot (the store's setSlotInput, stage-
 *  scoped by the studio shell). Omit to hide the wire affordance. */
 onWireSlot?: (
  slotKey: string,
  upstreamId: string | null,
  outputName?: string | null,
 ) => void
}

// Accepts {stage, onSave, upstreams?, onWireSlot?} — assignable to
// StudioTenantProps (E1); `running` is shell business now (the rail's Stop
// button owns the interrupt).
export function MotionCardEditor({
 stage, onSave, upstreams = [], onWireSlot,
}: MotionCardEditorProps) {
 const toast = useToastStore((s) => s.addToast)
 // RULE B — THE FORM LAW (operator, 2026-09-18: "All Cards must be
 // Forms, with seams for overrides"): the card's schema-declared
 // params render through the SHARED SpecPanel — the generic
 // schemastery-protected surface on the DSH primitives. This studio
 // claimed cards.stage.view and (with it) replaced the standard
 // form, which left seed/steps/samples/cfg with NO surface at all.
 // The timeline stays the DOCUMENT seam — its prompt cards, length,
 // and constraint keyframes write the SAME declared keys (one
 // vocabulary, the override seam; never a second param system).
 const { spec: kimodoSpec, error: kimodoError } = useFormSpec("kimodo")
 const userParams = typeof stage.params === 'object' && stage.params !== null
   ? stage.params as Record<string, unknown> : {}
 // the initial-value law: ABSENT alone seeds (the spec's own
 // defaults) — resolveValue is the estate's pure resolver
 // (defaults → model_defaults → user). The timeline's writes sit in
 // the user layer and win, so both surfaces read ONE truth.
 const paramValues = useMemo(
   () => kimodoSpec !== null ? resolveValue(kimodoSpec, userParams) : userParams,
   [kimodoSpec, userParams])
 const onParamEdit = useCallback((name: string, value: unknown): void => {
   onSave({ [name]: value })
 }, [onSave])

 // ── Asset resolution: the motion NPZ from the run result ────────────────
 // Guards: artifacts/assetUrls can carry non-string entries from revived
 // docs (2026-08-10 crash: u.endsWith on undefined) — never assume.
 const npzUrl = useMemo(() => {
 const arts = stage.result?.artifacts
 if (arts) {
 const named = arts["motion_npz"]
 if (typeof named === "string") return named
 const npzArt = Object.values(arts).find(
 (u): u is string => typeof u === "string" && u.endsWith(".npz"),
 )
 if (npzArt) return npzArt
 }
 return (
 stage.result?.assetUrls?.find(
 (u): u is string => typeof u === "string" && u.endsWith(".npz"),
 ) ?? null
 )
 }, [stage.result])

 // ── Loads ────────────────────────────────────────────────────────────────
 // The preview BODY (2026-08-15 character import) — an INPUT SUBCARD, the
 // same square the image inputs render (the user directive: "that has to
 // be an input subcard just like the image input has subcards"): one
 // SlotSquare for the preview_glb slot with file pick / OS drop / asset
 // drop / WIRE to an upstream 3D card. A slot is EITHER wired OR manually
 // attached — never both (the SlotGrid contract): attach writes the param
 // AND unwires; wire writes the graph edge AND clears the param.
 const [bodyGlb, setBodyGlbState] = useState<string | null>(null)
 const [bodyNotice, setBodyNotice] = useState<string | null>(null)
 const [bodyWireOpen, setBodyWireOpen] = useState(false)
 const setBodyGlb = useCallback((url: string | null) => {
 setBodyGlbState(url)
 setBodyNotice(null)
 onSave(url ? { [MOTION_PREVIEW_GLB_PARAM]: url } : { [MOTION_PREVIEW_GLB_PARAM]: "" })
 }, [onSave])

 // The wire state, resolved client-side (the mask-studio read): inputs[i]
 // ↔ the i-th slot of stageSlots(params). preview_glb must be IN the
 // card's declared+present slots for the wire to exist at all — old cards
 // (params without the key) get manual-attach only until a save seeds it.
 const bodySlotIdx = useMemo(
 () => stageSlots(stage.params, formOf(stage.service), stage.service)
 .indexOf(MOTION_PREVIEW_GLB_PARAM),
 [stage.params, stage.service],
 )
 const bodyWiredId = bodySlotIdx >= 0 ? stage.inputs[bodySlotIdx] : ""
 const bodyWiredUpstream = bodyWiredId
 ? upstreams.find((u) => u.id === bodyWiredId)
 : undefined
 const bodyWired = !!bodyWiredUpstream
 // The upstream's GLB artifact — the primary output of a 3D card; scan the
 // artifacts map then assetUrls for the first .glb (the same shape the
 // runner's collectUpstreamResults injects at run time).
 const bodyWiredUrl = bodyWiredUpstream?.result
 ? (
 [...Object.values(bodyWiredUpstream.result.artifacts ?? {}),
 ...bodyWiredUpstream.result.assetUrls].find(
 (u): u is string =>
 typeof u === "string" && /\.(glb|gltf)(\?|#|$)/i.test(u),
 ) ?? null
 )
 : null
 // Effective body: the wire's resolved GLB when wired, else the manual
 // attachment. Wired + not-yet-run → "" (the neutral mannequin holds the
 // stage; the square shows the wired badge + "waiting").
 const bodySrc = bodyWired ? (bodyWiredUrl ?? "") : (bodyGlb ?? "")

 // Hydrate the MANUAL attachment from stage.params once per card (a wired
 // slot keeps params null — the wire branch above carries it).
 useEffect(() => {
 const v = stage.params?.[MOTION_PREVIEW_GLB_PARAM]
 setBodyGlbState(typeof v === "string" && v.length > 0 ? v : null)
 setBodyNotice(null)
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [stage.id])

 // The skin — the character GLB when a body is set, else the neutral somax
 // mannequin (session-cached in somaSkin.ts; the stage renders the
 // bind-pose figure even before any run exists — pose-studio parity, no
 // "run first to see the card"). A body swap RE-SKINS: skin flips → the
 // motion precompute below (keyed on skin) re-runs on the new body.
 // Failure semantics: neutral-skin failure is a HARD error (nothing can
 // render — as before); a CHARACTER import that fails (not SOMAX-rigged,
 // fetch error) is a visible notice + TOAST + explicit fallback to the
 // mannequin — never a dead viewport, never a silent switch.
 const [skin, setSkin] = useState<SomaSkin | null>(null)
 useEffect(() => {
 let cancelled = false
 setSkin(null)
 if (!bodySrc) {
 loadSomaSkin()
 .then((s) => { if (!cancelled) setSkin(s) })
 .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load skin") })
 return () => { cancelled = true }
 }
 loadGlbSkin(bodySrc)
 .then((s) => { if (!cancelled) setSkin(s) })
 .catch(async (e) => {
 if (cancelled) return
 // ANNY → SOMAX, behind the scenes (operator order, 2026-09-06:
 // "the conversion is BAKED into the kimido / somax library, you
 // just have to use the python function"): a bare human mesh (the
 // anny bake, TRELLIS, an upload) rides the queue as flow
 // body-to-somax — the autorig pack's SOMA-77 template weight
 // transfer — and the rigged GLB skins here. One try, no retry (a
 // retry would start a SECOND run — INFERENCE LAW).
 if (e instanceof NotSomaxGlbError) {
 setBodyNotice(
 `Body isn't SOMAX-rigged — converting through the queue… (${e.message})`)
 try {
 // CARD BIRTH LAW (operator order 2026-09-06): the start door
 // 4xxes a start without a doc-backed draft_id — compose the card
 // first, ride the minted id on the envelope.
 const somaxBody: Record<string, unknown> = { flow: "body-to-somax", glb: bodySrc }
 somaxBody.draft_id = await ensureDraftId(somaxBody)
 const res = await fetch("/v1/flows/start", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify(somaxBody),
 })
 const text = await res.text()
 if (!res.ok) {
 throw new Error(`body-to-somax queue refused: HTTP ${res.status}${text ? `: ${text.slice(0, 300)}` : ""}`)
 }
 let data: Record<string, unknown>
 try { data = JSON.parse(text) as Record<string, unknown> } catch {
 throw new Error("body-to-somax queue returned a non-JSON body")
 }
 const runId = data.run_id
 if (typeof runId !== "string" || !runId) {
 throw new Error("body-to-somax queue returned no run_id")
 }
 const status = await pollFlowRun(runId, undefined, { onTick: () => undefined })
 const rigged =
 collectStageUrls(status.stages).find((u) => /\.glb(\?|#|$)/i.test(u)) ?? null
 if (!rigged) {
 throw new Error(`body-to-somax run ${runId} produced no rigged GLB`)
 }
 const s2 = await loadGlbSkin(rigged)
 if (cancelled) return
 setSkin(s2)
 setBodyNotice(null)
 toast("success", "Body converted to SOMAX rig — previewing your character.")
 return
 } catch (e2) {
 if (cancelled) return
 const msg2 = e2 instanceof Error ? e2.message : String(e2)
 setBodyNotice(`auto-convert failed — ${msg2}`)
 toast("error", `SOMAX conversion failed — ${msg2}. Showing the neutral mannequin.`)
 loadSomaSkin()
 .then((s) => { if (!cancelled) setSkin(s) })
 .catch((e3) => { if (!cancelled) setError(e3 instanceof Error ? e3.message : "Failed to load skin") })
 return
 }
 }
 const msg = e instanceof NotSomaxGlbError ? e.message
 : e instanceof Error ? e.message : "Failed to load character GLB"
 setBodyNotice(msg)
 toast("error", `Preview body not loaded — ${msg}. Showing the neutral mannequin.`)
 loadSomaSkin()
 .then((s) => { if (!cancelled) setSkin(s) })
 .catch((e2) => { if (!cancelled) setError(e2 instanceof Error ? e2.message : "Failed to load skin") })
 })
 return () => { cancelled = true }
 }, [bodySrc, toast])

 // Motion load: NPZ + LBS precompute (single source). Only when a run
 // actually produced a motion — until then npz stays null and the viewer
 // shows the bind pose.
 const [npz, setNpz] = useState<MotionNpz | null>(null)
 const [allVertsM, setAllVertsM] = useState<Float32Array | null>(null)
 const [error, setError] = useState<string | null>(null)
 const [loading, setLoading] = useState(false)
 // A pose the user refined in edit mode then KEPT (via "Done"). Must be
  // declared before the memos/effects that read it (jointsFlatCm, the
 // deform effect, displayJointsM) — JS temporal-dead-zone, useMemo runs at
 // render. Cleared by a new run / "Reset". `joints` are cm (PoseViewer3D's
 // joint unit), matching editableJoints.
 const [keptEdit, setKeptEdit] = useState<{ joints: Float32Array; frame: number } | null>(null)

 useEffect(() => {
 if (!npzUrl) {
 setNpz(null); setAllVertsM(null); setError(null); setLoading(false)
 // No motion → no edit session either (stale joints would linger).
 setEditMode(false); setPlaying(false)
 setKeptEdit(null); setEditedDeformedB64(null)
 return
 }
 let cancelled = false
 setLoading(true)
 setError(null)
 ;(async () => {
 try {
 // The skin gates + re-keys this precompute (deps below): a character
 // import (or clear) flips `skin`, and the SAME motion re-skins onto
 // the new substrate — allVertsM is sized by the skin's vertexCount.
 if (!skin) return
 const [m, s] = await Promise.all([loadMotionNpz(npzUrl), Promise.resolve(skin)])
 if (cancelled) return
 // Compute frame 0 SYNCHRONOUSLY (~5ms — one deformFrame on the 18k-
 // vertex mesh) and set npz + seed verts TOGETHER. This gives an instant,
 // MATCHING preview: both the skeleton (from npz.posedJoints) and the mesh
 // show frame 0's real pose the moment the NPZ arrives. Without this, the
 // mesh lags in T-pose for ~1s while the chunked precompute runs behind
 // ("figure stands in a t-pose while the skeleton doesn't match").
 setSkin(s)
 const V0 = s.vertexCount
 const stride0 = V0 * 3
 const seedVerts = new Float32Array(m.T * stride0)
 deformFrame(
 m.globalRotMats.subarray(0, 77 * 9),
 m.posedJoints.subarray(0, 77 * 3),
 s,
 seedVerts.subarray(0, stride0),
 )
 for (let i = 0; i < stride0; i++) seedVerts[i] *= 100 // meters → cm
 // Seed remaining frames with frame 0 so the array is valid at any index
 // (timeline scrubbing during the precompute window won't read zeros).
 // Playback stays paused until the full data arrives, then auto-starts.
 const f0 = seedVerts.subarray(0, stride0)
 for (let t = 1; t < m.T; t++) seedVerts.set(f0, t * stride0)
 setNpz(m)
 setFrameIdx(0)
 setPlaying(false)
 setKeptEdit(null); setEditedDeformedB64(null)
 setAllVertsM(seedVerts)
 // Full chunked precompute — yields every ~3 frames (~10-20ms blocks) so
 // the main thread stays responsive (spinner keeps spinning, input is
 // serviced). Replaces the frame-0 seed with real per-frame verts. Output
 // is in CM → passed DIRECTLY to PoseViewer3D (no b64 roundtrip).
 const verts = await precomputeDeformedVertsChunked(m, s, true)
 if (cancelled) return
 setAllVertsM(verts)
 setPlaying(true)
 } catch (e) {
 if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load motion")
 } finally {
 if (!cancelled) setLoading(false)
 }
 })()
 return () => { cancelled = true }
 }, [npzUrl, skin])

 // ── Playback state ──────────────────────────────────────────────────────
 const [frameIdx, setFrameIdx] = useState(0)
 const [playing, setPlaying] = useState(true)
 // Space toggles playback (motion studio parity) — the strip buttons stay
 // clickable; the key handler ignores form inputs.
 useEffect(() => {
 if (!npz) return
 const onKey = (e: KeyboardEvent) => {
 const el = e.target as HTMLElement | null
 if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el?.isContentEditable) return
 if (e.code === "Space") {
 e.preventDefault()
 setPlaying((p) => !p)
 }
 }
 window.addEventListener("keydown", onKey)
 return () => window.removeEventListener("keydown", onKey)
 }, [npz])

 // ── Timeline constraint state (REAL pose payloads) ──────────────────────
 // The 6 keyframe lanes + prompts row render via MotionTimelineBar (the
 // pose-studio-style DOM bar, 2026-08-14; the vendored viser canvas
 // Timeline is retired from this card). `tlKeyframes` are the lane
 // diamonds (frame/track); `constraintPayloads` is the parallel map of
 // REAL pose data each diamond carries — keyed by uuid. On add, the pose
 // is snapshotted from the current motion NPZ (SOMA-77, meters) — the
 // same arrays kimodo's
 // constraint classes consume. This is what makes the bar FUNCTIONAL: every
 // keyframe is a real constraint, not a null shell. The payloads persist in
 // stage.params.motion_constraints (survive reloads) and transport to
 // melite-kimodo-nodes on Run so they drive generation (FullBodyConstraintSet /
 // EndEffectorConstraintSet / Root2DConstraintSet → raw()'s constraint_lst).
 const [tlKeyframes, setTlKeyframes] = useState<TimelineKeyframe[]>([])
 const [tlIntervals, setTlIntervals] = useState<TimelineInterval[]>([])
 const [tlPrompts, setTlPrompts] = useState<TimelinePrompt[]>([])
  const [constraintPayloads, setConstraintPayloads] = useState<Record<string, MotionConstraint>>({})

  // ── Undo / Redo (Ctrl+Z / Ctrl+Shift+Z) ────────────────────────────────
  // Snapshots ALL authoring state before each mutation so the user can step
  // back through timeline edits (prompt add/move/resize/delete/split/merge,
  // keyframe add/move/delete, interval add/move/delete) and joint-edit
  // operations (enter edit mode, stamp, repose, discard). Read via refs so
  // pushUndo stays stable (zero re-render cascade).
  type AuthoringSnapshot = {
    tlPrompts: TimelinePrompt[]
    tlKeyframes: TimelineKeyframe[]
    constraintPayloads: Record<string, MotionConstraint>
    tlIntervals: TimelineInterval[]
    editableJoints: Float32Array | null
    keptEdit: { joints: Float32Array; frame: number } | null
    editedDeformedB64: string | null
  }
  const undoStack = useRef<AuthoringSnapshot[]>([])
  const redoStack = useRef<AuthoringSnapshot[]>([])
  const [undoVersion, setUndoVersion] = useState(0)
  // Ref mirrors — pushUndo reads these (stable callback, no deps).
  const tlPromptsRef = useRef(tlPrompts)
  const tlKeyframesRef = useRef(tlKeyframes)
  const constraintPayloadsRef = useRef(constraintPayloads)
  const tlIntervalsRef = useRef(tlIntervals)
  const keptEditRef = useRef<{ joints: Float32Array; frame: number } | null>(null)
  const editedDeformedB64Ref = useRef<string | null>(null)
  // Sync refs every render (before JSX return — safe, cheap).
  tlPromptsRef.current = tlPrompts
  tlKeyframesRef.current = tlKeyframes
  constraintPayloadsRef.current = constraintPayloads
  tlIntervalsRef.current = tlIntervals
  // editableJointsRef already exists (line 643) — reuse it.
  keptEditRef.current = keptEdit
  // editedDeformedB64Ref synced after its state declaration (line ~758).

  const captureSnapshot = useCallback((): AuthoringSnapshot => ({
    tlPrompts: tlPromptsRef.current.map((p) => ({ ...p })),
    tlKeyframes: tlKeyframesRef.current.map((k) => ({ ...k })),
    constraintPayloads: Object.fromEntries(
      Object.entries(constraintPayloadsRef.current).map(([k, v]) => [k, { ...v }]),
    ),
    tlIntervals: tlIntervalsRef.current.map((iv) => ({ ...iv })),
    editableJoints: editableJointsRef.current ? new Float32Array(editableJointsRef.current) : null,
    keptEdit: keptEditRef.current
      ? { joints: new Float32Array(keptEditRef.current.joints), frame: keptEditRef.current.frame }
      : null,
    editedDeformedB64: editedDeformedB64Ref.current,
  }), []) // stable — reads from refs

  /** Snapshot current state before a mutation. Call this FIRST in every
   *  mutation handler (before the setState that changes authoring state). */
  const pushUndo = useCallback(() => {
    undoStack.current.push(captureSnapshot())
    redoStack.current = []
    if (undoStack.current.length > 80) undoStack.current.shift()
    setUndoVersion((v) => v + 1)
  }, [captureSnapshot])

  const restoreSnapshot = useCallback((snap: AuthoringSnapshot) => {
    setTlPrompts(snap.tlPrompts)
    setTlKeyframes(snap.tlKeyframes)
    setConstraintPayloads(snap.constraintPayloads)
    setTlIntervals(snap.tlIntervals)
    setEditableJoints(snap.editableJoints)
    editableJointsRef.current = snap.editableJoints
    setKeptEdit(snap.keptEdit)
    setEditedDeformedB64(snap.editedDeformedB64)
  }, [])

  const handleUndo = useCallback(() => {
    if (undoStack.current.length === 0) return
    redoStack.current.push(captureSnapshot())
    restoreSnapshot(undoStack.current.pop()!)
    setUndoVersion((v) => v + 1)
  }, [captureSnapshot, restoreSnapshot])

  const handleRedo = useCallback(() => {
    if (redoStack.current.length === 0) return
    undoStack.current.push(captureSnapshot())
    restoreSnapshot(redoStack.current.pop()!)
    setUndoVersion((v) => v + 1)
  }, [captureSnapshot, restoreSnapshot])

  // Keyboard: Ctrl+Z = undo, Ctrl+Shift+Z / Ctrl+Y = redo.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Never hijack typing in inputs / textareas / contentEditable.
      const el = e.target as HTMLElement | null
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el?.isContentEditable) return
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault(); handleUndo()
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault(); handleRedo()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [handleUndo, handleRedo])
  void undoVersion // suppress unused — triggers re-render for button disabled state

  // Guard: only push undo once per drag gesture (move handlers fire on every
  // pointermove — pushing on every tick would flood the stack). The ref tracks
  // the current drag target; reset to null after a short timeout so a new
  // gesture on the same target still gets undo.
  const dragUndoRef = useRef<string | null>(null)
  const dragUndoTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const maybePushDragUndo = useCallback((key: string) => {
    if (dragUndoRef.current === key) return // same gesture — skip
    if (dragUndoTimeout.current) clearTimeout(dragUndoTimeout.current)
    dragUndoRef.current = key
    pushUndo()
    // Reset after 300ms so a NEW gesture on the same target gets undo.
    dragUndoTimeout.current = setTimeout(() => { dragUndoRef.current = null }, 300)
  }, [pushUndo])

 // ── View state ──────────────────────────────────────────────────────────
 const [cameraView, setCameraView] = useState<MotionAzimuth>("az-0")
 // Framing (full body vs upper half) — pure view state, resets on unmount.
 const [framing, setFraming] = useState<CameraFraming>("full")
 const [showSkeleton, setShowSkeleton] = useState(false)
 // IN-PLACE (2026-08-15, demo parity): a pure VIEW toggle, like the demo's
 // inPlacePlayback — "toggles the figure to move across the stage or do
 // the exact same motion, but not actually move across the stage". Default
 // TRUE (the user's call: in-place is the working view, not out of place).
 // Never gated on a run — it works on the rest pose too (the old
 // disabled={!npz} made it dead pre-run: "ours is not toggleable"). The
 // GENERATION half of the demo's in-place story is the root2d lane on the
 // timeline (a pinned root steers the next run) — this button never
 // touches the data or the constraints.
 const [inPlace, setInPlace] = useState(true)
 const [exportOpen, setExportOpen] = useState(false)
 // EXPORT RECT (2026-08-15 rework, round 2): "press export → a rectangle
 // appears over the mesh character". The rect lives HERE (the overlay
 // renders on the live stage); the dialog reads it, offers typed exact
 // sizes, and crops its screenshot to it. ONE framing — the preset square
 // is gone; the 8-angle batch re-runs this same crop at the ring.
 const [stageRect, setStageRect] = useState<StageRect>(DEFAULT_STAGE_RECT)
 const threeCtxRef = useRef<ThreeCtx | null>(null)

 // ── Tile thumbnail capture ──────────────────────────────────────────────
 // Motion outputs are NPZ (not viewable as an <img>). When the mesh renders
 // in this drilldown, capture a canvas screenshot and stash it in the
 // motion-thumb store so the COLLAPSED tile can show a visual preview
 // instead of a broken-image icon. The store persists to localStorage and
 // has zero impact on the flow cacheKey or run params.
 const setThumb = useMotionThumbStore((s) => s.setThumbnail)
 const thumbCapturedForUrl = useRef<string | null>(null)
  useEffect(() => {
    if (!npzUrl || !npz || !allVertsM) return
    if (thumbCapturedForUrl.current === npzUrl) return
    let idleId = 0
    idleId = requestIdleCallback(() => {
      const ctx = threeCtxRef.current
      if (!ctx) return
      try {
        ctx.gl.render(ctx.scene, ctx.camera)
        ctx.gl.domElement.toBlob((blob) => {
          if (!blob || blob.size < 100) return
          // Shared readAsDataURL — the ONE read path every slot-shaped
          // attach uses (best-effort thumbnail: a read failure drops the
          // tile back to the genre placeholder, same as before).
          void readAsDataURL(blob).then((url) => {
            if (url.length > 100) {
              thumbCapturedForUrl.current = npzUrl
              setThumb(stage.id, url)
            }
          }).catch(() => { /* thumbnail is best-effort — keep the placeholder */ })
        }, "image/png")
      } catch {
        // WebGL context lost or canvas tainted — non-fatal; the tile
        // falls back to the motion-genre placeholder.
      }
    }, { timeout: 2000 })
    return () => cancelIdleCallback(idleId)
  }, [npz, allVertsM, npzUrl, stage.id, setThumb])

 // ── Stage background image (option b): replace the dark #0e0e1a void
 // behind the mannequin with a user image. SAME multi-source pattern as
 // the image input subcards (InputCardEditor / MaskStudioEditor):
 //   • file picker (the Background button's hidden native input — DSH
 //     ships no file-picker atom, so the picker stays a plain <input>)
 //   • OS file drag-drop onto the stage (Files)
 //   • ASSET drag-drop from the Media sidebar (ASSET_DRAG_MIME — the
 //     payload carries the URL directly, no fetch/conversion needed)
 // Persisted to stage.params; applied two ways:
 //   1. THREE scene.background via threeCtxRef — the canvas paints the
 //      image, so the Export screenshot + the tile thumbnail carry it.
 //      Dormant until PoseViewer3D registers the ctx; no-ops otherwise.
 //   2. A CSS <img> behind the viewer — the visible layer when the canvas
 //      is transparent. Harmless when the canvas is opaque.
 const bgInputRef = useRef<HTMLInputElement | null>(null)
 const [bgImage, setBgImage] = useState<string | null>(null)
 const [bgDragOver, setBgDragOver] = useState(false)
 const bgTexRef = useRef<THREE.Texture | null>(null)

 const setBg = useCallback((url: string | null) => {
   setBgImage(url)
   onSave(url ? { [MOTION_BG_IMAGE_PARAM]: url } : { [MOTION_BG_IMAGE_PARAM]: "" })
 }, [onSave])

 // Hydrate from stage.params once per card (mirrors MOTION_CONSTRAINTS_PARAM).
 useEffect(() => {
   const v = stage.params?.[MOTION_BG_IMAGE_PARAM]
   setBgImage(typeof v === "string" && v.length > 0 ? v : null)
   // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [stage.id])

 // File → data URL → persist (shared readAsDataURL — the ONE read path
 // every slot-shaped attach uses; InputCardEditor / SlotGrid / MaskStudio).
 const handleBgFile = useCallback((file: File | null) => {
   if (!file) return
   void readAsDataURL(file).then(setBg)
 }, [setBg])

 // Manual attach of a body (the SlotGrid contract): writes the param AND
 // unwires — a slot is wired XOR attached, never both. An unknown slot
 // (params without the key — old cards) makes the unwire a store no-op;
 // the param save seeds the key for the NEXT wire.
 const attachBody = useCallback((url: string | null) => {
   if (url) onWireSlot?.(MOTION_PREVIEW_GLB_PARAM, null, null)
   setBodyGlb(url)
 }, [onWireSlot, setBodyGlb])
 const isGlbUrl = useCallback((u: string) => /\.(glb|gltf)(\?|#|$)/i.test(u), [])

 // STAGE drop (ASSET_DRAG_MIME OR OS file) — dispatched by TYPE
 // (2026-08-15): a GLB → the preview body (a character import), an image
 // → the background. Asset URLs (e.g. /v1/assets/runs/...) load
 // straight into both the viewer and the exporter — no data-URL
 // conversion needed (same contract SlotSquare.handleDrop uses).
 const handleStageDrop = useCallback((e: React.DragEvent) => {
   e.preventDefault()
   setBgDragOver(false)
   const asset = e.dataTransfer.getData(ASSET_DRAG_MIME)
   if (asset) {
     try {
       const payload = JSON.parse(asset) as { url?: string }
       if (payload.url) {
         if (isGlbUrl(payload.url)) attachBody(payload.url)
         else setBg(payload.url)
         return
       }
     } catch { /* malformed — fall through to file drop */ }
   }
   const file = e.dataTransfer.files?.[0]
   if (!file) return
   const isGlbFile = /\.glb$/i.test(file.name) || file.type === "model/gltf-binary"
   if (isGlbFile) {
     void readAsDataURL(file).then(attachBody)
     return
   }
   handleBgFile(file)
 }, [setBg, handleBgFile, attachBody, isGlbUrl])

 // File → data URL → the body param (the ONE read path every slot-shaped
 // attach uses). Validates the extension FIRST — a dropped .png is a bg
 // candidate, not a body.
 const handleBodyFile = useCallback((file: File) => {
   if (!/\.glb$/i.test(file.name) && file.type !== "model/gltf-binary") {
     toast("error", "Preview body must be a .glb (SOMAX-rigged character).")
     return
   }
   void readAsDataURL(file)
   .then(attachBody)
   .catch((err: unknown) => toast(
     "error", `Could not read GLB: ${err instanceof Error ? err.message : String(err)}`,
   ))
 }, [attachBody, toast])

 // Prior stages by array index (the wire picker's backwards-only rule).
 const priorStages = useMemo(() => {
   const idx = upstreams.findIndex((s) => s.id === stage.id)
   return idx === -1 ? upstreams : upstreams.slice(0, idx)
 }, [upstreams, stage.id])

 // Push the background into the live THREE scene so the Export screenshot
 // + tile thumbnail include it. Re-runs when the motion data lands (the
 // ctx is registered by PoseViewer3D on mount — same timing as the thumb
 // capture above). Disposes the previous texture to avoid a GPU leak.
 useEffect(() => {
   const ctx = threeCtxRef.current
   if (!ctx) return
   if (bgTexRef.current) {
     bgTexRef.current.dispose()
     bgTexRef.current = null
   }
   if (bgImage) {
     const tex = new THREE.TextureLoader().load(bgImage)
     tex.colorSpace = THREE.SRGBColorSpace
     bgTexRef.current = tex
     ctx.scene.background = tex
   } else {
     ctx.scene.background = new THREE.Color("#0e0e1a")
   }
   // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [bgImage, npzUrl, allVertsM])

 // ── Authoring surface = the timeline prompt CARDS (demo parity). There
 // is NO standalone prompt box: a prompt without a time window + body
 // place is useless, which is exactly why the cards (frame range) and
 // the constraint lanes (body region) are the only surface. The FIRST
 // non-empty card's text is mirrored to the form's `prompt` param so
 // the single-card case still drives generation — the node's multi-
 // prompt path needs >= 2 motion_prompts segments; below that it
 // falls back to `prompt` (nodes.py:554 `if len(cleaned) >= 2`).
 const firstNonEmptyCardText = useMemo(
 () => tlPrompts.find((p) => p.text.trim())?.text ?? "",
 [tlPrompts],
 )
 useEffect(() => {
 onSave({ prompt: firstNonEmptyCardText })
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [firstNonEmptyCardText])

 // ── Rest pose (upstream Kimodo parity) ──────────────────────────────────
 // The skin's neutral joints + rotations — the TS equivalent of
 // vendor/kimodo `skeleton.neutral_joints`. When no run exists, this is the
 // "motion" (T=1) every pose consumer operates on, so refine/export work
 // BEFORE any GPU inference. See SomaSkin.restJoints doc.
 const restNpz = useMemo<MotionNpz | null>(() => {
 if (!skin) return null
 return { posedJoints: skin.restJoints, globalRotMats: skin.restRots, fps: 30, T: 1 }
 }, [skin])
 // The effective motion: the real run's NPZ if present, else the rest pose.
 const effectiveNpz = npz ?? restNpz

 // ── PoseViewer3D inputs (PoseViewer3D speaks cm) ────────────────────────
 // Precompute deformed verts for the REST POSE ONLY (T=1 — instant). This
 // is the fallback shown before/after a real run. The full motion's vertices
 // come from allVertsM (set by the async chunked NPZ-load effect — already
 // in cm). Computing the full motion here would block render for seconds.
 const effectiveVertsM = useMemo(() => {
 if (!restNpz || !skin) return null
 return precomputeDeformedVerts(restNpz, skin)
 }, [restNpz, skin])
 // allVertsM is already CM (from precomputeDeformedVertsChunked outputCm=true)
 // → pass directly to PoseViewer3D via deformedVertsDirect. No vertsToB64!
 // The rest-pose fallback (effectiveVertsM, meters, T=1) still goes through
 // b64 — it's 1 frame so the encode is ~0.2ms (negligible).
 const restB64 = useMemo(
 () => effectiveVertsM ? vertsToB64(effectiveVertsM, true) : null,
 [effectiveVertsM],
 )

  // T × 77 × 3 Float32Array (cm) — the skeleton overlay's flat prop shape.
  // A kept refine overrides its frame so the skeleton holds the edited pose
  // after "Done". Produced directly as a Float32Array (no nested intermediate)
  // to avoid 11,550 small-array allocations + GC pressure per generation.
  const jointsFlatCm = useMemo(() => {
    const src = effectiveNpz
    if (!src) return null
    const T = src.T
    const flat = new Float32Array(T * 77 * 3)
    const s = src.posedJoints
    for (let f = 0; f < T; f++) {
      const base = f * 77 * 3
      for (let i = 0; i < 77 * 3; i++) flat[base + i] = s[base + i] * 100
    }
    if (keptEdit && keptEdit.frame < T) {
      const base = keptEdit.frame * 77 * 3
      for (let j = 0; j < 77; j++) {
        flat[base + j * 3] = keptEdit.joints[j * 3]
        flat[base + j * 3 + 1] = keptEdit.joints[j * 3 + 1]
        flat[base + j * 3 + 2] = keptEdit.joints[j * 3 + 2]
      }
    }
    return flat
  }, [effectiveNpz, keptEdit])

 // Neutral bind mesh (meters → cm) — bypasses /poser/skin/mesh entirely.
 const customBindMesh = useMemo(() => {
 if (!skin) return null
 const bv = skin.bindVertices
 const vertices: number[][] = []
 for (let i = 0; i < bv.length; i += 3) vertices.push([bv[i] * 100, bv[i + 1] * 100, bv[i + 2] * 100])
 const f = skin.faces
 const faces: number[][] = []
 for (let i = 0; i < f.length; i += 3) faces.push([f[i], f[i + 1], f[i + 2]])
 return { vertices, faces }
 }, [skin])

 // The viewer's mesh lift (mirrors PoseViewer3D's computeMeshLiftY).
 const liftY = useMemo(() => {
 if (!skin) return 0
 let minY = Infinity
 const bv = skin.bindVertices
 for (let i = 1; i < bv.length; i += 3) if (bv[i] < minY) minY = bv[i]
 return isFinite(minY) ? FLOOR_LIFT_Y - minY : FLOOR_LIFT_Y
 }, [skin])

 // ── Edit mode (Phase B) ─────────────────────────────────────────────────
 const [editMode, setEditMode] = useState(false)
 const [editableJoints, setEditableJoints] = useState<Float32Array | null>(null)
 // Ref mirror of editableJoints so handleJointMove can read the latest value
 // synchronously (without a nested setState) for the live-bind payload write.
 const editableJointsRef = useRef<Float32Array | null>(null)
 const [selectedJoint, setSelectedJoint] = useState<number | null>(null)
  const [editedDeformedB64, setEditedDeformedB64] = useState<string | null>(null)
  const [reposing, setReposing] = useState(false)
  // Sync undo refs for states declared here (keptEdit is earlier, synced in
  // the undo block; editedDeformedB64 lands here).
  keptEditRef.current = keptEdit
  editedDeformedB64Ref.current = editedDeformedB64

 // The current frame's joints (77×3 meters) — the edit-mode starting point
 // and the export's displayed joints. Falls back to the rest pose when no
 // run exists so refine/export work pre-inference (Kimodo demo parity).
 const currentJointsM = useMemo(() => {
 const src = effectiveNpz
 if (!src) return null
 const i = Math.min(frameIdx, src.T - 1) * 77 * 3
 return src.posedJoints.slice(i, i + 77 * 3)
 }, [effectiveNpz, frameIdx])

 // The fullbody keyframe sitting at the current frame, if any. When present,
 // edit mode is AUTHORING into that keyframe (drag a joint → the keyframe's
 // constraint payload absorbs the new pose). When absent, edit mode is a
 // FREE sculpt for Repose (the chain path). This binding is what makes the
 // timeline WRITABLE — parity with the demo's "edit the pose at a keyframed
 // frame → the constraint updates."
 const fullbodyKfAtFrame = useMemo(
 () => tlKeyframes.find((k) => k.track_id === "fullbody" && k.frame === frameIdx) ?? null,
 [tlKeyframes, frameIdx],
 )

 const toggleEdit = () => {
 if (!currentJointsM) return
 if (editMode) {
 // DONE — keep the refined pose. The edited body stays (PoseViewer3D's
 // activeFlat = hasEdited ? editedFlat : flat, so not clearing
 // editedDeformedB64 leaves the body on the edit); the skeleton holds
 // via keptEdit overlay. The effect below recomputes the deformed mesh
 // for the kept frame so scrubbing away + back re-applies it.
 setKeptEdit(editableJoints ? { joints: editableJoints, frame: frameIdx } : null)
 setEditMode(false)
 setSelectedJoint(null)
  } else {
  // If a kept edit exists at this frame, continue FROM it (pick up where
  // the user left off). Else if a fullbody keyframe was stamped here,
  // edit from its authored pose. Else fall back to the raw NPZ frame.
  pushUndo()
  const fromKept = keptEdit && keptEdit.frame === frameIdx ? keptEdit.joints : null
 const stampedPayload = fullbodyKfAtFrame ? constraintPayloads[fullbodyKfAtFrame.uuid] : null
 const baseM = stampedPayload && stampedPayload.kind === "fullbody"
 ? decodeF32(stampedPayload.jp)
 : currentJointsM
 const next = fromKept ? fromKept : jointsToCm(baseM)
 editableJointsRef.current = next
 setEditableJoints(next)
 setSelectedJoint(null)
 setEditMode(true)
 setPlaying(false)
 }
 }

 // Discard the kept edit at the current frame — body + skeleton revert to
 // the raw NPZ. Available as "Reset" while not in edit mode.
  const discardKeptEdit = useCallback(() => {
  pushUndo()
  setKeptEdit(null)
  setEditedDeformedB64(null)
  }, [])

 const handleJointMove = useCallback((e: JointMoveEvent) => {
 const prev = editableJointsRef.current
 if (!prev) return
 // IK moves report the full post-solve joint set; FK edits move one joint.
 const next = e.fullJoints ? e.fullJoints : prev.slice()
 if (!e.fullJoints) {
 next[e.idx * 3] = e.position.x
 next[e.idx * 3 + 1] = e.position.y
 next[e.idx * 3 + 2] = e.position.z
 }
 editableJointsRef.current = next // sync immediately for the next tick
 setEditableJoints(next)
 // LIVE-BIND: if a fullbody keyframe is bound to the current frame, the
 // edit WRITES into its constraint payload. jp = the authored joint
 // positions (cm → m); jr = rotations reconstructed by patchFrame so
 // children follow the dragged joint. This is the bar being WRITABLE —
 // drag a joint, the keyframe at that frame becomes the new pose, Run
 // feeds it as a FullBodyConstraintSet. patchFrame on 77 joints is cheap
 // (microseconds); running it per drag tick keeps the payload live.
 const src = effectiveNpz
 const kf = fullbodyKfAtFrame
 if (!src || !kf) return
 const editedM = jointsFromCm(next)
 const patched = patchFrame(src.posedJoints, src.globalRotMats, editedM, frameIdx)
 const payload = stampEditedPose(
 editedM,
 patched.globalRotMats.subarray(frameIdx * 77 * 9, (frameIdx + 1) * 77 * 9),
 frameIdx,
 src.T,
 )
 setConstraintPayloads((p) => ({ ...p, [kf.uuid]: payload }))
 }, [effectiveNpz, fullbodyKfAtFrame, frameIdx])

 // STAMP: capture the currently-edited pose as a fullbody keyframe at the
 // current frame. Creates the keyframe if none is bound, then the live-bind
 // above takes over for subsequent drags. This is the explicit "write this
 // motion into the timeline" action — the user authored a pose, Stamp makes
 // it a constraint that drives generation.
  const stampConstraintAtFrame = useCallback(() => {
  const src = effectiveNpz
  if (!src || !editableJoints) {
  toast("error", "Enter edit mode and drag a joint first — nothing to stamp")
  return
  }
  pushUndo()
  const editedM = jointsFromCm(editableJoints)
 const patched = patchFrame(src.posedJoints, src.globalRotMats, editedM, frameIdx)
 const payload = stampEditedPose(
 editedM,
 patched.globalRotMats.subarray(frameIdx * 77 * 9, (frameIdx + 1) * 77 * 9),
 frameIdx,
 src.T,
 )
 const existing = fullbodyKfAtFrame
 if (existing) {
 setConstraintPayloads((prev) => ({ ...prev, [existing.uuid]: payload }))
 toast("success", `Updated keyframe at frame ${frameIdx + 1} (full-body)`)
 } else {
 const uuid = makeTimelineId()
 setConstraintPayloads((prev) => ({ ...prev, [uuid]: payload }))
 setTlKeyframes((prev) => [...prev, { uuid, track_id: "fullbody", frame: frameIdx, value: null, opacity: 1, locked: false }])
 toast("success", `Stamped authored pose → keyframe at frame ${frameIdx + 1}`)
 }
 }, [effectiveNpz, editableJoints, frameIdx, fullbodyKfAtFrame, toast])

 // Client-side re-skin: edited joints (cm → m) + RECONSTRUCTED rotations.
 // The rotation reconstruction is mandatory — LBS with the ORIGINAL
 // rotations + moved joint positions stretches the mesh along the old
 // bone direction (spaghetti limbs). patchFrame arc-aligns each joint's
 // rotation so its child-direction follows the edit, then deformFrame
 // skins with those reconstructed rotations. Mirrors what the Kimodo pose
 // studio delegates to the backend (deformSomaJoints with rotmats=null →
 // FK solve); here it's fully client-side via patchFrame. No poser
 // round-trip, so it works pre-inference on the rest pose.
 useEffect(() => {
 if (!skin || !effectiveNpz) return
 // Active in edit mode (live drag) AND when a kept edit applies to the
 // current frame (so the body holds the refine after "Done"). Otherwise
 // clear — the raw NPZ body shows.
 const active = editMode
 ? editableJoints
 : keptEdit && keptEdit.frame === frameIdx ? keptEdit.joints : null
 if (!active) { setEditedDeformedB64(null); return }
 const fi = Math.min(frameIdx, effectiveNpz.T - 1)
 const editedM = jointsFromCm(active)
 const patched = patchFrame(effectiveNpz.posedJoints, effectiveNpz.globalRotMats, editedM, fi)
 const out = new Float32Array(skin.vertexCount * 3)
 deformFrame(
 patched.globalRotMats.subarray(fi * 77 * 9, (fi + 1) * 77 * 9),
 editedM,
 skin,
 out,
 )
 setEditedDeformedB64(vertsToB64(out, true))
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [editableJoints, editMode, keptEdit, skin, effectiveNpz, frameIdx])

 // The joints the viewer displays right now — the edited pose (live drag),
 // a kept refine at this frame (after "Done"), or the raw frame.
 const displayJointsM = useMemo(() => {
 if (editMode && editableJoints) return jointsFromCm(editableJoints)
 if (keptEdit && keptEdit.frame === frameIdx) return jointsFromCm(keptEdit.joints)
 return currentJointsM
 }, [editMode, editableJoints, keptEdit, frameIdx, currentJointsM])

 // Repose: patch the edited frame's rotations → truncate to frameIdx+1 →
 // NPZ data URL → prev_motion_artifact → run. Kimodo conditions on the
 // edited pose as the chain end. Works on the rest pose too (patchFrame
 // reconstructs from the effective motion's base).
 const handleRepose = useCallback(async () => {
 if (!effectiveNpz || !editableJoints || !editMode) return
 setReposing(true)
 try {
 const editedM = jointsFromCm(editableJoints)
 const patched = patchFrame(effectiveNpz.posedJoints, effectiveNpz.globalRotMats, editedM, frameIdx)
 const T = frameIdx + 1
 const bytes = await writeNpz({
 posed_joints: {
 data: patched.posedJoints.subarray(0, T * 77 * 3) as Float32Array,
 shape: [T, 77, 3],
 },
 global_rot_mats: {
 data: patched.globalRotMats.subarray(0, T * 77 * 9) as Float32Array,
 shape: [T, 77, 3, 3],
 },
 fps: { data: new Float32Array([effectiveNpz.fps]) },
 })
 onSave({ prev_motion_artifact: npzToDataUrl(bytes) })
 toast("success", `Reposed from edited pose at frame ${frameIdx + 1}. Hit Run to generate.`)
 } catch (e) {
 toast("error", `Repose failed: ${(e as Error).message}`)
 } finally {
 setReposing(false)
 }
 }, [effectiveNpz, editableJoints, editMode, frameIdx, onSave, toast])

 // ── Export framing — PIXEL OUTPUT + aspect-locked rect (round 3) ────────
 // exportOut (typed PIXELS) is the OUTPUT TRUTH; the stage rect is only the
 // framing TOOL. Its PIXEL aspect (w·sw : h·sh) is locked to exportOut's
 // w:h, so the rect can sit at ANY size on screen and still export the
 // typed pixels — "I can't really output a 768 by 1024, because I don't
 // have room in the mesh view" was the old model's bug (rect size ≡ output
 // size); under this one the rect NEVER needs to be output-sized.
 // Body drag = move; ANY of the FOUR corners = aspect-locked resize (the
 // opposite corner anchored — "click and drag the corners of the square to
 // adjust" scales it like an image handle); typed position % + typed px
 // size live in the dialog. Everything outside the rect stays
 // pointer-transparent so OrbitControls keeps working while framing.
 const [exportOut, setExportOut] = useState({ w: 768, h: 1024 })
 const stageBoxRef = useRef<HTMLDivElement | null>(null)
 /** The stage's live pixel size — the mediator between the rect's
  *  normalized units and the output's pixels. */
 const stageSizeNow = (): { w: number; h: number } => {
  const b = stageBoxRef.current?.getBoundingClientRect()
  if (b && b.width > 0 && b.height > 0) return { w: b.width, h: b.height }
  return { w: 16, h: 9 } // inert fallback (no layout yet)
 }
 /** The rect's normalized w:h that carries the typed output's pixel
  *  aspect: (r.w·sw)/(r.h·sh) == outW/outH. */
 const rectAspectNorm = (): number => {
  const { w: sw, h: sh } = stageSizeNow()
  return (exportOut.w / exportOut.h) * (sh / sw)
 }
 /** The largest on-stage rect with the given normalized aspect, centered
  *  on (cx, cy) and clamped inside the stage. */
 const rectWithAspect = (aspect: number, cx: number, cy: number): StageRect => {
  const w = Math.min(1, aspect)
  const h = w / aspect
  return {
  x: Math.max(0, Math.min(1 - w, cx - w / 2)),
  y: Math.max(0, Math.min(1 - h, cy - h / 2)),
  w, h,
  }
 }
 /** Typed-size write channel (the dialog's px inputs — the preset row is
  *  gone, typed px is the only size UI): clamp 8..4096. The coherence
  *  effect below refits the rect's aspect. */
 const handleOutSize = useCallback((w: number, h: number) => {
  const cw = Math.max(8, Math.min(4096, Math.round(w)))
  const ch = Math.max(8, Math.min(4096, Math.round(h)))
  setExportOut((prev) => (prev.w === cw && prev.h === ch ? prev : { w: cw, h: ch }))
 }, [])
 /** Frame presets — the parent owns the aspect lock, so both land as a
  *  refit: "whole" = the max-fit rect; "reset" = 80% of it (breathing
  *  room), centered on the stage. */
 const handleFramePreset = useCallback((kind: "reset" | "whole") => {
  const a = rectAspectNorm()
  if (kind === "whole") {
  setStageRect((r) => rectWithAspect(a, r.x + r.w / 2, r.y + r.h / 2))
  return
  }
  const w = Math.min(1, a) * 0.8
  const h = w / a
  setStageRect({
  x: Math.max(0, Math.min(1 - w, 0.5 - w / 2)),
  y: Math.max(0, Math.min(1 - h, 0.5 - h / 2)),
  w, h,
  })
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [exportOut])
 // COHERENCE: refit the rect's aspect when the export opens (the stage may
 // have resized since it last framed) and whenever the typed size changes.
 // ONE-WAY coupling (px → rect): dragging the rect resizes it on screen but
 // never rewrites the typed output — that's the whole model.
 useEffect(() => {
  setStageRect((r) => {
  const next = rectWithAspect(rectAspectNorm(), r.x + r.w / 2, r.y + r.h / 2)
  return r.x === next.x && r.y === next.y && r.w === next.w && r.h === next.h ? r : next
  })
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [exportOpen, exportOut.w, exportOut.h])
 // A stage resize (window, panel toggle) while framing would drift a fixed
 // normalized rect's PIXEL aspect — refit live. Guarded: jsdom has no
 // ResizeObserver (the effect paths above cover the tests).
 useEffect(() => {
  if (!exportOpen || typeof ResizeObserver === "undefined") return
  const el = stageBoxRef.current
  if (!el) return
  const ro = new ResizeObserver(() => {
  setStageRect((r) => rectWithAspect(rectAspectNorm(), r.x + r.w / 2, r.y + r.h / 2))
  })
  ro.observe(el)
  return () => ro.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [exportOpen, exportOut.w, exportOut.h])
 const rectDragRef = useRef<null | {
  mode: "move" | "nw" | "ne" | "sw" | "se"
  sx: number; sy: number
  orig: StageRect
 }>(null)
 const beginRectDrag = (e: React.PointerEvent, mode: "move" | "nw" | "ne" | "sw" | "se") => {
  if (e.button !== 0) return
  e.preventDefault()
  e.stopPropagation()
  ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  rectDragRef.current = { mode, sx: e.clientX, sy: e.clientY, orig: { ...stageRect } }
 }
 const onRectPointerMove = (e: React.PointerEvent) => {
  const d = rectDragRef.current
  const box = stageBoxRef.current?.getBoundingClientRect()
  if (!d || !box || box.width === 0 || box.height === 0) return
  const dx = (e.clientX - d.sx) / box.width
  const dy = (e.clientY - d.sy) / box.height
  const o = d.orig
  const MIN = 0.02
  if (d.mode === "move") {
  const nx = Math.max(0, Math.min(1 - o.w, o.x + dx))
  const ny = Math.max(0, Math.min(1 - o.h, o.y + dy))
  setStageRect((r) => (r.x === nx && r.y === ny ? r : { ...r, x: nx, y: ny }))
  return
  }
  // Corner resizes — ASPECT-LOCKED (round 3): the dominant drag axis sets
  // the scale, the other dimension is DERIVED from the typed output's
  // aspect, and the OPPOSITE corner stays anchored. Stage bounds cap the
  // growth with both dims re-derived so the ratio never breaks.
  const AN = rectAspectNorm()
  const candW = d.mode === "se" || d.mode === "ne" ? o.w + dx : o.w - dx
  const candH = d.mode === "se" || d.mode === "sw" ? o.h + dy : o.h - dy
  const s = Math.max(candW / o.w, candH / o.h)
  const maxW = d.mode === "se" || d.mode === "ne" ? 1 - o.x : o.x + o.w
  const maxH = d.mode === "se" || d.mode === "sw" ? 1 - o.y : o.y + o.h
  let w = Math.min(o.w * s, maxW)
  let h = Math.min(w / AN, maxH)
  w = Math.min(h * AN, maxW)
  h = w / AN
  // a floor on the smaller axis so the handles never collapse
  if (AN >= 1) { h = Math.max(MIN, h); w = h * AN } else { w = Math.max(MIN, w); h = w / AN }
  w = Math.min(w, maxW)
  h = Math.min(h, maxH)
  setStageRect({
  x: d.mode === "se" || d.mode === "ne" ? o.x : o.x + o.w - w,
  y: d.mode === "se" || d.mode === "sw" ? o.y : o.y + o.h - h,
  w, h,
  })
 }
 const endRectDrag = () => { rectDragRef.current = null }

 // ── Scrubber ────────────────────────────────────────────────────────────
 const totalSec = npz ? npz.T / npz.fps : 0
 const curSec = npz ? frameIdx / npz.fps : 0
 const fmt = (s: number) => {
 const m = Math.floor(s / 60)
 const r = s - m * 60
 return `${m}:${r.toFixed(1).padStart(4, "0")}`
 }

 // ── Timeline synthesis + callbacks ───────────────────────────────────────
 // Hydrate persisted constraints ONCE per card (stage.id). The
 // motion_constraints param holds the serialized keyframes + pose payloads
 // from a prior session; without this the bar would reset on every reload
 // (flow UX hard rule: persist always). Tolerant of a missing/corrupt
 // param — hydrateConstraints returns null → empty state, never a crash.
 useEffect(() => {
 const raw = stage.params?.[MOTION_CONSTRAINTS_PARAM]
 const hydrated = raw ? hydrateConstraints(raw) : null
 if (hydrated) {
 setTlKeyframes(hydrated.keyframes as TimelineKeyframe[])
 setConstraintPayloads(hydrated.payloads)
 } else {
 setTlKeyframes([])
 setConstraintPayloads({})
 }
 setTlIntervals([])
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [stage.id])

 // Seed the prompts row whenever the target frame count changes (default
 // duration before any run, the real T after). One EMPTY prompt spans
 // [0, targetT-1]; the user types INTO it (dblclick → contentEditable) and
 // can split/resize/append more cards in the timeline.
 // NOTE: constraints (tlKeyframes + constraintPayloads) are NOT cleared on
 // a new motion — they're the authoring surface that survives re-runs and
 // drives the NEXT generation (parity with the demo's session.constraints,
 // which persist across Generate clicks). The backend drops frames outside
 // the new motion's range (generation.py:52), so stale frames are safe.
 // The frame count the timeline + seed operate on: the real run's T once a
 // motion exists, else the form's duration_sec × fps (default 5s × 30 = 150)
 // so the user can author + Generate BEFORE any GPU inference. The rest
 // pose (T=1) is the playback fallback, NOT the authoring envelope.
 const baseT = useMemo(() => {
 if (effectiveNpz && effectiveNpz.T > 1) return effectiveNpz.T
 const d = typeof stage.params?.duration_sec === "number" ? stage.params.duration_sec : 5.0
 return Math.max(1, Math.round(d * 30))
 }, [effectiveNpz, stage.params?.duration_sec])
 // PULL-THE-TAIL (2026-08-14, DaVinci Resolve model): the envelope is no
 // longer a wall. Dragging the LAST prompt card's right edge past the end
 // EXTENDS the timeline (tlExtendT override) and syncs the form's
 // duration_sec so the next Run generates the longer motion — the pose
 // studio's own rule: "the furthest clip end IS the animation, nothing
 // beyond the bubbles exists" (useTextToPoseStudio rangeSec). Without this
 // the scrollbar dead-ends at the authored duration ("stuck at 5 seconds").
 // The override only ever WINS over baseT until baseT catches up (the
 // duration save or a new run), then it clears — so shrinking duration in
 // the form later still works.
 const [tlExtendT, setTlExtendT] = useState(0)
 const targetT = Math.max(baseT, tlExtendT)
 useEffect(() => { setTlExtendT(0) }, [baseT])
 const onTimelineExtend = useCallback((newTotal: number) => {
 const t = Math.max(1, Math.floor(newTotal))
 // Mark the new envelope as seeded so the [targetT] effect below does NOT
 // proportionally rescale the prompt cards (that effect is for envelope
 // CHANGES from outside — a new run's T — not for a tail the user pulled).
 lastSeededT.current = t
 setTlExtendT(t)
 onSave({ duration_sec: t / 30 })
 // VISIBLE SIGNAL (2026-08-14): a continuous pull fires onExtend on every
 // pointermove — throttle to one toast/second so the drag doesn't spam.
 const now = Date.now()
 if (now - lastExtendToastRef.current > 1000) {
 lastExtendToastRef.current = now
 toast("info", `Timeline extended to ${(t / 30).toFixed(1)}s`)
 }
 }, [targetT, onSave, toast])
 const lastExtendToastRef = useRef(0)
 // Seed prompt cards: hydrate from stage.params on first mount, then only
 // re-seed a blank card when targetT changes AND the user hasn't authored
 // anything. Without this, reopening the card wipes the prompt text while
 // the motion NPZ persists — a jarring motion/prompt mismatch.
 const lastSeededT = useRef<number>(-1)
 const didHydratePrompts = useRef(false)
 useEffect(() => {
 // First mount: try to hydrate from persisted params.
 if (!didHydratePrompts.current) {
 didHydratePrompts.current = true
 const fps = effectiveNpz?.fps ?? 30
 const raw = stage.params?.[MOTION_PROMPTS_PARAM]
 const hydrated = hydrateMotionPrompts(raw, fps, targetT)
 if (hydrated && hydrated.length > 0) {
 lastSeededT.current = targetT
 setTlPrompts(hydrated.map((s, i): TimelinePrompt => ({
 uuid: `motion-prompt-${i}-${Date.now()}`,
 text: s.text,
 start_frame: s.start_frame,
 end_frame: s.end_frame,
 color: null,
 })))
 return
 }
 // No multi-segment payload → check single `prompt` param for text.
 const singlePrompt = typeof stage.params?.prompt === "string" ? stage.params.prompt : ""
 lastSeededT.current = targetT
 setTlPrompts([{ uuid: "motion-prompt", text: singlePrompt, start_frame: 0, end_frame: Math.max(0, targetT - 1), color: null }])
 return
 }
 // Subsequent targetT changes (e.g. after a new run produces a different T):
 // rescale existing prompts to the new range, don't wipe them.
 if (targetT === lastSeededT.current) return
 lastSeededT.current = targetT
 setTlPrompts((prev) => {
 if (prev.length === 0) {
 return [{ uuid: "motion-prompt", text: "", start_frame: 0, end_frame: Math.max(0, targetT - 1), color: null }]
 }
 // Rescale: map [0, oldT-1] → [0, newT-1] proportionally.
 const oldT = prev.reduce((max, p) => Math.max(max, p.end_frame), 0) + 1
 if (oldT <= 0) return prev
 const scale = targetT / oldT
 return prev.map((p) => ({
 ...p,
 start_frame: Math.round(p.start_frame * scale),
 end_frame: Math.min(targetT - 1, Math.round((p.end_frame + 1) * scale) - 1),
 }))
 })
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [targetT])

 // NO-OVERLAP HEAL (2026-08-15, "the prompt cards can overlap — they get
 // tangled; they should automatically get untangled"): the bar clamps every
 // gesture so crossings can't be DRAGGED into being, but other writers exist
 // — the envelope rescale above rounds frames (Math.round can land two cards
 // on the same frame), legacy persisted params, future code. This effect is
 // the invariant itself: any tlPrompts that overlap get pushed into a strict
 // sequence (order + duration preserved, nothing truncated). CANNOT LOOP:
 // untanglePrompts returns the SAME array reference when the state is already
 // clean, so the setState settles on the first pass.
 useEffect(() => {
  setTlPrompts((prev) => untanglePrompts(prev))
 }, [tlPrompts])

 // Persist constraints to stage.params whenever they change. Guarded by a
 // last-serialized ref to avoid a write loop (onSave → stage.params change
 // → re-render → this effect). The serialized JSON is BOTH the persistence
 // form and the backend transport form: compile.ts accepts
 // motion_constraints (it's in the kimodo_motion family signature now), so
 // on Run it reaches melite-kimodo-nodes, which deserializes it into
 // FullBodyConstraintSet/EndEffectorConstraintSet/Root2DConstraintSet and
 // feeds raw()'s constraint_lst. This is what makes the bar DRIVE generation.
 const lastPersistedRef = useRef<string>("")
 useEffect(() => {
 const json = serializeConstraints(
 tlKeyframes.map((k) => ({ uuid: k.uuid, track_id: k.track_id, frame: k.frame })),
 constraintPayloads,
 )
 const isEmpty = !json.fullbody && !json.end_effectors && !json.root2d
 const candidate = isEmpty ? "" : JSON.stringify(json)
 if (candidate === lastPersistedRef.current) return
 lastPersistedRef.current = candidate
 // BUGFIX (2026-08-14): save `candidate` (the STRING), NOT `json` (the
 // object). The backend kimodo_motion signature declares
 // motion_constraints: str — an object fails Pydantic validation with
 // "Input should be a valid string" and crashes the whole flow.
 // Previously this passed `json` (the MotionConstraintsJSON object),
 // ignoring the `candidate = JSON.stringify(json)` computed one line
 // above — the stringified form never reached stage.params.
 onSave({ [MOTION_CONSTRAINTS_PARAM]: candidate })
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [tlKeyframes, constraintPayloads])

 // Persist the timeline's PROMPT segments to stage.params.motion_prompts.
 // This is the demo's primary authoring surface: each prompt segment is a
 // motion "card" stitched into one multi-segment clip. serializeMotionPrompts
 // applies the demo's frame→duration convention and returns "" below the
 // 2-segment override threshold (the single `prompt` param covers that case).
 // Guarded by its own ref so it doesn't loop or fight the constraints effect.
 const lastPromptsPersistedRef = useRef<string>("")
 useEffect(() => {
 const fps = effectiveNpz?.fps ?? 30
 const candidate = serializeMotionPrompts(tlPrompts, fps)
 if (candidate === lastPromptsPersistedRef.current) return
 lastPromptsPersistedRef.current = candidate
 onSave({ [MOTION_PROMPTS_PARAM]: candidate })
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [tlPrompts, effectiveNpz])

 // The bar's envelope is `targetT` (the authoring frame count — default
 // duration or the real run's T), NOT effectiveNpz.T: the bar must be
 // editable BEFORE any GPU run (effectiveNpz is the rest pose T=1 at mount,
 // which would collapse it to a single frame). MotionTimelineBar maps
 // 0..targetT-1 edge-to-edge (no zoom, every frame always on screen).

 // Scrubbing the bar seeks the viewer + pauses (parity with the range slider).
 const handleTimelineFrameChange = useCallback((f: number) => {
 setFrameIdx(f)
 setPlaying(false)
 }, [])

 // ── Constraint CRUD — every keyframe carries a REAL pose snapshot ────────
 // onKeyframeAdd: double-click a lane → snapshot the motion's current pose
 // at that frame (SOMA-77, meters) into constraintPayloads[uuid], then add
 // the lane diamond. This is the functional core: the dot IS a pose constraint,
 // not a null shell. onKeyframeMove updates the frame the constraint applies
 // at (the pose travels with it — parity with the demo's drag). Delete
 // evicts both the dot and the payload.
  const onKeyframeAdd = useCallback((trackId: string, frame: number): string => {
  const uuid = makeTimelineId()
  const src = effectiveNpz
  if (!src) {
  toast("error", "Motion still loading — add a keyframe once the stage is live")
  return uuid
  }
  pushUndo()
  const payload = snapshotConstraint(trackId, frame, src)
 if (!payload) {
 toast("error", `Unknown constraint lane "${trackId}"`)
 return uuid
 }
 setConstraintPayloads((prev) => ({ ...prev, [uuid]: payload }))
 setTlKeyframes((prev) => [...prev, { uuid, track_id: trackId, frame: payload.frame, value: null, opacity: 1, locked: false }])
 return uuid
 }, [effectiveNpz, toast])
   const onKeyframeMove = useCallback((id: string, frame: number) => {
   const f = Math.max(0, Math.floor(frame))
   maybePushDragUndo(`kf:${id}`)
   setTlKeyframes((prev) => prev.map((k) => (k.uuid === id ? { ...k, frame: f } : k)))
 setConstraintPayloads((prev) => {
 const p = prev[id]
 if (!p) return prev
 return { ...prev, [id]: { ...p, frame: f } }
 })
 }, [])
  const onKeyframeDelete = useCallback((id: string) => {
  pushUndo()
  setTlKeyframes((prev) => prev.filter((k) => k.uuid !== id))
 setConstraintPayloads((prev) => {
 if (!(id in prev)) return prev
 const next = { ...prev }
 delete next[id]
 return next
 })
 }, [])
  const onPromptUpdate = useCallback((id: string, text: string) => {
  pushUndo()
  setTlPrompts((prev) => prev.map((p) => (p.uuid === id ? { ...p, text } : p)))
  }, [])
  const onPromptResize = useCallback((id: string, startFrame: number, endFrame: number) => {
  maybePushDragUndo(`pr:${id}`)
  setTlPrompts((prev) => prev.map((p) => (p.uuid === id ? { ...p, start_frame: startFrame, end_frame: endFrame } : p)))
  }, [])
  const onPromptMove = useCallback((id: string, startFrame: number, endFrame: number) => {
  maybePushDragUndo(`pm:${id}`)
  setTlPrompts((prev) => prev.map((p) => (p.uuid === id ? { ...p, start_frame: startFrame, end_frame: endFrame } : p)))
  }, [])
  const onPromptDelete = useCallback((id: string) => {
  pushUndo()
  setTlPrompts((prev) => prev.filter((p) => p.uuid !== id))
  }, [])
 // Add a NEW prompt card to the lane. This is the explicit, discoverable
 // affordance (the seeded prompt fills [0, T-1], so there is no empty
 // tail to click into). carveNewPromptCard splits the last prompt at its
 // midpoint so the new card is contiguous + immediately editable.
  const addPromptCard = useCallback(() => {
  pushUndo()
  setTlPrompts((prev) => carveNewPromptCard(prev, targetT))
  }, [targetT])

 return (
<StudioShell className={s.shellPad}
 params={<div className={s.railGrid}>
 {/* VIEW */}
 <span className={s.railGroupLabel}>View</span>
 <Tip tip={effectiveNpz ? "Show the joint skeleton over the mesh" : "Loading mannequin…"}>
 <span className={s.contents}>
 <Button variant="ghost"
 onClick={() => setShowSkeleton((s) => !s)}
 disabled={!effectiveNpz}
className={cn(s.railBtn, showSkeleton ? s.railBtnActive : s.railBtnIdle)}
 >
 {showSkeleton ? <Eye className={s.i14} /> : <EyeOff className={s.i14} />}
 Skeleton
 </Button>
 </span>
 </Tip>
 <Tip
 tip={!effectiveNpz
 ? "Loading mannequin…"
 : inPlace
 ? "Pinned at the origin — same motion, no travel (treadmill). Toggle to play the root's travel across the stage."
 : "Playing the root's travel across the stage. Toggle to pin the figure at the origin — same motion, no travel."}
 >
 <span className={s.contents}>
 <Button variant="ghost"
 onClick={() => setInPlace((v) => !v)}
 disabled={!effectiveNpz}
 aria-pressed={inPlace}
className={cn(s.railBtn, inPlace ? s.railBtnActive : s.railBtnIdle)}
 >
 <Target className={s.i14} />
 In-place
 </Button>
 </span>
 </Tip>

 {/* POSE */}
 <span className={s.railGroupLabelMt}>Pose</span>
 <Tip
 tip={
 !effectiveNpz
 ? "Loading mannequin…"
 : editMode
 ? "Exit edit mode — keeps the refined pose on the character at this frame"
 : "Drag joints to refine the pose at this frame"
 }
 >
 <span className={s.contents}>
 <Button variant="ghost"
 onClick={toggleEdit}
 disabled={!effectiveNpz}
className={cn(s.railBtn, editMode ? s.railBtnEditActive : s.railBtnIdle)}
 >
 <Move className={s.i14} />
 {editMode ? "Done" : "Refine pose"}
 </Button>
 </span>
 </Tip>
 {editMode && (
 <>
 <Tip
 tip={fullbodyKfAtFrame
 ? `Update the full-body keyframe at frame ${frameIdx + 1} with this pose`
 : `Write this pose into the timeline as a full-body keyframe at frame ${frameIdx + 1}`}
 >
 <span className={s.contents}>
 <Button variant="ghost"
 onClick={stampConstraintAtFrame}
 disabled={!editableJoints}
 className={s.stampBtn}
 >
 <Target className={s.i14} />
 Stamp
 </Button>
 </span>
 </Tip>
 <Tip tip="Chain the edited pose as the starting point — kimodo conditions the next generation on it. Hit Run when ready.">
 <span className={s.contents}>
 <Button variant="ghost"
 onClick={handleRepose}
 disabled={reposing || !editableJoints}
 className={s.reposeBtn}
 >
 <RefreshCw className={reposing ? s.spinIcon : s.i14} />
 {reposing ? "Reposing…" : "Repose"}
 </Button>
 </span>
 </Tip>
 </>
 )}
 {!editMode && keptEdit && keptEdit.frame === frameIdx && (
 <Tip tip="Discard the refined pose at this frame — revert to the raw motion">
 <Button variant="ghost"
 onClick={discardKeptEdit}
 className={s.railBtnDanger}
 >
 <RotateCcw className={s.i14} />
 Reset pose
 </Button>
 </Tip>
 )}

 {/* OUTPUT */}
 {/* RULE B: the generic form — the schema's own params (generation,
     guidance, clock) through the shared SpecPanel. The timeline's
     document seam writes the same keys; this is the override
     surface the form law requires (never a hand-rolled row). */}
 <SpecPanel
   model="kimodo"
   spec={kimodoSpec}
   error={kimodoError}
   values={paramValues}
   onEdit={onParamEdit}
   sections={[
     {
       title: "Generation",
       testid: "mo-gen-panel",
       rows: [
         { name: "duration_sec" }, { name: "diffusion_steps" },
         { name: "num_samples" }, { name: "num_transition_frames" },
       ],
     },
     {
       title: "Guidance",
       testid: "mo-guide-panel",
       rows: [{ name: "cfg_weight_a" }, { name: "cfg_weight_b" }],
     },
     {
       title: "Clock",
       testid: "mo-clock-panel",
       rows: [{ name: "seed" }],
     },
   ]}
 />
 <span className={s.railGroupLabelMt}>Output</span>
 <Tip
 tip={!effectiveNpz
 ? "Loading mannequin…"
 : exportOpen
 ? "Close the export panel"
 : "Frame a shot with the stage rectangle — no run needed; exports mesh / openpose / depth at the typed pixel size"}
 >
 <span className={s.contents}>
 <Button variant="ghost"
 onClick={() => setExportOpen((o) => !o)}
 disabled={!effectiveNpz}
 aria-pressed={exportOpen}
className={cn(s.railBtn, exportOpen ? s.railBtnActive : s.railBtnIdle)}
 >
 <Download className={s.i14} />
 Export
 </Button>
 </span>
 </Tip>
 <Tip
 tip={bgImage
 ? "Replace the background image behind the mannequin (or drop an asset/file on the stage)"
 : "Set a background image behind the mannequin — click to pick, or drop an asset/file on the stage"}
 >
 <Button variant="ghost"
 onClick={() => bgInputRef.current?.click()}
 className={s.bgBtnIdle}
 >
 <ImagePlus className={s.i14} />
 Background
 </Button>
 </Tip>
 {bgImage && (
 <Tip tip="Clear the background image">
 <Button variant="ghost"
 onClick={() => setBg(null)}
 aria-label="Clear the background image"
 className={s.railBtnDanger}
 >
 <X className={s.i14} />
 Clear
 </Button>
 </Tip>
 )}
 <input
 ref={bgInputRef}
 type="file"
 accept="image/*"
 className={s.hiddenInput}
 onChange={(e) => handleBgFile(e.target.files?.[0] ?? null)}
 />
 {/* Preview body (2026-08-15 character import) — an INPUT SUBCARD, the
     same square the image inputs render (the user directive: "that has
     to be an input subcard just like the image input has subcards").
     One SlotSquare for the preview_glb slot: pick (bottom-left ⬆), asset/
     OS drop, detach (top-right ✕), and WIRE to an upstream 3D card
     (bottom-right ⛓ — a genre:"3d" producer feeds it; canWireSlot guards
     the type). The stage drop (GLB→body / image→bg) stays. A failed
     import leaves the amber notice; the mannequin keeps rendering. */}
 <span className={s.railGroupLabelMt}>Preview body</span>
 <div data-motion-body className={s.bodySquareWrap}>
 <SlotSquare
 size="md"
 label={MOTION_PREVIEW_GLB_PARAM}
 value={bodySrc || undefined}
 badge={bodyWired ? bodyWiredUpstream!.title : undefined}
 metric={bodyWired && !bodyWiredUrl ? "waiting for upstream" : undefined}
 emptyIcon={<PersonStanding className={s.bodyEmptyIcon} />}
 onPickFile={(f) => handleBodyFile(f)}
 onDropFile={(f) => handleBodyFile(f)}
 onDropAsset={(url) => {
 if (!isGlbUrl(url)) {
 toast("error", "Preview body must be a .glb (SOMAX-rigged character).")
 return
 }
 attachBody(url)
 }}
 onClear={bodyWired
 ? () => {
 onWireSlot?.(MOTION_PREVIEW_GLB_PARAM, null, null)
 onSave({ ...stage.params, [MOTION_PREVIEW_GLB_PARAM]: null })
 }
 : () => attachBody(null)}
 actions={onWireSlot && bodySlotIdx >= 0 && (
 <Tip tip="Wire from an earlier card's GLB output">
 <Button variant="ghost"
 type="button"
 onClick={(e) => { e.stopPropagation(); setBodyWireOpen(true) }}
 aria-label="Wire the preview body from an earlier card"
 data-motion-body-wire
className={cn(s.wireBtn, bodyWired ? s.wireBtnOn : s.wireBtnOff)}
 >
 <Link2 className={s.i12} />
 </Button>
 </Tip>
 )}
 />
 </div>
 {bodyNotice && (
 <p
 data-motion-body-error
 className={s.bodyNotice}
 >
 {/* The suffix lies mid-convert (nothing previews yet) — the
     converting notice carries its own state; the mannequin claim
     only rides the settled fallbacks. */}
 {bodyNotice.includes("converting through the queue")
   ? bodyNotice
   : `${bodyNotice} — previewing on the neutral mannequin.`}
 </p>
 )}
 </div>
 }
 preview={<div className={s.centerRow}>
 {/* ── Live stage — ALWAYS the viewer (pose-studio parity) ──────────
 No run yet → no deformed vertices → SkinnedHumanoid renders the
 bind pose: the neutral somax mannequin, orbit/zoom/azimuth live.
 Loading/error overlays sit ON TOP of the mannequin, never replace
 the stage.

 DROP TARGET (2026-08-14, extended 2026-08-15): the stage accepts
 asset-tray drags (ASSET_DRAG_MIME — drop a Media-sidebar image to set
 the BG, a GLB to set the preview body) and OS file drags (drop a file
 from the desktop — same type dispatch). Same multi-source pattern as
 the image input subcards — the Background/Body buttons' file pickers
 are still there for click-to-pick. */}
 <ViewportFrame
 ref={stageBoxRef}
className={cn(s.stageFrame, bgDragOver && s.stageFrameDrag)}
 onDragOver={(e) => {
   if (e.dataTransfer.types.includes(ASSET_DRAG_MIME) || e.dataTransfer.types.includes("Files")) {
     e.preventDefault()
     setBgDragOver(true)
   }
 }}
 onDragLeave={() => setBgDragOver(false)}
 onDrop={handleStageDrop}
 >
 {bgImage && (
 <ViewportAnchor dock="fill" className={s.ovBg}>
  <img src={bgImage} alt="" aria-hidden className={s.bgImg} />
 </ViewportAnchor>
 )}
 {/* Drop overlay — visible only while an asset/file is dragged over
     the stage. The ring on the parent div + this label tell the user
     what a drop does (mirrors SlotSquare's dragOver highlight). z-20
     sits above the bg <img> but below the viewer's error overlays. */}
 {bgDragOver && (
 <ViewportAnchor dock="fill" className={s.ovDrop}>
  <div className={s.dropVeil}>
 <span className={s.dropVeilLabel}>
 Drop a GLB to set the preview body — an image to set the background
 </span>
  </div>
 </ViewportAnchor>
 )}
 {skin ? (
 <PoseViewer3D
 deformedVertsDirect={allVertsM}
 deformedVerticesB64={restB64 ?? ""}
 editedDeformedB64={editedDeformedB64}
 frameIdx={frameIdx}
 onFrameChange={setFrameIdx}
 animate={npz ? playing && !editMode : false}
 fps={npz?.fps ?? 30}
 cameraView={cameraView}
 cameraFraming={framing}
  soma77JointsFlat={jointsFlatCm}
 showSkeleton={effectiveNpz ? showSkeleton && !editMode : false}
 customBindMesh={customBindMesh}
 identityModel="soma"
 inPlace={inPlace}
 threeCtxRef={threeCtxRef}
 darkMode
 // ── Edit mode (gated: needs a motion) ──
 editMode={editMode}
 editableJoints={editableJoints}
 selectedJoint={selectedJoint}
 onSelectJoint={setSelectedJoint}
 onJointMove={handleJointMove}
 kinematicMode="ik"
 gizmoMode="translate"
 />
 ) : (
 <div
 role="status"
 aria-busy="true"
 aria-label="Loading mannequin"
 className={s.stageLoading}
 >
 {/* Skeleton stands in for the mannequin viewport while the rig
     loads — a quiet block instead of a spinning dot. */}
 <Skeleton className={s.skelAvatar} />
 <Skeleton className={s.skelLine} />
 </div>
 )}
 {loading && (
 <ViewportAnchor dock="fill">
 <div
 role="status"
 aria-busy="true"
 aria-label="Loading motion"
 className={s.stageVeil}
 >
 <Skeleton className={s.skelAvatarSm} />
 <Skeleton className={s.skelLine} />
 </div>
 </ViewportAnchor>
 )}
 {error && (
 <ViewportAnchor dock="fill">
 <div className={s.stageVeil}>
 <AlertTriangle className={s.warnIcon} />
 <span className={s.veilText}>{error}</span>
 </div>
 </ViewportAnchor>
 )}
 {/* ── Camera pill — rotate arrows + framing toggle (2026-08-15, v2) ──
 Replaces the 8-triangle ring. [←] [→] step ±45° around the azimuth ring
 (stepAzimuth — wrap-around, re-snapping from wherever the camera is).
 NO direction label: the stage is freely orbitable (click-drag), so any
 "FRONT" chip would be a lie the moment the user drags — the arrows and
 the tips carry it. The segmented toggle picks the FRAMING — full body
 vs upper half (framedCameraPos: same azimuth, tighter distances both).
 Framing is pure view state: never a param, never exported. */}
 <ViewportAnchor dock="top-right" className={s.ovCam}>
 <div className={s.camPill}>
 <Tip tip="Rotate view left (45°)">
 <Button variant="ghost"
 onClick={() => setCameraView(stepAzimuth(cameraView, -1))}
 aria-label="Rotate view left (45°)"
 className={s.camBtn}
 >
 <RotateCcw className={s.i14} />
 </Button>
 </Tip>
 <span className={s.camDivider} />
 <Tip tip="Full body framing">
 <Button variant="ghost"
 onClick={() => setFraming("full")}
 aria-label="Full body framing"
 aria-pressed={framing === "full"}
className={cn(s.frameBtn, framing === "full" ? s.frameBtnActive : s.frameBtnIdle)}
 >
 <PersonStanding className={s.i14} />
 </Button>
 </Tip>
 <Tip tip="Upper half framing — closer, chest-height camera at the same angle">
 <Button variant="ghost"
 onClick={() => setFraming("upper")}
 aria-label="Upper half framing"
 aria-pressed={framing === "upper"}
className={cn(s.frameBtn, framing === "upper" ? s.frameBtnActive : s.frameBtnIdle)}
 >
 <User className={s.i14} />
 </Button>
 </Tip>
 <Tip tip="Rotate view right (45°)">
 <Button variant="ghost"
 onClick={() => setCameraView(stepAzimuth(cameraView, 1))}
 aria-label="Rotate view right (45°)"
 className={s.camBtn}
 >
 <RotateCw className={s.i14} />
 </Button>
 </Tip>
 </div>
 </ViewportAnchor>

 {/* ── Export-frame rectangle (2026-08-15 rework) — the draggable crop
     over the LIVE character while the export dialog is open and framing
     is "live". The wrapper is pointer-transparent everywhere except the
     rect itself, so orbiting the camera (the angle is the user's own)
     keeps working; the rect dims everything outside it. The corner
     handle resizes FREE-aspect; the body moves it. */}
 {exportOpen && (
 <ViewportAnchor data-export-rect-overlay dock="fill" className={s.ovRect}>
 <div
 data-export-rect
 role="presentation"
 aria-label="Export frame — drag to move, drag a corner to resize"
 onPointerDown={(e) => beginRectDrag(e, "move")}
 onPointerMove={onRectPointerMove}
 onPointerUp={endRectDrag}
 onPointerCancel={endRectDrag}
 className={s.exportRect}
 style={{
 left: `${stageRect.x * 100}%`,
 top: `${stageRect.y * 100}%`,
 width: `${stageRect.w * 100}%`,
 height: `${stageRect.h * 100}%`,
 boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
 }}
 >
 {/* FOUR corner handles (resize, free aspect — the opposite corner
     anchors). Typed exact sizes live in the dialog panel. */}
 {([
 { corner: "nw", cls: s.cornerNW },
 { corner: "ne", cls: s.cornerNE },
 { corner: "sw", cls: s.cornerSW },
 { corner: "se", cls: s.cornerSE },
 ] as const).map((h) => (
 <div
 key={h.corner}
 data-export-corner={h.corner}
 onPointerDown={(e) => beginRectDrag(e, h.corner)}
 onPointerMove={onRectPointerMove}
 onPointerUp={endRectDrag}
 onPointerCancel={endRectDrag}
 className={cn(s.cornerHandle, h.cls)}
 />
 ))}
 {/* center crosshair */}
 <div className={s.crossV} />
 <div className={s.crossH} />
 </div>
 {/* hint — outside the rect, never blocks orbit */}
 <ViewportAnchor dock="bottom-center" className={s.rectHint}>
 Drag the rectangle over the character · corners resize (aspect-locked) · any size exports the typed pixels · orbit for the angle
 </ViewportAnchor>
 </ViewportAnchor>
 )}
 </ViewportFrame>

 {/* The export PANEL — in-flow sibling of the stage (pushes it narrower,
     never covers it). Renders only while a motion/rest pose exists. */}
 {effectiveNpz && (
 <MotionExportDialog
 open={exportOpen}
 onClose={() => setExportOpen(false)}
 npz={effectiveNpz}
 npzUrl={npzUrl}
 glbUrl={stage.result?.motionPreviews?.find((m) => m.url)?.url ?? null}
 frameIdx={frameIdx}
 onFrameChange={(f) => { setFrameIdx(f); setPlaying(false) }}
 cameraView={cameraView}
 displayJointsM={displayJointsM!}
 liftY={liftY}
 inPlace={inPlace}
 threeCtxRef={threeCtxRef}
 stageRect={stageRect}
 onStageRectChange={setStageRect}
 outW={exportOut.w}
 outH={exportOut.h}
 onOutSize={handleOutSize}
 onFramePreset={handleFramePreset}
 />
 )}
 </div>
 }
 bottom={<>
 <PaneShell className={s.timelineShell}>
 {/* ── Bar header = transport + label + "add a card" ───────────────
 Play/pause/time live HERE now (was its own row above). The Add
 button is the discoverable "add a card" affordance: the viser bar's
 click-to-append path needs empty space after the last prompt; our
 seed fills [0, T-1] edge-to-edge (demo parity), so that path is
 unreachable. It carves a new empty card out of the last prompt's tail
 (see carveNewPromptCard). Each card is one motion segment; ≥2 cards
 trigger the model's multi-prompt composition (kimodo_model.py
 _generate). */}
 <PaneHeader
 variant="strip"
 className={s.transportHead}
 lead={<>
 <Tip
 tip={!npz
 ? "Run the card first — nothing to play yet"
 : editMode
 ? "Pause playback while refining"
 : playing
 ? "Pause (Space)"
 : "Play (Space)"}
 >
 <span className={s.contents}>
 <Button variant="ghost"
 onClick={() => setPlaying((p) => !p)}
 disabled={editMode || !npz}
 aria-label={playing ? "Pause (Space)" : "Play (Space)"}
 className={s.playBtn}
 >
 {playing ? <Pause className={s.i14} /> : <Play className={s.playIcon} />}
 </Button>
 </span>
 </Tip>
 <div className={s.timeWrap}>
 {npz ? (
 <span className={s.timeText}>
 {fmt(curSec)} / {fmt(totalSec)}
 </span>
 ) : (
 <span className={s.noMotion}>
 <Info className={s.i14} />
 No motion yet — run the card
 </span>
 )}
 </div>
 {npz && (
 <div className={s.fpsChip}>
 {`${npz.fps.toFixed(0)} fps · ${npz.T}f`}
 </div>
 )}
 </>
 }
 hint={
 <span className={s.hintWrap}>
 <span className={s.hintTitle}>
 Timeline · prompt cards{tlPrompts.length > 0 ? ` (${tlPrompts.length})` : ""}
 </span>
 <Tip
 tip={targetT > 0
 ? "Add a new prompt card — splits the last card so you can type a distinct motion for that segment"
 : "Loading the timeline…"}
 >
 <span className={s.contents}>
 <Button variant="ghost"
 onClick={addPromptCard}
 disabled={targetT <= 0}
 className={s.addCardBtn}
 >
 <Plus className={s.i12} />
 Add prompt card
 </Button>
 </span>
 </Tip>
 </span>
 }
 />
 {targetT > 0 && (
 <MotionTimelineBar
 prompts={tlPrompts}
 keyframes={tlKeyframes}
 frameIdx={frameIdx}
 totalFrames={targetT}
 fps={effectiveNpz?.fps ?? 30}
 onExtend={onTimelineExtend}
 onFrameChange={handleTimelineFrameChange}
 onKeyframeAdd={onKeyframeAdd}
 onKeyframeMove={onKeyframeMove}
 onKeyframeDelete={onKeyframeDelete}
 onPromptUpdate={onPromptUpdate}
 onPromptMove={onPromptMove}
 onPromptResize={onPromptResize}
 onPromptDelete={onPromptDelete}
 />
 )}
 {/* No motion yet → the bar's shell + transport still render (the
 play button explains WHY: "Run the card first"); this placeholder
 keeps the bar's box instead of the whole block vanishing. */}
 {!targetT && (
 <div className={s.timelineEmpty}>
 <Info className={s.i14} />
 Run the card — the timeline appears with the motion
 </div>
 )}
 </PaneShell>

 {editMode && (
 <div className={s.editHintBar}>
 <RotateCw className={s.editHintIcon} />
 <span>
 Drag joints to refine the pose at this frame (IK moves the chain).
 <b className={s.editHintStrong}> Repose</b> patches rotations for the
 edited frame and saves it as the chain start. Hit Run when ready — kimodo conditions on it.
 Finger/toe tip rotations are approximate (translate edits).
 </span>
 </div>
 )}

 {/* Wire picker — link the preview body to an earlier 3D card's GLB
     output. The SAME modal SlotGrid uses (one wire UX everywhere); the
     write contract is the mask studio's: a wire writes the graph edge
     AND clears the slot param (wired XOR attached — the falsy-injection
     guard can't shadow the live wire), an unwire clears both. */}
 {bodyWireOpen && onWireSlot && (
 <WirePickerModal
 slot={MOTION_PREVIEW_GLB_PARAM}
 priorStages={priorStages}
 currentId={bodyWired ? bodyWiredId : ""}
 currentOutput={null}
 onPick={(upstreamId) => {
 onWireSlot(MOTION_PREVIEW_GLB_PARAM, upstreamId, null)
 onSave({ [MOTION_PREVIEW_GLB_PARAM]: null })
 setBodyGlbState(null)
 setBodyNotice(null)
 setBodyWireOpen(false)
 }}
 onUnwire={() => {
 onWireSlot(MOTION_PREVIEW_GLB_PARAM, null, null)
 onSave({ [MOTION_PREVIEW_GLB_PARAM]: null })
 setBodyWireOpen(false)
 }}
 onClose={() => setBodyWireOpen(false)}
 />
 )}
 </>
 }
    >
</StudioShell>
 )
}
export default MotionCardEditor

/** THE SHELL RIDE, as data (row 5 stroke 4) — LIVE since the
 *  2026-09-07 chrome stroke: the body renders StudioShell with these
 *  seams (the live skinned motion viewport is the mesh, kind
 *  "native"; the rail carries the view/pose/output tool groups;
 *  MotionTimelineBar in a PaneShell is the bottom). */
export const shellDeclaration = defineShellDeclaration({
  preview: { kind: "native" },
  bottom: { kind: "timeline" },
  params: { slots: [] },
})

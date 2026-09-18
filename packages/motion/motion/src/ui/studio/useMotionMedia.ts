/**
 * useMotionMedia — the asset/media cluster moved verbatim from
 * `component.tsx` (MotionCardEditor lines ~188–421 + ~580–735).
 *
 * Owns: the preview-body input subcard state derivations (slot resolve,
 * wire resolution, manual attach, file picks), the skin load (neutral +
 * character import + body-to-somax convert queue), the motion NPZ load +
 * chunked precompute, playback space key, tile-thumbnail capture, and the
 * stage background image (multi-source attach + THREE background push).
 *
 * Owns no primitive state (the remnant orchestrates all useState/useRef);
 * internal-only refs (thumbnail guard, bg texture) live here. Free-variable
 * reads became explicit hook args. Behavior is IDENTICAL.
 */
import { useCallback, useEffect, useMemo, useRef } from "react"
import type * as React from "react"
import * as THREE from "three"
import type { CardStage } from "@melite/contracts"
import {
  collectStageUrls, ensureDraftId, formOf, pollFlowRun, stageSlots,
} from "@melite/catalog"
import {
  deformFrame, loadGlbSkin, loadMotionNpz, loadSomaSkin, NotSomaxGlbError,
  precomputeDeformedVertsChunked, type MotionNpz, type SomaSkin,
} from "@melite/formats"
import { ASSET_DRAG_MIME, useMotionThumbStore } from "./kit"
import { readAsDataURL } from "@melite/card-base/chrome"
import { MOTION_BG_IMAGE_PARAM, MOTION_PREVIEW_GLB_PARAM } from "./motionParams"
import type { ThreeCtx } from "./MotionExportDialog"
import type { ToastFn } from "./useMotionStage"

export interface MotionMediaArgs {
  stage: CardStage
  upstreams: CardStage[]
  onSave: (params: Record<string, unknown>) => void
  onWireSlot?: (slotKey: string, upstreamId: string | null, outputName?: string | null) => void
  toast: ToastFn
  bodyGlb: string | null
  setBodyGlbState: React.Dispatch<React.SetStateAction<string | null>>
  setBodyNotice: React.Dispatch<React.SetStateAction<string | null>>
  skin: SomaSkin | null
  setSkin: React.Dispatch<React.SetStateAction<SomaSkin | null>>
  npz: MotionNpz | null
  setNpz: React.Dispatch<React.SetStateAction<MotionNpz | null>>
  allVertsM: Float32Array | null
  setAllVertsM: React.Dispatch<React.SetStateAction<Float32Array | null>>
  setError: React.Dispatch<React.SetStateAction<string | null>>
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  setFrameIdx: React.Dispatch<React.SetStateAction<number>>
  setPlaying: React.Dispatch<React.SetStateAction<boolean>>
  setEditMode: React.Dispatch<React.SetStateAction<boolean>>
  setKeptEdit: React.Dispatch<React.SetStateAction<{ joints: Float32Array; frame: number } | null>>
  setEditedDeformedB64: React.Dispatch<React.SetStateAction<string | null>>
  threeCtxRef: React.MutableRefObject<ThreeCtx | null>
  npzUrl: string | null
  bgImage: string | null
  setBgImage: React.Dispatch<React.SetStateAction<string | null>>
  setBgDragOver: React.Dispatch<React.SetStateAction<boolean>>
}

export function useMotionMedia({
  stage, upstreams, onSave, onWireSlot, toast,
  bodyGlb, setBodyGlbState, setBodyNotice,
  skin, setSkin,
  npz, setNpz, allVertsM, setAllVertsM, setError, setLoading,
  setFrameIdx, setPlaying, setEditMode, setKeptEdit, setEditedDeformedB64,
  threeCtxRef, npzUrl,
  bgImage, setBgImage, setBgDragOver,
}: MotionMediaArgs) {
  // ── Loads ────────────────────────────────────────────────────────────────
  // The preview BODY (2026-08-15 character import) — an INPUT SUBCARD, the
  // same square the image inputs render (the user directive: "that has to
  // be an input subcard just like the image input has subcards"): one
  // SlotSquare for the preview_glb slot with file pick / OS drop / asset
  // drop / WIRE to an upstream 3D card. A slot is EITHER wired OR manually
  // attached — never both (the SlotGrid contract): attach writes the param
  // AND unwires; wire writes the graph edge AND clears the param.
  const setBodyGlb = useCallback((url: string | null) => {
    setBodyGlbState(url)
    setBodyNotice(null)
    onSave(url ? { [MOTION_PREVIEW_GLB_PARAM]: url } : { [MOTION_PREVIEW_GLB_PARAM]: "" })
  }, [onSave, setBodyGlbState, setBodyNotice])

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
  }, [stage.id, setBodyGlbState, setBodyNotice])

  // The skin — the character GLB when a body is set, else the neutral somax
  // mannequin (session-cached in somaSkin.ts; the stage renders the
  // bind-pose figure even before any run exists — pose-studio parity, no
  // "run first to see the card"). A body swap RE-SKINS: skin flips → the
  // motion precompute below (keyed on skin) re-runs on the new body.
  // Failure semantics: neutral-skin failure is a HARD error (nothing can
  // render — as before); a CHARACTER import that fails (not SOMAX-rigged,
  // fetch error) is a visible notice + TOAST + explicit fallback to the
  // mannequin — never a dead viewport, never a silent switch.
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
  }, [bodySrc, toast, setSkin, setError, setBodyNotice])

  // Motion load: NPZ + LBS precompute (single source). Only when a run
  // actually produced a motion — until then npz stays null and the viewer
  // shows the bind pose.
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
  }, [npzUrl, skin, setNpz, setAllVertsM, setError, setLoading, setFrameIdx, setPlaying, setEditMode, setKeptEdit, setEditedDeformedB64, setSkin])

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
  }, [npz, setPlaying])

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
  }, [npz, allVertsM, npzUrl, stage.id, setThumb, threeCtxRef])

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
  const setBg = useCallback((url: string | null) => {
    setBgImage(url)
    onSave(url ? { [MOTION_BG_IMAGE_PARAM]: url } : { [MOTION_BG_IMAGE_PARAM]: "" })
  }, [onSave, setBgImage])

  // Hydrate from stage.params once per card (mirrors MOTION_CONSTRAINTS_PARAM).
  useEffect(() => {
    const v = stage.params?.[MOTION_BG_IMAGE_PARAM]
    setBgImage(typeof v === "string" && v.length > 0 ? v : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage.id, setBgImage])

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
  }, [setBg, handleBgFile, attachBody, isGlbUrl, setBgDragOver])

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
  const bgTexRef = useRef<THREE.Texture | null>(null)
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
  }, [bgImage, npzUrl, allVertsM, threeCtxRef])

  return {
    setBodyGlb, bodySlotIdx, bodyWiredId, bodyWiredUpstream, bodyWired,
    bodyWiredUrl, bodySrc, attachBody, isGlbUrl, handleBodyFile, priorStages,
    setBg, handleBgFile, handleStageDrop,
  }
}

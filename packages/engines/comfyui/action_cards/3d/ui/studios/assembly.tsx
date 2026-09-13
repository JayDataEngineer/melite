/**
 * AssemblyStudio — THE shared generic 3D authoring body (the user's
 * "GENERIC AND SHARED" order: Trellis rides the default no more,
 * Anny runs on this, Kimodo CAN adopt it next).
 *
 * SHAPE (the studio contract: VIEWPORT above, rail via StudioRail):
 *   RAIL     the generic SlotGrid — THE slot surface, the same squares
 *            every card renders (operator order 2026-09-06: "we are
 *            rerolling components" — the bespoke PartSlot died here).
 *   VIEWPORT the shared Stage (3d/ui/viewers — the Trellis/Anny/
 *            Kimodo "render the same" order): servable part GLBs +
 *            the run's output GLBs coexisting in one scene.
 *
 * A tenant file is a SLOT-TABLE DECLARATION, not an implementation:
 *   const TRELLIS_SLOTS: AssemblySlot[] = [...]
 *   export function TrellisStudio(p) {
 *     return <AssemblyStudio {...p} headline="…" hint="…" slots={TRELLIS_SLOTS} />
 *   }
 * The studio-slots wall parses the *_SLOTS const (slot keys ⊆ the
 * card's File/Image fields ∩ the family's studio.writes) and the
 * kind⟺body parity (kind=assembly ⟺ this module is imported) —
 * declaration drift refuses at test time, misdeclaration refuses
 * at model construction (StudioKind validators).
 *
 * KIMODO ADOPTION (viewer-agnostic by construction): the asset
 * derivation and the error line are exported separately from the
 * Stage viewport (StudioErrorLine / useStudioAssets) — for the rail,
 * import the generic SlotGrid like this body does.
 *
 * E1: onSave is the ONLY param write channel, and only for the
 * declared slot keys. No flow-state/RPC imports. No raw inputs.
 */
import { useCallback, useMemo, useState } from "react"
import type { ReactElement } from "react"
import type { CardStage } from "@melite/contracts"
import { EmptyState, ReferenceImageBadge, StudioShell, ViewportAnchor, ViewportFrame } from "../../../studio-shell"
import { Stage, type StageAsset } from "../viewers"
import styles from "./assembly.module.css"
// The generic slot surface — the SAME squares every card renders.
// Relative: the plugin tree owns no alias into the editor surface;
// SlotGrid's own imports are all shared packages, so a future move
// to card-base's StudioRail is mechanical (debt noted in the design record).
import { SlotGrid } from "../../../../../../web/editor/src/surfaces/flow/SlotGrid"

// SHELL-OWNED chrome (row 5 stroke 1, 2026-09-07): the loud error
// line moved into StudioShell (the local studio-shell module) — this
// re-export keeps the kimodo adoption surface
// (StudioErrorLine/useStudioAssets) alive unchanged.
export { StudioShellErrorLine as StudioErrorLine } from "../../../studio-shell"

// The tenant's slot-table declaration. The RAIL no longer reads it
// (the generic SlotGrid derives squares from the card's declared slot
// vocabulary) — it feeds the viewport derivation (key/label/accept),
// the tenant hint copy (required), and the studio-slots wall.
export interface AssemblySlot {
  /** Param key (a File/Image field of the card; a studio.write). */
  key: string
  /** Human label for viewport assets + mount notes. */
  label: string
  /** Compose refuses without it (surfaced in the tenant hint). */
  required: boolean
  /** glb parts preview on the Stage; image parts ride thumbs only. */
  accept: "glb" | "image"
  /** Reserved (the generic square owns the empty state now). */
  glyph: "body" | "hair" | "outfit" | "photo"
}

export interface AssemblyStudioProps {
  stage: CardStage
  onSave: (params: Record<string, unknown>) => void
  /** READ-ONLY context (the caller's stages in order) for wire resolution. */
  upstreams?: CardStage[]
  /** The graph-edge channel, stage-scoped by the caller. */
  onWireSlot?: (
    slotKey: string,
    upstreamId: string | null,
    outputName?: string | null,
  ) => void
  /** The tenant's slot-table declaration. */
  slots: AssemblySlot[]
  /** Display-only stand-ins (2026-09-06): shown in the viewport ONLY
   *  while the derived assets are empty (the anny neutral mannequin
   *  on card open). NEVER written to params — onSave stays the sole
   *  write channel (E1); a placeholder that dirtied the draft would
   *  stamp a false file origin at compose. */
  placeholderAssets?: StageAsset[]
  /** VIEWPORT MODE (one-mesh order, 2026-09-06): "stage" (default)
   *  renders the shared 3D Stage below the rail; "none" renders the
   *  rail ONLY — for a tenant whose card authors on its OWN native
   *  viewport (anny: the parametric figure IS the one mesh; GLBs
   *  are artifacts, never a second scene to guess against). */
  viewport?: "stage" | "none"
  /** The pinned source-image preview over the Stage (2026-09-06,
   *  operator order: "We need to have an image preview when the
   *  card is drilled out"): the input the mesh was lifted from,
   *  always visible beside the result (the Meshy/Luma reference
   *  pattern). The caller maps the slot value through
   *  estateInputUrl; null renders no pin. */
  referenceImage?: { url: string | null; label: string }
  /** Rail heading ("Parts — …"). */
  headline: string
  /** Composition rule note (required parts, lane refusals). */
  hint: string
}

export const GLB_URL_RE = /\.(glb|gltf)(\?|#|$)/i

/** Browser-servable URL shapes (the artifact contract: served asset
 *  URLs, uploads as data:, canvas blobs). Anything else holding a
 *  GLB-shaped value is a MOUNT PATH — composable by the lane,
 *  unloadable here. */
export function isServableUrl(v: string): boolean {
  return (
    /^(data:|blob:|https?:)/i.test(v) ||
    /^\/(assets|api|v1\/assets)\//.test(v)
  )
}

// ── viewport asset derivation (servable GLBs in, mount paths noted) ──────

export interface StudioMountNote {
  key: string
  value: string
}

/** Split the tenant's GLB params + the run's outputs into Stage
 *  assets and mount notes. Mount paths are composable but not
 *  browser-loadable — they ride the explicit note list, never a
 *  doomed loader URL. */
export function useStudioAssets(
  stage: CardStage,
  slots: AssemblySlot[],
): { assets: StageAsset[]; mountNotes: StudioMountNote[] } {
  return useMemo(() => {
    const list: StageAsset[] = []
    const notes: StudioMountNote[] = []
    for (const slot of slots) {
      if (slot.accept !== "glb") continue
      const v = stage.params[slot.key]
      if (typeof v !== "string" || !v) continue
      if (isServableUrl(v)) {
        list.push({ id: `part-${slot.key}`, url: v, name: slot.label })
      } else {
        notes.push({ key: slot.key, value: v })
      }
    }
    const arts = stage.result?.artifacts
    const named: Array<[string, unknown]> = arts ? Object.entries(arts) : []
    const flat: Array<[string, unknown]> = [
      ...named,
      ...(stage.result?.assetUrls ?? []).map((u, i): [string, unknown] => [`output-${i}`, u]),
    ]
    let runIdx = 0
    for (const [name, u] of flat) {
      if (typeof u !== "string" || !GLB_URL_RE.test(u)) continue
      if (list.some((a) => a.url === u)) continue
      list.push({ id: `run-${name}-${runIdx++}`, url: u, name: `Run · ${name}` })
    }
    // Spread coexisting parts along X so composites don't interpenetrate.
    return {
      assets: list.map((a, i) => ({
        ...a,
        position: [(i - (list.length - 1) / 2) * 2.4, 0, 0] as [number, number, number],
      })),
      mountNotes: notes,
    }
  }, [stage.params, stage.result, slots])
}

// ── the loud error line (Stage failures as DOM text) ─────────────────────
// StudioErrorLine now re-exports the shell-owned chrome above; the
// derivation (assets × recorded asset errors) stays here with the
// viewport that owns it.

// ── the generic body (rides THE SHELL — row 5 stroke 1) ──────────────────

export function AssemblyStudio({
  stage,
  onSave,
  upstreams = [],
  onWireSlot,
  slots,
  headline,
  hint,
  placeholderAssets = [],
  viewport = "stage",
  referenceImage,
}: AssemblyStudioProps): ReactElement {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Loud load failures, keyed by Stage asset id (Stage reports through
  // onAssetError; null clears). Rendered as DOM text below — never
  // swallowed into the scene.
  const [assetErrors, setAssetErrors] = useState<Record<string, string>>({})
  const handleAssetError = useCallback((id: string, message: string | null) => {
    setAssetErrors((prev) => {
      if (!message) {
        if (!(id in prev)) return prev
        const next = { ...prev }
        delete next[id]
        return next
      }
      return prev[id] === message ? prev : { ...prev, [id]: message }
    })
  }, [])

  const { assets, mountNotes } = useStudioAssets(stage, slots)
  // Placeholders yield to real content: the mannequin shows only
  // when nothing else is on the stage (empty slot + no run outputs).
  const shownAssets = assets.length > 0 ? assets : (placeholderAssets ?? [])

  const liveErrors = assets
    .filter((a) => assetErrors[a.id])
    .map((a) => ({ id: a.name ?? a.id, message: assetErrors[a.id]! }))

  return (
    <StudioShell
      /* RAIL — the part slots (the assembly authoring surface). */
      rail={
        <div className={styles.railCol}>
          <p className={styles.railHeadline}>
            {headline}
          </p>
          {/* The generic squares — SlotGrid derives them from the
              card's declared slot vocabulary (stageSlots), the same
              surface every card renders. The tenant slot table now
              feeds the viewport derivation + the studio-slots wall. */}
          <SlotGrid
            stage={stage}
            upstreams={upstreams}
            onSaveParams={onSave}
            onWireSlot={onWireSlot}
          />
          <p className={styles.railHint}>{hint}</p>
          {mountNotes.length > 0 && (
            <div role="note" className={styles.mountNotes}>
              {mountNotes.map((n) => (
                <p
                  key={n.key}
                  className={styles.mountNote}
                >
                  {n.key} points at the mounts ({n.value}) — composable, not browser-previewable
                  {viewport === "none" ? " at the bake." : ". Attach the file to see it on the stage."}
                </p>
              ))}
            </div>
          )}
        </div>
      }
      /* CENTER — the shared Stage. Empty state is explicit.
       * viewport="none" (the one-mesh order) renders NO second scene:
       * the tenant's own viewport is the mesh; GLBs stay artifacts. */
      center={
        viewport === "stage" ? (
          <ViewportFrame
            label="Stage"
            empty={
              shownAssets.length === 0 ? (
                <EmptyState
                  variant="overlay"
                  title="No parts on the stage yet"
                  hint="Attach the source files in the rail — outputs appear here after the run."
                />
              ) : undefined
            }
          >
            <Stage assets={shownAssets} selectedId={selectedId} onSelect={setSelectedId} onAssetError={handleAssetError} />
            {/* The pinned source preview — what the mesh was lifted
             * from, always in view beside the result. The pin
             * declares its dock; the badge is pure content. */}
            <ViewportAnchor dock="top-right" className={styles.anchorLift}>
              <ReferenceImageBadge url={referenceImage?.url ?? null} label={referenceImage?.label ?? "Source"} />
            </ViewportAnchor>
          </ViewportFrame>
        ) : null
      }
      /* LOUD failures — SHELL-OWNED chrome now (the shell renders
       * the line; liveErrors stays [] with no Stage, so the DOM
       * matches the pre-shell conditional exactly). */
      errors={liveErrors}
    />
  )
}

export default AssemblyStudio

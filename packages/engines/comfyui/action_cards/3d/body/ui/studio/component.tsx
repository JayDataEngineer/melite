/**
 * BodyCardEditor — the Character Maker as a studio TENANT (#2, 2026-08-15).
 *
 * A body card is an authoring surface, not a runner (no play affordance,
 * no family signature): its whole data model is the Character param bag —
 * identityModel / coeffs / localChanges / customTargets — that downstream
 * cards consume as their identity source. So this studio reads differently
 * from motion's, and exactly how the owner asked: NO BOTTOM BAR — the mesh
 * fills the panel; the sculpting levers (presets + the SAME BodyShapePanel
 * the Body Studio tab uses) project into the rail (§7.10).
 *
 * The BRIDGE (carried verbatim from the inline editor it replaces — it was
 * right): the Body Studio surface is store-driven (useBodyStudio's
 * `editing` scratchpad); this component bridges that scratchpad to the
 * card's params without refactoring either body component:
 *
 * • on open / card switch: hydrate the scratchpad from stage.params — ONE
 *   shot, keyed on stage.id, never on params (live slider drags would be
 *   clobbered by the write-back).
 * • on every scratchpad change: persist the Character back to the card via
 *   onSave — skip the immediate echo that follows a hydrate (that callback
 *   closes over the PRE-hydrate editing and would re-clobber the card).
 *
 * E1: the scratchpad is UI state (like motion's timeline state); onSave is
 * the ONLY node write — {identityModel, coeffs, localChanges, customTargets}
 * exactly, per the registry's `writes` declaration.
 */
import { useEffect, useRef } from "react"
import { useBodyStudio, characterFromParams } from "./bodyStudio"
import { MeshPreviewCanvas } from "./MeshPreviewCanvas"
import { BodyShapePanel } from "./BodyShapePanel"
import { BODY_PRESETS } from "@melite/formats"
import { StudioShell, ViewportFrame, defineShellDeclaration } from "@melite/ui"

/** THE SHELL RIDE, as data (row 5 stroke 4) — declared for the
 *  wall while the full StudioShell ride lands in later strokes:
 *  the sculpt viewport is the body itself (kind "native"), the
 *  rail carries presets + levers (no part slots today). */
export const shellDeclaration = defineShellDeclaration({
  center: { kind: "native" },
  rail: { slots: [] },
})
import { Button } from "@melite/ui/button"
import { Tip } from "@melite/ui/tip"
import type { CardStage } from "@melite/contracts"
interface BodyCardEditorProps {
  stage: CardStage
  onSave: (params: Record<string, unknown>) => void
}

// Accepts {stage, onSave} — assignable to StudioTenantProps (E1). A body
// card never runs, so `running` carries no meaning here.
export function BodyCardEditor({ stage, onSave }: BodyCardEditorProps) {
  const editing = useBodyStudio((s) => s.editing)
  const setEditing = useBodyStudio((s) => s.setEditing)
  // Skip the first store→card write after a hydrate (see component docstring).
  const skipNextWrite = useRef(false)

  useEffect(() => {
    setEditing(characterFromParams(stage.params))
    skipNextWrite.current = true
  }, [stage.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (skipNextWrite.current) {
      skipNextWrite.current = false
      return
    }
    onSave({
      identityModel: editing.identityModel,
      coeffs: editing.coeffs ? [...editing.coeffs] : null,
      localChanges: editing.localChanges ? { ...editing.localChanges } : null,
      customTargets: editing.customTargets ? { ...editing.customTargets } : null,
    })
  }, [editing]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <StudioShell
      /* RAIL — presets + the sculpting levers, projected via the
         shell's rail portal. The wrapper is h-full so the slider
         panel stretches the slot (flex column: presets shrink-0,
         panel flex-1 scrolls its tabs). */
      rail={
        <div className="flex h-full min-h-0 flex-col">
          <div className="shrink-0 border-b border-white/[0.07] px-3 py-2.5">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
              Body type
            </p>
            {/* The labeled body archetypes (the "labels for any body
                type"): one click loads the preset into the scratchpad;
                the bridge persists it to the card. */}
            <div className="flex flex-wrap gap-1">
              {BODY_PRESETS.map((p) => (
                <Tip key={p.id} tip={p.description}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setEditing(p)}
                    aria-label={`Preset ${p.name}`}
                    className="rounded-full border border-sidebar-border/50 bg-sidebar/30 px-2.5 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:border-brand/50 hover:text-brand"
                  >
                    {p.name}
                  </Button>
                </Tip>
              ))}
            </div>
          </div>
          {/* The levers — Phenotype / Body / Face / Style tabs of sliders.
              Same panel the Body Studio tab uses; writes to the
              scratchpad, the bridge persists to the card. */}
          <div className="min-h-0 flex-1 px-3 pb-3 pt-2.5">
            <BodyShapePanel />
          </div>
        </div>
      }
      /* VIEWPORT — the mesh, full panel height, no bottom bar. The live
         preview deforms from the scratchpad on every slider drag
         (/poser/skin/* exactly as in the Body Studio tab). */
      center={
        <ViewportFrame label="Body — mesh viewport">
          <MeshPreviewCanvas character={editing} />
        </ViewportFrame>
      }
    />
  )
}
export default BodyCardEditor

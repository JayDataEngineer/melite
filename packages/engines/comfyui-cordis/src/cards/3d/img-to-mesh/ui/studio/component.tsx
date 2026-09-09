/**
 * TrellisStudio — tenant 3d/img_to_mesh (the glob id is the CARD DIR,
 * underscores and all), the lift-and-rig authoring surface.
 *
 * The SAME shared generic AssemblyStudio Anny runs — no second body:
 * a slot-table declaration (input image + the rig donor/target GLBs)
 * over the part-slot rail + Stage viewport. Trellis no longer rides
 * the default schema form.
 *
 * THE SOURCE PIN (2026-09-06, operator order: "We need to have an
 * image preview when the card is drilled out"): the input image
 * stays pinned over the Stage (the Meshy/Luma reference pattern) —
 * estateInputUrl maps the data/input param through the preview door,
 * so the pin survives reload; a non-previewable value renders no pin.
 *
 * E1: onSave (input_image/rigged_glb/target_glb, per studio.writes)
 * is the ONLY param write channel. Resolution/steps/cfg ride the
 * shell's Node inputs fold (owns_params=False).
 */
import { estateInputUrl } from "@melite/catalog"
import { defineShellDeclaration } from "@melite/ui"
import { AssemblyStudio, type AssemblySlot, type AssemblyStudioProps } from "@melite-plugin/3d/ui/studios/assembly"

export const TRELLIS_SLOTS: AssemblySlot[] = [
  { key: "input_image", label: "Source image", required: true, accept: "image", glyph: "photo" },
  { key: "rigged_glb", label: "Rig donor", required: false, accept: "glb", glyph: "body" },
  { key: "target_glb", label: "Rig target", required: false, accept: "glb", glyph: "body" },
]

/** THE SHELL RIDE, as data (row 5 stroke 4): the shared Stage in the
 *  center, the three part slots in the rail, no bottom bar. The
 *  describeShellTenant harness + the shell wall pin this table
 *  against what renders — drift refuses. */
export const shellDeclaration = defineShellDeclaration({
  center: { kind: "stage3d" },
  rail: { slots: TRELLIS_SLOTS.map((s) => s.key) },
})

export type TrellisStudioProps = Omit<AssemblyStudioProps, "slots" | "headline" | "hint">

export function TrellisStudio(props: TrellisStudioProps) {
  const raw = props.stage.params["input_image"]
  const source = typeof raw === "string" && raw ? estateInputUrl(raw) : null
  return (
    <AssemblyStudio
      {...props}
      slots={TRELLIS_SLOTS}
      headline="Lift + rig — image in, mesh out"
      hint="Source image is required — the lane lifts it into a textured mesh. Rig donor + target drive the transfer_rig arm; the composite mesh appears on the stage after the run."
      referenceImage={{ url: source, label: "Source image" }}
    />
  )
}

export default TrellisStudio

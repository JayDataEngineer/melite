/**
 * TrellisStudio — descriptor + extras over the shared assembly-tenant
 * cases (the generic abstraction proven twice: Trellis runs the SAME
 * AssemblyStudio Anny runs). This file states ONLY what is Trellis':
 * the three lift+rig slots and the run-mesh-to-loader wiring.
 */
import { it, expect, vi } from "vitest"
import { screen } from "@testing-library/react"
import {
  describeShellTenant,
  loaderUrls,
} from "./assembly-tenant-shared"
import TrellisStudioDefault, {
  TrellisStudio,
  shellDeclaration,
} from "../../../../../packages/engines/comfyui/action_cards/3d/img_to_mesh/ui/studio/component"

describeShellTenant({
  declaration: shellDeclaration,
  label: "TrellisStudio tenant (3d/img_to_mesh)",
  Component: TrellisStudio,
  Default: TrellisStudioDefault,
  stageBase: {
    id: "trellis-1",
    title: "Image → 3D",
    kind: "img-to-mesh",
    service: "trellis2-native",
  },
  slotsTitle: "renders the lift + rig slots",
  slots: ["input_image", "rigged_glb", "target_glb"],
  sourcePin: { slot: "input_image", label: "Source image" },
  extraCases: ({ renderTenant, mockStage }) => {
    it("offers the run's mesh GLB to the shared loader", async () => {
      renderTenant(
        <TrellisStudio
          stage={mockStage({
            result: {
              assetUrls: ["https://cdn.test/trellis_lift.glb"],
              artifacts: {},
              metadata: {},
            },
          })}
          onSave={() => {}}
          upstreams={[]}
        />,
      )
      await vi.waitFor(() => {
        expect(loaderUrls()).toContain(
          "https://cdn.test/trellis_lift.glb",
        )
      })
      expect(screen.queryByRole("alert")).toBeNull()
    })
  },
})

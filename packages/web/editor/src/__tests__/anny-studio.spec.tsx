/**
 * AnnyStudio — descriptor + extras over the shared assembly-tenant
 * cases (mock rig, default-export pin, empty state, FAIL alert all
 * live in assembly-tenant-shared — this file states ONLY what is
 * Anny's: the two slots (DESCOPE 2026-09-05 — hair/outfit left the
 * card) and the servable-part / mount-note wiring).
 */
import { it, expect, vi } from "vitest"
import { fireEvent, screen } from "@testing-library/react"
import {
  describeShellTenant,
  loaderUrls,
} from "./assembly-tenant-shared"
import AnnyStudioDefault, {
  AnnyStudio,
  shellDeclaration,
} from "@melite/3d-anny/ui/studio/component"

describeShellTenant({
  declaration: shellDeclaration,
  label: "AnnyStudio tenant (3d/anny)",
  Component: AnnyStudio,
  Default: AnnyStudioDefault,
  stageBase: { id: "anny-1", title: "Anny", kind: "anny", service: "anny" },
  slotsTitle: "renders the two part slots",
  slots: ["body_glb", "source_image"],
  // ONE MESH (operator order, 2026-09-06: "Can you tell of an app
  // that has two meshes like this?" — none does): the native anny
  // figure is the mesh; this tenant renders NO GLB Stage.
  viewport: "none",
  // THE SOURCE PIN (same day, operator order: "We need to have an
  // image preview when the card is drilled out"): the photo pins
  // top-right over the native figure — the one mesh AND the photo
  // it came from, both in view.
  sourcePin: { slot: "source_image", label: "Source photo" },
  extraCases: ({ renderTenant, mockStage }) => {
    it("ONE MESH: a servable body GLB is an artifact chip, never a loader call", async () => {
      const onSave = vi.fn()
      renderTenant(
        <AnnyStudio
          stage={mockStage({
            params: { body_glb: "https://cdn.test/body.glb" },
          })}
          onSave={onSave}
          upstreams={[]}
        />,
      )
      // The body GLB NEVER reaches the loader — the native figure
      // above is the one mesh; the GLB is the bake artifact (the
      // Body chip carries it, the turnaround render consumes it).
      await vi.waitFor(() => {
        expect(loaderUrls()).not.toContain("https://cdn.test/body.glb")
      })
      expect(loaderUrls()).toHaveLength(0)
      expect(screen.queryByRole("alert")).toBeNull()
    })
    it("a mount-path body GLB gets a named note, never a loader call", async () => {
      renderTenant(
        <AnnyStudio
          stage={mockStage({ params: { body_glb: "/mnt/models/body.glb" } })}
          onSave={vi.fn()}
          upstreams={[]}
        />,
      )
      // The mount path NEVER reaches the loader — composable, not servable…
      await vi.waitFor(() => {
        expect(loaderUrls()).not.toContain("/mnt/models/body.glb")
      })
      // …and the note names the key AND the path (no mystery).
      const note = screen.getByRole("note")
      expect(note.textContent).toMatch(/body_glb/)
      expect(note.textContent).toMatch(/\/mnt\/models\/body\.glb/)
    })
    it("the Apply chip warns when the slot holds an estimated body (the bake replaces, never tweaks)", async () => {
      // 2026-09-06: the anny-params bake takes the lever recipe
      // ALONE (no body input) — Apply after Estimate destroys the
      // photo body. The chip must say "Replace estimated body",
      // not "Apply to Body".
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => ({ ok: false })),
      )
      try {
        renderTenant(
          <AnnyStudio
            stage={mockStage({
              params: {
                body_glb: "https://cdn.test/estimated.glb",
                body_origin: "estimated",
              },
            })}
            onSave={vi.fn()}
            upstreams={[]}
          />,
        )
        expect(screen.getByText("Replace estimated body")).toBeTruthy()
        expect(screen.queryByText("Apply to Body")).toBeNull()
      } finally {
        vi.unstubAllGlobals()
      }
    })
    it("mounts the Character Maker (the one-card merge): Shape band + Apply, no eager writes", async () => {      // The identity-space + poser fetches may fail in jsdom — the
      // band renders regardless (the panel surfaces its own error).
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => ({ ok: false })),
      )
      const onSave = vi.fn()
      try {
        renderTenant(
          <AnnyStudio
            stage={mockStage({ params: {} })}
            onSave={onSave}
            upstreams={[]}
          />,
        )
        // The band is there: heading + the Apply-to-Body button (the
        // queue door for the anny-params bake).
        expect(screen.getByText("Shape — the character")).toBeTruthy()
        expect(screen.getByText("Apply to Body")).toBeTruthy()
        // Hydrate-echo skipped: nothing is written until the user
        // sculpts (a phantom write would dirty the draft at open).
        expect(onSave).not.toHaveBeenCalled()
      } finally {
        vi.unstubAllGlobals()
      }
    })

    it("rails ONE concern at a time: Character/Render/Import tabs, scrolling pane, drawer replaces the band", async () => {
      // Operator order, 2026-09-06: "you have SHAPE and Turnaround
      // AT THE SAME TIME! That is too many" + "NOT EVEN A SCROLL?"
      // then "Load preset should be another option beside character
      // and render. It can be 'Import'".
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => ({ ok: false })),
      )
      try {
        renderTenant(
          <AnnyStudio
            stage={mockStage({ params: {} })}
            onSave={vi.fn()}
            upstreams={[]}
          />,
        )
        // The tab strip: Character + Render + Import.
        const tabs = screen.getAllByRole("tab")
        expect(tabs.map((t) => t.textContent)).toEqual(["Character", "Render", "Import"])
        // Character tab: Shape visible; presets + turnaround are NOT
        // (one concern — presets moved to Import).
        expect(screen.getByText("Shape — the character")).toBeTruthy()
        expect(screen.queryByText("Body type — presets")).toBeNull()
        expect(screen.queryByText("Turnaround — render params")).toBeNull()
        // The pane owns the one scroll surface.
        const pane = screen.getByRole("tabpanel")
        expect(pane.className).toContain("overflow-y-auto")
        // Import: presets + the commercial estimate arrive together —
        // one button (no engine picker, no dead refine), and the
        // STANDARD image well (kit SlotSquare) that feeds the Source
        // photo slot through the uploads door.
        fireEvent.click(screen.getByRole("tab", { name: "Import" }))
        expect(screen.getByText("Body type — presets")).toBeTruthy()
        expect(screen.getByText("Estimate from photo — SOMA-X commercial")).toBeTruthy()
        expect(screen.getByRole("button", { name: "Estimate body from photo (queue run)" })).toBeTruthy()
        expect(screen.getByText("Source photo")).toBeTruthy()
        expect(document.querySelector("[data-slot-square]")).toBeTruthy()
        expect(screen.queryByLabelText("Estimator engine")).toBeNull()
        expect(screen.queryByText("Refine body (soon)")).toBeNull()
        expect(screen.queryByText("Shape — the character")).toBeNull()
        // Render: turnaround; Shape still not co-rendered.
        fireEvent.click(screen.getByRole("tab", { name: "Render" }))
        expect(screen.getByText("Turnaround — render params")).toBeTruthy()
        // Back to Character: Expand moves the band into the drawer.
        fireEvent.click(screen.getByRole("tab", { name: "Character" }))
        fireEvent.click(screen.getByRole("button", { name: "Expand Shape sliders into the viewport drawer" }))
        expect(screen.getByRole("button", { name: "Collapse Shape back into the rail" })).toBeTruthy()
        // ONE panel instance: the rail band's heading is gone (the
        // drawer carries the single "Shape — the character").
        expect(screen.getAllByText("Shape — the character").length).toBe(1)
      } finally {
        vi.unstubAllGlobals()
      }
    })
  },
})

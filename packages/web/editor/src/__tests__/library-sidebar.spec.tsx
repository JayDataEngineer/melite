// library-sidebar.spec.tsx — the Library right rail (task #74).
//
// The rail is the ACTION vocabulary, in the user's words (2026-08-07):
// "Flows are a series of connected actions... the user or AI doesn't
// need to understand any complexities." ONE section:
//   Capabilities — the SAME tiles as the ServicePicker dialog (one
//   derivation path: lib/capabilityCards.ts). Click = the card lands on
//   the canvas (addStage) — ComfyUI's "add node from sidebar" model.
//   NO modal auto-open: the canvas stays in view.
//
// The run archive is NOT in the rail (two-surfaces kill, 2026-08-07): past
// runs live in the left Media drawer (AppSidebar — "Open as cards") and in
// each card's detail modal. This spec pins that single-surface contract.
// Phase 4 (2026-08-11) added the flow TEMPLATES (former FlowNodes
// drawer) + the AI Generated workflow families to the rail — what can be
// made is ONE view; past runs are still the archive's one home.
// This spec proves the real component against the real store; only the
// network layer (catalog fetch) is mocked.
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { render as renderBase, screen, cleanup, fireEvent, waitFor } from "@testing-library/react"
import type { ReactElement } from "react"
import { TooltipProvider } from "@melite/ui/tooltip"

// LibrarySidebar tiles mount the Radix Tip (tooltip unification 2026-08-14)
// — render under the app's TooltipProvider, the same one App.tsx uses.
function renderWithTooltip(ui: ReactElement) {
  return renderBase(<TooltipProvider>{ui}</TooltipProvider>)
}

vi.mock("@melite/catalog/api", () => ({
  apiFetch: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}), text: async () => "" }),
  apiJson: vi.fn(),
}))
import { apiFetch } from "@melite/catalog"
vi.mock("sonner", () => {
  const fn = vi.fn()
  return {
    toast: Object.assign(fn, { error: vi.fn(), success: vi.fn(), info: vi.fn() }),
  }
})

// The tab test only asserts the rail toggle — stub the canvas so the tab
// renders in isolation (the canvas has its own spec).
vi.mock("../surfaces/flow/FlowCanvas", () => ({
  FlowCanvas: () => <div data-testid="canvas" />,
}))

import { LibrarySidebar } from "../surfaces/library/LibrarySidebar"
import { LibraryTab } from "../surfaces/library/LibraryTab"
import { RightPanelHost } from "../surfaces/shared/RightPanelHost"
import { useLibraryFlowStore } from "../surfaces/flow/flowStore"
import { useRightPanelStore } from "../surfaces/shared/rightPanelStore"
// Mount the shell seam this rail depends on: the supported set is
// seeded from the center registrations (the registry IS the vocabulary
// - a surface rendered without its shell gets no rail facts).
import "../shell/centerEntries"
import "../shell/rightPanelEntries"
import { primeCatalog, type Catalog } from "@melite/catalog"

const FAKE_CATALOG: Catalog = {
  families: {
    "krea-2": { label: "Krea 2", genre: "image" },
    "qwen-edit": { label: "Qwen Edit", genre: "image" },
    // Phase 4: an AI Generated family — synthesized by the backend's
    // _merge_workspace_catalog from a workspace workflow (genre
    // "ai_generated", model entry form_ai_generated, NO capabilities).
    "wf_character_rig": { label: "Character Rig Flow", genre: "ai_generated" },
  },
  models: {
    "krea-2": { family: "krea-2", form: "form_generate", label: "Krea 2", prompt_in_form: true },
    "qwen-edit-base": { family: "qwen-edit", form: "form_edit", label: "Qwen Edit", input: "input_image", prompt_in_form: true },
    "wf_character_rig": { family: "wf_character_rig", form: "form_ai_generated", label: "Character Rig Flow", prompt_in_form: true },
  },
  capabilities: {
    image: {
      label: "Generate",
      kind: "generation",
      description: "Generate images from text prompts.",
      icon: "Image",
      default_family: "krea-2",
      families: ["krea-2"],
      resolved: { family: "krea-2", model: "krea-2", params: { width: 1024 } },
    },
    image_edit: {
      label: "Edit",
      kind: "generation",
      description: "Edit or modify an existing image.",
      icon: "Wand2",
      default_family: "qwen-edit",
      families: ["qwen-edit"],
      resolved: { family: "qwen-edit", model: "qwen-edit-base", params: {} },
    },
  },
}

beforeEach(() => {
  primeCatalog(FAKE_CATALOG)
  useLibraryFlowStore.getState().clear()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("LibrarySidebar — provenance badges (2026-08-09)", () => {
  // The runs endpoint is mocked per-test; restore the generic empty-body
  // mock afterwards (clearAllMocks resets calls, not implementations).
  const runsResponse = (runs: unknown[]) => ({
    ok: true,
    json: async () => ({ runs }),
  }) as never
  const defaultMock = async () => ({ ok: true, json: async () => ({}) }) as never

  afterEach(() => {
    vi.mocked(apiFetch).mockImplementation(defaultMock)
  })

  it("badges a capability whose default family has completed runs", async () => {
    vi.mocked(apiFetch).mockImplementation(async (url) => {
      if (url === "/v1/flows/runs") {
        return runsResponse([
          { run_id: "r1", status: "done", created_at: 100, families: ["krea-2"] },
          { run_id: "r2", status: "done", created_at: 200, families: ["krea-2"] },
          // Still running — must NOT count toward Edit's provenance.
          { run_id: "r3", status: "running", created_at: 300, families: ["qwen-edit"] },
        ])
      }
      return defaultMock()
    })
    renderWithTooltip(<LibrarySidebar />)
    await screen.findByText("Generate")

    // Generate (default_family krea-2) has 2 done runs → ✓ 2. Exactly one
    // badge: Edit's run is not done yet.
    const badge = await screen.findByText("✓ 2")
    expect(badge).toBeTruthy()
    expect(screen.queryAllByText(/^✓/)).toHaveLength(1)
    // The provenance rides in the tile's Tip tooltip AND the badge's
    // aria-label (tooltip unification 2026-08-14 — no native titles left).
    expect(screen.getByLabelText(/2 completed runs/)).toBeTruthy()
  })

  it("shows NO badge when no run used the capability's family", async () => {
    vi.mocked(apiFetch).mockImplementation(async (url) => {
      if (url === "/v1/flows/runs") {
        return runsResponse([
          // Done, but for a family neither tile declares.
          { run_id: "r1", status: "done", created_at: 100, families: ["trellis2"] },
        ])
      }
      return defaultMock()
    })
    renderWithTooltip(<LibrarySidebar />)
    await screen.findByText("Generate")
    expect(screen.queryAllByText(/^✓/)).toHaveLength(0)
    expect(screen.queryByLabelText(/completed runs/)).toBeNull()
  })
})

describe("LibrarySidebar — the action vocabulary", () => {
  it("renders capability tiles", async () => {
    renderWithTooltip(<LibrarySidebar />)
    await screen.findByText("Generate")
    expect(screen.getByText("Edit")).toBeTruthy()
  })

  it("capability click lands a card on the canvas — no modal, just addStage", async () => {
    renderWithTooltip(<LibrarySidebar />)
    await screen.findByText("Generate")

    fireEvent.click(screen.getByText("Generate"))
    await waitFor(() => {
      const p = useLibraryFlowStore.getState().flow
      expect(p?.stages).toHaveLength(1)
    })
    const stage = useLibraryFlowStore.getState().flow!.stages[0]
    // Same derivation as the ServicePicker: resolved route + seeded prompt
    // (prompt_in_form → the card carries a prompt field to type into).
    expect(stage.service).toBe("krea-2")
    expect(stage.params.prompt).toBe("")
    expect(stage.params.width).toBe(1024)
  })

  it("has NO run archive — one archive surface, the left Media drawer", async () => {
    renderWithTooltip(<LibrarySidebar />)
    await screen.findByText("Generate")
    // The flow-templates section retired with the yaml spec library
    // (2026-09-05) — the rail carries capabilities + AI Generated only,
    // and never a "Flows" header.
    expect(screen.queryByText("Flows")).toBeNull()
    // The run ARCHIVE is still NOT here — past runs stay in the left Media
    // drawer (AppSidebar — "Open as cards") + each card's detail modal.
    // ONE archive surface, not two (2026-08-07).
    expect(screen.queryByText(/No runs yet/)).toBeNull()
    expect(screen.queryByText("Open as cards")).toBeNull()
  })

  it("renders AI Generated workflow families as tiles — click lands a card", async () => {
    renderWithTooltip(<LibrarySidebar />)
    // The Phase 4 section: agent-persisted workspace workflows (genre
    // "ai_generated") surface as tiles — they have NO capabilities, so
    // this section is their only rail surface.
    await screen.findByText("Character Rig Flow")

    fireEvent.click(screen.getByText("Character Rig Flow"))
    await waitFor(() => {
      const p = useLibraryFlowStore.getState().flow
      expect(p?.stages).toHaveLength(1)
    })
    const stage = useLibraryFlowStore.getState().flow!.stages[0]
    // Same derivation the picker's (removed) family grid used
    // (familyEntryToCard): service = fam.default_model ?? familyId.
    expect(stage.service).toBe("wf_character_rig")
    expect(stage.kind).toBe("generation")
    expect(stage.title).toBe("Character Rig Flow")
  })
})

describe("LibraryTab — canvas + optional rail", () => {
  it("renders the sidebar when the rail is open (default) and hides it when closed", async () => {
    // H-RIGHT: the rail is layout-owned — render the tab + the host (the
    // exact composition WorkspaceLayout mounts for the library mode).
    const tree = (
      <TooltipProvider>
        <LibraryTab />
        <RightPanelHost tab="library" />
      </TooltipProvider>
    )
    const { rerender } = renderBase(tree)
    expect(screen.getByTestId("canvas")).toBeTruthy()
    await screen.findByText("Generate") // pane mounted (open.library default true)

    // Close the rail via the store (the header toggle's action).
    useRightPanelStore.getState().setOpen("library", false)
    rerender(tree)
    // H-RIGHT keep-mounted (2026-08-21): the rail NO LONGER unmounts on
    // close — the DSH rule. Closed renders as a width-0 INERT wrapper:
    // out of the layout, out of the tab order, pane state intact.
    const rail = document.querySelector("[data-right-rail]") as HTMLElement | null
    expect(rail).toBeTruthy()
    expect(rail!.style.width).toBe("0px")
    expect(rail!.getAttribute("inert")).not.toBeNull()
    expect(screen.getByText("Generate")).toBeTruthy()
  })
})

// ── Tile-grid law (2026-08-26) ───────────────────────────────────────────
// The cards tiles were a hardcoded flex-wrap (min-w-[calc(50%-0.25rem)] +
// flex-1): tiles STRETCHED with the rail and a lone leftover went
// full-width. The Media archive's sizing law is fixed-size cells + CSS
// auto-fill ("extra width becomes MORE COLUMNS, not bigger icons") — the
// rail now renders every tile row through the shared TileGrid primitive.
// This spec pins that so the flexbox stretch cannot quietly come back.
describe("LibrarySidebar — tile grid law", () => {
  it("renders tile rows ONLY as the shared fixed-cell TileGrid, never flexbox", async () => {
    renderWithTooltip(<LibrarySidebar />)
    await screen.findByText("Generate")

    // Every tile row carries the auto-fill track declaration from TileGrid;
    // a bespoke row layout would fail the no-flex-wrap assertions below.
    // The rows render inline (only Tip popovers portal out), so document-
    // wide selection is safe — and catches any row outside container too.
    const grids = Array.from(document.querySelectorAll<HTMLElement>('div[class*="repeat(auto-fill"]'))
    expect(grids.length).toBeGreaterThan(0)
    for (const g of grids) {
      expect(g.className).toContain("gap-1 px-1 pb-1.5")
      expect(g.className).toContain("grid")
      expect(g.className).not.toContain("flex-wrap")
    }
  })

  it("tiles are fixed-cell children — no stretch classes survive in the rail", async () => {
    const { container } = renderWithTooltip(<LibrarySidebar />)
    await screen.findByText("Generate")

    // The old COMPACT_TILE_CLASS sizing (flex-1 + ~50% min-width) must be
    // gone everywhere: the button fills its grid cell via the grid, and
    // min-w-0 just lets the label truncate inside it.
    const tile = container.querySelector('[data-capability-tile="image"]') as HTMLElement
    expect(tile).toBeTruthy()
    expect(tile.className).toContain("min-w-0")
    expect(tile.className).not.toContain("flex-1")
    expect(tile.className).not.toContain("min-w-[calc")
    expect(container.innerHTML).not.toContain("flex-wrap")
  })
})

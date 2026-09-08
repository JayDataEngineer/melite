/**
 * CardStudio — MODEL SWITCH (2026-09-06, the missing Model dropdown).
 *
 * The shell owns the service picker the way it owns Run: genre-blind,
 * catalog-driven. Pins: siblings render as options; a lone model renders
 * no row; switching prunes stale family params (extra=forbid rows refuse
 * them — input_image carried onto transfer_rig) and commits through
 * onServiceChange; no onServiceChange prop renders no row.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { TooltipProvider } from "@melite/ui/tooltip"

const { loadCatalog } = vi.hoisted(() => ({ loadCatalog: vi.fn() }))
vi.mock("@melite/catalog", async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>
  return {
    ...actual,
  loadCatalog,
  dropdownModels: vi.fn((form: string, cat: { models?: Record<string, { form?: string }> }) =>
    Object.entries(cat.models ?? {}).filter(([, m]) => m.form === form).map(([k]) => k)),
  cardSlotsFor: vi.fn((service: string) =>
    service === "transfer_rig" ? ["rigged_glb", "target_glb", "seed"] : ["input_image", "seed"]),
  inputSlots: vi.fn(() => ["input_image"] as readonly string[]),
  isUndeclaredWireSlot: vi.fn(() => false),
  }
})

import { CardStudio } from "../surfaces/flow/CardStudio"
import type { CardStage } from "@melite/contracts"
import type { CardBody } from "@melite/slots"

const THREE_MODELS = {
  models: {
    "trellis2-native": { form: "form_img_to_mesh" },
    "pixal3d": { form: "form_img_to_mesh" },
    "transfer_rig": { form: "form_img_to_mesh" },
  },
}

function stageWith(params: Record<string, unknown>, service = "trellis2-native"): CardStage {
  return {
    id: "s1", title: "Image 3D", service, params, status: "idle",
  } as unknown as CardStage
}

const entry = { body: (): null => null, ownsParams: true } as unknown as CardBody

function mount(stage: CardStage, onServiceChange?: (p: Record<string, unknown>, s: string) => void) {
  return render(
    <TooltipProvider>
      <CardStudio stage={stage} running={false} entry={entry} onSave={() => {}} onServiceChange={onServiceChange} onClose={() => {}} />
    </TooltipProvider>
  )
}

describe("CardStudio model switch", () => {
  beforeEach(() => {
    loadCatalog.mockClear()
    loadCatalog.mockResolvedValue(THREE_MODELS)
  })

  it("renders the three lift/rig siblings as options", async () => {
    mount(stageWith({ input_image: "data:x", seed: 7 }), () => {})
    const sel = await screen.findByTestId("studio-model-select") as HTMLSelectElement
    expect(sel.options.length).toBe(3)
    expect(sel.value).toBe("trellis2-native")
  })

  it("switching prunes stale family params through onServiceChange", async () => {
    const onServiceChange = vi.fn()
    mount(stageWith({ input_image: "data:x", seed: 7 }), onServiceChange)
    const sel = await screen.findByTestId("studio-model-select")
    fireEvent.change(sel, { target: { value: "transfer_rig" } })
    await waitFor(() => expect(onServiceChange).toHaveBeenCalledTimes(1))
    expect(onServiceChange).toHaveBeenCalledWith({ seed: 7 }, "transfer_rig")
  })

  it("a lone model renders no row", async () => {
    loadCatalog.mockResolvedValue({ models: { "trellis2-native": { form: "form_img_to_mesh" } } })
    mount(stageWith({}), () => {})
    await waitFor(() => expect(loadCatalog).toHaveBeenCalled())
    expect(screen.queryByTestId("studio-model-select")).toBeNull()
  })

  it("no onServiceChange renders no row", async () => {
    mount(stageWith({}))
    await waitFor(() => expect(loadCatalog).not.toHaveBeenCalled())
    expect(screen.queryByTestId("studio-model-select")).toBeNull()
  })
})

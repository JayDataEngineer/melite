// service-picker-action-cards.spec.tsx — pins the ONE-surface picker.
//
// Operator order, 2026-09-04: "I see this twice, repeated in different
// forms" — the picker listed the operator's action cards AND a
// "What do you want to make?" capability grid over the SAME lanes. The
// capability grid is GONE; the action cards (/v1/card-tools) ARE the
// picker. Same day, earlier: MODELS ARE NOT ENTRIES ("the only way to
// actually do inference is through action cards, yet I see the model
// level as available for inference") — a card tile shows its manifest's
// declared model as a SUBTITLE (card identity), and model choice lives
// on the CARD form, never here.
//
// This file pins:
// 1. The action-card list renders from /v1/card-tools (title + model
//    subtitle); NO capability section, NO "What do you want to make?"
//    heading, NO capability tiles, NO capability-category headers.
// 2. Cards group into CATEGORIES derived from the cached model
//    catalog's per-model genre (operator order: "organize this menu
//    into categories") — no category list in the picker source; an
//    unresolvable model reads "other". data-card-category marks each
//    group (distinct from the dead data-capability-category above).
// 3. Picking seeds params from the manifest's own declared defaults.
// 4. Search filters cards (name, title, model); empty groups hide.
// 5. A failed / non-list /v1/card-tools payload is FATAL and LOUD — the
//    picker has no second surface to fall back to (no silent swallow).
// 6. No ControlNet advertisement text anywhere (the surfaces that once
//    carried it — capability tiles, family tiles — are both gone; the
//    backend honesty gate lives at
//    tests/unit/test_catalog_validation.py::
//    test_controlnet_declarations_have_on_disk_backing).
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, act, waitFor, cleanup, within } from "@testing-library/react"
import { TooltipProvider } from "@melite/ui/tooltip"

// The picker's ONE fetch: /v1/card-tools (action-card manifests). Mocked
// per-suite; the default serves the happy path. The REST of the real
// catalog module stays live (familyEntryToCard's lib path imports from it)
// — except the two grouping reads, stubbed with a fixed genre map so the
// category pins are hermetic (no catalog boot in this suite).
vi.mock("@melite/catalog", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@melite/catalog")>()),
  apiJson: (...a: unknown[]) => apiJsonMock(...a),
  getCachedCatalog: () => ({
    models: {
      "krea-2": { genre: "image" },
      "qwen3-tts": { genre: "audio" },
      "wan-vace": { genre: "video" },
    },
  }),
  onCatalogReady: () => () => {},
}))

import { ServicePicker } from "../surfaces/flow/ServicePicker"
import { familyEntryToCard, type PickedCard } from "@melite/formats"
import type { Catalog } from "@melite/catalog"

// The picker's ONE fetch: /v1/card-tools (action-card manifests). Mocked
// per-suite; the default serves the happy path.
const apiJsonMock = vi.fn().mockResolvedValue([])

// Mirrors ONE packages/*/cards/*/tool.json manifest (the /v1/card-tools row).
const CARDS = [
  {
    name: "image_card",
    model: "krea-2",
    stage_title: "Image",
    description: "Generate an image.",
    kind: "generation",
    params_schema: { properties: { prompt: { type: "string", default: "" }, steps: { type: "number", default: 8 } } },
  },
  {
    name: "tts_card",
    model: "qwen3-tts",
    stage_title: "TTS",
    kind: "generation",
    params_schema: { properties: { text: { type: "string", default: "hello" } } },
  },
  { name: "video_card", model: "wan-vace", stage_title: "Video", kind: "generation" },
]

function renderPicker(onPick: (c: PickedCard) => void, props: Record<string, unknown> = {}) {
  return render(
    <TooltipProvider>
      <ServicePicker open onOpenChange={() => {}} onPick={onPick} {...props} />
    </TooltipProvider>,
  )
}

describe("ServicePicker — ONE surface: action cards", () => {
  it("renders the action-card list and NOTHING else — no capability section", async () => {
    apiJsonMock.mockResolvedValue(CARDS)
    renderPicker(() => {})
    // The one heading.
    expect(await screen.findByText("Your action cards")).toBeTruthy()
    // Card tiles: stage title + model SUBTITLE (card identity, not a choice).
    expect(screen.getByText("Image")).toBeTruthy()
    expect(screen.getByText("krea-2")).toBeTruthy()
    expect(screen.getByText("TTS")).toBeTruthy()
    expect(screen.getByText("wan-vace")).toBeTruthy()
    // The second list is GONE (operator order, 2026-09-04).
    expect(screen.queryByText("What do you want to make?")).toBeNull()
    expect(document.querySelectorAll("[data-capability-tile]").length).toBe(0)
    expect(document.querySelectorAll("[data-capability-category]").length).toBe(0)
    // No CN advertisement text survives anywhere in the picker.
    expect(document.body.textContent ?? "").not.toContain("CN:")
  })

  it("cards group into genre categories — Image tile under image, TTS under audio", async () => {
    apiJsonMock.mockResolvedValue(CARDS)
    renderPicker(() => {})
    await screen.findByText("Your action cards")
    const imageGroup = document.querySelector('[data-card-category="image"]')
    const audioGroup = document.querySelector('[data-card-category="audio"]')
    const videoGroup = document.querySelector('[data-card-category="video"]')
    expect(imageGroup).toBeTruthy()
    expect(audioGroup).toBeTruthy()
    expect(videoGroup).toBeTruthy()
    expect(within(imageGroup as HTMLElement).getByText("Image")).toBeTruthy()
    expect(within(imageGroup as HTMLElement).queryByText("TTS")).toBeNull()
    expect(within(audioGroup as HTMLElement).getByText("TTS")).toBeTruthy()
    expect(within(videoGroup as HTMLElement).getByText("Video")).toBeTruthy()
    // Groups sort alphabetically: audio, image, video.
    const order = [...document.querySelectorAll("[data-card-category]")].map((el) =>
      el.getAttribute("data-card-category"),
    )
    expect(order).toEqual(["audio", "image", "video"])
  })

  it("a card whose model is absent from the catalog reads 'other' — never a guess", async () => {
    apiJsonMock.mockResolvedValue([
      ...CARDS,
      { name: "mystery_card", model: "unlisted-model", stage_title: "Mystery" },
    ])
    renderPicker(() => {})
    await screen.findByText("Your action cards")
    const other = document.querySelector('[data-card-category="other"]')
    expect(other).toBeTruthy()
    expect(within(other as HTMLElement).getByText("Mystery")).toBeTruthy()
  })

  it("picking a card seeds params from the manifest's declared defaults", async () => {
    apiJsonMock.mockResolvedValue(CARDS)
    let picked: PickedCard | null = null
    renderPicker((c) => { picked = c })
    fireEvent.click(await screen.findByText("Image"))
    expect(picked).toEqual({
      service: "krea-2",
      title: "Image",
      params: { prompt: "", steps: 8 },
      kind: "generation",
    })
  })

  it("a card without params_schema lands with empty params and its name as title", async () => {
    apiJsonMock.mockResolvedValue([CARDS[2]])
    let picked: PickedCard | null = null
    renderPicker((c) => { picked = c })
    fireEvent.click(await screen.findByText("Video"))
    expect(picked).toEqual({ service: "wan-vace", title: "Video", params: {}, kind: "generation" })
  })

  it("search filters cards by title, name, and model — nothing else exists to match", async () => {
    apiJsonMock.mockResolvedValue(CARDS)
    renderPicker(() => {})
    const input = await waitFor(() => screen.getByPlaceholderText("Search action cards…"))
    await act(async () => {
      fireEvent.change(input, { target: { value: "qwen3" } })
    })
    expect(screen.getByText("TTS")).toBeTruthy()
    expect(screen.queryByText("Image")).toBeNull()
    expect(screen.queryByText("Video")).toBeNull()
    // Empty groups hide: only the audio category survives the filter.
    expect(document.querySelectorAll("[data-card-category]").length).toBe(1)
    expect(document.querySelector('[data-card-category="audio"]')).toBeTruthy()
  })

  it("a FAILED /v1/card-tools fetch is FATAL and LOUD — never an empty silent picker", async () => {
    apiJsonMock.mockRejectedValue(new Error("gateway down"))
    renderPicker(() => {})
    expect(await screen.findByText("gateway down")).toBeTruthy()
    expect(screen.queryByText("Your action cards")).toBeNull()
  })

  it("a non-list payload is refused loudly (no fake-empty list)", async () => {
    apiJsonMock.mockResolvedValue({ families: {}, capabilities: {} })
    renderPicker(() => {})
    expect(await screen.findByText(/non-list payload/)).toBeTruthy()
  })

  it("the Group Cards entry renders only when canGroup AND onGroupAction are wired", async () => {
    apiJsonMock.mockResolvedValue(CARDS)
    const { unmount } = renderPicker(() => {}, { canGroup: true })
    await screen.findByText("Your action cards")
    expect(document.querySelector("[data-group-action-entry]")).toBeNull()
    unmount()
    cleanup()
    renderPicker(() => {}, { canGroup: true, onGroupAction: () => {} })
    expect(await screen.findByText("Group Cards")).toBeTruthy()
  })
})

// familyEntryToCard (the @melite/formats lib) still serves the surfaces
// that legitimately derive cards from families — the LibrarySidebar's
// AI-Generated rail and the media-drop input card. These unit pins are
// LIB contract tests (the picker no longer calls this path).
describe("familyEntryToCard — lib contract (sidebar/input surfaces)", () => {
  const MASK = {
    families: { mask_studio: { label: "Mask Studio", genre: "image" } },
    models: {
      sam3: { family: "mask_studio", form: "form_mask_studio", label: "SAM3" },
    },
  } as unknown as Catalog

  it("falls through to the first MEMBER when no default_model is declared", () => {
    const card = familyEntryToCard(MASK, "mask_studio", MASK.families.mask_studio)
    expect(card.service).toBe("sam3")
  })

  it("a declared default_model that is a member wins", () => {
    const cat = { ...MASK, families: { mask_studio: { ...MASK.families.mask_studio, default_model: "sam3" } } } as Catalog
    expect(familyEntryToCard(cat, "mask_studio", cat.families.mask_studio).service).toBe("sam3")
  })

  it("a family whose member key equals the id resolves to itself (krea shape)", () => {
    const cat = {
      families: { "krea-2": { label: "Krea 2", genre: "image" } },
      models: { "krea-2": { family: "krea-2", form: "form_generate", label: "Krea 2" } },
    } as unknown as Catalog
    expect(familyEntryToCard(cat, "krea-2", cat.families["krea-2"]).service).toBe("krea-2")
  })
})

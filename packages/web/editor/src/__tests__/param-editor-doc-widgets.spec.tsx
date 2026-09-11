// param-editor-doc-widgets.spec.tsx — the DOCUMENT-field widgets (2026-08-15).
//
// The Timeline card's params are DOCUMENTS: beats/keyframes are lists of
// objects, continuity is a boolean. Before these widgets, ParamEditor's flow
// rendered both through the free-text fallback:
//   • objects stringified single-line ("[object Object]" in the textarea
//     branch, crushed JSON in the input branch) and stored STRINGS on edit —
//     the run gate then rejected the request (familyParamContract:
//     expected array/object, got string)
//   • a boolean stored the string "true"/"false" — the same rejection
//     (expected boolean, got string)
//
// This file pins the two widgets the Timeline card needs to be editable AT
// ALL: JsonParamField (object/array values → pretty JSON textarea that
// commits PARSED values; invalid text keeps the last valid value + shows
// the destructive hint) and the boolean On/Off pills (real booleans).
import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { TooltipProvider } from "@melite/ui/tooltip"
import type { ReactElement } from "react"

const renderWithTooltip = (el: ReactElement) =>
  render(<TooltipProvider>{el}</TooltipProvider>)
import { ParamEditor, JsonParamField } from "../surfaces/flow/FlowCard"
import type { CardStage } from "@melite/contracts"
import { primeCatalog, type Catalog } from "@melite/catalog"

// THE FORM IS THE CARD (2026-08-18): only spec-DECLARED fields render —
// beats/keyframes/continuity/seed need the form-spec resolved (the old
// undeclared-draft fallback painted them pre-spec on a network race).
// Stub the wire the contract store fetches through (Door B pattern).
// Types mirror the real form_video_timeline declarations; the DOCUMENT
// widgets claim their fields by VALUE (array/object → JsonParamField,
// boolean → On/Off pills) regardless of the declared widget type.
vi.mock("../rpc/editorClient", () => ({
  editorClient: {
    getFormSpec: vi.fn().mockResolvedValue({
      defaults: {},
      fields: [
        { name: "beats", type: "textarea" },
        { name: "keyframes", type: "textarea" },
        { name: "continuity", type: "boolean" },
        { name: "seed", type: "number" },
      ],
      schema_groups: [],
      features: {},
    }),
  },
}))

const CATALOG: Catalog = {
  families: {
    "video-timeline": { label: "Video Timeline", genre: "video" },
  },
  models: {
    "h3-timeline": {
      family: "video-timeline",
      form: "form_video_timeline",
      label: "H3 Timeline",
    },
  },
} as unknown as Catalog

const BEATS = [
  { text: "A wide rooftop at dusk.", start_frame: 0, end_frame: 168 },
  { text: "Two duelists clash.", start_frame: 168, end_frame: 336 },
]

function stage(params: Record<string, unknown>): CardStage {
  return {
    id: "s1",
    title: "Timeline",
    kind: "generation",
    service: "h3-timeline",
    params,
    inputs: [],
    inputIndices: [],
    result: undefined,
    status: "pending",
  }
}

beforeEach(() => {
  primeCatalog(CATALOG)
})

describe("ParamEditor — JSON document fields", () => {
  it("renders an object/array value as a pretty JSON textarea, not free text", async () => {
    renderWithTooltip(
      <ParamEditor stage={stage({ beats: BEATS, keyframes: [], seed: 42 })} onSave={() => {}} />,
    )
    const beats = (await screen.findByLabelText("beats")) as HTMLTextAreaElement
    expect(beats.tagName).toBe("TEXTAREA")
    // Pretty-printed: one property per line, both beat texts present.
    expect(beats.value).toContain('"A wide rooftop at dusk."')
    expect(beats.value).toContain('"Two duelists clash."')
    expect(beats.value.split("\n").length).toBeGreaterThan(4)
    // The empty keyframes list renders as its own JSON field ("[]").
    const kf = screen.getByLabelText("keyframes") as HTMLTextAreaElement
    expect(kf.value).toBe("[]")
  })

  it("commits the PARSED value on a valid edit — never a string", async () => {
    const onDraftChange = vi.fn()
    renderWithTooltip(
      <ParamEditor stage={stage({ beats: BEATS })} onSave={() => {}} onDraftChange={onDraftChange} />,
    )
    const beats = await screen.findByLabelText("beats")
    const edited = [
      { text: "One beat now.", start_frame: 0, end_frame: 96 },
    ]
    fireEvent.change(beats, { target: { value: JSON.stringify(edited) } })
    const last = onDraftChange.mock.lastCall?.[0] as Record<string, unknown>
    expect(last.beats).toEqual(edited)
    expect(Array.isArray(last.beats)).toBe(true)
  })

  it("keeps the last VALID value while the text is invalid JSON, with the hint", async () => {
    const onDraftChange = vi.fn()
    renderWithTooltip(
      <ParamEditor stage={stage({ beats: BEATS })} onSave={() => {}} onDraftChange={onDraftChange} />,
    )
    const beats = await screen.findByLabelText("beats")
    fireEvent.change(beats, { target: { value: '[{"text": "broken' } })
    expect(
      screen.getByText(/invalid JSON — last valid value kept/i),
    ).not.toBeNull()
    // Every commit ParamEditor reported still carries the ORIGINAL array.
    for (const call of onDraftChange.mock.calls) {
      expect(call[0].beats).toEqual(BEATS)
    }
  })

  it("re-adopts an external value change (variant reseed) when the text no longer matches", () => {
    // JsonParamField directly: ParamEditor snapshots stage.params into its
    // own draft at mount, so the external-change path is the VALUE prop
    // moving under a mounted field (applyVariantOverrides → setDraft).
    const external = [{ text: "Preset beat.", start_frame: 0, end_frame: 48 }]
    const { rerender } = render(
      <JsonParamField label="Beats" value={BEATS} onChange={() => {}} />,
    )
    rerender(<JsonParamField label="Beats" value={external} onChange={() => {}} />)
    expect((screen.getByLabelText("Beats") as HTMLTextAreaElement).value)
      .toContain('"Preset beat."')
  })
})

describe("ParamEditor — boolean fields", () => {
  it("renders boolean values as On/Off pills storing real booleans", async () => {
    const onDraftChange = vi.fn()
    renderWithTooltip(
      <ParamEditor
        stage={stage({ beats: BEATS, continuity: true })}
        onSave={() => {}}
        onDraftChange={onDraftChange}
      />,
    )
    const on = await screen.findByRole("button", { name: "On" })
    const off = screen.getByRole("button", { name: "Off" })
    expect(on.getAttribute("aria-pressed")).toBe("true")
    expect(off.getAttribute("aria-pressed")).toBe("false")
    // No free-text input carries the stringified boolean.
    expect(screen.queryByDisplayValue("true")).toBeNull()

    fireEvent.click(off)
    const last = onDraftChange.mock.lastCall?.[0] as Record<string, unknown>
    expect(last.continuity).toBe(false)
    expect(typeof last.continuity).toBe("boolean")
  })

  it("starts with Off pressed for a false value and toggles to true", async () => {
    const onDraftChange = vi.fn()
    renderWithTooltip(
      <ParamEditor
        stage={stage({ beats: BEATS, continuity: false })}
        onSave={() => {}}
        onDraftChange={onDraftChange}
      />,
    )
    expect(screen.getByRole("button", { name: "Off" }).getAttribute("aria-pressed"))
      .toBe("true")
    fireEvent.click(screen.getByRole("button", { name: "On" }))
    const last = onDraftChange.mock.lastCall?.[0] as Record<string, unknown>
    expect(last.continuity).toBe(true)
  })
})

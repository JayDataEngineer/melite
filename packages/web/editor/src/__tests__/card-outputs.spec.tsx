// card-outputs.spec.tsx — the Outputs zone (the action-card form pattern,
// 2026-08-16: "a) Outputs b) Inputs c) Parameters d) Mods").
//
// WHAT IS PROVEN: CardOutputs — the ONE shared Outputs section every form
// card renders — shows the DECLARED output contract above the artifacts:
// the primary artifact chip, one chip per declared format (default
// emphasized), and dashed chips for optional outputs. A family that
// declares nothing renders the zone label + children with NO chips
// (declared-only / skip-empty — same contract as features.outputs).
//
// The chips are display-only: the format SELECT stays a schema field in
// Parameters (output_format); optional outputs activate via their
// emit_when params. This test pins the DECLARATION surface, not any form
// field — the contract line answers "what will I get?" before the run.
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import type { ReactElement } from "react"

// The declared catalog surface CardOutputs reads — nothing else. The
// component resolves the card's model the way ParamEditor does
// (params.model ?? service), then looks the family's declarations up.
const families: Record<string, unknown> = {
  qwen3_tts: {
    label: "Qwen3 TTS",
    primary_output: "audio",
    optional_outputs: [
      { name: "qvoice", label: "Voice file", emit_when: "emit_voice", genre: "audio" },
    ],
  },
  h3: {
    label: "H3",
    outputs: [
      { id: "mp4", label: "MP4", default: true },
      { id: "webm", label: "WebM" },
    ],
  },
  "z-image": { label: "Z-Image" },
}
vi.mock("@melite/catalog/modelCatalog", () => ({
    studioOf: vi.fn(() => undefined),
  getCachedCatalog: vi.fn(() => ({ families, models: {} })),
  familyOf: vi.fn((key: string) => (key in families ? key : undefined)),
}))

import { CardOutputs } from "../surfaces/flow/CardOutputs"
import type { CardStage } from "@melite/contracts"
const stage = (over: Partial<CardStage> = {}): CardStage =>
  ({
    id: "s1",
    kind: "generation",
    service: "qwen3_tts",
    status: "pending",
    params: {},
    ...over,
  }) as CardStage

const renderIt = (el: ReactElement) => render(el)

describe("CardOutputs — the Outputs zone (form-card pattern)", () => {
  it("renders the zone label + the declared contract: primary + optional chips", () => {
    renderIt(
      <CardOutputs stage={stage()}>
        <div data-testid="artifacts">preview</div>
      </CardOutputs>,
    )
    expect(screen.getByText("Outputs")).toBeTruthy()
    // Primary artifact chip — the name downstream slots wire by.
    expect(screen.getByText("→ audio")).toBeTruthy()
    // Optional outputs render as dashed "+ label" chips.
    expect(screen.getByText("+ Voice file")).toBeTruthy()
    // The artifact area renders INSIDE the zone.
    expect(screen.getByTestId("artifacts")).toBeTruthy()
  })

  it("renders the declared format vocabulary, default emphasized", () => {
    renderIt(<CardOutputs stage={stage({ service: "h3" })} />)
    expect(screen.getByText("MP4")).toBeTruthy()
    expect(screen.getByText("WebM")).toBeTruthy()
    // The default format carries the emphasized class (brand-adjacent,
    // not muted) — data-output-format locates both, classes differ.
    const mp4 = document.querySelector('[data-output-format="mp4"]')
    const webm = document.querySelector('[data-output-format="webm"]')
    expect(mp4?.className).toContain("text-foreground/80")
    expect(webm?.className).toContain("text-muted-foreground/70")
    // No primary/optional declared → no such chips.
    expect(document.querySelector("[data-output-primary]")).toBeNull()
    expect(document.querySelector("[data-output-optional]")).toBeNull()
  })

  it("declared-only: a family with no output declarations renders label + children, no chips", () => {
    renderIt(
      <CardOutputs stage={stage({ service: "z-image" })}>
        <div data-testid="artifacts">preview</div>
      </CardOutputs>,
    )
    expect(screen.getByText("Outputs")).toBeTruthy()
    expect(screen.getByTestId("artifacts")).toBeTruthy()
    expect(document.querySelector("[data-outputs-contract]")).toBeNull()
  })

  it("resolves the model via params.model first (imported cards carry the family in service)", () => {
    renderIt(
      <CardOutputs
        stage={stage({ service: "video_generate", params: { model: "h3" } })}
      />,
    )
    // h3's format vocabulary — resolved through params.model, not the
    // family-name service string.
    expect(screen.getByText("MP4")).toBeTruthy()
  })
})

// card-tile-square.spec.tsx — SQUARE LAW (2026-08-23): "Action Cards need
// a more square shape, they are too tall."
//
// Root cause of the towers: against an INDEFINITE flex container a
// zero/percentage flex-basis falls back to CONTENT size, so an
// intrinsically portrait <img> in the preview cell demanded its natural-
// ratio height (~300px at the 200px basis) and items-stretch dragged the
// whole row up with it. The fix: the PREVIEW CELL carries aspect-square —
// its content contribution becomes width×1 — and the media crops via
// object-cover. These tests pin the CONTRACT (the ratio lives on the
// cell); the pixel-level proof is e2e/card-preview-fill.spec.ts.
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { TooltipProvider } from "@melite/ui/tooltip"
import type { ReactElement } from "react"

const renderWithTooltip = (el: ReactElement) =>
  render(<TooltipProvider>{el}</TooltipProvider>)
import { CardTile } from "../surfaces/flow/FlowCard"
import type { CardStage } from "@melite/contracts"
// The preview cell is FIRST-PARTY CHROME — registered statically at
// pluginUi import (web-registry ruling): importing the module IS the
// boot-shaped setup. No wire seed for chrome.
import "@/shell/pluginUi"

function makeStage(over: Partial<CardStage> = {}): CardStage {
  return {
    id: "s0",
    title: "Square gen",
    kind: "generation",
    service: "qwen-edit-base",
    params: { prompt: "x" },
    inputs: [],
    inputIndices: [],
    result: null,
    status: "pending",
    meta: {},
    ...over,
  }
}

function mountTile(stage: CardStage) {
  return renderWithTooltip(
    <CardTile
      stage={stage}
      running={false}
      index={0}
      onOpen={() => {}}
      onRemove={() => {}}
    />,
  )
}

describe("CardTile — SQUARE LAW (the action card is ≈square, never a tower)", () => {
  it("a DONE card's preview cell carries aspect-square and the artifact crops inside it", () => {
    const { container } = mountTile(makeStage({
      status: "done",
      result: { assetUrls: ["/v1/assets/portrait.png"], durationSec: 2.1 } as CardStage["result"],
    }))
    const tile = container.querySelector("[data-card-tile]") as HTMLElement
    expect(tile).toBeTruthy()
    const cell = tile.querySelector(".aspect-square") as HTMLElement
    expect(cell).toBeTruthy()
    // The artifact renders INSIDE the square cell — object-cover does the
    // cropping, so the native ratio never reaches the row layout.
    const img = cell.querySelector("img")
    expect(img).toBeTruthy()
    expect(img!.className).toContain("object-cover")
  })

  it("an IDLE card's placeholder is square too — one resting shape for every state", () => {
    const { container } = mountTile(makeStage({ status: "pending" }))
    const tile = container.querySelector("[data-card-tile]") as HTMLElement
    expect(tile.querySelector(".aspect-square")).toBeTruthy()
    // No stale 16:9 remnant anywhere on the tile face.
    expect(tile.querySelector(".aspect-video")).toBeNull()
  })

  it("no aspect-video survives on a done tile either", () => {
    const { container } = mountTile(makeStage({
      status: "done",
      result: { assetUrls: ["/v1/assets/out.mp4"], durationSec: 3 } as CardStage["result"],
    }))
    const tile = container.querySelector("[data-card-tile]") as HTMLElement
    expect(tile.querySelector(".aspect-video")).toBeNull()
  })
})

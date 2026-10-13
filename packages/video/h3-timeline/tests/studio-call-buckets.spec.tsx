/**
 * THE EVERY-SEAT UPLOAD WALL (2026-10-26, the operator's standing
 * burn: "I STILL have the old can't-upload issue on SOME slots").
 * The anchor slot refuses a bad upload LOUDLY (its visible error
 * line); the ref buckets died SILENTLY — the add arm's
 * `if (f.size > max) return`, the replace arm's empty catch. A
 * drop that neither commits nor refuses is THE SILENT DROP, and
 * every media seat in the call card owes the same law as the
 * anchor: image lane, video bucket, audio bucket, chip-replace and
 * chip-add arms alike.
 */
import { describe, it, vi } from "vitest"
import assert from "node:assert/strict"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { CallCard } from "../src/ui/studio/CallCard.tsx"
import type { DocCall } from "../src/ui/studio/docModel.ts"
import { fieldsOfEnvelope, type SpecField, bindEstateRemote, unbindEstateRemote } from "@melite/card-base/client"
import { carrier } from "../src/card.ts"

const REAL_ENV = (carrier as unknown as { toJSON(): unknown }).toJSON()
const REAL_KNOB_FIELDS: Record<string, SpecField> = {}
for (const f of fieldsOfEnvelope(REAL_ENV as never, "h3-timeline")) REAL_KNOB_FIELDS[f.name] = f

const CALL: DocCall = { text: "t", start_frame: 0, end_frame: 48 }

/** A stubbed estate door that names itself when reached (every door
 *  this wall must never touch). */
const dead = (name: string) => async (): Promise<never> => {
  throw new Error("unexpected estate call: " + name)
}

function card(over?: Partial<DocCall>) {
  const seen = { refs: [] as string[] }
  const deps = {
    selected: null, fps: 24, knobFields: REAL_KNOB_FIELDS,
    callCardRefs: { current: [] },
    artifactIndex: { byName: new Map(), byUrl: new Map() }, linkGroups: [],
    refArtifacts: [],
    handlePromptDelete: () => {}, handlePromptUpdate: () => {},
    enhanceOne: () => {}, undoEnhance: () => {}, enhancing: {}, enhanceErr: {}, enhanceUndo: {},
    setCallSpan: () => {}, setCallGuide: () => {}, setCallPrevSec: () => {},
    setCallTransition: () => {},
    setCallRefs: (_i: number, lane: string, next: string) => { seen.refs.push(lane + "=" + next) },
    setCallKnob: () => {},
    layerA: { fps: 24, width: 768, height: 448 },
  }
  render(<CallCard c={{ ...CALL, ...over }} i={0} deps={deps as never} />)
  return seen
}

/** The hidden file input behind a SourceRow square: the label text
 *  is not a form label — walk from the text to the square's input. */
const inputBehind = (label: string | HTMLElement): HTMLInputElement => {
  const el = (typeof label === "string" ? screen.getByText(label) : label).closest("div")
  assert.ok(el, "square wrapper for " + label)
  let node: HTMLElement | null = el as HTMLElement
  for (let hop = 0; hop < 4 && node; hop++) {
    const inp = node.querySelector("input[type=file]") as HTMLInputElement | null
    if (inp) return inp
    node = node.parentElement
  }
  throw new Error("file input for " + label)
}

describe("every media seat refuses a bad upload VISIBLY (the anchor's law, everywhere)", () => {
  it("the + ref image seat: an oversized file refuses loud, never the silent drop", async () => {
    card()
    const inp = inputBehind("+ ref image")
    const big = new File([new Uint8Array(8)], "big.png", { type: "image/png" })
    Object.defineProperty(big, "size", { value: 999 * 1024 * 1024 })
    fireEvent.change(inp, { target: { files: [big] } })
    const err = await screen.findByTestId("tl-call-ref-images-error")
    assert.match(err.textContent!, /too large/i)
  })

  it("the + ref video seat: an oversized file refuses loud", async () => {
    card()
    const inp = inputBehind("+ ref videos")
    const big = new File([new Uint8Array(8)], "big.mp4", { type: "video/mp4" })
    Object.defineProperty(big, "size", { value: 999 * 1024 * 1024 })
    fireEvent.change(inp, { target: { files: [big] } })
    const err = await screen.findByTestId("tl-call-ref-videos-error")
    assert.match(err.textContent!, /too large/i)
  })

  it("the + ref audio seat: an oversized file refuses loud", async () => {
    card()
    const inp = inputBehind("+ ref audios")
    const big = new File([new Uint8Array(8)], "big.mp3", { type: "audio/mpeg" })
    Object.defineProperty(big, "size", { value: 999 * 1024 * 1024 })
    fireEvent.change(inp, { target: { files: [big] } })
    const err = await screen.findByTestId("tl-call-ref-audios-error")
    assert.match(err.textContent!, /too large/i)
  })

  it("the CHIP-REPLACE seat: an unreadable file refuses loud (the audit's M2 — the replace arm had no firing arm)", async () => {
    // a chip must exist to replace: seed one ref video chip
    card({ refs: { videos: "https://u/old.mp4" } })
    const chip = inputBehind(screen.getAllByText("https://u/old.mp4")[0])
    class FailReader {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      error = new Error("denied")
      result: string | null = null
      readAsDataURL() { this.onerror?.() }
    }
    vi.stubGlobal("FileReader", FailReader)
    try {
      fireEvent.change(chip, { target: { files: [new File(["x"], "bad.mp4", { type: "video/mp4" })] } })
      const err = await screen.findByTestId("tl-call-ref-videos-error")
      assert.match(err.textContent!, /could not read/)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it("the CHIP-REPLACE seat: an oversized file refuses loud (replace arm, second failure mode)", async () => {
    card({ refs: { audios: "https://u/old.mp3" } })
    const chip = inputBehind(screen.getAllByText("https://u/old.mp3")[0])
    const big = new File([new Uint8Array(8)], "big.mp3", { type: "audio/mpeg" })
    Object.defineProperty(big, "size", { value: 999 * 1024 * 1024 })
    fireEvent.change(chip, { target: { files: [big] } })
    const err = await screen.findByTestId("tl-call-ref-audios-error")
    assert.match(err.textContent!, /too large/i)
  })

  it("a FOREIGN URL picked onto a bucket refuses loud at the gesture (the audit's M1 — it used to commit and die at the run)", async () => {
    const seen = card()
    bindEstateRemote({
      bench: { get: dead("bench/get"), "add-stage": dead("bench/add-stage"), "remove-stage": dead("bench/remove-stage") },
      drafts: { get: dead("drafts/get"), patch: dead("drafts/patch") },
      runs: { list: dead("runs/list"), start: dead("runs/start"), status: dead("runs/status"), stop: dead("runs/stop"), validate: dead("runs/validate") },
      media: { list: async () => ({ ok: true, value: { items: [{ url: "https://foreign/x.mp4", name: "x" }] } }) },
    } as never)
    try {
      // open the + videos square's picker and pick the foreign media row
      fireEvent.click(screen.getByLabelText("+ ref videos source"))
      fireEvent.click(await screen.findByText("From media"))
      const row = await screen.findByText("x")
      let click0: HTMLElement | null = row.closest("button")
      if (click0 === null) {
        let hop: HTMLElement | null = row
        while (hop && click0 === null) { hop = hop.parentElement; click0 = hop?.querySelector("button") ?? null }
      }
      fireEvent.click(click0 ?? row)
      const err = await screen.findByTestId("tl-call-ref-videos-error")
      assert.ok(err.textContent!.includes("not in this run"), err.textContent)
      assert.deepEqual(seen.refs, [], "no commit — the chip never lands")
    } finally {
      unbindEstateRemote()
    }
  })

  it("a good upload still commits on every seat (the wall guards the happy path too)", async () => {
    const seen = card()
    for (const [label, name, type] of [
      ["+ ref image", "ok.png", "image/png"],
      ["+ ref videos", "ok.mp4", "video/mp4"],
      ["+ ref audios", "ok.mp3", "audio/mpeg"],
    ] as const) {
      const inp = inputBehind(label)
      fireEvent.change(inp, { target: { files: [new File([new Uint8Array(4)], name, { type })] } })
    }
    await waitFor(() => {
      assert.equal(seen.refs.length, 3)
      for (const r of seen.refs) assert.match(r, /=data:(image|video|audio)\//)
    })
  })

  it("the CHIP-ADD seat: an unreadable file refuses loud (the audit's S12 — the add-arm catch had no firing arm of its own)", async () => {
    const seen = card()
    class FailReader {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      error = new Error("denied")
      result: string | null = null
      readAsDataURL() { this.onerror?.() }
    }
    vi.stubGlobal("FileReader", FailReader)
    try {
      fireEvent.change(inputBehind("+ ref videos"), { target: { files: [new File(["x"], "add.mp4", { type: "video/mp4" })] } })
      const err = await screen.findByTestId("tl-call-ref-videos-error")
      assert.match(err.textContent!, /could not read/)
      assert.deepEqual(seen.refs, [], "no commit — the chip never lands")
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

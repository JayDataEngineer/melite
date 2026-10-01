/**
 * CallCard gap rows (2026-09-19) — the seam-carry readout, the
 * videos/audios ref buckets (chips edit/remove/replace, the add-row
 * pick/clear/upload/size-guard, over-cap), and the image lane's
 * data: chips, chip edits, add-row verbs, and verbatim drops.
 *
 * PINS (same harness grammar as studio-call-card.spec.tsx — a Live
 * wrapper where the wire must re-render, plain recorders elsewhere):
 * every row asserts recorded setCallRefs payloads or DOM text.
 */
import { describe, expect, it } from "vitest"
import assert from "node:assert/strict"
import { useState } from "react"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { CallCard } from "../src/ui/studio/CallCard.tsx"
import { deliveredFrames } from '@melite/models-h3/timelineContract'
import { callsToPrompts } from "../src/ui/studio/docCalls.ts"
import type { DocCall } from "../src/ui/studio/docModel.ts"
import { fieldsOfEnvelope, type SpecField } from "@melite/card-base"
import { ASSET_DRAG_MIME } from '@melite/card-base'
import { carrier } from "../src/card.ts"

const REAL_ENV = (carrier as unknown as { toJSON(): unknown }).toJSON()
const REAL_KNOB_FIELDS: Record<string, SpecField> = {}
for (const f of fieldsOfEnvelope(REAL_ENV as never, "h3-timeline")) REAL_KNOB_FIELDS[f.name] = f

const BY_NAME = new Map([["still-a", "https://u/a.png"]])
const BY_URL = new Map([...BY_NAME].map(([n, u]) => [u, n] as [string, string]))

const ARTIFACTS = [
  { name: "still-a", url: "https://u/a.png" },
  { name: "still-b", url: "https://u/b.png" },
  { name: "clip-a", url: "https://u/a.mp4" },
  { name: "clip-b", url: "https://u/b.mp4" },
  { name: "s1", url: "https://u/s1.mp3" },
]

function deps(over?: Record<string, unknown>) {
  const calls = {
    spans: [] as [number, string, number][],
    guides: [] as [number, string, string][],
    refs: [] as [number, string, string][],
  }
  const d = {
    selected: null as { callIdx: number } | null,
    fps: 24,
    layerA: undefined,
    knobFields: REAL_KNOB_FIELDS,
    callCardRefs: { current: [] as (HTMLDivElement | null)[] },
    artifactIndex: { byName: BY_NAME, byUrl: BY_URL },
    linkGroups: [],
    refArtifacts: ARTIFACTS,
    handlePromptDelete: () => {},
    handlePromptUpdate: () => {},
    enhanceOne: () => {},
    undoEnhance: () => {},
    enhancing: {},
    enhanceErr: {},
    enhanceUndo: {},
    setCallSpan: (i: number, w: "start" | "end", f: number) => { calls.spans.push([i, w, f]) },
    setCallGuide: (i: number, k: string, s: string) => { calls.guides.push([i, k, s]) },
    setCallPrevSec: () => {},
    setCallTransition: () => {},
    setCallRefs: (i: number, k: string, v: string) => { calls.refs.push([i, k, v]) },
    setCallKnob: () => {},
    ...over,
  }
  return { d, calls }
}

const BASE: DocCall = { text: "a shot", start_frame: 0, end_frame: 48 }

const buckets = (): HTMLElement[] => screen.getAllByTestId("tl-call-ref-bucket")
// THE SQUARE'S OWN INPUT (square.tsx): every SourceRow mounts two
// file inputs — the provider's menu-gated one (needs fieldRef, fires
// only via the From file menu) and the square's own direct-wired one
// (squareFileInput class, fires onFile on change). Direct changes
// target the square's own.
const squareFileInputs = (bucket: HTMLElement): HTMLInputElement[] =>
  Array.from(bucket.querySelectorAll('input[type="file"][class*="squareFileInput"]')) as HTMLInputElement[]
const fileInputs = (bucket: HTMLElement): HTMLInputElement[] =>
  Array.from(bucket.querySelectorAll('input[type="file"]')) as HTMLInputElement[]

async function menuPick(squareName: string, rowText?: string): Promise<void> {
  fireEvent.click(screen.getByRole("button", { name: squareName }))
  fireEvent.click(await screen.findByRole("menuitem", { name: "From flow" }))
  const rows = await screen.findAllByTestId("source-pick-row")
  const row = rowText === undefined ? rows[0]! : rows.find((r) => r.textContent!.includes(rowText))!
  assert.ok(row, `the flow picker offers ${rowText ?? "a row"}`)
  fireEvent.click(row)
}

async function menuClear(squareName: string): Promise<void> {
  fireEvent.click(screen.getByRole("button", { name: squareName }))
  fireEvent.click(await screen.findByText("— clear —"))
}

function LiveCall(start: DocCall, over?: Record<string, unknown>) {
  const { d, calls } = deps(over)
  function Live() {
    const [c, setC] = useState<DocCall>(start)
    return (
      <CallCard
        c={c} i={0}
        deps={{
          ...d,
          setCallRefs: (i: number, k: string, v: string) => {
            calls.refs.push([i, k, v])
            setC((p) => ({ ...p, refs: { ...(p.refs ?? {}), [k]: v } }))
          },
        }}
      />
    )
  }
  return { Live, calls }
}

describe("the seam-carry readout (deliveredFrames)", () => {
  it("snaps the carry to the legal latent steps (unit truth)", () => {
    // (2026-09-20: the seam is automatic — the drift-control
    // continuation carries every non-cut join at the director's
    // proven 22 frames; there is nothing to author anymore)
    assert.equal(deliveredFrames({ ...BASE }, 0), 48)
    assert.equal(deliveredFrames({ ...BASE, transition: "cut" }, 1), 48)
    assert.equal(deliveredFrames({ ...BASE, transition: "extend" }, 1), 48 - 22)
    assert.equal(deliveredFrames({ ...BASE }, 1), 48 - 22, "absent transition = carried")
    expect(deliveredFrames({ ...BASE }, 0)).toBe(48)
  })

  it("the lane glyph reads absent as EXTEND — never a phantom cut (operator catch d, 2026-09-22)", () => {
    // the card's spanOverlap law treats an absent transition as a
    // carried (extend) seam; the bar glyph must never disagree —
    // "hard cuts instead of our stitching" was the glyph calling
    // every carried join a cut
    const lanes = callsToPrompts([
      { ...BASE },
      { ...BASE, transition: "cut" },
      { ...BASE, transition: "extend" },
    ], 24)
    assert.equal(lanes[0]!.seam, "extend", "absent = extend (the stitching default)")
    assert.equal(lanes[1]!.seam, "cut", "an explicit cut stays a cut")
    assert.equal(lanes[2]!.seam, "extend")
  })

  it("the header voices the delivered span (a carried call)", () => {
    const h = render(<CallCard c={{ ...BASE }} i={1} deps={deps().d} />)
    const span = document.querySelector('[data-call-card="1"] [class*="cardSpan"]')!
    assert.ok(span.textContent!.includes("delivered 1.1s"), span.textContent!)
    assert.ok(span.getAttribute("title")!.includes("delivered 26f"))
    h.unmount()
  })

  it("a short carried call clamps at nothing (never negative)", () => {
    const tiny: DocCall = { text: "a flash", start_frame: 0, end_frame: 10 }
    const h = render(<CallCard c={tiny} i={1} deps={deps().d} />)
    const span = document.querySelector('[data-call-card="1"] [class*="cardSpan"]')!
    assert.ok(span.textContent!.includes("delivered 0.0s"), span.textContent!)
    h.unmount()
  })
})

describe("the videos bucket (chips + add-row + over-cap)", () => {
  it("over the 3-video cap wears the over face", () => {
    const h = render(<CallCard c={{ ...BASE, refs: { videos: "a, b, c, d" } }} i={0} deps={deps().d} />)
    const bucket = buckets()[1]!
    assert.ok(bucket.textContent!.includes("4/3 over cap"))
    const tail = bucket.querySelector('[title]')!
    assert.ok(tail.getAttribute("title")!.includes("4 claimed — the bus holds 3"))
    h.unmount()
  })

  it("clearing the sole chip writes the empty wire (never a stale name)", async () => {
    const { Live, calls } = LiveCall({ ...BASE, refs: { videos: "clip-a" } })
    const h = render(<Live />)
    await menuClear("clip-a source")
    assert.deepEqual(calls.refs, [[0, "videos", ""]])
    h.unmount()
  })

  it("a flow pick replaces the chip by NAME (neighbors are kept)", async () => {
    const { Live, calls } = LiveCall({ ...BASE, refs: { videos: "clip-a, ghost-vid" } })
    const h = render(<Live />)
    await menuPick("clip-a source", "clip-b")
    assert.deepEqual(calls.refs, [[0, "videos", "clip-b, ghost-vid"]])
    h.unmount()
  })

  it("the add-row appends by NAME; its clear is a no-op (never an empty chip)", async () => {
    const { Live, calls } = LiveCall({ ...BASE, refs: { videos: "clip-a" } })
    const h = render(<Live />)
    await menuPick("+ ref videos source", "clip-b")
    assert.deepEqual(calls.refs, [[0, "videos", "clip-a, clip-b"]])
    await menuClear("+ ref videos source")
    assert.deepEqual(calls.refs, [[0, "videos", "clip-a, clip-b"]], "clearing the add-row writes nothing")
    h.unmount()
  })

  it("a chipped artifact leaves the picker (never a duplicate offer)", async () => {
    const { Live, calls } = LiveCall({ ...BASE, refs: { videos: "clip-a" } })
    const h = render(<Live />)
    fireEvent.click(screen.getByRole("button", { name: "+ ref videos source" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "From flow" }))
    const rows = await screen.findAllByTestId("source-pick-row")
    assert.equal(rows.length, 1, "clip-a is chipped — only clip-b is offered")
    assert.ok(rows[0]!.textContent!.includes("clip-b"))
    fireEvent.click(rows[0]!)
    assert.deepEqual(calls.refs, [[0, "videos", "clip-a, clip-b"]])
    h.unmount()
  })

  it("a media-bar drop rides verbatim (foreign URLs are first-class)", () => {
    const { d, calls } = deps()
    const h = render(<CallCard c={{ ...BASE, refs: { videos: "clip-a" } }} i={0} deps={d} />)
    const square = screen.getByRole("button", { name: "+ ref videos source" })
    fireEvent.drop(square, {
      dataTransfer: {
        getData: (t: string) => (t === ASSET_DRAG_MIME ? JSON.stringify({ url: "https://foreign/x.mp4" }) : ""),
        files: [],
      },
    })
    assert.deepEqual(calls.refs, [[0, "videos", "clip-a, https://foreign/x.mp4"]])
    h.unmount()
  })

  it("a file over the chip replaces it with a data: URL (neighbors are kept)", async () => {
    const { Live, calls } = LiveCall({ ...BASE, refs: { videos: "clip-a, ghost-vid" } })
    const h = render(<Live />)
    const [chipInput] = squareFileInputs(buckets()[1]!)
    fireEvent.change(chipInput!, { target: { files: [new File(["bytes"], "up.mp4", { type: "video/mp4" })] } })
    await waitFor(() => assert.equal(calls.refs.length, 1))
    assert.ok(calls.refs[0]![2].startsWith("data:video/mp4;base64,"), calls.refs[0]![2].slice(0, 40))
    assert.ok(calls.refs[0]![2].endsWith("ghost-vid"), calls.refs[0]![2].slice(-40))
    h.unmount()
  })

  it("the add-row uploads small files and refuses oversize ones (the 24MB lane cap)", async () => {
    const one = LiveCall({ ...BASE, refs: { videos: "clip-a" } })
    const h1 = render(<one.Live />)
    const inputs = squareFileInputs(buckets()[1]!)
    fireEvent.change(inputs[inputs.length - 1]!, { target: { files: [new File(["bytes"], "up.mp4", { type: "video/mp4" })] } })
    await waitFor(() => assert.equal(one.calls.refs.length, 1))
    assert.ok(one.calls.refs[0]![2].includes("clip-a"), one.calls.refs[0]![2].slice(0, 60))
    assert.ok(one.calls.refs[0]![2].includes("data:video/mp4;base64,"))
    h1.unmount()

    const two = LiveCall({ ...BASE, refs: { videos: "clip-a" } })
    const h2 = render(<two.Live />)
    const big = squareFileInputs(buckets()[1]!)
    fireEvent.change(big[big.length - 1]!, {
      target: { files: [new File([new ArrayBuffer(25 * 1024 * 1024)], "big.mp4", { type: "video/mp4" })] },
    })
    await waitFor(() => assert.ok(document.body.textContent!.includes("clip-a")))
    assert.deepEqual(two.calls.refs, [], "oversize uploads write nothing")
    h2.unmount()
  })
})

describe("the audios bucket", () => {
  it("the add-row appends an audio pick by NAME", async () => {
    const { Live, calls } = LiveCall(BASE)
    const h = render(<Live />)
    await menuPick("+ ref audios source", "s1")
    assert.deepEqual(calls.refs, [[0, "audios", "s1"]])
    expect(calls.refs).toEqual([[0, "audios", "s1"]])
    h.unmount()
  })
})

describe("the image lane (data: chips, chip verbs, add-row verbs)", () => {
  it("an uploaded chip renders as upload N (never the raw data: URL)", () => {
    const h = render(<CallCard c={{ ...BASE, refs: { images: "data:image/png;base64,AAA" } }} i={0} deps={deps().d} />)
    assert.ok(buckets()[0]!.textContent!.includes("upload 1"))
    h.unmount()
  })

  it("clearing the sole image chip writes the empty wire", async () => {
    const { Live, calls } = LiveCall({ ...BASE, refs: { images: "still-a" } })
    const h = render(<Live />)
    await menuClear("still-a source")
    assert.deepEqual(calls.refs, [[0, "images", ""]])
    h.unmount()
  })

  it("a flow pick replaces the image chip by NAME (neighbors are kept)", async () => {
    const { Live, calls } = LiveCall({ ...BASE, refs: { images: "still-a, ghost-img" } })
    const h = render(<Live />)
    await menuPick("still-a source", "still-b")
    assert.deepEqual(calls.refs, [[0, "images", "still-b, ghost-img"]])
    h.unmount()
  })

  it("a bare-name drop rides verbatim (never force-resolved)", () => {
    const { d, calls } = deps()
    const h = render(<CallCard c={BASE} i={0} deps={d} />)
    const square = screen.getByRole("button", { name: "+ ref image source" })
    fireEvent.drop(square, {
      dataTransfer: {
        getData: (t: string) => (t === ASSET_DRAG_MIME ? JSON.stringify({ url: "ghost-name" }) : ""),
        files: [],
      },
    })
    assert.deepEqual(calls.refs, [[0, "images", "ghost-name"]])
    h.unmount()
  })

  it("a file over the image chip replaces it with a data: URL (neighbors are kept)", async () => {
    const { Live, calls } = LiveCall({ ...BASE, refs: { images: "still-a, ghost-img" } })
    const h = render(<Live />)
    // index 0 is the anchor slot's input; the chip rides next
    const chipInput = squareFileInputs(buckets()[0]!)[1]!
    fireEvent.change(chipInput, { target: { files: [new File(["bytes"], "up.png", { type: "image/png" })] } })
    await waitFor(() => assert.equal(calls.refs.length, 1))
    assert.ok(calls.refs[0]![2].startsWith("data:image/png;base64,"))
    assert.ok(calls.refs[0]![2].endsWith("ghost-img"))
    h.unmount()
  })

  it("the image add-row uploads small files, refuses oversize, and its clear is a no-op", async () => {
    const one = LiveCall(BASE)
    const h1 = render(<one.Live />)
    const add = (bucket: HTMLElement): HTMLInputElement => {
      const all = squareFileInputs(bucket)
      return all[all.length - 1]!
    }
    fireEvent.change(add(buckets()[0]!), { target: { files: [new File(["bytes"], "up.png", { type: "image/png" })] } })
    await waitFor(() => assert.equal(one.calls.refs.length, 1))
    assert.ok(one.calls.refs[0]![2].startsWith("data:image/png;base64,"))
    h1.unmount()

    const two = LiveCall(BASE)
    const h2 = render(<two.Live />)
    fireEvent.change(add(buckets()[0]!), {
      target: { files: [new File([new ArrayBuffer(21 * 1024 * 1024)], "big.png", { type: "image/png" })] },
    })
    await menuClear("+ ref image source")
    assert.deepEqual(two.calls.refs, [], "oversize uploads and add-row clears write nothing")
    expect(two.calls.refs).toEqual([])
    h2.unmount()
  })
})

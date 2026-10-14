/**
 * CallCard — one focused model-call card (BEHAVIORAL).
 *
 * PINS (the rail is the call's editor): focused mode shows only the
 * selected call; delete merges the span; span edits ripple; guides
 * write; the ref badge counts; identity refs replace run refs; the
 * knob fold replaces per call.
 */
import { describe, expect, it } from "vitest"
import assert from "node:assert/strict"
import { useState } from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { CallCard } from "../src/ui/studio/CallCard.tsx"
import { studioCopy } from "../src/ui/studio/studioCopy.ts"
import type { DocCall } from "../src/ui/studio/docModel.ts"
import { bindEstateRemote, fieldsOfEnvelope, unbindEstateRemote, type SpecField } from "@melite/card-base/client"
import { carrier } from "../src/card.ts"

// THE SERVED WALK (hour 22): the fold's schema truth — the carrier's
// own serialization, the same bytes the lane serves.
const REAL_ENV = (carrier as unknown as { toJSON(): unknown }).toJSON()
const REAL_KNOB_FIELDS: Record<string, SpecField> = {}
for (const f of fieldsOfEnvelope(REAL_ENV as never, "h3-timeline")) REAL_KNOB_FIELDS[f.name] = f

const BY_NAME = new Map([["still-a", "https://u/a.png"]])
const BY_URL = new Map([...BY_NAME].map(([n, u]) => [u, n] as [string, string]))

function deps(over?: Record<string, unknown>) {
  const calls = {
    deleted: [] as string[],
    spans: [] as [number, string, number][],
    guides: [] as [number, string, string][],
    prevs: [] as [number, number | null][],
    trans: [] as [number, string][],
    refs: [] as [number, string, string][],
    knobs: [] as [number, string, unknown][],
  }
  const d = {
    selected: null as { callIdx: number } | null,
    fps: 24,
    layerA: undefined,
    // THE OVERRIDE LAYER'S TRUTH (hour 22): the real served walk —
    // schemastery's own serialization, never a hand stub (the fold
    // rides the generic OverlayKnob on these fields).
    knobFields: REAL_KNOB_FIELDS,
    callCardRefs: { current: [] as (HTMLDivElement | null)[] },
    artifactIndex: { byName: BY_NAME, byUrl: BY_URL },
    linkGroups: [], guideLinks: { clip: [], audio: [] },
    refArtifacts: [{ name: "ra", url: "https://u/ra.png" }],
    handlePromptDelete: (id: string) => { calls.deleted.push(id) },
    handlePromptUpdate: () => {},
    enhanceOne: () => {},
    undoEnhance: () => {},
    enhancing: {},
    enhanceErr: {},
    enhanceUndo: {},
    setCallSpan: (i: number, w: "start" | "end", f: number) => { calls.spans.push([i, w, f]) },
    setCallGuide: (i: number, k: string, s: string) => { calls.guides.push([i, k, s]) },
    setCallTransition: (i: number, t: string) => { calls.trans.push([i, t]) },
    setCallRefs: (i: number, k: string, v: string) => { calls.refs.push([i, k, v]) },
    setCallKnob: (i: number, k: string, v: unknown) => { calls.knobs.push([i, k, v]) },
    ...over,
  }
  return { d, calls }
}

const BASE: DocCall = { text: "a shot", start_frame: 0, end_frame: 48 }

describe("focus + header", () => {
  it("focused mode: only the selected call renders", () => {
    const { d } = deps({ selected: { callIdx: 1 } })
    const h1 = render(<CallCard c={BASE} i={0} deps={d} />)
    assert.equal(document.querySelector('[data-call-card="0"]'), null)
    h1.unmount()
    const h2 = render(<CallCard c={BASE} i={1} deps={deps({ selected: { callIdx: 1 } }).d} />)
    assert.ok(document.querySelector('[data-call-card="1"]'))
    h2.unmount()
  })

  it("global mode renders unselected; selected marks", () => {
    const h1 = render(<CallCard c={BASE} i={0} deps={deps().d} />)
    const card = document.querySelector('[data-call-card="0"]')!
    assert.equal(card.getAttribute("data-selected"), null)
    assert.equal(card.getAttribute("data-guides"), null)
    assert.equal(card.getAttribute("data-knobs"), null)
    h1.unmount()
    const h2 = render(<CallCard c={{ ...BASE, image: "still-a" }} i={0} deps={deps({ selected: { callIdx: 0 } }).d} />)
    const sel = document.querySelector('[data-call-card="0"]')!
    assert.equal(sel.getAttribute("data-selected"), "true")
    assert.equal(sel.getAttribute("data-guides"), "image")
    h2.unmount()
  })

  it("delete asks for the merge (the bar clip's hover ✕ twin)", () => {
    const { d, calls } = deps()
    render(<CallCard c={BASE} i={2} deps={d} />)
    fireEvent.click(screen.getByLabelText("Delete call 2"))
    assert.deepEqual(calls.deleted, ["call-2"])
  })

  it("knobs count the tag (singular, plural, absent)", () => {
    const one = render(<CallCard c={{ ...BASE, knobs: { denoise: 0.7 } }} i={0} deps={deps().d} />)
    assert.ok(screen.getByText("1 knob"))
    assert.equal(document.querySelector('[data-call-card="0"]')!.getAttribute("data-knobs"), "1")
    one.unmount()
    const two = render(
      <CallCard c={{ ...BASE, knobs: { denoise: 0.7, sampler_name: "euler" } }} i={0} deps={deps().d} />,
    )
    assert.ok(screen.getByText("2 knobs"))
    two.unmount()
  })
})

describe("span + guides", () => {
  it("span edits ripple (a clear holds — never a write)", () => {
    const { d, calls } = deps()
    render(<CallCard c={BASE} i={0} deps={d} />)
    fireEvent.change(screen.getByLabelText("Call 0 start frame"), { target: { value: "12" } })
    fireEvent.change(screen.getByLabelText("Call 0 end frame"), { target: { value: "60" } })
    fireEvent.change(screen.getByLabelText("Call 0 start frame"), { target: { value: "" } })
    fireEvent.change(screen.getByLabelText("Call 0 end frame"), { target: { value: "" } })
    assert.deepEqual(calls.spans, [[0, "start", 12], [0, "end", 60]])
  })

  it("the first-frame subcard writes through (image + seam)", async () => {
    const { d, calls } = deps()
    render(<CallCard c={{ ...BASE, image: "still-a" }} i={1} deps={d} />)
    // the subcard's square (its own label hides — the wire square reads "source")
    fireEvent.click(screen.getByLabelText("anchor ref · slot 1 source"))
    fireEvent.click(await screen.findByText("— clear —"))
    fireEvent.change(screen.getByLabelText("Call 1 seam mode"), { target: { value: "extend" } })
    assert.deepEqual(calls.guides, [[1, "image", ""]])
    assert.deepEqual(calls.trans, [[1, "extend"]])
  })

  it("bus order + the picker filter (images \u2192 videos \u2192 audios \u2192 seam; audio/video files not grayed out)", () => {
    const { d } = deps()
    render(<CallCard c={{ ...BASE }} i={1} deps={d} />)
    // the lanes render in the BUNDLE'S OWN wire order: images, videos, audios
    const buckets = screen.getAllByTestId("tl-call-ref-bucket")
    assert.equal(buckets.length, 3, "three lanes on the bus")
    const files = buckets.map((b) => b.querySelector("input[type=file]")!.getAttribute("accept"))
    assert.deepEqual(files, ["image/png,image/jpeg,image/webp", "video/*", "audio/*"],
      "each lane's OS picker accepts its own MIME family (the two-audio fix)")
    // the seam rides AFTER the bus — the call's join, never a lane between lanes
    const seam = screen.getByLabelText("Call 1 seam mode")
    assert.ok(buckets[2].compareDocumentPosition(seam) & Node.DOCUMENT_POSITION_FOLLOWING,
      "the audios lane precedes the seam in the DOM")
  })

  it("guide squares ride the SourceRow grammar; a From-flow pick writes the NAME", async () => {
    const { d, calls } = deps()
    ;(d as { guideLinks: unknown }).guideLinks = {
      clip: [{ name: "clip-one", url: "https://u/c1.mp4", title: "up" }],
      audio: [],
    }
    ;(d as { artifactIndex: unknown }).artifactIndex = {
      byName: new Map([["still-a", "https://u/a.png"], ["clip-one", "https://u/c1.mp4"]]),
      byUrl: new Map([["https://u/a.png", "still-a"], ["https://u/c1.mp4", "clip-one"]]),
    }
    const h = render(<CallCard c={{ ...BASE, audio: "still-a" }} i={0} deps={d} />)
    // both non-image guide seats mount squares (the datalist hand-roll
    // died with the rail-law audit's square gap b) — the clip flow
    // lists only the clip-genre row; audio lists none.
    const clipSquare = screen.getByLabelText("Call 0 clip guide source")
    const audioSquare = screen.getByLabelText("Call 0 audio guide source")
    assert.ok(clipSquare)
    assert.ok(audioSquare)
    fireEvent.click(clipSquare)
    fireEvent.click(await screen.findByText("From flow"))
    fireEvent.click(await screen.findByText("clip-one"))
    assert.deepEqual(calls.guides, [[0, "clip", "clip-one"]])
    fireEvent.click(audioSquare)
    fireEvent.click(await screen.findByText("From flow"))
    assert.ok(await screen.findByText("nothing to pick yet"))
    h.unmount()
  })
})

describe("the image-bus count (the 9-slot bundle lane)", () => {
  it("counts the anchor + ref chips against the 9-slot bus", () => {
    const h0 = render(<CallCard c={BASE} i={0} deps={deps().d} />)
    assert.ok(screen.getByTestId("tl-call-ref-images").textContent!.includes("0/9"))
    h0.unmount()

    const h1 = render(<CallCard c={{ ...BASE, refs: { images: "still-a" } }} i={0} deps={deps().d} />)
    assert.ok(screen.getByTestId("tl-call-ref-images").textContent!.includes("1/9"))
    h1.unmount()

    const h2 = render(
      <CallCard c={{ ...BASE, image: "still-a", refs: { images: "still-a" } }} i={0} deps={deps().d} />,
    )
    assert.ok(screen.getByTestId("tl-call-ref-images").textContent!.includes("2/9"))
    h2.unmount()
  })

  it("over the 9-slot bus wears the over face (the compose slices the overflow)", () => {
    const names = Array.from({ length: 9 }, (_, k) => `r${k}`).join(", ")
    const h = render(<CallCard c={{ ...BASE, image: "still-a", refs: { images: names } }} i={0} deps={deps().d} />)
    const b = screen.getByTestId("tl-call-ref-images")
    assert.ok(b.textContent!.includes("10/9"))
    assert.ok(b.className.includes("refCountOver"))
    h.unmount()
  })

  it("a ref chip's — clear — verb removes THAT chip from the wire (the SourceRow clear arm)", async () => {
    const { d, calls } = deps()
    render(<CallCard c={{ ...BASE, refs: { images: "still-a, still-b" } }} i={0} deps={d} />)
    // open the still-a chip's source row menu and take the clear verb
    fireEvent.click(screen.getByRole("button", { name: "still-a source" }))
    fireEvent.click(await screen.findByText("— clear —"))
    assert.deepEqual(calls.refs, [[0, "images", "still-b"]],
      "the clear removes exactly the cleared chip, the sibling survives")
  })

  it("a FOREIGN media URL picked at a chip refuses loud — the error face shows, the wire never hears it", async () => {
    const { d, calls } = deps()
    bindEstateRemote({ media: { list: async () => ({ ok: true, value: { items: [{ url: "https://lib/foreign.png", name: "foreign.png" }] } }) } } as never)
    render(<CallCard c={{ ...BASE, refs: { images: "still-a" } }} i={0} deps={d} />)
    fireEvent.click(screen.getByRole("button", { name: "still-a source" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "From media" }))
    const row = (await screen.findAllByTestId("source-pick-row")).find((r) => r.textContent!.includes("foreign.png"))!
    fireEvent.click(row)
    assert.deepEqual(calls.refs, [], "a URL outside this run's artifacts never commits")
    assert.ok(screen.getByTestId("tl-call-ref-images-error").textContent!.includes("not in this run"),
      "the refusal lands on the bucket's error face")
    unbindEstateRemote()
  })

  it("a From-flow pick AT an existing chip REPLACES that chip in place (the edit arm — never a duplicate)", async () => {
    const { d, calls } = deps()
    render(<CallCard c={{ ...BASE, refs: { images: "still-a" } }} i={0} deps={d} />)
    fireEvent.click(screen.getByRole("button", { name: "still-a source" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "From flow" }))
    const rows = await screen.findAllByTestId("source-pick-row")
    const row = rows.find((r) => r.textContent!.includes("ra"))!
    fireEvent.click(row)
    assert.deepEqual(calls.refs, [[0, "images", "ra"]],
      "the pick rewrites the chip's own seat in the lane list")
  })

  it("the anchor square rides the SAME lane as the ref chips (no alien categories)", () => {
    render(<CallCard c={{ ...BASE, image: "still-a", refs: { images: "still-b" } }} i={0} deps={deps().d} />)
    // the bus panel exists, and the anchor slot lives INSIDE the lane's chips row
    assert.notEqual(screen.queryByTestId("tl-call-refs"), null)
    const lane = screen.getByTestId("tl-call-ref-images").closest('[data-testid="tl-call-ref-bucket"]')!
    const chipsRow = lane.querySelector('[class*="chips"]')!
    assert.ok(chipsRow.querySelector('[data-testid="tl-first-frame"]'), "the anchor renders in the chips row")
    assert.ok(chipsRow.textContent!.includes("still-b"), "the ref chips render beside it")
    assert.ok(chipsRow.textContent!.includes("+ ref image"), "the add-row rides the same lane")
  })
})

describe("identity refs + knob fold", () => {
  it("the refs group rides EVERY family (refs imply t4r — the bundle mounts per call)", () => {
    render(<CallCard c={BASE} i={0} deps={deps().d} />)
    assert.notEqual(screen.queryByTestId("tl-call-refs"), null)
  })

  it("a From-flow pick writes the artifact NAME (the URL translates)", () => {
    const { d, calls } = deps({})
    function Live() {
      const [c, setC] = useState<DocCall>(BASE)
      return (
        <CallCard
          c={c} i={0}
          deps={{
            ...d,
            setCallRefs: (i: number, k: string, v: string) => {
              calls.refs.push([i, k, v])
              setC((p) => ({ ...p, refs: { images: v } }))
            },
          }}
        />
      )
    }
    render(<Live />)
    // the add slot's SourceRow: square → the three-entry menu → From flow → the row
    fireEvent.click(screen.getByRole("button", { name: "+ ref image source" }))
    fireEvent.click(screen.getByRole("menuitem", { name: "From flow" }))
    fireEvent.click(screen.getByTestId("source-pick-row"))
    // the pick hands the URL; the wire carries the NAME
    assert.deepEqual(calls.refs, [[0, "images", "ra"]])
  })

  it("the knob fold replaces per call", () => {
    const { d, calls } = deps()
    render(<CallCard c={{ ...BASE, knobs: { denoise: 0.7 } }} i={0} deps={d} />)
    // the DisclosureRow law (pattern campaign S2): closed folds hold
    // NO hidden DOM — open the row before touching its knobs
    fireEvent.click(screen.getByText(studioCopy.knobsHead))
    fireEvent.change(screen.getByLabelText("Call 0 knob: denoise"), { target: { value: "0.5" } })
    assert.deepEqual(calls.knobs, [[0, "denoise", 0.5]])
    // (the first-call prev note died with the seconds picker — the
    // seam is automatic; the first call simply has nothing to carry)
  })

  it("later calls own the live seam select (cut is the one authored fact)", () => {
    const { d, calls } = deps()
    render(<CallCard c={BASE} i={1} deps={d} />)
    const mode = screen.getByLabelText("Call 1 seam mode") as HTMLSelectElement
    assert.equal(mode.value, "extend", "absent transition displays carried")
    fireEvent.change(mode, { target: { value: "cut" } })
    assert.deepEqual(calls.trans, [[1, "cut"]])
    assert.deepEqual(calls.prevs, [])
  })
})

describe("THE BLOCKER (2026-09-22): clips and reference audio are mutually exclusive", () => {
  it("any D-M-E clip present → the Ref audios bucket is disabled on EVERY call, with the law as the hint", () => {
    const d = deps({ audioClipsPresent: true }).d
    const h = render(<CallCard c={BASE} i={0} deps={d} />)
    const bucket = h.container.querySelector('[data-disabled="true"]')
    assert.ok(bucket, "the bucket stands down")
    assert.match(bucket.getAttribute("title") ?? "", /clips own the model's audio inputs/, "the hint states the blocker")
    h.unmount()
  })

  it("no clips → the bucket is live (the lock lifts when the lanes clear)", () => {
    const d = deps({ audioClipsPresent: false }).d
    const h = render(<CallCard c={BASE} i={0} deps={d} />)
    assert.ok(!h.container.querySelector('[data-disabled="true"]'), "bucket live")
    h.unmount()
  })
})

describe("THE LAYER A/B CANON (2026-10-24): a stated call lane REPLACES the declared lane; absent inherits", () => {
  const LAYER = { fps: 24, seed: 42, ref_images: ["https://u/d1.png", "https://u/d2.png"] }
  it("a stated call lane hides the card defaults — the count rides the EFFECTIVE list, the tail names the arm", () => {
    const h = render(
      <CallCard c={{ ...BASE, refs: { images: "still-a" } }} i={0} deps={deps({ layerA: LAYER }).d} />,
    )
    assert.equal(h.container.querySelectorAll('[data-testid="tl-declared-ref"]').length, 0,
      "the stated lane replaces — the card defaults do not render")
    assert.ok(screen.getByTestId("tl-call-ref-images").textContent!.includes("1/9"))
    assert.ok(screen.getByTestId("tl-call-ref-images").textContent!.includes("overrides"))
    h.unmount()
  })

  it("an absent call lane inherits the card defaults (the inherit arm)", () => {
    const h = render(
      <CallCard c={{ ...BASE }} i={0} deps={deps({ layerA: LAYER }).d} />,
    )
    assert.equal(h.container.querySelectorAll('[data-testid="tl-declared-ref"]').length, 2)
    assert.ok(screen.getByTestId("tl-call-ref-images").textContent!.includes("2/9"))
    h.unmount()
  })

  it("no declared surface → the lane renders exactly as before (zero-behavior delta)", () => {
    const h = render(<CallCard c={{ ...BASE, refs: { images: "still-a" } }} i={0} deps={deps().d} />)
    assert.equal(h.container.querySelectorAll('[data-testid="tl-declared-ref"]').length, 0)
    assert.ok(screen.getByTestId("tl-call-ref-images").textContent!.includes("1/9"))
    h.unmount()
  })

  it("THE DEAD DOOR: the redundant-copy strip is gone (a stated chip replaces, it never duplicates)", () => {
    const { d, calls } = deps({ layerA: LAYER })
    const h = render(
      <CallCard c={{ ...BASE, refs: { images: "https://u/d1.png, still-a" } }} i={0} deps={d} />,
    )
    assert.equal(h.container.querySelectorAll('[data-testid="tl-redundant-ref"]').length, 0,
      "the merge died with its door")
    // a stated chip EQUAL to a declared default still replaces: 2/9, no card chips
    assert.equal(h.container.querySelectorAll('[data-testid="tl-declared-ref"]').length, 0)
    assert.ok(screen.getByTestId("tl-call-ref-images").textContent!.includes("2/9"))
    h.unmount()
    assert.deepEqual(calls.refs, [], "rendering writes nothing")
  })

  it("the canon holds across every media lane, per lane (images replace while videos inherit)", () => {
    const dataImage = "data:image/png;base64,AAA"
    const dataAudio = "data:audio/wav;base64,BBB"
    const { d } = deps({
      layerA: {
        fps: 24,
        seed: 42,
        ref_images: [dataImage],
        ref_videos: ["https://u/declared.mp4"],
        ref_audios: [dataAudio],
      },
    })
    const h = render(
      <CallCard
        c={{ ...BASE, refs: { images: "still-a", audios: "loop-a" } }}
        i={0}
        deps={d}
      />,
    )
    const declared = h.container.querySelectorAll('[data-testid="tl-declared-ref"]')
    // images lane states chips → its default hides; videos lane
    // inherits → its declared chip renders; audios lane states
    // chips → its default hides. One chip total, on the video lane.
    assert.equal(declared.length, 1)
    assert.ok(declared[0]!.textContent!.includes("declared.mp4"))
    assert.equal(declared[0]!.querySelector("img"), null, "video chips carry no thumb")
    h.unmount()
  })

  it("THE MODS LANE: path chips write the refs.mods wire, the bucket counts the effective list", () => {
    const { d, calls } = deps()
    const h = render(
      <CallCard c={{ ...BASE, refs: { mods: "refmods/pack_one.safetensors" } }} i={0} deps={d} />,
    )
    assert.ok(screen.getByTestId("tl-call-mods-bucket"), "the bucket mounts after the audios lane")
    assert.ok(screen.getByTestId("tl-call-mods-count").textContent!.includes("1/8"))
    // the path door: free text (packs are engine files, no picker)
    fireEvent.change(screen.getByTestId("tl-call-mod-path"), { target: { value: "refmods/pack_two.safetensors" } })
    fireEvent.click(screen.getByTestId("tl-call-mod-add"))
    assert.deepEqual(calls.refs, [[0, "mods", "refmods/pack_one.safetensors, refmods/pack_two.safetensors"]])
    // the strip door: this harness renders once, so the strip's
    // pass addresses the RENDERED chips (the original one) — the
    // mutation stream records the add, then the strip of the
    // rendered chip (real usage re-renders between mutations).
    const strips = h.container.querySelectorAll('[data-testid="tl-call-mod-strip"]')
    assert.equal(strips.length, 1)
    fireEvent.click(strips[0]!)
    assert.deepEqual(calls.refs.at(-1), [0, "mods", ""])
    h.unmount()
  })

  it("THE MODS LANE declared arm: card-declared packs render as declared chips and the count names the inherit", () => {
    const h = render(
      <CallCard
        c={{ ...BASE }}
        i={0}
        deps={deps({ layerA: { fps: 24, seed: 42, ref_mods: ["refmods/declared.safetensors"] } }).d}
      />,
    )
    const declared = h.container.querySelectorAll('[data-testid="tl-declared-ref"]')
    assert.equal(declared.length, 1, "the declared pack renders as a declared chip")
    assert.ok(declared[0]!.textContent!.includes("declared.safetensors"))
    assert.ok(screen.getByTestId("tl-call-mods-count").textContent!.includes("1/8"))
    assert.ok(screen.getByTestId("tl-call-mods-count").getAttribute("title")!.includes("card mods"),
      "the count's title names the inherit arm (add a path to override)")
    h.unmount()
  })

  it("THE MODS LANE override arm: a stated lane replaces the declared packs — the count names the override", () => {
    const h = render(
      <CallCard
        c={{ ...BASE, refs: { mods: "refmods/mine.safetensors" } }}
        i={0}
        deps={deps({ layerA: { fps: 24, seed: 42, ref_mods: ["refmods/declared.safetensors"] } }).d}
      />,
    )
    assert.equal(h.container.querySelectorAll('[data-testid="tl-declared-ref"]').length, 0,
      "the stated lane replaces — the declared chip does not render")
    assert.ok(screen.getByTestId("tl-call-mods-count").textContent!.includes("1/8"))
    assert.ok(screen.getByTestId("tl-call-mods-count").textContent!.includes("overrides"))
    h.unmount()
  })

  it("THE MODS LANE over face: 9 claimed paths wear the over count (the loader holds 8 slots)", () => {
    const paths = Array.from({ length: 9 }, (_, k) => `refmods/p${k}.safetensors`).join(", ")
    const h = render(<CallCard c={{ ...BASE, refs: { mods: paths } }} i={0} deps={deps().d} />)
    const b = screen.getByTestId("tl-call-mods-count")
    assert.ok(b.textContent!.includes("9/8"), b.textContent)
    assert.ok(b.getAttribute("title")!.includes("8 slots"), b.getAttribute("title") ?? "")
    assert.ok(b.className.includes("refCountOver"), "the over face wears the danger count")
    h.unmount()
  })

  it("THE MODS LANE form submit: Enter in the path field adds the pack through the form's own onSubmit", () => {
    const { d, calls } = deps()
    const h = render(<CallCard c={{ ...BASE }} i={0} deps={d} />)
    fireEvent.change(screen.getByTestId("tl-call-mod-path"), { target: { value: "refmods/enter.safetensors" } })
    fireEvent.submit(screen.getByTestId("tl-call-mod-path").closest("form")!)
    assert.deepEqual(calls.refs, [[0, "mods", "refmods/enter.safetensors"]])
    h.unmount()
  })

  it("THE MODS LANE empty submit: Enter on a blank path writes nothing (the guard arm)", () => {
    const { d, calls } = deps()
    const h = render(<CallCard c={{ ...BASE }} i={0} deps={d} />)
    fireEvent.submit(screen.getByTestId("tl-call-mod-path").closest("form")!)
    assert.deepEqual(calls.refs, [], "a blank path never becomes a chip")
    h.unmount()
  })
})

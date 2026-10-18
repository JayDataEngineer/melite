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
import { readFileSync } from "node:fs"
import { join } from "node:path"
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

function card(over?: Partial<DocCall>, refArtifacts: { name: string; url: string }[] = []) {
  const seen = { refs: [] as string[] }
  const deps = {
    selected: null, fps: 24, knobFields: REAL_KNOB_FIELDS,
    callCardRefs: { current: [] },
    artifactIndex: { byName: new Map(), byUrl: new Map() }, linkGroups: [], guideLinks: { clip: [], audio: [] },
    refArtifacts,
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
/** An EDIT-row's file input (the chip rows keep their visible
 * labels): the element is the row's own label text. */
const inputBehind = (el: HTMLElement): HTMLInputElement => {
  const row = el.closest("[data-source-row]") as HTMLElement | null
  assert.ok(row, "square row for element")
  return row.querySelector("input[type=file]") as HTMLInputElement
}

/** The REAL From-file gesture (the provider's own law: the shared
 * hidden input re-targets per field at CLICK time — a bare change on
 * it without the menu pick is the dropped write this suite once
 * drove by mistake). The drive: open the row's square menu, pick
 * From file, then hand the file to the retargeted input.
 * (2026-11-05, the double-label death: the add rows ride hideLabel —
 * the row is found by its stable data seat, never the dead text.) */
const fileGesture = async (label: string): Promise<HTMLInputElement> => {
  const row = document.querySelector(`[data-source-row="${label}"]`) as HTMLElement | null
  assert.ok(row, "square row for " + label)
  const square = row.querySelector("[data-slot-square]") as HTMLElement | null
  assert.ok(square, "slot square for " + label)
  fireEvent.click(square)
  const fromFile = await screen.findByText("From file")
  fireEvent.click(fromFile)
  const inp = row.querySelector("input[type=file]") as HTMLInputElement | null
    ?? (document.querySelector("input[type=file]") as HTMLInputElement | null)
  assert.ok(inp, "file input for " + label)
  return inp
}

describe("every media seat refuses a bad upload VISIBLY (the anchor's law, everywhere)", () => {
  it("the + ref image seat: an oversized file refuses loud, never the silent drop", async () => {
    card()
    const inp = await fileGesture("+ image")
    const big = new File([new Uint8Array(8)], "big.png", { type: "image/png" })
    Object.defineProperty(big, "size", { value: 999 * 1024 * 1024 })
    fireEvent.change(inp, { target: { files: [big] } })
    const err = await screen.findByTestId("tl-call-ref-images-error")
    assert.match(err.textContent!, /too large/i)
  })

  it("the + ref video seat: an oversized file refuses loud", async () => {
    card()
    const inp = await fileGesture("+ video")
    const big = new File([new Uint8Array(8)], "big.mp4", { type: "video/mp4" })
    Object.defineProperty(big, "size", { value: 999 * 1024 * 1024 })
    fireEvent.change(inp, { target: { files: [big] } })
    const err = await screen.findByTestId("tl-call-ref-videos-error")
    assert.match(err.textContent!, /too large/i)
  })

  it("the + ref audio seat: an oversized file refuses loud", async () => {
    card()
    const inp = await fileGesture("+ audio")
    const big = new File([new Uint8Array(8)], "big.mp3", { type: "audio/mpeg" })
    Object.defineProperty(big, "size", { value: 999 * 1024 * 1024 })
    fireEvent.change(inp, { target: { files: [big] } })
    const err = await screen.findByTestId("tl-call-ref-audios-error")
    assert.match(err.textContent!, /too large/i)
  })

  it("the CHIP-REPLACE seat: an unreadable file refuses loud (the audit's M2 — the replace arm had no firing arm)", async () => {
    // a chip must exist to replace: seed one ref video chip
    card({ refs: { videos: "https://u/old.mp4" } })
    const chip = await fileGesture("https://u/old.mp4")
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
    const chip = await fileGesture("https://u/old.mp3")
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
      fireEvent.click(screen.getByLabelText("+ video source"))
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
      ["+ image", "ok.png", "image/png"],
      ["+ video", "ok.mp4", "video/mp4"],
      ["+ audio", "ok.mp3", "audio/mpeg"],
    ] as const) {
      const inp = await fileGesture(label)
      fireEvent.change(inp, { target: { files: [new File([new Uint8Array(4)], name, { type })] } })
    }
    await waitFor(() => {
      assert.equal(seen.refs.length, 3)
      for (const r of seen.refs) assert.match(r, /=data:(image|video|audio)\//)
    })
  })

  it("THE CHIP-REPLACE happy path: a good file over an existing chip swaps IN PLACE (siblings kept, never a silent append)", async () => {
    // the replace arm's success seat (the 2026-11-06 sweep: the
    // failure modes were walled, the SUCCESS swap never rode — the
    // ternary's replace side had no firing arm)
    const seen = card({ refs: { videos: "https://u/old.mp4", videos2: "https://u/keep.mp4" } } as never)
    const chip = await fileGesture("https://u/old.mp4")
    fireEvent.change(chip, { target: { files: [new File([new Uint8Array(4)], "new.mp4", { type: "video/mp4" })] } })
    await waitFor(() => {
      assert.equal(seen.refs.length, 1, "one write — the swap is atomic, the sibling is untouched")
      assert.match(seen.refs[0]!, /^videos=data:video\/mp4/)
    })
  })

  it("a verbatim-named chip (neither candidate nor estate media) renders VERBATIM (the listing's fallback arm)", async () => {
    // an input-dir name typed by hand commits verbatim — the chip
    // face must not invent a URL for it (chipOfListing's else arm)
    card({ refs: { videos: "staged/clip.mp4" } } as never)
    const row = document.querySelector('[data-source-row="staged/clip.mp4"]') as HTMLElement | null
    assert.ok(row, "the verbatim chip row renders")
    const shown = row.textContent ?? ""
    assert.ok(shown.includes("staged/clip.mp4"), "the chip shows its own verbatim name")
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
      const addInp = await fileGesture("+ video")
    fireEvent.change(addInp, { target: { files: [new File(["x"], "add.mp4", { type: "video/mp4" })] } })
      const err = await screen.findByTestId("tl-call-ref-videos-error")
      assert.match(err.textContent!, /could not read/)
      assert.deepEqual(seen.refs, [], "no commit — the chip never lands")
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it("SOURCE — the count face rides BusCount (the rail-law audit's H5: one spelling, two seats)", () => {
    const card = readFileSync(join(import.meta.dirname, "..", "src", "ui", "studio", "CallCard.tsx"), "utf8")
    assert.ok(card.includes("function BusCount("), "BusCount is defined in CallCard")
    const seats = card.match(/<BusCount/g) ?? []
    assert.equal(seats.length, 2, "exactly two seats: the mods bucket + the refs bucket")
    assert.ok(!card.includes("over cap · overrides"), "no seat-local count spelling survives")
    assert.ok(!card.includes("pinned · "), "no seat-local pinned spelling survives")
  })
})

describe("SOURCE — the slice-4 cures ride their atoms (the card's one grammar)", () => {
  const card = readFileSync(join(import.meta.dirname, "..", "src", "ui", "studio", "CallCard.tsx"), "utf8")

  it("F7 — the knob badges ride the DSH Pill (the StaleBadge→Pill precedent; no hand-rolled span survives)", () => {
    const tagSeats = card.match(/<Pill className=\{s\.knobTag\}>/g) ?? []
    const countSeats = card.match(/<Pill className=\{s\.knobCount\}>/g) ?? []
    assert.equal(tagSeats.length, 1, "the header knob tag rides Pill")
    assert.equal(countSeats.length, 1, "the fold's knob count rides Pill")
    assert.ok(!card.includes('<span className={s.knobTag}>'), "the hand-rolled tag span is gone")
    assert.ok(!card.includes('<span className={s.knobCount}>'), "the hand-rolled count span is gone")
  })

  it("F8 — every verb in the card rides DSH Button (the mod chip's strip verb was the lone raw <button>)", () => {
    const code = card.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
    assert.equal((code.match(/<button/g) ?? []).length, 0, "zero raw button elements — one verb grammar")
    // RE-PIN 2026-10-16 (the square-grammar residue): the strip verb
    // DIED with the floating chip (187eaf607 — SourceRow's onEdit("")
    // owns the detach), so the tl-call-mod-strip testid this arm
    // sliced no longer exists and indexOf(-1) fed the block judges
    // garbage — the arm redded at HEAD while the law held. The law
    // (every verb rides Button, ghost variant, dict-owned aria) now
    // judges a LIVE verb: the call's delete button.
    const at = card.indexOf("handlePromptDelete(`call-${i}`)")
    assert.ok(at > 0, "the delete verb exists at the call head")
    const block = card.slice(card.lastIndexOf("<Button", at), card.indexOf("</Button>", at))
    assert.ok(block.includes('variant="ghost"'), "the delete verb rides the ghost variant like its siblings")
    assert.ok(block.includes("aria-label={studioCopy.deleteCallAria(i)}"), "the delete verb carries the dict's aria-label")
  })

  it("F-B2 — the over-word is dictionary-owned (no over-tail literal survives at the seats)", () => {
    assert.ok(!card.includes('"over cap"'), "the default tail consumes studioCopy.overCapTail")
    assert.ok(!card.includes('"over bus"'), "the image tail consumes studioCopy.overBusTail")
    assert.ok(card.includes("overWord = studioCopy.overCapTail"), "the bucket's default rides the dict")
    assert.ok(card.includes('overWord={studioCopy.overBusTail}'), "the image seat rides the bus's word")
  })

  it("THE MODS SQUARE (the any-media law, 2026-11-06) — the add door rides SourceRow as an UPLOAD SQUARE taking ANY media; the estate media door boards; the path form is dead", () => {
    const mods = card.slice(card.indexOf("function ModsBucket"), card.indexOf("One focused model-call card"))
    assert.ok(mods.includes("<SourceRow"), "the mods add door is a SourceRow (the square grammar)")
    assert.ok(mods.includes("hideLabel"), "the add door is a bare square (the caption hides; the aria names the seat)")
    assert.ok(mods.includes("ariaLabel={`+ ${label.toLowerCase()}`}"), "the hidden caption keeps its accessible name")
    assert.ok(mods.includes("loadMedia={fetchMediaLibrary}"), "the estate media door boards (any media kind is legal currency)")
    assert.ok(mods.includes('accept="image/*,video/*,audio/*"'), "the OS picker hints EVERY media family (the any-media law)")
    assert.ok(mods.includes("modsNotMediaLine(f.name)"), "a non-media file refuses at the gesture with the seat's own face")
    // RE-PIN 2026-10-16: the read arm's signature carries the slot
    // index now (commitUpload(f, ci) / commitUpload(f, null)) — the
    // old exact-string pin redded on the evolved spelling while the
    // law (a media file commits through the read arm) held
    assert.ok(mods.includes("void commitUpload(f, ci)") && mods.includes("void commitUpload(f, null)"), "a media file commits through the read arm at every square (the system bakes the pack)")
    assert.ok(!mods.includes("modsSuffixLine"), "the .safetensors suffix law is DEAD — any media boards")
    assert.ok(!mods.includes("tl-call-mod-form"), "the manual path form is DEAD — one square, one grammar")
  })
})

describe("the chip face law (2026-11-04 — THE ONE DISPLAY SPELLING rides every chip)", () => {
  it("a chip whose artifact exists shows the SERVED url — the FULL artifacts map, not the candidates", () => {
    card({ refs: { videos: "shot-01.mp4" } }, [{ name: "shot-01.mp4", url: "https://serve/shot-01.mp4" }])
    assert.ok(screen.getByText("https://serve/shot-01.mp4"), "the display translated name → served url")
  })

  it("an unmapped chip rides its raw value as the held face — the detach verb stays armed (never PLUS on a full slot)", () => {
    card({ refs: { videos: "ghost.mp4" } })
    // the face carries the raw value and the ✕ (a write verb) is armed over it
    assert.ok(screen.getByRole("button", { name: "Detach ghost.mp4" }), "the verb keys on held-ness, not renderability")
    fireEvent.click(screen.getByRole("button", { name: "Detach ghost.mp4" }))
  })

  it("a data: chip passes verbatim — the face never mangles the wire", () => {
    card({ refs: { videos: "data:video/mp4;base64,AAA" } })
    assert.ok(screen.getByText("data:video/mp4;base64,AAA"), "the data: URL rides the face verbatim")
  })

  // THE NAME WAS NEVER CURRENCY (J2, refs-mods journey audit
  // 2026-10-16): the From-flow pick committed the candidate's NAME
  // — an own-run name (a gallery filename, extension-bearing)
  // passed the wiring wall's staged-artifact carve-out and died at
  // the engine's /prompt; a cross-card name (a stage title, no
  // extension) refused 'bad-value' at the wall naming the whole
  // input-dir enum. Three comments claimed "the estate re-resolves
  // names each run" — no seat does. The pick commits the CANONICAL
  // ESTATE URL: the one spelling every staging seat resolves
  // loudly (fetch → upload → refuse, never a verbatim ride).
  it("THE FROM-FLOW PICK COMMITS THE URL, NEVER THE NAME (J2) — both death forms", async () => {
    const seen = card({}, [
      { name: "out.png", url: "/melite-media/runs/run-deadbeef-frame/out.png" },
      { name: "My Stage", url: "/melite-media/runs/run-deadbeef-frame/stage.png" },
    ])
    const forms: Array<[string, string]> = [
      // (a) the own-run death: a gallery filename — extension-bearing,
      // passed the wiring wall's carve-out, died at the engine
      ["out.png", "/melite-media/runs/run-deadbeef-frame/out.png"],
      // (b) the cross-card death: a stage title — no extension,
      // refused 'bad-value' at the wall
      ["My Stage", "/melite-media/runs/run-deadbeef-frame/stage.png"],
    ]
    // (the recorder-parent rig never feeds the write back — the chip
    // row re-seats from the parent's refs on re-render, so the second
    // pick drives from an empty wire; the accumulation law is the
    // PARENT's, walled where the parent lives. THIS seat's law: the
    // committed chip is the CANONICAL URL, never the artifact name.)
    for (const [label, want] of forms) {
      const row = document.querySelector('[data-source-row="+ image"]') as HTMLElement | null
      assert.ok(row, "the add row")
      fireEvent.click(row.querySelector("[data-slot-square]")!)
      fireEvent.click(await screen.findByText("From flow"))
      const pick = (await screen.findAllByTestId("source-pick-row")).find((r) => r.textContent!.includes(label))
      assert.ok(pick, "the candidate row for " + label)
      fireEvent.click(pick)
      const wantWire = "images=" + want
      await waitFor(() => {
        // the chip is the CANONICAL URL — never the artifact name
        assert.equal(seen.refs[seen.refs.length - 1], wantWire,
          "the pick commits the estate URL for " + label)
      })
      assert.ok(!seen.refs.some((w) => w.includes(label) && w !== wantWire),
        "the artifact name never enters the wire for " + label)
    }
  })

  it("the detach verb voices per-chip (chip-N identity — the middle chip's ✕ removes only it)", () => {
    const seen = card({ refs: { videos: "keep-1.mp4,mid.mp4,keep-2.mp4" } })
    fireEvent.click(screen.getByRole("button", { name: "Detach mid.mp4" }))
    assert.deepEqual(seen.refs, ["videos=keep-1.mp4, keep-2.mp4"], "the chip wire keeps the lane spelling (comma+space — splitRefList skips separators, both parse)")
  })
})

// ── THE DOUBLE-LABEL DEATH (operator 2026-11-05, the FOURTH order:
// "Images 0/8 / + image" — the bucket label already names the kind,
// the second visible label is noise) ──────────────────────────────
describe("one label per bucket", () => {
  it("the add rows carry NO visible '+ kind' text — the glyph is the face, the label rides the data seat + aria", () => {
    card()
    for (const dead of ["+ image", "+ video", "+ audio"]) {
      assert.equal(screen.queryByText(dead), null, dead + " must not render as text")
      assert.ok(document.querySelector(`[data-source-row="${dead}"]`), dead + " row rides the stable data seat")
    }
    assert.ok(document.querySelector('[data-source-row="+ image"] [data-slot-square]'), "the add face is the square")
  })

  it("the mods bucket carries NO plan text (ERRORS e, 2026-11-08: 'It is plan text… people will know that already or not care' — reverses the 2026-11-05 naming law)", () => {
    card()
    const hint = document.querySelector('[data-testid="tl-call-mods-hint"]')
    assert.equal(hint, null, "the refModsHint plan-text line still renders under the Ref mods label — the operator deleted it (ERRORS e); the bucket's square grammar names its own currency")
    assert.ok(!document.body.textContent!.includes('any media rides'), "the plan text rides verbatim somewhere in the card face")
  })
})

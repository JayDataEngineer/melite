/**
 * THE SQUARE GRAMMAR WALL — BEHAVIOR ARM (the rail-law audit's
 * square gaps b + c, 2026-10-31): GuideSlot is the anchor's twin —
 * From-flow picks write the NAME (URL→NAME honesty), a foreign URL
 * refuses VISIBLY with the one literal, the shared upload gate
 * refuses wrong-genre / oversize / unreadable files at the seat's
 * own genre cap, and the genre filter keeps each guide's flow rows
 * in its own language.
 */
import { describe, it, vi } from "vitest"
import assert from "node:assert/strict"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { GuideSlot } from "../src/ui/studio/CallFrameSubcard.tsx"
import { bindEstateRemote, unbindEstateRemote } from "@melite/card-base/client"

const NAME_TO_URL = new Map([
  ["clip-one", "https://u/c1.mp4"],
  ["wav-one", "https://u/w1.wav"],
])
const URL_TO_NAME = new Map([...NAME_TO_URL].map(([n, u]) => [u, n] as [string, string]))
const CLIP_LINKS = [{ name: "clip-one", url: "https://u/c1.mp4", title: "up" }]
const AUDIO_LINKS = [{ name: "wav-one", url: "https://u/w1.wav", title: "up" }]

function slot(kind: "clip" | "audio", over?: Record<string, unknown>) {
  const changed: string[] = []
  const p = {
    kind,
    callIndex: 0,
    value: undefined as string | undefined,
    onChange: (src: string) => { changed.push(src) },
    nameToUrl: NAME_TO_URL,
    urlToName: URL_TO_NAME,
    links: kind === "clip" ? CLIP_LINKS : AUDIO_LINKS,
    trackColorHex: "rgb(255, 0, 0)",
    ...over,
  }
  return { p, changed }
}

/** The seat's hidden OS-dialog input (the From-file door). */
const fileInput = (): HTMLInputElement => {
  const inputs = document.body.querySelectorAll('input[type="file"]')
  return inputs[inputs.length - 1]! as HTMLInputElement
}

describe("GuideSlot — the guide squares (BEHAVIOR)", () => {
  it("a From-flow pick writes the NAME (the drop-honesty law)", async () => {
    const { p, changed } = slot("clip")
    const h = render(<GuideSlot {...p} />)
    fireEvent.click(screen.getByLabelText("Call 0 clip guide source"))
    fireEvent.click(await screen.findByText("From flow"))
    fireEvent.click(await screen.findByText("clip-one"))
    assert.deepEqual(changed, ["clip-one"])
    h.unmount()
  })

  it("the genre filter holds: the audio guide lists audio rows", async () => {
    const { p } = slot("audio")
    const h = render(<GuideSlot {...p} />)
    fireEvent.click(screen.getByLabelText("Call 0 audio guide source"))
    fireEvent.click(await screen.findByText("From flow"))
    assert.ok(await screen.findByText("wav-one"))
    h.unmount()
  })

  it("a media-bar ASSET drag commits through the honesty law (URL→NAME)", async () => {
    const { p, changed } = slot("clip")
    const h = render(<GuideSlot {...p} />)
    const wrap = screen.getByTestId("tl-guide-clip")
    const square = (wrap.querySelector("[data-slot-square]") as HTMLElement | null) ?? wrap
    const dt = {
      getData: (t: string) => (t === "application/tech-noir-asset" ? JSON.stringify({ url: "https://u/c1.mp4", kind: "video" }) : ""),
      files: [] as File[],
      types: ["application/tech-noir-asset"],
    }
    fireEvent.dragOver(square, { dataTransfer: dt })
    fireEvent.drop(square, { dataTransfer: dt })
    await waitFor(() => { assert.equal(changed.length, 1) })
    assert.equal(changed[0], "clip-one")
    h.unmount()
  })

  it("a FOREIGN asset URL refuses VISIBLY with the one literal", async () => {
    const { p, changed } = slot("clip")
    const h = render(<GuideSlot {...p} />)
    const wrap = screen.getByTestId("tl-guide-clip")
    const square = (wrap.querySelector("[data-slot-square]") as HTMLElement | null) ?? wrap
    const dt = {
      getData: (t: string) => (t === "application/tech-noir-asset" ? JSON.stringify({ url: "https://foreign/x.mp4", kind: "video" }) : ""),
      files: [] as File[],
      types: ["application/tech-noir-asset"],
    }
    fireEvent.dragOver(square, { dataTransfer: dt })
    fireEvent.drop(square, { dataTransfer: dt })
    assert.ok((await screen.findByTestId("tl-call-guide-error-clip")).textContent!.includes("not in this run's artifacts"))
    assert.deepEqual(changed, [])
    h.unmount()
  })

  it("the shared upload gate: wrong genre / oversize / unreadable refuse VISIBLY", async () => {
    const { p, changed } = slot("audio")
    const h = render(<GuideSlot {...p} />)
    // wrong genre (a video file at the audio seat)
    fireEvent.change(fileInput(), { target: { files: [new File(["x"], "v.mp4", { type: "video/mp4" })] } })
    assert.ok((await screen.findByTestId("tl-call-guide-error-audio")).textContent!.includes("video/mp4"))
    // oversize at the AUDIO cap (16 MB — the genre's own law)
    fireEvent.change(fileInput(), {
      target: { files: [new File([new ArrayBuffer(17 * 1024 * 1024)], "big.wav", { type: "audio/wav" })] },
    })
    assert.ok((await screen.findByTestId("tl-call-guide-error-audio")).textContent!.includes("16 MB"))
    // an unreadable file refuses, never throws
    class FailReader {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      error = new Error("denied")
      result: string | null = null
      readAsDataURL() { this.onerror?.() }
    }
    vi.stubGlobal("FileReader", FailReader)
    try {
      fireEvent.change(fileInput(), { target: { files: [new File(["x"], "bad.wav", { type: "audio/wav" })] } })
      assert.ok((await screen.findByTestId("tl-call-guide-error-audio")).textContent!.includes("could not read"))
    } finally {
      vi.unstubAllGlobals()
    }
    assert.deepEqual(changed, [])
    h.unmount()
  })

  it("THE EDIT VERBS: clear empties the seat, a data: media row commits inline, a foreign media URL refuses VISIBLY", async () => {
    const { p, changed } = slot("clip", { value: "clip-one" })
    const h = render(<GuideSlot {...p} />)
    // clear
    fireEvent.click(screen.getByLabelText("Call 0 clip guide source"))
    fireEvent.click(await screen.findByText("— clear —"))
    assert.deepEqual(changed.at(-1), [""].at(-1))
    // a data: media row commits DIRECT (the inline arm — no name to translate)
    bindEstateRemote({ media: { list: async () => ({ ok: true, value: { items: [
      { url: "data:video/mp4;base64,AAA", name: "inline.mp4" },
      { url: "https://lib/foreign.mp4", name: "foreign.mp4" },
    ] } }) } })
    fireEvent.click(screen.getByLabelText("Call 0 clip guide source"))
    fireEvent.click(await screen.findByText("From media"))
    const rows = await screen.findAllByTestId("source-pick-row")
    fireEvent.click(rows.find((r) => r.textContent!.includes("inline.mp4"))!)
    await waitFor(() => { assert.ok(changed.at(-1)!.startsWith("data:video/mp4")) })
    // a foreign https URL refuses — the error face carries the one literal, the wire never hears it
    fireEvent.click(screen.getByLabelText("Call 0 clip guide source"))
    fireEvent.click(await screen.findByText("From media"))
    const rows2 = await screen.findAllByTestId("source-pick-row")
    fireEvent.click(rows2.find((r) => r.textContent!.includes("foreign.mp4"))!)
    assert.ok((await screen.findByTestId("tl-call-guide-error-clip")).textContent!.includes("not in this run's artifacts"))
    assert.ok(!changed.includes("https://lib/foreign.mp4"))
    unbindEstateRemote()
    h.unmount()
  })

  it("a CLIP-seat upload rides the video genre (an mp4 commits inline as data:video)", async () => {
    const { p, changed } = slot("clip")
    const h = render(<GuideSlot {...p} />)
    fireEvent.change(fileInput(), { target: { files: [new File(["bytes"], "v.mp4", { type: "video/mp4" })] } })
    await waitFor(() => { assert.equal(changed.length, 1) })
    assert.ok(changed[0]!.startsWith("data:video/mp4;base64,"))
    h.unmount()
  })

  it("THE VALUE FACES: an undefined value renders the empty seat, a data: value renders inline, an unmapped raw URL rides verbatim", async () => {
    // undefined → the empty arm (`value?.trim() ?? ""`)
    const empty = slot("clip")
    const h0 = render(<GuideSlot {...empty.p} />)
    assert.ok((h0.container.querySelector('[data-testid="tl-guide-clip"]') as HTMLElement))
    h0.unmount()
    // a data: value rides verbatim (no name translation)
    const inline = slot("clip", { value: "data:video/mp4;base64,AAA" })
    const h1 = render(<GuideSlot {...inline.p} />)
    const sq1 = h1.container.querySelector('[data-testid="tl-guide-clip"]')!
    assert.ok(sq1.textContent!.includes("guide"))
    h1.unmount()
    // a raw URL outside the name map rides verbatim (the `?? v` fallback)
    const raw = slot("audio", { value: "https://elsewhere/sfx.wav" })
    const h2 = render(<GuideSlot {...raw.p} />)
    assert.ok(h2.container.querySelector('[data-testid="tl-guide-audio"]'))
    h2.unmount()
  })

  it("an honest audio upload rides inline as a data: URL; the refusal clears", async () => {
    const { p, changed } = slot("audio")
    const h = render(<GuideSlot {...p} />)
    fireEvent.change(fileInput(), { target: { files: [new File(["x"], "v.mp4", { type: "video/mp4" })] } })
    await screen.findByTestId("tl-call-guide-error-audio")
    fireEvent.change(fileInput(), { target: { files: [new File(["bytes"], "a.wav", { type: "audio/wav" })] } })
    await waitFor(() => { assert.equal(changed.length, 1) })
    assert.ok(changed[0]!.startsWith("data:audio/wav;base64,"))
    assert.equal(screen.queryByTestId("tl-call-guide-error-audio"), null)
    h.unmount()
  })
})

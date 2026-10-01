/**
 * CallFrameSubcard — the BUNDLE SPLIT pieces (BEHAVIORAL,
 * 2026-09-18): FirstFrameSlot (the anchor square in the image
 * bus — one grammar with the ref chips) and SeamControls (the
 * call's join — cut/extend + prev continuation).
 *
 * PINS (ONE grammar via SourceRow, the studio's own file law):
 * From-flow picks write URL→NAME (unmatched URLs refuse visibly),
 * data: URLs ride verbatim, clear empties, uploads gate type+size
 * with visible errors, and the seam (cut/extend + prev toggle +
 * carry seconds) writes its own doors.
 */
import { describe, expect, it, vi } from "vitest"
import assert from "node:assert/strict"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { bindEstateRemote, unbindEstateRemote } from '@melite/card-base'
import { FirstFrameSlot, SeamControls } from "../src/ui/studio/CallFrameSubcard.tsx"

/** THE MEDIA BIND (the one-lane law): the slot's From-media rows
 *  ride the mounted media namespace — a local fake serving one
 *  foreign row (the vocabulary-refusal wall below). Unused
 *  namespaces throw (never silently serve). */
function bindForeignMedia(): void {
  const dead = (method: string) => async (): Promise<never> => { throw new Error("unused namespace in this wall: " + method) }
  bindEstateRemote({
    bench: { get: dead("bench/get"), "add-stage": dead("bench/add-stage"), "remove-stage": dead("bench/remove-stage") },
    drafts: { get: dead("drafts/get"), patch: dead("drafts/patch") },
    runs: {
      list: dead("runs/list"), start: dead("runs/start"), status: dead("runs/status"),
      stop: dead("runs/stop"), validate: dead("runs/validate"),
    },
    media: {
      list: async () => ({ ok: true, value: { items: [{ url: "https://foreign/x.png", name: "x" }] } }),
    },
  } as unknown as Parameters<typeof bindEstateRemote>[0])
}

const NAME_TO_URL = new Map([
  ["still-a", "https://u/a.png"],
  ["still-b", "https://u/b.png"],
])
const URL_TO_NAME = new Map([...NAME_TO_URL].map(([n, u]) => [u, n] as [string, string]))
const LINKS = [
  { name: "still-a", url: "https://u/a.png", title: "up" },
  { name: "up-data", url: "data:image/png;base64,AAA", title: "up" },
]

function slot(over?: Record<string, unknown>) {
  const changed: string[] = []
  const p = {
    testId: "tl-frame-first",
    callIndex: 0,
    value: undefined as string | undefined,
    onChange: (src: string) => { changed.push(src) },
    nameToUrl: NAME_TO_URL,
    urlToName: URL_TO_NAME,
    links: LINKS,
    ...over,
  }
  return { p, changed }
}

/** Square → menu → From flow → candidate row (the modal closes). */
async function flowPick(_label: string, rowName: string) {
  fireEvent.click(screen.getByLabelText("first frame · slot 1 source"))
  fireEvent.click(await screen.findByText("From flow"))
  const modal = await screen.findByText("The other stages’ latest outputs (image)")
  const list = modal.closest("div")!.parentElement!
  const btn = within(list).getByText(rowName)
  fireEvent.click(btn)
}

describe("the anchor slot (URL→NAME honesty)", () => {
  it("a flow pick writes the NAME (the drop-honesty law)", async () => {
    const { p, changed } = slot({ value: "still-b" })
    render(<FirstFrameSlot {...p} />)
    await flowPick("First frame", "still-a")
    assert.deepEqual(changed, ["still-a"])
  })

  it("a data: pick rides verbatim (uploads are first-class)", async () => {
    const { p, changed } = slot()
    render(<FirstFrameSlot {...p} />)
    await flowPick("First frame", "up-data")
    assert.deepEqual(changed, ["data:image/png;base64,AAA"])
  })

  it("— clear — empties the source", async () => {
    const { p, changed } = slot({ value: "still-a" })
    render(<FirstFrameSlot {...p} />)
    fireEvent.click(screen.getByLabelText("first frame · slot 1 source"))
    fireEvent.click(await screen.findByText("— clear —"))
    assert.deepEqual(changed, [""])
  })

  it("no links = no flow candidates (never a crash)", async () => {
    const { p, changed } = slot({ value: undefined, links: undefined })
    render(<FirstFrameSlot {...p} />)
    fireEvent.click(screen.getByLabelText("first frame · slot 1 source"))
    fireEvent.click(await screen.findByText("From flow"))
    assert.ok(await screen.findByText("nothing to pick yet"))
    assert.deepEqual(changed, [])
  })

  it("a foreign URL refuses VISIBLY (never a silent unresolved pass)", async () => {
    bindForeignMedia()
    try {
      const { p, changed } = slot()
      render(<FirstFrameSlot {...p} />)
      fireEvent.click(screen.getByLabelText("first frame · slot 1 source"))
      fireEvent.click(await screen.findByText("From media"))
      const row = await screen.findByText("x")
      fireEvent.click(row.closest("button")!)
      assert.deepEqual(changed, [])
      assert.ok((await screen.findByTestId("tl-frame-first-file-error")).textContent!.includes("vocabulary"))
      // a later honest pick clears the error
      await flowPick("First frame", "still-a")
      assert.deepEqual(changed, ["still-a"])
      assert.equal(screen.queryByTestId("tl-frame-first-file-error"), null)
    } finally {
      unbindEstateRemote()
    }
  })

  it("value faces render (blank / data: / known / unknown names)", () => {
    for (const v of [undefined, "  ", "data:image/png;base64,AAA", "still-a", "ghost-name"]) {
      const { p } = slot({ value: v })
      const h = render(<FirstFrameSlot {...p} />)
      assert.ok(screen.getByTestId("tl-frame-first"))
      h.unmount()
    }
    expect(LINKS.length).toBe(2)
  })
})

describe("takeFile (the studio's own file law)", () => {
  function fileInput() {
    const { container } = { container: document.body } as { container: HTMLElement }
    void container
    const inputs = document.body.querySelectorAll('input[type="file"]')
    return inputs[inputs.length - 1]! as HTMLInputElement
  }

  it("an image file rides inline; error clears", async () => {
    const { p, changed } = slot()
    render(<FirstFrameSlot {...p} />)
    fireEvent.change(fileInput(), { target: { files: [new File(["bytes"], "up.png", { type: "image/png" })] } })
    await waitFor(() => { assert.equal(changed.length, 1) })
    assert.ok(changed[0]!.startsWith("data:image/png;base64,"))
    assert.equal(screen.queryByTestId("tl-frame-first-file-error"), null)
  })

  it("non-images refuse with the type named (empty type = unknown)", async () => {
    const { p, changed } = slot()
    render(<FirstFrameSlot {...p} />)
    fireEvent.change(fileInput(), { target: { files: [new File(["x"], "v.mp4", { type: "video/mp4" })] } })
    assert.ok((await screen.findByTestId("tl-frame-first-file-error")).textContent!.includes("video/mp4"))
    fireEvent.change(fileInput(), { target: { files: [new File(["x"], "blob")] } })
    assert.ok((await screen.findByTestId("tl-frame-first-file-error")).textContent!.includes("unknown type"))
    assert.deepEqual(changed, [])
  })

  it("oversize images refuse; unreadable files refuse (never a throw)", async () => {
    const { p, changed } = slot()
    render(<FirstFrameSlot {...p} />)
    fireEvent.change(fileInput(), {
      target: { files: [new File([new ArrayBuffer(21 * 1024 * 1024)], "big.png", { type: "image/png" })] },
    })
    assert.ok((await screen.findByTestId("tl-frame-first-file-error")).textContent!.includes("20 MB"))
    class FailReader {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      error = new Error("denied")
      result: string | null = null
      readAsDataURL() { this.onerror?.() }
    }
    vi.stubGlobal("FileReader", FailReader)
    try {
      fireEvent.change(fileInput(), { target: { files: [new File(["x"], "bad.png", { type: "image/png" })] } })
      assert.ok((await screen.findByTestId("tl-frame-first-file-error")).textContent!.includes("could not read"))
    } finally {
      vi.unstubAllGlobals()
    }
    assert.deepEqual(changed, [])
  })
})

describe("the seam (carried vs cut — the carry itself is automatic)", () => {
  function seam(over?: Record<string, unknown>) {
    const trans: string[] = []
    const p = {
      callIndex: 0,
      transition: "cut" as "cut" | "extend",
      onTransition: (t: "extend" | "cut") => { trans.push(t) },
      ...over,
    }
    return { p, trans }
  }

  it("absent without the door; the faces voice the automatic law", () => {
    const bare = seam({ onTransition: undefined })
    const h1 = render(<SeamControls {...bare.p} />)
    assert.equal(screen.queryByLabelText("Call 0 seam mode"), null)
    h1.unmount()
    const { p } = seam()
    render(<SeamControls {...p} />)
    const mode = screen.getByLabelText("Call 0 seam mode") as HTMLSelectElement
    assert.equal(mode.value, "cut")
    const faces = [...mode.options].map((o) => o.textContent)
    assert.deepEqual(faces, [
      "Carried — Drift Control Chain",
      "Cut — Independent Window",
    ], "the two faces name the mechanic, never a seconds ask")
    const tip = mode.closest("[title]") as HTMLElement | null
    assert.ok(tip !== null && tip.title.includes("drift control"),
      "the tooltip names the automatic mechanic")
  })

  it("absent transition DISPLAYS extend — what the compose actually does (the wire-up law, 2026-09-17)", () => {
    const { p } = seam({ transition: undefined })
    render(<SeamControls {...p} />)
    const mode = screen.getByLabelText("Call 0 seam mode") as HTMLSelectElement
    assert.equal(mode.value, "extend")
  });

  it("the mode select switches; no seconds control exists anymore (the seam is automatic)", () => {
    const { p, trans } = seam({ transition: "extend" })
    render(<SeamControls {...p} />)
    const mode = screen.getByLabelText("Call 0 seam mode") as HTMLSelectElement
    assert.equal(mode.value, "extend")
    fireEvent.change(mode, { target: { value: "cut" } })
    assert.deepEqual(trans, ["cut"])
    fireEvent.change(mode, { target: { value: "extend" } })
    assert.deepEqual(trans, ["cut", "extend"])
    // the drift-control carry owns the seam — nothing to author
    assert.equal(screen.queryByLabelText("Call 0 latent carry seconds"), null)
    assert.equal(screen.queryByLabelText("Call 0 previous video tail seconds"), null)
    assert.equal(screen.queryByLabelText("Call 0 continue from previous"), null)
    const faces = [...mode.options].map((o) => o.textContent)
    assert.ok(faces.includes("Carried — Drift Control Chain"))
  })
})

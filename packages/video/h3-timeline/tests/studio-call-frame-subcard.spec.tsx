/**
 * CallFrameSubcard — one frame-conditioning subcard (BEHAVIORAL).
 *
 * PINS (ONE grammar via SourceRow, the studio's own file law):
 * From-flow picks write URL→NAME (unmatched URLs refuse visibly),
 * data: URLs ride verbatim, clear empties, uploads gate type+size
 * with visible errors, and the first-frame seam (cut/extend +
 * prev-video toggle + carry seconds) writes its own doors.
 */
import { describe, expect, it, vi } from "vitest"
import assert from "node:assert/strict"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { CallFrameSubcard } from "../src/ui/studio/CallFrameSubcard.tsx"

const NAME_TO_URL = new Map([
  ["still-a", "https://u/a.png"],
  ["still-b", "https://u/b.png"],
])
const URL_TO_NAME = new Map([...NAME_TO_URL].map(([n, u]) => [u, n] as [string, string]))
const LINKS = [
  { name: "still-a", url: "https://u/a.png", title: "up" },
  { name: "up-data", url: "data:image/png;base64,AAA", title: "up" },
]

function sub(over?: Record<string, unknown>) {
  const changed: string[] = []
  const p = {
    label: "First frame",
    testId: "tl-frame-first",
    callIndex: 0,
    value: undefined as string | undefined,
    onChange: (s: string) => { changed.push(s) },
    nameToUrl: NAME_TO_URL,
    urlToName: URL_TO_NAME,
    links: LINKS,
    ...over,
  }
  return { p, changed }
}

/** Square → menu → From flow → candidate row (the modal closes). */
async function flowPick(label: string, rowName: string) {
  fireEvent.click(screen.getByLabelText("source"))
  fireEvent.click(await screen.findByText("From flow"))
  const modal = await screen.findByText("The other stages’ latest outputs (image)")
  const list = modal.closest("div")!.parentElement!
  const btn = within(list).getByText(rowName)
  fireEvent.click(btn)
}

describe("the source row (URL→NAME honesty)", () => {
  it("a flow pick writes the NAME (the drop-honesty law)", async () => {
    const { p, changed } = sub({ value: "still-b" })
    render(<CallFrameSubcard {...p} />)
    await flowPick("First frame", "still-a")
    assert.deepEqual(changed, ["still-a"])
  })

  it("a data: pick rides verbatim (uploads are first-class)", async () => {
    const { p, changed } = sub()
    render(<CallFrameSubcard {...p} />)
    await flowPick("First frame", "up-data")
    assert.deepEqual(changed, ["data:image/png;base64,AAA"])
  })

  it("— clear — empties the source", async () => {
    const { p, changed } = sub({ value: "still-a" })
    render(<CallFrameSubcard {...p} />)
    fireEvent.click(screen.getByLabelText("source"))
    fireEvent.click(await screen.findByText("— clear —"))
    assert.deepEqual(changed, [""])
  })

  it("no links = no flow candidates (never a crash)", async () => {
    const { p, changed } = sub({ value: undefined, links: undefined })
    render(<CallFrameSubcard {...p} />)
    fireEvent.click(screen.getByLabelText("source"))
    fireEvent.click(await screen.findByText("From flow"))
    assert.ok(await screen.findByText("nothing to pick yet"))
    assert.deepEqual(changed, [])
  })

  it("a foreign URL refuses VISIBLY (never a silent unresolved pass)", async () => {
    vi.stubGlobal("fetch", async (url: unknown, init?: { body?: string }) => {
      const rpcId = (JSON.parse(String(init?.body)) as { rpcId: number }).rpcId
      return new Response(JSON.stringify({
        type: "server-response",
        rpcId,
        result: { ok: true, value: { items: [{ url: "https://foreign/x.png", name: "x", kind: "image", runId: "r1" }] } },
      }), { status: 200 })
    })
    try {
      const { p, changed } = sub()
      render(<CallFrameSubcard {...p} />)
      fireEvent.click(screen.getByLabelText("source"))
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
      vi.unstubAllGlobals()
    }
  })

  it("value faces render (blank / data: / known / unknown names)", () => {
    for (const v of [undefined, "  ", "data:image/png;base64,AAA", "still-a", "ghost-name"]) {
      const { p } = sub({ value: v })
      const h = render(<CallFrameSubcard {...p} />)
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
    const { p, changed } = sub()
    render(<CallFrameSubcard {...p} />)
    fireEvent.change(fileInput(), { target: { files: [new File(["bytes"], "up.png", { type: "image/png" })] } })
    await waitFor(() => { assert.equal(changed.length, 1) })
    assert.ok(changed[0]!.startsWith("data:image/png;base64,"))
    assert.equal(screen.queryByTestId("tl-frame-first-file-error"), null)
  })

  it("non-images refuse with the type named (empty type = unknown)", async () => {
    const { p, changed } = sub()
    render(<CallFrameSubcard {...p} />)
    fireEvent.change(fileInput(), { target: { files: [new File(["x"], "v.mp4", { type: "video/mp4" })] } })
    assert.ok((await screen.findByTestId("tl-frame-first-file-error")).textContent!.includes("video/mp4"))
    fireEvent.change(fileInput(), { target: { files: [new File(["x"], "blob")] } })
    assert.ok((await screen.findByTestId("tl-frame-first-file-error")).textContent!.includes("unknown type"))
    assert.deepEqual(changed, [])
  })

  it("oversize images refuse; unreadable files refuse (never a throw)", async () => {
    const { p, changed } = sub()
    render(<CallFrameSubcard {...p} />)
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

describe("the seam (first-frame continuation)", () => {
  function seam(over?: Record<string, unknown>) {
    const prevs: (number | null)[] = []
    const trans: string[] = []
    const p = {
      ...sub().p,
      prevSec: undefined as number | undefined,
      onPrevSec: (n: number | null) => { prevs.push(n) },
      transition: "cut" as "cut" | "extend",
      onTransition: (t: "extend" | "cut") => { trans.push(t) },
      ...over,
    }
    return { p, prevs, trans }
  }

  it("absent without both doors; cut mode arms the opener", () => {
    const bare = sub()
    const h1 = render(<CallFrameSubcard {...bare.p} />)
    assert.equal(screen.queryByLabelText("Call 0 continue from previous"), null)
    h1.unmount()
    const half = seam({ onTransition: undefined })
    const h2 = render(<CallFrameSubcard {...half.p} />)
    // prev label without the seam row (no mode select)
    assert.ok(screen.getByLabelText("Call 0 continue from previous"))
    assert.equal(screen.queryByLabelText("Call 0 seam mode"), null)
    h2.unmount()
    const { p } = seam()
    render(<CallFrameSubcard {...p} />)
    const mode = screen.getByLabelText("Call 0 seam mode") as HTMLSelectElement
    assert.equal(mode.value, "cut")
    assert.ok(screen.getByText("open from the last"))
    assert.ok(screen.getByText("s of the previous video"))
  })

  it("the toggle writes 2 (cut) / 3 (extend) / null (off)", () => {
    const cut = seam()
    const h1 = render(<CallFrameSubcard {...cut.p} />)
    fireEvent.click(screen.getByLabelText("Call 0 continue from previous"))
    assert.deepEqual(cut.prevs, [2])
    h1.unmount()
    const ext = seam({ transition: "extend" })
    const h2 = render(<CallFrameSubcard {...ext.p} />)
    fireEvent.click(screen.getByLabelText("Call 0 continue from previous"))
    assert.deepEqual(ext.prevs, [3])
    h2.unmount()
    const on = seam({ prevSec: 2 })
    const h3 = render(<CallFrameSubcard {...on.p} />)
    fireEvent.click(screen.getByLabelText("Call 0 continue from previous"))
    assert.deepEqual(on.prevs, [null])
    h3.unmount()
  })

  it("the mode select switches; carry seconds edit (valid only)", () => {
    const { p, prevs, trans } = seam({ transition: "extend", prevSec: 3 })
    render(<CallFrameSubcard {...p} />)
    const mode = screen.getByLabelText("Call 0 seam mode") as HTMLSelectElement
    assert.equal(mode.value, "extend")
    fireEvent.change(mode, { target: { value: "cut" } })
    assert.deepEqual(trans, ["cut"])
    fireEvent.change(mode, { target: { value: "extend" } })
    assert.deepEqual(trans, ["cut", "extend"])
    const num = screen.getByLabelText("Call 0 latent carry seconds") as HTMLInputElement
    assert.equal(num.value, "3")
    fireEvent.change(num, { target: { value: "2.5" } })
    fireEvent.change(num, { target: { value: "" } })
    fireEvent.change(num, { target: { value: "-1" } })
    fireEvent.change(num, { target: { value: "abc" } })
    assert.deepEqual(prevs, [2.5])
    assert.ok(screen.getByText("chain the last"))
  })

  it("cut carry seconds + disabled note faces", () => {
    const { p, prevs } = seam({ prevSec: 2, prevDisabled: true, prevNote: "no prev yet" })
    render(<CallFrameSubcard {...p} />)
    const num = screen.getByLabelText("Call 0 previous video tail seconds") as HTMLInputElement
    fireEvent.change(num, { target: { value: "4" } })
    assert.deepEqual(prevs, [4])
    // invalid edits hold (never a write)
    fireEvent.change(num, { target: { value: "" } })
    fireEvent.change(num, { target: { value: "0" } })
    assert.deepEqual(prevs, [4])
    assert.ok(screen.getByText("no prev yet"))
    const tgl = screen.getByLabelText("Call 0 continue from previous") as HTMLInputElement
    assert.equal(tgl.disabled, true)
    expect(num.value).toBe("2")
  })
})

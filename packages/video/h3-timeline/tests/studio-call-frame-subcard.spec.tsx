/**
 * CallFrameSubcard — SeamControls (the call's join — cut/extend +
 * prev continuation) and its prev-toggle + carry-seconds doors.
 * (2026-11-05) FirstFrameSlot is DEAD — keyframe pins own anchors;
 * its URL→NAME/upload laws live on the SourceRow grammar specs.
 */
import { describe, expect, it, vi } from "vitest"
import assert from "node:assert/strict"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { bindEstateRemote, unbindEstateRemote } from '@melite/card-base/client'
import { SeamControls } from "../src/ui/studio/CallFrameSubcard.tsx"

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
  fireEvent.click(screen.getByLabelText("anchor ref · slot 1 source"))
  fireEvent.click(await screen.findByText("From flow"))
  const modal = await screen.findByText("The other stages’ latest outputs (image)")
  const list = modal.closest("div")!.parentElement!
  const btn = within(list).getByText(rowName)
  fireEvent.click(btn)
}

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
    // S7h: the seam select rides the DSH Menu (card-base SpecAtom)
    const mode = screen.getByLabelText("Call 0 seam mode") as HTMLButtonElement
    assert.match(mode.textContent ?? "", /^Cut/)
    fireEvent.click(mode)
    const faces = screen.getAllByRole("menuitem").map((o) => o.textContent)
    assert.deepEqual(faces, [
      "Carried — Drift Control Chain",
      "Cut — Independent Window",
    ], "the two faces name the mechanic, never a seconds ask")
    fireEvent.click(mode)
    // (2026-11-05) SpecAtom's own title fallback (wave 1) sits
    // closer than the row — the tooltip law is the ROW's help text
    const tipped = [...document.querySelectorAll("[title]")].map((el) => (el as HTMLElement).title)
    assert.ok(tipped.some((t) => t.includes("drift control")),
      "the tooltip names the automatic mechanic")
  })

  it("absent transition DISPLAYS extend — what the compose actually does (the wire-up law, 2026-09-17)", () => {
    const { p } = seam({ transition: undefined })
    render(<SeamControls {...p} />)
    const mode = screen.getByLabelText("Call 0 seam mode") as HTMLButtonElement
    assert.match(mode.textContent ?? "", /^Carried/)
  });

  it("the mode select switches; no seconds control exists anymore (the seam is automatic)", () => {
    const { p, trans } = seam({ transition: "extend" })
    render(<SeamControls {...p} />)
    const mode = screen.getByLabelText("Call 0 seam mode") as HTMLButtonElement
    assert.match(mode.textContent ?? "", /^Carried/)
    const pick = (face: RegExp): void => {
      fireEvent.click(mode)
      fireEvent.click(screen.getByRole("menuitem", { name: face }))
    }
    pick(/^Cut/)
    assert.deepEqual(trans, ["cut"])
    pick(/^Carried/)
    assert.deepEqual(trans, ["cut", "extend"])
    // the drift-control carry owns the seam — nothing to author
    assert.equal(screen.queryByLabelText("Call 0 latent carry seconds"), null)
    assert.equal(screen.queryByLabelText("Call 0 previous video tail seconds"), null)
    assert.equal(screen.queryByLabelText("Call 0 continue from previous"), null)
    fireEvent.click(mode)
    const faces = screen.getAllByRole("menuitem").map((o) => o.textContent)
    fireEvent.click(mode)
    assert.ok(faces.includes("Carried — Drift Control Chain"))
  })
})

/** THE DROP CONTRACT (2026-10-26, the operator's live burn: "I put
 *  an image in. But nothing happens"): the estate's drag grammar —
 *  media-bar asset drags (ASSET_DRAG_MIME payload) and OS file
 *  drags — MUST land on the anchor slot exactly as they land on the
 *  square face (image-edit). A drop that neither commits nor
 *  refuses visibly is THE SILENT DROP, and this wall reds on it. */

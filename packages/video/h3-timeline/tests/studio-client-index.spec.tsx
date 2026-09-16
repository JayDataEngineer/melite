/**
 * client/index — the bench-slot adapter (BEHAVIORAL).
 *
 * PINS (one translate layer, zero paraphrase): the bench row becomes
 * the tenant's CardStage — params IS the document (non-objects coerce
 * to empty); the harvest shape feeds the filmstrip (named map, flat
 * list, gallery, stage url, junk refused); runStatus rides through;
 * upstreams arrive read-only; the module registers its own view.
 */
import { describe, it } from "vitest"
import assert from "node:assert/strict"
import { render, screen } from "@testing-library/react"
import {
  H3TimelineStudio, apply, inject, name,
} from "../src/client/index.ts"

function owner(row: Record<string, unknown>, over?: Record<string, unknown>) {
  return {
    stageId: "s_4",
    cardName: "h3-timeline",
    row: { id: "s_4", card: "h3-timeline", title: "H3 Timeline", ...row },
    runStatus: "ready",
    onPatch: () => {},
    onRun: () => {},
    onStop: () => {},
    onRemove: () => {},
    onSurface: () => {},
    ...over,
  } as never
}

const CALLS = { calls: [{ text: "one", start_frame: 0, end_frame: 48 }], fps: 24 }

function mount(row: Record<string, unknown>, over?: Record<string, unknown>) {
  const els = render(H3TimelineStudio(owner(row, over) as never) as never)
  return { els }
}

describe("params IS the document (coerced, never trusted)", () => {
  it("a params-less row still authors (the starter lands)", () => {
    for (const params of [undefined, null, "nope", 42]) {
      const h = mount({ params } as never)
      assert.ok(screen.getByTestId("tl-doc-readout").textContent!.includes("call"))
      h.els.unmount()
    }
  })

  it("real params render verbatim", () => {
    mount({ params: CALLS })
    assert.ok(screen.getByTestId("tl-doc-readout").textContent!.includes("1 call"))
  })
})

describe("the harvest shape feeds the filmstrip", () => {
  it("named windows tile; junk entries never become tiles", () => {
    const h = mount({
      params: CALLS,
      result: {
        artifacts: {
          video_w1_main: "https://u/w1.mp4",
          video_w2_last_frame: "https://u/still.png",
          placeholder: "",
          count: 7,
        },
      },
    })
    assert.equal(screen.getAllByTestId("tl-window-tile").length, 1)
    h.els.unmount()
  })

  it("the flat list feeds the hero + beyond-[0] windows", () => {
    const h = mount({
      params: {
        calls: [
          { text: "one", start_frame: 0, end_frame: 80 },
          { text: "two", start_frame: 80, end_frame: 168 },
        ],
        fps: 24,
      },
      result: {
        artifacts: { video_w1_main: "https://u/w1.mp4" },
        assetUrls: [
          "https://u/stitch.mp4", "", "https://u/w1.mp4",
          "https://u/window9_video.mp4", "https://u/plain.mp4", 7,
        ],
      },
    })
    assert.ok(screen.getByTestId("tl-final-cut"))
    assert.equal(screen.queryAllByTestId("tl-window-tile").length, 0) // final lands: tiles hide
    // ...but every window previews INSIDE its bar clip (named + joined)
    const c0 = document.body.querySelector('[data-prompt-clip="call-0"]')!
    const c1 = document.body.querySelector('[data-prompt-clip="call-1"]')!
    assert.equal(c0.querySelector("video")!.getAttribute("src"), "https://u/w1.mp4")
    assert.equal(c1.querySelector("video")!.getAttribute("src"), "https://u/window9_video.mp4")
    h.els.unmount()
  })

  it("gallery entries map name→url; the stage url owns the hero", () => {
    const h = mount({
      params: CALLS,
      result: {
        artifacts: { video: "https://u/map.mp4" },
        url: "https://u/stage.mp4",
        gallery: [
          { name: "video_w3_main", url: "https://u/w3.mp4" },
          { name: "", url: "https://u/noname.mp4" },
          { name: "nourl", url: "" },
          { name: "urlnum", url: 5 },
          { name: 5, url: "https://u/bad.mp4" },
        ],
      },
    })
    const cut = screen.getByTestId("tl-final-cut")
    assert.equal(cut.querySelector("a")!.getAttribute("href"), "https://u/stage.mp4")
    h.els.unmount()
  })

  it("a result-less row previews empty (never a throw)", () => {
    for (const result of [undefined, null, "nope"]) {
      const h = mount({ params: CALLS, result } as never)
      assert.ok(screen.getByText("No render yet — author the calls below, then Run."))
      h.els.unmount()
    }
  })

  it("metadata rides (history chips link prior finals)", () => {
    mount({
      params: CALLS,
      result: {
        artifacts: {},
        metadata: {
          history: [{ runId: "run-1", status: "completed", durationSec: 4, video: "https://u/old.mp4" }],
        },
      },
    })
    assert.ok(screen.getByTestId("tl-run-history").textContent!.includes("Runs (1)"))
  })

  it("a metadata-less row owns no history", () => {
    const h = mount({ params: CALLS, result: { artifacts: {}, metadata: null } })
    assert.equal(screen.queryByTestId("tl-run-history"), null)
    h.els.unmount()
  })
})

describe("identity + status ride through", () => {
  it("title falls back (title → card → stage id); card-less rows stay video", () => {
    const h1 = mount({ params: CALLS, title: "", card: "" })
    assert.ok(screen.getByTestId("tl-doc-readout"))
    h1.els.unmount()
    const h2 = mount({ params: CALLS, title: "", card: "h3-timeline" })
    assert.ok(screen.getByTestId("tl-doc-readout"))
    h2.els.unmount()
    // a card-less row (card not a string) still authors as video
    const h3 = mount({ params: CALLS, title: "", card: undefined })
    assert.ok(screen.getByTestId("tl-doc-readout"))
    h3.els.unmount()
    mount({ params: CALLS })
    assert.ok(screen.getByTestId("tl-doc-readout"))
  })

  it("every runStatus mounts (done / failed / queued ride the map)", () => {
    for (const runStatus of ["done", "failed", "queued", "running", "weird"]) {
      const h = mount({ params: CALLS }, { runStatus })
      assert.ok(screen.getByTestId("h3-studio-tenant"))
      h.els.unmount()
    }
  })
})

describe("upstreams arrive read-only", () => {
  it("absent or empty = no channel; rows map to done image stages", () => {
    const h1 = mount({ params: CALLS })
    assert.ok(screen.getByTestId("tl-doc-readout"))
    h1.els.unmount()
    const h2 = mount({ params: CALLS }, { upstream: [] })
    assert.ok(screen.getByTestId("tl-doc-readout"))
    h2.els.unmount()
    mount(
      { params: CALLS },
      { upstream: [{ id: "u1", title: "up.png", url: "https://u/up.png" }] },
    )
    assert.ok(screen.getByTestId("tl-doc-readout"))
  })
})

describe("the registration (the ui-tool law)", () => {
  it("the module namespace IS the plugin", () => {
    assert.equal(name, "h3TimelineStudio")
    assert.deepEqual(inject, ["slots"])
    const registered: unknown[] = []
    let thunk: (() => void) | null = null
    apply({
      slots: {
        inject: (_seam: string, fn: () => void) => { thunk = fn },
        register: (...args: unknown[]) => { registered.push(args) },
      },
    } as never)
    assert.ok(thunk)
    ;(thunk as unknown as () => void)()
    assert.equal(registered.length, 1)
    const [desc, view] = registered[0] as [{ name: string; key: string }, unknown]
    assert.deepEqual(desc, { name: "cards.stage.view", key: "h3-timeline" })
    assert.equal(view, H3TimelineStudio)
  })
})

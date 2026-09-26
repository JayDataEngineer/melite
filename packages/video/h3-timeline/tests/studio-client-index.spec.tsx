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
    upstream: [],
    runId: null,
    ...over,
  } as never
}

const CALLS = { calls: [{ text: "one", start_frame: 0, end_frame: 48 }], fps: 24 }

function mount(row: Record<string, unknown>, over?: Record<string, unknown>) {
  const els = render(H3TimelineStudio(owner(row, over) as never) as never)
  return { els }
}

type ProjectedStage = {
  result: null | {
    assetUrls: string[]
    artifacts: Record<string, string>
    metadata: Record<string, unknown>
    durationSec?: number
    gallery?: Array<{ name: string; url: string }>
    motionPreviews?: Array<{ label: string; url: string | null; artifact: string }>
  }
}

function stage(row: Record<string, unknown>, over?: Record<string, unknown>): ProjectedStage {
  const element = H3TimelineStudio(owner(row, over) as never) as unknown as {
    props: { children: { props: { stage: ProjectedStage } } }
  }
  return element.props.children.props.stage
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
    const result = {
      artifacts: { video: "https://u/map.mp4" },
      url: "https://u/stage.mp4",
      gallery: [
        { name: "video_w3_main", url: "https://u/w3.mp4" },
        null,
        [],
        { name: "", url: "https://u/noname.mp4" },
        { name: "nourl", url: "" },
        { name: "urlnum", url: 5 },
        { name: 5, url: "https://u/bad.mp4" },
      ],
    }
    const projected = stage({ params: CALLS, result })
    assert.deepEqual(projected.result?.artifacts, {
      video: "https://u/stage.mp4",
      video_w3_main: "https://u/w3.mp4",
    })
    const h = mount({ params: CALLS, result })
    const cut = screen.getByTestId("tl-final-cut")
    assert.equal(cut.querySelector("a")!.getAttribute("href"), "https://u/stage.mp4")
    h.els.unmount()
  })

  it("normalized duration, gallery, and motion previews survive H3 harvesting", () => {
    const projected = stage({
      params: CALLS,
      result: {
        artifacts: {},
        assetUrls: ["https://u/final.mp4"],
        durationSec: 6.25,
        gallery: [{ name: "frame", url: "https://u/frame.png" }],
        motionPreviews: [{ label: "pose", url: null, artifact: "pose.npz" }],
        metadata: { runId: "run-1" },
      },
    })
    assert.deepEqual(projected.result, {
      assetUrls: ["https://u/final.mp4"],
      artifacts: { video: "https://u/final.mp4", frame: "https://u/frame.png" },
      metadata: { runId: "run-1" },
      durationSec: 6.25,
      gallery: [{ name: "frame", url: "https://u/frame.png" }],
      motionPreviews: [{ label: "pose", url: null, artifact: "pose.npz" }],
    })
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

  it("projects generic stage history into H3 history", () => {
    mount({
      params: CALLS,
      history: [{
        run_id: "run-old",
        url: "https://u/old.mp4",
        artifacts: { film: "https://u/old.mp4" },
        assetUrls: ["https://u/old.mp4"],
      }],
      result: {
        run_id: "run-new",
        url: "https://u/new.mp4",
        artifacts: { film: "https://u/new.mp4" },
        assetUrls: ["https://u/new.mp4"],
      },
    })
    const history = screen.getByTestId("tl-run-history")
    assert.ok(history.textContent!.includes("Runs (2)"))
    assert.equal(history.querySelector("a")!.getAttribute("href"), "https://u/new.mp4")
  })

  it("never promotes an audio result over the rendered film", () => {
    const h = mount({
      params: CALLS,
      result: {
        url: "https://u/mix.flac",
        artifacts: {
          film: "https://u/film.mp4",
          mix: "https://u/mix.flac",
        },
        assetUrls: ["https://u/mix.flac", "https://u/film.mp4"],
      },
    })
    assert.equal(screen.getByTestId("tl-final-cut").querySelector("a")!.getAttribute("href"), "https://u/film.mp4")
    h.els.unmount()
  })

  it("normalizes film, direct, named, flat, and legacy history without audio promotion", () => {
    const projected = stage({
      params: CALLS,
      history: [
        { run_id: "current", artifacts: { "h3_t4_film_00001_.mp4": "https://u/current.mp4" } },
        {
          runId: "film",
          status: "completed",
          at: 1,
          durationSec: 2,
          artifacts: { "h3_t4_film_00002_.mp4": "https://u/film.mp4" },
          assetUrls: [7, "https://u/film.mp4", ""],
        },
        { run_id: "direct", status: "queued", at: 2, durationSec: 3, url: "https://u/direct.mp4" },
        { artifacts: { named: "https://u/named.mp4" } },
        { assetUrls: ["https://u/flat.mp4"] },
        { error: "boom", url: "https://u/error.mp4" },
        { runId: "film", url: "https://u/duplicate.mp4" },
        { runId: "named-duplicate", url: "https://u/named.mp4" },
        {},
      ],
      result: {
        run_id: "current",
        artifacts: { "h3_t4_film_00001_.mp4": "https://u/current.mp4" },
        metadata: { history: [
          { runId: "legacy", status: "done", at: 4, durationSec: 4, video: "https://u/legacy.mp4" },
          { runId: "invalid", video: 7 },
          { video: "https://u/legacy2.mp4" },
        ] },
      },
    })
    const rows = (projected.result?.metadata.history ?? []) as Array<Record<string, unknown>>
    assert.equal(rows.length, 9)
    assert.equal(rows[0]?.video, "https://u/current.mp4")
    assert.deepEqual(rows.find((row) => row.runId === "film"), {
      runId: "film",
      status: "completed",
      at: 1,
      durationSec: 2,
      video: "https://u/film.mp4",
    })
    assert.equal(rows.find((row) => row.runId === "direct")?.video, "https://u/direct.mp4")
    assert.equal(rows.find((row) => row.video === "https://u/named.mp4")?.video, "https://u/named.mp4")
    assert.equal(rows.find((row) => row.video === "https://u/flat.mp4")?.video, "https://u/flat.mp4")
    assert.equal(rows.find((row) => row.video === "https://u/error.mp4")?.status, "failed")
    assert.equal(rows.find((row) => row.runId === "legacy")?.durationSec, 4)
    assert.equal(rows.find((row) => row.video === "https://u/legacy2.mp4")?.video, "https://u/legacy2.mp4")
  })

  it("caps deduplicated history and removes an audio-only legacy video", () => {
    const history = Array.from({ length: 13 }, (_, index) => ({
      runId: `run-${index}`,
      url: `https://u/history-${index}.mp4`,
    }))
    const projected = stage({
      params: CALLS,
      history,
      result: { artifacts: { video: "https://u/mix.flac" }, url: "https://u/mix.flac" },
    })
    const rows = (projected.result?.metadata.history ?? []) as Array<Record<string, unknown>>
    assert.equal(rows.length, 12)
    assert.equal(rows[0]?.runId, "run-0")
    assert.equal(projected.result?.artifacts.video, undefined)
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

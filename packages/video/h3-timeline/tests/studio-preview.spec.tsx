/**
 * StudioPreview — preview pane (BEHAVIORAL).
 *
 * PINS (NLE order, ONE hero): the header meta is the dict's frames
 * readout (F11, 2026-11-05 — the run state rides data-running, the
 * body faces carry it visually); run history chips link prior
 * finals; the final cut plays alone (windows are mid-run evidence
 * only); window tiles number themselves; emptiness owns an
 * EmptyState with the dict's hint. The section heads ride the
 * estate SectionLabel (F5).
 */
import { describe, it } from "vitest"
import assert from "node:assert/strict"
import { render, screen } from "@testing-library/react"
import { StudioPreview } from "../src/ui/studio/StudioPreview.tsx"
import { projectH3StageViewProps, stageHistoryRows } from "../src/ui/studio/projection.ts"
import { filmstripOf } from "../src/ui/studio/useDerivedView.ts"

function preview(over?: Record<string, unknown>) {
  const els = render(
    <StudioPreview
      stage={{} as never}
      running={false}
      filmstrip={{ final: null, windows: [] }}
      filmRef={{ current: null }}
      filmMap={null}
      frameIdx={0}
      barTotal={168}
      fps={24}
      handleFilmTime={() => {}}
      handlePlayingChange={() => {}}
      onDuration={() => {}}
      {...over}
    />,
  )
  return { els }
}

describe("the header meta is the dict's frames readout (F11)", () => {
  it("the composition readout in every state; the run flag rides data-running", () => {
    const h1 = preview({ running: true, filmstrip: { final: null, windows: [{ name: "video_w1_main", url: "https://u/1.mp4" }] } })
    const strip = screen.getByTestId("tl-filmstrip")
    assert.ok(strip.textContent!.includes("168 frames · 24 fps"))
    assert.equal(strip.getAttribute("data-running"), "true", "the live run flag stays machine-visible")
    h1.els.unmount()
    const h2 = preview({ filmstrip: { final: null, windows: [{ name: "video_w1_main", url: "https://u/1.mp4" }] } })
    assert.ok(screen.getByTestId("tl-filmstrip").textContent!.includes("168 frames · 24 fps"))
    assert.equal(screen.getByTestId("tl-filmstrip").getAttribute("data-running"), null)
    h2.els.unmount()
    preview()
    assert.ok(screen.getByTestId("tl-filmstrip").textContent!.includes("168 frames · 24 fps"))
  })

  it("the run-history + cut-bar heads ride the estate SectionLabel (F5)", () => {
    preview({
      stage: { result: { metadata: { history: [
        { runId: "run-abcdefgh1234", status: "completed", at: 1700000000, durationSec: 7, video: "https://u/f1.mp4" },
      ] } } } as never,
      filmstrip: { final: "https://u/final.mp4", windows: [] },
    })
    assert.match(screen.getByText("Runs (1)").className, /_sectionLabelText_/, "the history head is SectionLabel's label face")
    assert.match(screen.getByText("Final cut").className, /_sectionLabelText_/, "the cut-bar head is SectionLabel's label face")
  })
})

describe("run history (prior finals, newest first)", () => {
  it("absent without history in every spelling", () => {
    for (const stage of [{}, { result: null }, { result: {} }, { result: { metadata: {} } }, { result: { metadata: { history: [] } } }]) {
      const h = preview({ stage: stage as never })
      assert.equal(screen.queryByTestId("tl-run-history"), null)
      h.els.unmount()
    }
  })

  it("chips link finals; titles carry id · status · seconds · time", () => {
    const history = [
      { runId: "run-abcdefgh1234", status: "completed", at: 1700000000, durationSec: 7, video: "https://u/f1.mp4" },
      { runId: "run-x", status: "failed", video: "https://u/f2.mp4" },
      { status: "completed", durationSec: 3, video: "https://u/f3.mp4" },
      { runId: "run-mystery", video: "https://u/f4.mp4" },
    ]
    preview({ stage: { result: { metadata: { history } } } as never })
    const row = screen.getByTestId("tl-run-history")
    assert.ok(row.textContent!.includes("Runs (4)"))
    const chips = row.querySelectorAll("a")
    assert.equal(chips.length, 4)
    assert.equal(chips[0]!.getAttribute("href"), "https://u/f1.mp4")
    assert.ok(chips[0]!.textContent!.includes("✓"))
    assert.ok(chips[0]!.textContent!.includes("abcdefgh"))
    assert.ok(chips[0]!.title.includes("run-abcdefgh1234 · completed · 7s · "))
    assert.ok(chips[1]!.textContent!.includes("×"))
    assert.ok(chips[1]!.title.includes("run-x · failed · ?s"))
    assert.ok(chips[1]!.title.endsWith("?s"))
    // no runId = index key, "run" label, unknown status/time
    assert.ok(chips[2]!.textContent!.includes("run · 3s"))
    assert.ok(chips[2]!.title.includes("undefined · completed · 3s"))
    // no status at all = × with every unknown marked
    assert.ok(chips[3]!.textContent!.includes("×"))
    assert.ok(chips[3]!.title.includes("run-mystery · ? · ?s"))
  })

  it("reads generic stage history as well as the legacy metadata face", () => {
    preview({ stage: { history: [{
      run_id: "run-generic",
      artifacts: { film: "https://u/generic.mp4" },
      assetUrls: ["https://u/generic.mp4"],
    }] } as never })
    assert.ok(screen.getByTestId("tl-run-history").textContent!.includes("generic"))
  })

  it("normalizes direct, film, named, flat, and legacy history without duplicates", () => {
    preview({
      stage: {
        result: { metadata: { history: [
          { run_id: "legacy", video: "https://u/legacy.mp4", status: "done", at: 3, durationSec: 3 },
          { video: 7 },
        ] } },
        history: [
          { runId: "direct", video: "https://u/direct.mp4", status: "completed", at: 0, durationSec: 1 },
          { video: "https://u/direct.flac", artifacts: { "h3_t4_film_00001_.mp4": "https://u/film.mp4" } },
          { artifacts: { named: "https://u/named.mp4" }, assetUrls: ["https://u/audio.flac"] },
          { artifacts: {}, assetUrls: ["https://u/flat.mp4"] },
          { runId: "direct", video: "https://u/duplicate-id.mp4" },
          { video: "https://u/named.mp4" },
          {},
        ],
      } as never,
    })
    const row = screen.getByTestId("tl-run-history")
    const chips = [...row.querySelectorAll("a")]
    assert.equal(chips.length, 5)
    assert.deepEqual(chips.map((chip) => chip.getAttribute("href")), [
      "https://u/legacy.mp4",
      "https://u/direct.mp4",
      "https://u/film.mp4",
      "https://u/named.mp4",
      "https://u/flat.mp4",
    ])
  })

  it("only the newest eight chips show", () => {
    const history = Array.from({ length: 9 }, (_, k) => ({
      runId: `run-${k}`, status: "completed", durationSec: k, video: `https://u/f${k}.mp4`,
    }))
    preview({ stage: { result: { metadata: { history } } } as never })
    const row = screen.getByTestId("tl-run-history")
    assert.ok(row.textContent!.includes("Runs (9)"))
    assert.equal(row.querySelectorAll("a").length, 8)
  })
})

describe("the hero (ONE player, windows only mid-run)", () => {
  it("the final cut plays with its clock + open door", () => {
    preview({
      filmstrip: { final: "https://u/final.mp4", windows: [{ name: "video_w1_main", url: "https://u/1.mp4" }] },
      filmMap: { fps: 30 },
      frameIdx: 60,
      barTotal: 168,
    })
    const cut = screen.getByTestId("tl-final-cut")
    assert.ok(cut.querySelector("video"))
    assert.ok(cut.textContent!.includes("2.00s · frame 60/168"))
    assert.equal(cut.querySelector("a")!.getAttribute("href"), "https://u/final.mp4")
    // windows hide once the film lands (never stray popups)
    assert.equal(screen.queryByTestId("tl-window-tile"), null)
  })

  it("fps falls back (no map, map without fps, fps 0)", () => {
    const h1 = preview({ filmstrip: { final: "https://u/f.mp4", windows: [] }, frameIdx: 48 })
    assert.ok(screen.getByTestId("tl-final-cut").textContent!.includes("2.00s"))
    h1.els.unmount()
    const h2 = preview({ filmstrip: { final: "https://u/f.mp4", windows: [] }, filmMap: {}, frameIdx: 48 })
    assert.ok(screen.getByTestId("tl-final-cut").textContent!.includes("2.00s"))
    h2.els.unmount()
    preview({ filmstrip: { final: "https://u/f.mp4", windows: [] }, filmMap: {}, frameIdx: 48, fps: 0 })
    assert.ok(screen.getByTestId("tl-final-cut").textContent!.includes("2.00s"))
  })

  it("mid-run tiles number windows, name the rest", () => {
    preview({
      filmstrip: {
        final: null,
        windows: [
          { name: "video_w3_main", url: "https://u/3.mp4" },
          { name: "intro", url: "https://u/i.mp4" },
        ],
      },
    })
    const tiles = screen.getAllByTestId("tl-window-tile")
    assert.equal(tiles.length, 2)
    assert.ok(tiles[0]!.textContent!.includes("window 3"))
    assert.ok(tiles[1]!.textContent!.includes("intro"))
  })

  it("bare = EmptyState (author, then Run; the dict's hint, F11)", () => {
    preview()
    assert.ok(screen.getByText("No render yet — author the calls below, then Run."))
    assert.ok(screen.getByText("render a run to see the film"), "the hint rides studioCopy.previewEmptyHint")
  })
})

describe("the loaded-history face (the wand-restored result renders the persisted hero — the starvation burn, 2026-11-15)", () => {
  // THE JOURNEY JUDGE: wand → bench ensure → h3 projection →
  // filmstripOf → StudioPreview. No wall crossed this chain before —
  // each seam was judged alone (bench-load POST bodies here-side,
  // hand-fed props in the arms above), and the operator's loaded
  // history collapsed to WINDOW TILES while every seam stayed green
  // (dev_docs/audits/journey/h3-history-load-video-2026-11-05.md).
  // The restore re-derives each result from the sidecar's url +
  // gallery names as GALLERY ROUTES with run-tail artifact keys — no
  // film-shaped key on window-spelled products — so the hero can only
  // arrive through result.url (the estate hero pointer) classified by
  // the tail the route's path= query names. This arm rides the REAL
  // projection and the REAL derivation on the REAL restored shape.
  const route = (tail: string): string => "/infer-gallery/artifact?path=" + encodeURIComponent(tail)
  const restoredFilmstrip = (result: Record<string, unknown>): { final: string | null; windows: Array<{ name: string; url: string }> } => {
    const { stage } = projectH3StageViewProps({
      stageId: "s_0",
      cardName: "h3-timeline",
      row: { params: {}, result },
      runStatus: "completed",
      onPatch: () => {},
      onRun: () => {},
      upstream: [],
    } as never)
    return filmstripOf(stage.result)
  }

  it("the operator's burn verbatim: a window-spelled product restored as a gallery-route pointer renders the FULL VIDEO, never tiles", () => {
    // the captured DOM's own shape: run-87986cb0fc0d-a2fa54c3, the
    // product saved under the WINDOW spelling, the wand's result
    // carrying it as the hero pointer over a run-tail-keyed map
    const tail = "run-87986cb0fc0d-a2fa54c3/h3-film/SaveVideo.0_h3_t4_w1_00001_.mp4"
    const filmstrip = restoredFilmstrip({
      run_id: "run-87986cb0fc0d-a2fa54c3",
      url: route(tail),
      artifacts: { [tail]: route(tail) },
      assetUrls: [route(tail)],
    })
    assert.equal(filmstrip.final, route(tail), "the pointer tier fires through the real projection (the gallery route classifies by its path= tail)")
    const h = preview({ filmstrip })
    assert.ok(screen.getByTestId("tl-final-cut"), "the full video renders — 1:1 with what the run settled")
    assert.equal(screen.queryByTestId("tl-window-tile"), null, "tiles are MID-RUN evidence only, never the loaded-history face")
    h.els.unmount()
  })

  it("the estate hero pointer stands alone (no flat list, a window-only map) — the pointer tier is the restored face's own hero seat", () => {
    // assetUrls ABSENT: the flat tier cannot rescue; the window-only
    // artifact map cannot name the hero. The pointer is the only seat
    // left — this arm isolates it so its toggle reds alone.
    const tail = "run-87986cb0fc0d-a2fa54c3/h3-film/SaveVideo.0_h3_t4_w1_00001_.mp4"
    const filmstrip = restoredFilmstrip({
      run_id: "run-87986cb0fc0d-a2fa54c3",
      url: route(tail),
      artifacts: { [tail]: route(tail) },
    })
    assert.equal(filmstrip.final, route(tail), "the pointer tier fires with no other tier available")
    assert.equal(filmstrip.windows.length, 1, "the window still tiles as evidence beneath the final")
  })

  it("the film-key face still leads by NAME (an in-graph assembly is the cut by its own law)", () => {
    const film = "run-c80a8afa5a28-a9ccdde4/h3-film/SaveVideo.2_h3_t4_film_00001_.mp4"
    const win = "run-c80a8afa5a28-a9ccdde4/h3-film/SaveVideo.0_h3_t4_w1_00001_.mp4"
    const filmstrip = restoredFilmstrip({
      run_id: "run-c80a8afa5a28-a9ccdde4",
      url: route(win),
      artifacts: { [film]: route(film), [win]: route(win) },
      assetUrls: [route(film), route(win)],
    })
    assert.equal(filmstrip.final, route(film), "the engine-film name outranks the pointer (tier 1)")
    assert.equal(filmstrip.windows.length, 1, "the window still tiles as evidence beneath the final")
  })

  it("the settled meta rides the restore: the persisted film map + history chips reach the projected face (the audit cure 3)", () => {
    // The wand's rebuilt result used to be a 4-key orphan — no
    // metadata — so filmMap nulled (the bar ran identity doc-space)
    // and the run-history chips vanished on every loaded-history
    // face. The restore now carries the settled result_metadata
    // (bench-load.ts resultOfStage; queueSidecar.ts serves it beside
    // result_outputs); the projection merges it into CardResult
    // metadata (harvestResult) and the consumers read it unchanged:
    // filmMap = metadata.film, stageHistoryRows = metadata.history.
    // This arm rides the REAL projection on the REAL restored shape;
    // its toggle is the wand's carry line (bench-load.ts
    // resultOfStage's `metadata` key) — the restored shape loses the
    // key and both assertions red.
    const film = { fps: 24, totalFrames: 231, windows: [{ start: 0, len: 90, trim: 0, docStart: 0, docSpan: 90 }] }
    const history = [{ runId: "run-87986cb0fc0d", status: "completed", video: route("run-87986cb0fc0d/x.mp4") }]
    const tail = "run-87986cb0fc0d-a2fa54c3/h3-film/SaveVideo.2_h3_t4_film_00001_.mp4"
    const { stage } = projectH3StageViewProps({
      stageId: "s_17",
      cardName: "h3-timeline",
      row: {
        params: {},
        result: {
          run_id: "run-87986cb0fc0d-a2fa54c3",
          url: route(tail),
          artifacts: { [tail]: route(tail) },
          assetUrls: [route(tail)],
          metadata: { film, history, runId: "run-87986cb0fc0d-a2fa54c3" },
        },
      },
      runStatus: "completed",
      onPatch: () => {},
      onRun: () => {},
      upstream: [],
    } as never)
    // the film map arrives 1:1 — filmMap's exact input
    assert.deepEqual(stage.result?.metadata?.film, film)
    // the history chips return — stageHistoryRows' metadata source
    const rows = stageHistoryRows(stage)
    assert.equal(rows.length, 1, "the run's own history chip rides the restored face")
    assert.equal(rows[0]!.runId, "run-87986cb0fc0d")
    assert.equal(rows[0]!.video, history[0]!.video)
  })
})

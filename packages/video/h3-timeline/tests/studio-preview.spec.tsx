/**
 * StudioPreview — preview pane (BEHAVIORAL).
 *
 * PINS (NLE order, ONE hero): the header names the state (filling /
 * last run / never run); run history chips link prior finals; the
 * final cut plays alone (windows are mid-run evidence only); window
 * tiles number themselves; emptiness owns an EmptyState.
 */
import { describe, it } from "vitest"
import assert from "node:assert/strict"
import { render, screen } from "@testing-library/react"
import { StudioPreview } from "../src/ui/studio/StudioPreview.tsx"

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

describe("the header names the state", () => {
  it("filling while running", () => {
    preview({ running: true, filmstrip: { final: null, windows: [{ name: "video_w1_main", url: "https://u/1.mp4" }] } })
    assert.ok(screen.getByTestId("tl-filmstrip").textContent!.includes("filling as the run lands"))
  })

  it("last run when windows wait; never-run when bare", () => {
    const h1 = preview({ filmstrip: { final: null, windows: [{ name: "video_w1_main", url: "https://u/1.mp4" }] } })
    assert.ok(screen.getByTestId("tl-filmstrip").textContent!.includes("from the last run"))
    h1.els.unmount()
    preview()
    assert.ok(screen.getByTestId("tl-filmstrip").textContent!.includes("run compiles the calls"))
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

  it("bare = EmptyState (author, then Run)", () => {
    preview()
    assert.ok(screen.getByText("No render yet — author the calls below, then Run."))
  })
})

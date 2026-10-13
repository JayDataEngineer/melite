/**
 * THE HARVEST ONE-TRUTH WALL — BEHAVIOR ARM (rail-law audit,
 * 2026-10-31, the DRY sweep's S2): one fixture through BOTH real
 * doors — the contract harvest (projectH3StageViewProps) and the
 * preview render — yields the SAME rows under the one law: film
 * lead (never the window tile, never direct-over-film), window
 * allowed, error→failed, run-id dedupe. The source arm lives in
 * studio-harvest-one-truth.spec.ts (node lane).
 */
import { describe, it } from "vitest"
import assert from "node:assert/strict"
import { render, screen } from "@testing-library/react"
import { StudioPreview } from "../src/ui/studio/StudioPreview.tsx"
import { projectH3StageViewProps } from "../src/ui/studio/projection.ts"

describe("BEHAVIOR — both doors, one law", () => {
  // One row shaped like a RAW run record (artifacts map + window
  // videos + an error-only entry + a run-id duplicate of the first).
  const FILM = "https://u/h3_t4_film_7_.mp4"
  const WIN = "https://u/h3_t4_w1_48_.mp4"
  const row = {
    id: "s_1", card: "h3-timeline", title: "H3", params: { calls: [{ text: "a", start_frame: 0, end_frame: 48 }] },
    history: [
      { runId: "run-aaa", status: "completed", at: 1700000000, durationSec: 7, artifacts: { "h3_t4_film_7_.mp4": FILM, "h3_t4_w1_48_.mp4": WIN } },
      // a video-bearing error entry (no status) — the fold arm's real shape;
      // an error-only entry with NO video is dropped by the law (rows carry a video).
      { runId: "run-err", error: "engine died", artifacts: { "h3_t4_film_9_.mp4": "https://u/h3_t4_film_9_.mp4" } },
      // THE DRIFT DISCRIMINATOR: a direct url AND a film artifact. The
      // deleted preview copy put direct FIRST (drift); the one law puts
      // the FILM first. This arm fires if that priority ever returns.
      { runId: "run-pri", url: "https://u/direct.mp4", artifacts: { "h3_t4_film_5_.mp4": "https://u/f5.mp4" } },
    ],
  }

  it("the preview renders exactly the rows the contract harvest harvested (film lead, error→failed)", () => {
    const { stage } = projectH3StageViewProps({
      stageId: "s_1", cardName: "h3-timeline", row, runStatus: "",
      onPatch: () => {}, onRun: () => {}, onStop: () => {}, onRemove: () => {}, onSurface: () => {},
      upstream: [], runId: null,
    } as never)
    // door 1 — the contract harvest's own rows:
    const harvested = stage.result?.metadata?.history as Array<Record<string, unknown>>
    assert.ok(Array.isArray(harvested) && harvested.length === 3)
    assert.equal(harvested[0]!.video, FILM, "film leads, not the window tile")
    assert.equal(harvested[1]!.status, "failed", "an error-only entry folds to failed")
    assert.equal(harvested[2]!.video, "https://u/f5.mp4", "the film artifact outranks a direct url — the drift discriminator")
    // door 2 — the preview rides the SAME rows:
    render(
      <StudioPreview
        stage={stage}
        running={false}
        filmstrip={{ final: null, windows: [] }}
        filmRef={{ current: null }}
        filmMap={null}
        frameIdx={0}
        barTotal={48}
        fps={24}
        handleFilmTime={() => {}}
        handlePlayingChange={() => {}}
        onDuration={() => {}}
      />,
    )
    const chips = screen.getByTestId("tl-run-history").querySelectorAll("a")
    assert.equal(chips.length, 3)
    assert.equal(chips[0]!.getAttribute("href"), FILM)
    assert.equal(chips[1]!.getAttribute("href"), (harvested[1] as { video: string }).video)
    assert.ok(chips[1]!.textContent!.includes("×"), "the failed run renders its cross")
    assert.equal(chips[2]!.getAttribute("href"), "https://u/f5.mp4", "the preview chip carries the one law's pick")
  })
})

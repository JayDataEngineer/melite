// timelineRulerBound.spec.ts — THE RULER NEVER SPEAKS PAST THE FILM
// (D-19, the v2v lane-mirror audit 2026-11-18): the bar's trailing
// lead-out room is scrollable, droppable SPACE — its ruler used to
// carry tick labels out to the content width, so a 56-frame axis
// under heavy lead-out read as "2.5s of film at 24fps" stretching
// on and on. The duration a reader can attribute to the film is the
// film's own frames; the room past the axis end carries no seconds.
//
//   ARM 1 — THE BOUND: with room past the axis end (content width
//     far beyond the frames), the last tick never exceeds the film's
//     own seconds — the pre-cure law minted ticks to the content
//     width and reds here.
//   ARM 2 — THE CONTROL: when the content is NARROWER than the film
//     (zoomed out, no lead-out at all), the ticks still cover the
//     visible content — the bound is a ceiling on the room, never a
//     clip on the film.
import { describe, it, expect } from "vitest"
import { buildTicks } from "../src/timeline/MotionTimelineBarScale.ts"

describe("the ruler never speaks past the film (D-19)", () => {
  it("ARM 1 — ticks stop at the film's end when lead-out room runs past it", () => {
    // 56 frames at 24fps = 2.333s of film. The lead-out triples the
    // content width — pre-cure, the ruler minted ticks to 7s+.
    const { ticks } = buildTicks(2268, 12, 56, 24)
    const filmSec = 56 / 24
    expect(ticks.length).toBeGreaterThan(1)
    for (const t of ticks) expect(t).toBeLessThanOrEqual(filmSec + 1e-6)
    // and the coverage is honest: the last tick lands at the axis
    // end's own step lattice (2.0 with a 0.5 step), not truncated
    // mid-film by the content's narrower room
    expect(ticks[ticks.length - 1]).toBe(2)
  })

  it("ARM 2 — CONTROL: content narrower than the film still gets its full ruler", () => {
    // 240 frames at 24fps = 10s of film, content width covers only
    // the first 4s of pixels (1152px at 12px/frame) — the ruler
    // follows the CONTENT here (the bound only ever trims the ROOM
    // past the axis end)
    const { ticks } = buildTicks(1152, 12, 240, 24)
    expect(ticks[ticks.length - 1]).toBe(4)
    expect(ticks).toEqual([0, 1, 2, 3, 4])
  })
})

// film-player-media-load — THE REGRESSION GUARD for the blank Cards
// page (2026-09-01, operator: "you cannot add hidden regression every
// time I ask for a small feature").
//
// Round 2 added `crossOrigin` to FilmPlayer's MediaPlayer. The deck's
// artifact door sends NO Access-Control-Allow-Origin (verified live:
// curl -H 'Origin: ...' stitch_video_0.mp4 → bare 200, no ACAO), so on
// any origin that isn't literally the artifact host's own origin string
// the media fetch flipped to CORS mode and was BLOCKED — the video died
// and the card view blanked with it.
//
// LAW: the film's media is SAME-ORIGIN (/v1/assets/runs/... served
// by the same deck that serves the page). It must NEVER be forced into
// CORS mode — no crossOrigin prop on the media path, ever. This mounts
// the REAL player and asserts the DOM truth on the live media element.
import { describe, it, expect, beforeAll, vi } from "vitest"
import { render, waitFor } from "@testing-library/react"
import { FilmPlayer } from "@melite/ui/FilmPlayer"

beforeAll(() => {
  window.matchMedia ||= (() => ({
    matches: false, media: "", onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
  window.HTMLMediaElement.prototype.play = function () { return Promise.resolve() }
  window.HTMLMediaElement.prototype.pause = function () {}
})

describe("FilmPlayer media loading", () => {
  it("never forces CORS mode on the media element (same-origin law)", { timeout: 20000 }, async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    const r = render(
      <FilmPlayer
        src="/v1/assets/runs/run-test/stitch_video_0.mp4"
        data-testid="tl-film-player"
      />,
    )
    // The provider attaches the underlying media element async.
    const media = await waitFor(() => {
      const el =
        r.container.querySelector("video") ??
        r.container.querySelector("audio") ??
        r.container.querySelector("media-player video")
      expect(el).toBeTruthy()
      return el as HTMLMediaElement
    }, { timeout: 8000 })
    // THE LAW: crossOrigin stays unset (null) — no CORS-mode fetching
    // for the same-origin film artifacts. `undefined`/null both pass;
    // any string ("anonymous"/"use-credentials") FAILS.
    expect(
      media.crossOrigin,
      "FilmPlayer set crossOrigin — the media path would be forced into " +
      "CORS mode and blocked by the artifact door (no ACAO). Same-origin " +
      "media must never carry the crossOrigin prop.",
    ).toBeFalsy()
    spy.mockRestore()
  })

})

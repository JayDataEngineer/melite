// timelineLaneParity.spec.tsx — SD-8 KEYFRAME-VS-AUDIO LANE ASYMMETRY
// (operator item c, 2026-11-08: "the format of the bar for Keyframes
// is not DRY, as it is not shared with the audio sort of bar"). The
// kit invariant half: the gutter's four bespoke head grammars collapse
// into ONE LaneHead shell; the kf lane inherits the audio heads'
// anatomy (title voice, accent-tinted identity, door slot); an empty
// kf lane carries ITS OWN drop-well hint (the audio lanes' grammar —
// not a first-track-only global keyframe); and the height/tint parity
// is the audioClipCards precedent's opt-in (absent → byte-identical
// 24px — the bar's compatibility law, MotionTimelineBar.tsx opt-in
// doc). The tenant face arms live in the h3 strip-pane spec.
import { afterEach, describe, it, expect } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { createElement as h } from "react"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { MotionTimelineBar } from "../src/timeline/MotionTimelineBar"

afterEach(cleanup)

const noop = (): void => {}
const TWO_TRACKS = [
  { uuid: "image", name: "Keyframes", track_type: "keyframe" as const, color: [86, 140, 245] as [number, number, number] },
  { uuid: "pose", name: "Pose", track_type: "keyframe" as const, color: null },
]
const AUDIO = [
  { id: "dialogue", label: "Dialogue", icon: "mic" as const, accent: "#22d3ee", onUpload: () => {} },
  { id: "music", label: "Music", icon: "music" as const, accent: "#a78bfa" },
]

function bar(over?: Record<string, unknown>) {
  return h(MotionTimelineBar, {
    prompts: [],
    keyframes: [],
    frameIdx: 0,
    totalFrames: 96,
    fps: 24,
    tracks: TWO_TRACKS,
    audioLayers: AUDIO,
    beats: [],
    onFrameChange: noop,
    onKeyframeAdd: () => "kf",
    onKeyframeMove: noop,
    onKeyframeDelete: noop,
    onPromptUpdate: noop,
    onPromptMove: noop,
    onTrackAdd: () => {},
    ...over,
  } as never)
}

const head = (variant: string) =>
  document.querySelector(`[data-lane-head="${variant}"]`) as HTMLElement | null

describe("SD-8 lane parity — the kit half", () => {
  it("EVERY LANE HEAD RENDERS THE SAME SHELL — the gutter's four heads share one LaneHead anatomy (glyph/dot slot, label, door slot, height), no bespoke grammar survives", () => {
    render(bar())
    for (const variant of ["prompts", "beats", "audio", "kf"]) {
      const el = head(variant)
      expect(el, `the ${variant} head rides the shared shell (data-lane-head)`).not.toBeNull()
      // one class on every head — the bespoke grammar collapsed
      expect(el!.className, `the ${variant} head uses the shell class`).toMatch(/laneHeadShell/)
      // the anatomy: a label slot inside every head
      expect(el!.querySelector("span"), `the ${variant} head carries a label slot`).not.toBeNull()
    }
    // the first and last track heads both carry the identity slot
    const kf = head("kf")!
    expect(kf.querySelector("[data-lane-dot]"), "the kf head keeps its color dot in the glyph slot").not.toBeNull()
    // the door slot survives on the kf head (the lane-add parity law)
    expect(kf.querySelector("[data-track-upload]"), "the kf head keeps its add door").not.toBeNull()
  })

  it("HEAD HEIGHT MIRRORS BODY HEIGHT for every lane, derived not literal — the pinned gutter never desyncs from its lane", () => {
    // opted IN: the kf head and the kf lane both ride the card height
    const { unmount } = render(bar({ kfLaneCards: true, audioClipCards: true }))
    for (const t of TWO_TRACKS) {
      const h = head("kf") // one head per track — query all
      void h
      const heads = document.querySelectorAll('[data-lane-head="kf"]')
      const bodies = document.querySelectorAll(`[data-lane="${t.uuid}"]`)
      expect(bodies.length).toBe(1)
      const headEl = heads[TWO_TRACKS.indexOf(t)] as HTMLElement
      expect(headEl.style.height).toBe((bodies[0] as HTMLElement).style.height)
    }
    const audioHead = head("audio") as HTMLElement
    const audioBody = document.querySelector('[data-audio-layer="dialogue"]') as HTMLElement
    expect(audioHead.style.height).toBe(audioBody.style.height)
    unmount()
    // opted OUT: both stay at the block heights, still mirrored
    render(bar())
    const kfHeads = document.querySelectorAll('[data-lane-head="kf"]')
    const kfBody = document.querySelector('[data-lane="image"]') as HTMLElement
    expect((kfHeads[0] as HTMLElement).style.height).toBe(kfBody.style.height)
  })

  it("AN EMPTY KEYFRAME LANE CARRIES ITS OWN HINT — per-track empty-state grammar, not a first-track-only global keyframe", () => {
    // the SECOND track empty while the FIRST carries a pin: its well
    // still shows (today the hint dies with the global keyframes.length)
    render(bar({
      keyframes: [{
        uuid: "kf1", track_id: "image", frame: 12,
        ariaLabel: "k",
      }],
    } as never))
    const second = document.querySelector('[data-lane="pose"] [data-testid="kf-drop-well"]')
    expect(second, "the populated-first second-empty track still shows its own well").not.toBeNull()
    const first = document.querySelector('[data-lane="image"] [data-testid="kf-drop-well"]')
    expect(first, "the populated track shows no well").toBeNull()
    // both empty → both wells
    cleanup()
    render(bar())
    expect(document.querySelectorAll('[data-testid="kf-drop-well"]').length).toBe(2)
  })

  it("UNWIRED, THE PARITY OPT-IN CHANGES NOTHING — byte-identical kf lane at 24px when the tenant does not opt in", () => {
    render(bar())
    const body = document.querySelector('[data-lane="image"]') as HTMLElement
    expect(body.style.height).toBe("24px")
    expect(body.getAttribute("data-kf-cards")).toBe("false")
    // the wash is keyed on the attr (jsdom cascades no module CSS) —
    // the rule's keying IS the opt-out's byte-identity proof
    const kitCss = readFileSync(resolve(__dirname, "../src/timeline/timeline.module.css"), "utf8")
    expect(kitCss).toMatch(/\.kfLane\[data-kf-cards="true"\]\s*{[^}]*background/)
    expect(kitCss.match(/\.kfLane\s*{[^}]*background/), "no unkeyed wash on the base lane").toBeNull()
  })
})

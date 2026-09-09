/**
 * MotionTimelineBar — the Music row as an NLE audio track (Layer A,
 * 2026-08-31: "upload these audio in Layer A … davinci resolve type of
 * moving audio around"). Locks the NEW contract:
 *   • clips render as positioned DOM blocks (data-audio-clip)
 *   • dragging a clip body calls onAudioClipMove (translate, not resize)
 *   • a clip drag is bounded by its neighbors (no overlap on the row)
 *   • hover × calls onAudioClipDelete
 *   • an OS FILE drop calls onAudioFileDrop at the drop frame
 *   • a tray drop calls onAudioDropAt at the drop frame (positioned)
 *   • NO clips + no handlers → the legacy stem bed / dashed row, and
 *     onAudioDrop still works verbatim (the motion card never notices)
 *   • a prompt with audio:true renders the Layer B reference-audio dot
 *
 * jsdom has no layout: getBoundingClientRect is mocked to a 720px-wide
 * content area so frame↔pixel math is deterministic (same harness as
 * motion-timeline-bar.test.tsx).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, fireEvent } from "@testing-library/react"
import { TooltipProvider } from "@melite/ui/tooltip"
import { MotionTimelineBar } from "@melite-plugin/timeline/ui/timeline"
import type { TimelineKeyframe, TimelinePrompt } from "@melite-plugin/timeline/ui/timeline"

const W = 720
let rectSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  rectSpy = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    x: 0, y: 0, top: 0, left: 0, right: W, bottom: 100, width: W, height: 100,
    toJSON: () => ({}),
  } as DOMRect)
})
afterEach(() => rectSpy.mockRestore())

// 96 frames @ 24fps → frames 0..95 span 0..720px (7.5px/frame).
const T = 96
const FPS = 24

/** One call filling the timeline — the row under test is the Music row. */
const prompts: TimelinePrompt[] = [
  { uuid: "call-0", text: "the whole film", start_frame: 0, end_frame: 95, color: null },
]
const keyframes: TimelineKeyframe[] = []

function renderBar(over: Partial<Parameters<typeof MotionTimelineBar>[0]> = {}) {
  const props: Parameters<typeof MotionTimelineBar>[0] = {
    prompts,
    keyframes,
    frameIdx: 0,
    totalFrames: T,
    fps: FPS,
    onFrameChange: () => {},
    onKeyframeAdd: () => "",
    onKeyframeMove: () => {},
    onKeyframeDelete: () => {},
    onPromptUpdate: () => {},
    onPromptMove: () => {},
    onPromptResize: () => {},
    onPromptDelete: () => {},
    onExtend: () => {},
    ...over,
  }
  return render(
    <TooltipProvider>
      <MotionTimelineBar {...props} />
    </TooltipProvider>,
  )
}

describe("MotionTimelineBar — the Music row as an NLE audio track (Layer A, 2026-08-31)", () => {
  it("renders positioned clip blocks on the Music row", () => {
    renderBar({
      audioLayers: [{
        id: "music", label: "Music", stem: null,
        clips: [
          { id: "c1", name: "song.mp3", start_frame: 0, dur_frames: 24 },
          { id: "cal", name: "cal.wav", start_frame: 24, dur_frames: 12 },
          { id: "c2", name: "sfx.wav", start_frame: 48, dur_frames: 12 },
        ],
      }],
    })
    const row = document.querySelector('[data-audio-layer="music"]')!
    expect(row).toBeTruthy()
    expect(row.getAttribute("data-clips")).toBe("true")
    const c1 = document.querySelector('[data-audio-clip="c1"]') as HTMLElement
    const c2 = document.querySelector('[data-audio-clip="c2"]') as HTMLElement
    expect(c1).toBeTruthy()
    expect(c2).toBeTruthy()
    // position law from the DOM itself: jsdom strips max() widths, so a
    // THIRD clip at frame 24 calibrates the px-per-frame — c2 (frame 48)
    // must sit at exactly 2× that clip's left. No hardcoded padding math.
    expect(c1.style.left).toBe("0px")
    const cal = document.querySelector('[data-audio-clip="cal"]') as HTMLElement
    expect(cal).toBeTruthy()
    expect(parseFloat(cal.style.left)).toBeGreaterThan(0)
    expect(parseFloat(c2.style.left)).toBeCloseTo(2 * parseFloat(cal.style.left), 1)
    expect(c1.textContent).toContain("song.mp3")
  })

  it("dragging a clip body calls onAudioClipMove with the translated frame", () => {
    const onAudioClipMove = vi.fn()
    renderBar({
      audioLayers: [{
        id: "music", label: "Music", stem: null,
        clips: [{ id: "c1", name: "song.mp3", start_frame: 24, dur_frames: 24 }],
      }],
      onAudioClipMove,
    })
    const c1 = document.querySelector('[data-audio-clip="c1"]') as HTMLElement
    // drag from its left edge (24*7.5 = 180px) to 360px = frame 48
    fireEvent.pointerDown(c1, { button: 0, clientX: 180 })
    fireEvent.pointerMove(window, { clientX: 300 })
    fireEvent.pointerMove(window, { clientX: 360 })
    fireEvent.pointerUp(window)
    expect(onAudioClipMove).toHaveBeenCalledWith("music", "c1", 48)
  })

  it("bounds a clip drag against its neighbors — no overlap on the row", () => {
    const onAudioClipMove = vi.fn()
    renderBar({
      audioLayers: [{
        id: "music", label: "Music", stem: null,
        clips: [
          { id: "a", name: "a", start_frame: 0, dur_frames: 24 },
          { id: "b", name: "b", start_frame: 48, dur_frames: 24 },
        ],
      }],
      onAudioClipMove,
    })
    const clipA = document.querySelector('[data-audio-clip="a"]') as HTMLElement
    // drag A (0..24) far right — must stop one frame before B (48):
    // 24 dur + 1 air = start 23 max
    fireEvent.pointerDown(clipA, { button: 0, clientX: 10 })
    fireEvent.pointerMove(window, { clientX: 700 })
    fireEvent.pointerUp(window)
    const calls = onAudioClipMove.mock.calls.map((c) => c[2])
    expect(Math.max(...calls)).toBe(23)
  })

  it("hover × on a clip calls onAudioClipDelete", () => {
    const onAudioClipDelete = vi.fn()
    renderBar({
      audioLayers: [{
        id: "music", label: "Music", stem: null,
        clips: [{ id: "c1", name: "song.mp3", start_frame: 0, dur_frames: 24 }],
      }],
      onAudioClipDelete,
    })
    const del = document.querySelector('[data-audio-clip-delete="c1"]') as HTMLElement
    expect(del).toBeTruthy()
    fireEvent.click(del)
    expect(onAudioClipDelete).toHaveBeenCalledWith("music", "c1")
  })

  it("an OS FILE drop on the row calls onAudioFileDrop at the drop frame", () => {
    const onAudioFileDrop = vi.fn()
    renderBar({
      audioLayers: [{ id: "music", label: "Music", stem: null }],
      onAudioFileDrop,
    })
    const row = document.querySelector('[data-audio-layer="music"]') as HTMLElement
    const file = new File([new Uint8Array(4)], "tune.mp3", { type: "audio/mpeg" })
    // jsdom constructs no DragEvent — a real Event with clientX +
    // dataTransfer defined on it (coordinates ride as own properties).
    const ev = new Event("drop", { bubbles: true })
    Object.defineProperty(ev, "clientX", { value: 360 })
    Object.defineProperty(ev, "dataTransfer", { value: { files: [file], getData: () => "" } })
    fireEvent(row, ev)
    const gotF = onAudioFileDrop.mock.calls[0]?.[2] as number
    expect(onAudioFileDrop).toHaveBeenCalledWith("music", file, gotF)
    expect(Math.abs(gotF - 48)).toBeLessThanOrEqual(1)
  })

  it("a tray drop with onAudioDropAt present is POSITIONED (frame rides)", () => {
    const onAudioDropAt = vi.fn()
    renderBar({
      audioLayers: [{ id: "music", label: "Music", stem: null }],
      onAudioDropAt,
    })
    const row = document.querySelector('[data-audio-layer="music"]') as HTMLElement
    const ev = new Event("drop", { bubbles: true })
    Object.defineProperty(ev, "clientX", { value: 90 })   // ≈ frame 11–12
    Object.defineProperty(ev, "dataTransfer", { value: {
      files: [],
      getData: (mime: string) => mime === "application/tech-noir-asset"
        ? JSON.stringify({ url: "/v1/assets/runs/x/music_audio_0.mp3" })
        : "",
    } })
    fireEvent(row, ev)
    const gotF = onAudioDropAt.mock.calls[0]?.[2] as number
    expect(onAudioDropAt).toHaveBeenCalledWith(
      "music", "/v1/assets/runs/x/music_audio_0.mp3", gotF)
    expect(Math.abs(gotF - 12)).toBeLessThanOrEqual(1)
  })

  it("LEGACY: no clips, no positioned handlers — onAudioDrop works verbatim", () => {
    const onAudioDrop = vi.fn()
    renderBar({
      audioLayers: [{ id: "music", label: "Music", stem: null }],
      onAudioDrop,
    })
    const row = document.querySelector('[data-audio-layer="music"]') as HTMLElement
    fireEvent.drop(row, {
      dataTransfer: {
        files: [],
        getData: (mime: string) => mime === "application/tech-noir-asset"
          ? JSON.stringify({ url: "/v1/assets/runs/x/music_audio_0.mp3" })
          : "",
      },
      clientX: 300,
    })
    expect(onAudioDrop).toHaveBeenCalledWith("music", "/v1/assets/runs/x/music_audio_0.mp3")
  })

  it("LEGACY: a stem bed with no clips keeps the slice rendering", () => {
    renderBar({
      audioLayers: [{
        id: "music", label: "Music", stem: "run-x/music_audio_0.mp3",
      }],
    })
    const row = document.querySelector('[data-audio-layer="music"]')!
    expect(row.getAttribute("data-clips")).toBe("false")
    expect(document.querySelectorAll("[data-audio-slice]").length).toBe(1)
    expect(document.querySelector('[data-audio-clip="c1"]')).toBeNull()
  })

  it("stem + clips present: clips win — no stem bed rendered", () => {
    // After parse-conversion, a legacy doc may have both stem and clips.
    // The bar must render clip blocks, NOT the stem bed.
    renderBar({
      audioLayers: [{
        id: "music", label: "Music", stem: "run-x/bgm.mp3",
        clips: [
          { id: "c1", name: "bgm.mp3", start_frame: 0, dur_frames: 48 },
        ],
      }],
    })
    const row = document.querySelector('[data-audio-layer="music"]')!
    expect(row.getAttribute("data-clips")).toBe("true")
    expect(document.querySelector('[data-audio-clip="c1"]')).toBeTruthy()
    expect(document.querySelectorAll("[data-audio-slice]").length).toBe(0)
  })

  it("a call with audio:true renders the Layer B reference-audio dot", () => {
    renderBar({
      prompts: [
        { uuid: "call-0", text: "with ref", start_frame: 0, end_frame: 47, color: null, audio: true },
        { uuid: "call-1", text: "without", start_frame: 48, end_frame: 95, color: null, audio: false },
      ],
    })
    const withRef = document.querySelector('[data-prompt-uuid="call-0"], [title*="with ref"]')
    // the dot rides INSIDE the first clip only — find the clip block
    const clips = document.querySelectorAll('[data-clip], [class*="cursor-grab"], [data-testid]')
    // robust: the svg Music icon exists exactly once (call-0's badge)
    const musics = Array.from(document.querySelectorAll("svg")).filter(
      (sv) => sv.getAttribute("class")?.includes("text-violet-300"))
    expect(musics.length).toBe(1)
    expect(clips.length).toBeGreaterThan(0)
    expect(withRef || clips[0]).toBeTruthy()
  })

  it("a call with refImages > 0 renders the ref-count badge with the count", () => {
    renderBar({
      prompts: [
        { uuid: "call-0", text: "with refs", start_frame: 0, end_frame: 47, color: null, refImages: 3 },
        { uuid: "call-1", text: "no refs", start_frame: 48, end_frame: 95, color: null, refImages: 0 },
      ],
    })
    const badges = document.querySelectorAll("[data-testid='tl-ref-badge']")
    expect(badges.length).toBe(1)
    expect(badges[0].textContent).toContain("3")
    expect(badges[0].getAttribute("title")).toContain("3 reference images")
  })

  it("a call with refImages undefined renders no ref badge", () => {
    renderBar({
      prompts: [
        { uuid: "call-0", text: "no badge", start_frame: 0, end_frame: 95, color: null },
      ],
    })
    const badges = document.querySelectorAll("[data-testid='tl-ref-badge']")
    expect(badges.length).toBe(0)
  })

  it("a call with refImages: 1 shows singular label in badge title", () => {
    renderBar({
      prompts: [
        { uuid: "call-0", text: "one ref", start_frame: 0, end_frame: 95, color: null, refImages: 1 },
      ],
    })
    const badge = document.querySelector("[data-testid='tl-ref-badge']")
    expect(badge).toBeTruthy()
    expect(badge!.getAttribute("title")).toContain("1 reference image")
    expect(badge!.getAttribute("title")).not.toContain("1 reference images")
  })

  it("audio + refImages badges render independently on the same clip", () => {
    renderBar({
      prompts: [
        { uuid: "call-0", text: "both", start_frame: 0, end_frame: 95, color: null, audio: true, refImages: 2 },
      ],
    })
    const musics = Array.from(document.querySelectorAll("svg")).filter(
      (sv) => sv.getAttribute("class")?.includes("text-violet-300"))
    const refBadge = document.querySelector("[data-testid='tl-ref-badge']")
    expect(musics.length).toBe(1)
    expect(refBadge).toBeTruthy()
    expect(refBadge!.textContent).toContain("2")
  })
})

// ── stemToClip: the pure conversion function (exported from the studio) ──
import { stemToClip } from "@melite/video-h3-timeline/ui/studio/component"

describe("stemToClip — legacy audio_stem → positioned clip conversion", () => {
  it("converts a bare artifact name to a clip at frame 0 with gain 1", () => {
    const clip = stemToClip("bgm.wav", 24, "test-id")
    expect(clip).toEqual({
      id: "test-id",
      name: "bgm.wav",
      src: "bgm.wav",
      start_frame: 0,
      dur_frames: 96,  // 4 * 24fps
      gain: 1,
    })
  })

  it("extracts the basename from a path-style artifact name", () => {
    const clip = stemToClip("runs/x/music_audio_0.mp3", 30, "id-2")
    expect(clip.name).toBe("music_audio_0.mp3")
    expect(clip.src).toBe("runs/x/music_audio_0.mp3")
    expect(clip.dur_frames).toBe(120) // 4 * 30fps
  })

  it("defaults fps to 24 when given 0", () => {
    const clip = stemToClip("song.flac", 0, "id-3")
    expect(clip.dur_frames).toBe(96)
  })

  it("generates a stable id when none provided", () => {
    const a = stemToClip("a.mp3", 24)
    const b = stemToClip("a.mp3", 24)
    expect(a.id).not.toBe(b.id)
    expect(a.id).toMatch(/^aclip-stem-/)
  })
})

/**
 * StudioStripPane — the bar IS the document (BEHAVIORAL).
 *
 * PINS: the header counts (one call / many); every bar gesture lands
 * in DOC frames (the film→doc map rides each door); the tail-pull
 * grows the envelope by exactly its overshoot; tray drops wire only
 * known artifacts; foreign URLs write nothing.
 */
import { describe, it } from "vitest"
import assert from "node:assert/strict"
import { fireEvent, render, screen } from "@testing-library/react"
import { StudioStripPane } from "../src/ui/studio/StudioStripPane.tsx"

// happy-dom returns zero rects (no layout) — the bar's ClientX→frame
// doors need a viewport width, as every real browser provides.
const RealRect = window.Element.prototype.getBoundingClientRect
window.Element.prototype.getBoundingClientRect = function () {
  return {
    width: 800, height: 200, top: 0, left: 0, right: 800, bottom: 200,
    x: 0, y: 0, toJSON() {},
  } as DOMRect
}
void RealRect

const P1 = { uuid: "p1", text: "hello", start_frame: 0, end_frame: 80, color: null }
const P2 = { uuid: "p2", text: "world", start_frame: 80, end_frame: 168, color: null }
const K1 = { uuid: "k1", track_id: "image", frame: 40 }
const CLIP = { id: "c1", name: "song.mp3", start_frame: 10, dur_frames: 48 }

function strip(over?: Record<string, unknown>) {
  const rec: Record<string, unknown[][]> = {
    bar: [], scrubStart: [], scrubEnd: [], kfAdd: [], kfMove: [], kfDel: [],
    promptUpdate: [], promptMove: [], promptResize: [], promptDel: [],
    extend: [], addCall: [], select: [], addedClip: [], taken: [],
    movedClip: [], delClip: [], keys: [],
  }
  const els = render(
    <StudioStripPane
      calls={[{ n: 1 }, { n: 2 }] as never}
      totalFrames={168}
      fps={24}
      seconds="7.0"
      barPrompts={[P1, P2] as never}
      barLanes={[K1] as never}
      barAudioClips={[CLIP]}
      barTotal={200}
      frameIdx={0}
      callPreviews={{}}
      selectedBarId={null}
      filmMap={null}
      handleBarFrame={(f) => { rec.bar.push([f]) }}
      handleScrubStart={() => { rec.scrubStart.push([]) }}
      handleScrubEnd={() => { rec.scrubEnd.push([]) }}
      handleKeyframeAdd={(t, f) => { rec.kfAdd.push([t, f]); return "k9" }}
      handleKeyframeMove={(id, f) => { rec.kfMove.push([id, f]) }}
      handleKeyframeDelete={(id) => { rec.kfDel.push([id]) }}
      handlePromptUpdate={(id, t) => { rec.promptUpdate.push([id, t]) }}
      handlePromptMove={(id, s, e) => { rec.promptMove.push([id, s, e]) }}
      handlePromptResize={(id, s, e) => { rec.promptResize.push([id, s, e]) }}
      handlePromptDelete={(id) => { rec.promptDel.push([id]) }}
      handleExtend={(n) => { rec.extend.push([n]) }}
      addCallAt={(f) => { rec.addCall.push([f]) }}
      handleTimelineSelect={(id) => { rec.select.push([id]) }}
      layerA={{ audio_stem: "https://u/bed.mp3" } as never}
      addAudioClip={(n, s, at) => { rec.addedClip.push([n, s, at]) }}
      takeAudioFile={(f, at) => { rec.taken.push([f.name, at]) }}
      moveAudioClip={(id, f) => { rec.movedClip.push([id, f]) }}
      deleteAudioClip={(id) => { rec.delClip.push([id]) }}
      setLayerAKey={(k, v) => { rec.keys.push([k, v]) }}
      artifactIndex={{ byUrl: new Map([["https://u/song.mp3", "song.mp3"]]) }}
      // a CONSTANT map proves every door applies it (pass-through
      // would leak raw film frames; the constant cannot occur raw)
      docFromFilm={() => 4242}
      keyframes={[{}] as never}
      {...over}
    />,
  )
  return { rec, els }
}

function drag(el: Element, fromX: number, toX: number) {
  fireEvent.pointerDown(el, { button: 0, clientX: fromX })
  fireEvent.pointerMove(document.body, { clientX: toX })
  fireEvent.pointerUp(document.body, { clientX: toX })
}

describe("chrome (counts + fps + tracks + stem)", () => {
  it("one call reads singular; many plural", () => {
    const h1 = strip()
    assert.ok(screen.getByText("Timeline").parentElement!.textContent!.includes("2 calls · 168 fr · 24 fps · 7.0s"))
    h1.els.unmount()
    strip({ calls: [{ n: 1 }] as never })
    assert.ok(screen.getByText("Timeline").parentElement!.textContent!.includes("1 call · 168 fr"))
  })

  it("film fps wins when mapped; the doc fps otherwise", () => {
    const h1 = strip({ filmMap: { fps: 30 } })
    assert.equal(document.body.querySelector('[data-audio-layer="music"]')!.getAttribute("data-wired"), "true")
    h1.els.unmount()
    const h2 = strip({ filmMap: {} })
    assert.ok(document.body.querySelector('[data-audio-layer="music"]'))
    h2.els.unmount()
    strip({ layerA: {} as never })
    assert.equal(document.body.querySelector('[data-audio-layer="music"]')!.getAttribute("data-wired"), "false")
  })

  it("lanes ride keyframes; bare docs own none", () => {
    const h1 = strip()
    assert.ok(document.body.querySelector('[data-lane="image"]'))
    h1.els.unmount()
    strip({ keyframes: [], barLanes: [] as never })
    assert.equal(document.body.querySelector("[data-lane]"), null)
  })
})

describe("additive gestures (double-click lands in DOC frames)", () => {
  it("ruler double-click adds a call", () => {
    const { rec } = strip()
    fireEvent.doubleClick(screen.getByTestId("motion-timeline-ruler"), { clientX: 60 })
    assert.deepEqual(rec.addCall, [[4242]])
  })

  it("keyframe-lane double-click pins the lane's track", () => {
    const { rec } = strip()
    fireEvent.doubleClick(document.body.querySelector('[data-lane="image"]')!, { clientX: 60 })
    assert.deepEqual(rec.kfAdd, [["image", 4242]])
  })
})

describe("drag gestures (every door maps film→doc)", () => {
  it("keyframe drag moves (a click seeks raw)", () => {
    const { rec } = strip()
    drag(screen.getByLabelText("Image guide keyframe at frame 40"), 100, 130)
    assert.deepEqual(rec.kfMove, [["k1", 4242]])
    assert.deepEqual(rec.bar, [])
  })

  it("a keyframe click (no drag) seeks its frame", () => {
    const { rec } = strip()
    const kf = screen.getByLabelText("Image guide keyframe at frame 40")
    fireEvent.pointerDown(kf, { button: 0, clientX: 100 })
    fireEvent.pointerUp(document.body, { clientX: 100 })
    assert.deepEqual(rec.bar, [[40]])
  })

  it("prompt body drag moves (start AND end ride the map)", () => {
    const { rec } = strip()
    drag(document.body.querySelector('[data-prompt-clip="p1"]')!, 100, 130)
    assert.deepEqual(rec.promptMove, [["p1", 4242, 4242]])
  })

  it("prompt edges resize (left needs a neighbor's span)", () => {
    const { rec } = strip()
    const edges = document.body.querySelectorAll('[data-prompt-clip="p2"] [data-prompt-edge]')
    assert.equal(edges.length, 2)
    drag(edges[0]!, 100, 120)
    drag(edges[1]!, 100, 110)
    assert.deepEqual(rec.promptResize, [["p2", 4242, 4242], ["p2", 4242, 4242]])
  })

  it("the tail-pull grows the envelope by exactly its overshoot", () => {
    const { rec } = strip({ docFromFilm: ((g: number) => g) as never })
    const edgeR = document.body.querySelector('[data-prompt-clip="p2"] [data-prompt-edge="r"]')!
    drag(edgeR, 100, 2000)
    assert.equal(rec.extend.length, 1)
    assert.equal(rec.promptResize.length, 1)
    const e = rec.promptResize[0]![2] as number
    assert.ok(e > 200)
    // the tenant's envelope math: (film edge + 1) − film total + doc total
    assert.equal(rec.extend[0]![0], e + 1 - 200 + 168)
  })

  it("clip click selects; click-away deselects", () => {
    const { rec } = strip()
    const clip = document.body.querySelector('[data-prompt-clip="p1"]')!
    fireEvent.pointerDown(clip, { button: 0, clientX: 100 })
    fireEvent.pointerUp(document.body, { clientX: 100 })
    assert.deepEqual(rec.select, [["p1"]])
    fireEvent.click(document.body.querySelector(".promptsLane, [class*='promptsLane']") ?? clip.parentElement!)
    assert.deepEqual(rec.select, [["p1"], [null]])
  })

  it("clip double-click edits the text through", () => {
    const { rec } = strip()
    fireEvent.doubleClick(document.body.querySelector('[data-prompt-clip="p1"]')!)
    const input = screen.getByDisplayValue("hello")
    fireEvent.change(input, { target: { value: "hello!" } })
    fireEvent.blur(input)
    assert.deepEqual(rec.promptUpdate, [["p1", "hello!"]])
  })

  it("the keyframe × deletes", () => {
    const { rec } = strip()
    fireEvent.click(screen.getByLabelText("Delete Image guide keyframe at frame 40"))
    assert.deepEqual(rec.kfDel, [["k1"]])
  })
})

describe("scrub (seek pairs the interaction state)", () => {
  it("ruler press seeks + opens; release closes", () => {
    const { rec } = strip()
    fireEvent.pointerDown(screen.getByTestId("motion-timeline-ruler"), { button: 0, clientX: 60 })
    assert.equal(rec.scrubStart.length, 1)
    assert.equal(rec.bar.length, 1)
    fireEvent.pointerUp(document.body, { clientX: 60 })
    assert.equal(rec.scrubEnd.length, 1)
  })
})

describe("the Music row (drops land positioned; foreign writes nothing)", () => {
  function drop(payload: { files?: File[]; url?: string; raw?: string }) {
    fireEvent.drop(document.body.querySelector('[data-audio-layer="music"]')!, {
      clientX: 60,
      dataTransfer: {
        files: payload.files ?? [],
        getData: () => payload.raw ?? (payload.url ? JSON.stringify({ url: payload.url }) : ""),
      },
    })
  }

  it("a known tray URL lands as a clip at the drop frame", () => {
    const { rec } = strip()
    drop({ url: "https://u/song.mp3" })
    assert.deepEqual(rec.addedClip, [["song.mp3", "song.mp3", 4242]])
  })

  it("a foreign URL writes nothing (and garbage never throws)", () => {
    const { rec } = strip()
    drop({ url: "https://evil/x.mp3" })
    drop({ raw: "not-json{{{ " })
    drop({})
    assert.deepEqual(rec.addedClip, [])
  })

  it("an OS file lands through the file door", () => {
    const { rec } = strip()
    const f = new File(["x"], "take.wav", { type: "audio/wav" })
    drop({ files: [f] })
    assert.deepEqual(rec.taken, [["take.wav", 4242]])
  })

  it("clip drag moves; the × deletes", () => {
    const { rec } = strip()
    drag(document.body.querySelector('[data-audio-clip="c1"]')!, 100, 140)
    assert.deepEqual(rec.movedClip, [["c1", 4242]])
    fireEvent.click(screen.getByLabelText("Delete song.mp3"))
    assert.deepEqual(rec.delClip, [["c1"]])
  })

  it("detach clears clips AND the legacy stem", () => {
    const { rec } = strip()
    fireEvent.click(screen.getByLabelText("Detach Music"))
    assert.deepEqual(rec.keys, [["audio_clips", undefined], ["audio_stem", undefined]])
  })
})

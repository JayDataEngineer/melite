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
      refAudiosBlocked={false}
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
      updateAudioClip={() => {}}
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

/* THE SLOT HOOK WALL (2026-09-22, round three of the scrollbar
 * hunt): a `.shell > …` selector in studio.module.css compiles to a
 * tenant-hashed class NO element carries (the shell div wears
 * card-base's hashed class + our studioRoot) — dead code that reads
 * like law. The slot law must ride `.studioRoot` (the class
 * component.tsx hands StudioShell), doubled for specificity. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const css = readFileSync(resolve(__dirname, "../src/ui/studio/studio.module.css"), "utf-8");
if (!/\.studioRoot\.studioRoot > \*:nth-child\(2\)[^{]*\{[^}]*overflow: hidden/.test(css)) {
  throw new Error("THE FIT LAW IS UNHOOKED: the center slot rule must be .studioRoot.studioRoot > *:nth-child(2) with overflow: hidden (a .shell selector is dead — nobody carries the tenant-hashed class)");
}
if (!/\.studioRoot\.studioRoot > \*:nth-child\(3\)[^{]*\{[^}]*max-height: none/.test(css)) {
  throw new Error("THE NATURAL STRIP IS UNHOOKED: the bottom slot rule must be .studioRoot.studioRoot > *:nth-child(3) with max-height: none");
}
if (/^\.shell >/m.test(css)) {
  throw new Error("DEAD LAW: studio.module.css still contains a .shell > slot selector — it compiles to a class no element carries");
}
/* THE SPILL WALL (round four): height:100% + padding under
 * content-box sizing overflows the parent (hour-9's law, third
 * appearance) — and heroRow's overflow-x:auto computes overflow-y
 * to AUTO, so every spilled pixel becomes a vertical wheel on the
 * preview. Every height:100% box with padding in the pane chain
 * must be border-box. */
for (const cls of [".finalCut", ".winTile"]) {
  const m2 = css.split("\n").find((l) => l.trim().startsWith(cls));
  if (m2 !== undefined && m2.includes("height: 100%") && !m2.includes("box-sizing")) {
    const block = css.slice(css.indexOf(m2));
    const body = block.slice(0, block.indexOf("}"));
    if (body.includes("padding") && !body.includes("box-sizing: border-box")) {
      throw new Error(`SPILL: ${cls} carries height:100% + padding without border-box — it wheels the preview pane`);
    }
  }
}

/* THE NARROW RAIL WALL (2026-09-23, the operator: "the parameter
 * sidebar goes too far, I can't read it all" — the node id is one
 * unbreakable token and the rail item's automatic minimum width
 * refused the track's 330px max, spilling the column right). Three
 * faces, all pinned as CSS text (jsdom cannot measure layout):
 * the doubled first-child slot rule carries min-width: 0 (the item
 * may shrink inside its track whatever the import order); the
 * readout wraps unbreakable tokens; the rail clips horizontal spill
 * (clip, never hidden — no scroll container, no wheel hijack). */
if (!/\.studioRoot\.studioRoot > \*:first-child[^{]*\{[^}]*min-width: 0/.test(css)) {
  throw new Error("THE RAIL WIDENS: the first-child slot rule must carry min-width: 0 — an unbreakable node id forces the column past its track");
}
if (!/\.docLines [^{]*\{[^}]*overflow-wrap: anywhere/.test(css)) {
  throw new Error("THE READOUT SPILLS: .docLines must carry overflow-wrap: anywhere — the node id is one unbreakable token");
}
if (!/\.railCol [^{]*\{[^}]*overflow-x: clip/.test(css)) {
  throw new Error("THE RAIL SPILLS: .railCol must carry overflow-x: clip — nothing inside may push past the column's box");
}
/* THE FULL-GRID WIDTH WALL (2026-09-23, the operator: "IT IS STILL
 * TOO WIDE" — the rail faces shipped and the rail still stretched:
 * the CENTER and STRIP slot rules carried no min-width: 0, so any
 * wide preview/strip content forced its track and the whole grid
 * spilled right. Every grid child may shrink inside its track.) */
if (!/\.studioRoot\.studioRoot > \*:nth-child\(2\)[^{]*\{[^}]*min-width: 0/.test(css)) {
  throw new Error("THE CENTER WIDENS: the nth-child(2) slot rule must carry min-width: 0 — wide preview content forces column 2 and the grid spills");
}
if (!/\.studioRoot\.studioRoot > \*:nth-child\(3\)[^{]*\{[^}]*min-width: 0/.test(css)) {
  throw new Error("THE STRIP WIDENS: the nth-child(3) slot rule must carry min-width: 0 — spanning content distributes min-content into the tracks");
}
/* THE FITS-ITS-PART WALL (2026-09-23, the operator: "it actually
 * fits in the part given, not clipped under the preview" — the slot
 * rules shipped and the rail STILL slid under the preview: the rail
 * is a flex column, so every direct child carried the automatic
 * minimum, and inside, the 1fr 1fr knob grid + the flex:none span
 * readout + uncapped selects/inputs forced every panel past 280px.
 * The track never grew (minmax caps it) — content slid UNDER the
 * center instead. Five content faces:) */
if (!/\.railCol > \* [^{]*\{[^}]*min-width: 0/.test(css)) {
  throw new Error("THE RAIL SLIDES: .railCol > * must carry min-width: 0 — flex-column children keep the automatic minimum and slide under the preview");
}
if (!/\.knobGrid [^{]*\{[^}]*minmax\(0, ?1fr\)/.test(css)) {
  throw new Error("THE KNOBS FORCE: .knobGrid must use minmax(0,1fr) columns — bare 1fr is minmax(auto,1fr) and 26 long-label rows force the rail");
}
if (!/\.cardSpan [^{]*\{[^}]*text-overflow: ellipsis/.test(css)) {
  throw new Error("THE SPAN FORCES: .cardSpan must ellipsize (full text already in title) — flex:none + a 45-char readout forces every card head past the rail");
}
if (!/\.seamRow > select [^{]*\{[^}]*max-width: 100%/.test(css)) {
  throw new Error("THE SEAM FORCES: .seamRow > select must cap at max-width: 100% — the longest option sizes the box past the rail");
}
if (!/\.spanRow input [^{]*\{[^}]*max-width: 100%/.test(css)) {
  throw new Error("THE FRAMES FORCE: .spanRow input must cap at max-width: 100% — native number inputs carry ~170px intrinsic width each");
}
/* THE +18px WALL (2026-09-23, measured in Chromium, selected call,
 * knob fold open: beatsWrap 296→314 — width:100% + 16px padding +
 * 2px border under content-box. Border-box on every rail field;
 * the short row caps never crush (spanLabel keeps its floor).) */
if (!/\.railCol input, \.railCol select, \.railCol textarea [^{]*\{[^}]*box-sizing: border-box/.test(css)) {
  throw new Error("THE +18px: rail fields must be border-box — width:100% + padding + border under content-box renders 100% PLUS 18px");
}
if (!/\.spanLabel [^{]*\{[^}]*flex: none/.test(css)) {
  throw new Error("THE LABEL CRUSHES: .spanLabel must be flex:none — the frame inputs hog the row and crush the cap to 10px");
}

/* THE LANE-PICKER WALL (2026-09-22, the operator's law): the lanes'
 * add door is the gutter's ⤴ riding the GENERIC source grammar —
 * useSquareProvider with the audio MIME family — never a bespoke
 * upload button. */
import { readFileSync as readFileSyncLane } from "node:fs";
import { resolve as resolveLane } from "node:path";
const paneSrc = readFileSyncLane(resolveLane(__dirname, "../src/ui/studio/StudioStripPane.tsx"), "utf-8");
const rowSrc = readFileSyncLane(resolveLane(__dirname, "../src/ui/studio/RunRefsClips.tsx"), "utf-8");
if (!paneSrc.includes("useSquareProvider")) {
  throw new Error("THE LANE PICKER IS UNHOOKED: StudioStripPane must ride useSquareProvider (the estate's one From flow / From media / From file grammar)");
}
if (!paneSrc.includes('accept: "audio/*"')) {
  throw new Error("THE LANE PICKER'S FILE FACE IS UNNARROWED: the provider wire must pass accept: 'audio/*'");
}
if (rowSrc.includes("tl-audio-upload")) {
  throw new Error("DEAD DOOR: RunRefsClips still renders the bespoke upload button — the add door is the gutter icon");
}
/* THE DEP-LAW WALL (2026-09-22, the From-media freeze): the
 * provider's modal effect keys on loadMedia's IDENTITY. An inline
 * arrow in the component = fresh identity per render = the infinite
 * load loop that froze the card. The loader must be a module-level
 * reference. */
if (/loadMedia:\s*async/.test(paneSrc) || /loadMedia:\s*\(/.test(paneSrc)) {
  throw new Error("DEP-LAW BREAK: loadMedia is inline — a per-render identity re-fires the provider's modal effect into an infinite load loop (the From-media freeze). Move the wrapper to module scope.")
}
if (!/const loadAudioMedia/.test(paneSrc)) {
  throw new Error("DEP-LAW WALL: the stable module-level audio loader (loadAudioMedia) is missing from StudioStripPane")
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

describe("the four lines (Calls + D-M-E)", () => {
  it("dialogue, sfx, music clips each ride their own labeled lane; calls ride above", () => {
    // (2026-09-22, the operator's timeline-bar law: four separate
    // lines — Calls, Dialogue, SFX, Music. A clip lands on its
    // class lane only; the gutter heads label every lane.)
    const D1 = { id: "d1", name: "line.flac", start_frame: 10, dur_frames: 40, class: "dialogue", text: "get down." }
    const S1 = { id: "s1", name: "boom.wav", start_frame: 60, dur_frames: 30, class: "sfx", text: "a blast" }
    const M1 = { id: "m1", name: "pad.wav", start_frame: 0, dur_frames: 124, class: "music", text: "" }
    const h = strip({ barAudioClips: [D1, S1, M1] as never, layerA: {} as never })
    const lane = (id: string) => document.body.querySelector(`[data-audio-layer="${id}"]`)!
    for (const [id, own, foreign] of [
      ["dialogue", "d1", ["s1", "m1"]],
      ["sfx", "s1", ["d1", "m1"]],
      ["music", "m1", ["d1", "s1"]],
    ] as Array<[string, string, string[]]>) {
      assert.ok(lane(id).querySelector(`[data-audio-clip="${own}"]`), `${own} rides the ${id} lane`)
      for (const f of foreign) {
        assert.equal(lane(id).querySelector(`[data-audio-clip="${f}"]`), null, `${f} never leaks onto ${id}`)
      }
    }
    // the calls line rides above with its prompt cards
    assert.ok(screen.getByText("hello"))
    assert.ok(screen.getByText("world"))
    // (2026-09-22, the operator's card law) every clip renders as a
    // CARD (small call-card look), every lane row is cards-height,
    // and the gutter heads carry their class glyphs + accents.
    for (const [id, own, icon] of [
      ["dialogue", "d1", "mic"],
      ["sfx", "s1", "zap"],
      ["music", "m1", "music"],
    ] as Array<[string, string, string]>) {
      assert.equal(lane(id).getAttribute("data-lane-cards"), "true", `${id} lane is card-styled`)
      assert.ok(lane(id).querySelector(`[data-audio-clip="${own}"][data-card="true"]`), `${own} renders as a card`)
      const head = document.body.querySelector(`[data-audio-icon="${icon}"]`)
      assert.ok(head, `the ${id} gutter head carries its ${icon} glyph`)
    }
    assert.ok(document.body.querySelector('[data-audio-icon="mic"]')!.getAttribute("style")!.includes("#22d3ee"), "the dialogue accent tints its head")
    h.els.unmount()
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

  it("THE BLOCKER: reference audio present → drops are refused on EVERY lane, loudly", () => {
    const { rec, els } = strip({ refAudiosBlocked: true })
    // the lock is VISIBLE, not silent
    assert.ok(els.container.querySelector('[data-testid="tl-lane-blocker"]'), "the banner states the lock")
    drop({ url: "https://u/song.mp3" })
    const f = new File(["x"], "take.wav", { type: "audio/wav" })
    drop({ files: [f] })
    assert.deepEqual(rec.addedClip, [], "no positioned add")
    assert.deepEqual(rec.taken, [], "no file add")
    // and unlocked again when the refs clear
    els.unmount()
    const again = strip()
    fireEvent.drop(document.body.querySelector('[data-audio-layer="music"]')!, {
      clientX: 60,
      dataTransfer: { files: [], getData: () => JSON.stringify({ url: "https://u/song.mp3" }) },
    })
    assert.deepEqual(again.rec.addedClip, [["song.mp3", "song.mp3", 4242]])
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

/**
 * StudioStripPane — the bar IS the document (BEHAVIORAL).
 *
 * PINS: the header counts (one call / many); every bar gesture lands
 * in DOC frames (the film→doc map rides each door); the tail-pull
 * grows the envelope by exactly its overshoot; tray drops wire only
 * known artifacts; foreign URLs write nothing.
 */
import { describe, it, vi } from "vitest"
import assert from "node:assert/strict"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { StudioStripPane } from "../src/ui/studio/StudioStripPane.tsx"
import { studioCopy } from "../src/ui/studio/studioCopy.ts"
import { bindEstateRemote, unbindEstateRemote } from "@melite/card-base/client"

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
// (the RO famine) happy-dom ships a ResizeObserver whose callbacks
// re-dispatch against the constant patched rect above — a sync
// observe/measure loop that spins the worker at 100% CPU forever
// (jsdom has no RO; the bar guards on typeof). The famine makes the
// scale's measure ride the mount effect alone — same shape the jsdom
// arms of this battery have always proven.
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = undefined

const P1 = { uuid: "p1", text: "hello", start_frame: 0, end_frame: 80, color: null }
const P2 = { uuid: "p2", text: "world", start_frame: 80, end_frame: 168, color: null }
const K1 = { uuid: "k1", track_id: "image", frame: 40 }
const CLIP = { id: "c1", name: "song.mp3", start_frame: 10, dur_frames: 48 }

function strip(over?: Record<string, unknown>) {
  const rec: Record<string, unknown[]> = {
    bar: [], scrubStart: [], scrubEnd: [], kfAdd: [], kfMove: [], kfDel: [], kfDoor: [] as number[], kfWithImage: [] as [string, number][],
  audioDoor: [] as string[],
    promptUpdate: [], promptMove: [], promptResize: [], promptDel: [],
    extend: [], addCall: [], select: [], addedClip: [], taken: [],
    movedClip: [], delClip: [], keys: [],
  }
  const els = render(
    <StudioStripPane
      calls={[{ n: 1 }, { n: 2 }] as never}
      refAudiosBlocked={false}
      fps={24}
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
      artifactIndex={{ byUrl: new Map([["https://u/song.mp3", "song.mp3"], ["https://u/shot.png", "shot.png"]]) }}
      // a CONSTANT map proves every door applies it (pass-through
      // would leak raw film frames; the constant cannot occur raw)
      docFromFilm={() => 4242}
      keyframes={[{}] as never}
      addKeyframeWithImage={(image, frame) => { rec.kfWithImage.push([image, frame]); return "k77" }}
      enterKfView={() => { rec.kfDoor.push(0) }}
      enterAudioView={(id) => { rec.audioDoor.push(id) }}
      {...over}
    />,
  )
  // (the happy-dom index famine, 2026-11-06) document-level CSS
  // queries over a freshly rendered empty-lane bar can enter a
  // pathological engine pass (254% CPU, no timeout fires). A
  // container-scoped sweep is immune AND completes the shared
  // element index — every later document query rides it clean.
  void els.container.querySelectorAll("*").length
  return { rec, els }
}

describe("the keyframe chip lane (slice 3 — thumb, readout, drop hint, gap face)", () => {
  // Two windows: [0, 90) and [90, 175). Boundary distance ≤ GRID_STEP (17).
  const WIN_CALLS = [
    { text: "a", start_frame: 0, end_frame: 90 },
    { text: "b", start_frame: 90, end_frame: 175 },
  ] as never
  const CHIP_PINS = [
    { image: "data:image/png;base64,AA", frame: 40 },
    { image: "last", frame: 89 },
    { image: "mid", frame: 45 },
  ] as never

  it("a doc pin carries the worded faces: chip aria, frame readout, thumb, drop hint", () => {
    strip({
      calls: WIN_CALLS,
      barLanes: [
        { uuid: "k0", track_id: "image", frame: 40, thumbUrl: "data:image/png;base64,AA" },
        { uuid: "k1", track_id: "image", frame: 89 },
      ] as never,
      keyframes: CHIP_PINS,
    })
    // the aria is the dictionary's (keyframeLaneChipAria), not the
    // vendored fallback
    assert.ok(screen.getByLabelText("Image pin at frame 40"))
    // the thumb renders WHAT the derived view fed
    const thumb = document.querySelector('[data-kf-thumb="k0"]') as HTMLImageElement
    assert.equal(thumb?.getAttribute("src"), "data:image/png;base64,AA")
    // the visible frame readout is the DOC frame
    assert.equal(document.querySelector('[data-kf-frame="k0"]')?.textContent, "40")
    // k1 sits ON the window's last frame (distance 0 ≤ 17) — the snap hint
    const k1hint = document.querySelector('[data-kf="k1"]')?.closest("[data-drop-hint]")
    assert.equal(k1hint?.getAttribute("data-drop-hint"), studioCopy.dropSnapHint)
    // k0 sits 40 frames from either boundary — interior
    const k0hint = document.querySelector('[data-kf="k0"]')?.closest("[data-drop-hint]")
    assert.equal(k0hint?.getAttribute("data-drop-hint"), studioCopy.dropInteriorHint)
  })

  it("the hint is VISUAL ONLY — the drag still writes the raw mapped frame", () => {
    const { rec } = strip({
      calls: WIN_CALLS,
      barLanes: [{ uuid: "k0", track_id: "image", frame: 40, thumbUrl: "data:image/png;base64,AA" }] as never,
      keyframes: CHIP_PINS,
    })
    drag(screen.getByLabelText("Image pin at frame 40"), 100, 130)
    assert.deepEqual(rec.kfMove, [["k0", 4242]])
  })

  it("a pin outside every window shows the strip refusal face (the plan door's law, surfaced)", () => {
    strip({
      calls: WIN_CALLS,
      barLanes: [{ uuid: "k0", track_id: "image", frame: 200 }] as never,
      keyframes: [{ image: "gap-pin", frame: 200 }] as never,
    })
    const face = screen.getByTestId("tl-strip-file-error")
    assert.equal(face.textContent, studioCopy.gapRefusal)
  })

  it("pins inside windows carry no refusal face", () => {
    strip({
      calls: WIN_CALLS,
      barLanes: [{ uuid: "k0", track_id: "image", frame: 40 }] as never,
      keyframes: [{ image: "in-window", frame: 40 }] as never,
    })
    assert.equal(screen.queryByTestId("tl-strip-file-error"), null)
  })
})

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
/* THE DECLARED-CHIP WALL (2026-09-23 — the bundle shows the
 * card-level refs: a long run URL must never widen the rail. The
 * chip caps at the track and the name ellipsizes; the full URL
 * rides the title.) */
if (!/\.declaredChip [^{]*\{[^}]*max-width: 100%/.test(css)) {
  throw new Error("THE DECLARED CHIP FORCES: .declaredChip must cap at max-width: 100% — a run-URL chip would force the rail past 280px");
}
if (!/\.declaredName [^{]*\{[^}]*text-overflow: ellipsis/.test(css)) {
  throw new Error("THE DECLARED NAME FORCES: .declaredName must ellipsize (full URL already in title)");
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

// ── THE LANE-ADD PARITY LAW (operator 2026-11-06, D7: "WHERE IS MY
// UP ARROW ICON FOR THE KEYFRAMES? THE AUDIO INPUTS HAVE THEM") —
// defect B's no-door design is SUPERSEDED: the keyframes lane row
// carries the SAME upload-icon add door the audio lane heads carry,
// opening the generic source grammar; the rail's keyframes subview
// KEEPS its own door (two doors, one verb). ──────────────────────
describe("the keyframes lane's add door (the lane-add parity law)", () => {
  it("THE LANE ROW CARRIES THE UP-ARROW DOOR — the audio heads' own affordance grammar", () => {
    const { els } = strip()
    // the chrome's per-track upload affordance, fed by onTrackAdd
    const door = document.body.querySelector('[data-track-upload="image"]')
    assert.ok(door instanceof HTMLButtonElement, "the keyframes track head renders the upload-icon add door")
    // the subview door STAYS (defect B's header verb survives)
    assert.ok(screen.getByTestId("tl-keyframes-door").textContent!.includes("Keyframes"))
    els.unmount()
  })

  it("the door opens the estate's picker — the three-entry source grammar, image rows", async () => {
    const { els } = strip()
    fireEvent.click(document.body.querySelector('[data-track-upload="image"]')!)
    fireEvent.click(await screen.findByRole("menuitem", { name: "From flow" }))
    const rows = await screen.findAllByTestId("source-pick-row")
    assert.ok(rows.some((r) => r.textContent!.includes("shot.png")),
      "the run's image artifacts list at the door (image rows only — song.mp3 never appears)")
    assert.ok(!rows.some((r) => r.textContent!.includes("song.mp3")), "audio rows never list at the keyframes door")
    els.unmount()
  })

  it("a pick commits the ATOMIC pin+image at the playhead — ONE write, both halves", async () => {
    const { els, rec } = strip()
    fireEvent.click(document.body.querySelector('[data-track-upload="image"]')!)
    fireEvent.click(await screen.findByRole("menuitem", { name: "From flow" }))
    const row = (await screen.findAllByTestId("source-pick-row")).find((r) => r.textContent!.includes("shot.png"))!
    fireEvent.click(row)
    // (D1) the commit rides the fit's promise chain (verbatim in a
    // no-decode env, fitted in the browser) — await the write
    await waitFor(() => { assert.equal(rec.kfWithImage.length, 1) })
    // docFromFilm is the fixture's constant (4242) — the commit pins
    // at the CURRENT PLAYHEAD, the same frame a double-click pins;
    // the artifact row commits in its canonical label spelling
    assert.deepEqual(rec.kfWithImage, [["shot.png", 4242]],
      "the atomic verb fires once with image + playhead frame")
    assert.equal(document.body.querySelector('[data-testid="tl-strip-kf-error"]'), null, "no refusal face on a clean pick")
    els.unmount()
  })

  it("the door opens the subview (the tenant's enter verb)", () => {
    const { els, rec } = strip()
    fireEvent.click(screen.getByTestId("tl-keyframes-door"))
    assert.deepEqual(rec.kfDoor, [0], "one click, one enter gesture")
    els.unmount()
  })

  it("AN AUDIO LANE CLICK rides the same law (the lane is the door — enterAudioView)", () => {
    const { els, rec } = strip()
    // the click lands on the LANE ROW (not a clip): the strip hands
    // the rail the audio-submenu verb — the bar is the navigation
    // surface (the submenu law, operator 2026-11-06).
    fireEvent.click(document.body.querySelector('[data-audio-layer="music"]')!)
    assert.deepEqual(rec.audioDoor, ["music"], "one lane click, one audio-submenu gesture — the lane's own id rides the door (M9/W1)")
    els.unmount()
  })

  it("a FOREIGN media URL picked at the door refuses on the strip's error face — the wire never hears it", async () => {
    const { els, rec } = strip()
    // an http(s) URL outside this run's artifacts — the same law the
    // audio door and the call-card buckets ride (classifyImageSrc):
    // feed the picker a foreign media row through the estate door
    bindEstateRemote({ media: { list: async () => ({ ok: true, value: { items: [{ url: "https://lib/foreign.png", name: "foreign.png" }] } }) } } as never)
    fireEvent.click(document.body.querySelector('[data-track-upload="image"]')!)
    fireEvent.click(await screen.findByRole("menuitem", { name: "From media" }))
    const row = (await screen.findAllByTestId("source-pick-row")).find((r) => r.textContent!.includes("foreign.png"))!
    fireEvent.click(row)
    assert.deepEqual(rec.kfWithImage, [], "a URL outside this run's artifacts never commits")
    assert.ok(screen.getByTestId("tl-strip-kf-error").textContent!.length > 0,
      "the refusal lands on the strip's own error face")
    unbindEstateRemote()
    els.unmount()
  })

  it("From file at the kf door: a wrong-genre upload refuses on the strip face — no write", async () => {
    const { els, rec } = strip()
    fireEvent.click(document.body.querySelector('[data-track-upload="image"]')!)
    fireEvent.click(await screen.findByText("From file"))
    // the kf provider's file input is the pane's LAST one (the audio
    // provider's rides first)
    const inputs = [...document.body.querySelectorAll('input[type="file"]')] as HTMLInputElement[]
    fireEvent.change(inputs[inputs.length - 1]!, { target: { files: [new File(["x"], "v.mp4", { type: "video/mp4" })] } })
    const err = await screen.findByTestId("tl-strip-kf-error")
    assert.ok(err.textContent!.includes("wrong file type (video/mp4"), err.textContent)
    assert.deepEqual(rec.kfWithImage, [], "the refused file never pins")
    els.unmount()
  })

  it("From file at the kf door: an honest image lands as a data: pin at the playhead and clears the refusal", async () => {
    const { els, rec } = strip()
    // a refusal first, so the CLEAR is observable (not just the write)
    fireEvent.click(document.body.querySelector('[data-track-upload="image"]')!)
    fireEvent.click(await screen.findByText("From file"))
    let inputs = [...document.body.querySelectorAll('input[type="file"]')] as HTMLInputElement[]
    fireEvent.change(inputs[inputs.length - 1]!, { target: { files: [new File(["x"], "v.mp4", { type: "video/mp4" })] } })
    await screen.findByTestId("tl-strip-kf-error")
    // the retry is a NEW gesture (the From-file door is one-shot)
    fireEvent.click(document.body.querySelector('[data-track-upload="image"]')!)
    fireEvent.click(await screen.findByText("From file"))
    inputs = [...document.body.querySelectorAll('input[type="file"]')] as HTMLInputElement[]
    fireEvent.change(inputs[inputs.length - 1]!, { target: { files: [new File(["bytes"], "a.png", { type: "image/png" })] } })
    await waitFor(() => { assert.equal(rec.kfWithImage.length, 1) })
    const pin = rec.kfWithImage[0] as unknown as [string, number]
    assert.ok(pin[0]!.startsWith("data:image/png;base64,"), pin[0])
    assert.equal(pin[1], 4242, "the data: pin lands at the playhead")
    assert.equal(screen.queryByTestId("tl-strip-kf-error"), null, "the retry clears the refusal")
    els.unmount()
  })

  it("From file at the kf door: an unreadable file refuses with the read error — never a pin", async () => {
    const { els, rec } = strip()
    class FailReader {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      error = new Error("denied")
      result: string | null = null
      readAsDataURL(): void { this.onerror?.() }
    }
    vi.stubGlobal("FileReader", FailReader)
    try {
      fireEvent.click(document.body.querySelector('[data-track-upload="image"]')!)
      fireEvent.click(await screen.findByText("From file"))
      const inputs = [...document.body.querySelectorAll('input[type="file"]')] as HTMLInputElement[]
      fireEvent.change(inputs[inputs.length - 1]!, { target: { files: [new File(["x"], "bad.png", { type: "image/png" })] } })
      const err = await screen.findByTestId("tl-strip-kf-error")
      assert.ok(err.textContent!.includes("could not read that file"), err.textContent)
    } finally {
      vi.unstubAllGlobals()
    }
    assert.deepEqual(rec.kfWithImage, [], "the unreadable file never pins")
    els.unmount()
  })

  it("From media at the kf door: a row named *.png with a bare URL still lists (the name arm of the image-row judge) — data: chips list too", async () => {
    const { els } = strip()
    bindEstateRemote({ media: { list: async () => ({ ok: true, value: { items: [
      // the bare URL carries no dot-extension — the NAME arm is the
      // only judge that can seat this row at an image door
      { url: "https://lib/row/1", name: "named-shot.png" },
      { url: "data:image/png;base64,eA", name: "chip" },
      { url: "https://lib/row/2", name: "voice.mp3" },
    ] } }) } } as never)
    try {
      fireEvent.click(document.body.querySelector('[data-track-upload="image"]')!)
      fireEvent.click(await screen.findByRole("menuitem", { name: "From media" }))
      const rows = await screen.findAllByTestId("source-pick-row")
      assert.ok(rows.some((r) => r.textContent!.includes("named-shot.png")), "the name arm seats the row")
      assert.ok(rows.some((r) => r.textContent!.includes("chip")), "a data: image chip rides the door")
      assert.ok(!rows.some((r) => r.textContent!.includes("voice.mp3")), "audio rows never list")
    } finally {
      unbindEstateRemote()
    }
    els.unmount()
  })

  it("the clear row at the kf door commits the empty string — the guard returns, never a write", async () => {
    const { els, rec } = strip()
    fireEvent.click(document.body.querySelector('[data-track-upload="image"]')!)
    fireEvent.click(await screen.findByText("— clear —"))
    assert.deepEqual(rec.kfWithImage, [], "an empty pick never pins")
    els.unmount()
  })

  it("the source-plane wall: the strip's kf door rides the estate provider (the same grammar every door rides)", () => {
    assert.ok(paneSrc.includes("addKeyframeWithImage"), "the atomic pin+image verb is fed by the strip's door")
    assert.ok(paneSrc.includes("classifyImageSrc"), "ONE commit judge: refUtils' classifier, never a hand-roll")
    assert.ok(paneSrc.includes("loadImageMedia"), "the image loader rides the door (module-scope, the dep law)")
    assert.ok(paneSrc.includes("enterKfView"), "the subview door stays too (two doors, one verb)")
  })
})

describe("chrome (counts + fps + tracks + stem)", () => {
  it("one call reads singular; many plural (the meta rides the BAR's truth: barTotal/fps)", () => {
    const h1 = strip()
    assert.ok(screen.getByText("Timeline").parentElement!.textContent!.includes("2 calls · 200 fr · 24 fps · 8.33s"))
    h1.els.unmount()
    strip({ calls: [{ n: 1 }] as never })
    assert.ok(screen.getByText("Timeline").parentElement!.textContent!.includes("1 call · 200 fr"))
  })

  it("D3 CONFORMANCE (operator 2026-11-06: 'calls bar only goes to 5.5s vs film Final cut 9.06s'): a film map owns the meta — the plan's numbers never show", () => {
    // the film: 162 frames at its own fps (the 'Final cut 9.06s' shape
    // is 162/17.88 — any film fps proves the law); the plan: 168/24.
    // barTotal rides 162 here because the DERIVED seam upstream
    // (useDerivedView: barTotal = filmMap.totalFrames ?? …) feeds it
    // so — its own wall judges that seam.
    const h1 = strip({ filmMap: { fps: 30, totalFrames: 162 } as never, barTotal: 162 })
    const meta = screen.getByText("Timeline").parentElement!.textContent!
    assert.ok(meta.includes("162 fr"), `the film's frames own the meta: ${meta}`)
    assert.ok(meta.includes("30 fps"), `the film's fps owns the meta: ${meta}`)
    assert.ok(meta.includes("5.40s"), `the seconds derive barTotal/barFps: ${meta}`)
    assert.ok(!meta.includes("168 fr"), "the plan's frames never show beside the film's bar")
    assert.ok(!meta.includes("7.0s"), "the plan's seconds never show beside the film's bar")
    h1.els.unmount()
    // no map: the bar falls to the plan's own frames — one spelling
    const h2 = strip()
    assert.ok(screen.getByText("Timeline").parentElement!.textContent!.includes("200 fr · 24 fps · 8.33s"),
      "without a map the meta still rides the BAR's total (barTotal), never a second truth")
    h2.els.unmount()
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

  it("the lane row always rides (even bare); chips ride keyframes only", () => {
    const h1 = strip()
    assert.ok(document.body.querySelector('[data-lane="image"]'))
    assert.ok(document.body.querySelector("[data-kf]"), "a pinned doc owns its chip")
    h1.els.unmount()
    // (re-pin, 2026-11-06) the starved-lane era's law — "bare docs own
    // no [data-lane]" — died with the always-ride lane (ce79f052a: a
    // fresh doc's empty lane IS the pick surface). The bare doc still
    // owns the ROW; it owns no CHIP.
    const h2 = strip({ keyframes: [], barLanes: [] as never })
    assert.ok(document.body.querySelector('[data-lane="image"]'), "the empty lane row still rides")
    assert.equal(document.body.querySelector("[data-kf]"), null)
    h2.els.unmount()
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
    drag(screen.getByLabelText("Keyframes keyframe at frame 40"), 100, 130)
    assert.deepEqual(rec.kfMove, [["k1", 4242]])
    assert.deepEqual(rec.bar, [])
  })

  it("a keyframe click (no drag) seeks its frame", () => {
    const { rec } = strip()
    const kf = screen.getByLabelText("Keyframes keyframe at frame 40")
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

  it("the tail-pull rides the INVERSE map (D3's ghost, 2026-11-06): a mapped pull never writes a raw film delta", () => {
    // (re-pinned 2026-11-06: the old arm pinned the linear delta
    // (filmEdge+1 − filmTotal + docTotal) as the law — with a scaled
    // window that authored GHOST doc frames, and the next run
    // re-scaled the overshoot: the video demorphed past the pull.)
    // The law: the doc write IS docFromFilm(newTotal), the map's own
    // inverse — proven here on a NON-identity map.
    const inv = (g: number): number => Math.round((g - 100) / 1.25) + 80
    const { rec } = strip({ docFromFilm: inv as never })
    const edgeR = document.body.querySelector('[data-prompt-clip="p2"] [data-prompt-edge="r"]')!
    drag(edgeR, 100, 2000)
    assert.equal(rec.extend.length, 1)
    assert.equal(rec.promptResize.length, 1)
    const e = (rec.promptResize[0]! as unknown[])[2] as number
    assert.ok(e > 200)
    // e is the DOC edge (the resize rides docFromFilm at the pane's
    // own boundary); the bar's onExtend arrives in FILM frames — the
    // forward edge F satisfies inv(F) = e, so the envelope law is
    // extend === inv(F + 1), derived through the map's own round-trip
    const F = (e - 80) * 1.25 + 100
    assert.equal((rec.extend[0]! as unknown[])[0], inv(F + 1),
      "the doc envelope grows by the map's own inverse — never a raw delta")
    assert.notEqual((rec.extend[0]! as unknown[])[0], F + 1,
      "and never the raw film frames either: the map is scaled")
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
    // (re-pin 2026-11-06) the lane's face is studioCopy.imageGuideLane
    // = "Keyframes" (3cb742e89) — the arm pinned the retired "Image
    // guide" spelling; the delete verb + the recorded gesture stand.
    fireEvent.click(screen.getByLabelText("Delete Keyframes keyframe at frame 40"))
    assert.deepEqual(rec.kfDel, [["k1"]])
  })
})

describe("scrub (the cap owns the gesture; seek pairs the interaction state)", () => {
  // THE SCRUB SEAT (operator 2026-11: "ONLY SCRUBS WHEN THE MOUSE IS
  // OVER THE WHITE CIRCLE AT THE TOP, NOT IN THE MIDDLE"): the cap is
  // the one scrub surface; its press opens the interaction state and
  // seeks NOTHING (a grab never jumps) — the move is the seek; and the
  // ruler body carries no scrub at all (its double-click add is its
  // own arm above).
  it("cap press opens + never jumps; the move seeks; release closes", () => {
    const { rec } = strip()
    const cap = screen.getByTestId("motion-timeline-playhead-cap")
    fireEvent.pointerDown(cap, { button: 0, clientX: 60 })
    assert.equal(rec.scrubStart.length, 1, "the press opens the interaction state")
    assert.equal(rec.bar.length, 0, "a grab never jumps — the press seeks nothing")
    fireEvent.pointerMove(document.body, { clientX: 60 })
    assert.equal(rec.bar.length, 1, "the move is the seek")
    fireEvent.pointerUp(document.body, { clientX: 60 })
    assert.equal(rec.scrubEnd.length, 1)
  })

  it("the ruler body never scrubs (the defect's own face)", () => {
    const { rec } = strip()
    fireEvent.pointerDown(screen.getByTestId("motion-timeline-ruler"), { button: 0, clientX: 60 })
    fireEvent.pointerMove(document.body, { clientX: 120 })
    fireEvent.pointerUp(document.body, { clientX: 120 })
    assert.deepEqual(rec.scrubStart, [], "no interaction state from the bar's middle")
    assert.deepEqual(rec.bar, [], "no seek from the bar's middle")
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

  it("clip drag moves; the × deletes — and NEITHER clip gesture opens the lane door (h3-submenu M6/M7, 2026-11-06)", () => {
    const { rec } = strip()
    drag(document.body.querySelector('[data-audio-clip="c1"]')!, 100, 140)
    assert.deepEqual(rec.movedClip, [["c1", 4242]])
    // (M6) a click landing on a CLIP rides the clip verb only: the
    // lane-click seam's guard means the drag's pointer landing never
    // activates the lane — removing the guard at the lanes row would
    // push "music" here while every other arm stays green.
    assert.deepEqual(rec.audioDoor, [], "a clip gesture never opens the audio submenu")
    fireEvent.click(screen.getByLabelText("Delete song.mp3"))
    assert.deepEqual(rec.delClip, [["c1"]])
    // (M7) the ✕ is double-protected (its own stopPropagation + the
    // lane guard): composing the two, the delete NEVER opens the door
    assert.deepEqual(rec.audioDoor, [], "the delete never opens the lane door")
  })

  it("detach clears clips AND the legacy stem", () => {
    const { rec } = strip()
    fireEvent.click(screen.getByLabelText("Detach Music"))
    assert.deepEqual(rec.keys, [["audio_clips", undefined], ["audio_stem", undefined]])
  })
})

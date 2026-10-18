/**
 * THE KEYFRAME-IMAGE IDENTITY WALL (D9 — journey-closure plan §D9,
 * the drop's one truth). The keyframe plane's ONE image can land
 * through TWO doors — the rail subview's row picker (CallCardsPanel's
 * setKeyframeImage seat) and the strip's track-head add door
 * (StudioStripPane's lane-add parity door). One image, one identity:
 * the same source dropped through EITHER door must stamp the SAME
 * value into the doc — byte-for-byte — or the saved doc carries two
 * identities for one image depending on which door the operator used.
 *
 * THE CANON (the D9 ruling): the keyframe image's canonical identity
 * is the value refUtils' commitKeyframePinImage stamps — the
 * classify judge (estate media → the canonical rooted chip, the run's
 * artifact → its ctx-key NAME, data: verbatim, foreign refuses) plus
 * the fit on the committed value (a real fit canonicalizes the name
 * arm to its fitted data: — the unfittable bare name dies at the
 * commit seam; where the fit rides verbatim the name IS the commit).
 * THE DIVERGENCE THE PLAN FOUND: the strip door rode the pre-E7
 * classify+fit pair — on the name arm it stamped the bare NAME while
 * the panel stamped the fitted data:. Both doors ride the ONE spine.
 *
 * Arms ride the REAL component doors (jsdom renders, the estate
 * picker's own modal, the shared decode stub — never a hand-called
 * helper standing in for a door).
 */
import { describe, it, vi } from "vitest"
import assert from "node:assert/strict"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { CallCardsPanel } from "../src/ui/studio/CallCardsPanel.tsx"
import { StudioStripPane } from "../src/ui/studio/StudioStripPane.tsx"
import { hydrateKeyframes, serializeKeyframes } from "../src/ui/studio/docCalls.ts"
import { classifyImageSrc, fitImageToAspect } from "../src/ui/studio/refUtils.ts"
import type { DocKeyframe } from "../src/ui/studio/docModel.ts"
import { bindEstateRemote, unbindEstateRemote } from "@melite/card-base/client"
import { film } from "@melite/models-h3/actions"
import { schema as h3schema } from "@melite/models-h3/schema"
import { GraphBuilder } from "@melite/comfyui-card-kit/graph"
import { instantiateAction } from "@melite/comfyui-card-kit"
import type { ModelFacts } from "@melite/comfyui-card-kit/facts"

vi.mock("@melite/models-h3/mods/loras", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@melite/models-h3/mods/loras")>();
  return { ...actual, H3_LORA_ROWS: actual.H3_LORA_ROWS.filter((r) => r.id !== "h3_turbo8_v1") };
});

// ── the shared decode stub (E7's own shape: queueMicrotask onload —
// no real decode, no timer waits). (nw,nh) = the source's natural size. ──
function stubFitDecode(nw: number, nh: number): { restore: () => void } {
  class StubImg {
    naturalWidth = nw
    naturalHeight = nh
    set src(_v: string) { queueMicrotask(() => { this.onload?.() }) }
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
  }
  const origCreate = document.createElement.bind(document)
  const spy = vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    if (tag === "canvas") {
      const c = {
        width: 0, height: 0,
        getContext: () => ({ drawImage: () => {} }),
        toDataURL: () => "data:image/png;base64,FITTED",
      }
      return c as unknown as HTMLCanvasElement
    }
    return origCreate(tag)
  })
  vi.stubGlobal("Image", StubImg as unknown as typeof Image)
  return { restore: () => { spy.mockRestore(); vi.unstubAllGlobals() } }
}

// ── THE FIXTURES: one estate-media row + one run artifact, the same
// rows both doors are fed (the same image arriving at two doors). ──
const MEDIA_URL = "http://127.0.0.1:3080/melite-media/runs/r1/pin.png"
const FLOW_URL = "https://engine:8188/view?filename=pin.png"
const FLOW_NAME = "pin.png"
const DIMS = { width: 1344, height: 768 }

function bindMediaRow(): void {
  bindEstateRemote({
    media: { list: async () => ({ ok: true, value: { items: [{ url: MEDIA_URL, name: FLOW_NAME }] } }) },
  } as never)
}

// ── DOOR A — the rail subview's ROW PICKER (the setKeyframeImage
// seat): one standing pin, the row's source verb, the same provider. ──
function openPanelRowDoor(): { sources: [number, string][]; unmount: () => void } {
  const sources: [number, string][] = []
  const els = render(
    <CallCardsPanel
      calls={[]}
      selected={null}
      setSelected={() => {}}
      fps={24}
      sourceOptions={[{ title: "up", name: FLOW_NAME }]}
      keyframes={[{ image: "", frame: 40 }]}
      handleKeyframeMove={() => {}}
      handleKeyframeDelete={() => {}}
      setKeyframeImage={(i, image) => { sources.push([i, image]) }}
      kfView
      exitKfView={() => {}}
      addKeyframeWithImage={() => "kf-new"}
      playheadDocFrame={12}
      deps={{
        selected: null, fps: 24, knobFields: {}, callCardRefs: { current: [] },
        artifactIndex: {
          byName: new Map([[FLOW_NAME, FLOW_URL]]),
          byUrl: new Map([[FLOW_URL, FLOW_NAME]]),
        },
        linkGroups: [], guideLinks: { clip: [], audio: [] },
        refArtifacts: [],
        layerA: DIMS as never,
        handlePromptDelete: () => {}, handlePromptUpdate: () => {},
        enhanceOne: () => {}, undoEnhance: () => {},
        enhancing: {}, enhanceErr: {}, enhanceUndo: {},
        setCallSpan: () => {}, setCallGuide: () => {},
        setCallTransition: () => {}, setCallRefs: () => {}, setCallKnob: () => {},
      }}
    />,
  )
  return { sources, unmount: () => els.unmount() }
}

// ── DOOR B — the strip's track-head add door (the lane-add parity
// door): the keyframes lane row's upload icon, the same provider. ──
function openStripDoor(): { added: [string, number][]; unmount: () => void } {
  const added: [string, number][] = []
  const els = render(
    <StudioStripPane
      calls={[{ text: "solo", start_frame: 0, end_frame: 90 }] as never}
      refAudiosBlocked={false}
      fps={24}
      barPrompts={[] as never}
      barLanes={[] as never}
      barAudioClips={[]}
      barTotal={200}
      frameIdx={0}
      callPreviews={{}}
      selectedBarId={null}
      filmMap={null}
      handleBarFrame={() => {}}
      handleScrubStart={() => {}}
      handleScrubEnd={() => {}}
      handleKeyframeAdd={() => "k9"}
      handleKeyframeMove={() => {}}
      handleKeyframeDelete={() => {}}
      handlePromptUpdate={() => {}}
      handlePromptMove={() => {}}
      handlePromptResize={() => {}}
      handlePromptDelete={() => {}}
      handleExtend={() => {}}
      addCallAt={() => {}}
      handleTimelineSelect={() => {}}
      layerA={{ audio_stem: null, ...DIMS } as never}
      addAudioClip={() => {}}
      takeAudioFile={() => {}}
      moveAudioClip={() => {}}
      deleteAudioClip={() => {}}
      updateAudioClip={() => {}}
      setLayerAKey={() => {}}
      artifactIndex={{ byUrl: new Map([[FLOW_URL, FLOW_NAME]]) }}
      docFromFilm={(g: number) => g}
      keyframes={[] as never}
      addKeyframeWithImage={(image, frame) => { added.push([image, frame]); return "k77" }}
      enterKfView={() => {}}
      enterAudioView={() => {}}
    />,
  )
  return { added, unmount: () => els.unmount() }
}

/** The provider's shared drive: open a door, take one picker arm,
 *  click the row. The menu/modal are the provider's own tree. */
async function pick(
  open: () => HTMLElement,
  arm: "From flow" | "From media",
  rowLabel: string,
): Promise<void> {
  fireEvent.click(open())
  fireEvent.click(await screen.findByRole("menuitem", { name: arm }))
  const row = (await screen.findAllByTestId("source-pick-row"))
    .find((r) => (r.textContent ?? "").includes(rowLabel))
  assert.ok(row !== undefined, `the picker listed the ${arm} row (${rowLabel})`)
  const btn = row.closest("button") ?? row
  fireEvent.click(btn)
}

/** THE SAVE/LOAD HOP (useShownDoc's sorted-write law → the hydrate):
 *  the stamped value must survive the door round-trip byte-identical. */
function saveLoadRoundtrip(image: string): string {
  const saved = serializeKeyframes([{ image, frame: 45 }] as DocKeyframe[])
  const loaded = hydrateKeyframes(saved)
  assert.equal(loaded.length, 1)
  return loaded[0]!.image
}

/** THE COMPOSE HOP (the plan gate + the film build — anchor-guide's
 *  lawful compose shape): the stamp must walk as media and reach the
 *  composed graph. @returns the graph JSON (the value-presence proof). */
function composeGreen(image: string): string {
  const walked = h3schema({
    loras: [{ name: "distill-8.safetensors", strength: 0.6, steps: 8 }],
    seed: 7,
    calls: [{ text: "she waves", start_frame: 0, end_frame: 90 }],
    keyframes: [{ image, frame: 45 }],
  }) as Record<string, unknown>
  const g = new GraphBuilder()
  instantiateAction(film, walked, WINDOW_MODEL, g, "run_d9_identity")
  return JSON.stringify(g.toJSON())
}

const WINDOW_MODEL: ModelFacts = {
  id: "h3",
  card: "h3-timeline",
  defaults: {},
  lane_inputs: {
    unet: "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors",
  },
  variants: [],
  variant_groups: [],
  outputs: [],
}

describe("THE KEYFRAME-IMAGE IDENTITY (D9 — the drop's one truth: one image, one identity, both doors)", () => {
  it("the SAME estate-media row through BOTH doors stamps byte-identical identities — and the stamp survives save/load and composes green", async () => {
    const stub = stubFitDecode(2688, 768) // off-aspect: the fit is real
    bindMediaRow()
    try {
      const a = openPanelRowDoor()
      await pick(() => screen.getByTestId("tl-kf-source-0"), "From media", FLOW_NAME)
      await waitFor(() => { assert.equal(a.sources.length, 1) })
      a.unmount()
      const b = openStripDoor()
      await pick(() => document.body.querySelector('[data-track-upload="image"]') as HTMLElement, "From media", FLOW_NAME)
      await waitFor(() => { assert.equal(b.added.length, 1) })
      b.unmount()
      const panelStamp = a.sources[0]![1]
      const stripStamp = b.added[0]![0]
      // THE IDENTITY: one image, one identity — byte-for-byte.
      assert.equal(Buffer.byteLength(panelStamp), Buffer.byteLength(stripStamp))
      assert.ok(panelStamp === stripStamp,
        `the two doors stamped DIFFERENT identities for the same media row:\n  panel: ${panelStamp}\n  strip: ${stripStamp}`)
      // the canonical shape: the chip canonicalized, then the real fit
      assert.equal(panelStamp, "data:image/png;base64,FITTED")
      // hop [2]: the value survives the save/load round-trip identically
      assert.equal(saveLoadRoundtrip(panelStamp), stripStamp)
      // hop [4]: the stamp composes green — the plan gate walks it as
      // media and the value reaches the composed graph
      const json = composeGreen(panelStamp)
      assert.ok(json.includes(panelStamp), "the committed identity rides the composed graph")
    } finally {
      unbindEstateRemote()
      stub.restore()
    }
  })

  it("the SAME From-flow artifact pick stamps byte-identical identities — the name arm's fit story rides BOTH doors (never the unfittable bare name)", async () => {
    const stub = stubFitDecode(2688, 768) // off-aspect: the fit is real
    try {
      const a = openPanelRowDoor()
      await pick(() => screen.getByTestId("tl-kf-source-0"), "From flow", FLOW_NAME)
      await waitFor(() => { assert.equal(a.sources.length, 1) })
      a.unmount()
      const b = openStripDoor()
      await pick(() => document.body.querySelector('[data-track-upload="image"]') as HTMLElement, "From flow", FLOW_NAME)
      await waitFor(() => { assert.equal(b.added.length, 1) })
      b.unmount()
      const panelStamp = a.sources[0]![1]
      const stripStamp = b.added[0]![0]
      assert.ok(panelStamp === stripStamp,
        `the two doors stamped DIFFERENT identities for the same artifact pick:\n  panel: ${panelStamp}\n  strip: ${stripStamp}`)
      // the name arm's fit story (E7, KF-A(1)): a real fit canonicalizes
      // the commit to the fitted data: — at BOTH doors, never the bare name
      assert.equal(panelStamp, "data:image/png;base64,FITTED")
      assert.notEqual(stripStamp, FLOW_NAME, "the unfittable bare name stamps at NO door")
      // hop [2] + hop [4]
      assert.equal(saveLoadRoundtrip(panelStamp), stripStamp)
      const json = composeGreen(panelStamp)
      assert.ok(json.includes(panelStamp), "the committed identity rides the composed graph")
    } finally {
      stub.restore()
    }
  })

  it("the SAME-ASPECT artifact pick rides the courtesy law at BOTH doors — the name IS the commit, byte-identically", async () => {
    const stub = stubFitDecode(672, 384) // same aspect: the fit rides verbatim
    try {
      const a = openPanelRowDoor()
      await pick(() => screen.getByTestId("tl-kf-source-0"), "From flow", FLOW_NAME)
      await waitFor(() => { assert.equal(a.sources.length, 1) })
      a.unmount()
      const b = openStripDoor()
      await pick(() => document.body.querySelector('[data-track-upload="image"]') as HTMLElement, "From flow", FLOW_NAME)
      await waitFor(() => { assert.equal(b.added.length, 1) })
      b.unmount()
      const panelStamp = a.sources[0]![1]
      const stripStamp = b.added[0]![0]
      assert.ok(panelStamp === stripStamp,
        `the doors diverged where the fit rides verbatim:\n  panel: ${panelStamp}\n  strip: ${stripStamp}`)
      assert.equal(panelStamp, FLOW_NAME, "the courtesy law: the commit never depends on the fit")
      // the name is engine currency — the save/load hop is verbatim and
      // the compose walks it (the extension spelling is media)
      assert.equal(saveLoadRoundtrip(panelStamp), stripStamp)
      const json = composeGreen(panelStamp)
      assert.ok(json.includes(panelStamp), "the committed identity rides the composed graph")
    } finally {
      stub.restore()
    }
  })

  it("THE DIVERGENCE ARM: a door that stamps the pre-cure spelling (the classify+fit pair — the bare name) diverges from the doors' one identity", async () => {
    // The pre-cure strip spelling, verbatim (the shape the prefix red
    // captured through the real door): classify judges, the fit runs on
    // the committed value ONLY — the name arm's servable URL is never
    // fitted, the unfittable bare name rides into the doc. This arm
    // pins the class the same-identity arms enforce against: the pair's
    // stamp is NOT the doors' identity, byte-for-byte different.
    const stub = stubFitDecode(2688, 768)
    try {
      const pairStamp = await (async (): Promise<string> => {
        const got = classifyImageSrc(FLOW_URL, new Map([[FLOW_URL, FLOW_NAME]]))
        if ("refusal" in got) throw new Error(got.refusal)
        return fitImageToAspect(got.image, 1344, 768)
      })()
      assert.equal(pairStamp, FLOW_NAME, "the pair stamps the bare name (the historic spelling)")
      assert.notEqual(pairStamp, "data:image/png;base64,FITTED",
        "the pair's stamp is a DIFFERENT identity for the same image — the divergence the identity arms red on")
    } finally {
      stub.restore()
    }
  })
})

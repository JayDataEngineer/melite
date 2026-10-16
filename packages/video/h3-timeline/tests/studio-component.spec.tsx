/**
 * VideoTimelineStudio — the tenant composition (BEHAVIORAL).
 *
 * PINS (the shell ride): the rail reads the document out (calls /
 * guides / knob departures / unwired warnings, each in singular and
 * plural); global mode owns the call cards + the Run fold; selecting
 * a bar clip swaps the rail to that call's editor and back; the
 * player's own duration sizes the film axis.
 */
import { describe, it, vi } from "vitest"
import assert from "node:assert/strict"
import { fireEvent, render, screen } from "@testing-library/react"
import { createElement } from "react"
import {
  VideoTimelineStudio, shellDeclaration,
} from "../src/ui/studio/component.tsx"

// THE OWNER MOUNT (the one-truth currency, 2026-10-27): the tenant
// speaks StageViewOwnerProps — params ride row.params, writes ride
// onPatch, never-run rides runStatus ''.
function studio(params: Record<string, unknown>, extra?: Record<string, unknown>) {
  const saved: Record<string, unknown>[] = []
  const els = render(
    <VideoTimelineStudio
      stageId="s_4"
      cardName="h3-timeline"
      row={{ id: "s_4", card: "h3-timeline", title: "H3 Timeline", params, ...extra }}
      runStatus=""
      onPatch={(p: Record<string, unknown>) => { saved.push(p) }}
      onRun={() => {}}
      onStop={() => {}}
      onRemove={() => {}}
      onSurface={() => {}}
      upstream={[]}
      runId={null}
    />,
  )
  return { saved, els }
}

const TWO = {
  calls: [
    { text: "one", start_frame: 0, end_frame: 80, image: "img.png", knobs: { denoise: 0.8 } },
    { text: "two", start_frame: 80, end_frame: 168 },
  ],
  keyframes: [{ image: "", frame: 10 }],
  fps: 24,
}

describe("the rail reads the document out", () => {
  it("counts + departures + warnings (singular)", () => {
    studio(TWO)
    const readout = screen.getByTestId("tl-doc-readout").textContent!
    assert.ok(readout.includes("2 calls"))
    // (re-pin 2026-11-06, the heal law) TWO's spans [0-80]+[80-168]
    // are OFF-GRID (the engine renders 22+17k) — the doc heals on
    // load (ce79f052a: "legacy off-grid docs heal on load") and the
    // readout speaks the HEALED total, never the raw 168f/7.0s.
    assert.ok(readout.includes("6.6s"), `the healed total rides (${readout})`)
    assert.ok(readout.includes("1 guide"))
    assert.ok(readout.includes("1 call with knobs"))
    assert.ok(document.body.textContent!.includes("1 keyframe source unwired"))
  })

  it("bare docs read clean (no departures, no warnings)", () => {
    const h = studio({ calls: [{ text: "solo", start_frame: 0, end_frame: 48 }], fps: 24 })
    const readout = screen.getByTestId("tl-doc-readout").textContent!
    assert.ok(readout.includes("1 call ·"))
    assert.ok(readout.includes("0 guides"))
    assert.ok(!readout.includes("with knobs"))
    assert.ok(!document.body.textContent!.includes("unwired"))
    h.els.unmount()
  })

  it("crowded docs pluralize everything", () => {
    studio({
      calls: [
        { text: "a", start_frame: 0, end_frame: 80, image: "a.png", knobs: { denoise: 0.5 } },
        { text: "b", start_frame: 80, end_frame: 168, clip: "b.mp4", knobs: { sampler: "heun" } },
      ],
      keyframes: [
        { image: "", frame: 5 },
        { image: "", frame: 90 },
      ],
      fps: 24,
    })
    const readout = screen.getByTestId("tl-doc-readout").textContent!
    assert.ok(readout.includes("2 calls"))
    assert.ok(readout.includes("2 guides"))
    assert.ok(readout.includes("2 calls with knobs"))
    assert.ok(document.body.textContent!.includes("2 keyframe sources unwired"))
  })

  it("the unwired warning rides the shell error line (Sahar R5 — the hand-rolled warnRow is dead)", () => {
    // (R5, 2026-11-06) the argued-tier conversion: the unwired count
    // passes through the shell's errors prop — the loud line owns
    // the face, no tenant warnRow exists. The copy is unchanged
    // (the shell prefixes its own id grammar).
    const h = studio(TWO)
    const line = document.body.querySelector('[role="alert"]')
    assert.ok(line, "the shell error line renders while sources sit unwired")
    assert.ok(line!.textContent!.includes("1 keyframe source unwired"))
    assert.ok(line!.textContent!.includes("unwired"), "the shell's id grammar names the row")
    h.els.unmount()
  })

  it("a fully-wired doc renders no shell error line", () => {
    const h = studio({ calls: [{ text: "solo", start_frame: 0, end_frame: 48 }], fps: 24 })
    assert.equal(document.body.querySelector('[role="alert"]'), null)
    h.els.unmount()
  })
})

describe("the mode-switching rail", () => {
  it("global mode owns the OPEN run params — no rows list, no fold (the bar is the menu)", () => {
    studio(TWO)
    assert.ok(screen.getByTestId("tl-run-panel"), "the run params ride the global view")
    // (re-pin 2026-11-06) the global Model-calls list is GONE (operator
    // 2026-11-05: "people will know to click the timeline bar") and the
    // Layer A fold is DEAD (operator 2026-11-06: "get rid of the
    // folding of layer A") — the rail's global view is the run params
    // OPEN plus nothing else: no row list, no fold grammar.
    assert.equal(document.body.querySelector("[data-call-row]"), null, "the global rows list is gone — the bar is the menu")
    assert.equal(document.body.querySelector("details"), null, "no fold grammar survives")
  })

  it("a bar clip swaps the rail to its editor; click-away swaps back", () => {
    studio(TWO)
    const clip = document.body.querySelector('[data-prompt-clip="call-0"]')!
    fireEvent.pointerDown(clip, { button: 0, clientX: 100 })
    fireEvent.pointerUp(document.body, { clientX: 100 })
    // focused: the Run fold leaves, the full card rides
    assert.equal(screen.queryByTestId("tl-run-panel"), null)
    assert.ok(document.body.querySelector('[data-call-card="0"]'))
    // click-away on the bar's empty lane restores the global rail
    fireEvent.click(clip.parentElement!)
    assert.ok(screen.queryByTestId("tl-run-panel"))
  })

  it("DELETING the focused call clears the focus (the delete-follow law, 2026-10-31)", () => {
    // Aim at THE ORPHAN the law names: focus call 0, delete call 0 —
    // the survivor slides into index 0, so a STALE {callIdx: 0}
    // mounts an editor over it. (Aiming at the last call would hide
    // the drift behind the out-of-range fallback — the toggle-proof
    // caught that hole 2026-10-31.)
    const { saved } = studio(TWO)
    const clip = document.body.querySelector('[data-prompt-clip="call-0"]')!
    fireEvent.pointerDown(clip, { button: 0, clientX: 100 })
    fireEvent.pointerUp(document.body, { clientX: 100 })
    assert.equal(screen.queryByTestId("tl-run-panel"), null)
    fireEvent.click(screen.getByLabelText("Delete call 0"))
    // the rail is back to global (the Run fold returns) and the write
    // landed — no orphaned editor over the survivor that slid into
    // index 0.
    assert.ok(screen.getByTestId("tl-run-panel"))
    assert.equal(screen.getByTestId("tl-doc-readout").textContent!.includes("1 call ·"), true)
    assert.ok(saved.some((p) => Array.isArray(p.calls) && p.calls.length === 1))
  })

  it("a re-seated stage carries no stale focus (the stage-seam reset, 2026-10-31)", () => {
    const els = render(
      <VideoTimelineStudio
        stageId="s_4"
        cardName="h3-timeline"
        row={{ id: "s_4", card: "h3-timeline", title: "H3 Timeline", params: TWO }}
        runStatus=""
        onPatch={() => {}}
        onRun={() => {}}
        onStop={() => {}}
        onRemove={() => {}}
        onSurface={() => {}}
        upstream={[]}
        runId={null}
      />,
    )
    const clip = document.body.querySelector('[data-prompt-clip="call-0"]')!
    fireEvent.pointerDown(clip, { button: 0, clientX: 100 })
    fireEvent.pointerUp(document.body, { clientX: 100 })
    assert.equal(screen.queryByTestId("tl-run-panel"), null)
    // the bench slot re-seats a DIFFERENT stage without remounting:
    // the selection index from stage one must not ride it.
    els.rerender(
      <VideoTimelineStudio
        stageId="s_9"
        cardName="h3-timeline"
        row={{ id: "s_9", card: "h3-timeline", title: "H3 Timeline", params: TWO }}
        runStatus=""
        onPatch={() => {}}
        onRun={() => {}}
        onStop={() => {}}
        onRemove={() => {}}
        onSurface={() => {}}
        upstream={[]}
        runId={null}
      />,
    )
    assert.ok(screen.getByTestId("tl-run-panel"))
    els.unmount()
  })
})

describe("THE SUBMENU LAW (defect B + operator 2026-11-06: the Layer A fold is dead)", () => {
  it("global view: the run params ride OPEN — no fold grammar, the Recipe faces render without a click", () => {
    studio(TWO)
    assert.ok(screen.getByTestId("tl-run-panel"), "the run panel rides the global view")
    // (the fold's death) the run faces are rendered IMMEDIATELY — no
    // DisclosureRow, nothing to expand: the General section's own
    // title is on screen at mount.
    assert.ok(screen.getByText("General"), "the run params render open at mount (no fold to open)")
    // (h3-submenu W5, 2026-11-06) not just a head + a negative: a
    // real Recipe control renders OPEN at mount — the studio clock's
    // own row (the GENERAL subcategory's fps, resolved, never blank)
    assert.ok(screen.getAllByLabelText("FPS").length > 0, "the fps row rides the open run params")
    assert.equal(document.body.querySelector("details"), null, "no fold grammar survives in the rail")
  })

  it("the keyframes door swaps the rail wholesale — run params and call rows are BANNED alongside it", () => {
    studio(TWO)
    assert.ok(screen.getByTestId("tl-run-panel"))
    fireEvent.click(screen.getByTestId("tl-keyframes-door"))
    assert.ok(screen.getByTestId("tl-kf-add"), "the submenu's add door rides beside the title")
    assert.equal(screen.queryByTestId("tl-run-panel"), null, "the run params are banned alongside the submenu")
    assert.equal(document.body.querySelector("[data-call-card]"), null, "the call cards are banned alongside the submenu")
    // the back verb restores the global rail
    fireEvent.click(screen.getByTestId("tl-back-to-global"))
    assert.ok(screen.getByTestId("tl-run-panel"))
  })

  it("AN AUDIO LANE CLICK opens the audio submenu — its own back verb, everything else banned", () => {
    // (h3-submenu W2, 2026-11-06) the doc carries a real audio clip
    // so the panel's face is judged at the TENANT level: the clips
    // inspector renders its lane ROW (a working pane, not an empty
    // shell around a section head)
    studio(TWO)
    assert.ok(screen.getByTestId("tl-run-panel"))
    // the bar is the navigation surface: a click on the music lane's
    // ROW (not a clip) opens the audio submenu
    fireEvent.click(document.body.querySelector('[data-audio-layer="music"]')!)
    assert.ok(screen.getByTestId("tl-audio-panel"), "the audio submenu rides")
    assert.equal(screen.queryByTestId("tl-run-panel"), null, "the run params are banned alongside the audio submenu")
    assert.equal(document.body.querySelector("[data-call-card]"), null, "the call cards are banned alongside the audio submenu")
    // the clips section is the submenu's face — WITH its lane row
    // (the inspector around a working pane, not an empty shell)
    assert.ok(screen.getByText("Clips"), "the clips inspector rides the audio submenu")
    fireEvent.click(screen.getByTestId("tl-back-to-global"))
    assert.ok(screen.getByTestId("tl-run-panel"), "the back verb restores the global rail")
  })

  it("the door clears the focus — no orphaned editor behind a submenu (enterSub's selected=null)", () => {
    studio(TWO)
    const clip = document.body.querySelector('[data-prompt-clip="call-0"]')!
    fireEvent.pointerDown(clip, { button: 0, clientX: 100 })
    fireEvent.pointerUp(document.body, { clientX: 100 })
    assert.ok(document.body.querySelector('[data-call-card="0"]'), "the focused call rides first")
    // enter the submenu from a FOCUSED state — the focus must not ride along
    fireEvent.click(screen.getByTestId("tl-keyframes-door"))
    assert.ok(screen.getByTestId("tl-kf-add"))
    assert.equal(document.body.querySelector("[data-call-card]"), null, "the focused editor left with the rows")
    // back lands on GLOBAL, not the stale focus
    fireEvent.click(screen.getByTestId("tl-back-to-global"))
    assert.ok(screen.getByTestId("tl-run-panel"))
    assert.equal(document.body.querySelector("[data-call-card]"), null, "no orphaned editor after the round trip")
  })

  it("a bar-clip pick EXITS every submenu (the model call outranks it)", () => {
    studio(TWO)
    fireEvent.click(screen.getByTestId("tl-keyframes-door"))
    assert.ok(screen.getByTestId("tl-kf-add"))
    const clip = document.body.querySelector('[data-prompt-clip="call-0"]')!
    fireEvent.pointerDown(clip, { button: 0, clientX: 100 })
    fireEvent.pointerUp(document.body, { clientX: 100 })
    assert.ok(document.body.querySelector('[data-call-card="0"]'), "the focused call rides")
    assert.equal(screen.queryByTestId("tl-kf-add"), null, "the submenu leaves for the focused call")
  })

  it("THE BACK DOOR IS ONE COMPONENT — the R10 census + the click is self-contained (h3-submenu M10, 2026-11-06)", async () => {
    // (the census half — the owed R10 chrome-census shrink) the three
    // doors ride ONE spelling: RailBackButton is imported by exactly
    // the two consumers, and neither the component's icon nor the
    // back-door test id nor the copy verb is hand-rolled elsewhere.
    // A reverted seat (a byte-identical copy pasted back) reds here
    // while every behavior arm stays green.
    const { readFileSync, readdirSync } = await import("node:fs")
    const { join } = await import("node:path")
    const STUDIO = join(import.meta.dirname, "..", "src", "ui", "studio")
    const files = readdirSync(STUDIO).filter((f) => f.endsWith(".tsx") && f !== "RailBackButton.tsx")
    const importers = files.filter((f) => readFileSync(join(STUDIO, f), "utf8").includes("RailBackButton"))
    assert.deepEqual(importers, ["CallCardsPanel.tsx", "component.tsx"],
      "exactly the two consumers import the one back door")
    for (const f of files) {
      const text = readFileSync(join(STUDIO, f), "utf8")
      assert.equal(text.includes("tl-back-to-global"), false, `${f} hand-rolls the back door's face`)
      assert.equal(text.includes("IconChevronLeft"), false, `${f} hand-rolls the back door's glyph`)
    }
    // (the behavior half) the button's stopPropagation is part of the
    // contract: the click never bubbles past the door
    const { RailBackButton } = await import("../src/ui/studio/RailBackButton.tsx")
    const verb: string[] = []
    const spy = vi.fn()
    const els = render(createElement("div", { onClick: spy }, createElement(RailBackButton, { onClick: () => { verb.push("global") } })))
    fireEvent.click(screen.getByTestId("tl-back-to-global"))
    assert.deepEqual(verb, ["global"], "the door's verb fired once")
    assert.equal(spy.mock.calls.length, 0, "the click never bubbled past the back door")
    els.unmount()
  })


  it("the audio door's exclusion runs in BOTH directions at the tenant seam (h3-submenu M12, 2026-11-06)", () => {
    // The statements are shared with the kf door's arms; these two
    // compose the AUDIO door as the actor, so a per-door regression
    // (an early return branched on "audio") cannot hide behind the
    // kf arms' green.
    studio(TWO)
    // (1) a lane click while a call is FOCUSED: the submenu replaces
    // the editor — no orphaned card behind the panel
    const clip = document.body.querySelector('[data-prompt-clip="call-0"]')!
    fireEvent.pointerDown(clip, { button: 0, clientX: 100 })
    fireEvent.pointerUp(document.body, { clientX: 100 })
    assert.ok(document.body.querySelector('[data-call-card="0"]'), "the focused call rides first")
    fireEvent.click(document.body.querySelector('[data-audio-layer="music"]')!)
    assert.ok(screen.getByTestId("tl-audio-panel"), "the audio submenu rides")
    assert.equal(document.body.querySelector("[data-call-card]"), null, "the lane click retired the focused editor")
    // (2) a clip pick while the AUDIO submenu is open: the model call
    // outranks it — the panel leaves for the focused call
    const clip2 = document.body.querySelector('[data-prompt-clip="call-0"]')!
    fireEvent.pointerDown(clip2, { button: 0, clientX: 100 })
    fireEvent.pointerUp(document.body, { clientX: 100 })
    assert.ok(document.body.querySelector('[data-call-card="0"]'), "the focused call rides")
    assert.equal(screen.queryByTestId("tl-audio-panel"), null, "the audio submenu leaves for the model call")
  })
})

describe("the film axis (the player's own duration)", () => {
  it("a landed final plays; its duration report never throws", () => {
    studio(
      { calls: [{ text: "one", start_frame: 0, end_frame: 168 }], fps: 24 },
      { result: { artifacts: { video: "https://u/final.mp4" } } },
    )
    const cut = screen.getByTestId("tl-final-cut")
    const video = cut.querySelector("video")!
    Object.defineProperty(video, "duration", { value: 12.5, configurable: true })
    fireEvent.loadedMetadata(video)
    assert.ok(screen.getByTestId("tl-film-player"))
  })

  it("the shell declaration owns the seams", () => {
    assert.deepEqual(shellDeclaration, {
      preview: { kind: "native" },
      bottom: { kind: "timeline" },
      params: { slots: [] },
    })
  })
})

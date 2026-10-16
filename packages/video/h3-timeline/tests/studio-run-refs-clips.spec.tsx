/**
 * RunRefsClips — the clips row + the lane inspector (BEHAVIORAL).
 *
 * THE LANE-PICKER LAW (2026-09-22, the operator): the bespoke
 * upload button is DEAD — the add door is the ⤴ beside each lane
 * title in the timeline gutter (the generic From flow / From media /
 * From file grammar, tested in the kit spec + the pane wall). This
 * row keeps the count + the door-guard hint; the inspector below
 * edits each clip's lane and words.
 *
 * PINS: the refs panel never renders; the row carries NO upload
 * button and NO hidden file input (the door moved to the gutter);
 * the note counts (none/one/many) and points at the lane icons.
 */
import { describe, it } from "vitest"
import assert from "node:assert/strict"
import { fireEvent, render, screen } from "@testing-library/react"
import { RunRefsClips } from "../src/ui/studio/RunRefsClips.tsx"
import type { LayerA } from "../src/ui/studio/docModel.ts"

function clips(layerA: Record<string, unknown>) {
  const els = render(
    <RunRefsClips
      layerA={layerA as unknown as LayerA}
      updateAudioClip={() => {}}
      deleteAudioClip={() => {}}
    />,
  )
  return { els }
}

describe("the run-level refs panel is dead (refs are per-call)", () => {
  it("no refs panel and NO bespoke upload door — the row is count + hint", () => {
    const h = clips({})
    assert.equal(screen.queryByTestId("tl-refs-panel"), null)
    assert.equal(screen.queryByLabelText("ref images (run)"), null)
    assert.equal(screen.queryByTestId("tl-audio-upload"), null, "the bespoke upload button is dead (2026-09-22)")
    assert.equal(document.body.querySelector('input[type="file"][accept="audio/*"]'), null, "no hidden file input rides the row — the door is the gutter icon")
    h.els.unmount()
  })
})

describe("the clips row", () => {
  it("the note counts (none / one / many) and points at the lane icons", () => {
    const h0 = clips({})
    assert.ok(screen.getByText(/none — add from a lane/i))
    h0.els.unmount()
    const h1 = clips({ audio_clips: [{ name: "a" }] })
    assert.ok(screen.getByText("1 clip on the audio lanes — drag to move, × to remove"))
    h1.els.unmount()
    clips({ audio_clips: [{ name: "a" }, { name: "b" }] })
    assert.ok(screen.getByText("2 clips on the audio lanes — drag to move, × to remove"))
  })
  // ── THE LANE-COST HINT (roadmap §14): the 3-lane audio bus law
  // states itself ON THE ROW, not only at compose — the loud
  // refusal names every competitor AFTER the Run press; the hint
  // names the budget BEFORE it.
  it("the Music row states the 3-lane audio budget (the lane-cost hint)", () => {
    const h = clips({})
    const hint = screen.getByTestId("tl-clips-lane-hint")
    assert.match(hint.textContent!, /pinned windows own their audio/i, "the door guard is stated")
    assert.match(hint.textContent!, /no bed there/i, "the music door guard is stated")
    assert.match(hint.textContent!, /ref audios mute there/i, "the voice door guard is stated")
    assert.match(hint.textContent!, /bed/i, "the bed is named as a lane spender")
    assert.match(hint.textContent!, /dialogue/i, "dialogue clips are named as lane spenders")
    assert.match(hint.textContent!, /ref/i, "refs close the competitor list")
    h.els.unmount()
  })

  it("the section heads ride the estate SectionLabel — no hand-rolled head spans (F5)", () => {
    const h = clips({ audio_clips: [{ name: "a" }] })
    // SectionLabel's own module face (hashed under the test
    // pipeline): a hand-rolled head span carries only the owner class.
    assert.match(screen.getByText("Clips").className, /_sectionLabelText_/, "the clips row's head is SectionLabel's label face")
    assert.match(screen.getByText("Lanes — words & events").className, /_sectionLabelText_/, "the inspector's head is SectionLabel's label face")
    h.els.unmount()
  })
})

// (the missing-tests audit #8, 2026-11-06) the lane-menu handler
// chain had no driving arm against the real handlers — spies now:
// open → reclass → text edit → delete, and one-menu-at-a-time.
describe("the lane inspector's own verbs (audit #8)", () => {
  it("reclass through the menu commits the patch; typing commits words; delete fires", () => {
    const updates: Array<[string, Record<string, unknown>]> = []
    const dels: string[] = []
    const els = render(
      <RunRefsClips
        layerA={{ audio_clips: [
          { id: "c1", name: "bed.mp3", class: "music" },
          { id: "c2", name: "vo.mp3" },
        ] } as unknown as LayerA}
        updateAudioClip={(id, patch) => { updates.push([id, patch]) }}
        deleteAudioClip={(id) => { dels.push(id) }}
      />,
    )
    // open c1's lane menu and pick dialogue
    fireEvent.click(screen.getAllByTestId("tl-lane-class")[0]!)
    fireEvent.click(screen.getByText("Dialogue"))
    assert.deepEqual(updates.at(-1), ["c1", { class: "dialogue" }],
      "the menu pick commits the class patch through the real handler")
    // and the menu CLOSED on select (the row's button still reads
    // Music — the parent spy never applied the patch — so any
    // remaining "Dialogue" would be the menu still open)
    assert.equal(screen.queryAllByText("Dialogue").length, 0, "select closes the menu")
    // words commit on the same row
    fireEvent.change(screen.getAllByTestId("tl-lane-text")[0]!, { target: { value: "hello there" } })
    assert.deepEqual(updates.at(-1), ["c1", { text: "hello there" }])
    // delete fires with the row's own id
    fireEvent.click(screen.getAllByTestId("tl-lane-delete")[1]!)
    assert.deepEqual(dels, ["c2"])
    els.unmount()
  })

  it("Escape dismisses the open lane menu through the menu's own onClose (no patch committed)", () => {
    // (infra #8, 2026-11-06) the dismiss path: the row's onClose
    // closure is the one function body the select/words/delete arms
    // never execute — an undismissable menu strands the lane door
    // open with no red. Escape must close it AND commit nothing.
    const updates: Array<[string, Record<string, unknown>]> = []
    const els = render(
      <RunRefsClips
        layerA={{ audio_clips: [
          { id: "c1", name: "a.mp3", class: "sfx" },
        ] } as unknown as LayerA}
        updateAudioClip={(id, patch) => { updates.push([id, patch]) }}
        deleteAudioClip={() => {}}
      />,
    )
    fireEvent.click(screen.getAllByTestId("tl-lane-class")[0]!)
    assert.equal(screen.queryAllByText("Dialogue").length, 1, "the lane menu is open")
    fireEvent.keyDown(document.body, { key: "Escape" })
    assert.equal(screen.queryAllByText("Dialogue").length, 0, "Escape closed the menu through onClose")
    assert.deepEqual(updates, [], "a dismiss commits no class patch")
    els.unmount()
  })

  it("ONE menu open at a time — opening the second lane closes the first", () => {
    const els = render(
      <RunRefsClips
        layerA={{ audio_clips: [
          { id: "c1", name: "a.mp3", class: "sfx" },
          { id: "c2", name: "b.mp3", class: "music" },
        ] } as unknown as LayerA}
        updateAudioClip={() => {}}
        deleteAudioClip={() => {}}
      />,
    )
    const [first, second] = screen.getAllByTestId("tl-lane-class")
    fireEvent.click(first!)
    // "Dialogue" renders ONLY inside an open menu (the buttons
    // carry their current class labels — SFX/Music — never the
    // dialogue word), so its count IS the open-menu count
    assert.equal(screen.queryAllByText("Dialogue").length, 1,
      "the first lane's menu is open")
    fireEvent.click(second!)
    assert.equal(screen.queryAllByText("Dialogue").length, 1,
      "still exactly ONE menu (the first closed when the second opened)")
    els.unmount()
  })
})

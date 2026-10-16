/**
 * THE SQUARE GRAMMAR WALL — SOURCE ARM (the rail-law audit's square
 * gaps b + c, 2026-10-31): the clip/audio guides and the keyframe
 * source rode raw <input> + a global <datalist> hand-roll while
 * every other source seat in the system rides the SourceRow square.
 * The datalist is dead; the seats ride the grammar; the upload gate
 * + refusal literal are ONE law (refUtils).
 */
import { describe, it } from "vitest"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const STUDIO = join(import.meta.dirname, "..", "src", "ui", "studio")
const read = (name: string): string => readFileSync(join(STUDIO, name), "utf8")

describe("SOURCE — the datalist hand-roll is dead, the grammar rides", () => {
  it("no <datalist> and no list= binding anywhere in the studio", () => {
    for (const seat of ["CallCard.tsx", "CallCardsPanel.tsx", "CallFrameSubcard.tsx"]) {
      const text = read(seat)
      assert.ok(!text.includes("<datalist"), `${seat} hand-rolls no datalist`)
      assert.ok(!text.includes('list="tl-kf-sources"'), `${seat} binds no datalist`)
    }
  })

  it("the guide seats ride the CARD's SourceRow grammar (no raw guide inputs, no slot hand-rolls)", () => {
    // (re-pin 2026-11-06, 6e20a7546) GuideSlot/FirstFrameSlot are
    // DEAD — the keyframe epoch killed the slots; the call's guide
    // seats ride the CARD's own SourceRow rows, and the subcard is
    // SeamControls only.
    const card = read("CallCard.tsx")
    assert.ok(card.includes("<SourceRow"), "the clip/audio guides ride the card's SourceRow grammar")
    assert.ok(card.includes("data-guides="), "the guide kinds ride the card's own declared face")
    assert.ok(!card.includes("guideRaw"), "the raw guide input face is gone")
    assert.ok(!card.includes("guideInEmpty"), "the raw guide's empty class is gone")
    assert.ok(!card.includes("<GuideSlot"), "the slot hand-roll stays dead")
  })

  it("the subcard is SeamControls only; every pick/upload law is the shared SourceRow law", () => {
    // (re-pin 2026-11-06, 6e20a7546) the grammar moved: the subcard
    // owns NO slots — FirstFrameSlot/GuideSlot died with the keyframe
    // epoch; the SourceRow grammar owns every pick/upload/refusal law
    // the slots used to hand-roll.
    const sub = read("CallFrameSubcard.tsx")
    assert.ok(sub.includes("export function SeamControls"), "SeamControls is the subcard's face")
    assert.ok(!sub.includes("<SourceRow"), "the subcard renders NO pick grammar — the card owns every SourceRow seat")
    assert.ok(!sub.includes("refUtils"), "the subcard imports no upload/refusal law — the card owns them")
    assert.ok(!sub.includes("refUploadError"), "no upload gate face in the subcard")
    assert.ok(!sub.includes("export function GuideSlot"), "GuideSlot stays dead")
    assert.ok(!sub.includes("export function FirstFrameSlot"), "FirstFrameSlot stays dead")
    // the shared upload/refusal law lives in refUtils.ts (one home);
    // the pickers that seat it are the PANEL (kf subview) + the STRIP
    // PANE — the card rides FOREIGN_URL_REFUSAL at its chip commit.
    const panel = read("CallCardsPanel.tsx")
    assert.ok(panel.includes("refUploadError("), "the upload gate is the shared law (the panel's pickers)")
    assert.ok(panel.includes("FOREIGN_URL_REFUSAL"), "the foreign-URL refusal is the one literal")
    const card = read("CallCard.tsx")
    assert.ok(card.includes("FOREIGN_URL_REFUSAL"), "the card's chip commit refuses foreign URLs")
    assert.ok(!sub.includes("20 * 1024 * 1024"), "no seat-local size cap survives")
  })

  it("the kf source seat rides the subview's picker grammar — ONE spelling with the strip lane door (the lane-add parity law)", () => {
    const panel = read("CallCardsPanel.tsx")
    const utils = read("refUtils.ts")
    const strip = read("StudioStripPane.tsx")
    // (re-pin, 2026-11-06) the operator's order: NO input image square
    // — the kf seat is the subview's pick-icon rows (the audio-input
    // grammar); the panel seats NO SourceRow anywhere. The judge +
    // loader twins are DELETED from the panel: refUtils owns them and
    // BOTH doors (subview + strip lane head) import the one spelling.
    assert.ok(!panel.includes("<SourceRow"), "no SourceRow square survives in the panel")
    assert.ok(panel.includes("classifyImageSrc("), "the commit judge is refUtils' classifier (never a hand-roll)")
    assert.ok(panel.includes("loadImageMedia"), "the image loader is refUtils' module-scope export")
    assert.ok(!panel.includes("const classifyImage"), "the panel's local classifier twin is DEAD")
    assert.ok(!panel.includes("const loadImageMedia"), "the panel's local loader twin is DEAD")
    assert.ok(strip.includes("classifyImageSrc("), "the strip's lane door judges identically — one spelling")
    assert.ok(utils.includes("export function classifyImageSrc"), "refUtils is the owner")
    assert.ok(utils.includes("byUrl.get"), "the URL→NAME honesty rides the artifact index")
    assert.ok(panel.includes("FOREIGN_URL_REFUSAL") && utils.includes("FOREIGN_URL_REFUSAL"), "a foreign pick refuses visibly")
    assert.ok(panel.includes("refUploadError("), "the upload gate is the shared law")
    assert.ok(utils.includes("estateMediaChip"), "the estate's own media paths stay legal currency")
  })

  it("refUtils owns the shared upload law (one spelling)", () => {
    const utils = read("refUtils.ts")
    assert.ok(utils.includes("export function refUploadError"), "the genre+cap gate lives in the owner")
    assert.ok(utils.includes('export const REF_READ_ERROR'), "the read error lives in the owner")
  })
})

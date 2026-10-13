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

  it("the guide seats ride GuideSlot (no raw guide inputs)", () => {
    const card = read("CallCard.tsx")
    assert.ok(card.includes("<GuideSlot"), "the clip/audio guides ride GuideSlot")
    assert.ok(!card.includes("guideRaw"), "the raw guide input face is gone")
    assert.ok(!card.includes("guideInEmpty"), "the raw guide's empty class is gone")
  })

  it("GuideSlot is the anchor's twin: SourceRow + the shared upload/refusal law", () => {
    const sub = read("CallFrameSubcard.tsx")
    assert.ok(sub.includes("export function GuideSlot"), "GuideSlot is exported")
    const body = sub.slice(sub.indexOf("export function GuideSlot"))
    assert.ok(body.includes("<SourceRow"), "the guide rides the SourceRow grammar")
    assert.ok(body.includes("refUploadError("), "the upload gate is the shared law")
    assert.ok(body.includes("FOREIGN_URL_REFUSAL"), "the foreign-URL refusal is the one literal")
    assert.ok(!body.includes("vocabulary"), "no seat-local refusal spelling survives")
    // the anchor rides the same shared law (no seat-local caps/spellings)
    const anchor = sub.slice(sub.indexOf("export function FirstFrameSlot"), sub.indexOf("export function GuideSlot"))
    assert.ok(anchor.includes("refUploadError("), "the anchor rides the shared upload gate")
    assert.ok(!anchor.includes("20 * 1024 * 1024"), "no seat-local size cap survives")
    assert.ok(anchor.includes("FOREIGN_URL_REFUSAL"), "the anchor's refusal is the one literal")
  })

  it("the kf source seat rides SourceRow through the artifact-index door", () => {
    const panel = read("CallCardsPanel.tsx")
    const kfSeat = panel.slice(panel.indexOf("THE KF SOURCE SEAT"))
    assert.ok(kfSeat.includes("<SourceRow"), "the kf source rides the SourceRow grammar")
    assert.ok(kfSeat.includes("byUrl.get"), "the URL→NAME honesty rides the artifact index")
    assert.ok(kfSeat.includes("FOREIGN_URL_REFUSAL"), "a foreign pick refuses visibly")
    assert.ok(kfSeat.includes("refUploadError("), "the upload gate is the shared law")
  })

  it("refUtils owns the shared upload law (one spelling)", () => {
    const utils = read("refUtils.ts")
    assert.ok(utils.includes("export function refUploadError"), "the genre+cap gate lives in the owner")
    assert.ok(utils.includes('export const REF_READ_ERROR'), "the read error lives in the owner")
  })
})

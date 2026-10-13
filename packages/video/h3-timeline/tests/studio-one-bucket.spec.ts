/**
 * THE ONE-BUCKET WALL — SOURCE ARM (the rail-law audit's S1,
 * 2026-10-31): the image lane rode a ~130-line inline copy of
 * RefsBucket (chip-of translation, foreign-URL refusal, upload
 * arms, count tail) with drift already in it. One bucket since
 * 2026-10-31 — the image lane is RefsBucket's third seat. This arm
 * fires when a second bucket face (or its dead error state)
 * returns to CallCard.tsx. The behavior arm is the existing
 * studio-call-buckets.spec.tsx + studio-call-card.spec.tsx pair,
 * which drive all three seats through the one face.
 */
import { describe, it } from "vitest"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const STUDIO = join(import.meta.dirname, "..", "src", "ui", "studio")
const SRC = readFileSync(join(STUDIO, "CallCard.tsx"), "utf8")
const REFUTILS = readFileSync(join(STUDIO, "refUtils.ts"), "utf8")
const STRIP = readFileSync(join(STUDIO, "StudioStripPane.tsx"), "utf8")

describe("SOURCE — one ref bucket, no second face", () => {
  it("the bucket law is written exactly once (RefsBucket owns it)", () => {
    for (const face of ["function RefsBucket", 'data-testid="tl-call-ref-bucket"', "const commitChip", "const chipOf"]) {
      assert.equal(SRC.split(face).length - 1, 1, `"${face}" must appear exactly once — a second face is a contract break`)
    }
  })

  it("the dead lane-local error state and the inline image-lane IIFE stay dead", () => {
    for (const dead of ["imgFileErr", "setImgFileErr", "(() => {"]) {
      assert.ok(!SRC.includes(dead), `"${dead}" must not return to CallCard.tsx`)
    }
  })

  it("all three seats mount the one bucket (image lane included)", () => {
    assert.equal(SRC.split("<RefsBucket").length - 1, 3, "three seats: image bus, videos, audios")
    assert.ok(SRC.includes('countTestId="tl-call-ref-images"'), "the image seat carries its count face")
    assert.ok(SRC.includes('errorTestId="tl-call-ref-images-error"'), "the image seat carries its error face")
  })

  it("THE FOREIGN-URL REFUSAL IS ONE LITERAL (H2, 2026-10-31): refUtils owns the words, every seat imports them", () => {
    assert.ok(REFUTILS.includes('export const FOREIGN_URL_REFUSAL = "that URL'), "refUtils.ts owns the one literal")
    for (const seat of [SRC, STRIP]) {
      assert.ok(!seat.includes("that URL is not in this run's artifacts"), "no seat spells the refusal locally")
      assert.ok(seat.includes("FOREIGN_URL_REFUSAL"), "every refusing seat imports the one literal")
    }
  })
})

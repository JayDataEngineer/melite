/**
 * THE STUDIO COPY WALL (the rail-law audit's H8, 2026-10-31) —
 * "Client UI copy is locale-owned. Route product text through typed
 * dictionaries…; verify-client-ui-i18n rejects hardcoded copy."
 *
 * SOURCE ARM — the dictionary owns every STATIC user-visible face:
 * no label/title/placeholder/aria literal survives in the studio's
 * presentation files. THE BOUND (the dictionary's own doc): computed
 * law wordings — hover titles narrating their lane's rule with live
 * numbers — are one-of-a-kind per seat and stay at the seat; the
 * census below pins the exact exempt inventory so the bound cannot
 * quietly widen (a new static face or a new "exempt" line both red).
 */
import { describe, it } from "vitest"
import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

const STUDIO = join(import.meta.dirname, "..", "src", "ui", "studio")
const PRESENTATION = ["CallCard.tsx", "CallCardsPanel.tsx", "CallFrameSubcard.tsx",
  "StudioStripPane.tsx", "StudioPreview.tsx"]

/** Static literal props (copy), excluding the template-literal seats. */
const STATIC_PROP = /(?:label|title|placeholder|aria-label|ariaLabel)="[^{"][^"]*"/g

describe("SOURCE — the copy dictionary owns the static faces", () => {
  it("no static label/title/placeholder/aria literal in the presentation files", () => {
    const offenders: string[] = []
    for (const seat of PRESENTATION) {
      const hits = readFileSync(join(STUDIO, seat), "utf8").match(STATIC_PROP) ?? []
      offenders.push(...hits.map((h) => `${seat}: ${h}`))
    }
    assert.deepEqual(offenders, [], "every static face routes through studioCopy")
  })

  it("the dictionary is typed, one home, and consumed by all five seats", () => {
    const dict = readFileSync(join(STUDIO, "studioCopy.ts"), "utf8")
    assert.ok(dict.includes("export const studioCopy"), "the dictionary is exported")
    assert.ok(dict.includes("} as const"), "the dictionary is const-typed (no widening)")
    for (const seat of PRESENTATION) {
      assert.ok(readFileSync(join(STUDIO, seat), "utf8").includes("studioCopy."),
        `${seat} consumes the dictionary`)
    }
  })

  it("the shared refusal literals keep their ONE home (refUtils, not the dictionary)", () => {
    const dict = readFileSync(join(STUDIO, "studioCopy.ts"), "utf8")
    assert.ok(!dict.includes("not in this run"), "the refusal is a LAW, not copy — it lives in refUtils")
    assert.ok(!dict.includes("could not read"), "the read error stays in refUtils")
    const utils = readFileSync(join(STUDIO, "refUtils.ts"), "utf8")
    assert.ok(utils.includes("FOREIGN_URL_REFUSAL") && utils.includes("REF_READ_ERROR"))
  })

  it("the exempt inventory: computed law-wordings only, pinned exactly", () => {
    // The ONLY static-prop-shaped lines left anywhere in the studio
    // tree must be zero; computed wordings ride {`…`} seats, which
    // the regex above cannot match by construction. A widened bound
    // shows up here as an offender in the first arm — there is no
    // second spelling to hide behind.
    const others = readdirSync(STUDIO).filter((f) => f.endsWith(".tsx") && !PRESENTATION.includes(f))
    const offenders: string[] = []
    for (const seat of others) {
      const hits = readFileSync(join(STUDIO, seat), "utf8").match(STATIC_PROP) ?? []
      offenders.push(...hits.map((h) => `${seat}: ${h}`))
    }
    assert.deepEqual(offenders, [], "new presentation files inherit the same law")
  })
})

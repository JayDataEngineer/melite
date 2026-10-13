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
/** The presentation roster is DERIVED (readdir), never a
 * hand-maintained list: a new studio component joins the law the
 * moment it lands. Exempt by name: studioCopy.ts (the dictionary
 * itself) and component.tsx (the shared base — renders no copy of
 * its own; the exempt-inventory arm below still sweeps it for
 * static literals, so the exemption cannot hide a face). */
const SEATS = readdirSync(STUDIO).filter((f) => f.endsWith(".tsx")
  && f !== "studioCopy.ts" && f !== "component.tsx").sort()

/** Static literal props (copy), excluding the template-literal seats. */
const STATIC_PROP = /(?:label|title|placeholder|aria-label|ariaLabel)="[^{"][^"]*"/g

describe("SOURCE — the copy dictionary owns the static faces", () => {
  it("no static label/title/placeholder/aria literal in the presentation files", () => {
    const offenders: string[] = []
    for (const seat of SEATS) {
      const hits = readFileSync(join(STUDIO, seat), "utf8").match(STATIC_PROP) ?? []
      offenders.push(...hits.map((h) => `${seat}: ${h}`))
    }
    assert.deepEqual(offenders, [], "every static face routes through studioCopy")
  })

  it("the dictionary is typed, one home, and consumed by every presentation seat", () => {
    const dict = readFileSync(join(STUDIO, "studioCopy.ts"), "utf8")
    assert.ok(dict.includes("export const studioCopy"), "the dictionary is exported")
    assert.ok(dict.includes("} as const"), "the dictionary is const-typed (no widening)")
    for (const seat of SEATS) {
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
    const others = readdirSync(STUDIO).filter((f) => f.endsWith(".ts")
      || (!SEATS.includes(f) && f !== "studioCopy.ts"))
    const offenders: string[] = []
    for (const seat of others) {
      const hits = readFileSync(join(STUDIO, seat), "utf8").match(STATIC_PROP) ?? []
      offenders.push(...hits.map((h) => `${seat}: ${h}`))
    }
    assert.deepEqual(offenders, [], "new presentation files inherit the same law")
  })

  it("CENSUS — the dictionary is non-empty, every entry consumed, count pinned at 19", () => {
    // THE CENSUS (the 2026-11-02 docs-plane finding H5): a
    // dictionary nobody reads is a locale theater — every entry
    // must be consumed by at least one presentation seat (a dead
    // entry reds naming its id), and the count is a PINNED literal
    // so an added or removed entry reds until this wall re-pins it
    // (the one-number law: the count is judged, never derived from
    // the file it watches).
    const dict = readFileSync(join(STUDIO, "studioCopy.ts"), "utf8")
    const ids = [...dict.matchAll(/^  ([a-zA-Z][a-zA-Z0-9]*): "/gm)].map((m) => m[1]!)
    assert.ok(ids.length > 0, "the dictionary is non-empty")
    assert.equal(ids.length, 19, `the dictionary holds 19 copy ids (found ${ids.length}) — re-pin this wall when copy is added or removed`)
    // THE NON-EMPTY VALUE (the 2026-11-04 docs-plane finding F2):
    // the id regex alone matches `foo: ""` — an empty-string value
    // would sail green through every other face. Each entry's
    // rendered copy must be at least one non-space character.
    const empties = [...dict.matchAll(/^  ([a-zA-Z][a-zA-Z0-9]*): "([^\n]*)"/gm)]
      .filter((m) => m[2]!.trim() === "")
      .map((m) => m[1]!)
    assert.deepEqual(empties, [], "every dictionary entry renders non-empty copy (an empty-string value reds naming its id)")
    const consumed = SEATS.map((seat) => readFileSync(join(STUDIO, seat), "utf8")).join("\n")
    const dead = ids.filter((id) => !consumed.includes(`studioCopy.${id}`))
    assert.deepEqual(dead, [], "every dictionary entry is consumed by a presentation seat")
  })
})

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
 * moment it lands. Exempt by name: studioCopy.ts only (the
 * dictionary itself — the copy owner). The shared base
 * (component.tsx) is a seat since the copy cure (2026-11-05): its
 * doc readout + run fold consume the dictionary, so the old
 * exemption is gone — the roster holds every .tsx but the owner. */
const SEATS = readdirSync(STUDIO).filter((f) => f.endsWith(".tsx")
  && f !== "studioCopy.ts").sort()

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

  it("F-B3 — the track-name seat: docModel routes the lane names through the dict", () => {
    // (2026-11-05) the gutter names render on the vendored canvas
    // (draw.ts fillText) and interpolate into the bar's templates —
    // melite chrome at a `name:` property no census arm counts. The
    // value-equal literal keeps every render byte-identical, so the
    // judge is the SOURCE seat: VIDEO_TIMELINE_TRACKS must CALL the
    // dict (a byte-identical literal revert reds here AND deads the
    // census arm below — two arms, one law).
    const src = readFileSync(join(STUDIO, "docModel.ts"), "utf8")
    // (2026-11-05) the clip/audio guide lanes died with the pin
    // channel (keyframes ARE image pins — one lane); only the image
    // guide's name survives.
    for (const key of ["imageGuideLane"] as const) {
      assert.ok(src.includes(`studioCopy.${key}`),
        `the guide-lane name regressed to a literal — consume studioCopy.${key} in VIDEO_TIMELINE_TRACKS`)
    }
  })

  it("CENSUS — the dictionary is non-empty, every entry consumed, count pinned at 102", () => {
    // THE CENSUS (the 2026-11-02 docs-plane finding H5): a
    // dictionary nobody reads is a locale theater — every entry
    // must be consumed by at least one presentation seat (a dead
    // entry reds naming its id), and the count is a PINNED literal
    // so an added or removed entry reds until this wall re-pins it
    // (the one-number law: the count is judged, never derived from
    // the file it watches).
    // RE-PIN 2026-11-05 (the copy cure): 19 → 87. The 68 new flat
    // strings are the residue the census could not see coming home
    // (26 knob faces + 42 seat faces); the 27 dict functions carry
    // the parameterized faces and sit outside the string-id count
    // by construction (the id regex only matches `: "` values).
    // RE-PIN 2026-11-05 (the keyframe slice): 87 → 88. +1 =
    // deleteKeyframeTip — the kf row's Delete tooltip rode a `k.kind`
    // interpolation; the pin channel is image pins, the fixed wording
    // lands in the dict first (the dict-first law).
    // RE-PIN 2026-11-05 (the timeline completion): 88 → 99. +11 flat
    // ids seeded DICT-FIRST ahead of the parallel lanes (audit
    // F-B1/F-B2/F-B3/F-B6/F11 + slice 3's lane keys): overCapTail,
    // overBusTail, the three guide-lane names, dropSnapHint,
    // dropInteriorHint, gapRefusal, keyframeLaneHint,
    // stripEmptyPromptsHint, previewEmptyHint. The parameterized
    // seats (clipHeader, chip aria/readout, preview metas) ride as
    // functions, outside this count by construction. The every-entry
    // -consumed arm may red transiently until each lane's consumers
    // land — the orchestrator's merge verifies the final green.
    const dict = readFileSync(join(STUDIO, "studioCopy.ts"), "utf8")
    const ids = [...dict.matchAll(/^  ([a-zA-Z][a-zA-Z0-9]*): "/gm)].map((m) => m[1]!)
    assert.ok(ids.length > 0, "the dictionary is non-empty")
    // RE-PIN 2026-11-05 (the live-defect wave): 93 → 92. The wave-6
    // cuts left dead keys behind and the guide-lane names died with
    // the clip/audio lanes; +1 refModsHint (the mods bucket names
    // its own currency now). The pin rides the found census.
    // RE-PIN 2026-11-06 (defect B + the submenu law): 92 → 97
    // (keyframe subview) → 100 (backToGlobalTip one-spelling +
    // audioSubTitle + audioSubHint). → 102 (D2: imagePreviewAria +
    // imagePreviewDialog + imagePreviewClose for the DSH lightbox's
    // locale-owned labels).
    // +6 flat ids (keyframesDoor, keyframesDoorTip, kfAddAria,
    // kfAddTip, kfEmptyNote — the subview's door/add/empty faces —
    // and the refModsHint re-pin rides above); −1 kfSourceLabel (the
    // input image square died with the SourceRow grammar; the rows
    // are pick icons now). kfRowPickAria rides as a function, outside
    // this count by construction.
    // RE-PIN 2026-11-06 (C6, the imageless pin): 101 → 102. +1 flat id
    // = keyframePendingHint (the pending chip's drop-hint law); its
    // sibling faces keyframePendingAria/keyframePendingReadout ride as
    // functions, outside this count by construction. All three are
    // consumed by the strip's chip mapping (the pending branch).
    // RE-PIN 2026-11-08 (ERRORS e, the plan-text deletion): 102 → 101.
    // −1 refModsHint — the operator deleted the mods bucket's plan-text
    // line ("It is plan text… people will know that already or not
    // care"), reversing the 2026-11-05 naming law it landed under.
    // RE-PIN 2026-11-08 (G7, the merge law's word): 101 → 102. +1 flat
    // id = countMergedTail (the mods bucket's " · merged" count dot);
    // its sibling face modDeclaredChipTitle rides as a function,
    // outside this count by construction.
    // RE-PIN 2026-11-12 (§9 rail-audit cure N1): 102 → 103. +1 flat id
    // = commissionDetailJoin (the seats↔geometry separator, moved out
    // of the pane's literal); its sibling faces commissionMalformed /
    // commissionBadEntry ride as functions, outside this count.
    assert.equal(ids.length, 103, `the dictionary holds 103 copy ids (found ${ids.length}) — re-pin this wall when copy is added or removed`)
    // RE-PIN 2026-10-16 (the square-grammar residue): 102 → 101.
    // removePack died with the strip Button (187eaf607 deleted the
    // verb; SourceRow's onEdit("") owns the detach) — a fossil id
    // consumed by no seat redded the every-entry-consumed arm at
    // HEAD. The census law stands: a dead id is removed, never left
    // as locale theater.
    // THE NON-EMPTY VALUE (the 2026-11-04 docs-plane finding F2):
    // the id regex alone matches `foo: ""` — an empty-string value
    // would sail green through every other face. Each entry's
    // rendered copy must be at least one non-space character.
    const empties = [...dict.matchAll(/^  ([a-zA-Z][a-zA-Z0-9]*): "([^\n]*)"/gm)]
      .filter((m) => m[2]!.trim() === "")
      .map((m) => m[1]!)
    assert.deepEqual(empties, [], "every dictionary entry renders non-empty copy (an empty-string value reds naming its id)")
    // The consumers: every presentation seat PLUS the doc model AND
    // the doc-calls mapper — the knob labels' single home since the
    // copy cure (docModel imports the dict; its KNOB_LABELS record
    // keeps the KnobKey shape over dict words), and since the F-B1
    // cure (2026-11-05) the strip clip-header's home is docCalls'
    // callsToPrompts (studioCopy.clipHeader) — a flat entry read by
    // neither reds.
    const consumed = [...SEATS, "docModel.ts", "docCalls.ts"]
      .map((seat) => readFileSync(join(STUDIO, seat), "utf8")).join("\n")
    const dead = ids.filter((id) => !consumed.includes(`studioCopy.${id}`))
    assert.deepEqual(dead, [], "every dictionary entry is consumed by a presentation seat")
  })
})

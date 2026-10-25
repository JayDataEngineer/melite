// phantom-key-class.spec.ts — THE PHANTOM-KEY LAW, the class wall
// (operator 2026-10-19, after the Card Rail Seat Kit landed: "Is there
// a way we can turn this into automated, deterministic test for all
// cards?" — the sweep's answer, dev_docs/audits/
// phantom-key-class-sweep-2026-10-19.md §7, landed here verbatim).
//
// THE INVARIANT (the (d) burn generalized — commit 19ad4ea22): a
// hydrate map must never MATERIALIZE an own-key `undefined` on a
// counting seam. deepEqualJson (dsh-util-values) compares OWN-KEY
// COUNTS, so a 2-key hydrated bag `{id, strength: undefined}` never
// matches the 1-key stamp `{id}` — the recipe face burned blank for a
// month under all-green suites because no wall judged the shape, only
// the value. Three arms:
//
//   ARM A — THE PROPERTY BATTERY (pure): every hydrate map in the
//           roster, over a derived corpus (the registry's own recipe
//           stamps + a fixed adversarial battery), satisfies
//           LAW 1  settle stability: deepEqualJson(H(S(H(d))), H(d))
//                  — the projection the lane shows after a settle
//                  still deep-equals (own-key counts) the doc.
//           LAW 2  phantom freedom: no own-key `undefined` inside the
//                  bags that reach a COUNTING seam (per-map class
//                  below; digest-class maps carry a NAMED exemption
//                  whose comment states the flip condition).
//   ARM B — THE JOURNEY RIDER (jsdom, the kit): every card whose
//           served spec carries a Recipe row stamping a BAG
//           (array/object-valued wire_defaults — derived from the
//           booted card defs, never a hand list) mounts the shared
//           RecipePills face through the Card Rail Seat Kit, picks
//           every row through the real event path, and journals the
//           row on the face AFTER the card's own settle round-trip —
//           and the settled bag carries no phantom keys.
//   ARM C — THE ROSTER CENSUS: the filesystem-derived hydrate roster
//           equals the imported roster, both directions. A new
//           hydrate map cannot appear without riding Arms A/B (the
//           registry-wall lesson: a law outside the registry is a law
//           nobody tracks).
//
// THE SEAM CLASSES (evidence, not mood):
//   counting  hydrateLayerA — the recipe-stamp seam: card-base
//             spec.ts's pick/hold comparison deepEqualJson's the
//             loras bag against the served stamps (spec.ts:964/:1037/
//             :1182/:1657). THE (d) seam. LAW 2 fires here.
//   digest    hydrateCalls, hydrateKeyframes, hydrateConstraints,
//             hydrateMotionPrompts — their consumers read the bags
//             through serializers whose digests filter undefined
//             (serializeCalls/serializeKeyframes retirement digests,
//             pendingOps/motionDoc canonicalJson, the viser transport).
//             FLIP CONDITION (the named exemption, the rig lesson): a
//             consumer that deepEqualJson-counts a whole hydrated row
//             against a stamp turns that map's LAW 2 arm ON — the map
//             then owes the conditional-spread cure, not a skip.

import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { deepEqualJson } from "@deepseek-ai/dsh-util-values"
import { DECL as h3Decl } from "@melite/models-h3"
import { hydrateLayerA, serializeLayerA } from "../../../../packages/video/h3-timeline/src/ui/studio/docHydrate.ts"
import {
  hydrateCalls,
  hydrateKeyframes,
  serializeCalls,
  serializeKeyframes,
} from "../../../../packages/video/h3-timeline/src/ui/studio/docCalls.ts"
import {
  hydrateConstraints,
  hydrateMotionPrompts,
  serializeConstraints,
  serializeMotionPrompts,
} from "../../../../packages/web-kit/formats/src/motionConstraints.ts"
import {
  projectMotionDoc,
  serializeChannel,
  serializePromptsParams,
} from "../../../../packages/motion/motion/src/ui/studio/motionDoc.ts"

// ── THE ROSTER (Arm C's imported half) — every hydrate map the
//    estate ships, its settle-pair serializer, its seam class, and
//    the bags LAW 2 walks. The FILESYSTEM half is derived below; this
//    table is the conscious judgment (the class + the seam bags are
//    decisions, not greps).
const ROSTER: Array<{
  file: string
  hydrate: string
  serialize: string
  seam: "counting" | "digest"
  /** strict: the pair is a deepEqualJson fixed point. text+count: the
   *  map's OWN documented contract (hydrateMotionPrompts' 2026-09-12
   *  proof: the serialization rounds — boundaries may drift a frame;
   *  TEXT and segment COUNT are what persists). A weaker stability
   *  than the map's own doc comment is a wall narrating, not judging. */
  stability: "strict" | "text+count"
  H: (d: unknown) => unknown
  S: (h: never) => unknown
}> = [
  {
    file: "packages/video/h3-timeline/src/ui/studio/docHydrate.ts",
    hydrate: "hydrateLayerA", serialize: "serializeLayerA", seam: "counting", stability: "strict",
    H: (d) => hydrateLayerA(d as never),
    S: (a) => serializeLayerA(a),
  },
  {
    file: "packages/video/h3-timeline/src/ui/studio/docCalls.ts",
    hydrate: "hydrateCalls", serialize: "serializeCalls", seam: "digest", stability: "strict",
    H: (d) => hydrateCalls(d as never),
    // serializeCalls emits the bare row array; the hydrate door takes
    // the DOC WRAPPER ({calls}) — the pair's shape seam, not a fudge.
    S: (c) => ({ calls: serializeCalls(c) }),
  },
  {
    file: "packages/video/h3-timeline/src/ui/studio/docCalls.ts",
    hydrate: "hydrateKeyframes", serialize: "serializeKeyframes", seam: "digest", stability: "strict",
    H: (d) => hydrateKeyframes(d),
    S: (k) => serializeKeyframes(k),
  },
  {
    file: "packages/web-kit/formats/src/motionConstraints.ts",
    hydrate: "hydrateConstraints", serialize: "serializeConstraints", seam: "digest", stability: "strict",
    H: (d) => hydrateConstraints(d),
    S: (c) => serializeConstraints((c as { keyframes: never }).keyframes, (c as { payloads: never }).payloads),
  },
  {
    file: "packages/web-kit/formats/src/motionConstraints.ts",
    hydrate: "hydrateMotionPrompts", serialize: "serializeMotionPrompts", seam: "digest", stability: "text+count",
    H: (d) => hydrateMotionPrompts(d, 30, 300),
    S: (p) => serializeMotionPrompts(p, 30),
  },
]

/** Walk the estate's src trees for exported hydrate functions — the
 *  REAL files, never a frozen census (the depth law). */
function filesystemRoster(): string[] {
  const out = new Set<string>()
  const walk = (dir: string): void => {
    let entries: string[] = []
    try { entries = readdirSync(dir) } catch { return }
    for (const name of entries) {
      if (name === "node_modules" || name === "lib" || name === "dist" || name === "tests" || name.startsWith(".")) continue
      const full = join(dir, name)
      let st
      try { st = statSync(full) } catch { continue }
      if (st.isDirectory()) { walk(full); continue }
      if (!/\.(ts|tsx)$/.test(name)) continue
      const text = readFileSync(full, "utf8")
      if (/export (async )?function hydrate[A-Z]/.test(text)) out.add(full)
    }
  }
  walk("packages")
  return [...out].sort()
}

/** Recursive own-key walk: true when any own property anywhere holds
 *  `undefined` (the phantom shape — own-key counts see it, values
 *  never do). */
function hasOwnUndefined(v: unknown, depth = 0): boolean {
  if (depth > 12 || v === null || typeof v !== "object") return false
  if (Array.isArray(v)) return v.some((e) => hasOwnUndefined(e, depth + 1))
  for (const [k, e] of Object.entries(v as Record<string, unknown>)) {
    if (e === undefined || hasOwnUndefined(e, depth + 1)) {
      void k
      return true
    }
  }
  return false
}

/** The whole-doc round trip the settle plane rides: hydrate ∘
 *  serialize ∘ hydrate. */
function settled<H extends (d: unknown) => unknown, S extends (h: never) => unknown>(
  d: unknown, Hf: H, Sf: S,
): unknown {
  const once = Hf(d)
  if (once === null || once === undefined) return once
  return Hf(Sf(once as never))
}

// ── THE DERIVED CORPUS. The stamps are the registry's OWN recipe
//    payloads (the input shapes a doc can hold — derived, never a
//    hand transcription); the battery is the fixed adversarial set
//    the sweep pinned. Deterministic: no randomness, no dates.
const h3BagStamps: Array<Record<string, unknown>> = []
for (const row of (h3Decl as { variants?: Array<Record<string, unknown>> }).variants ?? []) {
  const wd = row["wire_defaults"] as Record<string, unknown> | undefined
  const loras = wd?.["loras"]
  if (Array.isArray(loras)) for (const e of loras) h3BagStamps.push(e as Record<string, unknown>)
}

const LAYERA_CORPUS: Array<{ name: string, doc: Record<string, unknown> }> = [
  { name: "the registry's own stamps", doc: { loras: h3BagStamps } },
  { name: "THE (d) BURN SHAPE — id-only entry", doc: { loras: [{ id: "h3_turbo8_v1" }] } },
  { name: "stamped + id-only mixed", doc: { loras: [{ id: "a", strength: 0.5 }, { id: "b" }] } },
  { name: "the explicit empty bag (J1)", doc: { loras: [] } },
  { name: "seeded knob doc", doc: { seed: 7, steps: 8, width: 1344, height: 768, loras: [{ id: "x", strength: 0.5 }] } },
  { name: "the second-pass rider", doc: { second_pass_enabled: true, refine_lora: "h3_taomate_3step", refine_strength: 0.6, refine_steps: 3, loras: [{ id: "y" }] } },
]

const CALLS_CORPUS: Array<{ name: string, doc: unknown }> = [
  { name: "plain calls", doc: { calls: [{ text: "a", start_frame: 0, end_frame: 48 }, { text: "b", start_frame: 48, end_frame: 96 }] } },
  { name: "string-encoded array (the legacy class)", doc: { calls: JSON.stringify([{ text: "s", start_frame: 0, end_frame: 24 }]) } },
  { name: "beats legacy spelling", doc: { beats: [{ text: "beat", start_frame: 0, end_frame: 12 }] } },
  { name: "corrupt string (the silent-replacement class)", doc: { calls: "[{oops" } },
  { name: "absent", doc: {} },
]

const KEYFRAMES_CORPUS: Array<{ name: string, doc: unknown }> = [
  { name: "sorted image pins", doc: [{ image: "a.png", frame: 12 }, { image: "b.png", frame: 48 }] },
  { name: "legacy source spelling", doc: [{ source: "old.png", frame: 6 }] },
  { name: "non-image kind rows (the loud-drop class)", doc: [{ image: "c.png", frame: 3, kind: "clip" }] },
  { name: "frameless rows", doc: [{ image: "d.png" }] },
  { name: "not an array", doc: { nope: 1 } },
]

// The constraints corpus is the transport's OWN output shape (the
// digest's fixed point) — a real SOMA payload (the encoded-f32
// spellings) plus the degrading junk.
const CONSTRAINTS_DOC = {
  keyframes: [
    { uuid: "kf-1", track_id: "fullbody", frame: 2 },
    { uuid: "kf-2", track_id: "root2d", frame: 10 },
  ],
  payloads: {
    "kf-1": { kind: "fullbody", frame: 2, jp: "AA", jr: "BB" },
    "kf-2": { kind: "root2d", frame: 10, x: 0.5, z: -1 },
  },
}
const CONSTRAINTS_CORPUS: Array<{ name: string, doc: unknown }> = [
  { name: "the transport's own shape", doc: CONSTRAINTS_DOC },
  { name: "the STRING wire form (the persist's shape)", doc: JSON.stringify(CONSTRAINTS_DOC) },
  { name: "missing keyframes array", doc: { payloads: {} } },
  { name: "junk scalar", doc: 42 },
  { name: "null", doc: null },
]

const PROMPTS_CORPUS: Array<{ name: string, doc: unknown }> = [
  { name: "timed segments", doc: JSON.stringify([{ text: "walks", duration_sec: 2 }, { text: "turns", duration_sec: 1 }]) },
  { name: "empty string", doc: "" },
  { name: "non-array JSON", doc: '{"text":"x"}' },
  { name: "segment without text (the loud null)", doc: JSON.stringify([{ duration_sec: 1 }]) },
  { name: "not a string", doc: [{ text: "x" }] },
]

function corpusOf(hydrate: string): Array<{ name: string, doc: unknown }> {
  switch (hydrate) {
    case "hydrateLayerA": return LAYERA_CORPUS
    case "hydrateCalls": return CALLS_CORPUS
    case "hydrateKeyframes": return KEYFRAMES_CORPUS
    case "hydrateConstraints": return CONSTRAINTS_CORPUS
    case "hydrateMotionPrompts": return PROMPTS_CORPUS
    default: throw new Error("roster entry " + hydrate + " declares no corpus — a new map rides Arm A with its own battery")
  }
}

describe("THE PHANTOM-KEY LAW (the class wall — no hydrate map materializes an own-key undefined on a counting seam)", () => {
  it("ARM C — the filesystem roster equals the imported roster, both directions (function grain, per file)", () => {
    // FUNCTION grain, not file grain: docCalls.ts carries TWO maps —
    // a file-count census would admit a second unjudged map there.
    const fsCounts: Record<string, number> = {}
    for (const file of filesystemRoster()) {
      const text = readFileSync(file, "utf8")
      fsCounts[file] = (text.match(/export (async )?function hydrate[A-Z]/g) ?? []).length
    }
    const importedCounts: Record<string, number> = {}
    for (const r of ROSTER) importedCounts[r.file] = (importedCounts[r.file] ?? 0) + 1
    expect(
      fsCounts,
      "a hydrate map EXISTS on the filesystem that no roster entry imports — it rides Arm A/B or the law does not know it",
    ).toEqual(importedCounts)
    expect(Object.values(fsCounts).reduce((a, b) => a + b, 0), "the roster cannot shrink to nothing (a sweep that finds nothing is a dead wall)").toBeGreaterThan(3)
    for (const entry of ROSTER) {
      const text = readFileSync(entry.file, "utf8")
      expect(text, entry.hydrate + " is exported").toMatch(new RegExp("export (async )?function " + entry.hydrate))
      expect(text, entry.serialize + " — the settle pair's serializer — is exported from the same module").toMatch(new RegExp("export (async )?function " + entry.serialize))
    }
  })

  it("ARM A LAW 1 — every map's settle round-trip is deepEqualJson-stable over the whole corpus", () => {
    for (const entry of ROSTER) {
      for (const { name, doc } of corpusOf(entry.hydrate)) {
        const once = entry.H(doc)
        const twice = settled(doc, entry.H, entry.S)
        if (entry.stability === "text+count") {
          const a = once as Array<{ text: unknown }> | null
          const b = twice as Array<{ text: unknown }> | null
          expect(
            (a === null) === (b === null) && (a === null || (a.length === b!.length && a.every((seg, i) => seg.text === b![i]!.text))),
            `${entry.hydrate} over "${name}": the settle round-trip lost text or a segment — the map's own documented contract (text + count persist)`,
          ).toBe(true)
        } else {
          expect(
            deepEqualJson(twice, once),
            `${entry.hydrate} over "${name}": the settle round-trip moved the doc — H(S(H(d))) must deep-equal H(d) (own-key counts; the (d) mechanics)`,
          ).toBe(true)
        }
      }
    }
  })

  it("ARM A LAW 2 — the counting seam's bags carry no own-key undefined (the phantom freedom)", () => {
    for (const entry of ROSTER) {
      if (entry.seam !== "counting") continue
      for (const { name, doc } of corpusOf(entry.hydrate)) {
        const hydrated = entry.H(doc) as Record<string, unknown>
        const bags = Object.entries(hydrated).filter(([, v]) => Array.isArray(v) && v.length > 0 && typeof v[0] === "object")
        for (const [bag, entries] of bags) {
          for (let i = 0; i < (entries as unknown[]).length; i++) {
            const e = (entries as unknown[])[i]
            expect(
              hasOwnUndefined(e),
              `${entry.hydrate} over "${name}": ${bag}[${i}] materialized an own-key undefined — THE PHANTOM KEY (own-key counts never match the stamp; the (d) burn). The cure is the conditional spread, never a post-hoc delete.`,
            ).toBe(false)
          }
        }
      }
    }
  })

  it("ARM A — the digest class's exemption is NAMED with its flip condition (the rig lesson: an unnamed skip is a hole)", () => {
    const digest = ROSTER.filter((r) => r.seam === "digest").map((r) => r.hydrate)
    expect(digest, "the digest class is exactly the four maps whose consumers filter undefined — a new map must declare its class consciously").toEqual([
      "hydrateCalls", "hydrateKeyframes", "hydrateConstraints", "hydrateMotionPrompts",
    ])
  })

  it("ARM D — the always-emit census: settling a NOTHING-stated doc adds exactly the ledgered keys, at every save door (spelling-independent)", () => {
    // (the card-hydrate audit, 2026-11-12, gaps 1+2): Arms A–C key on
    // `hydrate*` spellings and per-map corpora — a doc-builder named
    // `project*` (motion's projectMotionDoc is the live example)
    // never rides them, and the always-emit serializers are "latent
    // materializations whose safety rests on an invariant no wall
    // states." THIS arm judges the settled DOC, not the map's name:
    // settle a doc that states NOTHING, derive the added keys, and
    // demand exact equality with the LEDGER — a new always-emit key
    // reds until it is admitted consciously (with its reason), and a
    // ledgered key that stops emitting reds as a dead ledger row.
    // ── h3 LayerA's save door (serializeLayerA over the empty layer)
    const h3Added = Object.keys(serializeLayerA(hydrateLayerA({}))).sort()
    expect(
      h3Added,
      "h3 LayerA always-emit ledger — seed + the five pin-equals-default dials (docHydrate's own six-key emit, derived 2026-11-12)",
    ).toEqual([
      "interpolate_enabled", "seed", "sharpen_enabled",
      "sla_disable_fp16_accum", "sla_protect_audio", "sla_stabilize_motion",
    ])
    // ── motion's save door: the params doc both channels merge on
    // onSave, driven through the projection itself (the audit's
    // escape example, judged by behavior through its own serializer)
    const projected = projectMotionDoc(undefined, 30, 300)
    const motionParams: Record<string, unknown> = {
      ...serializePromptsParams(projected.prompts, 30),
      motion_constraints: serializeChannel(projected, "constraints"),
    }
    expect(
      Object.keys(motionParams).sort(),
      "motion save-door always-emit ledger — the prompts pair (motion_prompts + its single-prompt mirror) + the constraints wire param",
    ).toEqual(["motion_constraints", "motion_prompts", "prompt"])
    // ── gap 2's other half: no recipe stamp rides an always-emit key
    // (a stamp key the serializer ALWAYS writes would shadow every
    // pick with the stamp's value — the birth grammar must carry it
    // or the stamp must move). Derived over the real DECL variants.
    const h3Emit = new Set(h3Added)
    const stampCollisions: string[] = []
    for (const row of (h3Decl as { variants?: Array<Record<string, unknown>> }).variants ?? []) {
      const wd = row["wire_defaults"] as Record<string, unknown> | undefined
      for (const key of wd === undefined || wd === null || typeof wd !== "object" ? [] : Object.keys(wd)) {
        if (h3Emit.has(key)) stampCollisions.push(`${row["id"]}:${key}`)
      }
    }
    expect(
      stampCollisions,
      "no h3 recipe stamp may ride an always-emit key (the stamp would shadow every settle)",
    ).toEqual([])
  })

  it("ARM E — the digest promise holds: every digest-class serializer's persisted output carries no own-key undefined over the whole corpus (the flip condition's premise, executed)", () => {
    // (the card-hydrate audit, 2026-11-12, gap 3): the digest class's
    // exemption rests on "consumers read the bags through serializers
    // whose digests filter undefined" — the header's FLIP CONDITION
    // was comment-law until here. This arm EXECUTES the premise: for
    // every digest map, hydrate the corpus and run the settle
    // serializer — a serializer that MATERIALIZES an own-key
    // undefined into its persisted output breaks the digest promise
    // (a downstream counter would see the phantom), so the map flips
    // to the counting class and owes the conditional-spread cure.
    // The declaration (ROSTER.seam) plus this arm make the flip
    // condition a judged law, not a named skip.
    for (const entry of ROSTER) {
      if (entry.seam !== "digest") continue
      for (const { name, doc } of corpusOf(entry.hydrate)) {
        const once = entry.H(doc)
        if (once === null || once === undefined) continue
        const persisted = entry.S(once as never)
        expect(
          hasOwnUndefined(persisted),
          `${entry.hydrate} over "${name}": ${entry.serialize} materialized an own-key undefined into its persisted output — the digest promise (undefined filtered before persist) is false; the map flips to the counting class and owes the conditional-spread cure`,
        ).toBe(false)
      }
    }
  })
})

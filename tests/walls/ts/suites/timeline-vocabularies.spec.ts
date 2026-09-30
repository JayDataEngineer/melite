import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { EDITOR_ONLY_SEGMENT_KEYS } from "../../../../packages/web-kit/contracts/src/timelineTypes.ts";
import { CALL_KEYS, CALL_KNOB_KEYS, KNOB_ORDER, LEGACY_KNOB_KEY } from "../../../../packages/models/h3/src/timelineContract.ts";
import { hydrateCalls, serializeCalls } from "../../../../packages/video/h3-timeline/src/ui/studio/docCalls.ts";

// THE TIMELINE'S THREE OWNERS, PINNED (the census's C5). The
// editor's SegmentParams (web-kit/contracts/timelineTypes.ts), the
// card's param schema + call vocabulary (h3-timeline/card.ts +
// timelineContract.ts), and the studio's doc model
// (ui/studio/docModel.ts) each hold a piece of one document, and
// their key NAMES do not all overlap: the editor says
// `samplingSteps`/`guideScale` where the card says
// `steps`/`sampler_name`.
//
// That is not automatically a bug — the bridge (LEGACY_KNOB_KEY) is
// the declared translation, and the studio drops an unknown knob
// LOUDLY. What must never happen is a key that is silently lost:
// one that reaches neither the card's surface nor the bridge. This
// wall is the class-killer: every knob the editor or the card names
// has a declared route, and the bridge is a real total function over
// the editor's own names.
describe("the timeline's three vocabularies have no silent third", () => {
  it("the knob bridge covers every editor-side sampler/scheduler/guidance name", () => {
    // the editor's own key names (timelineTypes.SegmentParams) that
    // the card spells differently must each appear in the bridge
    const types = readFileSync(
      new URL("../../../../packages/web-kit/contracts/src/timelineTypes.ts", import.meta.url),
      "utf8",
    );
    // indent-agnostic on purpose: the interface is one-space indented,
    // and the wall audit's M11 found the ORIGINAL two-space regex had
    // never matched a single key — segmentKeys was dead from birth,
    // which is why no arm missed it. Scoped to the interface's own
    // body (the file carries other interfaces whose keys are not this
    // vocabulary). The census floor below makes rot loud forever.
    const segBody = types.match(/export interface SegmentParams \{([\s\S]*?)\n\}/)?.[1] ?? "";
    const segmentKeys = [...segBody.matchAll(/^ +([a-z][A-Za-z0-9_]*)\??:/gm)].map((m) => m[1]!);;
    // the editor's own defaults table names the ones that matter
    // (line-start keys only — mid-line comments say things like
    // "operator order:" and are not defaults rows)
    const defaults = types.match(/DEFAULT_SEGMENT_PARAMS: SegmentParams = \{([\s\S]*?)\n\}/)?.[1] ?? "";
    const editorNames = [...defaults.matchAll(/^ +([a-z][A-Za-z0-9_]*)\s*:/gm)].map((m) => m[1]!);
    // F-C1 (the wall audit): the defaults census needs its own floor —
    // a rename of DEFAULT_SEGMENT_PARAMS rots the regex to editorNames
    // = [] and the membership loop below then asserts NOTHING (zero
    // green while the law is broken).
    expect(editorNames.length, "the DEFAULT_SEGMENT_PARAMS census found no rows — the regex rotted").toBeGreaterThan(0);
    // THE ESCAPE HATCH IS PINNED TOO (the wall audit's M11): a key in
    // EDITOR_ONLY_SEGMENT_KEYS that SegmentParams does not declare
    // would excuse a typo forever — accepted by the classifier, never
    // read against the interface it claims to bless.
    expect(segmentKeys.length, "the SegmentParams census found no members — the regex rotted").toBeGreaterThan(0);
    for (const blessed of EDITOR_ONLY_SEGMENT_KEYS) {
      expect(
        segmentKeys.includes(blessed),
        `EDITOR_ONLY_SEGMENT_KEYS blesses '${blessed}', which SegmentParams does not declare — the hatch excuses a key that does not exist`,
      ).toBe(true);
    }
    // and the defaults table names real interface keys (a defaults row
    // for an interface key that was renamed is its own silent rot)
    for (const name of editorNames) {
      expect(
        segmentKeys.includes(name),
        `DEFAULT_SEGMENT_PARAMS names '${name}', which SegmentParams does not declare`,
      ).toBe(true);
    }
    // Object.values of the knob map carries the literal union — the
    // wall only needs membership, so read it as a string set.
    const bridged: ReadonlySet<string> = new Set<string>(Object.values(LEGACY_KNOB_KEY));
    const cardKeys = new Set<string>([...KNOB_ORDER, ...CALL_KNOB_KEYS]);
    // The card's TOP-LEVEL params (seed, width, height, …) are a
    // different plane from the per-call knobs: an editor segment key
    // that is one of those reaches the run as a call-level field, not
    // through the knob bridge. The paramSchema moved family-side
    // (stroke E's single-home law) — read the family schema's own
    // top-level keys so the wall judges "reaches the card" correctly.
    const card = readFileSync(
      new URL("../../../../packages/models/h3/src/schema.ts", import.meta.url),
      "utf8",
    );
    const topLevel = new Set(
      [...card.matchAll(/^\s{2}([a-z][A-Za-z0-9_]*):\s*z\./gm)].map((m) => m[1]!),
    );
    for (const name of new Set([...segmentKeys, ...editorNames])) {
      // every INTERFACE key (not just the defaults) is classified —
      // segmentKeys was computed and never used (M11's second half):
      // a key added to SegmentParams outside the defaults table was
      // silently unpinned. It reaches the card SOMEWHERE — its own
      // knob surface, a declared translation, or a top-level field —
      // never both-nor (silently lost on the way to a run).
      expect(
        bridged.has(name) || cardKeys.has(name) || topLevel.has(name) || EDITOR_ONLY_SEGMENT_KEYS.has(name),
        `editor key '${name}' is UNCLASSIFIED: it reaches neither the card's knob surface, its ` +
        `top-level fields, the bridge, nor the declared editor-only set — it is silently lost on ` +
        `the way to a run (editor defaults: ${editorNames.join(', ')})`,
      ).toBe(true);
    }
    // and the bridge itself is total: every value is a real card key
    for (const [from, to] of Object.entries(LEGACY_KNOB_KEY)) {
      expect(cardKeys.has(to), `the bridge maps '${from}' to '${to}', which the card does not declare`).toBe(true);
    }
  });

  it("the call vocabulary and the knob vocabulary are disjoint (a call is not a knob)", () => {
    for (const call of CALL_KEYS) {
      expect(CALL_KNOB_KEYS.has(call), `call key '${call}' also names a knob — the two vocabularies must not overlap`).toBe(false);
    }
  });

  it("the studio drops an unknown knob LOUDLY (never silently)", () => {
    // F-C2 (the wall audit): this arm was substring-matched once —
    // both regexes survived in comments while the drop broke. The
    // pin is BEHAVIOURAL now: feed a foreign knob through the real
    // hydration, spy the warn, and assert the knob never reaches the
    // serialized doc while a declared knob rides through.
    const warned: string[] = [];
    const origWarn = console.warn;
    console.warn = (...a: unknown[]) => { warned.push(a.join(" ")); };
    let hydrated: ReturnType<typeof hydrateCalls>;
    try {
      hydrated = hydrateCalls({
        calls: [
          {
            start_frame: 0, end_frame: 45,
            text: "a shot",
            knobs: { steps: 8, bogus_knob_zz: 5 },
          },
        ],
      });
    } finally {
      console.warn = origWarn;
    }
    expect(warned.some((w) => w.includes('dropping unknown call knob "bogus_knob_zz"')), `the foreign knob warns: ${JSON.stringify(warned)}`).toBe(true);
    const wire = serializeCalls(hydrated);
    const knobs = (wire[0] as unknown as { knobs?: Record<string, unknown> }).knobs ?? {};
    expect(knobs["bogus_knob_zz"], "the foreign knob never reaches the wire").toBeUndefined();
    expect(knobs["steps"], "the declared knob rides through").toBe(8);
  });
});

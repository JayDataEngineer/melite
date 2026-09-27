import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { EDITOR_ONLY_SEGMENT_KEYS } from "../../../../packages/web-kit/contracts/src/timelineTypes.ts";
import { CALL_KEYS, CALL_KNOB_KEYS, KNOB_ORDER, LEGACY_KNOB_KEY } from "../../../../packages/video/h3-timeline/src/timelineContract.ts";

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
    const segmentKeys = [...types.matchAll(/^\s{2}([a-z][A-Za-z0-9_]*)\??:/gm)].map((m) => m[1]!);
    // the editor's own defaults table names the ones that matter
    const defaults = types.match(/DEFAULT_SEGMENT_PARAMS: SegmentParams = \{([\s\S]*?)\n\}/)?.[1] ?? "";
    const editorNames = [...defaults.matchAll(/([a-z][A-Za-z0-9_]*)\s*:/g)].map((m) => m[1]!);
    const bridged = new Set(Object.values(LEGACY_KNOB_KEY));
    const cardKeys = new Set<string>([...KNOB_ORDER, ...CALL_KNOB_KEYS]);
    // The card's TOP-LEVEL params (seed, width, height, …) are a
    // different plane from the per-call knobs: an editor segment key
    // that is one of those reaches the run as a call-level field, not
    // through the knob bridge. Read the card's own top-level keys so
    // the wall judges "reaches the card" correctly.
    const card = readFileSync(
      new URL("../../../../packages/video/h3-timeline/src/card.ts", import.meta.url),
      "utf8",
    );
    const topLevel = new Set(
      [...card.matchAll(/^\s{2}([a-z][A-Za-z0-9_]*):\s*z\./gm)].map((m) => m[1]!),
    );
    for (const name of editorNames) {
      // every editor default key reaches the card SOMEWHERE — its
      // own knob surface, a declared translation, or a top-level
      // field — never both-nor (silently lost on the way to a run).
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
    const src = readFileSync(
      new URL("../../../../packages/video/h3-timeline/src/ui/studio/docCalls.ts", import.meta.url),
      "utf8",
    );
    expect(src).toMatch(/dropping unknown call knob/);
    // and the drop is guarded by the SAME vocabulary the card uses
    expect(src).toContain("CALL_KNOB_KEYS.has(k)");
  });
});

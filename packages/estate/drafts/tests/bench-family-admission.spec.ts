// bench-family-admission.spec.ts — THE FAMILY ADMISSION at the write
// doors (journey-closure B5, 2026-10-17 — hop 3's first judge).
//
// The patch door's admission claims to judge "the params the NEXT
// run would compose" (bench.ts, the merged-view seat). Pre-B5 that
// claim was dict membership (the model board + the lane surface):
// a Final-Cut stamp on a keyframe doc — the merged view derives t4r
// under the stamp — green-lit every write door and the RUN press was
// the first judge. The cure rides the injected admission's third
// judge: remote.ts familyAdmissionOf → the registry's
// admitStageFamily → the card's own CardDefinition.admitFamily
// clause (the run door's walk clause, ONE contract spelling). The
// REAL clause half is walled family-side (h3-timeline card.spec.ts
// against def.schema) and registry-side (estate-queue's admission
// matrix against the REAL defs); THIS suite walls the door arms:
// the refusal voice/code, the row that never lands, the state that
// stays editable (a JUDGE, not a bench guard — the operator's
// no-blocker ruling), the restore carve, and the trio fold.
import { test, describe } from "vitest";
import assert from "node:assert/strict";
import {
  ensureBench, getBench, patchBench, addStageBench,
} from "../src/bench.ts";
import {
  admissionOf, benchAdmissionOf, familyAdmissionOf, RESTORED_PROVENANCE,
} from "../src/remote.ts";
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import { boot, codeOf } from "./bench-helpers.ts";

// The resolver stub: the family clause a family-conditional card
// declares. The VERDICT VOICE here is the walk's verbatim refusal —
// the same string the real h3 face returns (walled verbatim against
// the REAL walk in h3-timeline's card.spec.ts).
const FAMILY_RESOLVER = {
  resolveStageParams: (): null => null,
  admitStageFamily: (card: string, params: Record<string, unknown>): { ok: true } | { ok: false; error: string } => {
    void card;
    const stamps = ["second_pass_enabled", "sr_switch"].filter((k) => params[k] !== undefined);
    const keyed = params["keyframes"] as unknown[] | undefined;
    if (Array.isArray(keyed) && keyed.length > 0 && stamps.length > 0) {
      return {
        ok: false,
        error: "card 'h3-timeline' refused params: h3_window(t4r): unsanctioned inject keys: "
          + stamps.sort().join(", "),
      };
    }
    return { ok: true };
  },
};

interface CtxLike { get(name: string, optional?: boolean): unknown }
function ctxWithResolver(resolver: unknown): CtxLike {
  return { get: (name: string): unknown => (name === "cardRegistry" ? resolver : undefined) };
}

// THE FINAL-CUT-STAMPED KEYFRAME DOC (the burn: Final Cut saved
// pre-keyframe; the doc gained a pin; the merged view derives t4r
// under the stamp).
const STAMPED_ROW = {
  keyframes: [{ image: "webp/run1/pin-0.png", frame: 0 }],
  second_pass_enabled: true,
  sr_switch: true,
  steps: 20,
};

describe("familyAdmissionOf — the write doors' arm of the walk", () => {
  test("a Final-Cut stamp on a keyframe doc refuses with the run door's own voice (bench/family-refusal)", () => {
    const admit = familyAdmissionOf(ctxWithResolver(FAMILY_RESOLVER) as never);
    assert.ok(admit !== undefined);
    assert.throws(
      () => admit("h3-timeline", { ...STAMPED_ROW }, undefined),
      (e: unknown) => e instanceof RemoteError
        && e.code === "bench/family-refusal"
        && e.message === "card 'h3-timeline' refused params: h3_window(t4r): unsanctioned inject keys: second_pass_enabled, sr_switch",
    );
  });

  test("a film-shaped view passes (the family honors the stamps on its own lane)", () => {
    const admit = familyAdmissionOf(ctxWithResolver(FAMILY_RESOLVER) as never);
    assert.ok(admit !== undefined);
    admit("h3-timeline", { calls: [{ text: "a", start_frame: 0, end_frame: 90 }], sr_switch: true }, undefined);
  });

  test("a RESTORED row rides the carve — the archive loads; the run teaches", () => {
    const admit = familyAdmissionOf(ctxWithResolver(FAMILY_RESOLVER) as never);
    assert.ok(admit !== undefined);
    admit("h3-timeline", { ...STAMPED_ROW }, RESTORED_PROVENANCE);
  });

  test("a registry-less lane (or a registry without the seam) admits nothing — the no-op law", () => {
    assert.equal(familyAdmissionOf(ctxWithResolver(undefined) as never), undefined);
    assert.equal(familyAdmissionOf(ctxWithResolver({ resolveStageParams: (): null => null }) as never), undefined);
  });
});

describe("benchAdmissionOf — the composed trio (model, lane, family)", () => {
  test("absent everywhere: no admission closure", () => {
    assert.equal(benchAdmissionOf(ctxWithResolver(undefined) as never), undefined);
  });

  test("every judge present: ALL three judge, in order, and any refusal refuses", () => {
    const order: string[] = [];
    const resolver = {
      resolveStageParams: (): null => null,
      admitStageModel: (): { ok: true } => { order.push("model"); return { ok: true }; },
      admitStageRelations: (): { ok: true } => { order.push("lane"); return { ok: true }; },
      admitStageFamily: (): { ok: true } => { order.push("family"); return { ok: true }; },
    };
    const admit = benchAdmissionOf(ctxWithResolver(resolver) as never);
    assert.ok(admit !== undefined);
    admit("h3-timeline", {}, undefined);
    assert.deepEqual(order, ["model", "lane", "family"]);

    const refusing = {
      ...resolver,
      admitStageFamily: (): { ok: false; error: string } => ({ ok: false, error: "the family clause refused" }),
    };
    const familyAdmit = benchAdmissionOf(ctxWithResolver(refusing) as never);
    assert.ok(familyAdmit !== undefined);
    assert.throws(() => familyAdmit("h3-timeline", {}, undefined), /the family clause refused/);
  });

  test("the family judge alone still composes a closure (the fold drops absent seats)", () => {
    const admit = benchAdmissionOf(ctxWithResolver({
      resolveStageParams: (): null => null,
      admitStageFamily: FAMILY_RESOLVER.admitStageFamily,
    }) as never);
    assert.ok(admit !== undefined);
    assert.throws(() => admit("h3-timeline", { ...STAMPED_ROW }, undefined), /bench\/family-refusal|unsanctioned/);
  });
});

describe("THE PATCH DOOR judges the family (bench.ts's merged-view admission seat)", () => {
  test("a patch onto a Final-Cut-stamped keyframe row refuses bench/family-refusal — the row never lands the poison", async () => {
    const drafts = await boot();
    await ensureBench(drafts, { session: "s" });
    // the row: the STAMPED KEYFRAME doc already stored (a pre-law
    // save — it landed admission-less, the pre-B5 state; the JUDGE-
    // not-guard law: the state sits, unblocked)
    const row = await addStageBench(drafts, "s", {
      card: "h3-timeline", params: { ...STAMPED_ROW }, expect_rev: 0,
    });
    // THE PATCH: an ordinary knob write — the merged view is the
    // stamped keyframe doc, and the door refuses in the run door's
    // own voice, one hop earlier than the run press
    assert.match(
      await codeOf(patchBench(drafts, "s", {
        stage: row.stage, params: { width: 1344 }, expect_rev: 1,
      }, familyAdmissionOf(ctxWithResolver(FAMILY_RESOLVER) as never) ?? undefined)),
      /^bench\/family-refusal\|card 'h3-timeline' refused params: h3_window\(t4r\): unsanctioned inject keys: second_pass_enabled, sr_switch$/,
    );
    // the verdict refused the WRITE, never the STATE: the row keeps
    // its pre-patch params, editable (the no-blocker ruling)
    const after = getBench(drafts, "s");
    const stageRow = (after.stages as Array<Record<string, unknown>>).find((r) => r["id"] === row.stage);
    assert.deepEqual(stageRow?.["params"], STAMPED_ROW, "the refused patch landed nothing");
    // THE CURE IS EXPRESSIBLE AT THE SAME DOOR: unsetting the stamp
    // (the merge-patch null delete) lands — the doc the next run
    // composes no longer derives t4r under a stamp
    const cured = await patchBench(drafts, "s", {
      stage: row.stage, params: { second_pass_enabled: null, sr_switch: null, width: 1344 }, expect_rev: 1,
    }, familyAdmissionOf(ctxWithResolver(FAMILY_RESOLVER) as never) ?? undefined);
    assert.equal(cured.rev, 2);
    const curedRow = (getBench(drafts, "s").stages as Array<Record<string, unknown>>).find((r) => r["id"] === row.stage);
    assert.deepEqual(curedRow?.["params"], {
      keyframes: STAMPED_ROW.keyframes, steps: 20, width: 1344,
    }, "the stamps deleted; the doc composes on its lane");
  });

  test("a patch onto a FILM-shaped row lands — the clause is family-conditional, not a blanket ban", async () => {
    const drafts = await boot();
    await ensureBench(drafts, { session: "s" });
    const row = await addStageBench(drafts, "s", {
      card: "h3-timeline",
      params: { calls: [{ text: "a", start_frame: 0, end_frame: 90 }], sr_switch: true },
      expect_rev: 0,
    }, familyAdmissionOf(ctxWithResolver(FAMILY_RESOLVER) as never) ?? undefined);
    const patched = await patchBench(drafts, "s", {
      stage: row.stage, params: { steps: 12 }, expect_rev: 1,
    }, familyAdmissionOf(ctxWithResolver(FAMILY_RESOLVER) as never) ?? undefined);
    assert.deepEqual(patched.patched, ["steps"]);
  });

  test("a card WITHOUT a family contract passes untouched (the no-op law)", async () => {
    const drafts = await boot();
    await ensureBench(drafts, { session: "s" });
    const row = await addStageBench(drafts, "s", {
      card: "image-gen", params: { prompt: "x" }, expect_rev: 0,
    }, familyAdmissionOf(ctxWithResolver(FAMILY_RESOLVER) as never) ?? undefined);
    const patched = await patchBench(drafts, "s", {
      stage: row.stage, params: { steps: 30 }, expect_rev: 1,
    }, familyAdmissionOf(ctxWithResolver(FAMILY_RESOLVER) as never) ?? undefined);
    assert.deepEqual(patched.patched, ["steps"]);
  });

  test("the ADD door judges the same clause (one admission, every write door)", async () => {
    const drafts = await boot();
    await ensureBench(drafts, { session: "s" });
    assert.match(
      await codeOf(addStageBench(drafts, "s", {
        card: "h3-timeline", params: { ...STAMPED_ROW }, expect_rev: 0,
      }, familyAdmissionOf(ctxWithResolver(FAMILY_RESOLVER) as never) ?? undefined)),
      /^bench\/family-refusal\|/,
    );
    assert.equal((getBench(drafts, "s").stages as unknown[]).length, 0, "the poisoned row never landed");
  });

  test("the composed bench admission folds the family judge into every bench write", async () => {
    const drafts = await boot();
    await ensureBench(drafts, { session: "s" });
    const admit = benchAdmissionOf(ctxWithResolver(FAMILY_RESOLVER) as never);
    assert.ok(admit !== undefined);
    assert.match(
      await codeOf(addStageBench(drafts, "s", {
        card: "h3-timeline", params: { ...STAMPED_ROW }, expect_rev: 0,
      }, admit)),
      /^bench\/family-refusal\|/,
    );
  });

  test("the model admission's own factory still resolves on a family-less resolver (no regression of the pair fold)", () => {
    const admit = admissionOf(ctxWithResolver({
      resolveStageParams: (): null => null,
      admitStageModel: (card: string, model: unknown) =>
        model === "gibberish-net"
          ? { ok: false as const, error: "model '" + String(model) + "' is not offered", offered: ["krea-2"] }
          : { ok: true as const },
    }) as never);
    assert.ok(admit !== undefined);
    assert.throws(() => admit("image-gen", { model: "gibberish-net" }, undefined), /is not offered/);
    admit("image-gen", { model: "krea-2" }, undefined);
  });
});

// resources-census-honesty.spec.ts — THE CENSUS HONESTY LAW (the
// anima burn, operator 2026-10-20: the sidebar read "Declared
// resources 1/1 failed — model family/anima" while every anima file
// sat byte-exact on disk — the lane's provisioning store holds ZERO
// anima rows; the 'failed' was the STATUS BUDGET'S OWN ARTIFACT).
//
// THE MECHANISM (audit h3-frames-anima B2-1/B2-3): the status
// reconcile rides a 1.5s budget (managePlane STATUS_RECONCILE_MS);
// a sha256 census of a healthy estate cannot land inside it. The
// pre-cure reconcile BROKE its loop on abort — a truncated roster
// served as the whole declared truth ("1/1") — and an inspect
// thrown mid-abort wore the FAILED token (refusalFor maps a
// cancelled check to 'cancelled', the catch painted it 'failed').
//
// THE LAW: an aborted census NEVER truncates and NEVER fails — every
// declared ref it did not inspect rides an 'unknown' row (the
// scan's own artifact), so the roster stays row-complete, the
// consumer can mark the census partial (census_partial), and no
// health verdict is invented from a timeout. The REAL service runs;
// the inspector hangs until the abort cuts it.
import { afterEach, describe, expect, test } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { ProvisioningService } from "../src/index.ts";
import type {
  ArtifactWriterPort,
  DeclarationPort,
  ProvisionPlan,
  ProvisioningConfig,
  ResourceRef,
} from "../src/index.ts";

const contexts: Context[] = [];
const roots: string[] = [];

afterEach(async () => {
  for (const context of contexts.splice(0)) await context.fiber.dispose();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "provisioning-census-"));
  roots.push(root);
  return root;
}

function refOf(id: string): Extract<ResourceRef, { kind: "model" }> {
  return { kind: "model", owner: "family", id };
}

/** A roster of N families, one declared item each. */
function rosterOf(ids: readonly string[]): DeclarationPort {
  return multiItemRoster(ids.map((id) => [id, 1] as const));
}

/** A roster of families with N declared items each — the F1 shape:
 *  the census cut lands INSIDE one family's item list. */
function multiItemRoster(spec: readonly (readonly [id: string, itemCount: number])[]): DeclarationPort {
  const plans = new Map<string, ProvisionPlan>(spec.map(([id, count]) => [id, {
    ref: refOf(id),
    items: Array.from({ length: count }, (_, index): ProvisionPlan["items"][number] => ({
      kind: "model",
      key: `model:family:${id}::w${index}.safetensors`,
      owner: "family",
      id,
      name: `w${index}.safetensors`,
      folder: "checkpoints",
      url: `https://example.invalid/${id}-${index}.safetensors`,
      // a declared digest seats the disk check on the artifact
      // writer's inspect — the census door the budget cut rides
      sha256: "a".repeat(64),
      sizeBytes: 1,
      required: true,
      provider: "direct",
    })),
  }]));
  const ids = spec.map(([id]) => id);
  return {
    resolve: async (target: ResourceRef): Promise<ProvisionPlan> => {
      const plan = plans.get(target.id);
      if (plan === undefined) throw new Error("no plan for " + target.id);
      return plan;
    },
    list: async (): Promise<readonly ResourceRef[]> => ids.map(refOf),
  };
}

/** A census that hangs on the second ref's disk check until the
 * abort signal cuts it — the budget-artifact shape the burn rode. */
function hangingWriter(cutAfter: number): ArtifactWriterPort {
  let checked = 0;
  return {
    inspect: async (_item, signal) => {
      checked += 1;
      if (checked <= cutAfter) return { present: true, sizeBytes: 1 };
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, 30_000);
        signal?.addEventListener("abort", () => { clearTimeout(timer); reject(new Error("aborted")) }, { once: true });
      });
      throw new Error("unreachable");
    },
    write: async () => { throw new Error("the census never writes") },
  };
}

describe("the resources census honesty law (the anima burn)", () => {
  test("AN ABORTED CENSUS IS ROW-COMPLETE AND UNKNOWN, never truncated, never failed", async () => {
    const context = new Context();
    contexts.push(context);
    const ids = ["anima", "moss-image", "h3", "anny"];
    const service = new ProvisioningService(context, {
      declaration: rosterOf(ids),
      // the first ref's disk check lands; the second HANGS until the
      // abort cuts it — the status-budget shape the burn rode
      artifactWriter: hangingWriter(1),
      storeRoot: tempRoot(),
    } satisfies ProvisioningConfig);

    const controller = new AbortController();
    const flight = service.reconcile(undefined, controller.signal);
    // let the first inspect land, then cut the census mid-roster
    await new Promise((resolve) => { setTimeout(resolve, 25) });
    controller.abort();
    const rows = await flight;

    assert.equal(rows.length, ids.length,
      "the aborted census must stay ROW-COMPLETE — a truncated roster served as the whole declared truth (the burn's '1/1')");
    const states = rows.map((row) => row.state);
    expect(states.filter((s) => s === "failed"),
      "no row may wear the failed token from the scan's own abort",
    ).toHaveLength(0);
    const unknown = rows.filter((row) => row.state === "unknown");
    expect(unknown.length,
      "every ref the scan did not check rides an unknown row",
    ).toBeGreaterThanOrEqual(ids.length - 1);
    for (const row of unknown) {
      assert.match(row.detail ?? "", /scan incomplete/,
        "the unknown row names its own cause — the scan's budget, never a health verdict");
    }
  });

  test("A CANCELLED CHECK NEVER WEARS THE FAILED TOKEN (refusalFor's cancelled outcome is a census artifact)", async () => {
    const context = new Context();
    contexts.push(context);
    // every disk check rejects IMMEDIATELY with the abort already
    // armed — the same throw class the mid-abort cut produces
    const writer: ArtifactWriterPort = {
      inspect: async () => {
        const aborted = new Error("operation cancelled");
        aborted.name = "AbortError";
        throw aborted;
      },
      write: async () => { throw new Error("the census never writes") },
    };
    const service = new ProvisioningService(context, {
      declaration: rosterOf(["anima"]),
      artifactWriter: writer,
      storeRoot: tempRoot(),
    } satisfies ProvisioningConfig);

    const controller = new AbortController();
    controller.abort();
    const rows = await service.reconcile(undefined, controller.signal);

    assert.equal(rows.length, 1);
    expect(rows[0]?.state,
      "a cancelled check riding 'failed' is the burn's exact shape — the sidebar red over byte-exact files",
    ).toBe("unknown");
  });

  test("A QUIET CENSUS ANSWERS WHOLE (the positive control: no unknown rows, no partial)", async () => {
    const context = new Context();
    contexts.push(context);
    const ids = ["anima", "moss-image"];
    const service = new ProvisioningService(context, {
      declaration: rosterOf(ids),
      artifactWriter: hangingWriter(ids.length),
      storeRoot: tempRoot(),
    } satisfies ProvisioningConfig);

    const rows = await service.reconcile(undefined);
    assert.equal(rows.length, ids.length);
    expect(rows.filter((row) => row.state === "unknown")).toHaveLength(0);
    expect(rows.filter((row) => row.state === "failed")).toHaveLength(0);
  });

  // AUDIT F1 (infra-resources-census-honesty, 2026-10-20): the abort
  // law stopped at the REF boundary — inspect()'s item loop-top break
  // truncated the row's item list and aggregateState invented a
  // verdict over unchecked bytes (a 2-item family read 'active' with
  // items 2→1; a post-plan cut read 'absent' with zero items; no
  // 'unknown' anywhere, so census_partial never fired). The ref-level
  // law mirrored one level down: every unchecked ITEM rides an
  // 'unknown' item row.
  test("AN ITEM-LEVEL CUT IS ITEM-COMPLETE AND UNKNOWN — the truncated 'active' family never returns", async () => {
    const context = new Context();
    contexts.push(context);
    const service = new ProvisioningService(context, {
      // ONE family, THREE declared items: item 0 checks, item 1
      // hangs until the abort cuts it (the catch arm), item 2 is cut
      // at the loop top — both F1 doors in one roster
      declaration: multiItemRoster([["anima", 3]]),
      artifactWriter: hangingWriter(1),
      storeRoot: tempRoot(),
    } satisfies ProvisioningConfig);

    const controller = new AbortController();
    const flight = service.reconcile(undefined, controller.signal);
    await new Promise((resolve) => { setTimeout(resolve, 25) });
    controller.abort();
    const rows = await flight;

    assert.equal(rows.length, 1);
    const row = rows[0];
    expect(row.items.length,
      "the item roster stays COMPLETE — the F1 truncation (2→1 items) seeded 'active' over an unchecked byte range",
    ).toBe(3);
    expect(row.state,
      "the row aggregates 'unknown' over its unchecked items — never 'active'",
    ).toBe("unknown");
    expect(row.items[0]?.state).toBe("active");
    const unchecked = row.items.filter((item) => item.state === "unknown");
    expect(unchecked.length,
      "both cut doors ride unknown — the mid-check throw AND the loop-top cut",
    ).toBe(2);
    for (const item of unchecked) {
      assert.match(item.detail ?? "", /scan incomplete/,
        "each unchecked item names its own cause");
    }
  });

  test("A FIRST-ITEM CUT (the plan window) NEVER ANSWERS 'absent' OVER DECLARED ITEMS", async () => {
    const context = new Context();
    contexts.push(context);
    const service = new ProvisioningService(context, {
      declaration: multiItemRoster([["anima", 2]]),
      // hang on the FIRST check: the abort lands inside inspect(),
      // past the ref-level check — pre-cure the item loop broke with
      // items [] and aggregateState answered 'absent' over a
      // declared family (the auditor's probe)
      artifactWriter: hangingWriter(0),
      storeRoot: tempRoot(),
    } satisfies ProvisioningConfig);

    const controller = new AbortController();
    const flight = service.reconcile(undefined, controller.signal);
    await new Promise((resolve) => { setTimeout(resolve, 25) });
    controller.abort();
    const rows = await flight;

    assert.equal(rows.length, 1);
    const row = rows[0];
    expect(row.state,
      "the post-plan cut answered 'absent' with zero items pre-cure — a declared family is never absent because the scan was cut",
    ).toBe("unknown");
    expect(row.items.length).toBe(2);
    expect(row.items.every((item) => item.state === "unknown")).toBe(true);
    for (const item of row.items) {
      assert.match(item.detail ?? "", /scan incomplete/);
    }
    assert.match(row.detail ?? "", /scan incomplete/);
  });

  test("A REAL FAILED ITEM STANDS ITS VERDICT; THE UNCHECKED SIBLINGS STILL RIDE UNKNOWN (the masked shape census_partial must catch)", async () => {
    const context = new Context();
    contexts.push(context);
    let checked = 0;
    const writer: ArtifactWriterPort = {
      // item 0 lands with a size mismatch — a REAL checked failure;
      // item 1 hangs until the abort
      inspect: async (request, signal) => {
        checked += 1;
        if (checked === 1) return { present: true, sizeBytes: 999, path: "/p", sha256: "a".repeat(64) };
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, 30_000);
          signal?.addEventListener("abort", () => { clearTimeout(timer); reject(new Error("aborted")) }, { once: true });
        });
        throw new Error("unreachable");
      },
      write: async () => { throw new Error("the census never writes") },
    };
    const service = new ProvisioningService(context, {
      declaration: multiItemRoster([["anima", 2]]),
      artifactWriter: writer,
      storeRoot: tempRoot(),
    } satisfies ProvisioningConfig);

    const controller = new AbortController();
    const flight = service.reconcile(undefined, controller.signal);
    await new Promise((resolve) => { setTimeout(resolve, 25) });
    controller.abort();
    const rows = await flight;

    const row = rows[0];
    expect(row.state,
      "the checked failure is a real verdict — the row keeps it; the partial mark (item-level census_partial, managePlane) carries the incompleteness, not a fake 'unknown'",
    ).toBe("failed");
    expect(row.items.length).toBe(2);
    expect(row.items[0]?.state).toBe("failed");
    expect(row.items[1]?.state,
      "the unchecked sibling never absorbs the failure verdict — it rides unknown",
    ).toBe("unknown");
  });

  // AUDIT V1 (infra-census-f1-f2-verification-2026-10-20): the
  // plan()-throw abort door still seats 'failed' over zero checked
  // bytes — inspect()'s plan() catch mapped refusalFor's cancelled
  // outcome through `blocked ? "blocked" : "failed"`, so a resolve
  // that throws AFTER the budget's signal aborted wore the failure
  // token with items [] and NO census_partial (the deck painted red
  // with no note). THE PLAN DOOR rides the same law as the item
  // door: a cancelled plan resolution is the scan's own artifact.
  test("A PLAN-DOOR CUT NEVER ANSWERS 'failed' OVER ZERO CHECKED BYTES", async () => {
    const context = new Context();
    contexts.push(context);
    const declaration: DeclarationPort = {
      // resolve() outlives the abort, then throws — the real
      // production shape (the port resolves in-process with no
      // signal; the error lands after the budget closed)
      resolve: async (_target: ResourceRef): Promise<ProvisionPlan> => {
        await new Promise((resolve) => { setTimeout(resolve, 40) });
        throw new Error("declaration blew up after the budget closed");
      },
      list: async (): Promise<readonly ResourceRef[]> => [refOf("anima")],
    };
    const service = new ProvisioningService(context, {
      declaration,
      artifactWriter: hangingWriter(0),
      storeRoot: tempRoot(),
    } satisfies ProvisioningConfig);

    const controller = new AbortController();
    const flight = service.reconcile(undefined, controller.signal);
    await new Promise((resolve) => { setTimeout(resolve, 10) });
    controller.abort();
    const rows = await flight;

    assert.equal(rows.length, 1);
    const row = rows[0];
    expect(row.state,
      "a cancelled plan resolution is the scan's own artifact — never 'failed' (the V1 door painted a health verdict over zero checked bytes)",
    ).toBe("unknown");
    assert.match(row.detail ?? "", /scan incomplete/,
      "the plan cut names its own cause — the census_partial mark fires on this row");
    expect(row.items.length).toBe(0,
      "the plan never resolved — there is no item roster to fake");
  });
});

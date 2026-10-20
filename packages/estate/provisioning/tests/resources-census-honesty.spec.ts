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
  const plans = new Map<string, ProvisionPlan>(ids.map((id) => [id, {
    ref: refOf(id),
    items: [{
      kind: "model",
      key: `model:family:${id}::weight.safetensors`,
      owner: "family",
      id,
      name: "weight.safetensors",
      folder: "checkpoints",
      url: `https://example.invalid/${id}.safetensors`,
      // a declared digest seats the disk check on the artifact
      // writer's inspect — the census door the budget cut rides
      sha256: "a".repeat(64),
      sizeBytes: 1,
      required: true,
      provider: "direct",
    }],
  }]));
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
});

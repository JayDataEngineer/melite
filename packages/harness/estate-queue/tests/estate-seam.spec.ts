// estate-seam.spec.ts — the package seams: the QueueService seat
// (root, lock-first refusal, ledger face, PID-checked release on
// fiber dispose), the index plugin rows, and the resurrect adapter
// pair (thin wrappers — the discipline lives in queue.ts).
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { QueueCore } from "../src/queue.ts";
import { QueueService } from "../src/service.ts";
import { apply, runsRegistryPlugin } from "../src/index.ts";
import { bootSweep } from "../src/resurrect.ts";

let TMP = "";
afterEach(() => {
  if (TMP !== "") {
    for (const d of TMP.split(":")) rmSync(d, { recursive: true, force: true });
    TMP = "";
  }
});
const tmp = (): string => {
  const d = mkdtempSync(join(tmpdir(), "estate-seam-"));
  TMP = TMP === "" ? d : TMP + ":" + d;
  return d;
};

describe("QueueService", () => {
  it("owns the root (state, lock note, ledger face)", async () => {
    const ctx = new Context();
    const svc = new QueueService(ctx, { repoRoot: tmp() });
    assert.equal(svc.lockNote, "acquired");
    assert.ok(svc.ledgerPath.endsWith(join("output", "_ledger.jsonl")));
    assert.ok(ctx.queue instanceof QueueService);
    const tail = svc.ledger("junk", "");
    assert.deepEqual(tail.entries, []);
    assert.equal(tail.shown, 0);
    await ctx.fiber.dispose();
    assert.equal(svc.released, true);
  });

  it("the default config resolves the root from the environment", async () => {
    const root = tmp();
    process.env["MELITE_STATE_ROOT"] = join(root, "state");
    try {
      const ctx = new Context();
      const svc = new QueueService(ctx);
      assert.equal(svc.stateRoot, join(root, "state"));
      await ctx.fiber.dispose();
    } finally {
      delete process.env["MELITE_STATE_ROOT"];
    }
  });

  it("a live-held lock refuses before any side effect (dispose frees the root)", async () => {    const root = tmp();
    const first = new Context();
    new QueueService(first, { repoRoot: root });
    assert.throws(
      () => new QueueService(new Context(), { repoRoot: root }),
      /estate-queue: .*held|live|lock/,
    );
    await first.fiber.dispose();
    const second = new Context();
    const svc = new QueueService(second, { repoRoot: root });
    assert.equal(svc.lockNote, "acquired");
    await second.fiber.dispose();
  });
});

describe("index plugin rows", () => {
  it("apply seats the queue; the runs row seats the registry", async () => {
    const qctx = new Context();
    apply(qctx, { repoRoot: tmp() });
    assert.ok(qctx.queue instanceof QueueService);
    await qctx.fiber.dispose();

    const rctx = new Context();
    const q2 = new Context();
    const queue = new QueueService(q2, { repoRoot: tmp() });
    (rctx as unknown as Record<string, unknown>)["queue"] = queue;
    (rctx as unknown as Record<string, unknown>)["draftsRemote"] = {
      get: async () => ({}),
    };
    (rctx as unknown as Record<string, unknown>)["cardRegistry"] = {};
    runsRegistryPlugin.apply(rctx);
    assert.ok((rctx as unknown as Record<string, unknown>)["runs"] !== undefined);
    await rctx.fiber.dispose();
    await q2.fiber.dispose();
  });
});

describe("resurrect adapters", () => {
  it("the QueueRoots sweep adapter retires stale running claims (the hollow bootResurrect is retired with it)", () => {
    // stroke 83: bootResurrect is GONE — the service's bootReconcile
    // replays _request.json through the start door (its walls live
    // in runs-registry.spec). The adapter file still owns the
    // QueueRoots sweep signature the estate seam rides.
    const root = tmp();
    const out = join(root, "output");
    mkdirSync(join(out, "run-old"), { recursive: true });
    writeFileSync(
      join(out, "run-old", "_flow.json"),
      JSON.stringify({ status: "queued", draft_id: "d1" }),
    );
    writeFileSync(join(out, "run-old", "_request.json"), "{}");
    mkdirSync(join(out, "run-stale"), { recursive: true });
    writeFileSync(
      join(out, "run-stale", "_flow.json"),
      JSON.stringify({ status: "running", draft_id: "d1" }),
    );
    writeFileSync(join(out, "run-stale", "_request.json"), "{}");
    const roots = { stateRoot: root };
    // the queued record is LIVE work (shielded); the stale running
    // claim sweeps.
    const swept = bootSweep(roots, ["run-old"]);
    assert.ok(swept.includes("run-stale"));
    assert.ok(!swept.includes("run-old"));
  });
});

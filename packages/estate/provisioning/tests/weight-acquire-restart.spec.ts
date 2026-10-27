// @contract infra-acquire-restart-ledger
// weight-acquire-restart.spec.ts — THE RESTART MUST NOT FORGET THE LEDGER
// (ERRORS.md k2/m + ROADMAP P5 F2: "the verbs (acquire_retry/
// acquire_discard) read a PROCESS-LIFETIME ledger, so an estate
// restart forgets in-flight acquires the row still claims").
//
// THE BURN: an acquire settles FAILED and its row persists in the
// FileOperationStore — then the estate restarts. The new process's
// ledger is empty: audit E3's boot rehydrate seeds only UNFINISHED
// acquiring/verifying rows (as failed), while terminal rows "stay
// out" (pinned: provisioning.spec.ts E3 arm, progressOf("op-done")
// === null, "terminal rows stay in operationOf's court"). But that
// court — operationOf → record(ref) — is a pure in-memory Map, also
// empty after restart. So the settled-failed row the store still
// holds is invisible to BOTH progressOf (null, E3-pinned) and
// operationOf (undefined): acquire_retry and acquire_discard 404
// "unknown acquire_weight operation" for a row that exists on disk.
// The operator's one press to retry and one press to clear both die.
//
// THE LAW: a stored terminal row rejoins the live ledger at boot
// with its stored truth (state, ref, detail) — bytes reset to 0
// (the frozen count died with the old process; the ledger never
// claims bytes it has not re-statted). Then the verbs keep working
// across restarts: retry mints a fresh fetch on the rejoined ref,
// discard evicts the rejoined row. The REAL service runs here twice
// (service A settles the failure, service B is the restarted seat
// over the same store root); only the wire is faked. Red today:
// the rejoined reads answer null — the ledger is process-lifetime.
//
// CHAIN NOTE: the manage-plane verbs themselves are walled at
// packages/harness/estate-queue/tests/acquire-rescue-verbs.spec.ts
// (ARMs 6–7, populated-ledger fake). Those arms prove the verbs
// work off ANY populated ledger; THESE arms prove the ledger IS
// populated after a restart. Together they close the operator's
// hop: dead row → restart → one-press retry/discard still answers.
//
// UN-PIN LANDED WITH THE CURE: the E3 arm at
// provisioning.spec.ts ("terminal rows stay out",
// progressOf("op-done") === null) asserted the OLD law this wall
// replaces. The F2 cure rewrites that arm to the new law
// (terminal rows rejoin as stored) in the same landing — a law
// change, never test-taming — and the F2 journey auditor judges
// the rewrite.
import { describe, expect, test } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { FileOperationStore, ProvisioningService } from "../src/index.ts";
import type { OperationStorePort, ProvisionOperation, ProvisionPlan, ProvisioningConfig, ResourceRef } from "../src/index.ts";
const roots: string[] = [];

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "provisioning-weight-restart-"));
  roots.push(root);
  return root;
}

function disposeRoots(): void {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
}

const TOTAL = 100;
const LANDED = 39;
const FULL = Buffer.alloc(TOTAL, 7);

function ref(): Extract<ResourceRef, { kind: "model" }> {
  return { kind: "model", owner: "family", id: "moss-image" };
}

function plan(): ProvisionPlan {
  return {
    ref: ref(),
    items: [{
      kind: "model",
      key: "model:family:moss-image::restart.bin",
      owner: "family",
      id: "moss-image",
      name: "restart.bin",
      folder: "checkpoints",
      url: "https://example.invalid/restart.bin",
      sha256: "b".repeat(64),
      sizeBytes: TOTAL,
      required: true,
      provider: "direct",
    }],
  };
}

/** THE STALL FAKE (the wire, faked at the suite's seam — the same
 *  shape as weight-acquire-stuck.spec.ts): the byte stream lands
 *  LANDED bytes then freezes; the stall watchdog settles it FAILED. */
function stalledConfig(root: string): ProvisioningConfig {
  return {
    declaration: { resolve: async (): Promise<ProvisionPlan> => plan() },
    storeRoot: root,
    // EXPLICIT STALL BUDGET (audit F7): the service default widened
    // to 10_000ms (WAN-honest); this wall drives a real acquire to
    // its stall-settled FAILED state inside a 10s poll window, so it
    // seats its own tight budget instead of riding the default.
    acquireStallTimeoutMs: 250,
    // the composition's own wiring (melite-estate provisioningConfig):
    // the durable row lives in a FileOperationStore, never in memory
    // alone — without this seat the wall would test a store-less
    // service the estate never boots.
    operationStore: new FileOperationStore(root),
    fetcher: async (_url: string, signal?: AbortSignal) => ({
      status: 200,
      body: (async function* generate(): AsyncGenerator<Uint8Array> {
        for (let i = 0; i < LANDED; i += 1) yield Uint8Array.of(FULL[i] ?? 0);
        await new Promise<never>((_resolve, reject) => {
          if (signal?.aborted === true) { reject(new Error("aborted")); return; }
          signal?.addEventListener("abort", () => { reject(new Error("aborted")) }, { once: true });
        });
      })(),
    }),
  };
}

/** Poll `read` until it answers non-null or the budget runs out —
 *  the boot rehydrate lands on an async effect, so the wall bounds
 *  the window (2s) instead of assuming synchrony. */
async function pollLedger<T>(read: () => T | null | undefined, budgetMs: number): Promise<T | null | undefined> {
  const deadline = Date.now() + budgetMs;
  for (;;) {
    const seen = read();
    if (seen !== null && seen !== undefined) return seen;
    if (Date.now() >= deadline) return seen;
    await new Promise((resolve) => { setTimeout(resolve, 25); });
  }
}

describe("the restart keeps the ledger (P5 F2: the verbs must survive the seat restarting)", () => {
  test("ARM 8 — a settled-FAILED stored row rejoins the live ledger after restart (state + ref + why survive)", async () => {
    const root = tempRoot();
    try {
      // service A: the seat before the restart. Drive a real acquire
      // to its stall-settled FAILED state — the row the burn names.
      const ctxA = new Context();
      const serviceA = new ProvisioningService(ctxA, stalledConfig(root));
      const id = await serviceA.startWeightAcquire(ref());
      const failed = await pollLedger(() => {
        const p = serviceA.progressOf(id);
        return p !== null && (p.state === "failed" || p.state === "blocked") ? p : null;
      }, 10_000);
      assert.ok(failed !== null, "the stall fixture must settle FAILED before the restart");
      assert.equal(failed!.state, "failed");
      // the terminal row must reach the disk before the process
      // "dies" — the persist chain is fire-and-forget, so bound it.
      const stored = await pollLedger(() => new FileOperationStore(root).load(id), 5_000);
      assert.ok(stored !== null, "the failed row must persist before the restart");
      await ctxA.fiber.dispose();

      // service B: the restarted seat over the same store root — a
      // fresh Context (a new process shares nothing in memory).
      const ctxB = new Context();
      try {
        const serviceB = new ProvisioningService(ctxB, stalledConfig(root));
        const rejoined = await pollLedger(() => serviceB.progressOf(id), 2_000);
        assert.ok(rejoined !== null, "a stored FAILED row must rejoin the live ledger after restart");
        expect(rejoined!.state).toBe("failed");
        expect(rejoined!.operationId).toBe(id);
        expect(rejoined!.ref).toEqual(ref());
        // F-2 (the auditor's byte-truth pin, 2026-11-12): the frozen
        // count died with the old process — the ledger NEVER claims
        // bytes it has not re-statted. Both counters rejoin ZEROED
        // (the service's rehydrateProgress zeroes them; this arm
        // pinned state/ref/why but never the counters — a rejoin
        // carrying the dead process's frozen 39/100 would have stayed
        // green).
        expect(rejoined!.bytes).toBe(0);
        expect(rejoined!.total).toBe(0);
        assert.match(String(rejoined!.detail ?? ""), /stuck|stalled|no longer progressing|timed? ?out/i);
      } finally {
        await ctxB.fiber.dispose();
      }
    } finally {
      disposeRoots();
    }
  });

  test("ARM 9 — the rejoined row answers by ref (retry's address survives the restart)", async () => {
    const root = tempRoot();
    try {
      const failedRow: ProvisionOperation = {
        operationId: "op-restart-ref",
        ref: ref(),
        state: "failed",
        items: [],
        startedAt: Date.now() - 60_000,
        finishedAt: Date.now() - 30_000,
        detail: "the fetch stopped progressing at 39% (no bytes landed in the stall budget)",
      };
      await new FileOperationStore(root).save(failedRow);

      const ctx = new Context();
      try {
        const service = new ProvisioningService(ctx, stalledConfig(root));
        const byRef = await pollLedger(() => service.progressOfRef(ref()), 2_000);
        assert.ok(byRef !== undefined && byRef !== null, "progressOfRef must route to the rejoined row");
        expect(byRef.operationId).toBe("op-restart-ref");
        expect(byRef.state).toBe("failed");
      } finally {
        await ctx.fiber.dispose();
      }
    } finally {
      disposeRoots();
    }
  });

  // F-3 (the auditor's guard split, 2026-11-12): the boot seed's
  // live-lock guard drops a terminal row BY-ID when a live same-ref
  // fetch holds the ref — the pointer and the row belong to the live
  // fetch, not the remnant (verify R4). The arm proves BOTH faces of
  // the split on ONE row: dropped under the live fetch, rejoined
  // once the ref is free. The gate holds the seed's store read until
  // the live lock is provably held (deterministic ordering — never a
  // race between the seed and the fetch).
  test("ARM 10 — the live-lock guard splits by-id: a terminal same-ref row stays OUT under a live fetch, rejoins when the ref frees", async () => {
    const root = tempRoot();
    try {
      // the remnant: a terminal row for the ref, stored pre-boot
      const remnant: ProvisionOperation = {
        operationId: "op-guard-remnant",
        ref: ref(),
        state: "failed",
        items: [],
        startedAt: Date.now() - 120_000,
        finishedAt: Date.now() - 90_000,
        detail: "the fetch stopped progressing at 39% (no bytes landed in the stall budget)",
      };
      const realStore = new FileOperationStore(root);
      await realStore.save(remnant);

      // THE GATE: the seed's list() read parks until the arm opens
      // it — the service boots, the live fetch takes the lock, and
      // only then does the seed walk the stored rows.
      let openGate: () => void = () => {};
      const gate = new Promise<ProvisionOperation[]>((resolve) => {
        openGate = (): void => { void realStore.list().then(resolve, () => { resolve([]); }); };
      });
      const gatedStore: OperationStorePort = {
        load: (operationId) => realStore.load(operationId),
        save: (operation) => realStore.save(operation),
        list: () => gate,
        ...(realStore.saveIfState !== undefined
          ? { saveIfState: (operation: ProvisionOperation, expectState: ProvisionOperation["state"]) => realStore.saveIfState(operation, expectState) }
          : {}),
      };
      // a wide stall budget: the live fetch must still hold the lock
      // when the seed walks (this arm never needs the stall to fire)
      const guardedConfig: ProvisioningConfig = {
        ...stalledConfig(root),
        acquireStallTimeoutMs: 60_000,
        operationStore: gatedStore,
      };

      const ctxLive = new Context();
      try {
        const service = new ProvisioningService(ctxLive, guardedConfig);
        const liveId = await service.startWeightAcquire(ref());
        const live = await pollLedger(() => {
          const p = service.progressOf(liveId);
          return p !== null && p.state === "acquiring" ? p : null;
        }, 5_000);
        assert.ok(live !== null, "the live fetch must hold the ref before the seed walks");

        // seed walks under the live lock: the remnant is DROPPED
        openGate();
        await new Promise((resolve) => { setTimeout(resolve, 250); });
        expect(service.progressOf("op-guard-remnant"), "a terminal row under a LIVE same-ref fetch stays out (dropped by-id)").toBeNull();
        expect(service.progressOfRef(ref())?.operationId).toBe(liveId);
      } finally {
        await ctxLive.fiber.dispose();
      }

      // the ref is free now: a fresh seat over the same store seeds
      // the remnant like any terminal row (ARM 8's law) — the SAME
      // row that was dropped under the live fetch rejoins
      const ctxFree = new Context();
      try {
        const serviceFree = new ProvisioningService(ctxFree, stalledConfig(root));
        const rejoined = await pollLedger(() => serviceFree.progressOf("op-guard-remnant"), 2_000);
        assert.ok(rejoined !== null, "the same row rejoins once no live fetch holds the ref");
        expect(rejoined.state).toBe("failed");
        expect(rejoined.bytes).toBe(0);
      } finally {
        await ctxFree.fiber.dispose();
      }
    } finally {
      disposeRoots();
    }
  });
});

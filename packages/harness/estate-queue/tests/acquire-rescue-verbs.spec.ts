// acquire-rescue-verbs.spec.ts — THE STUCK ACQUIRE'S VERBS (the
// manage seat half of ERRORS.md k2 + the purge plan's P5 rescue
// honesty: dev_docs/audits/ui-engine-fidelity-purge-2026-11-08.md §7
// P5 — "ceiling-expiry → failure+Retry verb", "failed/blocked →
// one-press Retry", and the k2 burn's own words: "no retry, no
// delete").
//
// THE BURN: an acquire that stops progressing ends in a dead ledger
// row and a wedged popup — the manage plane offers NO verb to retry
// the fetch and NO verb to delete/discard the dead operation. The
// operator's only exit is killing the seat.
//
// THE LAW: once an acquire sits failed (or expired), the ONE
// acquisition door exposes BOTH verbs on that operation —
//   acquire_retry   → a fresh fetch on the same ref (200 + the new
//                     operation id; the dead row's truth stays),
//   acquire_discard → the dead operation is removed (a later poll
//                     404s; the wedge is clearable).
// The provisioning seat rides the same fake the suite already fakes
// (manage-plane-acquire-weight.spec.ts's ledger fake — the wire
// boundary); the plane's own state machine is real. Red today: both
// actions fall outside the plane's closed ACTIONS vocabulary and
// answer 422.
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resourceKey, FileOperationStore, ProvisioningService } from "@melite/estate-provisioning";
import { Context } from "@deepseek-ai/cordis";
import type {
  ProvisionOperation,
  ProvisionPlan,
  ProvisioningConfig,
  ProvisioningServiceDefinition,
  ResourceRef,
  ResourceStatus,
  WeightAcquireProgress,
} from "@melite/estate-provisioning";
import { dispatchManage } from "../src/managePlane.ts";
import type { ManageCtx } from "../src/managePlane.ts";

let ROOT = "";
const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

type ModelRef = Extract<ResourceRef, { kind: "model" }>;
const modelRef = (id: string): ModelRef => ({ kind: "model", owner: "family", id });

const SIZE = 5_413_698_958;

function modelPlan(ref: ModelRef): ProvisionPlan {
  return {
    ref,
    items: [{
      kind: "model",
      key: `model:${ref.owner}:${ref.id}::moss_image_sft_int8_convrot.safetensors`,
      owner: ref.owner,
      id: ref.id,
      name: "moss_image_sft_int8_convrot.safetensors",
      folder: "checkpoints",
      url: "https://example.invalid/moss_image_sft_int8_convrot.safetensors",
      sha256: "a".repeat(64),
      sizeBytes: SIZE,
      required: true,
      provider: "direct",
    }],
  };
}

interface Fake extends ProvisioningServiceDefinition {
  plans: Map<string, ProvisionPlan>;
  ledger: Map<string, WeightAcquireProgress>;
  discards: string[];
  /** the seat seam the cure adds to the service definition (the fake
   *  mirrors it by evicting the dead row — the observable the arm
   *  judges is the later poll's 404) */
  discardAcquire(operationId: string): void;
}

/** The acquisition-seat fake: the start mints an 'acquiring' ledger
 *  row; the TEST drives the row to its dead state (failed) the way
 *  the real service's ledger settles (the service-level wall,
 *  weight-acquire-stuck.spec.ts, proves the stall reaches failed). */
function fakeProvisioning(): Fake {
  const plans = new Map<string, ProvisionPlan>();
  const ledger = new Map<string, WeightAcquireProgress>();
  const discards: string[] = [];
  let seq = 0;
  const fake: Fake = {
    plans,
    ledger,
    discards,
    inspect: async (ref): Promise<ResourceStatus> => ({ ref, state: "unknown", items: [] }),
    plan: async (ref): Promise<ProvisionPlan> => {
      const plan = plans.get(resourceKey(ref));
      if (plan === undefined) throw new Error(`model "${(ref as ModelRef).id}" is not declared`);
      return plan;
    },
    ensure: async (): Promise<never> => { throw new Error("unused"); },
    activate: async (): Promise<never> => { throw new Error("unused"); },
    acquireExternal: async (): Promise<never> => { throw new Error("unused"); },
    reconcile: async (): Promise<ResourceStatus[]> => [],
    stateOf: () => "unknown" as const,
    operationOf: () => undefined,
    isLocked: () => false,
    progressOf: (operationId: string): WeightAcquireProgress | null => ledger.get(operationId) ?? null,
    discardAcquire: (operationId: string): void => {
      discards.push(operationId);
      ledger.delete(operationId);
    },
    startWeightAcquire: async (ref: ResourceRef): Promise<string> => {
      // THE RETRY LAW: a retry is a FRESH fetch on the dead row's ref
      // (the door composes it from this existing seat arm) — never a
      // resurrect of the dead row.
      seq += 1;
      const id = `op-retry-${String(seq)}`;
      ledger.set(id, { operationId: id, ref: { ...ref }, state: "acquiring", bytes: 0, total: SIZE });
      return id;
    },
  };
  return fake;
}

function ctxFor(fake: ProvisioningServiceDefinition): ManageCtx {
  ROOT = mkdtempSync(join(tmpdir(), "acquire-verbs-"));
  roots.push(ROOT);
  return {
    repoRoot: ROOT,
    endpoint: () => ({ provision: "managed", url: "http://engine:8188" }),
    models: { allDecls: () => [] },
    provisioning: fake,
    timeout: (cb: () => void, ms: number): (() => void) => {
      const timer = setTimeout(cb, ms);
      return () => { clearTimeout(timer); };
    },
  } as unknown as ManageCtx;
}

function dataOf(envelope: { data?: unknown }): Record<string, unknown> {
  assert.equal(typeof envelope.data, "object");
  return envelope.data as Record<string, unknown>;
}

/** Start one acquire through the REAL door and drive its ledger row
 *  to the dead state the burn names (bytes frozen, then failed). */
async function startAndFail(fake: Fake, ctx: ManageCtx): Promise<string> {
  const [, start] = await dispatchManage({ action: "acquire_weight", model: "moss-image", file: "moss_image_sft_int8_convrot.safetensors" }, ctx);
  assert.equal(start.ok, true);
  const opId = String(dataOf(start)["operation_id"]);
  const row = fake.ledger.get(opId);
  assert.ok(row !== undefined);
  // the stall: bytes frozen at 39% across polls, then the dead state
  fake.ledger.set(opId, { ...row, bytes: Math.floor(SIZE * 0.39), state: "acquiring" });
  const frozen = await dispatchManage({ action: "acquire_weight", operation_id: opId }, ctx);
  assert.equal(frozen[0], 200, "the frozen poll must render, never crash");
  fake.ledger.set(opId, { ...row, bytes: Math.floor(SIZE * 0.39), state: "failed", detail: "the fetch stopped progressing at 39% (no bytes landed in the stall budget)" });
  return opId;
}

describe("the stuck acquire's verbs (k2: no retry, no delete — the door must offer both)", () => {
  it("ARM 6 — a failed acquire answers acquire_retry: a fresh operation, one press", async () => {
    const fake = fakeProvisioning();
    fake.plans.set(resourceKey(modelRef("moss-image")), modelPlan(modelRef("moss-image")));
    const ctx = ctxFor(fake);
    const deadOp = await startAndFail(fake, ctx);

    const [code, retry] = await dispatchManage({ action: "acquire_retry", operation_id: deadOp }, ctx);
    assert.equal(code, 200);
    assert.equal(retry.ok, true);
    const fresh = String(dataOf(retry)["operation_id"]);
    assert.notEqual(fresh, deadOp, "the retry mints a fresh fetch, never a resurrect of the dead row");
    assert.equal(fake.ledger.get(fresh)?.state, "acquiring");
    // the dead row's truth survives the retry (the face keeps its why)
    assert.equal(fake.ledger.get(deadOp)?.state, "failed");
  });

  it("ARM 7 — a failed acquire answers acquire_discard: the dead operation is removed", async () => {
    const fake = fakeProvisioning();
    fake.plans.set(resourceKey(modelRef("moss-image")), modelPlan(modelRef("moss-image")));
    const ctx = ctxFor(fake);
    const deadOp = await startAndFail(fake, ctx);

    const [code, discard] = await dispatchManage({ action: "acquire_discard", operation_id: deadOp }, ctx);
    assert.equal(code, 200);
    assert.equal(discard.ok, true);
    // the wedge is clearable: the dead row is gone, a later poll 404s
    const [afterCode] = await dispatchManage({ action: "acquire_weight", operation_id: deadOp }, ctx);
    assert.equal(afterCode, 404);
  });

  // F-1 (the restart auditor's composed-hop minor, 2026-11-12): ARMs
  // 6-7 prove the verbs against a POPULATED-LEDGER FAKE and the
  // restart suite (weight-acquire-restart.spec.ts) proves the ledger
  // IS populated after a restart — but no arm rode BOTH at once: the
  // REAL ProvisioningService (a real stall-settled failure, a real
  // restart over the same store) seated as the manage ctx's
  // provisioning member, driven through the REAL dispatchManage door.
  // This is that arm: the operator's whole hop — dead row → restart →
  // one-press poll/retry/discard still answers — on real service ×
  // real plane, only the wire (the fetch stream) faked.
  it("ARM 8 — the COMPOSED hop: a REAL service restarted over its store answers poll/retry/discard through dispatchManage", async () => {
    const root = mkdtempSync(join(tmpdir(), "acquire-verbs-composed-"));
    roots.push(root);
    const plan = modelPlan(modelRef("moss-image"));
    const stalledConfig = (r: string): ProvisioningConfig => ({
      declaration: { resolve: async (): Promise<ProvisionPlan> => plan },
      storeRoot: r,
      acquireStallTimeoutMs: 250,
      // the composition's own wiring law (the durable row lives in a
      // FileOperationStore, never in memory alone — the restart seat
      // reads what this seat wrote)
      operationStore: new FileOperationStore(r),
      fetcher: async (_url: string, signal?: AbortSignal) => ({
        status: 200,
        body: (async function* stalled(): AsyncGenerator<Uint8Array> {
          for (let i = 0; i < 39; i += 1) yield Uint8Array.of(7);
          await new Promise<never>((_resolve, reject) => {
            if (signal?.aborted === true) { reject(new Error("aborted")); return; }
            signal?.addEventListener("abort", () => { reject(new Error("aborted")); }, { once: true });
          });
        })(),
      }),
    });
    const pollUntil = async <T>(read: () => T | null | undefined, budgetMs: number): Promise<T | null | undefined> => {
      const deadline = Date.now() + budgetMs;
      for (;;) {
        const seen = read();
        if (seen !== null && seen !== undefined) return seen;
        if (Date.now() >= deadline) return seen;
        await new Promise((resolve) => { setTimeout(resolve, 25); });
      }
    };

    // service A: the seat before the restart — drive a REAL acquire
    // to its stall-settled FAILED state (the real watchdog, 250ms)
    const ctxA = new Context();
    let deadOp = "";
    try {
      const a = new ProvisioningService(ctxA, stalledConfig(root));
      deadOp = await a.startWeightAcquire(modelRef("moss-image"));
      const failed = await pollUntil(() => {
        const p = a.progressOf(deadOp);
        return p !== null && p.state === "failed" ? p : null;
      }, 10_000);
      assert.ok(failed !== null, "the real stall watchdog must settle the failure");
      const stored = await pollUntil(() => new FileOperationStore(root).load(deadOp), 5_000);
      assert.ok(stored !== null, "the failed row must persist before the restart");
    } finally {
      await ctxA.fiber.dispose();
    }

    // service B: the RESTARTED seat — the real service seats the
    // manage ctx; every verb below rides dispatchManage, never a
    // direct service call
    const ctxB = new Context();
    try {
      const b = new ProvisioningService(ctxB, stalledConfig(root));
      const ctx = ctxFor(b);
      // THE REJOIN FIRST (deterministic ordering): the boot rehydrate
      // lands on an async effect — and the DOOR's own poll reads
      // through readProgress (the shared store, the cross-process
      // arm), which answers BEFORE the ledger seeds. Await the
      // LEDGER's rejoin (the restart suite's own law), then ride the
      // door — never a race between the store read and the seed.
      const rejoined = await pollUntil(() => {
        const p = b.progressOf(deadOp);
        return p !== null && p.state === "failed" ? p : null;
      }, 5_000);
      assert.ok(rejoined !== null, "the real service's ledger must rejoin the stored terminal row");
      assert.equal(rejoined.bytes, 0);

      // POLL through the door: the rejoined row answers via dispatchManage
      const [pollCode, poll] = await dispatchManage({ action: "acquire_weight", operation_id: deadOp }, ctx);
      assert.equal(pollCode, 200);
      assert.equal(poll.ok, true);
      assert.equal(String(dataOf(poll)["state"] ?? ""), "failed");

      // RETRY: one press through the door — a fresh operation on the
      // REAL service's ledger
      const [retryCode, retry] = await dispatchManage({ action: "acquire_retry", operation_id: deadOp }, ctx);
      assert.equal(retryCode, 200);
      assert.equal(retry.ok, true);
      const fresh = String(dataOf(retry)["operation_id"]);
      assert.notEqual(fresh, deadOp, "the retry mints a fresh fetch, never a resurrect");
      const live = await pollUntil(() => {
        const p = b.progressOf(fresh);
        return p !== null && p.state === "acquiring" ? p : null;
      }, 5_000);
      assert.ok(live !== null, "the fresh fetch rides the real service's ledger");

      // DISCARD: the dead row clears through the door — a later poll 404s
      await new Promise((resolve) => { setTimeout(resolve, 400); }); // let the fresh fetch settle first (250ms budget)
      const [discardCode] = await dispatchManage({ action: "acquire_discard", operation_id: deadOp }, ctx);
      assert.equal(discardCode, 200);
      const [afterCode] = await dispatchManage({ action: "acquire_weight", operation_id: deadOp }, ctx);
      assert.equal(afterCode, 404);
    } finally {
      await ctxB.fiber.dispose();
    }
  });
});

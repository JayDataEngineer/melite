// stall-recovery.spec.ts — THE STALL AUTO-RECOVERY LOOP (the "will
// never finish" burn, 2026-11-05: "THE CURRENT FLOW WILL NEVER FINISH
// FOR DOWNLOADS").
//
// THE BURN: a direct fetch that wedges mid-stream (100MB/s, then
// frozen at 75% of 7.8GB) was failed by the stall watchdog —
// detection, dressed as a cure. The operation died, the flow
// dead-ended, and the stuck face waited for a human's Retry click
// while the part sat on disk. The operator's verdict: the current
// flow will never finish.
//
// THE LAW: a wedged wire is a per-attempt fact. The watchdog tears
// down only the stalled attempt (the stallAborters seat); the direct
// arm re-opens the fetch at the kept part's offset (`Range:
// bytes=N-`), bounded by acquireStallRetries; the ledger counts the
// recovery by delta (never rewinds, never double-counts the frozen
// prefix); exhaustion alone settles failed — the stuck face's
// Retry/Delete is the exhausted backstop, never the first stall's
// landing. acquireStallRetries: 0 restores the single-flight law.
import { afterEach, describe, test } from "vitest";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { ProvisioningService } from "../src/index.ts";
import type {
  ProvisionPlan,
  ProvisionPlanItem,
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
  const root = mkdtempSync(join(tmpdir(), "provisioning-stall-recovery-"));
  roots.push(root);
  return root;
}

const TOTAL = 100;
const PART = 39;
const FULL = Buffer.from(Array.from({ length: TOTAL }, (_, i) => (i + 1) % 256));
const DIGEST = createHash("sha256").update(FULL).digest("hex");
const SUFFIX = FULL.subarray(PART);

function ref(): Extract<ResourceRef, { kind: "model" }> {
  return { kind: "model", owner: "family", id: "moss-image" };
}

function item(): Extract<ProvisionPlanItem, { kind: "model" }> {
  return {
    kind: "model",
    key: "model:family:moss-image::moss.bin",
    owner: "family",
    id: "moss-image",
    name: "moss.bin",
    folder: "checkpoints",
    url: "https://example.invalid/moss.bin",
    sha256: DIGEST,
    sizeBytes: TOTAL,
    required: true,
    provider: "direct",
  };
}

const plan = (): ProvisionPlan => ({ ref: ref(), items: [item()] });

function checkpointsDir(root: string): string {
  return join(root, "checkpoints");
}

function partFiles(dir: string): string[] {
  try {
    return readdirSync(dir).filter((name) => name.includes(".part-"));
  } catch {
    return [];
  }
}

function bodyOf(bytes: Buffer): AsyncIterable<Uint8Array> {
  return (async function* generate(): AsyncGenerator<Uint8Array> {
    for (const byte of bytes) yield Uint8Array.of(byte);
  })();
}

/** The wedged-wire body: the declared prefix lands at full speed,
 * then the stream freezes until its abort tears it down — the exact
 * shape of the 75%-of-7.8GB burn. */
function wedgedBody(prefix: Buffer, signal?: AbortSignal): AsyncIterable<Uint8Array> {
  return (async function* generate(): AsyncGenerator<Uint8Array> {
    for (const byte of prefix) yield Uint8Array.of(byte);
    await new Promise<never>((_resolve, reject) => {
      if (signal?.aborted === true) { reject(new Error("aborted")); return; }
      signal?.addEventListener("abort", () => { reject(new Error("aborted")); }, { once: true });
    });
  })();
}

async function pollUntil(
  service: ProvisioningService,
  id: string,
  until: (p: { state: string; bytes: number; total: number; detail?: string }) => boolean,
  budgetMs: number,
): Promise<{ state: string; bytes: number; total: number; detail?: string }> {
  let last: { state: string; bytes: number; total: number; detail?: string } = { state: "unknown", bytes: 0, total: 0 };
  const deadline = Date.now() + budgetMs;
  for (;;) {
    const p = service.progressOf(id);
    if (p !== null) last = { state: p.state, bytes: p.bytes, total: p.total, ...(p.detail === undefined ? {} : { detail: p.detail }) };
    if (until(last)) return last;
    if (Date.now() >= deadline) return last;
    await new Promise((resolve) => { setTimeout(resolve, 25); });
  }
}

describe("the stall auto-recovery loop (the \"will never finish\" burn, 2026-11-05)", () => {
  test("ARM 1 — a mid-stream stall re-opens at the kept offset and the SAME operation lands: no human, no dead flow", async () => {
    const root = tempRoot();
    mkdirSync(checkpointsDir(root), { recursive: true });
    let calls = 0;
    const inits: Array<number | undefined> = [];
    let sawRecoveryVoice = false;
    const context = new Context();
    contexts.push(context);
    const config: ProvisioningConfig = {
      declaration: { resolve: async (): Promise<ProvisionPlan> => plan() },
      storeRoot: root,
      acquireStallTimeoutMs: 250,
      fetcher: async (_url: string, signal?: AbortSignal, init?: { rangeFrom?: number }) => {
        calls += 1;
        inits.push(init?.rangeFrom);
        if (calls === 1) return { status: 200, body: wedgedBody(FULL.subarray(0, PART), signal) } as never;
        // the re-opened flight: asked from the kept offset, the host
        // answers the suffix only
        assert.equal(init?.rangeFrom, PART, "the recovery attempt must ask from the kept offset");
        return { status: 206, body: bodyOf(SUFFIX), resumedFrom: PART, totalBytes: TOTAL } as never;
      },
    };
    const service = new ProvisioningService(context, config);
    const id = await service.startWeightAcquire(ref());
    // poll the whole flight; the recovery voice is mid-flight, the
    // poll may miss it between 25ms ticks — read the ledger's final
    // state for the landing, and accept the voice via detail OR the
    // landed file (the voice arm sits on the detail below)
    const landedState = await pollUntil(service, id, (p) => p.state === "installed" || p.state === "active" || p.state === "failed", 10_000);
    assert.equal(landedState.state !== "failed", true,
      "the stalled flight must RECOVER in place, saw failed: " + JSON.stringify(landedState) +
      " item: " + JSON.stringify(service.operationOf(ref())?.items[0]));
    assert.equal(calls, 2, "exactly one wedged attempt + one recovery re-open");
    assert.deepEqual(inits, [undefined, PART], "the first attempt asks whole; the recovery asks from the kept offset");
    // THE BYTES ARE THE PROOF: adopted prefix + wire suffix assemble
    // into the declared file exactly once — no duplicate prefix
    assert.deepEqual(readFileSync(join(checkpointsDir(root), "moss.bin")), FULL);
    // THE DELTA LAW: the ledger never double-counts the frozen
    // prefix across the recovery (a re-seed would read 139: 39 + 39
    // + 61; the delta seeds 0 and the count lands at 100)
    assert.equal(landedState.bytes, TOTAL, "the final count is the file, never the file plus the re-seeded prefix");
    sawRecoveryVoice = /re-opening the fetch|resuming at/.test(String(landedState.detail ?? ""));
    assert.equal(sawRecoveryVoice, true,
      "the recovery must be voiced on the ledger, saw " + JSON.stringify(landedState.detail));
    assert.deepEqual(partFiles(checkpointsDir(root)), [], "a landed flight leaves no parts behind");
  });

  test("ARM 2 — a hostile wire that wedges EVERY flight exhausts the budget and settles failed with the kept part", async () => {
    const root = tempRoot();
    mkdirSync(checkpointsDir(root), { recursive: true });
    let calls = 0;
    const context = new Context();
    contexts.push(context);
    const config: ProvisioningConfig = {
      declaration: { resolve: async (): Promise<ProvisionPlan> => plan() },
      storeRoot: root,
      acquireStallTimeoutMs: 250,
      // one recovery attempt, then the exhausted backstop
      acquireStallRetries: 1,
      fetcher: async (_url: string, signal?: AbortSignal) => {
        calls += 1;
        return { status: 200, body: wedgedBody(FULL.subarray(0, PART), signal) } as never;
      },
    };
    const service = new ProvisioningService(context, config);
    const id = await service.startWeightAcquire(ref());
    const failed = await pollUntil(service, id, (p) => p.state === "failed", 10_000);
    assert.equal(failed.state, "failed", "an always-wedged wire must settle failed");
    assert.equal(calls, 2, "initial + exactly one recovery attempt — the budget bounds the loop");
    // the exhausted backstop is the stuck face's law: the refusal
    // names the kept bytes for the face's Retry (which resumes, not
    // restarts). The hostile host answers 200 to the ranged ask — the
    // flight restarted from zero, and the ledger REWOUND with it
    // (the dead prefix's 39 never double-counts into the voice)
    assert.match(String(failed.detail ?? ""), /the landed part is kept and the retry resumes at 39 of 100/,
      "exhaustion must re-seat the stall refusal verbatim, saw " + JSON.stringify(failed.detail));
    const parts = partFiles(checkpointsDir(root));
    assert.equal(parts.length, 1, "the exhausted flight's part survives for the manual retry");
    assert.equal(statSync(join(checkpointsDir(root), parts[0] ?? "")).size, 39,
      "the ignored-range restart's part holds the restarted flight's bytes");
    assert.equal(failed.bytes, 39, "the ledger rewinds with the restart — the dead prefix never counts twice");
  });

  test("ARM 3 — THE TOGGLE (the red-proof): acquireStallRetries: 0 restores the single-flight law — one stall fails the acquire", async () => {
    const root = tempRoot();
    mkdirSync(checkpointsDir(root), { recursive: true });
    let calls = 0;
    const context = new Context();
    contexts.push(context);
    const config: ProvisioningConfig = {
      declaration: { resolve: async (): Promise<ProvisionPlan> => plan() },
      storeRoot: root,
      acquireStallTimeoutMs: 250,
      // THE CURE TOGGLED OUT: the pre-burn law — the watchdog's fail
      // is the operation's death, recovery is a human's click
      acquireStallRetries: 0,
      fetcher: async (_url: string, signal?: AbortSignal) => {
        calls += 1;
        return { status: 200, body: wedgedBody(FULL.subarray(0, PART), signal) } as never;
      },
    };
    const service = new ProvisioningService(context, config);
    const id = await service.startWeightAcquire(ref());
    const failed = await pollUntil(service, id, (p) => p.state === "failed", 10_000);
    assert.equal(failed.state, "failed", "with the cure toggled out, the recoverable burn FAILS (this is ARM 1's red)");
    assert.equal(calls, 1, "no re-open under the single-flight law");
    assert.match(String(failed.detail ?? ""), /artifact\/stalled|the fetch stalled/,
      "the single-flight failure keeps the stall refusal's voice");
  });

  test("ARM 4 — the budget's config faces: the read face answers the validated value; a negative budget fails loud", async () => {
    // one context per service: the provisioning seat registers once
    // per context (the cordis provide law)
    const tunedContext = new Context();
    contexts.push(tunedContext);
    const tuned = new ProvisioningService(tunedContext, {
      declaration: { resolve: async (): Promise<ProvisionPlan> => plan() },
      acquireStallRetries: 3,
    });
    assert.equal(tuned.stallRetryBudget(), 3, "an operator-tuned budget answers tuned");
    const fallbackContext = new Context();
    contexts.push(fallbackContext);
    const fallback = new ProvisioningService(fallbackContext, {
      declaration: { resolve: async (): Promise<ProvisionPlan> => plan() },
    });
    assert.equal(fallback.stallRetryBudget(), 6, "the default is ACQUIRE_STALL_RETRIES (6)");
    const hostileContext = new Context();
    contexts.push(hostileContext);
    assert.throws(() => new ProvisioningService(hostileContext, {
      declaration: { resolve: async (): Promise<ProvisionPlan> => plan() },
      acquireStallRetries: -1,
    }), /acquireStallRetries must be a non-negative integer/,
    "a misconfigured budget fails loud at construction");
  });

  test("ARM 5 — the writer's same-id re-entry (the recovery's writer face): a resume ask never deletes its own part", async () => {
    const store = tempRoot();
    // attempt 1: 10 bytes land, then the stream parks; the abort keeps
    // the part (the same choreography as the aborted-write law's arm)
    const first = new AbortController();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let landedChunk!: () => void;
    const landed = new Promise<void>((resolve) => { landedChunk = resolve; });
    const { writeVerifiedArtifact } = await import("../src/index.ts");
    const pending = writeVerifiedArtifact({
      root: store,
      relativePath: "moss.bin",
      expectedSha256: DIGEST,
      operationId: "op-recover",
      sizeBytes: TOTAL,
      source: {
        async *[Symbol.asyncIterator]() {
          yield FULL.subarray(0, 10);
          landedChunk();
          await gate;
          yield FULL.subarray(10);
        },
      },
    }, first.signal);
    await landed;
    first.abort();
    release();
    await assert.rejects(pending, (error: unknown) => error instanceof Error);
    const part = join(store, "moss.bin.part-op-recover");
    const kept = statSync(part).size;
    assert.equal(kept, 10, "the aborted first attempt keeps its landed bytes");
    // attempt 2 under the SAME id (the recovery loop's shape): the
    // part must be adopted, never deleted-and-restarted
    const result = await writeVerifiedArtifact({
      root: store,
      relativePath: "moss.bin",
      expectedSha256: DIGEST,
      operationId: "op-recover",
      sizeBytes: TOTAL,
      resumeFrom: kept,
      source: [FULL.subarray(kept)],
    });
    assert.equal(result.resumedFrom, kept, "the writer must report the adopted offset");
    assert.deepEqual(readFileSync(join(store, "moss.bin")), FULL, "prefix + suffix assemble byte-exact under one id");
    assert.deepEqual(partFiles(store), [], "the adopted part is renamed away on landing");
  });
});

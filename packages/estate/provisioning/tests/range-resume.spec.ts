// range-resume.spec.ts — F10 RANGE RESUME ON THE DIRECT ARM (audit
// download-stack-audit-2026-10-20 F7, "owed separately: Range-resume
// on the direct arm").
//
// THE BURN: a direct fetch that stalls (the stuck-acquire watchdog's
// abort) or is cancelled deleted its `.part-<operationId>` sidecar on
// every non-landed exit, and every retry mints a NEW operation id —
// so the next attempt could never find the old bytes and re-downloaded
// the whole 6.8GB from byte 0. The watchdog made this the COMMON
// exit: every stalled flight burned its landed prefix.
//
// THE LAW: the direct arm measures the previous attempt's kept part
// BEFORE the fetch and rides `Range: bytes=N-` through the fetcher
// port; a 206 appends at N and the ledger seeds the offset (the poll
// never reads 0% on a resumed flight); a 200 means the host ignored
// the range and the restart from zero is said out loud; a stall or
// cancel abort KEEPS the part (only a hash/size mismatch verdict
// deletes); the final full-file sha256 stays the integrity anchor —
// a corrupt prefix fails it, the part is deleted, and the next retry
// starts clean.
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
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import {
  ProvisioningService,
  ProvisioningError,
  writeVerifiedArtifact,
} from "../src/index.ts";
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
  const root = mkdtempSync(join(tmpdir(), "provisioning-range-resume-"));
  roots.push(root);
  return root;
}

// Distinct ascending bytes: the byte-exact landed assertions below
// prove "no duplicate bytes" by content, not by counter.
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

function seedPart(root: string, name: string, bytes: Buffer): string {
  mkdirSync(checkpointsDir(root), { recursive: true });
  const path = join(checkpointsDir(root), name);
  writeFileSync(path, bytes);
  return path;
}

function bodyOf(bytes: Buffer): AsyncIterable<Uint8Array> {
  return (async function* generate(): AsyncGenerator<Uint8Array> {
    for (const byte of bytes) yield Uint8Array.of(byte);
  })();
}

async function pollUntil(
  service: ProvisioningService,
  id: string,
  until: (p: { state: string; bytes: number; total: number }) => boolean,
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

describe("the direct arm's range resume (audit download-stack-audit-2026-10-20 F7)", () => {
  test("ARM a — the measured part rides the fetcher port as a range request and the 206's resume facts are honored", async () => {
    const root = tempRoot();
    seedPart(root, "moss.bin.part-deadbeef01", FULL.subarray(0, PART));
    const inits: Array<number | undefined> = [];
    const context = new Context();
    contexts.push(context);
    const config: ProvisioningConfig = {
      declaration: { resolve: async (): Promise<ProvisionPlan> => plan() },
      storeRoot: root,
      // the wire is faked at the suite's seam: the init the service
      // EMITS and the resume facts it HONORS are the judged edge
      fetcher: async (_url: string, _signal?: AbortSignal, init?: { rangeFrom?: number }) => {
        inits.push(init?.rangeFrom);
        return { status: 206, body: bodyOf(SUFFIX), resumedFrom: PART, totalBytes: TOTAL } as never;
      },
    };
    const service = new ProvisioningService(context, config);
    const id = await service.startWeightAcquire(ref());
    const landedState = await pollUntil(service, id, (p) => p.state === "installed" || p.state === "active", 5_000);
    assert.equal(["installed", "active"].includes(landedState.state), true, "the resumed fetch must land, saw " + landedState.state);
    assert.deepEqual(inits, [PART], "the service must emit the adopted offset as the range origin");
    // NO duplicate bytes: the landed file is exactly prefix + suffix,
    // byte-compared, never re-counted
    assert.deepEqual(readFileSync(join(checkpointsDir(root), "moss.bin")), FULL);
    assert.equal(landedState.bytes, TOTAL);
    assert.equal(landedState.total, TOTAL);
  });

  test("ARM b — a host that ignores the range answers 200 and the restart from zero is said out loud", async () => {
    const root = tempRoot();
    seedPart(root, "moss.bin.part-deadbeef02", FULL.subarray(0, PART));
    const context = new Context();
    contexts.push(context);
    const config: ProvisioningConfig = {
      declaration: { resolve: async (): Promise<ProvisionPlan> => plan() },
      storeRoot: root,
      fetcher: async (_url: string, _signal?: AbortSignal, init?: { rangeFrom?: number }) => {
        // the hostile host: asked for bytes=39-, answers the WHOLE file
        assert.equal(init?.rangeFrom, PART);
        return { status: 200, body: bodyOf(FULL) } as never;
      },
    };
    const service = new ProvisioningService(context, config);
    const id = await service.startWeightAcquire(ref());
    const landedState = await pollUntil(service, id, (p) => p.state === "installed" || p.state === "active", 5_000);
    assert.equal(["installed", "active"].includes(landedState.state), true);
    // the clean restart lands the full body exactly once — no
    // duplicated 39-byte prefix in front of a whole-file 200
    assert.deepEqual(readFileSync(join(checkpointsDir(root), "moss.bin")), FULL);
    assert.match(String(landedState.detail ?? ""), /ignored the range|from byte 0/i,
      "the restart must be voiced on the ledger, never silent");
  });

  test("ARM c — a stall-aborted flight KEEPS its part on disk", async () => {
    const root = tempRoot();
    const context = new Context();
    contexts.push(context);
    const config: ProvisioningConfig = {
      declaration: { resolve: async (): Promise<ProvisionPlan> => plan() },
      storeRoot: root,
      acquireStallTimeoutMs: 250,
      // THE RECOVERY DEFAULT MOVED ON (stall-recovery.spec, 2026-11-05):
      // this arm judges the EXHAUSTED backstop's face — the kept part
      // the manual Retry adopts — so it rides the single-flight budget
      acquireStallRetries: 0,
      fetcher: async (_url: string, signal?: AbortSignal) => ({
        status: 200,
        body: (async function* generate(): AsyncGenerator<Uint8Array> {
          for (let i = 0; i < PART; i += 1) yield Uint8Array.of(FULL[i] ?? 0);
          await new Promise<never>((_resolve, reject) => {
            if (signal?.aborted === true) { reject(new Error("aborted")); return; }
            signal?.addEventListener("abort", () => { reject(new Error("aborted")); }, { once: true });
          });
        })(),
      }),
    };
    const service = new ProvisioningService(context, config);
    const id = await service.startWeightAcquire(ref());
    const partial = await pollUntil(service, id, (p) => p.bytes === PART, 5_000);
    assert.equal(partial.bytes, PART, "the stall fixture must land its prefix first");
    const failed = await pollUntil(service, id, (p) => p.state === "failed", 3_000);
    assert.equal(failed.state, "failed", "the watchdog must fail the stalled flight");
    // F1 (audit range-resume-cure-2026-10-20): the stall voice names the
    // kept bytes — the clause exists only in the cured refusal text
    // (HEAD's artifact/stalled ends at "retry the acquire"), so this
    // arm reds on any cure that keeps the part but stays silent
    assert.match(String(failed.detail ?? ""), /the landed part is kept and the retry resumes at 39 of 100/,
      "the stalled flight must voice its kept offset, saw " + JSON.stringify(failed.detail));
    // THE CURE: the abort no longer deletes the landed prefix — the
    // part waits on disk for the retry to adopt
    const parts = partFiles(checkpointsDir(root));
    assert.equal(parts.length, 1, "exactly the stalled flight's part survives, saw " + JSON.stringify(parts));
    assert.equal(statSync(join(checkpointsDir(root), parts[0] ?? "")).size, PART);
  });

  test("ARM d — the retry adopts the kept part and the first landed byte is N+1: the file is byte-exact, no duplicates", async () => {
    const root = tempRoot();
    const context = new Context();
    contexts.push(context);
    let calls = 0;
    let firstSignal: AbortSignal | undefined;
    const config: ProvisioningConfig = {
      declaration: { resolve: async (): Promise<ProvisionPlan> => plan() },
      storeRoot: root,
      acquireStallTimeoutMs: 250,
      // single-flight budget (the exhausted backstop's face — the
      // manual Retry this arm judges is the recovery default's
      // exhausted backstop, stall-recovery.spec ARM 2/3)
      acquireStallRetries: 0,
      fetcher: async (_url: string, signal?: AbortSignal, init?: { rangeFrom?: number }) => {
        calls += 1;
        if (calls === 1) {
          firstSignal = signal;
          return {
            status: 200,
            body: (async function* generate(): AsyncGenerator<Uint8Array> {
              for (let i = 0; i < PART; i += 1) yield Uint8Array.of(FULL[i] ?? 0);
              await new Promise<never>((_resolve, reject) => {
                if (signal?.aborted === true) { reject(new Error("aborted")); return; }
                signal?.addEventListener("abort", () => { reject(new Error("aborted")); }, { once: true });
              });
            })(),
          } as never;
        }
        // THE RESUMED FLIGHT: asked from the adopted offset, the host
        // answers the suffix only
        assert.equal(init?.rangeFrom, PART, "the retry must ask from the adopted offset");
        return { status: 206, body: bodyOf(SUFFIX), resumedFrom: PART, totalBytes: TOTAL } as never;
      },
    };
    const service = new ProvisioningService(context, config);
    const dead = await service.startWeightAcquire(ref());
    const failed = await pollUntil(service, dead, (p) => p.state === "failed", 3_000);
    assert.equal(failed.state, "failed", "the stall must fail the first flight");
    assert.equal(firstSignal?.aborted, true);

    const retried = await service.startWeightAcquire(ref());
    const landedState = await pollUntil(service, retried, (p) => p.state === "installed" || p.state === "active", 5_000);
    assert.equal(["installed", "active"].includes(landedState.state), true, "the retry must land");
    assert.equal(calls, 2);
    // THE NO-DUPLICATE PROOF IS THE BYTES THEMSELVES: adopted prefix
    // + wire suffix assemble into the declared file exactly once
    const landed = readFileSync(join(checkpointsDir(root), "moss.bin"));
    assert.deepEqual(landed, FULL);
    assert.equal(landed.length, TOTAL);
    assert.equal(landedState.bytes, TOTAL);
  });

  test("ARM e — a corrupt prefix fails the full-file hash, the part is deleted, and the next retry starts clean", async () => {
    const root = tempRoot();
    // a kept part with WRONG bytes (a bad sector, a tampered sidecar)
    seedPart(root, "moss.bin.part-corrupt01", Buffer.alloc(PART, 9));
    const inits: Array<number | undefined> = [];
    let calls = 0;
    const context = new Context();
    contexts.push(context);
    const config: ProvisioningConfig = {
      declaration: { resolve: async (): Promise<ProvisionPlan> => plan() },
      storeRoot: root,
      fetcher: async (_url: string, _signal?: AbortSignal, init?: { rangeFrom?: number }) => {
        calls += 1;
        inits.push(init?.rangeFrom);
        if (calls === 1) return { status: 206, body: bodyOf(SUFFIX), resumedFrom: PART, totalBytes: TOTAL } as never;
        return { status: 200, body: bodyOf(FULL) } as never;
      },
    };
    const service = new ProvisioningService(context, config);
    const first = await service.startWeightAcquire(ref());
    const corrupt = await pollUntil(service, first, (p) => p.state === "failed", 5_000);
    assert.equal(corrupt.state, "failed", "the corrupt prefix must fail the flight");
    // the hash verdict rides the item (the ledger detail keeps the
    // flight voice); the item's errorCode names the corrupt part
    assert.equal(service.operationOf(ref())?.items[0]?.errorCode, "artifact/hash-mismatch");
    // THE VALVE: the mismatch verdict deletes the part — the next
    // retry cannot adopt the same corruption forever
    assert.deepEqual(partFiles(checkpointsDir(root)), [], "the corrupt part must be gone, saw " + JSON.stringify(partFiles(checkpointsDir(root))));
    const second = await service.startWeightAcquire(ref());
    const clean = await pollUntil(service, second, (p) => p.state === "installed" || p.state === "active", 5_000);
    assert.equal(["installed", "active"].includes(clean.state), true);
    assert.deepEqual(inits, [PART, undefined], "the clean retry must ask from zero (no part to adopt)");
    assert.deepEqual(readFileSync(join(checkpointsDir(root), "moss.bin")), FULL);
  });

  test("ARM f — the resumed ledger seeds the offset before the first wire byte: the poll never reads 0%", async () => {
    const root = tempRoot();
    seedPart(root, "moss.bin.part-deadbeef03", FULL.subarray(0, PART));
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const context = new Context();
    contexts.push(context);
    const config: ProvisioningConfig = {
      declaration: { resolve: async (): Promise<ProvisionPlan> => plan() },
      storeRoot: root,
      fetcher: async () => ({
        status: 206,
        // the body parks BEFORE its first byte: every count the poll
        // sees while parked is ledger seed, never wire bytes
        body: (async function* generate(): AsyncGenerator<Uint8Array> {
          await gate;
          yield SUFFIX;
        })(),
        resumedFrom: PART,
        totalBytes: TOTAL,
      } as never),
    };
    const service = new ProvisioningService(context, config);
    const id = await service.startWeightAcquire(ref());
    const seeded = await pollUntil(service, id, (p) => p.bytes === PART, 3_000);
    assert.equal(seeded.bytes, PART, "the ledger must read the adopted offset while no wire byte has landed");
    assert.equal(seeded.state, "acquiring");
    release();
    const landedState = await pollUntil(service, id, (p) => p.state === "installed" || p.state === "active", 5_000);
    assert.equal(["installed", "active"].includes(landedState.state), true);
    assert.equal(landedState.bytes, TOTAL);
    assert.deepEqual(readFileSync(join(checkpointsDir(root), "moss.bin")), FULL);
  });
});

describe("the writer's adopt/append arms (the resume valve, unit-face)", () => {
  // the writer arms land their destinations at the store root, so
  // their parts seed beside them (dirname(destination)) — the
  // service arms above ride the checkpoints/ layout instead
  function seedStorePart(store: string, name: string, bytes: Buffer): string {
    const path = join(store, name);
    writeFileSync(path, bytes);
    return path;
  }

  test("the newest viable part is adopted by rename and appended after — skipped parts stay for the reaper", async () => {
    const store = tempRoot();
    const older = seedStorePart(store, "file.bin.part-older01", FULL.subarray(0, 10));
    const newer = seedStorePart(store, "file.bin.part-newer02", FULL.subarray(0, 20));
    const oversized = seedStorePart(store, "file.bin.part-oversize", FULL);
    const now = Date.now();
    utimesSync(older, now - 2_000, now - 2_000);
    utimesSync(newer, now - 1_000, now - 1_000);
    utimesSync(oversized, now, now); // newest, but a full-size part is not a resume candidate
    const result = await writeVerifiedArtifact({
      root: store,
      relativePath: "file.bin",
      expectedSha256: DIGEST,
      operationId: "op-adopt",
      sizeBytes: TOTAL,
      resumeFrom: 20,
      source: [FULL.subarray(20)],
    });
    assert.equal(result.resumedFrom, 20, "the writer must report the adopted offset");
    assert.deepEqual(readFileSync(join(store, "file.bin")), FULL);
    // the adopted part was renamed away; the parts adoption skipped
    // (the older stale one, the full-size one) wait for the reaper,
    // never silently eaten mid-adoption
    assert.deepEqual(partFiles(store), ["file.bin.part-older01", "file.bin.part-oversize"]);
  });

  test("an aborted write keeps the adopted part (the stall's exit is a keep, not a delete)", async () => {
    const store = tempRoot();
    seedStorePart(store, "keep.bin.part-kept01", FULL.subarray(0, 10));
    const controller = new AbortController();
    let firstChunk!: () => void;
    const first = new Promise<void>((resolve) => { firstChunk = resolve; });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const pending = writeVerifiedArtifact({
      root: store,
      relativePath: "keep.bin",
      expectedSha256: DIGEST,
      operationId: "op-keep",
      sizeBytes: TOTAL,
      resumeFrom: 10,
      source: {
        async *[Symbol.asyncIterator]() {
          yield FULL.subarray(10, 20);
          firstChunk();
          await gate;
          yield FULL.subarray(20);
        },
      },
    }, controller.signal);
    await first;
    controller.abort();
    release();
    await assert.rejects(pending, (error: unknown) => error instanceof ProvisioningError && error.code === "cancelled");
    const part = join(store, "keep.bin.part-op-keep");
    assert.equal(statSync(part).size, 20, "the aborted flight keeps adopted + landed bytes");
    assert.deepEqual(readFileSync(part), FULL.subarray(0, 20));
  });

  test("a size-mismatch verdict deletes the part — the clean next retry", async () => {
    const store = tempRoot();
    seedStorePart(store, "sized.bin.part-sized01", FULL.subarray(0, PART));
    await assert.rejects(
      writeVerifiedArtifact({
        root: store,
        relativePath: "sized.bin",
        // no declared digest: the SIZE verdict is the mismatch judge
        operationId: "op-sized",
        sizeBytes: TOTAL,
        resumeFrom: PART,
        source: [FULL],
      }),
      (error: unknown) => error instanceof ProvisioningError && error.code === "size-mismatch",
    );
    assert.deepEqual(partFiles(store), [], "the mismatched assembly must be gone, saw " + JSON.stringify(partFiles(store)));
  });

  test("the reaper does not eat a live part — adoption's rename is the only hand that moves a fresh part", async () => {
    const store = tempRoot();
    const live = seedPart(store, "live.bin.part-live01", FULL.subarray(0, PART));
    const writer = new (await import("../src/index.ts")).VerifiedArtifactWriter(store);
    assert.equal(await writer.reapStaleParts(), 0, "a fresh part is a live download and survives the sweep");
    assert.equal(statSync(live).size, PART);
  });
});

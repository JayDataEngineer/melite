// weight-acquire-verify.spec.ts — THE VERIFY-PHASE KILL
// (the operator's 2026-10-20 weight burn: a 7,343,591,088-byte text
// encoder downloaded to 100% — 7343591088/7343591088 bytes — then the
// operation settled FAILED, the part file was deleted, and the retry
// fetched the same 7GB into the same death).
//
// THE MECHANISM: the stall watchdog arms over the WHOLE direct arm —
// the headers wait, the byte stream, AND the verify (hash + land).
// Hashing a 7GB part takes tens of seconds with zero byte-count
// movement, so the watchdog (1s of frozen bytes) fires mid-hash,
// aborts the operation, and the ledger settles FAILED "at the frozen
// bytes" — with the bytes complete. Every file whose verify outlasts
// the stall budget dies deterministically at 100%; small files (fast
// verifies) survive, so from the operator's seat the crash reads
// "random".
//
// THE LAW: a complete stream is not a stalled stream. Verify-phase
// flow (hash chunks read, land steps) re-arms the watchdog's clock
// exactly like stream bytes do — only a verify that itself stops
// flowing trips the budget.
//
// The REAL service runs here (real locks, real ledger); the DECL,
// the fetcher, and the writer are faked at the suite's seams. The
// fake writer lands the full stream (bytes hit total) and then holds
// the verify open on a gate — the exact 100%-then-verify shape —
// while emitting the verify heartbeats the cure wires through.
import { afterEach, describe, expect, test } from "vitest";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { ProvisioningService } from "../src/index.ts";
import type {
  ArtifactWriterPort,
  ProvisionPlan,
  ProvisioningConfig,
  ResourceRef,
  VerifiedArtifactRequest,
  VerifiedArtifactResult,
} from "../src/index.ts";

const contexts: Context[] = [];
const roots: string[] = [];

afterEach(async () => {
  for (const context of contexts.splice(0)) await context.fiber.dispose();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "provisioning-weight-verify-"));
  roots.push(root);
  return root;
}

// A small DECL total — the kill needs no gigabytes: the stream lands
// 100/100 and the verify simply outlasts the stall budget.
const TOTAL = 64;
const FULL = Buffer.alloc(TOTAL, 7);
const DIGEST = createHash("sha256").update(FULL).digest("hex");

function ref(): Extract<ResourceRef, { kind: "model" }> {
  return { kind: "model", owner: "family", id: "moss-image" };
}

function item(): Extract<NonNullable<ProvisionPlan["items"][number]>, { kind: "model" }> {
  return {
    kind: "model",
    key: "model:family:moss-image::qwen3.5_9b_w4a8_gptq.safetensors",
    owner: "family",
    id: "moss-image",
    name: "qwen3.5_9b_w4a8_gptq.safetensors",
    folder: "text_encoders",
    url: "https://example.invalid/qwen3.5_9b_w4a8_gptq.safetensors",
    sha256: DIGEST,
    sizeBytes: TOTAL,
    required: true,
    provider: "direct",
  };
}

const plan = (): ProvisionPlan => ({ ref: ref(), items: [item()] });

/** Poll the ledger until `until` answers true or the budget runs out. */
async function pollUntil(
  service: ProvisioningService,
  id: string,
  until: (p: { state: string; bytes: number; total: number }) => boolean,
  budgetMs: number,
): Promise<{ state: string; bytes: number; total: number; detail?: string; phase?: string }> {
  let last: { state: string; bytes: number; total: number; detail?: string; phase?: string } = { state: "unknown", bytes: 0, total: 0 };
  const deadline = Date.now() + budgetMs;
  for (;;) {
    const p = service.progressOf(id);
    if (p !== null) last = { state: p.state, bytes: p.bytes, total: p.total, ...(p.detail === undefined ? {} : { detail: p.detail }), ...(p.phase === undefined ? {} : { phase: p.phase }) };
    if (until(last)) return last;
    if (Date.now() >= deadline) return last;
    await new Promise((resolve) => { setTimeout(resolve, 25) });
  }
}

interface GatedWriter extends ArtifactWriterPort {
  /** Resolve to let the held verify finish and land. */
  release(): void;
  /** The verify heartbeat the service passed into write (undefined
   *  before the cure wires it). */
  heartbeat(): void;
}

function gatedWriter(): GatedWriter {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let heartbeat: () => void = () => {};
  return {
    release: () => { release(); },
    heartbeat: () => { heartbeat(); },
    inspect: async () => ({ present: false as const }),
    write: async (request: VerifiedArtifactRequest, signal?: AbortSignal): Promise<VerifiedArtifactResult> => {
      if (typeof (request as { onVerifyBytes?: unknown }).onVerifyBytes === "function") {
        heartbeat = () => { (request as unknown as { onVerifyBytes: (n: number) => void }).onVerifyBytes(1); };
      }
      // land the stream the way the real writer does — consume every
      // chunk so the ledger counts the full total
      let size = 0;
      for await (const chunk of request.source as AsyncIterable<Uint8Array>) size += chunk.byteLength;
      // stream complete: 100% landed. The verify now holds past the
      // stall budget — heartbeating like a slow 7GB hash would.
      const beat = setInterval(() => { heartbeat(); }, 100);
      try {
        await Promise.race([
          gate,
          new Promise<never>((_resolve, reject) => {
            if (signal?.aborted === true) { reject(new Error("aborted")); return; }
            signal?.addEventListener("abort", () => { reject(new Error("aborted")); }, { once: true });
          }),
        ]);
      } finally {
        clearInterval(beat);
      }
      return { path: join("text_encoders", "qwen3.5_9b_w4a8_gptq.safetensors"), sha256: DIGEST, sizeBytes: size, integrity: "declared-sha256" };
    },
  };
}

function config(root: string, writer: ArtifactWriterPort): ProvisioningConfig {
  return {
    declaration: { resolve: async (): Promise<ProvisionPlan> => plan() },
    storeRoot: root,
    // EXPLICIT STALL BUDGET (audit F7): the service default widened
    // to 10_000ms; this wall's silent-verify arm judges the watchdog
    // law itself (no heartbeat past the budget fails loud), so it
    // seats its own tight budget instead of riding the default.
    acquireStallTimeoutMs: 250,
    artifactWriter: writer,
    fetcher: async () => ({
      status: 200,
      body: (async function* generate(): AsyncGenerator<Uint8Array> {
        yield Uint8Array.from(FULL);
      })(),
    }),
  };
}

describe("the verify-phase kill (100% then FAILED)", () => {
  test("VERIFY FLOW RE-ARMS THE WATCHDOG: a held verify with heartbeats stays non-terminal past the stall budget, then lands", async () => {
    const root = tempRoot();
    const context = new Context();
    contexts.push(context);
    const writer = gatedWriter();
    const service = new ProvisioningService(context, config(root, writer));

    const id = await service.startWeightAcquire(ref());
    // the stream lands whole first — the 100% face
    const full = await pollUntil(service, id, (p) => p.bytes === TOTAL, 5_000);
    assert.equal(full.bytes, TOTAL, "the stream must land its full total first");
    assert.equal(full.total, TOTAL);

    // THE RED: the verify holds for 2.5 stall budgets while
    // heartbeating. Today the watchdog fires ~1s after the last
    // stream byte and the complete download settles FAILED. The
    // cured clock must ride the verify flow instead.
    const frozen = await pollUntil(
      service, id,
      (p) => p.state === "failed" || p.state === "blocked",
      2_500,
    );
    expect(frozen.state, "a heartbeating verify must not settle FAILED (saw detail: " + String(frozen.detail ?? "") + ")").not.toBe("failed");
    expect(frozen.state).not.toBe("blocked");

    // the verify finishes — the landed file settles the op
    writer.release();
    const done = await pollUntil(service, id, (p) => p.state !== "acquiring" && p.state !== "verifying", 5_000);
    expect(done.state).toBe("active");
    expect(done.bytes).toBe(TOTAL);
  });

  test("A VERIFY THAT ITSELF STOPS STILL TRIPS THE BUDGET: no heartbeat past the budget fails loud, never hangs", async () => {
    const root = tempRoot();
    const context = new Context();
    contexts.push(context);
    // a writer that lands the stream then goes silent mid-verify —
    // the hung-disk shape. No heartbeat may ever fire.
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const silent: ArtifactWriterPort = {
      inspect: async () => ({ present: false as const }),
      write: async (request: VerifiedArtifactRequest, signal?: AbortSignal): Promise<VerifiedArtifactResult> => {
        for await (const _chunk of request.source as AsyncIterable<Uint8Array>) { /* drain */ }
        await Promise.race([
          gate,
          new Promise<never>((_resolve, reject) => {
            if (signal?.aborted === true) { reject(new Error("aborted")); return; }
            signal?.addEventListener("abort", () => { reject(new Error("aborted")); }, { once: true });
          }),
        ]);
        return { path: "x", sha256: DIGEST, sizeBytes: TOTAL, integrity: "declared-sha256" };
      },
    };
    const service = new ProvisioningService(context, config(root, silent));

    const id = await service.startWeightAcquire(ref());
    const full = await pollUntil(service, id, (p) => p.bytes === TOTAL, 5_000);
    assert.equal(full.bytes, TOTAL);
    // a silent verify past the budget must still end FAILED (the
    // watchdog's bounded clock survives the cure), never hang — and
    // the voice must name the verify, never the stream.
    const dead = await pollUntil(service, id, (p) => p.state === "failed", 4_000);
    expect(dead.state).toBe("failed");
    expect(String(dead.detail ?? "")).toMatch(/verif/i);
    release();
  });

  test("THE LEDGER EXPOSES THE LIVE PHASE (audit F2): a held verify with heartbeats reads phase 'verify' while the bytes sit frozen at total — the operator's 88% burn shape made visible, never a silent freeze", async () => {
    const root = tempRoot();
    const context = new Context();
    contexts.push(context);
    const writer = gatedWriter();
    const service = new ProvisioningService(context, config(root, writer));

    const id = await service.startWeightAcquire(ref());
    const full = await pollUntil(service, id, (p) => p.bytes === TOTAL, 5_000);
    assert.equal(full.bytes, TOTAL, "the stream must land its full total first");

    // the verify holds for a full stall budget while heartbeating —
    // the bytes NEVER move again, but the ledger must expose the
    // live phase (the burn: frozen bytes with no phase read as dead)
    const held = await pollUntil(service, id, (p) => p.bytes === TOTAL && p.phase === "verify", 2_500);
    expect(held.phase,
      "bytes froze at total with no live phase on the poll — the popup's only liveness window still reads a silent freeze (audit F2: mirror verify flow into the poll ledger)",
    ).toBe("verify");
    expect(held.state).toBe("verifying");
    writer.release();
    const done = await pollUntil(service, id, (p) => p.state === "active" || p.state === "failed", 5_000);
    expect(done.state).toBe("active");
  });
});

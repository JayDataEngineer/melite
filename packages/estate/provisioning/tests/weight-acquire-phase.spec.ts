// weight-acquire-phase.spec.ts — THE HONEST PHASE WORD (audit
// download-stack-audit-2026-10-20.md F5+F2, operator 2026-10-20: the
// stuck face said "state 'verifying' at 6.0 GB/6.8 GB (88%)" while
// the stream was still LANDING at 100 MB/s — the word lied about the
// phase from the fetch's first byte).
//
// THE MECHANISM: the direct arm seats 'verifying' BEFORE the fetch
// starts (service.ts:1396) because write() covers stream+verify under
// one word. The poll therefore reports 'verifying' for the whole
// download, and the operator's face names hash when the engine is
// streaming.
//
// THE LAW: the state word names the phase the operation is IN:
// 'acquiring' while the byte stream lands, 'verifying' once the
// writer's verify boundary opens (the first onVerifyBytes heartbeat —
// the same signal that re-arms the watchdog's clock). The poll
// payload is the popup's only liveness window; it must carry the
// truth.
//
// The REAL service runs (locks + ledger); the DECL/fetcher/writer
// ride the verify spec's gated harness.
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
  const root = mkdtempSync(join(tmpdir(), "provisioning-weight-phase-"));
  roots.push(root);
  return root;
}

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

async function pollUntil(
  service: ProvisioningService,
  id: string,
  until: (p: { state: string; bytes: number; total: number }) => boolean,
  budgetMs: number,
): Promise<{ state: string; bytes: number; total: number }> {
  let last = { state: "unknown", bytes: 0, total: 0 };
  const deadline = Date.now() + budgetMs;
  for (;;) {
    const p = service.progressOf(id);
    if (p !== null) last = { state: p.state, bytes: p.bytes, total: p.total };
    if (until(last)) return last;
    if (Date.now() >= deadline) return last;
    await new Promise((resolve) => { setTimeout(resolve, 25) });
  }
}

/** A writer that streams chunks SLOWLY (one per ms), then opens its
 *  verify with the boundary heartbeat and heartbeats through a short
 *  hold — the stream/verify boundary is observable from the ledger. */
function phasedWriter(): { writer: ArtifactWriterPort; verifyOpened: () => boolean } {
  let verifyOpened = false;
  return {
    verifyOpened: () => verifyOpened,
    writer: {
      inspect: async () => ({ present: false as const }),
      write: async (request: VerifiedArtifactRequest, signal?: AbortSignal): Promise<VerifiedArtifactResult> => {
        // the stream lands slowly — the ledger's 'acquiring' window is
        // wide enough to observe
        for await (const chunk of request.source as AsyncIterable<Uint8Array>) {
          await new Promise((resolve) => { setTimeout(resolve, 20) });
          void chunk;
        }
        // THE VERIFY BOUNDARY: the first heartbeat — the same signal
        // the service feeds the watchdog clock
        const beat = (request as unknown as { onVerifyBytes?: (n: number) => void }).onVerifyBytes;
        beat?.(0);
        verifyOpened = true;
        const timer = setInterval(() => { beat?.(1) }, 50);
        try {
          await new Promise<void>((resolve, reject) => {
            const t = setTimeout(resolve, 400);
            signal?.addEventListener("abort", () => { clearTimeout(t); reject(new Error("aborted")) }, { once: true });
          });
        } finally {
          clearInterval(timer);
        }
        return { path: join("text_encoders", "qwen3.5_9b_w4a8_gptq.safetensors"), sha256: DIGEST, sizeBytes: TOTAL, integrity: "declared-sha256" };
      },
    },
  };
}

function config(root: string, writer: ArtifactWriterPort): ProvisioningConfig {
  return {
    declaration: { resolve: async (): Promise<ProvisionPlan> => plan() },
    storeRoot: root,
    artifactWriter: writer,
    fetcher: async () => ({
      status: 200,
      body: (async function* generate(): AsyncGenerator<Uint8Array> {
        // two chunks — the stream has an observable middle
        yield FULL.subarray(0, 32);
        await new Promise((resolve) => { setTimeout(resolve, 40) });
        yield FULL.subarray(32);
      })(),
    }),
  };
}

describe("the honest phase word (acquiring while streaming, verifying at the verify boundary)", () => {
  test("PHASE 1 — while the byte stream lands, the poll says 'acquiring', never 'verifying'", async () => {
    const root = tempRoot();
    const context = new Context();
    contexts.push(context);
    const phased = phasedWriter();
    const service = new ProvisioningService(context, config(root, phased.writer));

    const id = await service.startWeightAcquire(ref());
    // the first chunk has landed, the second is still in flight —
    // mid-stream, and the writer's verify has NOT opened
    const mid = await pollUntil(service, id, (p) => p.bytes >= 32, 5_000);
    assert.equal(mid.bytes >= 32, true);
    assert.equal(phased.verifyOpened(), false, "the writer's verify must not have opened yet");
    expect(mid.state,
      "the poll voiced 'verifying' while the byte stream was still landing — the state word must name the phase the operation is in (audit F5: the whole 100MB/s stream read as hash)",
    ).toBe("acquiring");
  });

  test("PHASE 2 — once the writer's verify boundary opens, the poll says 'verifying'", async () => {
    const root = tempRoot();
    const context = new Context();
    contexts.push(context);
    const phased = phasedWriter();
    const service = new ProvisioningService(context, config(root, phased.writer));

    const id = await service.startWeightAcquire(ref());
    const hashing = await pollUntil(service, id, () => phased.verifyOpened(), 5_000);
    assert.equal(phased.verifyOpened(), true, "the verify must have opened");
    expect(hashing.state,
      "the verify boundary opened but the poll still voices a non-verifying word — the heartbeat must carry the phase to the ledger (audit F2: the poll exposes zero liveness)",
    ).toBe("verifying");
    const done = await pollUntil(service, id, (p) => p.state === "active" || p.state === "failed", 5_000);
    expect(done.state).toBe("active");
  });
});

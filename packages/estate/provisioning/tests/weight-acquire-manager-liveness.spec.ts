// weight-acquire-manager-liveness.spec.ts — THE MANAGER-ARM
// LIVENESS (audit download-stack-audit-2026-10-20 F4): a multi-GB
// model landing through ComfyUI-Manager's queue drains for minutes
// with ZERO ledger movement — the queue owns its own bytes, and
// the pre-cure arm moved the row to 'verifying' BEFORE the drain
// even started (the F5 lie, manager-flavoured) with no liveness at
// all. The poll — the popup's only window — froze at the
// pre-install count for the whole drain, and a slow queue rode the
// popup's ceiling into the stuck face while the engine was draining
// fine.
//
// THE LAW: the manager arm forwards the queue's own flow into the
// ledger — the drain reads state 'acquiring' (it is acquisition,
// not hash) with a moving 'queue' phase per queue poll, and the
// post-install inspect re-hash reads 'verifying'/'recheck'. A drain
// that stops flowing is visible as a frozen phase, never as a bare
// frozen count.
//
// The REAL service runs (locks + ledger); the DECL, the manager,
// and the writer are faked at the suite's seams. The fake manager
// holds its drain on a gate and emits the queue-status hook the
// cure threads through — exactly the multi-minute shape at
// millisecond scale.
import { afterEach, describe, expect, test } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { ProvisioningService } from "../src/index.ts";
import type {
  ManagerModelInstallRequest,
  ManagerPort,
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
  const root = mkdtempSync(join(tmpdir(), "provisioning-weight-manager-"));
  roots.push(root);
  return root;
}

const TOTAL = 64;

function ref(): Extract<ResourceRef, { kind: "model" }> {
  return { kind: "model", owner: "family", id: "moss-image" };
}

function plan(): ProvisionPlan {
  return {
    ref: ref(),
    items: [{
      kind: "model",
      key: "model:family:moss-image::qwen3.5_9b_w4a8_gptq.safetensors",
      owner: "family",
      id: "moss-image",
      name: "qwen3.5_9b_w4a8_gptq.safetensors",
      folder: "text_encoders",
      url: "https://example.invalid/qwen3.5_9b_w4a8_gptq.safetensors",
      sha256: "a".repeat(64),
      sizeBytes: TOTAL,
      required: true,
      provider: "manager",
    }],
  };
}

async function pollUntil(
  service: ProvisioningService,
  id: string,
  until: (p: { state: string; bytes: number; total: number; phase?: string }) => boolean,
  budgetMs: number,
): Promise<{ state: string; bytes: number; total: number; phase?: string }> {
  let last = { state: "unknown", bytes: 0, total: 0, phase: undefined as string | undefined };
  const deadline = Date.now() + budgetMs;
  for (;;) {
    const p = service.progressOf(id);
    if (p !== null) last = { state: p.state, bytes: p.bytes, total: p.total, phase: p.phase };
    if (until(last)) return last;
    if (Date.now() >= deadline) return last;
    await new Promise((resolve) => { setTimeout(resolve, 25) });
  }
}

describe("the manager-arm liveness (the queue drain is acquisition, and it shows)", () => {
  test("A DRAINING QUEUE READS acquiring/queue ON THE POLL — the drain's own flow is the ledger's liveness, and the drain is never voiced as hash", async () => {
    const root = tempRoot();
    const context = new Context();
    contexts.push(context);
    // the queue holds for three drain polls, emitting the status
    // hook each time the way a draining multi-GB queue does
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let emissions = 0;
    const manager: ManagerPort = {
      inspect: async () => ({ installed: true, active: false }),
      install: async () => ({ installed: true }),
      installModel: async (request: ManagerModelInstallRequest): Promise<{ installed: boolean; detail?: string }> => {
        for (let drain = 0; drain < 3; drain += 1) {
          (request.onQueueStatus as ((status: { doneCount: number; totalCount: number }) => void) | undefined)?.({ doneCount: drain, totalCount: 3 });
          emissions += 1;
          await new Promise((resolve) => { setTimeout(resolve, 50) });
        }
        await gate;
        return { installed: true, detail: "queue 3/3" };
      },
    };
    const service = new ProvisioningService(context, {
      declaration: { resolve: async (): Promise<ProvisionPlan> => plan() },
      storeRoot: root,
      manager,
      // the writer inspects twice: absent before the drain (the file
      // is NOT on disk — the queue must drain), present after (the
      // post-install re-hash lands it). A present answer up front
      // would take the present-file path and the drain would never
      // run — the arm would judge nothing.
      artifactWriter: {
        inspect: async () => (emissions === 0
          ? { present: false as const }
          : { present: true as const, sha256: "a".repeat(64), sizeBytes: TOTAL }),
        write: async () => { throw new Error("the manager arm never writes"); },
      },
    } satisfies ProvisioningConfig);

    const id = await service.startWeightAcquire(ref());
    // the drain is in flight — the poll names acquisition with the
    // moving queue phase, never the pre-cure 'verifying' lie
    const draining = await pollUntil(service, id, (p) => p.phase === "queue", 5_000);
    expect(draining.phase,
      "the manager drain exposes no queue phase — the poll freezes at the pre-install count for the whole drain (audit F4: forward waitForQueue progress into the ledger)",
    ).toBe("queue");
    expect(draining.state,
      "the manager drain still voices 'verifying' — the F5 lie, manager-flavoured: a queue drain is acquisition, not hash",
    ).toBe("acquiring");
    assert.equal(emissions >= 1, true, "the drain must have emitted queue flow before the assertion");
    release();
    const done = await pollUntil(service, id, (p) => p.state === "active" || p.state === "failed" || p.state === "installed", 5_000);
    expect(done.state).toBe("active");
  });
});

// @contract cards-download-seats-voice
// extension-arm-liveness.spec.ts — THE EXTENSION-ARM PER-POLL VOICE
// (audit download-stack-audit-2026-10-20 F4 / fix #4, the F10 seats
// slice; the audit table's extension rows).
//
// THE BURN: the Manager-side seats — the declared extension arm, the
// download_model external model arm, and the install_extension_url
// external extension arm — stamped a start-only word (or nothing at
// all) and went silent for the whole drain. Worse: the external
// seats never seeded a weight-acquire ledger row, so their
// voicePhase calls wrote to NO row — the poll door had no window on
// the flight whatsoever, and the seats (popup/agent) watched a
// flight that said nothing from queue start to drain end.
//
// THE LAW: every extension-flavoured arm that drains the Manager
// queue owns a live ledger row whose phase moves with the drain —
// seeded at flight start, re-voiced once per queue status poll
// through the drain heartbeat, reading state 'acquiring' (a drain is
// acquisition, never hash). The movement is the law, not the exact
// word. A stalled extension drain (silence where the voice should
// ride) is judged by the ONE stuck watch both seats ride
// (run-rescue-stuck-watch.spec.tsx ARM S1e) — the two cures lock:
// the arm carries the voice, the watch enforces it.
//
// The REAL service runs (locks + ledger); the DECL, the manager, and
// the writer are faked at the suite's seams — the fake holds its
// drain on a gate and emits the queue-status hook, the multi-minute
// shape at millisecond scale (the weight-acquire-manager-liveness
// pattern).
import { afterEach, describe, expect, test } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { ProvisioningService, resourceKey } from "../src/index.ts";
import type { WeightAcquireProgress } from "../src/index.ts";
import type {
  ManagerInstallRequest,
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
  const root = mkdtempSync(join(tmpdir(), "provisioning-extension-liveness-"));
  roots.push(root);
  return root;
}

const TOTAL = 64;

type Progress = { state: string; bytes: number; total: number; phase?: string };

async function pollUntil(
  service: ProvisioningService,
  ref: ResourceRef,
  until: (p: Progress | null) => boolean,
  budgetMs: number,
): Promise<Progress | null> {
  let last: Progress | null = null;
  const deadline = Date.now() + budgetMs;
  for (;;) {
    const p = service.progressOfRef(ref);
    if (p !== null) last = { state: p.state, bytes: p.bytes, total: p.total, phase: p.phase };
    if (until(last)) return last;
    if (Date.now() >= deadline) return last;
    await new Promise((resolve) => { setTimeout(resolve, 25) });
  }
}

/** The queue-status hook is read through the structural seam so the
 *  arms are behavioral on both faces of the cure (the field's absence
 *  pre-cure is exactly the silence the wall refuses). */

describe("the extension-arm liveness (every Manager-side seat moves on the poll)", () => {
  test("ARM E1 — the EXTERNAL MODEL arm (download_model): the drain re-voices a live ledger row — the seat's queue flow is on the poll", async () => {
    const root = tempRoot();
    const context = new Context();
    contexts.push(context);
    const url = "https://example.invalid/external-weights.safetensors";
    // the external identity the door derives (one record per URL)
    const ref: ResourceRef = { kind: "model", owner: "card", id: "external:" + url };
    const manager: ManagerPort = {
      inspect: async () => ({ installed: true, active: false }),
      install: async (): Promise<{ installed: boolean; detail?: string }> => {
        throw new Error("the model arm never installs packs");
      },
      installModel: async (request: ManagerModelInstallRequest): Promise<{ installed: boolean; detail?: string }> => {
        for (let i = 0; i < 3; i += 1) {
          request.onQueueStatus?.();
          await new Promise((resolve) => { setTimeout(resolve, 40) });
        }
        return { installed: true, detail: "queue 3/3" };
      },
    };
    const service = new ProvisioningService(context, {
      declaration: { resolve: async (): Promise<ProvisionPlan> => ({ ref, items: [] }) },
      storeRoot: root,
      manager,
      artifactWriter: {
        inspect: async () => ({ present: true as const, sha256: "a".repeat(64), sizeBytes: TOTAL }),
        write: async () => { throw new Error("the manager arm never writes"); },
      },
    } satisfies ProvisioningConfig);

    const flight = service.acquireExternal(
      { kind: "model", url, filename: "external-weights.safetensors", sizeBytes: TOTAL },
      { operatorConfirmed: true },
    );
    // DURING the drain: the poll carries the flight — a live row with
    // the queue voice, never a phaseless freeze (and never hash)
    const draining = await pollUntil(service, ref, (p) => p !== null && p.phase === "queue", 5_000);
    expect(draining,
      "the external model drain has no live ledger row on the poll — the external seat never seeded one, so its start-only voice wrote to nothing (audit F4: forward the drain into the ledger)",
    ).not.toBeNull();
    expect(draining?.phase).toBe("queue");
    expect(draining?.state,
      "the external model drain is not acquisition — the poll voices a hash word over a queue drain",
    ).toBe("acquiring");
    expect(draining?.total, "the declared size never reached the poll's denominator").toBe(TOTAL);
    await flight;
    const done = service.progressOfRef(ref);
    expect(done?.state).toBe("active");
  });

  test("ARM E2 — the EXTERNAL EXTENSION arm (install_extension_url): the drain re-voices a live ledger row — 0/0 with the queue voice", async () => {
    const root = tempRoot();
    const context = new Context();
    contexts.push(context);
    const url = "https://example.invalid/some-pack";
    const ref: ResourceRef = { kind: "extension", id: "external:" + url };
    const manager: ManagerPort = {
      inspect: async () => ({ installed: true, active: false }),
      install: async (request: ManagerInstallRequest): Promise<{ installed: boolean; detail?: string }> => {
        // the hook through the structural seam: pre-cure the request
        // carries none (the silence this wall refuses)
        const hook = (request as { onQueueStatus?: () => void }).onQueueStatus;
        for (let i = 0; i < 3; i += 1) {
          hook?.();
          await new Promise((resolve) => { setTimeout(resolve, 40) });
        }
        return { installed: true, detail: "installed some-pack" };
      },
    };
    const service = new ProvisioningService(context, {
      declaration: { resolve: async (): Promise<ProvisionPlan> => ({ ref, items: [] }) },
      storeRoot: root,
      manager,
    } satisfies ProvisioningConfig);

    const flight = service.acquireExternal(
      { kind: "extension", url },
      { operatorConfirmed: true },
    );
    const draining = await pollUntil(service, ref, (p) => p !== null && p.phase === "queue", 5_000);
    expect(draining,
      "the external extension drain has no live ledger row on the poll — the extension seat is invisible to the tracker for its whole drain (audit F4)",
    ).not.toBeNull();
    expect(draining?.phase).toBe("queue");
    expect(draining?.state).toBe("acquiring");
    await flight;
    const done = service.progressOfRef(ref);
    // the Manager acked the install; no engine inspect seat says the
    // pack is live — restart_required is the honest terminal
    expect(done?.state).toBe("restart_required");
  });

  test("ARM E3 — the DECLARED extension arm (ensure): the drain re-voices the seeded row — the plan flight moves on the poll", async () => {
    const root = tempRoot();
    const context = new Context();
    contexts.push(context);
    const ref: ResourceRef = { kind: "extension", id: "declared-pack" };
    const manager: ManagerPort = {
      inspect: async () => ({ installed: true, active: false }),
      install: async (request: ManagerInstallRequest): Promise<{ installed: boolean; detail?: string }> => {
        const hook = (request as { onQueueStatus?: () => void }).onQueueStatus;
        for (let i = 0; i < 3; i += 1) {
          hook?.();
          await new Promise((resolve) => { setTimeout(resolve, 40) });
        }
        return { installed: true, detail: "installed declared-pack" };
      },
    };
    const service = new ProvisioningService(context, {
      declaration: {
        resolve: async (): Promise<ProvisionPlan> => ({
          ref,
          items: [{
            kind: "extension",
            key: "extension:declared-pack",
            id: "declared-pack",
            url: "https://github.com/example/declared-pack",
            required: true,
            provider: "manager",
          }],
        }),
      },
      storeRoot: root,
      manager,
    } satisfies ProvisioningConfig);

    const flight = service.ensure(ref);
    // the row is seeded by the ensure path — the law is the MOVEMENT:
    // the seed's opening word must be replaced by the drain's live
    // queue voice, not sit frozen at the opening stamp
    const draining = await pollUntil(service, ref, (p) => p !== null && p.phase === "queue", 5_000);
    expect(draining?.phase,
      "the declared extension drain never re-voiced the seeded row — the flight sat on its opening stamp for the whole drain (audit F4: forward waitForQueue progress into the ledger)",
    ).toBe("queue");
    expect(draining?.state).toBe("acquiring");
    assert.equal((await flight).state, "restart_required");
  });

  test("ARM E4 — the seed GUARD: an operation that already owns a ledger row keeps it — the external seed never clobbers a live flight's bytes", async () => {
    const root = tempRoot();
    const context = new Context();
    contexts.push(context);
    const url = "https://example.invalid/guarded-weights.safetensors";
    const ref: ResourceRef = { kind: "model", owner: "card", id: "external:" + url };
    // the fixed operation id lets the arm pre-own the row the seed
    // would otherwise clobber (the factory is a config seam)
    const fixedOperationId = "op-extension-arm-e4";
    const manager: ManagerPort = {
      inspect: async () => ({ installed: true, active: false }),
      install: async (): Promise<{ installed: boolean; detail?: string }> => {
        throw new Error("the model arm never installs packs");
      },
      installModel: async (request: ManagerModelInstallRequest): Promise<{ installed: boolean; detail?: string }> => {
        for (let i = 0; i < 3; i += 1) {
          request.onQueueStatus?.();
          await new Promise((resolve) => { setTimeout(resolve, 40) });
        }
        return { installed: true, detail: "queue 3/3" };
      },
    };
    const service = new ProvisioningService(context, {
      declaration: { resolve: async (): Promise<ProvisionPlan> => ({ ref, items: [] }) },
      storeRoot: root,
      manager,
      operationIdFactory: () => fixedOperationId,
      artifactWriter: {
        inspect: async () => ({ present: true as const, sha256: "b".repeat(64), sizeBytes: TOTAL }),
        write: async () => { throw new Error("the manager arm never writes"); },
      },
    } satisfies ProvisioningConfig);
    // the pre-owned row: a joined/riding operation's live bytes — a
    // distinct marker the seed's 0/TOTAL shape can never be mistaken
    // for
    const ledger = (service as unknown as { weightProgress: Map<string, WeightAcquireProgress>; weightProgressByRef: Map<string, string> });
    ledger.weightProgress.set(fixedOperationId, { operationId: fixedOperationId, ref, state: "acquiring", bytes: 7, total: TOTAL * 11, phase: "stream" });
    ledger.weightProgressByRef.set(resourceKey(ref), fixedOperationId);

    const flight = service.acquireExternal(
      { kind: "model", url, filename: "guarded-weights.safetensors", sizeBytes: TOTAL },
      { operatorConfirmed: true },
    );
    // the row survives: the seed guard kept the pre-owned bytes and
    // denominator, and the drain heartbeat still re-voices the phase
    const draining = await pollUntil(service, ref, (p) => p !== null && p.phase === "queue", 5_000);
    expect(draining, "the pre-owned row vanished — the external seed clobbered a live flight's ledger row").not.toBeNull();
    expect(draining?.bytes,
      "the external seed overwrote a pre-owned row's bytes with its 0 shape — the guard never rode",
    ).toBe(7);
    expect(draining?.total).toBe(TOTAL * 11);
    expect(draining?.phase).toBe("queue");
    await flight;
    expect(service.progressOfRef(ref)?.state).toBe("active");
  });
});

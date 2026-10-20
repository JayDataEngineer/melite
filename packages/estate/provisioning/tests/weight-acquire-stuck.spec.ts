// weight-acquire-stuck.spec.ts — THE STUCK ACQUIRE ENDS LOUD
// (ERRORS.md k2/m + the purge plan's P5 rescue honesty:
// dev_docs/audits/ui-engine-fidelity-purge-2026-11-08.md §7 P5).
//
// THE BURN: "model downloads get stuck, then it's permanently stuck
// at whatever percent. There's no retry, there's no delete." Today a
// fetch whose byte stream freezes keeps its ledger row in
// state 'acquiring' FOREVER — no stall detector, no failed
// transition, nothing the popup or the manage seat can offer Retry
// or Delete on. The operator's only exits are killing the seat.
//
// THE LAW: a stopped acquire is a FAILED acquire within a bounded
// stall budget — the ledger row names why it stopped and the state
// machine permits a retry (a fresh fetch on the same ref) while
// preserving the dead row's truth for the face. The REAL service
// runs here (real locks, real ledger, real operation store on disk);
// only the wire is faked — the DECL port and the artifact fetcher,
// the same seams weight-acquire.spec.ts fakes.
import { afterEach, describe, expect, test } from "vitest";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { ProvisioningService } from "../src/index.ts";
import type { ProvisionPlan, ProvisioningConfig, ResourceRef } from "../src/index.ts";

const contexts: Context[] = [];
const roots: string[] = [];

afterEach(async () => {
  for (const context of contexts.splice(0)) await context.fiber.dispose();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "provisioning-weight-stuck-"));
  roots.push(root);
  return root;
}

// THE OPERATOR'S FILE (ERRORS.md m): 5413698958 declared bytes —
// scaled here to 100 so the 39% fixture is exact: 39 bytes landed of
// a 100-byte DECL total.
const TOTAL = 100;
const LANDED = 39;
const FULL = Buffer.alloc(TOTAL, 7);
const DIGEST = createHash("sha256").update(FULL).digest("hex");

function ref(): Extract<ResourceRef, { kind: "model" }> {
  return { kind: "model", owner: "family", id: "moss-image" };
}

function item(): Extract<NonNullable<ProvisionPlan["items"][number]>, { kind: "model" }> {
  return {
    kind: "model",
    key: "model:family:moss-image::moss_image_sft_int8_convrot.safetensors",
    owner: "family",
    id: "moss-image",
    name: "moss_image_sft_int8_convrot.safetensors",
    folder: "checkpoints",
    url: "https://example.invalid/moss_image_sft_int8_convrot.safetensors",
    sha256: DIGEST,
    sizeBytes: TOTAL,
    required: true,
    provider: "direct",
  };
}

const plan = (): ProvisionPlan => ({ ref: ref(), items: [item()] });

/** THE STALL FAKE (the wire, faked at the suite's seam): the byte
 *  stream lands `LANDED` bytes then freezes — no end, no error, the
 *  exact stuck shape of the burn. The park settles only when the
 *  operation's own abort signal fires (the seat's dispose), so the
 *  context teardown stays clean. */
function stalledConfig(root: string): ProvisioningConfig {
  return {
    declaration: { resolve: async (): Promise<ProvisionPlan> => plan() },
    storeRoot: root,
    // THE WATCHDOG'S OWN BUDGET IS EXPLICIT (audit F7, 2026-10-20):
    // the service default widened to 10_000ms (WAN-honest — one TCP
    // hiccup must not kill a moving fetch), so this wall seats its
    // own tight budget: it judges the WATCHDOG LAW (a freeze past
    // the budget dies loud), which is budget-relative, never the
    // default's value. The 1.5s poll window below sees the 250ms
    // stall fire with margin.
    acquireStallTimeoutMs: 250,
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

/** Poll the ledger until `until` answers true or the budget runs out;
 *  returns the last observation either way. */
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
    await new Promise((resolve) => { setTimeout(resolve, 25) });
  }
}

describe("the stuck acquire (k2: frozen bytes must end FAILED, never freeze forever)", () => {
  test("ARM 4 — bytes frozen across polls: the ledger row reaches a terminal FAILED state inside the stall budget", async () => {
    const root = tempRoot();
    const context = new Context();
    contexts.push(context);
    const service = new ProvisioningService(context, stalledConfig(root));

    const id = await service.startWeightAcquire(ref());
    // the 39% truth lands first: the numerator is real landed bytes.
    // The mid-flight word rides the service's own record ('verifying'
    // once the direct arm opens the fetch — the operator's "(verifying)"
    // face); the burn-relevant truth is NON-terminal + frozen bytes.
    const partial = await pollUntil(service, id, (p) => p.bytes === LANDED, 5_000);
    assert.equal(partial.bytes, LANDED, "the stall fixture must land its 39 bytes first");
    assert.equal(partial.total, TOTAL);
    assert.ok(partial.state === "acquiring" || partial.state === "verifying", "mid-flight must be non-terminal, saw " + partial.state);

    // THE RED: from here the bytes never move again — the service must
    // detect the stop and fail the operation LOUD inside a bounded
    // budget. Today nothing does: the row rides 'acquiring' forever,
    // and every poll of the manage door renders a frozen X% bar.
    const budgetMs = 1_500;
    const saw = await pollUntil(service, id, (p) => p.state === "failed" || p.state === "blocked", budgetMs);
    const stalled = await pollUntil(service, id, () => false, budgetMs);
    expect(saw.state).toBe("failed");
    expect(String(saw.detail ?? "")).toMatch(/stuck|stalled|no longer progressing|timed? ?out/i);
    expect(stalled.bytes).toBe(LANDED);
  });

  test("ARM 5 — a failed acquire is retryable: a fresh start mints a NEW operation and fetches again", async () => {
    // THE NO-RETRY BURN (k2): the dead fetch must not wedge the ref.
    // A failed operation releases the plane and a Retry start mints a
    // fresh operation id and a fresh fetch (the old row's truth stays
    // for the face). Pins the state machine half of the Retry verb.
    const root = tempRoot();
    const context = new Context();
    contexts.push(context);
    let calls = 0;
    const config: ProvisioningConfig = {
      declaration: { resolve: async (): Promise<ProvisionPlan> => plan() },
      storeRoot: root,
      fetcher: async () => {
        calls += 1;
        if (calls === 1) {
          throw new Error("connection reset mid-stream");
        }
        return {
          status: 200,
          body: (async function* generate(): AsyncGenerator<Uint8Array> {
            for (const byte of FULL) yield Uint8Array.of(byte);
          })(),
        };
      },
    };
    const service = new ProvisioningService(context, config);

    const dead = await service.startWeightAcquire(ref());
    const failed = await pollUntil(service, dead, (p) => p.state === "failed", 5_000);
    assert.equal(failed.state, "failed", "the reset fetch must fail the operation");

    const retried = await service.startWeightAcquire(ref());
    expect(retried).not.toBe(dead);
    const landed = await pollUntil(service, retried, (p) => p.state === "installed" || p.state === "active", 10_000);
    expect(["installed", "active"]).toContain(landed.state);
    expect(landed.bytes).toBe(TOTAL);
    expect(calls).toBe(2);
  });
});

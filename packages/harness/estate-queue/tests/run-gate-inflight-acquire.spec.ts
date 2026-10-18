// run-gate-inflight-acquire.spec.ts — NEVER-RUN-ON-INCOMPLETE (the
// run-door half of ERRORS.md k2 + the purge plan's P5 rescue honesty:
// dev_docs/audits/ui-engine-fidelity-purge-2026-11-08.md §7 P5, hop
// [6]→[1]).
//
// THE BURN: the download sits at 39% — the popup lied "ready", the
// operator pressed Run, and the card RAN on a weight that was not
// there, wedging ComfyUI in an unrecoverable loop. The run door's
// weight gate (cardsLanes lanePresenceMiss — the preflight the press
// rides, and the seat whose structured row raises the missing-weight
// popup) must refuse while the declared weight is absent OR still
// landing, and the refusal must be HONEST about the in-flight
// acquisition: it names the operation and its live fraction, and it
// does NOT offer a fresh fetch while one is already running.
//
// Today the gate refuses (the file is absent) but its voice is the
// idle voice — "no store copy exists … fetch it: <url>" — no
// in-flight truth, no fraction, and a fresh-fetch hint that re-pops
// the download loop. These arms pin the honest voice. Red today on
// every in-flight assert; the toggle is the gate's refusal voice in
// cardsLanes.ts (lanePresenceMiss).
//
// REAL SEATS: the real models registry boot, the real h3 DECL, the
// real lane-presence gate over a fixture store, and the REAL
// provisioning service holding a genuine in-flight acquire at 39%
// (its wire — DECL port + artifact fetcher — faked at the seams
// weight-acquire.spec.ts already fakes).
import "../../../../tests/helpers/boot-models.ts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import assert from "node:assert/strict";
import { Context } from "@deepseek-ai/cordis";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ProvisioningService } from "@melite/estate-provisioning";
import type { ProvisionPlan, ProvisioningConfig, ResourceRef } from "@melite/estate-provisioning";
import { lanePresenceMiss, lanePresenceRefusal } from "../src/cardsLanes.ts";

// the h3 lane rows (the cards-lanes.spec fixture world): every row
// present EXCEPT the declared lora — the first miss is the loras row,
// the same file the in-flight acquire below is landing.
const TURBO8 = "minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors";
const UNET = "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors";

const DIR = join(tmpdir(), "melite-inflight-acquire-" + process.pid);
const CFG = join(DIR, "endpoint.json");
const MODELS = join(DIR, "models");
const PREV_CFG = process.env["COMFYUI_ENDPOINT_CONFIG"];
const PREV_SBX = process.env["INFERENCE_TEST_SANDBOX"];
const PREV_ROOT = process.env["MELITE_REPO_ROOT"];

beforeAll(() => {
  mkdirSync(MODELS, { recursive: true });
  // the store as the burn leaves it: every OTHER lane row stands, the
  // declared lora is the file still landing at 39%
  mkdirSync(join(MODELS, "diffusion_models"), { recursive: true });
  writeFileSync(join(MODELS, "diffusion_models", UNET), "x");
  mkdirSync(DIR, { recursive: true });
  writeFileSync(CFG, JSON.stringify({ url: "http://127.0.0.1:8188", model_base_path: MODELS }));
  process.env["COMFYUI_ENDPOINT_CONFIG"] = CFG;
  delete process.env["INFERENCE_TEST_SANDBOX"];
  process.env["MELITE_REPO_ROOT"] = DIR;
});

const contexts: Context[] = [];
const roots: string[] = [];

afterAll(async () => {
  for (const context of contexts.splice(0)) await context.fiber.dispose();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  if (PREV_CFG === undefined) delete process.env["COMFYUI_ENDPOINT_CONFIG"];
  else process.env["COMFYUI_ENDPOINT_CONFIG"] = PREV_CFG;
  if (PREV_SBX === undefined) delete process.env["INFERENCE_TEST_SANDBOX"];
  else process.env["INFERENCE_TEST_SANDBOX"] = PREV_SBX;
  if (PREV_ROOT === undefined) delete process.env["MELITE_REPO_ROOT"];
  else process.env["MELITE_REPO_ROOT"] = PREV_ROOT;
  rmSync(DIR, { recursive: true, force: true });
});

// THE IN-FLIGHT ACQUIRE (the real service, the wire faked): the DECL
// port resolves the family's lora row; the fetch lands 39 bytes of a
// 100-byte declared total and freezes — the operator's 39%.
const TOTAL = 100;
const LANDED = 39;

async function inFlightAcquire(): Promise<ProvisioningService> {
  const root = mkdtempSync(join(tmpdir(), "inflight-store-"));
  roots.push(root);
  const context = new Context();
  contexts.push(context);
  const target: Extract<ResourceRef, { kind: "model" }> = { kind: "model", owner: "family", id: "h3" };
  const config: ProvisioningConfig = {
    declaration: { resolve: async (): Promise<ProvisionPlan> => ({
      ref: target,
      items: [{
        kind: "model",
        key: "model:family:h3::" + TURBO8,
        owner: "family",
        id: "h3",
        name: TURBO8,
        folder: "loras/h3",
        url: "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/loras/" + TURBO8,
        sha256: "b".repeat(64),
        sizeBytes: TOTAL,
        required: true,
        provider: "direct",
      }],
    }) },
    storeRoot: root,
    fetcher: async (_url: string, signal?: AbortSignal) => ({
      status: 200,
      body: (async function* generate(): AsyncGenerator<Uint8Array> {
        for (let i = 0; i < LANDED; i += 1) yield Uint8Array.of(7);
        await new Promise<never>((_resolve, reject) => {
          if (signal?.aborted === true) { reject(new Error("aborted")); return; }
          signal?.addEventListener("abort", () => { reject(new Error("aborted")) }, { once: true });
        });
      })(),
    }),
  };
  const service = new ProvisioningService(context, config);
  const id = await service.startWeightAcquire(target);
  // wait for the true 39%: real landed bytes over the DECL total
  const deadline = Date.now() + 5_000;
  for (;;) {
    const p = service.progressOf(id);
    if (p !== null && p.bytes === LANDED) break;
    if (Date.now() >= deadline) throw new Error("the stall fixture never landed its 39 bytes");
    await new Promise((resolve) => { setTimeout(resolve, 20) });
  }
  return service;
}

describe("NEVER-RUN-ON-INCOMPLETE (the run gate refuses on a landing weight, honestly)", () => {
  it("ARM 8 — the gate refuses at 39%/verifying and the refusal voices the in-flight acquisition", async () => {
    const service = await inFlightAcquire();
    const live = service.progressOfRef({ kind: "model", owner: "family", id: "h3" });
    assert.ok(live !== null, "the fixture holds an in-flight acquire");

    // (a) the refusal FIRES — nothing runs while the declared weight
    // is absent or unverified (the "assumes X% is complete" burn)
    const miss = lanePresenceMiss("h3");
    assert.ok(miss !== null, "a run press at 39% must refuse, never start");

    // (b) THE HONEST VOICE: the refusal names the in-flight
    // acquisition and its live fraction — the operator reads "a
    // download is landing", not "the DECL is broken"
    expect(miss.message).toMatch(/in flight/i);
    expect(miss.message).toContain("39%");
    expect(miss.message).toContain(String(live.operationId));

    // (c) NO FRESH-FETCH HINT while one is already running: the idle
    // voice's "fetch it: <url>" is what re-pops the download loop
    expect(miss.message).not.toMatch(/fetch it:/);

    // (d) the structured artifact carries the in-flight row so the
    // popup keys its face on fields, never on prose
    const details = (miss.details ?? {}) as Record<string, unknown>;
    assert.equal(details["acquire_in_flight"], true);
    assert.equal(details["operation_id"], live.operationId);
    assert.equal(details["bytes"], LANDED);
    assert.equal(details["total"], TOTAL);

    // (e) the run-door contract (the THROW seat) carries the same voice
    expect(() => lanePresenceRefusal("h3")).toThrow(/in flight/);
  });
});

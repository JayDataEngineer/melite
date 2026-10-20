// @contract cards-run-rescue-voice-truth
// run-gate-verify-voice.spec.ts — THE RUN-GATE'S HASH VOICE (audit
// download-stack-audit-2026-10-20 F10, the run-gate row).
//
// THE BURN: mid-verify the acquire ledger's byte count sits frozen
// (the hash moves no stream bytes), so the run gate's in-flight
// voice — "acquisition in flight (44%)" — freezes with it and reads
// as death: an honest fraction, silent about WHY nothing moves.
// The ledger already carries the truth (the live phase —
// infra-acquire-phase-honesty); the gate never voiced it.
//
// THE LAW: the run-gate lane-presence voice names the hash phase
// when the ledger row says verifying — the fraction rides the
// hashing word (locale copy, never a literal in the gate); a
// mid-STREAM row (bytes landing) never carries it (no always-true).
//
// REAL SEATS: the real models registry boot, the real h3 DECL, the
// real lane-presence gate over a fixture store (the loras row is
// the first miss — the same fixture world run-gate-inflight-acquire
// rides), and the process provisioning seat armed with the exact
// ledger row the service stamps (the row's own emission is walled
// weight-acquire-phase.spec.ts — this wall judges the GATE's half:
// the voice it composes off the row it is handed).
import "../../../../tests/helpers/boot-models.ts";
import { afterAll, beforeAll, describe, it } from "vitest";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { armProvisioningSeat, disarmProvisioningSeat } from "@melite/estate-provisioning";
import type { ProvisioningService, ResourceRef } from "@melite/estate-provisioning";
import type { WeightAcquireProgress } from "@melite/estate-provisioning/contracts";
import { lanePresenceMiss } from "../src/cardsLanes.ts";

// the h3 lane rows (run-gate-inflight-acquire's fixture world):
// every row present EXCEPT the declared lora — the first miss is
// the loras row, the family the fake seat reports as in flight.
const UNET = "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors";
const OP = "op-gate-hash";

const DIR = join(tmpdir(), "melite-gate-hash-voice-" + process.pid);
const CFG = join(DIR, "endpoint.json");
const MODELS = join(DIR, "models");
const PREV_CFG = process.env["COMFYUI_ENDPOINT_CONFIG"];
const PREV_SBX = process.env["INFERENCE_TEST_SANDBOX"];
const PREV_ROOT = process.env["MELITE_REPO_ROOT"];

beforeAll(() => {
  mkdirSync(join(MODELS, "diffusion_models"), { recursive: true });
  writeFileSync(join(MODELS, "diffusion_models", UNET), "x");
  mkdirSync(DIR, { recursive: true });
  writeFileSync(CFG, JSON.stringify({ url: "http://127.0.0.1:8188", model_base_path: MODELS }));
  process.env["COMFYUI_ENDPOINT_CONFIG"] = CFG;
  delete process.env["INFERENCE_TEST_SANDBOX"];
  process.env["MELITE_REPO_ROOT"] = DIR;
});

afterAll(() => {
  disarmProvisioningSeat(seat as unknown as ProvisioningService);
  if (PREV_CFG === undefined) delete process.env["COMFYUI_ENDPOINT_CONFIG"];
  else process.env["COMFYUI_ENDPOINT_CONFIG"] = PREV_CFG;
  if (PREV_SBX === undefined) delete process.env["INFERENCE_TEST_SANDBOX"];
  else process.env["INFERENCE_TEST_SANDBOX"] = PREV_SBX;
  if (PREV_ROOT === undefined) delete process.env["MELITE_REPO_ROOT"];
  else process.env["MELITE_REPO_ROOT"] = PREV_ROOT;
  rmSync(DIR, { recursive: true, force: true });
});

// THE SEAT DOUBLE: the process seat armed with the row this arm
// stamps — the gate reads it through the same provisioningSeat()
// query the real service arms.
let row: WeightAcquireProgress | null = null;
const seat = {
  progressOfRef: (_ref: ResourceRef): WeightAcquireProgress | null => row,
};
armProvisioningSeat(seat as unknown as ProvisioningService);

const ledgerRow = (state: WeightAcquireProgress["state"], phase: WeightAcquireProgress["phase"]): WeightAcquireProgress => ({
  operationId: OP,
  ref: { kind: "model", owner: "family", id: "h3" },
  state,
  bytes: 3_231_180_279,
  total: 7_343_591_088,
  ...(phase === undefined ? {} : { phase }),
});

describe("the run gate's in-flight voice names the hash phase (audit F10, the run-gate row)", () => {
  it("ARM H1 — a mid-verify acquire (phase verify) voices the fraction WITH the hashing word", () => {
    row = ledgerRow("verifying", "verify");
    const miss = lanePresenceMiss("h3");
    assert.ok(miss !== null, "the loras row is missing from the fixture store — the gate must refuse");
    // the fraction stays (the machine truth) and the phase word rides
    // INSIDE the in-flight voice — "44% · hashing", never a bare
    // frozen percent mid-hash
    assert.match(
      miss.message,
      /acquisition in flight \(44% · hashing\)/,
      "mid-verify the gate's voice froze at the bare fraction with no hash word — the operator reads a live hash as death (audit F10)",
    );
    // the in-flight voice keeps its other honest halves
    assert.match(miss.message, /in flight/);
    assert.match(miss.message, new RegExp(OP));
    assert.doesNotMatch(miss.message, /fetch it:/, "no fresh-fetch hint while the fetch runs");
  });

  it("ARM H2 — a mid-stream acquire (phase stream, bytes landing) never carries the hash word", () => {
    row = ledgerRow("acquiring", "stream");
    const miss = lanePresenceMiss("h3");
    assert.ok(miss !== null);
    assert.match(miss.message, /acquisition in flight/);
    assert.doesNotMatch(
      miss.message,
      /hashing/,
      "the gate stamped the hash word on a streaming row — the word stopped naming the hash phase and went always-true",
    );
  });

  it("ARM H3 — a phaseless verifying row (pre-phase-law ledger) still voices the hash word off the state", () => {
    row = ledgerRow("verifying", undefined);
    const miss = lanePresenceMiss("h3");
    assert.ok(miss !== null);
    assert.match(
      miss.message,
      /· hashing/,
      "the operation says verifying but the gate stayed silent about the hash — phaseless legacy rows read as frozen death",
    );
  });

  it("ARM H4 — a recheck row (the present-file re-hash) voices the hash word too", () => {
    row = ledgerRow("verifying", "recheck");
    const miss = lanePresenceMiss("h3");
    assert.ok(miss !== null);
    assert.match(
      miss.message,
      /· hashing/,
      "a present-file recheck IS the hash — the gate voiced a bare frozen percent for it",
    );
  });

  it("ARM H5 — the gate carries no literal hash word (audit F-1: the copy lives in the cardsLanesCopy table, never inlined at the gate)", () => {
    const src = readFileSync(fileURLToPath(new URL("../src/cardsLanes.ts", import.meta.url)), "utf8");
    const hit = src.split("\n").find((line) => /['"]hashing['"]/.test(line));
    assert.equal(
      hit,
      undefined,
      "an inlined 'hashing' literal at the gate bypasses the locale table — H1-H4 would still pass while the copy-home law dies: " + String(hit),
    );
  });
});

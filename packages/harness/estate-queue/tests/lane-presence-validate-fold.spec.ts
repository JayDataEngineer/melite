// lane-presence-validate-fold.spec.ts — THE VALIDATE SEAT FOLDS THE
// PRESENCE MISS (the 502 burn, 2026-10-24; the wall).
//
// THE BURN (the combination sweep's live red, twice-reproduced on the
// estate lane): a model-arm /v1/flows/validate for a family whose
// declared weights are not in the store answered 502 Bad Gateway —
// krea-2 and flux-klein, while families whose files stand answered
// 200 and families missing a required knob answered the lawful 400.
// The door's own law (doors.ts failEstate) mints 502 for any throw
// that is not a RemoteError, and composeValidateCard called
// lanePresenceRefusal OUTSIDE any fold: that gate THROWS its miss
// (phase1Card's pinned contract — "the refusal is a THROW, never a
// value"), so the raw CardArmError escaped the seat, escaped
// modelValidateArm's prepare-only fold, and died as a gateway error.
// The browser logged "Failed to load resource: 502" and the sweep's
// zero-silent-errors wall fired — the sweep was right, the seat was
// wrong.
//
// THE LAW WALLED HERE: the validate seat ANSWERS a lane-input miss
// with its verdict shape (message + lane_input_missing), the same
// voice phase1Card throws — it never lets the gate's CardArmError
// escape. A miss that escapes is a 502 at the door, and a 502 is
// indistinguishable from a dead seat.
//
// Arms (real booted DECLs; the gate armed by a fixture endpoint
// config whose store is EMPTY — every declared weight is missing):
//  VF-1 THE FOLD — composeValidateCard on a missing-weight family
//      resolves (never rejects) with code lane_input_missing and
//      the presence voice naming the family and the file.
//  VF-2 THE COMPOSE NEVER RAN — the refusal answers before
//      composeOnce (a folded miss must not half-compose).
//  VF-3 THE SAME SEAT ANSWERS 200 WHEN THE FILE LANDS — landing the
//      declared unet at its stock folder flips the same call to a
//      clean answer for a family whose remaining files the fixture
//      also lands (the fold is the miss path, not a blanket
//      refusal): seedvr2-ema, whose lane set the fixture can fully
//      satisfy.
//  VF-4 THE FOLD IS NOT A BLANKET CATCH — a non-CardArmError throw
//      from the gate keeps its identity (rethrown, never swallowed
//      into a refusal row): the fold narrows to the miss class only.
import "../../../../tests/helpers/boot-models.ts";
import { afterAll, beforeAll, describe, it, expect, vi } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { CardRegistryService } from "../src/cardsRegistry.ts";
import { FlowsSeatService } from "../src/flowsData.ts";
import { composeOnce } from "../src/cardsCompose.ts";
import { lanePresenceRefusal } from "../src/cardsLanes.ts";
import { resolveRepoRoot } from "@melite/comfyui-cordis";
import { mkdtempSync, readFileSync } from "node:fs";

vi.mock("../src/cardsCompose.ts", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/cardsCompose.ts")>();
  return { ...real, composeOnce: vi.fn(real.composeOnce) };
});
vi.mock("../src/cardsLanes.ts", async (importOriginal) => {
  // passthrough by default (VF-1..VF-3 ride the REAL gate); VF-4
  // flips one call to a plain Error through the same seam
  const real = await importOriginal<typeof import("../src/cardsLanes.ts")>();
  return { ...real, lanePresenceRefusal: vi.fn(real.lanePresenceRefusal) };
});

const DIR = join(tmpdir(), "melite-lane-validate-fold-" + process.pid);
const CFG = join(DIR, "endpoint.json");
const MODELS = join(DIR, "models");
const PREV_CFG = process.env["COMFYUI_ENDPOINT_CONFIG"];
const PREV_SBX = process.env["INFERENCE_TEST_SANDBOX"];
const PREV_ROOT = process.env["MELITE_REPO_ROOT"];

let svc: CardRegistryService;
let ctx: Context;

beforeAll(async () => {
  mkdirSync(MODELS, { recursive: true });
  writeFileSync(CFG, JSON.stringify({ url: "http://127.0.0.1:8188", model_base_path: MODELS }));
  // boot the registry under the AMBIENT root (card defs + facts are
  // workspace modules), then repoint the root at the fixture: the
  // presence probe reads MELITE_REPO_ROOT per call, so the runtime
  // tree leg (data/runtime/comfyui/models) misses on the fixture and
  // the mount leg (model_base_path above, EMPTY) misses too — every
  // declared weight is absent, the gate armed (cell-fold's world).
  ctx = new Context();
  new FlowsSeatService(ctx);
  (ctx as unknown as { queue: unknown }).queue = {
    stateRoot: mkdtempSync(join(tmpdir(), "lane-validate-fold-")),
    stateRoots: [] as string[],
  };
  svc = new CardRegistryService(ctx);
  await svc.prime();
  // the facts read resolves through repoRoot (cardsFacts.ts:101):
  // mirror the real model-facts.json into the fixture tree so the
  // repointed root starves ONLY the model store, never the facts
  const factsDir = join(DIR, "packages", "engines", "comfyui-cordis", "data");
  mkdirSync(factsDir, { recursive: true });
  writeFileSync(
    join(factsDir, "model-facts.json"),
    readFileSync(join(resolveRepoRoot(), "packages", "engines", "comfyui-cordis", "data", "model-facts.json")),
  );
  process.env["COMFYUI_ENDPOINT_CONFIG"] = CFG;
  delete process.env["INFERENCE_TEST_SANDBOX"];
  process.env["MELITE_REPO_ROOT"] = DIR;
}, 90_000);

afterAll(() => {
  if (PREV_CFG === undefined) delete process.env["COMFYUI_ENDPOINT_CONFIG"];
  else process.env["COMFYUI_ENDPOINT_CONFIG"] = PREV_CFG;
  if (PREV_SBX === undefined) delete process.env["INFERENCE_TEST_SANDBOX"];
  else process.env["INFERENCE_TEST_SANDBOX"] = PREV_SBX;
  if (PREV_ROOT === undefined) delete process.env["MELITE_REPO_ROOT"];
  else process.env["MELITE_REPO_ROOT"] = PREV_ROOT;
  rmSync(DIR, { recursive: true, force: true });
});

describe("THE VALIDATE SEAT FOLDS THE PRESENCE MISS (VF)", () => {
  it("VF-1 a missing declared weight answers lane_input_missing — the seat resolves, never rejects (the 502 burn's face)", async () => {
    vi.mocked(composeOnce).mockClear();
    const ans = await svc.composeValidateCard("image-gen", "z-image", { prompt: "a small test cat" });
    expect(ans).not.toBeNull();
    expect(ans?.code).toBe("lane_input_missing");
    expect(ans?.message).toContain("lane presence: family 'z-image'");
    expect(ans?.message).toContain("no store copy exists");
  });

  it("VF-2 the folded miss answers before any compose (never a half-compose)", async () => {
    vi.mocked(composeOnce).mockClear();
    await svc.composeValidateCard("image-gen", "z-image", { prompt: "a small test cat" });
    expect(composeOnce).not.toHaveBeenCalled();
  });

  it("VF-3 the same seat answers clean when the declared files stand (the fold is the miss path, not a blanket refusal)", async () => {
    // land seedvr2-ema's lane set DERIVED from the gate's own
    // structured miss rows (the popup's keying face) — never a
    // hand-maintained file list; the loop ends when the gate falls
    // silent, the same derived-roster law the cell-fold census rides
    const { lanePresenceMiss } = await import("../src/cardsLanes.ts");
    for (let i = 0; i < 8; i += 1) {
      const miss = lanePresenceMiss("seedvr2-ema", { input_image: "a.png" }, "seedvr2-ema");
      if (miss === null) break;
      const row = miss.lane;
      expect(row, "a presence miss carries its structured lane row (the popup's keying face)").toBeDefined();
      const folder = row!.folders[0] ?? "diffusion_models";
      mkdirSync(join(MODELS, folder), { recursive: true });
      writeFileSync(join(MODELS, folder, row!.missing), "x");
    }
    expect(lanePresenceMiss("seedvr2-ema", { input_image: "a.png" }, "seedvr2-ema")).toBeNull();
    vi.mocked(composeOnce).mockClear();
    vi.mocked(composeOnce).mockResolvedValue({ graph: true } as never);
    const ans = await svc.composeValidateCard("upscale-tools", "seedvr2-ema", { input_image: "a.png" });
    expect(ans).toBeNull();
  });

  it("VF-4 the fold is not a blanket catch — a non-CardArmError throw from the gate keeps its identity", async () => {
    // the gate is SYNC by contract (phase1Card's pinned throw): the
    // once-mock throws synchronously, exactly the escape class
    vi.mocked(lanePresenceRefusal).mockImplementationOnce(() => {
      throw new Error("gate broke");
    });
    await expect(
      svc.composeValidateCard("image-gen", "z-image", { prompt: "a small test cat" }),
    ).rejects.toThrow(/gate broke/);
  });
});

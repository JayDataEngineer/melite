// cards-registry-guard-faces.spec.ts — the three arms a withdrawn
// marker claim had hidden, pinned as behavior. A machine check
// proved each claim FALSE by executing this service: a facts file
// that will not
// read raises a plain error through BOTH catch seats (the rethrows
// are the guard, never a verdict string), and a familyless card
// address skips lane presence exactly as the run press composes it.
// The specs describe what each seat does, not that it is safe.
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

const composeOnce = vi.hoisted(() =>
  vi.fn(async (): Promise<Record<string, unknown>> => ({ graph: true })),
);
vi.mock("../src/cardsCompose.ts", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/cardsCompose.ts")>();
  return { ...real, composeOnce };
});

import { Context } from "@deepseek-ai/cordis";
import { CardRegistryService } from "../src/cardsRegistry.ts";
import { FlowsSeatService } from "../src/flowsData.ts";

/** A repo root with no facts file under it: loadFacts reads
 *  <root>/packages/engines/comfyui-cordis/data/model-facts.json, so
 *  the read fails at the filesystem — the plain error the catch seats
 *  must not flatten into a refusal string. */
const DEAD_ROOT = "/tmp/melite-guard-faces-absent-root";

describe("the facts read that fails loud", () => {
  let svc: CardRegistryService;
  let ctx: Context;
  beforeAll(async () => {
    vi.stubEnv("MELITE_REPO_ROOT", DEAD_ROOT);
    ctx = new Context();
    svc = new CardRegistryService(ctx);
    await svc.prime();
  });
  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("the model-less admission seat rethrows the read failure with its identity", () => {
    // admitStageRelations judges the undeclared-key gate first, and
    // that gate's first work is the facts read — so the failure
    // reaches this seat as a plain error, never as a CardArmError.
    // The contract: an unknown error stays an unknown error.
    expect(() => svc.admitStageRelations("tts", { text: "speak" })).toThrow(
      /ENOENT|no such file/,
    );
  });

  it("the validate probe's prepare seat rethrows the read failure with its identity", async () => {
    // composeValidateCard passes no factsArg, so prepareCardParams
    // loads the facts inside the marked try — same contract, same
    // plain error, same refusal-free identity.
    await expect(
      svc.composeValidateCard("tts", "qwen3-tts", { text: "speak" }, "qwen3-tts"),
    ).rejects.toThrow(/ENOENT|no such file/);
  });
});

describe("the familyless lane-presence skip", () => {
  let svc: CardRegistryService;
  beforeAll(async () => {
    const ctx = new Context();
    new FlowsSeatService(ctx);
    svc = new CardRegistryService(ctx);
    await svc.prime();
  });

  it("a card-id address prepares familyless and composes — the lane check stands down", async () => {
    // THE RUN-PRESS COMPOSE: the rig card boards no family, so its
    // prepared state is familyless (fam "", no model id). No family
    // row declares lanes, so nothing can be presence-checked — the
    // skip is this seat's contract, not an unreachable branch.
    const p1 = await svc.phase1Card(
      { mode: "auto", mesh_glb: "/tmp/guard-faces-mesh.glb" },
      "rig",
    );
    expect(p1.familyless).toBe(true);
    expect(p1.fam).toBe("");
  });

  it("a HIDDEN cell route takes the run door's tolerance — the selector refuses, the door absorbs", () => {
    // selectCardVariant refuses an address whose variant cell route
    // is hidden from the dropdown (pixal3d's bf16 cell is); prepare
    // raises that refusal and the selection tolerance absorbs it
    // whole — the same voice as the unknown-name case, never a
    // write-seat verdict.
    const verdict = svc.admitStageRelations("img-to-mesh", {
      model: "pixal3d-bf16",
      input_image: "/tmp/guard-faces-input.png",
    });
    expect(verdict).toEqual({ ok: true });
  });

  it("the SAME card board-refuses when the body STATES its id as the model", () => {
    // the discriminator: stated, the address is an unoffered model
    // and the board check names it (familyless needs mid, not a
    // stated body.model — so only the stated form is board-refused).
    expect(svc.admitStageModel("rig", "rig").ok).toBe(false);
  });
});

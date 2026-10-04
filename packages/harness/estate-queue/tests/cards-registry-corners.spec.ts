// cards-registry-corners.spec.ts — the registry's refusal faces
// that the tree's own suites never seated: the flow-rider census's
// bare and action-less family stages, the unknown-variant tolerance
// (the run door's voice, never the write seat's), the validate
// seat's non-string model address, and the prepare refusal riding
// the validate door's Refusal shape.
import { afterAll, beforeAll, describe, it, expect } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import { CardRegistryService } from "../src/cardsRegistry.ts";
import { plainStage, registerRegistryFlow } from "../src/flowsData.ts";
import type { RegistryFlow, RegistryStage } from "../src/flowsData.ts";

let svc: CardRegistryService;

beforeAll(async () => {
  const bootCtx = new Context();
  svc = new CardRegistryService(bootCtx);
  await svc.prime();
});

// A flow whose stage list carries every rider shape the census
// speaks: a bare stage (no card, no family — the expansion-only
// linked shape), a family stage with no action spelled at all (the
// JSON-authored shape; the '?' arm), and an ordinary card stage.
// The census names them all, never crashes.
const KINLESS: RegistryStage = {
  ...plainStage({
    id: "kinless",
    engine: "comfyui",
    family: "corners-family",
    description: "a family stage with no action",
    inputs: {},
    params: {},
  }),
  action: undefined as unknown as string,
};
const FIXTURE_FLOW: RegistryFlow = {
  id: "corners-rider-census",
  description: "the corners fixture — every rider shape in one list",
  stages: [
    plainStage({
      id: "bare",
      engine: "comfyui",
      description: "a stage with neither card nor family",
      inputs: {},
      params: {},
    }),
    KINLESS,
    plainStage({
      id: "speaking",
      engine: "comfyui",
      card: "tts",
      description: "an ordinary card stage",
      inputs: {},
      params: {},
    }),
  ],
  initialValidators: {},
  tool: null,
  skillRefs: [],
};

describe("the flow-rider census (an unknown card that names a flow)", () => {
  let dispose: () => void;
  beforeAll(() => {
    dispose = registerRegistryFlow(FIXTURE_FLOW);
  });
  afterAll(() => {
    dispose();
  });
  it("refuses with the honest split: card riders by id, family riders as family.action", () => {
    const verdict = svc.admitStageModel("corners-rider-census", "qwen3-tts");
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.error).toContain("'corners-rider-census'");
      // the card rider is named by its card id
      expect(verdict.error).toContain("tts");
      // an action-less family stage is named with the '?' action
      expect(verdict.error).toContain("corners-family.?");
    }
  });
});

describe("the selection tolerance (a wrong selection is the run door's voice)", () => {
  it("an unknown variant ADMITS at the write seat — the run names it, never the bench", () => {
    const verdict = svc.admitStageRelations("tts", {
      model: "qwen3-tts",
      variant: "no-such-variant",
      text: "speak",
    });
    expect(verdict).toEqual({ ok: true });
  });
  it("an unknown quant ADMITS the same way — one tolerance, both coordinates", () => {
    const verdict = svc.admitStageRelations("tts", {
      model: "qwen3-tts",
      variant: "customvoice",
      quant: "no-such-quant",
      text: "speak",
    });
    expect(verdict).toEqual({ ok: true });
  });
  it("a dangling artifact ref ADMITS at the write seat — the run door refuses it at compose", () => {
    // the selection coordinates are all stated and non-empty, so
    // the prepare failure is not a selection voice: this seat
    // judges only the DECL's own words
    const verdict = svc.admitStageRelations("tts", {
      model: "qwen3-tts",
      variant: "customvoice",
      text: "speak",
      ref_audio: "/v1/assets/runs/run-9/ghost.png",
    });
    expect(verdict).toEqual({ ok: true });
  });
  it("an EMPTY quant refuses at the write seat in the run door's own voice (the false-admit cure)", () => {
    const verdict = svc.admitStageRelations("image-gen", {
      model: "z-image",
      variant: "turbo",
      quant: "",
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.error).toMatch(/unknown quant ""/);
  });
});

describe("the familyless tolerance (a card id as the model address)", () => {
  it("a card-id model composes familyless — the lane seat judges nothing there", () => {
    // the run press names the card itself: fam '' is the
    // model-less marker, so no family row and no lane voice
    const verdict = svc.admitStageRelations("upscale-tools", { model: "upscale-tools" });
    expect(verdict).toEqual({ ok: true });
  });
});

describe("composeValidateCard's address and prepare faces", () => {
  it("a card-id address a family card does not offer refuses at the board check (the offer is the address)", async () => {
    // upscale-tools boards seedvr2_ema; its own id is not an
    // offer — BROKEN-A's law holds at the validate door too
    const verdict = await svc.composeValidateCard(
      "upscale-tools",
      "upscale-tools",
      { model: "upscale-tools" },
    );
    expect(verdict).not.toBeNull();
    expect(verdict?.message).toContain("not offered by card 'upscale-tools'");
  });

  it("a non-string model in the params falls back to the stated family address", async () => {
    // the overlay consumed the model; the door derives the address
    // from the family, never from a non-string coordinate
    const verdict = await svc.composeValidateCard(
      "tts",
      "qwen3-tts",
      { model: 7, text: "speak" },
    );
    expect(verdict).toBeNull();
  });

  it("an empty quant selection refuses THROUGH the door's Refusal shape (never a throw)", async () => {
    const verdict = await svc.composeValidateCard(
      "image-gen",
      "z-image",
      { model: "z-image", variant: "turbo", quant: "" },
      "z-image",
    );
    expect(verdict).not.toBeNull();
    expect(verdict?.message).toMatch(/unknown quant ""/);
    // the refusal carries the throwing arm's own code — the run
    // door's shape, surfaced verbatim
    expect(verdict?.code).toBe("card_compose");
  });
});

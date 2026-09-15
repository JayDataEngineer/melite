// @melite/comfyui-card-kit — the IP-Adapter firing gate (fate
// 'refused', the ray receipt). The gate IS the unit: boarding-first
// refusal, the receipt text, the empty-bag lane promise. No chain
// test exists because NO LANE BUILDS — that is the whole point; the
// day a real Z-Image IP-Adapter lands, this file flips to the
// ControlNet spec's shape (gate + chain) or dies with the refusal.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { imageT2I } from "../src/kit.ts";
import { GraphBuilder } from "../src/graph.ts";
import { refuseIPAdapterFiring, PACK_FATE } from "../src/mods/guard.ts";

const ZIMAGE = { id: "z-image", mods: ["loras", "controlnet", "ip_adapter"] };
const KREA = { id: "krea-2", mods: ["loras"] };

const FACTS = {
  id: "z-image", card: "image-gen", defaults: {}, card_knobs: [], variants: [],
  variant_groups: [], outputs: [], mods: ["loras", "controlnet", "ip_adapter"],
  lane_inputs: {
    unet: "z_image_turbo_int8_convrot.safetensors", vae: "ae.safetensors",
    clip: "", clip2: "", text_encoder: "qwen_3_4b.safetensors", clip_type: "lumina2",
    latent_node: "EmptySD3LatentImage",
  },
} as never;

describe("refuseIPAdapterFiring (the refused fate, boarding-first)", () => {
  it("empty/absent = the lane promise = rides inert (the plain run)", () => {
    refuseIPAdapterFiring(ZIMAGE, {});
    refuseIPAdapterFiring(ZIMAGE, { ip_adapters: [] });
  });
  it("a stated entry refuses LOUD with the ray receipt", () => {
    assert.throws(
      () => refuseIPAdapterFiring(ZIMAGE, { ip_adapters: [{ kind: "style", weight: 1 }] }),
      (err: unknown): boolean =>
        err instanceof Error &&
        err.message.includes("ip_adapters [style] refuses: no executable IP-Adapter lane") &&
        err.message.includes("SD1.5-era files that never stood on disk") &&
        err.message.includes("cannot patch Z-Image's S3-DiT") &&
        err.message.includes("The ray lane silently skipped used entries; this gate refuses"),
    );
  });
  it("names EVERY stated kind in the refusal", () => {
    assert.throws(
      () => refuseIPAdapterFiring(ZIMAGE, {
        ip_adapters: [{ kind: "face" }, { kind: "composition" }],
      }),
      (err: unknown): boolean =>
        err instanceof Error && err.message.includes("ip_adapters [face, composition] refuses"),
    );
  });
  it("a smuggled bag on a non-boarding atom is drift, not a skip", () => {
    assert.throws(
      () => refuseIPAdapterFiring(KREA, { ip_adapters: [{ kind: "style" }] }),
      (err: unknown): boolean =>
        err instanceof Error &&
        err.message.includes("model 'krea-2' does not board the 'ip_adapter' pack"),
    );
  });
  it("the fate table row is 'refused' (boot gate (d) reads it)", () => {
    assert.equal(PACK_FATE["ip_adapter"], "refused");
  });
});

describe("the lane gate (imageT2I refuses before any node renders)", () => {
  it("a stated bag refuses inside the compose lane — never a silent plain run", () => {
    const g = new GraphBuilder({});
    assert.throws(
      () => imageT2I(
        { prompt: "x", negative_prompt: "", width: 512, height: 512, seed: 1, steps: 8, cfg: 1, sampler: "euler", scheduler: "simple", ip_adapters: [{ kind: "style", weight: 1 }] },
        FACTS, g, "probe-ipa",
      ),
      (err: unknown): boolean =>
        err instanceof Error && err.message.includes("no executable IP-Adapter lane"),
    );
  });
  it("no bag = the plain path is byte-stable (the gate never fires)", () => {
    const g = new GraphBuilder({});
    const out = imageT2I(
      { prompt: "x", negative_prompt: "", width: 512, height: 512, seed: 1, steps: 8, cfg: 1, sampler: "euler", scheduler: "simple" },
      FACTS, g, "probe-plain",
    );
    assert.ok(out, "the plain run renders");
  });
});

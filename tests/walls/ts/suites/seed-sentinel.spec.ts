// seed-sentinel.spec.ts — GATE S (the seed-sentinel contract, estate
// law): -1 is RANDOM, minted at render so every node sharing the
// seed shares the MINTED value. The MiniMax music lane died live on
// a raw -1 (ComfyUI 400: MiniMaxMusic3TextEncode seed min 0), and
// every KSampler-family node validates the same floor — the audit
// found twelve raw sites across nine lanes, all converted onto the
// one mintSeed helper (2026-09-09).
//
// Pinned shapes (stub GraphBuilder, no ComfyUI):
//   1. mintSeed: -1 mints a non-negative int; explicit seeds ride
//      verbatim; below -1 / non-int refuses LOUD with the pinned
//      voice (never a silent coerce).
//   2. musicT1 with -1: BOTH seed nodes (MiniMaxMusic3TextEncode +
//      KSampler) carry the SAME minted non-negative int (the crash
//      shape, closed).
//   3. musicT1 with an explicit seed: both nodes carry it verbatim
//      (golden parity — the compose goldens only ever use explicit
//      seeds, so minting is identity there).
//   4. imageEdit with -1: the KSampler seed mints (the KSampler twin
//      of the music crash).
//
// Run: npx vitest run tests/walls/ts/suites/seed-sentinel.spec.ts
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "../../../../packages/engines/comfyui-card-kit/src/graph.ts";
import { imageEdit, mintSeed, musicT1 } from "../../../../packages/engines/comfyui-card-kit/src/kit.ts";
import type { ModelFacts } from "../../../../packages/engines/comfyui-card-kit/src/facts.ts";

function musicModel(): ModelFacts {
  return {
    lane_inputs: {
      unet: "music3/unet.safetensors",
      text_encoder: "music3/text.safetensors",
      clip_type: "minimax",
      vae: "music3/vae.safetensors",
    },
  } as unknown as ModelFacts;
}

function musicParams(seed: unknown): Record<string, unknown> {
  return {
    prompt: "funk, pop, soul, guitar, 105 BPM",
    lyrics: "",
    duration: 30,
    guidance_scale: 1.7,
    n_diffusion_steps: 30,
    lm_cfg_scale: 1.7,
    seed,
  };
}

function seedsOf(g: GraphBuilder, classType: string, input: string): unknown[] {
  const graph = g.toJSON() as unknown as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
  return Object.values(graph)
    .filter((n): boolean => n.class_type === classType)
    .map((n): unknown => n.inputs[input]);
}

function isMinted(v: unknown): boolean {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v < 2147483647;
}

describe("GATE S: the seed sentinel mints at render", () => {
  it("mintSeed mints -1, passes explicit seeds, refuses loud", (): void => {
    const minted: number = mintSeed({ seed: -1 });
    assert.ok(isMinted(minted), "minted: " + String(minted));
    assert.equal(mintSeed({ seed: 42 }), 42);
    assert.equal(mintSeed({ seed: 0 }), 0);
    for (const bad of [-2, 1.5, "42", null, undefined, {}]) {
      assert.throws(
        (): void => {
          mintSeed({ seed: bad });
        },
        /-1 \(random\) or a non-negative int is required/,
        "refuses: " + String(bad),
      );
    }
  });

  it("musicT1 with -1 shares one minted seed across both nodes", (): void => {
    const g = new GraphBuilder();
    musicT1(musicParams(-1), musicModel(), g, "run-seedwall");
    const enc: unknown[] = seedsOf(g, "MiniMaxMusic3TextEncode", "seed");
    const ks: unknown[] = seedsOf(g, "KSampler", "seed");
    assert.equal(enc.length, 1, "one encode node");
    assert.equal(ks.length, 1, "one sampler node");
    assert.ok(isMinted(enc[0]), "encode minted: " + String(enc[0]));
    assert.equal(ks[0], enc[0], "the sampler shares the MINTED value");
  });

  it("musicT1 with an explicit seed passes it verbatim", (): void => {
    const g = new GraphBuilder();
    musicT1(musicParams(7), musicModel(), g, "run-seedwall");
    assert.deepEqual(seedsOf(g, "MiniMaxMusic3TextEncode", "seed"), [7]);
    assert.deepEqual(seedsOf(g, "KSampler", "seed"), [7]);
  });

  it("musicT1 with -2 refuses before emitting a node", (): void => {
    const g = new GraphBuilder();
    assert.throws(
      (): void => {
        musicT1(musicParams(-2), musicModel(), g, "run-seedwall");
      },
      /-1 \(random\) or a non-negative int is required/,
    );
    assert.deepEqual(Object.keys(g.toJSON() as unknown as object), [], "nothing emitted");
  });

  it("imageEdit with -1 mints the KSampler seed", (): void => {
    const g = new GraphBuilder();
    const model = {
      lane_inputs: {
        unet: "edit/unet.safetensors",
        text_encoder: "edit/text.safetensors",
        clip_type: "qwen",
        vae: "edit/vae.safetensors",
      },
    } as unknown as ModelFacts;
    imageEdit(
      { prompt: "make it dusk", image1: "in.png", seed: -1 } as Record<string, unknown>,
      model,
      g,
      "run-seedwall",
    );
    const ks: unknown[] = seedsOf(g, "KSampler", "seed");
    assert.equal(ks.length, 1, "one sampler node");
    assert.ok(isMinted(ks[0]), "sampler minted: " + String(ks[0]));
  });
});

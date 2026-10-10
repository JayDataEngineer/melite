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
//   2. the music3 action with -1: BOTH seed nodes
//      (MiniMaxMusic3TextEncode + KSampler) carry the SAME minted
//      non-negative int (the crash shape, closed). The lane is the
//      family's own action now (the kit's musicT1 retired with the
//      kit-arm retirement); the law is the mint, not the arm.
//   3. the music3 action with an explicit seed: both nodes carry it
//      verbatim (golden parity — the compose goldens only ever use
//      explicit seeds, so minting is identity there).
//   4. imageEdit with -1: the KSampler seed mints (the KSampler twin
//      of the music crash).
//
// Run: npx vitest run tests/walls/ts/suites/seed-sentinel.spec.ts
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { GraphBuilder } from "../../../../packages/engines/comfyui-card-kit/src/graph.ts";
import { instantiateAction, mintSeed } from "../../../../packages/engines/comfyui-card-kit/src/kit.ts";
// the edit lane is the family's declared action now (the kit-arm retirement)
import { edit as qwenEdit } from "../../../../packages/models/qwen-img-edit-2511/src/actions.ts";
import { DECL as qwenEdit2511Decl } from "../../../../packages/models/qwen-img-edit-2511/src/index.ts";
import { compose as musicCompose } from "../../../../packages/models/music3/src/actions.ts";
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

  it("the music3 action with -1 shares one minted seed across both nodes", (): void => {
    const g = new GraphBuilder();
    instantiateAction(musicCompose, musicParams(-1), musicModel(), g, "run-seedwall");
    const enc: unknown[] = seedsOf(g, "MiniMaxMusic3TextEncode", "seed");
    const ks: unknown[] = seedsOf(g, "KSampler", "seed");
    assert.equal(enc.length, 1, "one encode node");
    assert.equal(ks.length, 1, "one sampler node");
    assert.ok(isMinted(enc[0]), "encode minted: " + String(enc[0]));
    assert.equal(ks[0], enc[0], "the sampler shares the MINTED value");
  });

  it("the music3 action with an explicit seed passes it verbatim", (): void => {
    const g = new GraphBuilder();
    instantiateAction(musicCompose, musicParams(7), musicModel(), g, "run-seedwall");
    assert.deepEqual(seedsOf(g, "MiniMaxMusic3TextEncode", "seed"), [7]);
    assert.deepEqual(seedsOf(g, "KSampler", "seed"), [7]);
  });

  it("the music3 action with -2 refuses before emitting a node", (): void => {
    const g = new GraphBuilder();
    assert.throws(
      (): void => {
        instantiateAction(musicCompose, musicParams(-2), musicModel(), g, "run-seedwall");
      },
      /-1 \(random\) or a non-negative int is required/,
    );
    assert.deepEqual(Object.keys(g.toJSON() as unknown as object), [], "nothing emitted");
  });

  it("the 2511 edit action with -1 mints the KSampler seed", (): void => {
    const g = new GraphBuilder();
    // the family's OWN lane truth (a hand-copied row here would be a
    // second truth the moment a weight or a node class is renamed)
    const model = {
      id: "qwen-img-edit-2511",
      card: "image-edit",
      defaults: {},
      variants: [],
      variant_groups: [],
      outputs: [],
      mods: [],
      lane_inputs: (qwenEdit2511Decl as { lane_inputs: Record<string, unknown> }).lane_inputs,
    } as unknown as ModelFacts;
    instantiateAction(qwenEdit,
      { prompt: "make it dusk", image1: "in.png", seed: -1 } as Record<string, unknown>,
      model,
      g,
      "run-seedwall",
    );
    const ks: unknown[] = seedsOf(g, "KSampler", "seed");
    assert.equal(ks.length, 1, "one sampler node");
    assert.ok(isMinted(ks[0]), "sampler minted: " + String(ks[0]));
  });

  it("every seed-consuming lane mints through the one helper (derived, never hand-listed)", (): void => {
    // THE M12 KILL: this wall pinned musicT1 + imageEdit BY HAND while
    // nine lanes consume seeds — any other lane could regress to a
    // raw p.seed and the wall stayed green (the exact rot the
    // MiniMax crash came from). The pinned set is now DERIVED from
    // the sources: a lane file that so much as names a seed must
    // mint through the helper, and the random mint itself may live
    // ONLY in graph-helpers (nowhere else mints its own).
    const dir = join(import.meta.dirname, "../../../../packages/engines/comfyui-card-kit/src");
    const lanes = readdirSync(dir).filter((f) => f.startsWith("lanes-") && f.endsWith(".ts"));
    // the census is pinned EXACTLY (the header's "nine lanes" is 2026-
    // 09-09 history; consolidation left five lane files, and the
    // kit-arm retirement took the fifth — lanes-video.ts went to the h3
    // family with finalizeH3, because a finalize pass with no lane
    // beside it is a second home. A new file or a rename is a
    // deliberate wall edit, never a silent drift.
    assert.deepEqual(
      [...lanes].sort(),
      ["lanes-3d.ts", "lanes-audio.ts", "lanes-image-tools.ts", "lanes-image.ts"],
      "the lane-file census changed — update this pin deliberately",
    );
    const offenders: string[] = [];
    for (const f of lanes) {
      const src = readFileSync(join(dir, f), "utf8");
      if (/\bseed\b/i.test(src) && !/mintSeed|voiceLockSeed/.test(src)) offenders.push(f);
    }
    assert.deepEqual(
      offenders,
      [],
      "lane files name a seed without minting through the helper: " + offenders.join(", "),
    );
    // the mint is one function: Math.random lives in graph-helpers and
    // nowhere else in card-kit (a lane rolling its own random is a
    // second mint — the shared-value law dies with it).
    const randoms: string[] = [];
    for (const f of readdirSync(dir).filter((f) => f.endsWith(".ts"))) {
      if (f === "graph-helpers.ts") continue;
      if (readFileSync(join(dir, f), "utf8").includes("Math.random")) randoms.push(f);
    }
    assert.deepEqual(randoms, [], "Math.random outside graph-helpers: " + randoms.join(", "));
    // THE ACTION ROUTE (atom vocabulary, stroke 2): family actions
    // under packages/models/*/src/actions.ts name seeds too — the
    // mint stays the ONE helper (they mint through instantiateAction
    // inside card-kit, never their own Math.random) and a seed
    // param always rides the declared sentinel rule. The walk is
    // two bounded levels (a recursive readdir walks the pnpm store
    // through package node_modules symlinks and dies).
    const modelsDir = join(import.meta.dirname, "../../../../packages/models");
    const actionFiles = readdirSync(modelsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(join(modelsDir, d.name, "src/actions.ts")))
      .map((d) => `${d.name}/src/actions.ts`)
      .sort();
    assert.deepEqual(
      actionFiles,
      [
        "anima/src/actions.ts",
        "anny/src/actions.ts",
        "anycreature/src/actions.ts",
        "autoremesher/src/actions.ts",
        "fit/src/actions.ts",
        "florence2/src/actions.ts",
        "flux-klein/src/actions.ts",
        "gem_soma/src/actions.ts",
        "h3/src/actions.ts",
        "input/src/actions.ts",
        "joycaption/src/actions.ts",
        "joytag/src/actions.ts",
        "kimodo/src/actions.ts",
        "krea-2/src/actions.ts",
        "mask/src/actions.ts",
        "moss-sfx/src/actions.ts",
        "music3/src/actions.ts",
        "pixal3d/src/actions.ts",
        "qwen-img-21/src/actions.ts",
        "qwen-img-edit-21/src/actions.ts",
        "qwen-img-edit-2511/src/actions.ts",
        "qwen3-tts-voicedesign/src/actions.ts",
        "qwen3-tts/src/actions.ts",
        "seedvr2_ema/src/actions.ts",
        "skin/src/actions.ts",
        "transfer_rig/src/actions.ts",
        "trellis2-native/src/actions.ts",
        "wd14/src/actions.ts",
        "yue2/src/actions.ts",
        "z-image/src/actions.ts",
      ],
      "the family-actions census changed — update this pin deliberately",
    );
    const actionOffenders: string[] = [];
    const sentinelMisses: string[] = [];
    // THE SHARED-BLOCK CARRY (named): a family that spreads the
    // shared diffusion rows (card-kit paramRows.ts) declares its
    // seed row — rule and all — from the ONE factory; the rule
    // literal lives there, not per family. The semantic proof that
    // the factory's rows carry the rule is the deep-equal wall
    // (diffusion-param-rows.spec.ts); this text law only needs to
    // not false-refuse the families that ride the factory.
    // THE CHANNEL CARVE (named, pinned): these actions carry a seed
    // that arrives as a `$` channel ref the merged worker resolves
    // per run — mintSeed takes ints only, so declaring the rule
    // would refuse the ref at compose. A carve member must still
    // spell the rationale in its source (the marker sentence below);
    // every other file obeys the generic law.
/**
 * Strip comments with a string-aware scan: a `//` or `/* ... *​/'
 * inside a string literal is string content, not a comment; code
 * mentions survive, comment mentions die. The scan tracks ', ", `
 * (with \\ escapes); template interpolations are read as string
 * content — a mention inside ${...} is prose to this wall, and no
 * family interpolates the factory.
 */
function stripComments(src: string): string {
  let out = "";
  let i = 0;
  let quote: string | null = null;
  while (i < src.length) {
    const c = src[i];
    if (quote) {
      out += c;
      if (c === "\\") { out += src[i + 1] ?? ""; i += 2; continue; }
      if (c === quote) quote = null;
      i += 1;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { quote = c; out += c; i += 1; continue; }
    if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i += 1;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i += 1;
      i += 2;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

    const channelCarve = ["skin/src/actions.ts"];
    const carveRationaleMisses: string[] = [];
    for (const f of actionFiles) {
      const src = readFileSync(join(modelsDir, f), "utf8");
      if (src.includes("Math.random")) actionOffenders.push(f);
      const code = stripComments(src);
      if (/\bseed\b/.test(code) && !code.includes('"seed-sentinel"') && !code.includes("diffusionParamRows(")) {
        if (channelCarve.includes(f)) {
          if (!src.includes("held by the channel instead of the mint")) {
            carveRationaleMisses.push(f);
          }
        } else {
          sentinelMisses.push(f);
        }
      }
    }
    assert.deepEqual(
      actionOffenders,
      [],
      "family actions roll their own randomness (the mint is card-kit's alone): " + actionOffenders.join(", "),
    );
    assert.deepEqual(
      carveRationaleMisses,
      [],
      "channel-carve actions must spell the ref-resolution rationale in source: " + carveRationaleMisses.join(", "),
    );
    assert.deepEqual(
      sentinelMisses,
      [],
      "family actions name a seed without declaring the seed-sentinel rule: " + sentinelMisses.join(", "),
    );
  });
});

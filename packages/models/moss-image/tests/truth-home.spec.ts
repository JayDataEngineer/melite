// @contract models-moss-decl-prose-truth
// truth-home.spec.ts — THE DECL PROSE TRUTH WALL (the owed half of
// the 021 audit's C2): the family's truth home (src/index.ts — the
// file humans and agent docs read first) and the package README
// never re-state the falsified claims the moss audits burned:
//   1. the text tower riding "the int8 convrot split" (the tower is
//      Qwen3.5-9B under the template's w4a8_gptq tokenizer split —
//      the int8 convrot split is the UNET's default cell, never the
//      tokenizer);
//   2. the VAE being klein's "byte-for-byte" twin with an identical
//      sha256 (moss provisions flux2-vae_small.safetensors, a
//      different, smaller file than the klein lane's flux2-vae);
//   3. the lane being "the advanced sampling stack" (the FLUX.2
//      SamplerCustomAdvanced topology was the 2026-10-20 weave
//      burn; the lane is the template's plain KSampler);
//   4. attributing the 50/3 defaults to the Comfy-Org template's
//      own defaults (the template UI ships 25 steps / CFG 2.5; 50/3
//      er_sde/simple is OpenMOSS's own t2i table — the attribution
//      VALUES are walled in decl.spec.ts).
// The corrected claims ride beside the refusals: a truth home that
// drops them has stopped telling the truth the audits cured. House
// pattern: the contract-words walls (provisioning
// contract-words.spec.ts, comfyui-cordis contract-envelope.spec.ts)
// judge their own src as text — prose carries no runtime door. The
// README arms ride the same pattern over the package README (the
// 2026-11-15 debt closed: a pattern that judges prose files was no
// reason to leave the README unguarded).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const TRUTH_HOME = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");
const README = readFileSync(new URL("../README.md", import.meta.url), "utf8");

describe("the DECL truth home never re-states the falsified claims (the moss artifact audits)", () => {
  it("the text tower is never claimed as the int8 convrot split — the tower is the w4a8_gptq tokenizer split", () => {
    assert.ok(!/text tower is[\s\S]{0,80}int8 convrot/.test(TRUTH_HOME),
      "the falsified text-tower claim is back in the truth home — the tower is Qwen3.5-9B under the template's w4a8_gptq tokenizer split (021 audit F4); the int8 convrot split is the unet's default cell, never the tokenizer");
  });

  it("the VAE is never claimed byte-for-byte identical to klein's — the template's small VAE is a different file", () => {
    assert.ok(!/byte-for-byte|identical sha256/.test(TRUTH_HOME),
      "the falsified klein-VAE identity claim is back in the truth home — moss provisions flux2-vae_small.safetensors (the OpenMOSS artifact cure), NOT the full flux2-vae the klein lane rides (021 audit F4)");
  });

  it("the lane is never claimed as the advanced sampling stack — the plain KSampler is the lane", () => {
    assert.ok(!/advanced sampling stack/.test(TRUTH_HOME),
      "the falsified advanced-stack claim is back in the truth home — the FLUX.2 SamplerCustomAdvanced topology was the 2026-10-20 weave burn and leaves with the stack; the lane is the template's plain KSampler");
  });

  it("50/3 is never attributed to the Comfy-Org template's own defaults — the attribution is OpenMOSS's own t2i table", () => {
    assert.ok(!/template's own defaults/.test(TRUTH_HOME),
      "the mis-attribution is back in the truth home — the Comfy-Org template UI ships 25 steps / CFG 2.5; 50/3 er_sde/simple is OpenMOSS's own t2i table (the template's comparison table)");
  });

  it("the corrected claims ride the header — the truth home still tells the truth the audits cured", () => {
    assert.ok(TRUTH_HOME.includes("w4a8_gptq"),
      "the text tower's corrected claim (the template's w4a8_gptq tokenizer split) rides the header");
    assert.ok(TRUTH_HOME.includes("flux2-vae_small"),
      "the VAE's corrected claim (the template's small decoder) rides the header");
    assert.ok(/NOT the[\s/]*full flux2-vae/.test(TRUTH_HOME),
      "the VAE's anti-identity claim (NOT the full flux2-vae the klein lane rides) rides the header");
    assert.ok(TRUTH_HOME.includes("plain KSampler"),
      "the lane's corrected claim (the template's plain KSampler) rides the header");
    assert.ok(/OpenMOSS's own t2i defaults|OpenMOSS's own t2i recommendations/.test(TRUTH_HOME),
      "the defaults attribution (OpenMOSS's own t2i table) rides the header");
  });
});

describe("the package README never re-states the falsified claims (the moss artifact audits)", () => {
  it("the README's falsifiable claims stay falsified: the four burned phrasings refuse", () => {
    assert.ok(!/text tower is[\s\S]{0,80}int8 convrot/.test(README),
      "the falsified text-tower claim is back in the README — the tower is the w4a8_gptq tokenizer split, the int8 convrot split is the unet's default cell");
    assert.ok(!/byte-for-byte|identical sha256/.test(README),
      "the falsified klein-VAE identity claim is back in the README — moss provisions flux2-vae_small, NOT the klein lane's full flux2-vae");
    assert.ok(!/advanced sampling stack/.test(README),
      "the falsified advanced-stack claim is back in the README — the lane is the template's plain KSampler; the SamplerCustomAdvanced topology was the 2026-10-20 weave burn");
    assert.ok(!/template's own defaults/.test(README),
      "the mis-attribution is back in the README — the template UI ships 25 steps / CFG 2.5; 50/3 is OpenMOSS's own t2i table");
  });

  it("the README still tells the cured story: attribution, disarm, template negative, plain lane", () => {
    assert.ok(/OpenMOSS's own t2i recommendations/.test(README),
      "the defaults attribution (OpenMOSS's own t2i table) rides the README");
    assert.ok(/template UI itself ships 25 steps \/ CFG 2\.5/.test(README),
      "the attribution's contrast (the template UI's own 25/2.5) rides the README");
    assert.ok(/no SLG node on this lane/.test(README),
      "the SLG disarm (the bypass emits, no SLG node) rides the README");
    assert.ok(README.includes("ConditioningZeroOut is never composed here"),
      "the negative-arm cure (never ConditioningZeroOut) rides the README");
    assert.ok(README.includes("nsfw, worst quality, bad anatomy, watermark, jpeg artifact"),
      "the template reference default (the blank negative's text) rides the README");
    assert.ok(/plain KSampler/.test(README),
      "the lane's corrected claim (the template's plain KSampler) rides the README");
  });
});

// @melite/models-anima — the model-plugin data pins.
// (Carrier law: see melite-models-krea-2/tests — a model plugin
// carries its whole truth; registration is proven engine-side.)
//
// Run: npx vitest run --project node
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { judgeSamplerEnvelope } from "@melite/contracts/laneRelations";
import { DECL, family } from "../src/index.ts";

describe("the anima model plugin", () => {
  it("is a plugin boarding exactly the loras pack (THE LORAS REFUSAL, 2026-11-06 8153a8a37 — every image family boards the pack; anima authored nothing, the DECL entry + first-party adapter seed cured the 'unknown param: loras' unlanding)", () => {
    assert.equal(family.name, "family-anima");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
    assert.deepEqual(DECL.mods, ["mask", "loras"], "anima boards the mask + loras packs (the MASK ORDER + the loras truth)");
  });

  it("carries its defaults (the er_sde sampler is the anima tell)", () => {
    assert.equal(DECL.id, "anima");
    assert.equal((DECL.defaults ?? {}).sampler, "er_sde");
    assert.equal(DECL.genre, "image");
  });
});

// THE VERBATIM CONTENT LAW: every declared provision row's digest, url
// and size are literals in the table below — a substituted sha, a wrong
// path inside the right repo, or a drifted size fails this block. A new
// row is a deliberate edit of this table.
const PROVISION_PINS: ReadonlyArray<
  readonly [name: string, sha256: string, url: string, size_bytes: number]
> = [
  ["anima-base-v1.0.safetensors", "bd43b7cffe1ed1153d9c41e7beb2f18cb1273eafbaa3af3edd6a173dc90a006e", "https://huggingface.co/circlestone-labs/Anima/resolve/main/split_files/diffusion_models/anima-base-v1.0.safetensors", 4182218328],
  ["qwen_3_06b_base.safetensors", "cd2a512003e2f9f3cd3c32a9c3573f820bb28c940f73c57b1ddaa983d9223eba", "https://huggingface.co/Qwen/Qwen3-0.6B-Base/resolve/main/model.safetensors", 1192135096],
  ["qwen_image_vae.safetensors", "a70580f0213e67967ee9c95f05bb400e8fb08307e017a924bf3441223e023d1f", "https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/vae/qwen_image_vae.safetensors", 253806246],
];

describe("the declared provisions are pinned verbatim", () => {
  it("every row carries its pinned sha256, url and size_bytes", () => {
    const rows = DECL.provisions ?? [];
    assert.deepEqual(rows.map((r) => r.name), PROVISION_PINS.map((p) => p[0]),
      "the pin table IS the declared table — a row added, dropped or renamed is a deliberate edit");
    for (const [name, sha256, url, size_bytes] of PROVISION_PINS) {
      const row = rows.find((r) => r.name === name)!;
      assert.equal(row.sha256, sha256, `${name}: the digest is pinned verbatim — a substituted sha fails here`);
      assert.equal(row.url, url, `${name}: the url is pinned verbatim — a wrong path inside the right repo fails here`);
      assert.equal(row.size_bytes, size_bytes, `${name}: the declared size is pinned verbatim`);
    }
  });
});

// THE THREE CHECKPOINTS (operator 2026-10-16): Base v1.0, Turbo
// v1.1, Aesthetic v1.1 — every per-cell download carries the same
// verbatim law as provisions. The digests below were stream-hashed
// from the declared urls (2026-10-16); the two bf16 shas cross-read
// identical against the publisher's official Civitai account files.
const ARTIFACT_PINS: ReadonlyArray<
  readonly [variant: string, quant: string, name: string, sha256: string, url: string, size_bytes: number]
> = [
  ["base", "int8_convrot", "anima-base-v1.0-int8convrot.safetensors", "1ee1da031d651cea747716afccedd45b1c51317330a3e2393da08f013174fd69", "https://huggingface.co/Bedovyy/Anima-INT8/resolve/main/anima-base-v1.0-int8convrot.safetensors", 2649827358],
  ["turbo", "int8_convrot", "anima-turbo-v1.1-int8convrot.safetensors", "c462bea054de87ea03000e83f2b60e6d58fbcb6b925d9f607f8a470eeaad52b4", "https://huggingface.co/Bedovyy/Anima-INT8/resolve/main/anima-turbo-v1.1-int8convrot.safetensors", 2649848838],
  ["turbo", "bf16", "anima-turbo-v1.1.safetensors", "fba11953276b57edf59d1dc4f1857ac05aa079c56f982b4d7c20298d57d3f7eb", "https://huggingface.co/circlestone-labs/Anima/resolve/main/split_files/diffusion_models/anima-turbo-v1.1.safetensors", 4182230656],
  ["aesthetic", "int8_convrot", "anima-aesthetic-v1.1-int8convrot.safetensors", "3fcddb378b9b2ffab20878ed8fb379ae2c34005ba327f475d2cd3b9e91350cda", "https://huggingface.co/Bedovyy/Anima-INT8/resolve/main/anima-aesthetic-v1.1-int8convrot.safetensors", 2649848838],
  ["aesthetic", "bf16", "anima-aesthetic-v1.1.safetensors", "3c1868387a3a1ff504bbb87c33678321965ead381fcf87afbd0264daa600c082", "https://huggingface.co/circlestone-labs/Anima/resolve/main/split_files/diffusion_models/anima-aesthetic-v1.1.safetensors", 4182230656],
];

describe("the cell artifacts are pinned verbatim (the three checkpoints)", () => {
  it("every per-cell download carries its pinned sha256, url and size_bytes", () => {
    const cells = (DECL.variants ?? []).flatMap((v) =>
      (v.cells ?? []).map((c) => ({ variant: v.id, cell: c })));
    const withArtifact = cells.filter(({ cell }) => cell.artifact !== undefined && cell.artifact !== null);
    assert.deepEqual(
      withArtifact.map(({ variant, cell }) => [variant, cell.quant]),
      ARTIFACT_PINS.map(([variant, quant]) => [variant, quant]),
      "the pin table IS the artifact table — a cell gaining or losing its download is a deliberate edit");
    for (const [variant, quant, name, sha256, url, size_bytes] of ARTIFACT_PINS) {
      const found = withArtifact.find(({ variant: v, cell: c }) => v === variant && c.quant === quant)!;
      const artifact = found.cell.artifact!;
      assert.equal(artifact.source_url, url, `${variant}/${quant}: the url is pinned verbatim`);
      assert.equal(artifact.sha256, sha256, `${variant}/${quant}: the digest is pinned verbatim`);
      assert.equal(artifact.size_bytes, size_bytes, `${variant}/${quant}: the declared size is pinned verbatim`);
      assert.equal(artifact.dest_sub, "diffusion_models", `${variant}/${quant}: the convrot/bf16 unets land in diffusion_models`);
    }
  });
});

describe("the three-checkpoint matrix (operator 2026-10-16)", () => {
  it("serves base, turbo, aesthetic — one Variant row each, convrot first", () => {
    const serving = (DECL.variants ?? []).filter((v) => (v.cells ?? []).length > 0);
    assert.deepEqual(serving.map((v) => v.id), ["base", "turbo", "aesthetic"],
      "the f32 standard row is dead — the three upstream checkpoints serve");
    for (const v of serving) {
      assert.deepEqual(v.cells.map((c) => c.quant), ["int8_convrot", "bf16"],
        `${v.id}: the convrot tier serves over fp32 (first cell), BF16 beside it`);
    }
  });

  it("the base row keeps route anima (existing drafts resolve migration-free)", () => {
    const base = (DECL.variants ?? []).find((v) => v.id === "base")!;
    assert.equal(base.route, "anima");
    assert.equal(base.order, 0);
  });

  it("turbo stamps its upstream marriage (8 steps at CFG 1)", () => {
    const turbo = (DECL.variants ?? []).find((v) => v.id === "turbo")!;
    assert.deepEqual(turbo.resolver_defaults, { steps: 8, cfg: 1 });
    assert.equal(turbo.route, "anima-turbo");
  });

  it("the family default is the operator's 52 steps (2026-10-16: 'ANIMA BASE ISN'T DEFAULTING TO 52 STEPS')", () => {
    // THE OPERATOR'S WORD over the DECL author's guess: base defaults
    // 52; the Detailed recipe rides the family number; 30 was never
    // the prescription. Turbo keeps its own upstream 8/1 (the arm
    // above) — a variant's declared marriage wins over inheritance.
    assert.equal((DECL.defaults as Record<string, unknown>).steps, 52);
    const detailed = (DECL.variants ?? []).find((v) => v.id === "detailed")!;
    assert.deepEqual(detailed.wire_defaults, { steps: 52 });
  });

  it("the family default view is base × convrot (the served tier)", () => {
    assert.equal((DECL.lane_inputs as Record<string, unknown>).unet,
      "anima-base-v1.0-int8convrot.safetensors");
  });
});

// THE ENVELOPE DECLARATION LAW (the E2-8 cure, 2026-11-08): anima is a
// split-numbers family (base 52/4 beside turbo 8/1), so every serving
// lane DECLARES its sampler domain — the krea-2 shape (2026-09-21, the
// 25-steps-into-turbo cure). Bounds are the lane's own truth, not
// invented: the base/aesthetic domain [8,60]×[2,8] holds the family
// default 52/4, the official template's 30-step euler walk, the
// operator's good runs (35/4, 52/4) AND the Draft recipe's 8-step
// stamp, while the burn's CFG 1 (every "completely off" run — 8/1,
// 20/1, 52/1, euler 52/1 — sat at CFG 1 on a non-distilled lane) sits
// OUT. Turbo holds its upstream distilled marriage [4,8]×[1,2].
const ENVELOPE_PINS: ReadonlyArray<
  readonly [variant: string, envelope: { steps: [number, number]; cfg: [number, number] }]
> = [
  ["base", { steps: [8, 60], cfg: [2, 8] }],
  ["turbo", { steps: [4, 8], cfg: [1, 2] }],
  ["aesthetic", { steps: [8, 60], cfg: [2, 8] }],
];

describe("the lanes declare their sampler envelopes (the E2-8 cure)", () => {
  it("every serving Variant row carries its pinned envelope verbatim", () => {
    const serving = (DECL.variants ?? []).filter((v) => (v.cells ?? []).length > 0);
    for (const [variant, envelope] of ENVELOPE_PINS) {
      const row = serving.find((v) => v.id === variant)!;
      assert.deepEqual(row.sampler_envelope, envelope,
        `${variant}: the declared domain is pinned — a widened or narrowed bound is a deliberate edit`);
    }
  });

  it("every lane's own marriage, the family defaults and the recipe stamps sit INSIDE their bounds", () => {
    const inside = (v: number, [lo, hi]: readonly [number, number]) => v >= lo && v <= hi;
    for (const [variant, envelope] of ENVELOPE_PINS) {
      const row = (DECL.variants ?? []).find((v) => v.id === variant)!;
      const own = row.resolver_defaults as { steps: number; cfg: number };
      assert.ok(inside(own.steps, envelope.steps) && inside(own.cfg, envelope.cfg),
        `${variant}: its own ${own.steps}/${own.cfg} must live inside its declared domain`);
    }
    const base = ENVELOPE_PINS.find(([v]) => v === "base")![1];
    const defaults = DECL.defaults as { steps: number; cfg: number };
    assert.ok(inside(defaults.steps, base.steps) && inside(defaults.cfg, base.cfg),
      "the family default 52/4 lives inside the base domain");
    const draft = (DECL.variants ?? []).find((v) => v.id === "draft")!;
    const detailed = (DECL.variants ?? []).find((v) => v.id === "detailed")!;
    assert.ok(inside((draft.wire_defaults as { steps: number }).steps, base.steps),
      "the Draft recipe's 8-step stamp rides on base (no over-refusal)");
    assert.ok(inside((detailed.wire_defaults as { steps: number }).steps, base.steps),
      "the Detailed recipe's 52-step stamp rides on base");
  });

  it("the judge refuses the cross-lane marriages over these real rows", () => {
    const base = (DECL.variants ?? []).find((v) => v.id === "base")!;
    const turbo = (DECL.variants ?? []).find((v) => v.id === "turbo")!;
    // the E2-8 burn shape: turbo-era numbers on the base lane
    assert.ok(judgeSamplerEnvelope({ steps: 8, cfg: 1 }, base.sampler_envelope!, base) !== null,
      "8 steps at CFG 1 on base is OUTSIDE the base domain — the burn refuses");
    assert.ok(judgeSamplerEnvelope({ steps: 52, cfg: 4 }, turbo.sampler_envelope!, turbo) !== null,
      "52 steps at CFG 4 on the distilled lane refuses too");
    // the lanes' own numbers never offend
    assert.equal(judgeSamplerEnvelope({ steps: 52, cfg: 4 }, base.sampler_envelope!, base), null);
    assert.equal(judgeSamplerEnvelope({ steps: 8, cfg: 1 }, turbo.sampler_envelope!, turbo), null);
  });
});

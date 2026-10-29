// tests/walls/ts/suites/fibo2-edit-facts.spec.ts — THE FIBO 2.0 EDIT
// FACTS WALL (the third image-edit family's own truth judge). The
// Fibo 2.0 Edit family (BRIA.ai's licensed model, the Comfy-Org
// repack) boards the image-edit card as a third family alongside the
// two qwen-img-edit lanes. This wall pins the family's OWN truths so
// a drifted sha, a re-pointed encoder, or a lost lane topology lands
// red here, on the family's own path:
//
//   1. THE SEVEN ARTIFACTS — four diffusion checkpoints (dev/edit-
//      turbo × bf16/int8-convrot), the Qwen3-VL BF16 text encoder,
//      the flux2-family VAE, and the int8 encoder recorded as KNOWN
//      (the provisions' honesty arm) — every url/sha256/size_bytes
//      verbatim against the Comfy-Org/Fibo-2.0 repo.
//   2. THE VARIANT MATRIX — dev (route fibo2-edit-dev, order 0) and
//      edit-turbo (route fibo2-edit-turbo, order 1), each carrying
//      int8_convrot + bf16 quant cells with per-cell weights swaps.
//   3. THE PROFILE SPLIT — the official recipe pairs (dev 30 steps
//      CFG 5, edit-turbo 8 steps CFG 1, Euler + simple) as resolver
//      defaults with declared sampler envelopes; family defaults own
//      every numeric zone field (the starving-field law).
//   4. THE SCOPED SURFACE — NO Recipe group (the family declares
//      Variant + Quant only; the recipe-rows LAW A census knowingly
//      does not count it) and no width/height/batch param rows (the
//      latent law — no edit lane takes a stated size).
//   5. THE HONEST RECORD — the DECL's description names the open
//      upstream bug (issue 17248: int8 Qwen3-VL vision encoding)
//      and the BF16-encoder-for-edits rule; the int8 encoder is NOT
//      provisioned (text-only seat — recorded, not hidden).
//   6. THE SERVED LANE GRAPH — the edit action's own compose:
//      CLIPLoader(type fibo2) → TextEncodeFibo2 (autogrow
//      images.image_N slots, vae seat, trained-size width/height 0,
//      batch 1) → KSampler on the ENCODER's third output (the latent
//      the node itself emits — no EmptyLatentImage) → VAEDecode →
//      SaveImage; the crop_stitch mask arm rides DetailerForEach;
//      stated width/height and over-cap lists refuse field-named.
//   7. BOTH LOAD FACES — the engine's FAMILY_PKGS row and the web
//      estate's cordis.patch.yml insert, the two rows that load the
//      package at all.
import "../../../helpers/boot-models.ts";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { DECL, edit, parseEditFacts } from "@melite/models-fibo2-edit";
import { getModel } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import type { LaneInputsFacts } from "@melite/comfyui-card-kit/facts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const HF = "https://huggingface.co/Comfy-Org/Fibo-2.0/resolve/main";

interface ArtifactRow {
  readonly file: string;
  readonly sha256: string;
  readonly size_bytes: number;
}

/** THE SEVEN: the family's full pinned artifact surface. Four
 *  diffusion checkpoints ride variant cell rows (the variant rail's
 *  weights swaps); the BF16 encoder + the VAE ride provisions (the
 *  manage rail downloads them); the int8 encoder is KNOWN but
 *  deliberately unprovisioned — image-conditioned encoding on the
 *  int8 vision tower hits the open upstream bug, so the edit lane
 *  refuses to point anyone at it (arm 5). */
const DIFFUSION: readonly ArtifactRow[] = [
  { file: "diffusion_models/fibo2_dev_bf16.safetensors", sha256: "2a09866ff073cae9114f5fd93c0f530f84d41f74dc06e3d0c1372587bb3e9984", size_bytes: 16452934194 },
  { file: "diffusion_models/fibo2_dev_int8_convrot.safetensors", sha256: "063dd397395809fd22234c6bd32932cfcb22619f4d2282bdbf1dc58c406fe325", size_bytes: 8408562474 },
  { file: "diffusion_models/fibo2_edit_turbo_bf16.safetensors", sha256: "028f6cf13af75840d7cc7346a5784fe55887c6b9299d173c8271161ba5ccf7d0", size_bytes: 16452934194 },
  { file: "diffusion_models/fibo2_edit_turbo_int8_convrot.safetensors", sha256: "1f6fa7c499191f405467123f655f11762661eaa5bd479d1da8f161398ef72c3b", size_bytes: 8408562474 },
] as const;
const TEXT_ENCODER_BF16: ArtifactRow = { file: "text_encoders/qwen3vl_4b_bf16.safetensors", sha256: "36f3ff447ef59201722e8f9ce6020c9819fdcfba6aa2608c4e09b1c0ce114e34", size_bytes: 8875719384 };
const TEXT_ENCODER_INT8_KNOWN: ArtifactRow = { file: "text_encoders/qwen3vl_4b_int8_convrot.safetensors", sha256: "32de113cbf8282b02cbff0794b637b9d6676da09314a1db5a30bcea9bf4ee01c", size_bytes: 4858559240 };
const VAE: ArtifactRow = { file: "vae/flux2-vae.safetensors", sha256: "868fe7b343cc8f3a19dbcfcafbc3d5f888802be3f89bd81b65b3621a066ce8f3", size_bytes: 336211292 };

/** The DECL facts the arms read. */
const lane = parseEditFacts(DECL.lane_inputs as LaneInputsFacts);
const variants = DECL.variants ?? [];
const groups = ((DECL.variant_groups ?? []) as Array<{ id: string }>).map((g) => g.id);

/** A variant's int8/bf16 cell rows by quant spelling. */
function cellOf(variantId: string, quant: string): Record<string, unknown> {
  const v = variants.find((r) => r.id === variantId);
  expect(v, `variant '${variantId}' exists`).toBeDefined();
  const cells = (v!.cells ?? []) as Array<Record<string, unknown>>;
  const row = cells.find((c) => c.quant === quant);
  expect(row, `variant '${variantId}' carries the '${quant}' cell`).toBeDefined();
  return row!;
}

describe("THE FIBO 2.0 EDIT FACTS — the third image-edit family's pinned truths", () => {
  it("the family declares itself on the image genre, edit form, comfyui engine", () => {
    expect(DECL.id).toBe("fibo2-edit");
    expect(DECL.label).toBe("Fibo 2.0 Edit");
    expect(DECL.genre).toBe("image");
    expect(DECL.engine).toBe("comfyui");
    expect(DECL.form).toBe("form_edit");
    expect(DECL.actions).toContain(edit);
  });

  it("ARTIFACTS: the four diffusion checkpoints ride cell rows, byte-verbatim", () => {
    const cellArtifacts = [
      { cell: cellOf("dev", "bf16"), want: DIFFUSION[0] },
      { cell: cellOf("dev", "int8_convrot"), want: DIFFUSION[1] },
      { cell: cellOf("edit-turbo", "bf16"), want: DIFFUSION[2] },
      { cell: cellOf("edit-turbo", "int8_convrot"), want: DIFFUSION[3] },
    ];
    for (const { cell, want } of cellArtifacts) {
      const a = cell.artifact as Record<string, unknown> | undefined;
      expect(a, `${want.file} cell declares its artifact`).toBeDefined();
      expect(a!["source_url"]).toBe(`${HF}/${want.file}`);
      expect(a!["sha256"]).toBe(want.sha256);
      expect(a!["size_bytes"]).toBe(want.size_bytes);
    }
  });

  it("ARTIFACTS: provisions carry the BF16 encoder and the VAE — never the int8 encoder", () => {
    const rows = (DECL.provisions ?? []) as Array<Record<string, unknown>>;
    const byName = new Map(rows.map((r) => [r.name, r]));
    expect(byName.get("qwen3vl_4b_bf16.safetensors")).toMatchObject({
      url: `${HF}/${TEXT_ENCODER_BF16.file}`,
      sha256: TEXT_ENCODER_BF16.sha256,
      size_bytes: TEXT_ENCODER_BF16.size_bytes,
      folder: "text_encoders",
    });
    expect(byName.get("flux2-vae.safetensors")).toMatchObject({
      url: `${HF}/${VAE.file}`,
      sha256: VAE.sha256,
      size_bytes: VAE.size_bytes,
      folder: "vae",
    });
    // THE HONESTY ARM: the int8 encoder exists upstream but its
    // vision tower is the open bug — the manage rail must NOT offer
    // it for this family.
    expect(byName.has("qwen3vl_4b_int8_convrot.safetensors")).toBe(false);
    expect(rows.length).toBe(2);
  });

  it("VARIANTS: dev first, edit-turbo second, two quant cells each, routes named", () => {
    expect(variants.map((v) => v.id)).toEqual(["dev", "edit-turbo"]);
    expect(variants.map((v) => v.group)).toEqual(["Variant", "Variant"]);
    expect(variants.map((v) => v.order)).toEqual([0, 1]);
    expect(variants.map((v) => v.route)).toEqual(["fibo2-edit-dev", "fibo2-edit-turbo"]);
    for (const v of variants) {
      expect((v.cells ?? []).map((c) => c.quant)).toEqual(["int8_convrot", "bf16"]);
      expect((v.cells ?? []).map((c) => c.route)).toEqual([`${v.route}-int8`, `${v.route}-bf16`]);
    }
  });

  it("LANE INPUTS: the fibo2 encoder seam — clip_type fibo2, TextEncodeFibo2, 16 images, the BF16 encoder + int8 dev unet defaults", () => {
    expect(lane.clip_type).toBe("fibo2");
    expect(lane.text_encode_node).toBe("TextEncodeFibo2");
    expect(lane.max_images).toBe(16);
    expect(lane.text_encoder).toBe("qwen3vl_4b_bf16.safetensors");
    expect(lane.unet).toBe("fibo2_dev_int8_convrot.safetensors");
    expect(lane.vae).toBe("flux2-vae.safetensors");
  });

  it("PROFILES: the official recipe pairs ride resolver defaults, envelopes declared, family defaults own the zone", () => {
    // family defaults: the dev lane's official pair (Euler/simple) —
    // every numeric params-zone field owned (the starving-field law).
    expect(DECL.defaults).toMatchObject({ steps: 30, cfg: 5, sampler: "euler", scheduler: "simple" });
    const dev = variants.find((v) => v.id === "dev")!;
    const turbo = variants.find((v) => v.id === "edit-turbo")!;
    // NO `model` key in resolver_defaults (2026-11-10): that key is the
    // resolver's family-pointer vocabulary — a route-shaped value
    // re-routes resolveCardFamily to the route row (empty matrix) and
    // every stated variant refuses "unknown variant". The weights seat
    // is facts.unet (lane_inputs); steps/cfg only is the z-image shape.
    expect(dev.resolver_defaults).toMatchObject({ steps: 30, cfg: 5 });
    expect(dev.resolver_defaults).not.toHaveProperty("model");
    expect(turbo.resolver_defaults).toMatchObject({ steps: 8, cfg: 1 });
    expect(turbo.resolver_defaults).not.toHaveProperty("model");
    // THE ENVELOPE LAW (split-numbers family): every offered Variant
    // lane declares its sampler envelope — dev rides the official
    // 30/5 span, turbo the 8/1 span; the community 4-step report is
    // deliberately NOT pinned (unofficial, drifting).
    expect(dev.sampler_envelope).toMatchObject({ steps: [20, 40], cfg: [3.5, 6] });
    expect(turbo.sampler_envelope).toMatchObject({ steps: [6, 12], cfg: [1, 2] });
    expect(DECL.bounds).toMatchObject({ steps: { min: 1, max: 50 } });
  });

  it("SURFACE: no Recipe group (the scoped judgment), the deliverable pair surfaced, no batch rows", () => {
    // LAW A (recipe-rows): a card-carrying family declaring a Recipe
    // group needs a stamping row; this family declares NO Recipe
    // group at all — the census knowingly skips it, and this arm
    // pins the judgment so a half-added group cannot drift in.
    expect(groups).toEqual(["Variant", "Quant"]);
    const names = new Set<string>((DECL.params ?? []) as string[]);
    // THE DELIVERABLE PAIR (the resize order, operator 2026-11-12):
    // surfaced as RUN params beside the toggle (the kit tail
    // consumes the lawful pair) — the latent law's exclusion is
    // retired; batch and the qwen tuning pair stay off.
    for (const banned of ["batch_size", "use_stock_nodes", "double_reference", "resolution"]) {
      expect(names.has(banned), `'${banned}' stays off the fibo2-edit params surface`).toBe(false);
    }
    for (const need of ["input_images", "prompt", "negative_prompt", "input_mask", "seed", "steps", "cfg", "sampler", "scheduler", "match_input_resolution", "width", "height"]) {
      expect(names.has(need), `'${need}' serves on the fibo2-edit params surface`).toBe(true);
    }
  });

  it("THE HONEST RECORD: the open int8-encoder bug and the BF16-for-edits rule are stated", () => {
    const d = DECL.description ?? "";
    expect(d).toContain("17248");
    expect(d.toLowerCase()).toContain("bf16");
    // the license-law voice: BRIA's licensed model, named without
    // the banned phrase.
    expect(d.toLowerCase()).not.toContain("non-commercial");
  });

  it("GRAPH: the plain edit arm — encoder-emitted latent, no EmptyLatentImage", () => {
    const model = getModel("fibo2-edit");
    const g = new GraphBuilder();
    edit.build({
      p: {
        input_images: ["anchor.png", "reference.png"],
        prompt: "make it night",
        negative_prompt: "",
        seed: 7,
        steps: 30,
        cfg: 5,
        sampler: "euler",
        scheduler: "simple",
      },
      facts: lane,
      model,
      g,
      runId: "fibo-wall/plain",
    });
    const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const classes = Object.values(graph).map((n) => n.class_type);
    // THE LATENT LAW: the KSampler samples TextEncodeFibo2's OWN
    // third output — the node emits the trained-size zero latent;
    // an EmptyLatentImage here would sample a foreign geometry.
    expect(classes).not.toContain("EmptyLatentImage");
    expect(classes).toEqual(expect.arrayContaining([
      "UNETLoader", "CLIPLoader", "VAELoader", "LoadImage", "TextEncodeFibo2", "KSampler", "VAEDecode", "SaveImage",
    ]));
    const byClass = (cls: string) => Object.values(graph).filter((n) => n.class_type === cls);
    // THE ENCODER SEAM: clip_type fibo2, the vae seat connected
    // (reference latents condition BOTH outputs), per-slot autogrow
    // images, trained-size geometry pinned at 0, batch 1.
    expect(byClass("CLIPLoader")).toHaveLength(1);
    expect(byClass("CLIPLoader")[0]!.inputs["type"]).toBe("fibo2");
    const enc = byClass("TextEncodeFibo2");
    expect(enc).toHaveLength(1);
    expect(enc[0]!.inputs["width"]).toBe(0);
    expect(enc[0]!.inputs["height"]).toBe(0);
    expect(enc[0]!.inputs["batch_size"]).toBe(1);
    expect(Object.keys(enc[0]!.inputs).filter((k) => k.startsWith("images.image_"))).toHaveLength(2);
    const sampler = byClass("KSampler");
    expect(sampler).toHaveLength(1);
    expect(sampler[0]!.inputs["steps"]).toBe(30);
    expect(sampler[0]!.inputs["cfg"]).toBe(5);
    expect(sampler[0]!.inputs["denoise"]).toBe(1.0);
    // the wire spellings: latent_image ← enc.out(2), pos/neg ← 0/1
    const encId = Object.keys(graph).find((id) => graph[id]!.class_type === "TextEncodeFibo2")!;
    const inputs = sampler[0]!.inputs as Record<string, unknown[]>;
    expect(inputs["latent_image"]).toEqual([encId, 2]);
    expect(inputs["positive"]).toEqual([encId, 0]);
    expect(inputs["negative"]).toEqual([encId, 1]);
    // the save tail: decode → <runId>/edit
    const save = byClass("SaveImage")[0]!;
    expect(save.inputs["filename_prefix"]).toBe("fibo-wall/plain/edit");
  });

  it("GRAPH: the crop_stitch arm — mask → SEGS → DetailerForEach, no KSampler", () => {
    const model = getModel("fibo2-edit");
    const g = new GraphBuilder();
    edit.build({
      p: {
        input_images: ["anchor.png"],
        prompt: "sharpen the face",
        input_mask: "region.png",
        mask_mode: "crop_stitch",
        seed: 1,
        steps: 8,
        cfg: 1,
      },
      facts: lane,
      model,
      g,
      runId: "fibo-wall/stitch",
    });
    const graph = g.toJSON() as Record<string, { class_type: string }>;
    const classes = Object.values(graph).map((n) => n.class_type);
    expect(classes).toEqual(expect.arrayContaining(["LoadImageMask", "GrowMask", "MaskToSEGS", "DetailerForEach", "SaveImage"]));
    expect(classes).not.toContain("KSampler");
    expect(classes).not.toContain("VAEDecode");
    const save = Object.values(graph).find((n) => n.class_type === "SaveImage")!;
    expect((save.inputs as Record<string, unknown>)["filename_prefix"]).toBe("fibo-wall/stitch/edit");
  });

  it("REFUSALS: match-ON stated sizes and over-cap lists refuse field-named — and match OFF + both axes builds the ImageScale deliverable tail", () => {
    const model = getModel("fibo2-edit");
    const base = { input_images: ["a.png"], prompt: "x", seed: 1, steps: 30, cfg: 5 };
    expect(() =>
      edit.build({ p: { ...base, width: 1024 }, facts: lane, model, g: new GraphBuilder(), runId: "r" }),
    ).toThrow(/'width' fires.*match_input_resolution is ON/);
    const seventeen = Array.from({ length: 17 }, (_, i) => `img_${i}.png`);
    expect(() =>
      edit.build({ p: { ...base, input_images: seventeen }, facts: lane, model, g: new GraphBuilder(), runId: "r" }),
    ).toThrow(/16 input images total/);
    const g = new GraphBuilder();
    edit.build({ p: { ...base, match_input_resolution: false, width: 1024, height: 1024 }, facts: lane, model, g, runId: "r-sized" });
    const tails = Object.values(g.toJSON() as Record<string, { class_type: string }>).filter((n) => n.class_type === "ImageScale");
    expect(tails).toHaveLength(1);
  });

  it("LOAD FACES: the engine roster and the web estate both name the package", () => {
    const famSrc = readFileSync(
      join(ROOT, "packages", "engines", "comfyui-cordis", "src", "models", "families", "index.ts"),
      "utf8",
    );
    expect(famSrc).toContain('"@melite/models-fibo2-edit"');
    const patchSrc = readFileSync(join(ROOT, "packages", "web", "melite-estate", "cordis.patch.yml"), "utf8");
    expect(patchSrc).toContain("id: family-fibo2-edit");
    expect(patchSrc).toContain("name: '@melite/models-fibo2-edit'");
  });
});

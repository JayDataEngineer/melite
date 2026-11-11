// @contract models-gen-detailer-serve
// @melite/image-image-gen — the card's compose gate arm the
// composition spec does not own: the prompt admission + the happy
// lane against the boarded default family.
import "../../../../tests/helpers/boot-models.ts";
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCardDefs, ComposeRefusal, resolveCardFlowOutputs } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import { CardDefinition } from '@melite/comfyui-card-kit/card-definition'
import {
  getModel, registryIds, registryModel,
} from "../../../engines/comfyui-cordis/src/models/models.ts";
import { ACTION_BINDINGS } from "../src/card.ts";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

let def: CardDefinition;
beforeAll(async () => {
  def = (await loadCardDefs()).get("image-gen")!;
  assert.ok(def, "the composition root serves the image-gen card");
});

describe("the image-gen compose gate", () => {
  it("a missing/blank prompt refuses (what the picture IS)", () => {
    const model = facts.models[def.boarded[0]!]!;
    assert.throws(
      () => def.compose(def.schema({}), model, new GraphBuilder(), "r1"),
      /required param 'prompt' missing or empty on the image-gen card/,
    );
  });

  it("THE SCHEMA GATE: an out-of-envelope width refuses loud (declared 256–2048), never composes", () => {
    const model = facts.models[def.boarded[0]!]!;
    assert.throws(
      () => def.compose({ prompt: "a cat", width: 9999 }, model, new GraphBuilder(), "r_oob"),
      /width|9999|between|range/i,
    );
  });

  it("THE SCHEMA GATE: a wrong-typed steps refuses loud (declared number)", () => {
    const model = facts.models[def.boarded[0]!]!;
    assert.throws(
      () => def.compose({ prompt: "a cat", steps: "eight" }, model, new GraphBuilder(), "r_wt"),
      /steps|expected number/i,
    );
  });

  it("THE MODEL CASCADE: an unstated steps arrives from the family DECL default", () => {
    const model = facts.models[def.boarded[0]!]!;
    const g = new GraphBuilder();
    def.compose({ ...model.defaults, prompt: "a cat" }, model, g, "r_def");
    const graph = g.toJSON() as Record<string, { inputs: Record<string, unknown> }>;
    assert.equal(graph["KSampler.0"]?.inputs.steps, 8,
      "the fresh doc composes the family default, not a card-owned duplicate");
  });

  it("the card schema does not duplicate model-backed width, height, or steps defaults", () => {
    const doc = def.schema({ prompt: "a cat" }) as Record<string, unknown>;
    assert.equal(doc.width, undefined);
    assert.equal(doc.height, undefined);
    assert.equal(doc.steps, undefined);
  });

  it("THE SCHEMA GATE: mod-plane keys pass the walk verbatim (no lora-stamp drop)", () => {
    const doc = def.schema({ prompt: "a cat", loras: [{ name: "x.safetensors" }] }) as Record<string, unknown>;
    assert.deepEqual(doc.loras, [{ name: "x.safetensors" }],
      "the gated doc carries the undeclared loras bag through to the composer");
  });

  it("T6 STRICT RESOLVE: a typo'd key refuses 'unknown-param' at compose, named — never renders", () => {
    const model = facts.models[def.boarded[0]!]!;
    // the drift pin: `promptt` is not a knob and not a rider — the
    // old walk merged it silently (the second empty box); the gated
    // resolve refuses LOUD, naming the key and the card.
    assert.throws(
      () => def.compose({ prompt: "a cat", promptt: "a cat" }, model, new GraphBuilder(), "r_typo"),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "unknown-param"
        && /promptt/.test(e.message) && /image-gen/.test(e.message),
    );
    // the rider passes: the loras bag composes (the mod plane rides)
    def.compose({ prompt: "a cat", loras: [{ name: "x.safetensors", strength: 0.5 }] }, model, new GraphBuilder(), "r_lora");
  });

  it("THE MOD-SURFACE SANCTION (E2-11): the mask mod's bag + fields are admitted surface — never 'unknown-param' (the burn's verbatim voice lives in the ERRORS_2 ledger)", () => {
    const model = facts.models[def.boarded[0]!]!;
    // THE SANCTION, pinned at the walk: the gated doc CARRIES the
    // mod's keys verbatim (the old walk refused 'mask' as an
    // undeclared param — the mod's own bag, a declaration lie).
    const doc = def.schema({ prompt: "a cat", mask: [{ input_mask: "/v1/assets/region.png" }], mask_mode: "crop_stitch" }) as Record<string, unknown>;
    assert.deepEqual(doc.mask, [{ input_mask: "/v1/assets/region.png" }]);
    assert.equal(doc.mask_mode, "crop_stitch");
    // and the walk's strict gate does not refuse them at compose:
    // (the firing arm below proves the refusal that REPLACED it)
  });

  it("THE GEN DETAILER SERVE (operator 2026-11-07, the mod SERVES; roster widened 2026-11-09): a stated region composes the DetailerForEach arm on EVERY boarded lane — never a refusal, never a silent plain t2i", () => {
    // THE DERIVED ROSTER (operator 2026-11-09, the face-rail burn:
    // "ANY model can inpaint, not just krea-2" — the two-family
    // roster was artificial, the DetailerForEach tail is
    // family-agnostic): the loop rides the card's own BOARDED array,
    // so a family added tomorrow inherits the serve wall for free —
    // a hand-named roster here would pass while the new lane burns.
    for (const fam of def.boarded) {
      const model = facts.models[fam]!;
      assert.ok(model, `the facts serve ${fam}`);
      const g = new GraphBuilder();
      def.compose({ prompt: "a cat", mask: [{ input_mask: "/v1/assets/region.png" }], mask_mode: "crop_stitch" }, model, g, `r_serve_${fam}`);
      const nodes = Object.values(g.toJSON() as Record<string, { class_type?: string; inputs?: Record<string, unknown> }>);
      const detailer = nodes.find((n) => n.class_type === "DetailerForEach");
      assert.ok(detailer, `the stated region mints DetailerForEach on ${fam} (the gen detailer arm serves)`);
      const saved = nodes.find((n) => n.class_type === "SaveImage");
      assert.ok(
        typeof saved?.inputs?.filename_prefix === "string" && (saved.inputs.filename_prefix as string).startsWith(`r_serve_${fam}/gen`),
        `the detailed image saves under the gen prefix on ${fam}`,
      );
    }
  });

  it("THE GEN DETAILER BINDING — DETECTOR SOURCE (operator 2026-11-07, the mod SERVES): a stated mask bag with mask_mode crop_stitch + detector composes the Impact detector chain bound into the sampler", () => {
    // the burn lane (krea-2): the detector proposes the region —
    // provider → SegmDetectorSEGS → DetailerForEach → SaveImage —
    // every link resolving to a composed node, the detailer riding
    // the lane's own model/clip/vae/conditioning over the lane's own
    // decoded frame. Seg detection on the stated region, detailer
    // pass, stitch back — never a refusal, never a silent plain t2i.
    const model = facts.models["krea-2"]!;
    const g = new GraphBuilder();
    def.compose({ prompt: "a cat", mask: [{}], mask_mode: "crop_stitch", mask_detector: "person" }, model, g, "r_detbind");
    const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const entries = Object.entries(graph);
    const ofClass = (ct: string): Array<[string, { class_type: string; inputs: Record<string, unknown> }]> =>
      entries.filter(([, n]) => n.class_type === ct);
    // THE SOURCE: the person word rides the census-pinned segm
    // weights (the boot fixture's own UltralyticsDetectorProvider
    // model_name enum — no invented graph path).
    const prov = ofClass("UltralyticsDetectorProvider");
    assert.equal(prov.length, 1, "one detector provider mints");
    assert.equal(prov[0]![1].inputs.model_name, "segm/person_yolov8m-seg.pt",
      "the person detector rides the segm weights");
    // THE SEGS: person proposes silhouette segs on the provider's
    // SEGM slot (output 1 — the BBOX slot 0 is the face/hand shape),
    // over the lane's own decoded frame.
    const segm = ofClass("SegmDetectorSEGS");
    assert.equal(segm.length, 1, "one segm detector mints");
    assert.deepEqual(segm[0]![1].inputs.segm_detector, [prov[0]![0], 1],
      "SegmDetectorSEGS listens on the provider's SEGM output");
    assert.equal(ofClass("BboxDetectorSEGS").length, 0, "person never rides the bbox shape");
    assert.equal(ofClass("LoadImageMask").length, 0, "no painted mask stated — no loader mints");
    const decoded = ofClass("VAEDecode");
    assert.equal(decoded.length, 1, "the lane decodes its sampled frame once");
    assert.deepEqual(segm[0]![1].inputs.image, [decoded[0]![0], 0],
      "detection runs on the lane's own decoded t2i frame");
    // THE BINDING: the detailer reworks the detected segs with the
    // lane's own model/clip/vae/conditioning — every handle a
    // composed node, never dangling — and its output feeds the save
    // under the gen prefix (the stitch back onto the run media).
    const det = ofClass("DetailerForEach");
    assert.equal(det.length, 1, "one detailer mints");
    assert.deepEqual(det[0]![1].inputs.segs, [segm[0]![0], 0],
      "the detailer reworks the detected segs");
    assert.deepEqual(det[0]![1].inputs.image, [decoded[0]![0], 0],
      "the detailer crops the lane's own decoded frame");
    for (const k of ["model", "clip", "vae", "positive", "negative"]) {
      const link = det[0]![1].inputs[k] as [string, number];
      assert.ok(Array.isArray(link) && typeof link[0] === "string" && graph[link[0]] !== undefined,
        `DetailerForEach.${k} binds a composed node, never dangles`);
    }
    const saved = ofClass("SaveImage");
    assert.equal(saved.length, 1, "one save mints");
    assert.deepEqual(saved[0]![1].inputs.images, [det[0]![0], 0],
      "the detailer's output feeds the save");
    assert.ok(String(saved[0]![1].inputs.filename_prefix).startsWith("r_detbind/gen"),
      "the detailed image saves under the gen prefix");
  });

  it("THE GEN DETAILER BINDING — PAINTED SOURCE (operator 2026-11-07, the mod SERVES): a stated mask bag with mask_mode crop_stitch + painted mask composes the mask chain bound into the sampler", () => {
    // the declared Impact slice's second seat (qwen-img-21): the
    // painted mask converts — loader → grow → MaskToSEGS — and the
    // SAME detailer tail reworks it over the lane's own conditioning.
    const model = facts.models["qwen-img-21"]!;
    const g = new GraphBuilder();
    def.compose({ prompt: "a cat", mask: [{ input_mask: "/v1/assets/region.png" }], mask_mode: "crop_stitch" }, model, g, "r_paintbind");
    const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const entries = Object.entries(graph);
    const ofClass = (ct: string): Array<[string, { class_type: string; inputs: Record<string, unknown> }]> =>
      entries.filter(([, n]) => n.class_type === ct);
    // THE SOURCE: the painted mask rides the disk handoff (the
    // spell arm's merge twin — a path keeps LoadImageMask), grown
    // by the ONE px expansion (grow 8 + context pad 64), converted
    // combined. No detector stated — no provider mints.
    const loader = ofClass("LoadImageMask");
    assert.equal(loader.length, 1, "one mask loader mints");
    assert.equal(loader[0]![1].inputs.image, "/v1/assets/region.png", "the loader reads the stated mask");
    assert.equal(loader[0]![1].inputs.channel, "alpha", "the loader reads the alpha channel");
    assert.equal(ofClass("UltralyticsDetectorProvider").length, 0, "no detector stated — no provider mints");
    assert.equal(ofClass("SegmDetectorSEGS").length + ofClass("BboxDetectorSEGS").length, 0,
      "no detector stated — no detector mints");
    const grown = ofClass("GrowMask");
    assert.equal(grown.length, 1, "one grow mints");
    assert.deepEqual(grown[0]![1].inputs.mask, [loader[0]![0], 0], "grow rides the loaded mask");
    assert.equal(grown[0]![1].inputs.expand, 72, "grow + context pad compose as ONE px expansion");
    const segs = ofClass("MaskToSEGS");
    assert.equal(segs.length, 1, "one MaskToSEGS mints");
    assert.deepEqual(segs[0]![1].inputs.mask, [grown[0]![0], 0], "MaskToSEGS converts the grown mask");
    // THE BINDING: same twin as the detector source — segs + the
    // lane's own decoded frame + own conditioning in, save out under
    // the gen prefix.
    const decoded = ofClass("VAEDecode");
    assert.equal(decoded.length, 1, "the lane decodes its sampled frame once");
    const det = ofClass("DetailerForEach");
    assert.equal(det.length, 1, "one detailer mints");
    assert.deepEqual(det[0]![1].inputs.segs, [segs[0]![0], 0],
      "the detailer reworks the converted segs");
    assert.deepEqual(det[0]![1].inputs.image, [decoded[0]![0], 0],
      "the detailer crops the lane's own decoded frame");
    const saved = ofClass("SaveImage");
    assert.equal(saved.length, 1, "one save mints");
    assert.deepEqual(saved[0]![1].inputs.images, [det[0]![0], 0],
      "the detailer's output feeds the save");
    assert.ok(String(saved[0]![1].inputs.filename_prefix).startsWith("r_paintbind/gen"),
      "the detailed image saves under the gen prefix");
  });

  it("THE REGION REFUSALS SURVIVE THE ROSTER'S DEATH (E2-11's lawful remainder, every boarded lane): a region without its source, and a base without its region half, refuse LOUD in the teaching voice — never a silent plain t2i", () => {
    // THE ROSTER IS DEAD (operator 2026-11-09, the face-rail burn:
    // "ANY model can inpaint, not just krea-2" — the unserved-lane
    // refusal arm died with it). What E2-11 still owns fires for
    // EVERY boarded family: the pair law and the source law. The
    // loop rides the card's own BOARDED array — the derived roster,
    // never a hand-named list.
    for (const fam of def.boarded) {
      const model = facts.models[fam]!;
      assert.ok(model, `the facts serve ${fam}`);
      // a base without its region half would silently plain-generate
      // — the D11 burn's exact shape from the other side.
      assert.throws(
        () => def.compose({ prompt: "a cat", input_image: "/v1/assets/photo.png" }, model, new GraphBuilder(), `r_pair_${fam}`),
        (e: unknown): boolean => e instanceof Error && !(e instanceof ComposeRefusal)
          && /input_image' fires on the image-gen card/.test(String(e.message))
          && /needs its region half/.test(String(e.message)),
        `the base-without-region refusal fires on ${fam}`,
      );
      // a stated detailer knob with no region at all: authored
      // intent (the walk fills no rider defaults, presence fires).
      assert.throws(
        () => def.compose({ prompt: "a cat", mask_denoise: 0.8 }, model, new GraphBuilder(), `r_knob_${fam}`),
        (e: unknown): boolean => e instanceof Error && !(e instanceof ComposeRefusal)
          && /fires on the image-gen card/.test(String(e.message))
          && /crop_stitch needs a region/.test(String(e.message)),
        `the knob-without-region refusal fires on ${fam}`,
      );
      // the serve itself: the same stated region now COMPOSES on
      // this lane — the refusal above is the pair law, never a
      // roster gate (this is the arm that went red on the old
      // roster for four of these six families).
      const g = new GraphBuilder();
      def.compose({ prompt: "a cat", mask: [{ input_mask: "/v1/assets/region.png" }], mask_mode: "crop_stitch" }, model, g, `r_now_serves_${fam}`);
      assert.ok(
        Object.values(g.toJSON() as Record<string, { class_type?: string }>).some((n) => n.class_type === "DetailerForEach"),
        `${fam} composes the region arm (the roster's death made every lane a serving lane)`,
      );
    }
    // THE SILENT-DROP GUARD'S OTHER HALF: a doc with NO stated
    // region composes the plain lane untouched (an explicit
    // mask_mode 'auto' is the plain lane's own word — never fires).
    const plain = facts.models[def.boarded[0]!]!;
    def.compose(def.schema({ prompt: "a cat" }), plain, new GraphBuilder(), "r_plain");
    def.compose({ prompt: "a cat", mask_mode: "auto" }, plain, new GraphBuilder(), "r_auto");
  });

  // THE PAIR LAW (operator 2026-11-15: Impact Pack's detailer takes
  // image + segs — the mod's missing base-image seat was the D11
  // gap). The gate judges the pair: a base without its region half
  // refuses; the lawful pair composes the photo arm.
  it("THE PAIR: input_image without a region refuses (never a silent plain-generate under a stated base); the lawful pair composes", () => {
    const model = facts.models["krea-2"]!;
    assert.ok(model, "the facts serve krea-2 (a region-served lane)");
    assert.throws(
      () => def.compose({ prompt: "a cat", mask: [{ input_image: "/v1/assets/photo.png" }], mask_mode: "crop_stitch" }, model, new GraphBuilder(), "r_baseonly"),
      (e: unknown) =>
        e instanceof Error && !(e instanceof ComposeRefusal)
        && /'input_image' fires on the image-gen card/.test(String((e as Error).message))
        && /needs its region half/.test(String((e as Error).message))
        && /state input_mask or pick a mask_detector/.test(String((e as Error).message)),
      "a base without its region would silently plain-generate — the D11 burn's shape from the other side",
    );
    // the flat base alone states a region too (statedRegion reads
    // input_image as a region key) — same refusal, no bag needed
    assert.throws(
      () => def.compose({ prompt: "a cat", input_image: "/v1/assets/photo.png" }, model, new GraphBuilder(), "r_baseflat"),
      /'input_image' fires on the image-gen card .* needs its region half/,
      "a flat-stated base never slips under the gate",
    );
    // THE LAWFUL PAIR composes: the photo arm (the build wall in
    // krea-2's action.spec pins the graph itself).
    const g = new GraphBuilder();
    def.compose({ prompt: "a cat", mask: [{ input_image: "/v1/assets/photo.png", input_mask: "/v1/assets/region.png" }], mask_mode: "crop_stitch" }, model, g, "r_pair");
    const nodes = Object.values(g.toJSON() as Record<string, { class_type?: string }>).map((n) => String(n.class_type));
    assert.ok(nodes.includes("LoadImage"), "the base photograph loads");
    assert.ok(!nodes.includes("KSampler"), "the lawful pair generates nothing (the detailer reworks the photo's region)");
  });
});

// ── GATE S PROOF (2026-09-20, the operator's demand: "when it is
// on 'random seed', the seed isn't randomized when I press run
// again" — UNLESS IT IS PROGRAMMATICALLY PROVEN): the lane's mint
// law, proven at the REAL compose path. Two composes of the SAME
// doc with the sentinel (or no seed at all) MUST mint different
// seeds — run again never repeats; a FIXED seed composes verbatim
// every time (the other half of the law).
describe("GATE S — the seed law on the real compose path", () => {
  const seedOf = (g: { toJSON(): unknown }): unknown =>
    ((g.toJSON() as Record<string, { inputs: Record<string, unknown> }>)["KSampler.0"]?.inputs.seed);

  it("THE RANDOM ARM: two composes with the sentinel -1 mint DIFFERENT concrete seeds", () => {
    const model = facts.models[def.boarded[0]!]!;
    const g1 = new GraphBuilder();
    def.compose(def.schema({ prompt: "a cat", seed: -1 }), model, g1, "r_rand_a");
    const g2 = new GraphBuilder();
    def.compose(def.schema({ prompt: "a cat", seed: -1 }), model, g2, "r_rand_b");
    const s1 = seedOf(g1);
    const s2 = seedOf(g2);
    assert.ok(typeof s1 === "number" && Number.isInteger(s1) && s1 >= 0,
      `the first compose mints a concrete non-negative int (got ${String(s1)})`);
    assert.ok(typeof s2 === "number" && Number.isInteger(s2) && s2 >= 0,
      `the second compose mints a concrete non-negative int (got ${String(s2)})`);
    assert.notEqual(s1, s2, "two run-agains under random mint DIFFERENT seeds — the operator's law");
  });

  it("THE UNSTATED ARM: an absent seed walks to the declared default -1 → mints fresh every compose", () => {
    const model = facts.models[def.boarded[0]!]!;
    const g1 = new GraphBuilder();
    def.compose({ prompt: "a cat" }, model, g1, "r_absent_a");
    const g2 = new GraphBuilder();
    def.compose({ prompt: "a cat" }, model, g2, "r_absent_b");
    const s1 = seedOf(g1);
    const s2 = seedOf(g2);
    assert.ok(typeof s1 === "number" && s1 >= 0 && typeof s2 === "number" && s2 >= 0,
      "the declared default -1 reaches the lane and mints concrete ints");
    assert.notEqual(s1, s2, "run-again with an unstated seed never repeats either");
  });

  it("THE FIXED ARM: a stated seed composes VERBATIM — the exact seed re-runs", () => {
    const model = facts.models[def.boarded[0]!]!;
    const g1 = new GraphBuilder();
    def.compose(def.schema({ prompt: "a cat", seed: 1234 }), model, g1, "r_fixed_a");
    const g2 = new GraphBuilder();
    def.compose(def.schema({ prompt: "a cat", seed: 1234 }), model, g2, "r_fixed_b");
    assert.equal(seedOf(g1), 1234);
    assert.equal(seedOf(g2), 1234);
  });

  it("THE BURIED-PIN NEEDLE: a concrete seed RIDING THE STAGE composes that seed — the face where 'run again repeats' is a FIXED stage, not a mint failure", () => {
    // the live receipt (2026-09-20): a bench stage carried
    // seed=2116177065 from an old whole-row load — every run
    // composed it verbatim. The mint law is innocent; the PIN is
    // the disease. This wall pins that reading: a concrete riding
    // seed composes identically twice (so the cure is unpinning
    // the stage to the sentinel, exactly what the operator's dice
    // does).
    const model = facts.models[def.boarded[0]!]!;
    const g1 = new GraphBuilder();
    def.compose(def.schema({ prompt: "a cat", seed: 2116177065 }), model, g1, "r_pin_a");
    const g2 = new GraphBuilder();
    def.compose(def.schema({ prompt: "a cat", seed: 2116177065 }), model, g2, "r_pin_b");
    assert.equal(seedOf(g1), 2116177065);
    assert.equal(seedOf(g2), 2116177065);
  });
});

// ── THE EVERY-ADDRESS WALL (the atom vocabulary, stroke 2): the
// route-id binding miss killed here forever. For EVERY facts row
// the image-gen card serves: (1) the row's OWNING FAMILY holds an
// ACTION_BINDINGS row — no address silently rides the legacy lane
// while its siblings compose the declared segment; (2) the row
// composes ITS OWN declared truth — the unet the row spells is the
// unet the graph loads (the wrong-weights half), the latent and
// encoder classes the row spells are the classes the graph builds.
// The row's lane_inputs are the oracle; the graph is the accused.
describe("THE EVERY-ADDRESS WALL — every served address composes its own declared segment", () => {
  const imageGenRows = Object.values(facts.models).filter((m) => m.card === "image-gen");
  const rowOf = (id: string) => facts.models[id]!;

  it("the card serves every boarded family (the wall's own footing)", () => {
    assert.ok(imageGenRows.length >= 10, `expected the ten served addresses, found ${String(imageGenRows.length)}`);
  });

  for (const row of imageGenRows) {
    it(`address '${row.id}' (family '${row.family ?? row.id}') is bound and composes its own truth`, () => {
      // (1) THE BINDING: the owning family holds a row — a route id
      // keying nothing was the silent miss this wall exists to kill.
      assert.ok(
        (row.family ?? row.id) in ACTION_BINDINGS,
        `family '${row.family ?? row.id}' holds no ACTION_BINDINGS row — address '${row.id}' would silently ride the legacy lane`,
      );
      // (2) THE COMPOSE: the row's own declared weights + classes.
      const g = new GraphBuilder();
      def.compose(def.schema({ ...row.defaults, prompt: "a cat", seed: 5 }), row, g, `wall_${row.id}`);
      const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
      const nodes = Object.values(graph);
      const li = row.lane_inputs as Record<string, unknown>;
      const unet = nodes.find((n) => n.class_type === "UNETLoader")!;
      assert.equal(
        unet.inputs.unet_name, li.unet,
        "the graph loads the row's OWN unet (the raw route's merged view, not the family default)",
      );
      if (typeof li.latent_node === "string") {
        assert.ok(
          nodes.some((n) => n.class_type === li.latent_node),
          `the row's latent class '${li.latent_node}' builds`,
        );
      } else {
        // a family whose header disclaims the latent member composes
        // its own action's latent — either an explicit latent node
        // (qwen-img-21: EmptyLatentImage) or the lane's OWN
        // conditioning node emitting the canvas latent on its second
        // output (h3-image: MiniMaxH3ImageConditioning out 1). The
        // KSampler's latent_input names which; both bind a composed
        // node of the row's own spelling, never a hand-pinned class.
        const sampler = nodes.find((n) => n.class_type === "KSampler")!;
        const src = (sampler.inputs.latent_image as [string, number] | undefined)?.[0];
        const latentHost = src !== undefined
          ? (g.toJSON() as Record<string, { class_type?: string }>)[src]?.class_type
          : undefined;
        const rowEncoder = typeof li.text_encode_node === "string" ? li.text_encode_node : "CLIPTextEncode";
        assert.ok(
          nodes.some((n) => n.class_type === "EmptyLatentImage")
            || (latentHost !== undefined && latentHost === rowEncoder),
          "a family without a declared latent member still composes its action's latent",
        );
      }
      const encoder = typeof li.text_encode_node === "string" ? li.text_encode_node : "CLIPTextEncode";
      assert.ok(
        nodes.some((n) => n.class_type === encoder),
        `the row's encoder class '${encoder}' builds`,
      );
    });
  }

  it("THE ROUTE SPREAD: route addresses resolve their owning family (the family field rides the derived rows)", () => {
    const raw = rowOf("krea-2-raw");
    assert.equal(raw.family, "krea-2");
    assert.equal(raw.lane_inputs.unet, "krea2_raw_int8_convrot.safetensors",
      "the raw route's derived row carries the merged lane view");
    const bf16 = rowOf("qwen-img-21-bf16");
    assert.equal(bf16.family, "qwen-img-21");
  });
});

// ── THE DECLARED FALLBACK (the interlock): a family the card
// boards but does not bind REFUSES at the dispatch — no address
// silently rides a legacy lane while its siblings compose
// declared segments. The synthetic row is moss-shaped: no family
// field (the identity law: absent ≡ the row id), unbound id.
describe("THE DECLARED FALLBACK — an unbound family refuses loud", () => {
  it("a synthetic unbound row refuses, naming the boarded families", () => {
    const synth = {
      id: "moss-shape",
      card: "image-gen",
      defaults: {},
      lane_inputs: {},
      variants: [],
      variant_groups: [],
      outputs: [],
    };
    assert.ok(!("moss-shape" in ACTION_BINDINGS), "the synthetic row is genuinely unbound");
    assert.throws(
      () => def.compose(def.schema({ prompt: "a cat", seed: 5 }), synth, new GraphBuilder(), "r_fallback"),
      /no declared action for family 'moss-shape' on the image-gen card — every boarded family \(krea-2, z-image, anima, qwen-img-21, flux-klein, moss-image, h3-image\)/,
    );
  });
});

// ── THE ACTION ROUTE (the atom vocabulary, stroke-1 pilot): the
// qwen-img-21 family composes through its bound t2i action — the
// atom's own declared segment. The routing oracle is the facts
// door: a drifted text_encode_node REFUSES LOUD (the legacy arm
// silently routed to the stock CLIPTextEncode lane — the defect
// class the pilot kills for bound families). Byte-identity with
// the legacy arm is proven family-side
// (packages/models/qwen-img-21/tests/action.spec.ts).
describe("THE ACTION ROUTE — the bound t2i action on the real compose path", () => {
  const seedOf = (g: { toJSON(): unknown }): unknown =>
    ((g.toJSON() as Record<string, { inputs: Record<string, unknown> }>)["KSampler.0"]?.inputs.seed);

  it("qwen-img-21 composes the 2.1 encoder graph through the bound action", () => {
    const model = facts.models["qwen-img-21"]!;
    const g = new GraphBuilder();
    def.compose(def.schema({ ...model.defaults, prompt: "a cat", seed: 5 }), model, g, "r_act");
    const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const classes = Object.values(graph).map((n) => n.class_type);
    assert.ok(classes.includes("TextEncodeQwenImage21"), "the 2.1 encoder node builds");
    assert.ok(!classes.includes("CLIPTextEncode"), "no stock pair-lane encoder rides the bound family");
    const enc = Object.values(graph).find((n) => n.class_type === "TextEncodeQwenImage21")!;
    assert.equal(enc.inputs.prompt, "a cat");
    assert.equal(seedOf(g), 5, "a stated seed composes verbatim through the action route");
  });

  it("THE ROUTING ORACLE: a drifted text_encode_node refuses at the action's facts door — never the legacy silent stock-lane route", () => {
    const model = facts.models["qwen-img-21"]!;
    const drifted = { ...model, lane_inputs: { ...model.lane_inputs, text_encode_node: "TextEncodeQwenImageEdit" } };
    assert.throws(
      () => def.compose({ prompt: "a cat" }, drifted, new GraphBuilder(), "r_drift"),
      /text_encode_node.*TextEncodeQwenImage21/,
    );
  });

  it("GATE S rides the action route: the sentinel -1 mints DIFFERENT concrete seeds across two composes", () => {
    const model = facts.models["qwen-img-21"]!;
    const g1 = new GraphBuilder();
    def.compose(def.schema({ prompt: "a cat", seed: -1 }), model, g1, "r_act_rand_a");
    const g2 = new GraphBuilder();
    def.compose(def.schema({ prompt: "a cat", seed: -1 }), model, g2, "r_act_rand_b");
    const s1 = seedOf(g1);
    const s2 = seedOf(g2);
    assert.ok(typeof s1 === "number" && Number.isInteger(s1) && s1 >= 0,
      `the action route mints a concrete non-negative int (got ${String(s1)})`);
    assert.ok(typeof s2 === "number" && s2 >= 0);
    assert.notEqual(s1, s2, "run-again under random on the action route mints fresh");
  });
});

describe("THE REFERENCE SEAT IS THE OWNER LANE'S (c5f03df9 supersedes the 2026-10-11 no-seat ruling: the seat serves last on the shared face, fires only on qwen-img-21, and refuses LOUD everywhere else)", () => {
  it("the reference knob serves LAST on the shared face (the frozen form_spec field order holds)", () => {
    const carrier = (def.schemaCarrier ?? def.schema) as { dict?: Record<string, unknown> };
    const served = Object.keys(carrier.dict ?? {});
    assert.equal(served[served.length - 1], "reference_images",
      `the reference seat must serve last (got: ${served.join(", ")})`);
    assert.equal(served.filter((k) => k.includes("reference")).length, 1,
      `exactly one reference knob serves: ${served.join(", ")}`);
  });

  it("a stated reference_images key refuses LOUD on every family EXCEPT its owner qwen-img-21 (the phantom-port law)", () => {
    for (const id of def.boarded) {
      const model = facts.models[id]!;
      const compose = () => def.compose(def.schema({ prompt: "a cat", reference_images: ["refs/hero.png"] }), model, new GraphBuilder(), `r_rogue_${id}`);
      if (id === "qwen-img-21") {
        assert.doesNotThrow(compose, "the owning family composes with references stated");
      } else {
        assert.throws(
          compose,
          /reference_images stated on family/,
          `${id} accepted a reference_images key without refusing — the phantom-port law died`,
        );
      }
    }
  });

  it("the flow port is gone: no reference_images seat on the flow wire", () => {
    assert.equal((def.flowKinds.inputs as Record<string, unknown>).reference_images, undefined,
      "the flow wire re-declares the deleted seat");
  });

  it("THE FACE-LANE UNITY WALL: every served knob sits on EACH boarded family's declared surface, the reference seat on its owner lane alone", () => {
    const carrier = (def.schemaCarrier ?? def.schema) as { dict?: Record<string, unknown> };
    const served = Object.keys(carrier.dict ?? {});
    for (const id of def.boarded) {
      const decl = getModel(id) as { params?: string[] };
      const surface = decl.params;
      assert.ok(Array.isArray(surface),
        `${id} declares no lane surface — the face is unjudged against it (declare params in the DECL)`);
      for (const knob of served) {
        if (knob === "reference_images") continue; // the owner-lane seat, judged below
        assert.ok(
          surface.includes(knob),
          `THE UI IS RENDERING A SLOT THE MODEL DOES NOT HAVE: the image-gen card serves '${knob}' ` +
          `which family '${id}' does not declare (declared: ${surface.join(", ")})`,
        );
      }
    }
    // THE SEAT'S OWNER: exactly one boarded lane declares the seat —
    // the face serves it to every family, the phantom-port law makes
    // the non-owners refuse (the cell above), so the declaration must
    // sit on precisely the owning surface.
    const owners = def.boarded.filter((id) => {
      const decl = getModel(id) as { params?: string[] };
      return (decl.params ?? []).includes("reference_images");
    });
    assert.deepEqual(owners, ["qwen-img-21"],
      `the reference seat's declaration drifted: declared by [${owners.join(", ")}], the law names qwen-img-21 alone`);
  });
});

describe("THE FLOW PRODUCER BINDINGS (the object-forge producer-law cure: the card declares its real output channel)", () => {
  it("THE FLOW CONTRACT: the default channel is bound to the one SaveImage every family emits", () => {
    // The producer-law's declaration door (the mask cure d790eb045's
    // pattern): the estate's flows stage this card (object-forge's
    // concept, image-upscale's make) and the merge reads the channel
    // from THIS row — the row renames it to its flow-plane `image`
    // (kind-matched, one-to-one), so `concept.image` / `make.image`
    // resolve in the producer table the start door builds.
    assert.deepEqual(def.flowKinds.outputs, { default: "image" });
    const bindings = [...(def.flowOutputBindings ?? [])];
    assert.equal(bindings.length, 1,
      "the object-forge producer-law declaration is gone: the image-gen card declares no flowOutputBindings row — " +
      "the object-forge/image-upscale flow stages fall back to bind-by-construction and the declaration door is unseated");
    assert.deepEqual(bindings.map((b) => [b.channel, b.node, b.nodeClass]),
      [["default", "SaveImage.0", "SaveImage"]]);
    // UN_GUARDED on purpose: every boarded family's t2i action ends in
    // ONE decodeSave (render-kit decodeSave → SaveImage), so one
    // unconditional row is the honest shape — the nodeClass gate
    // refuses loud if a family lane ever renumbers.
    assert.ok(bindings.every((b) => b.when === undefined), "the row is unguarded — no family branches the emission");
  });

  it("THE BINDINGS RESOLVE (every boarded family press resolves default → its SaveImage.0)", () => {
    // THE DERIVED SWEEP, ALL SIX FAMILIES: the flow-pinned presses
    // (z-image, krea-2) ride the producer-agreement wall's real door;
    // this arm presses EVERY family the card boards so the explicit
    // node id is census-proof, not flow-lucky. A family that ever
    // emits zero or renumbered saves refuses here (the nodeClass
    // gate's voice), never rebinds silently.
    for (const id of def.boarded) {
      const model = facts.models[id]!;
      assert.ok(model !== undefined && model !== null, `${id}: facts names no model row`);
      const params = { ...(model.defaults as Record<string, unknown>), prompt: "a small brass compass on a desk" };
      const g = new GraphBuilder();
      def.compose(params, model, g, `bind_${id}`);
      const saves = Object.entries(g.toJSON() as Record<string, { class_type?: unknown }>)
        .filter(([, n]) => String(n.class_type ?? "").startsWith("Save"));
      assert.deepEqual(saves.map(([nid, n]) => [nid, n.class_type]), [["SaveImage.0", "SaveImage"]],
        `${id}: the family press must emit exactly the declared save (the declaration is derived from this output)`);
      const resolved = resolveCardFlowOutputs(def, params, g.toJSON());
      assert.deepEqual(resolved.outputs, { default: "image" }, `${id}: the declared channel publishes the image kind`);
      assert.equal(resolved.outputNodes["default"], "SaveImage.0", `${id}: the default channel names the family's own save`);
    }
  });
});

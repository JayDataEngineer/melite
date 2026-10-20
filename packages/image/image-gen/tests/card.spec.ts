// @contract models-gen-detailer-serve
// @melite/image-image-gen — the card's compose gate arm the
// composition spec does not own: the prompt admission + the happy
// lane against the boarded default family.
import "../../../../tests/helpers/boot-models.ts";
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCardDefs, ComposeRefusal } from "@melite/comfyui-cordis";
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

  it("THE GEN DETAILER SERVE (operator 2026-11-07, the mod SERVES): a stated region on a served lane composes the DetailerForEach arm — never a refusal, never a silent plain t2i", () => {
    // the served lanes (the burn's own krea-2 + the declared qwen
    // slice): the region vocabulary rides the gen card through the
    // Impact detector chain, crop_stitch via the shared kit arm.
    for (const [fam, run] of [["krea-2", "r_serve_k"], ["qwen-img-21", "r_serve_q"]] as const) {
      const model = facts.models[fam]!;
      assert.ok(model, `the facts serve ${fam}`);
      const g = new GraphBuilder();
      def.compose({ prompt: "a cat", mask: [{ input_mask: "/v1/assets/region.png" }], mask_mode: "crop_stitch" }, model, g, run);
      const nodes = Object.values(g.toJSON() as Record<string, { class_type?: string; inputs?: Record<string, unknown> }>);
      const detailer = nodes.find((n) => n.class_type === "DetailerForEach");
      assert.ok(detailer, `the stated region mints DetailerForEach on ${fam} (the gen detailer arm serves)`);
      const saved = nodes.find((n) => n.class_type === "SaveImage");
      assert.ok(
        typeof saved?.inputs?.filename_prefix === "string" && (saved.inputs.filename_prefix as string).startsWith(run + "/gen"),
        `the detailed image saves under the gen prefix on ${fam}`,
      );
    }
  });

  it("THE REGION FIRING GATE (E2-11, kept for unserved lanes): a stated region where no lane builds the arm refuses LOUD in the teaching voice — never a silent plain t2i", () => {
    const model = facts.models["anima"]!;
    assert.ok(model, "the facts serve anima (an unserved lane)");
    // the unserved lanes keep the refused-fate honesty — the refusal
    // names the mod's key and teaches the serving lanes.
    const fires = (e: unknown): boolean =>
      e instanceof Error && !(e instanceof ComposeRefusal)
      && /fires on the image-gen card/.test(String((e as Error).message))
      && /region arm serves/.test(String((e as Error).message));
    assert.throws(
      () => def.compose({ prompt: "a cat", mask: [{ input_mask: "/v1/assets/region.png" }] }, model, new GraphBuilder(), "r_bag"),
      fires,
    );
    assert.throws(
      () => def.compose({ prompt: "a cat", input_mask: "/v1/assets/region.png" }, model, new GraphBuilder(), "r_flat"),
      fires,
    );
    assert.throws(
      () => def.compose({ prompt: "a cat", mask_detector: "person" }, model, new GraphBuilder(), "r_det"),
      fires,
    );
    // THE DETAILER-KNOB HALF (the impact-2 detailer wrapper burn):
    // a flat prep/detail knob stated OUTSIDE the bag is authored
    // intent — the walk fills no rider defaults, presence fires.
    assert.throws(
      () => def.compose({ prompt: "a cat", mask_denoise: 0.8 }, model, new GraphBuilder(), "r_knob"),
      fires,
    );
    // THE SILENT-DROP GUARD'S OTHER HALF: a doc with NO stated
    // region composes the plain lane untouched (an explicit
    // mask_mode 'auto' is the plain lane's own word — never fires).
    const plain = facts.models[def.boarded[0]!]!;
    def.compose(def.schema({ prompt: "a cat" }), plain, new GraphBuilder(), "r_plain");
    def.compose({ prompt: "a cat", mask_mode: "auto" }, plain, new GraphBuilder(), "r_auto");
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
        // its own action's latent (qwen-img-21: EmptyLatentImage)
        assert.ok(
          nodes.some((n) => n.class_type === "EmptyLatentImage"),
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
      /no declared action for family 'moss-shape' on the image-gen card — every boarded family \(krea-2, z-image, anima, qwen-img-21, flux-klein, moss-image\)/,
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

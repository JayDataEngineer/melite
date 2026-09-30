import "../../../../tests/helpers/boot-models.ts";
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCardDefs, theService } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from "@melite/comfyui-cordis/service";
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
const DUMMY: ModelFacts = { id: "x", card: "x", defaults: {}, lane_inputs: {}, card_knobs: [], variants: [], variant_groups: [], outputs: [] } as never;

let def: CardDefinition;
beforeAll(async () => {
  def = (await loadCardDefs()).get("tagger")!;
  assert.ok(def, "the composition root serves the tagger card");
  // the door-level cascade receipts below compose through the booted
  // service — it needs the facts rows (packs stay ungated: no
  // object_info armed, so the requires slices never fire).
  theService().setFacts(facts as never);
});

const wd14 = facts.models["wd14"]!;
const florence2 = facts.models["florence2"]!;
const joycaption = facts.models["joycaption"]!;
const joytag = facts.models["joytag"]!;

/** The served envelope for the card's own schema carrier (the
 *  formSchemas door's serialization — the client's render truth). */
const envelope = (): { uid: number; refs: Record<number, Record<string, unknown>> } =>
  (def.schema as unknown as { toJSON: () => { uid: number; refs: Record<number, Record<string, unknown>> } }).toJSON();

/** The served field names (the envelope root dict — the client's render truth). */
const fieldNames = (): string[] => {
  const env = envelope();
  const root = env.refs[env.uid] as { dict: Record<string, number> };
  return Object.keys(root.dict);
};

describe("the tagger compose gate", () => {
  it("a missing/blank input_image refuses (nothing to tag is a refusal)", () => {
    assert.throws(
      () => def.compose(def.schema({}), wd14, new GraphBuilder(), "r1"),
      /required param 'input_image' missing or blank on the tagger card/,
    );
    assert.throws(
      () => def.compose(def.schema({ input_image: " " }), wd14, new GraphBuilder(), "r1"),
      /required param 'input_image' missing or blank on the tagger card/,
    );
    // a NON-string input meets the schema walk first — the gate
    // refuses the wrong type LOUD (same refusal class, earlier voice;
    // the door overlays explicit params verbatim, so raw composes
    // with non-strings arrive here ungated no longer).
    assert.throws(
      () => def.compose({ input_image: 5 }, wd14, new GraphBuilder(), "r1"),
      /input_image|expected string/,
    );
  });

  it("THE SCHEMA GATE: an out-of-envelope threshold refuses loud (declared 0–1), never composes", () => {
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", threshold: 5 }, wd14, new GraphBuilder(), "r_oob"),
      /threshold|5|between|range/i,
    );
  });

  it("THE SCHEMA GATE: a wrong-typed threshold refuses loud (declared number)", () => {
    assert.throws(
      () => def.compose({ input_image: "/m/pic.png", threshold: "high" }, wd14, new GraphBuilder(), "r_wt"),
      /threshold|expected number/i,
    );
  });

  it("THE SCHEMA GATE: unstated thresholds arrive as the declared defaults 0.35/0.85 (the walk fills them)", () => {
    const g = new GraphBuilder();
    def.compose({ input_image: "/m/pic.png", checkpoint: "wd-v1-4-moat-tagger-v2" }, wd14, g, "r_def");
    const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const tagger = Object.values(graph).find((n) => n.class_type?.startsWith("WD14"));
    assert.ok(tagger, "the wd14 tagger rides the fresh doc");
    assert.equal(tagger.inputs.threshold, 0.35,
      "the fresh doc composes the schema-declared default threshold 0.35, not undefined");
    assert.equal(tagger.inputs.character_threshold, 0.85,
      "the fresh doc composes the schema-declared default character_threshold 0.85, not undefined");
  });

  it("the happy lane loads and tags (wd14)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ input_image: "/m/pic.png", checkpoint: "wd-v1-4-moat-tagger-v2" }), wd14, g, "run_1");
    const graph = g.toJSON();
    assert.ok(graph["LoadImage.0"], "the image loads");
    assert.ok(Object.values(graph).some((n) => n.class_type.startsWith("WD14")), "the wd14 tagger rides");
  });
});

describe("the tagger weights law (the variant rail owns the checkpoint)", () => {
  it("the schema declares NO weights knob (no second picker around the card system)", () => {
    const names = fieldNames();
    for (const banned of ["checkpoint", "florence_checkpoint", "joycaption_checkpoint"]) {
      assert.ok(!names.includes(banned), `no '${banned}' field renders — weights arrive via the Model/Variant rail`);
    }
    assert.ok(names.includes("input_image"), "the image slot still renders");
    assert.ok(names.includes("threshold"), "the confidence floors still render");
  });

  it("checkpoint rides admits (the route stamp's admission — admitted, never rendered)", () => {
    assert.ok((def.admits ?? []).includes("checkpoint"),
      "the compose door + CLI admit the rail-stamped checkpoint beyond the schema knobs");
  });

  it("an explicit checkpoint lands on its family's node (wd14 + florence2 + joycaption share the key)", () => {
    const at = (g: GraphBuilder, cls: string) =>
      Object.values(g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>)
        .find((n) => n.class_type === cls)!;
    const g = new GraphBuilder();
    def.compose({ input_image: "/m/p.png", checkpoint: "wd-v1-4-vit-tagger" }, wd14, g, "r_w");
    assert.equal(at(g, "WD14Tagger|pysssss").inputs.model, "wd-v1-4-vit-tagger");
    const g2 = new GraphBuilder();
    def.compose({ input_image: "/m/p.png", checkpoint: "microsoft/Florence-2-base" }, florence2, g2, "r_f");
    assert.equal(at(g2, "DownloadAndLoadFlorence2Model").inputs.model, "microsoft/Florence-2-base");
  });

  it("a custom joycaption path composes verbatim (freeform is the upstream contract)", () => {
    const g = new GraphBuilder();
    def.compose({ input_image: "/m/p.png", checkpoint: "/models/custom-joycaption" }, joycaption, g, "r_j");
    const jc = Object.values(g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>)
      .find((n) => n.class_type === "JJC_DownloadAndLoadJoyCaptionModel")!;
    assert.equal(jc.inputs.model, "/models/custom-joycaption");
  });

  it("THE CASCADE RECEIPT: bare params compose each family's own default (no schema floor)", () => {
    const svc = theService();
    const at = (graph: Record<string, { class_type: string; inputs: Record<string, unknown> }>, cls: string) =>
      Object.values(graph).find((n) => n.class_type === cls)!;
    const wd = svc.compose("tagger", "wd14", { input_image: "/m/p.png" }, "r_cwd");
    assert.equal(
      at(wd as never, "WD14Tagger|pysssss").inputs.model, "wd-v1-4-moat-tagger-v2",
      "unstated wd14 checkpoint composes the DECL default, never undefined",
    );
    const fl = svc.compose("tagger", "florence2", { input_image: "/m/p.png" }, "r_cfl");
    assert.equal(
      at(fl as never, "DownloadAndLoadFlorence2Model").inputs.model, "MiaoshouAI/Florence-2-large-PromptGen-v2.0",
      "unstated florence checkpoint composes the DECL default",
    );
    const jc = svc.compose("tagger", "joycaption", { input_image: "/m/p.png" }, "r_cjc");
    assert.equal(
      at(jc as never, "JJC_DownloadAndLoadJoyCaptionModel").inputs.model, "fancyfeast/llama-joycaption-beta-one-hf-llava",
      "unstated joycaption checkpoint composes the DECL default",
    );
    const jt = svc.compose("tagger", "joytag", { input_image: "/m/p.png" }, "r_cjt");
    assert.ok(at(jt as never, "CXH_JoyTag"), "joytag rides with no checkpoint knob at all");
  });

  it("joytag composes with no checkpoint knob at all (its arm reads none)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ input_image: "/m/p.png", threshold: 0.2 }), joytag, g, "r_jt");
    const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const jt = Object.values(graph).find((n) => n.class_type === "CXH_JoyTag")!;
    assert.ok(jt, "the joytag node rides");
    assert.deepEqual(
      Object.keys(jt.inputs).sort(), ["THRESHOLD", "addTag", "image", "removeTag"],
      "no checkpoint input exists on the joytag arm",
    );
  });
});

// ── THE EVERY-ADDRESS WALL (the atom vocabulary, stroke 3): for
// EVERY facts row the tagger card serves: (1) the row's OWNING
// FAMILY holds an ACTION_BINDINGS row — no address silently rides
// the legacy lane while its siblings compose the declared segment;
// (2) the row composes ITS OWN declared segment — the family's own
// interrogator class builds under the run-scoped prefix. The
// family's class spelling is the oracle; the graph is the accused.
describe("THE EVERY-ADDRESS WALL — every served address composes its own declared segment", () => {
  const taggerRows = Object.values(facts.models).filter((m) => m.card === "tagger");
  // family → its own interrogator class (the oracle this wall
  // accuses the graph with).
  const OWN_CLASS: Record<string, string> = {
    wd14: "WD14Tagger|pysssss",
    joytag: "CXH_JoyTag",
    florence2: "Florence2Run",
    joycaption: "JJC_JoyCaption",
  };

  it("the card serves every boarded family (the wall's own footing)", () => {
    assert.ok(taggerRows.length >= 4, `expected the four tagger family rows, found ${String(taggerRows.length)}`);
  });

  it("THE BINDING COMPLETENESS: the bindings cover every legacy arm key (dispatch is total, never partial)", () => {
    // The bindings dispatch by family; every family that could ever
    // compose must be bound, or an address refuses loud at the
    // dispatch while its siblings compose the declared segment.
    const armKeys = Object.keys(OWN_CLASS);
    for (const key of armKeys) {
      assert.ok(key in ACTION_BINDINGS, `family '${key}' holds no ACTION_BINDINGS row`);
    }
  });

  for (const row of taggerRows) {
    it(`address '${row.id}' (family '${row.family ?? row.id}') is bound and composes its own truth`, () => {
      const family = (row.family ?? row.id) as string;
      // (1) THE BINDING: the owning family holds a row.
      assert.ok(
        family in ACTION_BINDINGS,
        `family '${family}' holds no ACTION_BINDINGS row — address '${row.id}' would silently ride the legacy lane`,
      );
      // (2) THE COMPOSE: the family's own interrogator class builds.
      const g = new GraphBuilder();
      def.compose(def.schema({ input_image: "/m/p.png" }), row, g, `wall_${family}`);
      const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
      const nodes = Object.values(graph);
      assert.ok(
        nodes.some((n) => n.class_type === OWN_CLASS[family]),
        `the family's own interrogator '${OWN_CLASS[family]}' builds`,
      );
      const save = nodes.find((n) => n.class_type === "SaveText")!;
      assert.equal(save.inputs.filename_prefix, `wall_${family}/tags`, "compose stamps the run prefix");
    });
  }

  it("THE DECLARED FALLBACK: an unboarded id REFUSES at the dispatch (declared, never silent)", () => {
    // No served facts row carries an id outside the four families —
    // the bindings cover the served set. A synthetic family-less
    // row with an unboarded id refuses at the dispatch, naming the
    // boarded families, rather than composing garbage (the interlock).
    const row = { ...wd14, id: "synthetic-tagger", family: undefined };
    assert.throws(
      () => def.compose(def.schema({ input_image: "/m/p.png" }), row as never, new GraphBuilder(), "wall_fallback"),
      /no declared action for family 'synthetic-tagger' on the tagger card — every boarded family \(wd14, joytag, florence2, joycaption\)/,
    );
  });
});

void DUMMY;

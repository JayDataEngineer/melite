// @melite/models-h3 — THE OUTPUT-NAME FILE-PLANE WALL (queue 12's
// owed half, 2026-11-19; operator press verbatim: "you were to also
// handle offering the ai the ability to name the actual outputs to
// make it clear for the end user. You had claimed it to work. ...
// But, you hid it stashed it, but it was false when you made that
// claim"). The 2026-11-08 label seam named DISPLAY rows; the
// 2026-11-18 session's "naming works" rode a developer-repo copy
// index. THIS wall judges the FILE plane on the real compose doors:
// a spelled output_name is threaded into every DELIVERABLE save
// prefix (the film `h3_t4_film`, the extend film `extend_film`, the
// re-shoot plates) so the artifact is BORN named, and an absent
// stem leaves the machinery prefix BYTE-FROZEN. The film's own
// named arm rides the consumer-map census (value-roundtrip's judge
// row); this wall owns the extend + re-shoot doors, the frozen
// default, the slug law's refusals (the schema walk AND the compose
// tail helper), and the silence law (empty stem = no tail).
// No @contract marker: package-local law, prose header (the
// registry row owns the file-plane law, models tier).
import "../../../../tests/helpers/boot-models.ts";
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { getModel, registryIds, registryModel } from "../../../engines/comfyui-cordis/src/models/models.ts";
import { film } from "../src/actions.ts";
import { renderH3Extend } from "../src/extend.ts";
import { instantiateAction } from "@melite/comfyui-card-kit";
import { OUTPUT_NAME_SLUG_RE, outputNameTailOf, paramSchema, schema } from "../src/schema.ts";
import type { H3Facts } from "../src/actions.ts";

const FACTS: H3Facts = {
  unet: "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors",
  clip: "qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
  vae_video: "minimax_h3_video_vae_int8_convrot.safetensors",
  vae_audio: "minimax_h3_audio_vae_fp32.safetensors",
};

const H3: ModelFacts = {
  id: "h3",
  card: "h3-timeline",
  defaults: {},
  lane_inputs: { unet: FACTS.unet },
  variants: [],
  variant_groups: [],
  outputs: [],
} as ModelFacts;

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

type Node = { class_type: string; inputs: Record<string, unknown> };
type Graph = Record<string, Node>;

const prefixesOf = (g: GraphBuilder, cls: string): string[] =>
  Object.values(g.toJSON() as Graph)
    .filter((n) => n.class_type === cls)
    .map((n) => String(n.inputs["filename_prefix"]));

const EXTEND_ENTRY = (): Record<string, unknown> => ({
  source_clip: "clips/take.mp4",
  extend_prompt: "carry the walk",
});

const filmDoc = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  variant: "t4_open", length: 124, seed: 42,
  calls: [
    { text: "a slow push in", start_frame: 0, end_frame: 56 },
    { text: "then a turn", start_frame: 56, end_frame: 124 },
  ],
  ...over,
});

describe("THE OUTPUT-NAME FILE PLANE (queue 12's owed half — the born-named deliverables)", () => {
  let compose: (doc: Record<string, unknown>, runId: string) => Promise<Graph>;

  beforeAll(async () => {
    const defs = await loadCardDefs();
    const def = defs.get("h3-timeline");
    assert.ok(def, "the composition root serves the h3-timeline card");
    const model = facts.models["h3"];
    assert.ok(model, "the h3 family facts row serves");
    compose = async (doc, runId) => {
      const g = new GraphBuilder();
      def.compose(def.schema({ ...doc }), model, g, runId);
      return g.toJSON() as Graph;
    };
  });

  // ── THE FILM (the census owns the named arm; this is the frozen
  //    default — the byte-stability the whole estate composes on) ──
  it("THE FROZEN DEFAULT: a doc with no stem composes the machinery film prefix byte-identically", async () => {
    const g = await compose(filmDoc(), "run_frozen");
    const saves = prefixesOf({ toJSON: () => g } as unknown as GraphBuilder, "SaveVideo");
    assert.ok(saves.includes("run_frozen/h3_t4_film"),
      `the machinery film prefix is byte-frozen — saw ${JSON.stringify(saves)}`);
    assert.ok(!saves.some((p) => p.startsWith("run_frozen/h3_t4_film_")),
      "no slug-tailed film prefix mints on an un-named doc");
  });

  it("THE FILM NAMED (the compose door the run rides): the stem rides the delivered prefix leaf", async () => {
    const g = await compose(filmDoc({ output_name: "chase" }), "run_named");
    const saves = prefixesOf({ toJSON: () => g } as unknown as GraphBuilder, "SaveVideo");
    assert.ok(saves.includes("run_named/h3_t4_film_chase"),
      `the film is BORN named — saw ${JSON.stringify(saves)}`);
    assert.ok(!saves.includes("run_named/h3_t4_film"),
      "the machinery film prefix is GONE when the stem is spelled");
    assert.ok(saves.includes("run_named/h3_t4_w1") && saves.includes("run_named/h3_t4_w2"),
      "the window intermediates keep their machinery prefixes");
  });

  // ── THE EXTEND FILM (both compose arms) ────────────────────────
  it("THE EXTEND FILM NAMED: the single-window arm delivers <runId>/extend_film_<slug>", () => {
    const g = new GraphBuilder();
    renderH3Extend(EXTEND_ENTRY(), { output_name: "carry-the-walk" }, FACTS, g, "run_ex");
    const saves = prefixesOf(g, "SaveVideo");
    assert.ok(saves.includes("run_ex/extend_film_carry-the-walk"),
      `the extend film is BORN named — saw ${JSON.stringify(saves)}`);
    assert.ok(saves.includes("run_ex/x0") && saves.includes("run_ex/x1"),
      "the x0/x1 parts keep their machinery prefixes");
  });

  it("THE EXTEND FILM FROZEN: no stem, the machinery extend prefix verbatim", () => {
    const g = new GraphBuilder();
    renderH3Extend(EXTEND_ENTRY(), {}, FACTS, g, "run_exf");
    const saves = prefixesOf(g, "SaveVideo");
    assert.ok(saves.includes("run_exf/extend_film"),
      `the machinery extend prefix is byte-frozen — saw ${JSON.stringify(saves)}`);
    assert.ok(!saves.some((p) => p.startsWith("run_exf/extend_film_")),
      "no slug-tailed extend prefix mints on an un-named doc");
  });

  // ── THE RE-SHOOT PLATES (the film action's camera commission) ──
  it("THE RE-SHOOT PLATES NAMED: both delivered faces carry the one stem", () => {
    const g = new GraphBuilder();
    const doc = {
      variant: "t4_open", length: 124, seed: 42, width: 1344, height: 768,
      reshoot: [{ source_clip: "sources/take3.mp4" }],
      output_name: "crossview",
    };
    instantiateAction(film, doc, H3, g, "run_rs");
    const plates = prefixesOf(g, "SaveImage");
    assert.ok(plates.includes("run_rs/reshoot_warp_crossview") && plates.includes("run_rs/reshoot_orbit_crossview"),
      `both re-shoot plates are BORN named — saw ${JSON.stringify(plates)}`);
  });

  it("THE RE-SHOOT PLATES FROZEN: no stem, the machinery plate prefixes verbatim", () => {
    const g = new GraphBuilder();
    const doc = {
      variant: "t4_open", length: 124, seed: 42, width: 1344, height: 768,
      reshoot: [{ source_clip: "sources/take3.mp4" }],
    };
    instantiateAction(film, doc, H3, g, "run_rsf");
    const plates = prefixesOf(g, "SaveImage");
    assert.ok(plates.includes("run_rsf/reshoot_warp") && plates.includes("run_rsf/reshoot_orbit"),
      `the machinery plate prefixes are byte-frozen — saw ${JSON.stringify(plates)}`);
  });

  // ── THE SLUG LAW (the boundary walk + the compose tail helper) ──
  it("THE WALK REFUSES A NON-SLUG STEM: spaces, case, dots, and path escapes die at the schema door", () => {
    for (const bad of ["Bad Name", "../escape", "a/b", "UPPER", "dot.name", "-lead", "x".repeat(65)]) {
      assert.throws(
        () => { schema(filmDoc({ output_name: bad })); },
        { message: /output_name|match regexp/i },
        `the walk refuses the non-slug stem ${JSON.stringify(bad)}`,
      );
    }
    assert.ok(OUTPUT_NAME_SLUG_RE.test("chase") && OUTPUT_NAME_SLUG_RE.test("cross-view-2"),
      "the slug law admits legal stems");
  });

  it("THE TAIL HELPER REFUSES LOUD (the compose's own belt) AND KEEPS THE SILENCE LAW", () => {
    assert.equal(outputNameTailOf({}), "", "an absent stem mints no tail");
    assert.equal(outputNameTailOf({ output_name: "" }), "", "an empty stem mints no tail (the label seam's silence law)");
    assert.equal(outputNameTailOf({ output_name: "chase" }), "_chase", "a legal stem mints the tail");
    assert.throws(
      () => { outputNameTailOf({ output_name: "../escape" }); },
      { message: /output_name must be a filename slug/ },
      "a path escape refuses loud at the prefix seam itself",
    );
  });

  it("THE GROUP FOLD (2026-11-19, the operator's tab-room ask): the slug rides GENERAL — no 'naming' group survives the served face, the sixth tab dies", () => {
    // toJSON() is schemastery's serialization — the SAME envelope the
    // estate serves and card-base's form.tsx reads for the tab rail
    // (groupFields → titleCaseId(g.group ?? 'General')). Judging the
    // extras HERE judges the rail: a row's group extra IS its tab.
    const json = paramSchema.toJSON() as unknown as {
      uid: number
      refs: Record<string, { meta?: { extra?: { group?: string } }, dict?: Record<string, number> }>
    };
    const root = json.refs[String(json.uid)];
    assert.ok(root?.dict, "the root object serializes its field map");
    const slugRef = String(root.dict?.["output_name"]);
    assert.ok(slugRef !== "undefined", "the output_name row rides the served face");
    assert.equal(json.refs[slugRef]?.meta?.extra?.group, undefined,
      "the slug row carries NO group extra — it renders under General, never its own tab");
    const live = new Set(
      Object.values(json.refs).map((ref) => ref?.meta?.extra?.group),
    );
    assert.ok(!live.has("naming"),
      "no served row carries group 'naming' — the Naming tab is dead at the rail");
    assert.deepEqual(
      [...live].filter((g): g is string => typeof g === "string").sort(),
      ["refmod", "sampling", "second_pass", "sla"],
      "exactly four named groups ride the rail beside General (five tabs — the room the operator asked for)");
  });
});

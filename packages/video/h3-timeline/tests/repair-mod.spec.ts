// @melite/video-h3-timeline — THE REPAIR NAME (slice 4 of the
// collapse: THE DELETION). The operator's own ruling: "REPAIR AND
// REPLACE ARE THE [redacted - the emphatic spelling lives in the
// receipt] SAME OPERATION! REPAIR JUST USES THE ORIGINAL." The name
// left the DECLARED roster and lives on as the
// edit bag's masked-partial cell: the translation states the
// RECEIVED static mask (P0-2, defect board row 2 — "repair receives
// a mask and errors without one") + the source as its own anchor +
// the stated denoise, node for node. The suite drives the card's own
// doors (def.mods proves the name is gone; def.compose proves the
// doc still composes) and pins the SURVIVING laws: the unguided
// full-render refusal, the declared band, the one-door matrix. The
// mask-required + prose-demotion arms live in
// repair-receives-mask.spec.ts (the contract's own wall).
import "../../../../tests/helpers/boot-models.ts";
import { beforeAll, describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import { renderH3RepairBag } from "@melite/models-h3";
import { parseH3Facts } from "@melite/models-h3/actions";
import type { H3Facts } from "@melite/models-h3/actions";
import { resolveLegacyEditAliases } from "../src/card.ts";
import {
  getModel, registryIds, registryModel,
} from "../../../engines/comfyui-cordis/src/models/models.ts";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

let def: CardDefinition;
let model: ModelFacts;

beforeAll(async () => {
  def = (await loadCardDefs()).get("h3-timeline")!;
  assert.ok(def, "the composition root serves the h3-timeline card");
  model = facts.models["h3-timeline"]!;
  assert.ok(model, "the h3-timeline family facts row serves");
});

type Node = { class_type: string; inputs: Record<string, unknown> };
const graphOf = (g: GraphBuilder): Record<string, Node> =>
  g.toJSON() as Record<string, Node>;
const ofClass = (out: Record<string, Node>, cls: string): [string, Node][] =>
  Object.entries(out).filter(([, n]) => n.class_type === cls);

const compose = (doc: Record<string, unknown>, runId: string): Record<string, Node> => {
  const walked = def.schema(doc) as Record<string, unknown>;
  const g = new GraphBuilder();
  def.compose(walked, model, g, runId);
  return graphOf(g);
};

const REPAIR_ENTRY = (): Record<string, unknown> => ({
  source_clip: "clips/take.mp4",
  repair_prompt: "the same hands, five clean fingers, gripping the cup",
  mask: "masks/hands_union.png",
});

const EDIT_EQUIVALENT = (): Record<string, unknown> => ({
  source_clip: "clips/take.mp4",
  mask: "masks/hands_union.png",
  edit_prompt: "the same hands, five clean fingers, gripping the cup",
  mask_source: "static-png",
  reference: "self",
  // the arm's declared default, stated: absence is not authorship
  denoise: 0.32,
});

describe("the Repair name — the masked-partial cell of the one edit bag (the collapse, slice 4)", () => {
  it("THE NAME LEFT THE ROSTER: no repair peer bag is served", () => {
    const kinds = ((def as { mods?: Array<Record<string, unknown>> }).mods ?? []).map((k) => k.kind);
    assert.deepEqual(kinds, ["reshoot", "edit", "loras"], "the survivor roster");
    assert.equal(kinds.includes("repair"), false);
  });

  it("THE NAME STILL COMPOSES: the RECEIVED static mask rides the one door", () => {
    const out = compose({ repair: [REPAIR_ENTRY()] }, "run_repair_alias");
    assert.equal(ofClass(out, "ImageToMask").length, 1, "the received PNG decodes once (the static mask)");
    assert.equal(ofClass(out, "SAM3_VideoTrack").length, 0, "no prose manufacture rides the repair alias (P0-2)");
    assert.equal(ofClass(out, "MiniMaxH3ChainAssemble").length, 1, "the chain assemble terminates the emission");
  });

  it("THE TRANSLATION IS THE CELL: the alias graph deep-equals the stated edit entry", () => {
    const viaAlias = compose({ repair: [REPAIR_ENTRY()] }, "run_repair_equiv");
    const viaEdit = compose({ edit: [EDIT_EQUIVALENT()] }, "run_repair_equiv");
    assert.deepEqual(viaAlias, viaEdit, "mask + source anchor + denoise: the same cell, node for node");
  });

  it("leaves the film byte-identical with the arm absent", () => {
    const out = compose({}, "run_repair_empty");
    for (const cls of ["ImageToMask", "MiniMaxH3ContexMaskedTarget"]) {
      assert.equal(ofClass(out, cls).length, 0, `the empty-arm film composes no ${cls}`);
    }
    assert.ok(ofClass(out, "SaveVideo").length > 0, "the film still delivers");
  });

  it("an EMPTY legacy bag is the unused arm", () => {
    assert.deepEqual(
      compose({ repair: [] }, "run_repair_empty_bag"),
      compose({}, "run_repair_empty_bag"),
      "an empty array still composes the film",
    );
  });

  it("P0-2: the prose door is DEAD at this cell — a stated region_prompt rides no dial (the sweep's own law)", () => {
    assert.throws(
      () => compose({ repair: [{ ...REPAIR_ENTRY(), region_prompt: "hands" }] }, "run_repair_prose"),
      /'region_prompt' seat rides no edit dial/,
      "the mask-less manufacture that let run-e79f3b304e4b repair from prose is gone",
    );
  });

  it("a FULL-DENOISE repair refuses — the unguided re-render law that replaced the arm name", () => {
    assert.throws(
      () => compose({ repair: [{ ...REPAIR_ENTRY(), denoise: 1 }] }, "run_repair_full"),
      /an unguided full re-render of the masked region/,
    );
  });

  it("THE DECLARED BAND BINDS: denoise 1.2 refuses naming the edit bag's 0.05–1 band", () => {
    assert.throws(
      () => compose({ repair: [{ ...REPAIR_ENTRY(), denoise: 1.2 }] }, "run_repair_band"),
      /outside this seat's declared band 0\.05–1/,
    );
  });

  it("ONE DOOR: repair beside an armed edit bag refuses", () => {
    assert.throws(
      () => compose({ repair: [REPAIR_ENTRY()], edit: [EDIT_EQUIVALENT()] }, "run_repair_race"),
      /Video edit and repair are both armed/,
    );
  });

  it("ONE DOOR PER DOC: repair beside extend refuses", () => {
    assert.throws(
      () => compose({
        repair: [REPAIR_ENTRY()],
        extend: [{ source_clip: "clips/take.mp4", extend_prompt: "keeps walking" }],
      }, "run_repair_pair"),
      /repair and extend are both armed — one door per doc/,
    );
  });
});

// ── THE TILED REPAIR BAG (the windows arc, the honesty row's owed
// design): the ONE legacy name whose multi-entry bag still composes.
// N ≥ 2 entries compose the GAPS-19 shape — each entry its own
// masked-edit window on the one spine (file-join posture), saved
// `<runId>/repair_w<k>`, joined into ONE `<runId>/repair` film by the
// film tail's join primitives. The grammar lives in the family
// carrier (one owner — the lib bypass face composes byte-identical);
// the card door contributes the reshoot pair edge and the declared
// bands over the kept bag. THE SERVED DIALECT: a tiled entry states
// its window in SECONDS (window_seconds); the starts are the
// carrier's derivation, so the film-order law (window 0 at the head,
// every next window at the last's end) is arithmetic, not a stated
// seat the agent could misorder. ──
const TILE_FACTS: H3Facts = {
  unet: "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors",
  clip: "qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
  vae_video: "minimax_h3_video_vae_int8_convrot.safetensors",
  vae_audio: "minimax_h3_audio_vae_fp32.safetensors",
};
// grid-legal spans: seconds × 24 lands on the 22+17k rungs
const W0_SECONDS = 56 / 24; // 56 f
const W1_SECONDS = 39 / 24; // 39 f
const WIN = (seconds: number): Record<string, unknown> => ({
  ...REPAIR_ENTRY(),
  window_seconds: seconds,
});

describe("THE TILED REPAIR BAG — the windows arc (GAPS-19's shape, repair semantics)", () => {
  it("THE TILED SHAPE: two window chains save <runId>/repair_w<k>, the boundary chain orders them, ONE concat joins <runId>/repair — and no in-chain assemble exists", () => {
    const out = compose({ repair: [WIN(W0_SECONDS), WIN(W1_SECONDS)] }, "run_repair_tiled");
    assert.equal(ofClass(out, "MiniMaxH3ReferenceToVideo").length, 2,
      "each window rides its own masked-edit chain on the one spine");
    assert.equal(ofClass(out, "MiniMaxH3ChainAssemble").length, 0,
      "no in-chain assemble — the tiled face joins by file (the spine's file-join posture)");
    const saves = ofClass(out, "SaveVideo");
    assert.deepEqual(
      saves.map(([, n]) => String(n.inputs["filename_prefix"])).sort(),
      ["run_repair_tiled/repair", "run_repair_tiled/repair_w0", "run_repair_tiled/repair_w1"],
      "the windows save repair_w<k> and the join delivers ONE <runId>/repair film",
    );
    for (const [, n] of saves) {
      assert.equal(n.inputs["format"], "mp4", "the film tail's container law");
      assert.equal(n.inputs["codec"], "h264", "the film tail's codec law");
    }
    const creates = ofClass(out, "CreateVideo");
    assert.equal(creates.length, 3, "two window containers + the joined film's container");
    for (const [, n] of creates) assert.equal(n.inputs["bit_depth"], 8, "the film bit depth");
    // THE BOUNDARY CHAIN: one unload per save, threaded; the concat
    // provably waits on the chain's end (the film tail's own law)
    const unloads = ofClass(out, "MeliteUnload");
    assert.equal(unloads.length, 2, "one boundary per window save");
    const byId = new Map(Object.entries(out));
    const srcOf = (n: Node, k: string): string => (n.inputs[k] as [string, number])[0];
    const saveIds = new Set(saves.map(([id]) => id));
    for (const [, n] of unloads) {
      assert.equal(n.inputs["unload_models"], false, "the boundary keeps the weights");
      assert.ok(saveIds.has(srcOf(n, "video")), "each boundary eats a window save");
    }
    const afterOf = (n: Node): string | undefined =>
      (n.inputs["after"] as [string, number] | undefined)?.[0];
    assert.equal(unloads.filter(([, n]) => afterOf(n) === undefined).length, 1, "one chain head");
    const concats = ofClass(out, "MeliteConcatVideos");
    assert.equal(concats.length, 1, "one file join");
    const concatNode = concats[0]![1];
    assert.equal(concatNode.inputs["videos"],
      "run_repair_tiled/repair_w0,run_repair_tiled/repair_w1",
      "the join names the window files in film order");
    let cursor: string | undefined = srcOf(concatNode, "after");
    let walked = 0;
    while (cursor !== undefined) {
      const node = byId.get(cursor) as Node;
      assert.equal(node.class_type, "MeliteUnload", "the chain links only boundaries");
      walked += 1;
      cursor = afterOf(node);
    }
    assert.equal(walked, 2, "the concat provably waits for EVERY save");
  });

  it("THE FILM-ORDER LAW IS THE CARRIER'S DERIVATION: window 0 loads from the head, window 1 loads where window 0 ends — the windows always abut, nothing to misorder", () => {
    const out = compose({ repair: [WIN(W0_SECONDS), WIN(W1_SECONDS)] }, "run_repair_starts");
    const loaders = ofClass(out, "VHS_LoadVideo");
    assert.equal(loaders.length, 2, "one windowed loader per entry");
    const spans = loaders
      .map(([, n]) => ({ cap: Number(n.inputs["frame_load_cap"]), skip: Number(n.inputs["skip_first_frames"]) }))
      .sort((a, b) => a.skip - b.skip);
    assert.deepEqual(spans, [
      { cap: 56, skip: 0 },
      { cap: 39, skip: 56 },
    ], "window 0 opens at the head (56 f); window 1 opens at its end (39 f) — derived, never stated");
  });

  it("N=1 IS THE ALIAS: one window rides the single-window emission — no tiled tail ever fires, and the carrier refuses the one-entry bag by name", () => {
    const out = compose({ repair: [REPAIR_ENTRY()] }, "run_repair_n1");
    assert.equal(ofClass(out, "MeliteConcatVideos").length, 0, "no join for one window");
    assert.equal(ofClass(out, "MeliteUnload").length, 0, "no boundary chain for one window");
    assert.equal(ofClass(out, "MiniMaxH3ChainAssemble").length, 1,
      "the single-window emission ends in the chain assemble (byte-identical to the alias)");
    const g = new GraphBuilder();
    assert.throws(
      () => renderH3RepairBag([REPAIR_ENTRY()], {}, TILE_FACTS, g, "run_repair_n1_lib"),
      /the tiled bag starts at two windows/,
      "the lib bypass face cannot silently reroute a one-window bag",
    );
  });

  it("ONE OWNER: the lib bypass face composes the tiled bag BYTE-IDENTICAL to the card door (the carrier is the only composer)", () => {
    const doc = { repair: [WIN(W0_SECONDS), WIN(W1_SECONDS)] };
    const viaCard = compose(doc, "run_repair_parity");
    const resolved = resolveLegacyEditAliases(def.schema(doc) as Record<string, unknown>);
    const g = new GraphBuilder();
    renderH3RepairBag(
      resolved["repair"] as unknown[],
      resolved,
      parseH3Facts(model.lane_inputs),
      g,
      "run_repair_parity",
    );
    assert.deepEqual(graphOf(g), viaCard,
      "the card door adds nothing — one grammar, two faces, one emission");
  });

  it("THE SECONDS DIALECT: a stated frame seat refuses — the tiled bag states windows in seconds, the starts stay the carrier's own", () => {
    assert.throws(
      () => compose({ repair: [WIN(W0_SECONDS), { ...WIN(W1_SECONDS), window_start: 0 }] }, "run_repair_frame"),
      /states window_start\/window_length/,
    );
    assert.throws(
      () => compose({ repair: [WIN(W0_SECONDS), { ...WIN(W1_SECONDS), window_length: 39 }] }, "run_repair_frame2"),
      /the frame seats are the single-window arm's internal arithmetic/,
    );
  });

  it("THE STATED WINDOW: an unstated span refuses naming the whole-film face's own door", () => {
    assert.throws(
      () => compose({ repair: [WIN(W0_SECONDS), REPAIR_ENTRY()] }, "run_repair_unstated"),
      /states no window_seconds[\s\S]*the whole-film tiling is the edit door's own/,
    );
  });

  it("THE STATED WINDOW: a wrong-typed span refuses — a number seat carries a number", () => {
    assert.throws(
      () => compose({ repair: [WIN(W0_SECONDS), { ...WIN(W1_SECONDS), window_seconds: "2.5" }] }, "run_repair_type"),
      /'window_seconds' is stated as "2\.5"/,
    );
  });

  it("THE GRID LAW: an off-grid span refuses at the compose door naming the nearest legal rung", () => {
    assert.throws(
      () => compose({ repair: [WIN(W0_SECONDS), WIN(3)] }, "run_repair_grid"),
      /window 1 window_seconds: length 72f is off-grid[\s\S]*nearest legal: 73f/,
    );
  });

  it("THE BUDGET: a window past the entry's clip budget refuses naming both numbers", () => {
    // W0 = 158 f of a 131 f budget (158 × clip_seconds 5.5 =
    // 132 → 5.5 s = 132 f; the window still past it)
    assert.throws(
      () => compose({ repair: [{ ...WIN(158 / 24), clip_seconds: 5.5 }, WIN(W1_SECONDS)] }, "run_repair_budget"),
      /window 0 states 158 f \([^)]* s\) against a 5\.5 s clip budget \(132 f\)/,
    );
  });

  it("ONE FILM: differing sources refuse — the tiling joins windows of ONE timeline", () => {
    assert.throws(
      () => compose({ repair: [WIN(W0_SECONDS), { ...WIN(W1_SECONDS), source_clip: "clips/other.mp4" }] }, "run_repair_src"),
      /two sources are two films/,
    );
  });

  it("THE CEILING: 33 entries refuse naming the film's composed-window ceiling", () => {
    const bag = Array.from({ length: 33 }, () => WIN(W1_SECONDS));
    assert.throws(
      () => compose({ repair: bag }, "run_repair_ceiling"),
      /the film's composed-window ceiling is 32/,
    );
  });

  it("THE DECLARED BANDS BIND THE KEPT BAG: an off-band denoise refuses under the repair label (the judge walks the resolver-kept bag)", () => {
    assert.throws(
      () => compose({ repair: [WIN(W0_SECONDS), { ...WIN(W1_SECONDS), denoise: 0.01 }] }, "run_repair_band"),
      /h3-timeline repair entry 1: 'denoise': 0\.01 is outside this seat's declared band 0\.05–1/,
    );
  });

  it("THE PARTIAL-DENOISE POLE: a full-denoise tiled entry refuses — a masked second pass is a refine, never a re-render", () => {
    assert.throws(
      () => compose({ repair: [WIN(W0_SECONDS), { ...WIN(W1_SECONDS), denoise: 1 }] }, "run_repair_pole"),
      /a masked second pass is a refine, never a re-render/,
    );
  });

  it("ONE DOOR: the tiled bag beside an armed edit bag refuses (the resolver's own matrix)", () => {
    assert.throws(
      () => compose({ repair: [WIN(W0_SECONDS), WIN(W1_SECONDS)], edit: [EDIT_EQUIVALENT()] }, "run_repair_pair_edit"),
      /Video edit and repair are both armed/,
    );
  });

  it("ONE DOOR PER DOC: the tiled bag beside extend refuses", () => {
    assert.throws(
      () => compose({
        repair: [WIN(W0_SECONDS), WIN(W1_SECONDS)],
        extend: [{ source_clip: "clips/take.mp4", extend_prompt: "keeps walking" }],
      }, "run_repair_pair_extend"),
      /repair and extend are both armed/,
    );
  });

  it("THE RESHOOT EDGE: the tiled branch returns before the film action, so an armed reshoot under it refuses loud", () => {
    assert.throws(
      () => compose({
        repair: [WIN(W0_SECONDS), WIN(W1_SECONDS)],
        reshoot: [{ source_clip: "clips/take.mp4" }],
      }, "run_repair_pair_reshoot"),
      /the tiled repair bag and Reshoot are both armed/,
    );
  });

  it("THE LORA BAG IS NOT AN ARM: the tiled repair bag composes beside an armed loras bag", () => {
    const out = compose({
      repair: [WIN(W0_SECONDS), WIN(W1_SECONDS)],
      loras: [{ on: true, lora: "h3/distill_v4.safetensors", str: 0.6, steps: 8 }],
    }, "run_repair_loras");
    assert.equal(ofClass(out, "MeliteConcatVideos").length, 1, "the tiled join still delivers");
    assert.equal(ofClass(out, "SaveVideo").length, 3, "the tiled emission holds");
  });

  it("THE SURFACE STATES THE TWO FACES: the served repair section and the leaf teach the seconds dialect and the derived starts — never frame typing", () => {
    const mods = (def as unknown as { mods?: Array<Record<string, unknown>> }).mods ?? [];
    const kind = mods.find((k) => k.param_key === "edit") as
      | { sections?: Array<{ id: string; tooltip?: string }> }
      | undefined;
    const tooltip = (kind?.sections ?? []).find((s) => s.id === "repair-region")?.tooltip ?? "";
    assert.match(tooltip, /TWO FACES/, "the served surface names both faces");
    assert.match(tooltip, /one entry is the single-window face/, "the single-window face is taught");
    assert.match(tooltip, /window_seconds/, "the tiled face teaches the seconds seat");
    assert.match(tooltip, /derives every start/, "the served surface teaches the derived starts");
    assert.doesNotMatch(tooltip, /window_start \+ window_length|window_start\/window_length/,
      "the served surface types no frame seats");
    const md = readFileSync(join(dirname(fileURLToPath(import.meta.url)),
      "..", "src", "agents", "skills", "repair", "SKILL.md"), "utf-8");
    assert.match(md, /window_seconds/, "the leaf teaches the seconds seat");
    assert.match(md, /the carrier\s+derives every start/, "the leaf teaches the derived starts");
    assert.match(md, /window 0 opens at the film's\s+head/, "the leaf states the head law");
    assert.equal(md.includes("window_start"), false,
      "the leaf types NO frame seats (the carry law's own acceptance test)");
    assert.equal(md.includes("window_length"), false, "the leaf types NO frame seats");
    assert.equal(md.includes("clip_seconds"), false, "the leaf teaches no internal seat names");
  });
});

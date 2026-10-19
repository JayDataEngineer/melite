// refmod-value-arms.spec.ts — THE REFMOD VALUE WALL (2026-11-08).
//
// KILLS dev_docs/ERRORS.md items f (operator: "I put an image in
// refmod, and the model completely ignored it") and d ("does it make
// sense that I get something that has 100 sampling steps when I use
// an image in refmod?"), against the delivered study
// dev_docs/audits/refmod-deep-study-2026-11-08.md (its §2 the
// unwitnessed/half-write-dead chain, its §4 G1 "the drills that will
// actually catch this: compose a stated refmod and walk the
// serialized graph") and the purge law of
// dev_docs/audits/ui-engine-fidelity-purge-2026-11-08.md §2/§3/§7
// (the P2 value law: "every composed value must be present and named
// at the node the DECL says consumes it"; SD-2/SD-5).
//
// THE JOURNEY HOPS WITNESSED (dev_docs/THE_JOURNEY_LAW.md §2):
// [3] run params → [4] compose door → [5] serialized graph. The
// compose door driven here is the REAL door — the card def's own
// compose, the exact function the estate's run path drives through
// cardsCompose.composeOnce → the ComfyUIService card table (the
// card.spec.ts / card-compose-liveness.ts precedent; the admission
// gate gatedResolve runs INSIDE it, so a passing arm is also the
// hop-3 admission proof). No frozen graphs: every node, input name,
// and value is read out of the composed graph; every expected number
// is derived from the DECL + the pack catalog at runtime.
//
// THE EXEMPTION ROWS THESE ARMS OBSOLETE (the "walked, never judged"
// class — left in place deliberately, this file is their judge):
//   • tests/walls/ts/suites/models-against-cards.spec.ts:349-351
//     (the 470→471 census row: "h3's ref_mods seat — an ARRAY field,
//     walked but never judged") and the sibling pin at :1554-1556
//     (625→626).
//   • tests/walls/ts/suites/card-compose-liveness.spec.ts:535 (the
//     WRITES_EXEMPT row for ref_mods: "the fourth declared ref lane;
//     the serialize round-trip arm judges its emission") — emission
//     is not arrival; the arms below judge PRESENCE AND VALUE AT THE
//     CONSUMER NODE.
//
// RED PROOF (pre-registered, first run IS the receipt): ARM 10 reds
// on today's tree — a stated bag-row step count outside the declared
// span rides the single-window marriage past the DECL bound into the
// graph (the operator's ~100, reproduced). Precise pointers live on
// each arm. The value-at-the-node arms are the new green wall the
// exemptions never had: they red the day the compose chain stops
// carrying a stated value (toggle: drop the refmod seam in
// packages/models/h3/src/actions.ts:1431-1545 and every arm in the
// first describe reds).
// THE PER-FILE BOOT FIRST (tests/helpers/boot-models.ts header law):
// the models table is lazy — the compose door and the facts reads
// need the booted service before this spec's own imports evaluate.
import "../../../../tests/helpers/boot-models.ts";
import { beforeAll, describe, it } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import { getModel, registryIds, registryModel } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import { fieldsOfEnvelope } from "../../../../packages/web/card-base/src/spec.ts";
import { film as _filmSentinel } from "../../../../packages/models/h3/src/index.ts";
import { paramSchema } from "../../../../packages/models/h3/src/schema.ts";
import { REF_CAPS } from "../../../../packages/models/h3/src/timelineContract.ts";
import { H3_LORA_ROWS } from "../../../../packages/models/h3/mods/loras.ts";
void _filmSentinel;

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);

// THE CONSUMER NODES THE DECL/MODS DECLARE FOR REFERENCE
// CONDITIONING (packages/models/h3/src/actions.ts:1483-1551 — the
// seam's own construction; the study §2 names this chain the burn's
// subject). The classes are read here as the seam spells them — the
// walls' object_info fixtures carry the same four classes, so a pack
// rename reds both this wall and the fixtures' declared-input sweeps.
const EXTRACT_CLASS = "MiniMaxH3RefModExtract";
const LOADER_CLASS = "MiniMaxH3RefModsLoader";
const APPLY_CLASS = "MiniMaxH3RefModApply";
// THE STATED IMAGE (the fixture path the arm states — the value the
// whole wall is about). A path-shaped value, the refs-lane wire form
// the buckets commit; mediaKindOf classifies the .png tail image-side
// (packages/web-kit/contracts/src/mediaKinds.ts:106).
const REFMOD_IMAGE = "refs/refmod_identity.png";
const REFMOD_IMAGE_B = "refs/refmod_secondary.png";
const REFMOD_STEM = "flux_stem.safetensors";

type GNode = { class_type: string; inputs: Record<string, unknown> };
type Graph = Record<string, GNode>;

/** A wire-edge resolution: a composed input either carries a literal
 *  value or names [nodeId, outputIndex]. */
function edgeSource(graph: Graph, input: unknown): { node: GNode; id: string; out: number } | null {
  if (Array.isArray(input) && typeof input[0] === "string") {
    const id = input[0] as string;
    const node = graph[id];
    if (node === undefined) return null;
    return { node, id, out: typeof input[1] === "number" ? input[1] : 0 };
  }
  return null;
}

/** The refmod chain a window must carry when the seat is stated:
 *  the creator (Extract for baked media / Loader for pre-baked
 *  stems), the Apply that appends through conditioning, and the
 *  consumption edge — the window's guider must ride the Apply's
 *  output (the model actually HEARS the pack; a mounted-but-unbound
 *  Apply is the "ignored it" burn in graph form). */
function refmodChainOf(graph: Graph): {
  creators: Array<{ id: string; node: GNode }>;
  applies: Array<{ id: string; node: GNode }>;
  guiders: Array<{ id: string; node: GNode }>;
} {
  const creators: Array<{ id: string; node: GNode }> = [];
  const applies: Array<{ id: string; node: GNode }> = [];
  const guiders: Array<{ id: string; node: GNode }> = [];
  for (const [id, node] of Object.entries(graph)) {
    if (node.class_type === EXTRACT_CLASS || node.class_type === LOADER_CLASS) creators.push({ id, node });
    else if (node.class_type === APPLY_CLASS) applies.push({ id, node });
    else if (node.class_type === "BasicGuider") guiders.push({ id, node });
  }
  return { creators, applies, guiders };
}

/** THE COMPOSE DOOR — the same def.compose the run rides (hop 4);
 *  gatedResolve (hop 3's admission) runs inside. */
async function composeH3(doc: Record<string, unknown>): Promise<Graph> {
  const defs = await loadCardDefs();
  const def = defs.get("h3-timeline");
  assert.ok(def, "the composition root serves the h3-timeline card");
  const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });
  const model: ModelFacts | undefined = facts.models["h3"];
  assert.ok(model, "the h3 family facts row serves");
  const g = new GraphBuilder();
  def.compose(def.schema({ ...doc }), model, g, "refmod-value-arms");
  return g.toJSON() as Graph;
}

const SHOT = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  text: "a slow push in", start_frame: 0, end_frame: 56, ...over,
});
const FILM_DOC = {
  calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })],
  length: 124,
};

/** THE DECLARED SOLVER SPAN, DERIVED (no frozen 4/6/30): the carrier
 *  schema's steps default and bounds (the lane's declared law —
 *  schema.ts:141) and the pack catalog's committed row counts (the
 *  marriage's declared inputs — the recipe trio wires ids only;
 *  steps are UNSTATED BY DESIGN, packages/models/h3/src/index.ts:171-183). */
const CARRIER_ENV = (paramSchema as unknown as { toJSON(): unknown }).toJSON() as Parameters<typeof fieldsOfEnvelope>[0];
function declaredStepsField(): { name: string; default: unknown; min: unknown; max: unknown } {
  const fields = fieldsOfEnvelope(CARRIER_ENV, "h3");
  const steps = fields.find((f) => f.name === "steps");
  assert.ok(steps, "the h3 carrier declares a steps field");
  return steps as unknown as { name: string; default: unknown; min: unknown; max: unknown };
}
const CATALOG_MAX_STEPS = Math.max(...H3_LORA_ROWS.map((r) => (typeof r.steps === "number" ? r.steps : 0)));
const RECIPE_ROW = H3_LORA_ROWS.find((r) => r.id === "h3_turbo8_v1");
assert.ok(RECIPE_ROW, "the h3 lora catalog carries the recipe trio's row (h3_turbo8_v1)");

describe("the refmod image reaches the composed graph at its consumer node (ERRORS f; study §2, G1; purge P2 value law)", () => {
  let def: CardDefinition;
  beforeAll(async () => {
    def = (await loadCardDefs()).get("h3-timeline")!;
    void def;
  });

  it("ARM 1 — the call bucket's wire form (the seat the ModsBucket authors): stated image value, consumer class, input name, and the consumption edge, in the stated window (hop 4→5)", async () => {
    // THE OPERATOR'S GESTURE AT THE WIRE: the call row's refs.mods
    // comma string — exactly the shape docCalls.ts:419-431 serializes
    // and the ModsBucket's chips commit (CallCard.tsx:810-812).
    const doc = {
      ...FILM_DOC,
      calls: [
        SHOT({ refs: { mods: REFMOD_IMAGE } }),
        SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 }),
      ],
    };
    const graph = await composeH3(doc);
    // window1 is the stated call's window (the film loop's stanza
    // carries the call's refs — actions.ts:479-482).
    const w1 = Object.fromEntries(Object.entries(graph).filter(([id]) => id.startsWith("window1_"))) as Graph;
    const { creators, applies, guiders } = refmodChainOf(w1);
    // THE CREATOR: class + the DECLARED container input name
    // (refs_image.ref_image_0 — the dotted autogrow the seam states,
    // actions.ts:1530-1531) + THE STATED VALUE resolved to the
    // LoadImage that carries the image verbatim.
    const extract = creators.find((c) => c.node.class_type === EXTRACT_CLASS);
    assert.ok(extract, `the stated refmod composes its creator node (${EXTRACT_CLASS}) in the stated window`);
    const slot = extract.node.inputs["refs_image.ref_image_0"];
    const loadEdge = edgeSource(w1, slot);
    assert.ok(loadEdge, "refs_image.ref_image_0 is a WIRE to the loader node, never a dangling literal");
    assert.equal(loadEdge.node.class_type, "LoadImage", "the media seat's consumer chain starts at the engine's own LoadImage");
    assert.equal(loadEdge.node.inputs["image"], REFMOD_IMAGE,
      `THE VALUE AT THE NODE: LoadImage.image must carry the stated image verbatim (saw ${JSON.stringify(loadEdge.node.inputs["image"])})`);
    // THE APPLY: the pack rides the conditioning (mods edge), never a
    // fourth reference lane.
    const apply = applies.find((a) => {
      const modsEdge = edgeSource(w1, a.node.inputs["mods"]);
      return modsEdge !== null && modsEdge.id === extract.id;
    });
    assert.ok(apply, `${APPLY_CLASS} binds the creator's output through its mods input`);
    // THE CONSUMPTION EDGE: the window's guider rides the Apply's
    // conditioning out — the model's DiT blocks actually receive the
    // pack's tokens. An Apply mounted but unbound is the operator's
    // burn in graph form.
    const fed = guiders.some((g) => {
      const condEdge = edgeSource(w1, g.node.inputs["conditioning"]);
      return condEdge !== null && condEdge.id === apply.id && condEdge.out === 0;
    });
    assert.ok(fed, "the window's conditioning consumer (BasicGuider) resolves to the RefModApply output — the pack is heard, not mounted");
  });

  it("ARM 2 — the run-level declared seat (ref_mods, schema.ts:99 / DECL params / Layer A docModel.ts:339): the image value lands in EVERY window (hop 4→5)", async () => {
    const doc = { ...FILM_DOC, ref_mods: [REFMOD_IMAGE] };
    const graph = await composeH3(doc);
    for (const win of ["window1_", "window2_"]) {
      const scoped = Object.fromEntries(Object.entries(graph).filter(([id]) => id.startsWith(win))) as Graph;
      const { creators, applies, guiders } = refmodChainOf(scoped);
      const extract = creators.find((c) => c.node.class_type === EXTRACT_CLASS);
      assert.ok(extract, `the run-level stated refmod composes its creator in ${win}`);
      const loadEdge = edgeSource(scoped, extract.node.inputs["refs_image.ref_image_0"]);
      assert.ok(loadEdge, `${win} refs_image.ref_image_0 resolves to a wire`);
      assert.equal(loadEdge.node.inputs["image"], REFMOD_IMAGE,
        `${win}: the declared run-level seat's value reaches the consumer input verbatim`);
      const apply = applies.find((a) => {
        const modsEdge = edgeSource(scoped, a.node.inputs["mods"]);
        return modsEdge !== null && modsEdge.id === extract.id;
      });
      assert.ok(apply, `${win}: ${APPLY_CLASS} binds the creator`);
      assert.ok(guiders.some((g) => {
        const condEdge = edgeSource(scoped, g.node.inputs["conditioning"]);
        return condEdge !== null && condEdge.id === apply.id;
      }), `${win}: the guider consumes the Apply's conditioning`);
    }
  });

  it("ARM 3 — the studio's upload currency (a data: chip) rides verbatim to the LoadImage (the any-media law, actions.ts:1450-1461)", async () => {
    const chip = "data:image/png;base64,aGVsbG8=";
    const graph = await composeH3({ ...FILM_DOC, ref_mods: [chip] });
    const w1 = Object.fromEntries(Object.entries(graph).filter(([id]) => id.startsWith("window1_"))) as Graph;
    const { creators } = refmodChainOf(w1);
    const extract = creators.find((c) => c.node.class_type === EXTRACT_CLASS);
    assert.ok(extract, "a stated data: chip composes the creator");
    const loadEdge = edgeSource(w1, extract.node.inputs["refs_image.ref_image_0"]);
    assert.ok(loadEdge, "the data: chip resolves to a wire");
    assert.equal(loadEdge.node.inputs["image"], chip,
      "the upload chip's data URL is the value at the node — the run's staging walk (hop 5→6, uploadReferenced) owns the decode");
  });

  it("ARM 4 — the reuse arm (a pre-baked stem, the engine listing's currency): the stem value lands on the loader's slot and the Apply binds it", async () => {
    const graph = await composeH3({ ...FILM_DOC, ref_mods: [REFMOD_STEM] });
    const w1 = Object.fromEntries(Object.entries(graph).filter(([id]) => id.startsWith("window1_"))) as Graph;
    const { creators, applies } = refmodChainOf(w1);
    const loader = creators.find((c) => c.node.class_type === LOADER_CLASS);
    assert.ok(loader, "a stated .safetensors stem composes MiniMaxH3RefModsLoader (the reuse arm, never the only door)");
    assert.equal(loader.node.inputs["mod_1"], REFMOD_STEM.slice(0, -".safetensors".length),
      "THE VALUE AT THE NODE: loader.mod_1 carries the stated stem (classified, suffix-stripped)");
    const apply = applies.find((a) => {
      const modsEdge = edgeSource(w1, a.node.inputs["mods"]);
      return modsEdge !== null && modsEdge.id === loader.id;
    });
    assert.ok(apply, "the Apply binds the loader's pack");
  });

  it("ARM 5 — the override canon, witnessed both sides: a stated call lane REPLACES the declared lane (the display tail's word and the graph agree)", async () => {
    // The canon (actions.ts:1424-1426 + the ModsBucket's override
    // face): a stated call lane rides INSTEAD of the declared lane.
    // The wall judges the CONSEQUENCE the display promises: the
    // declared image's chain must not mount beside the call's.
    const doc = {
      ...FILM_DOC,
      ref_mods: [REFMOD_IMAGE_B],
      calls: [
        SHOT({ refs: { mods: REFMOD_IMAGE } }),
        SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 }),
      ],
    };
    const graph = await composeH3(doc);
    const w1 = Object.fromEntries(Object.entries(graph).filter(([id]) => id.startsWith("window1_"))) as Graph;
    const { creators } = refmodChainOf(w1);
    const images = creators
      .filter((c) => c.node.class_type === EXTRACT_CLASS)
      .map((c) => edgeSource(w1, c.node.inputs["refs_image.ref_image_0"]))
      .filter((e) => e !== null)
      .map((e) => e.node.inputs["image"]);
    assert.deepEqual(images, [REFMOD_IMAGE],
      "the stated call lane replaces the declared lane — exactly one visual pack chain, the call's own value");
  });

  it("ARM 6 — the cap refuses LOUD, never truncates (the seat's own door voices; cap derived from REF_CAPS)", async () => {
    const over = Array.from({ length: REF_CAPS.refmods + 1 }, (_, i) => `refs/refmod_${i}.png`);
    // TWO declared voices cover the seat: the carrier walk's own
    // bound ($.ref_mods expected array length <= 8 — the served
    // schema's max, the gate the run door walks first) and the
    // action's hand check (actions.ts:1433-1435, "exceeds the
    // loader's N slots"). Either firing is the seat's honest LOUD
    // face; NEITHER firing — a truncated tail composing — is the
    // silent-drop class this arm exists to kill.
    await assert.rejects(
      () => composeH3({ ...FILM_DOC, ref_mods: over }),
      (err: unknown) => err instanceof Error && /ref_mods/.test(err.message),
      "an over-cap seat refuses named at the compose gate (hop 3), never silently drops the tail",
    );
  });
});

describe("the steps honesty wall (ERRORS d — the ~100 sampling-steps burn; purge P2/SD-2: the graph carries the lane's declared solver span)", () => {
  /** Every composed window's BasicScheduler.steps (the node that
   *  feeds SamplerCustomAdvanced's sigmas — actions.ts:1586-1591). */
  async function stepsAtWindows(doc: Record<string, unknown>): Promise<Array<{ id: string; steps: unknown }>> {
    const graph = await composeH3(doc);
    return Object.entries(graph)
      .filter(([, n]) => n.class_type === "BasicScheduler")
      .map(([id, n]) => ({ id, steps: n.inputs["steps"] }));
  }

  it("ARM 7 — a stated refmod alone composes at the DECLARED default (derived from the carrier's own projection, not a frozen 6), at EVERY window", async () => {
    const stepsField = declaredStepsField();
    assert.equal(stepsField.default, 6,
      "the carrier's projected steps default is the lane's declared default — a change re-pins here deliberately (schema.ts:141)");
    const rows = await stepsAtWindows({ ...FILM_DOC, ref_mods: [REFMOD_IMAGE] });
    assert.ok(rows.length >= 2, "the film doc composes per-window schedulers");
    for (const r of rows) {
      assert.equal(r.steps, stepsField.default,
        `${r.id}: with the seat stated and no bag riding, the sampler's steps must be the lane's DECLARED default ${String(stepsField.default)} (the operator saw ~100 here)`);
    }
  });

  it("ARM 8 — the declared recipe marriage: the bag resolves its catalog row's own count (derived from mods/loras.ts + the DECL's Recipe wire_defaults) at EVERY window", async () => {
    // The DECL's Recipe rows wire ids ONLY ("STEPS IS UNSTATED BY
    // DESIGN", index.ts:171-183); the marriage law resolves the row's
    // declared count. This arm composes the RESOLVED form the run
    // door's flavor resolution emits (service.ts:898-948) — the same
    // seat the marriage reads (actions.ts:2246-2260).
    const bag = [{ name: RECIPE_ROW.filename, strength: RECIPE_ROW.default_strength ?? 1, steps: RECIPE_ROW.steps }];
    const rows = await stepsAtWindows({ ...FILM_DOC, ref_mods: [REFMOD_IMAGE], loras: bag });
    for (const r of rows) {
      assert.equal(r.steps, RECIPE_ROW.steps,
        `${r.id}: the declared marriage tops at the row's own count ${String(RECIPE_ROW.steps)} — the lane's declared solver span`);
    }
  });

  it("ARM 9 — the FILM face refuses an out-of-span stated count LOUD: the per-window re-walk sits after the marriage and catches it (the lane's honest face)", async () => {
    // The film loop's honest asymmetry: the stanza marriage
    // (actions.ts:465) lands the stated count, and the per-window
    // carrier re-walk (assertOverlayGated, actions.ts:146-158, call
    // site :556) sits AFTER it — the count that the run door's
    // resolution passed through (the served entry bound
    // packs.ts:34 min(1).max(100); the default recipe row declares
    // NO steps domain, so service.ts:936-946's row-domain guard
    // binds nothing) refuses HERE, naming the bound. The single-call
    // lift has NO walk after ITS marriage — ARM 10 is that face.
    const rogue = [{ name: RECIPE_ROW.filename, strength: 1, steps: 100 }];
    await assert.rejects(
      () => composeH3({ ...FILM_DOC, ref_mods: [REFMOD_IMAGE], loras: rogue }),
      (err: unknown) => err instanceof Error && /steps expected number <= 30/.test(err.message),
      "the film path's window re-walk refuses the married out-of-bound count named (the honest face)",
    );
  });

  it("ARM 10 — the single-window face refuses the out-of-span stated count LOUD: the post-marriage re-walk catches what the card's pre-marriage walk never saw (the G6 TOCTOU's cure)", async () => {
    // THE PRE-REGISTERED RED, NOW CURED. The single-call lift re-walks
    // the doc ONCE at card.ts:293, THEN the marriage
    // (actions.ts:2246-2260) mutates steps — and nothing re-walked:
    // renderH3Window composed the mutated value (the film loop's :556
    // re-walk was the arm the single-window face never grew). The
    // estate's own faces let the count in: the served entry bound is
    // min(1).max(100) (packs.ts:34) and the default recipe row
    // declares no steps domain (service.ts:936-946 binds only
    // domain-declaring rows). The red's verbatim: the graph carried
    // 100 against the DECL's own bound [1,30] (schema.ts:141) — the
    // operator's ~100 on a one-image refmod run, reproduced from a
    // stated bag row. The cure grows the film loop's post-marriage
    // re-walk on the single-window face (the SAME assertOverlayGated,
    // one schema, one voice); toggled out, this arm reds on the
    // un-refused compose.
    const rogue = [{ name: RECIPE_ROW.filename, strength: 1, steps: 100 }];
    await assert.rejects(
      () => stepsAtWindows({ calls: [SHOT()], length: 56, ref_mods: [REFMOD_IMAGE], loras: rogue }),
      (err: unknown) => err instanceof Error && /steps expected number <= 30/.test(err.message),
      "the single-window face's post-marriage re-walk refuses the married out-of-bound count named (the film loop's honest arm, grown)",
    );
  });

  it("ARM 11 — the DECLARED-marriage ceiling, derived: no committed catalog row's count exceeds the span the recipes wire (the lane's honest top)", async () => {
    // The depth pin: the DECL's marriage declaration ("marries:
    // steps: max", index.ts:96) over the COMMITTED catalog tops at
    // the derived max — the arm pins the ceiling so a future row's
    // count moving the lane's span lands as a deliberate re-pin here.
    assert.ok(CATALOG_MAX_STEPS > 0 && CATALOG_MAX_STEPS <= 8,
      `the committed catalog's married span tops at ${String(CATALOG_MAX_STEPS)} — the lane's declared ceiling; a row that raises it re-pins this arm deliberately (the catalog is the one owner, mods/loras.ts)`);
  });

  it("ARM 12 — every committed distill row declares its step DOMAIN: the leaf's dial bounds itself to the row's own span, so a foreign count refuses at EDIT — never at the run door (the operator's prevalidation law)", async () => {    // ERRORS d remainder + the operator's own demand (ERRORS g: "we
    // spend a week building the system so this would be pre-validated
    // and show reds before we ever got into the app"). The bag leaf's
    // steps entry dials the generic envelope 1..100 (packs.ts:34)
    // whenever the row declares no domain — a typed 100 passed the
    // edit, rode the marriage, and died at the re-walk AFTER the run
    // press (ARMs 9/10: honest, but post-hoc). discovery.ts:586-599
    // already serves steps_min/steps_max per row and the leaf
    // self-bounds to them ("RANGE FACTS: the leaf's dial bounds
    // itself to them") — the ONE owner is the catalog: every distill
    // row declares its domain, the fixed point when the adapter has
    // a single designed count.
    for (const row of H3_LORA_ROWS) {
      if (row.steps === undefined) continue
      assert.ok(typeof row.steps_min === "number" && typeof row.steps_max === "number",
        `${row.id}: declares its step domain (steps_min/steps_max) — a singular adapter declares its fixed point; an unbounded row dials the generic 1..100 envelope and the foreign count only dies at the run door`);
      assert.ok(row.steps_min >= 1 && row.steps_max <= 30,
        `${row.id}: domain [${String(row.steps_min)},${String(row.steps_max)}] sits inside the lane's declared solver ceiling (schema.ts:141 max 30)`);
      assert.ok(row.steps_min <= row.steps && row.steps <= row.steps_max,
        `${row.id}: the married default ${String(row.steps)} sits inside the row's own domain`);
    }
  });
});

describe("the bake is STATED, never a silent engine default (study §5; the purge P2 law at the bake's own nodes — ERRORS f's dials)", () => {
  /** The composed graph's MiniMaxH3RefModExtract nodes (the bakes) —
   *  one PER WINDOW on the film face (the dispatcher composes each
   *  stanza through the render: the N×bake cost the study §5 named —
   *  every window's bake is judged, never just the first). */
  function extractsOf(graph: Graph): GNode[] {
    const rows = Object.values(graph).filter((n) => n.class_type === EXTRACT_CLASS);
    assert.ok(rows.length >= 1, "the composed graph carries the bake (the Extract)");
    return rows;
  }

  it("ARM 13 — the bake's fidelity knobs are STATED at the node with the DECL's declared values: mode, pool, refinement steps, save ride the inputs — absent inputs are the silent-default class the operator burned", async () => {
    // The study's §5 table: the engine executed identity 500, pool
    // 16×16, mode 'Compressed Reference' while the compose stated
    // NONE of them — the dials did not exist on this lane and the
    // bake's cost/fidelity read as engine weather. The DECL now
    // declares the knobs (schema.ts, the refmod group) with today's
    // values as the DECLARED defaults (zero behavior change — the
    // same bake, stated), and the compose rides them onto the node
    // (purge P2: every value present AND named at the node the DECL
    // says consumes it).
    const graph = await composeH3({ ...FILM_DOC, ref_mods: [REFMOD_IMAGE] });
    const bakes = extractsOf(graph);
    for (const bake of bakes) {
      assert.equal(bake.inputs["mode"], "Compressed Reference", "the bake mode is stated (the pooled default, declared)");
      assert.equal(bake.inputs["identity"], 500, "the refinement steps are stated (the engine's former silent default — THE time dial)");
      assert.equal(bake.inputs["pool_h"], 16, "the pool grid's height is stated (16 = 64 tokens/frame, the former silent default)");
      assert.equal(bake.inputs["pool_w"], 16, "the pool grid's width is stated");
      assert.equal(bake.inputs["save"], true, "the every-run pack re-write is stated (the disk cost the operator never saw)");
    }
  });

  it("ARM 14 — the bake dials are the operator's word: a stated pool/refinement/mode rides the node VERBATIM (the run voice carries the price)", async () => {
    // The dials exist to be moved: identity 0 (pooling alone — the
    // fast face), pool 32 (256 tokens), Full Reference (the
    // identity-critical mode upstream always had and the lane never
    // offered). Whatever is stated lands at the node verbatim.
    const graph = await composeH3({
      ...FILM_DOC,
      ref_mods: [REFMOD_IMAGE],
      refmod_mode: "Full Reference",
      refmod_pool: 32,
      refmod_identity: 0,
      refmod_save: false,
    });
    for (const bake of extractsOf(graph)) {
      assert.equal(bake.inputs["mode"], "Full Reference", "the stated mode rides verbatim (the identity-critical mode, finally offered)");
      assert.equal(bake.inputs["pool_h"], 32, "the stated pool rides verbatim");
      assert.equal(bake.inputs["pool_w"], 32, "the stated pool rides verbatim (both edges)");
      assert.equal(bake.inputs["identity"], 0, "the stated refinement steps ride verbatim (0 = pooling alone, the fast face)");
      assert.equal(bake.inputs["save"], false, "the stated save rides verbatim (bake, inject, discard)");
    }
  });
});

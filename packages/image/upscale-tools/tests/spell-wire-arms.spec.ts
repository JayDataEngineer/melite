// @contract models-seedvr2-hop-spell-wire
//
// THE SEEDVR2 HOP SPELL-WIRE ARMS (2026-11-01, the upscale hop burn —
// "the bench upscale hop (never doubles)"). The polish stage's input_image
// reaches SeedVR2VideoUpscaler.image under three wire grammars, and the
// burn was that the COMPOSED graph stated none of them as a link: the
// card's spell branch rides "$image" into the tensor slot verbatim (a
// string, never a link — the link only forms inside planMerge), the
// declared-initial grammar's `__initial__.` refs are skipped by planMerge
// passes 2/3 so NO link can ever form (rewriteSpells falls to the initials
// plane and substitutes the request initial's string VALUE into the tensor
// slot — the engine's io.Image socket refuses it), and the literal-path
// grammar rides a LoadImage disk handoff. The h3 spell-wire precedent's
// gap note applies verbatim: the merge half was walled
// (comfyui-merge.spec.ts ROW-4, bench-wire-chain, wire-order); the CARD
// half — the seat actually carrying the input into the upscaler's tensor
// slot — was judged by nothing, and the burn rendered the plain
// 1344×768 pass at the FHD rail (run-e2a18484c313: make 1024×1024 →
// polish 1080×1080, the upscaler ran via spell+merge but no run ever
// doubled the operator's 1344×768 class).
//
// THE F44 INTERPLAY: F44's route-master gate (h3 schema.ts, the
// run-d96317409da9 burn) refused the sibling failure class — a stated
// latent_2x sub-gate beside an absent second-pass master composes into NO
// node and the film renders the plain 1344×768 pass. This hop carries no
// route pair at all (the upscale is unconditional — resolution is the
// TARGET short side, card.ts principles), so the inert-knob shape cannot
// occur here; ARM F pins that surface truth, and H2 pins the positive
// half F44's burn lacked: the link LANDS at the real merge door.
//
// DEPTH: the real composition root (loadCardDefs → def.schema →
// def.compose over a real GraphBuilder) and the REAL merge planner
// (planMerge) over a producer row in the IMAGE_UPSCALE flow's shape —
// never a hand-built fixture for the seat under test.
import "../../../../tests/helpers/boot-models.ts";
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import { upscale } from "@melite/models-seedvr2-ema";
import {
  getModel, registryIds, registryModel,
} from "../../../engines/comfyui-cordis/src/models/models.ts";
import { planMerge } from "../../../engines/comfyui-cordis/src/comfyui-merge.ts";
import type { MergeRow } from "../../../engines/comfyui-cordis/src/comfyui-merge.ts";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });
const model = facts.models["seedvr2-ema"]!;

let def: CardDefinition;
beforeAll(async () => {
  def = (await loadCardDefs()).get("upscale-tools")!;
  assert.ok(def, "the composition root serves the upscale-tools card");
});

type WfNode = { class_type: string; inputs: Record<string, unknown> };
type Wf = Record<string, WfNode>;

/** The card's compose through the REAL root: schema gate → compose →
 *  the serialized graph the run door would carry. */
const composePolish = (params: Record<string, unknown>): Wf => {
  const doc = def.schema(params) as Record<string, unknown>;
  const g = new GraphBuilder();
  def.compose(doc, model, g, "hop_arm");
  return g.toJSON() as Wf;
};

const upscaler = (wf: Wf): WfNode => {
  const n = Object.values(wf).find((n) => n.class_type === "SeedVR2VideoUpscaler");
  assert.ok(n, "the composed graph carries the SeedVR2VideoUpscaler");
  return n;
};

/** A producer row in the IMAGE_UPSCALE flow's make-stage shape: one
 *  Save* publishing the declared `image` channel (inferProducers'
 *  single-save arm binds every declared channel). */
const makeRow = (): MergeRow =>
  ({
    stageId: "make",
    card: undefined,
    workflow: {
      save: { class_type: "SaveImage", inputs: {} },
    } as unknown as MergeRow["workflow"],
    outputs: { image: "image" },
    outputNodes: {},
    params: {},
  }) as unknown as MergeRow;

const polishRow = (wf: Wf): MergeRow =>
  ({
    stageId: "polish",
    card: "upscale-tools",
    workflow: wf as unknown as MergeRow["workflow"],
    outputs: {},
    outputNodes: {},
    params: {},
  }) as unknown as MergeRow;

describe("the seedvr2 hop states its input (the three wire grammars, both faces)", () => {
  it("ARM H1 — the spell rides the upscaler's tensor seat verbatim at compose, never a LoadImage (the '$image' grammar, compose face)", () => {
    const wf = composePolish({ input_image: "$image" });
    assert.strictEqual(
      upscaler(wf).inputs["image"],
      "$image",
      "SEEDVR2 HOP SPELL-WIRE ARM: the card did not state the wired input's spell on the upscaler's tensor seat — " +
      "the composed graph carries no statement of the input, so the hop's link is unstated before the merge ever runs",
    );
    assert.ok(
      !Object.values(wf).some((n) => n.class_type === "LoadImage"),
      "SEEDVR2 HOP SPELL-WIRE ARM: the spell grammar built a LoadImage — a spelled input names a WIRED STAGE INPUT, never a file",
    );
  });

  it("ARM H2 — the spelled seat RESOLVES at the merge: the make stage's link lands in the upscaler's image (the hop's real door, end to end)", () => {
    const wf = composePolish({ input_image: "$image" });
    const plan = planMerge(
      [makeRow(), polishRow(wf)],
      {},
      // the real inputNames shape runsStart compiles for a FromStage wire
      { polish: { image: "make.image" } },
    );
    assert.deepEqual(
      upscaler(plan.workflow as unknown as Wf).inputs["image"],
      ["__unload$0", 0],
      "SEEDVR2 HOP SPELL-WIRE ARM: the merge did not land the make stage's wire (boundary-mediated) in the upscaler's image seat — " +
      "the upstream stage's image never reaches the seedvr2 node's input as a stated link (the never-doubles burn)",
    );
    assert.deepEqual(
      (plan.workflow["__unload$0"] as WfNode | undefined)?.inputs["through"],
      ["make::save", 0],
      "SEEDVR2 HOP SPELL-WIRE ARM: the pass-seam boundary's through lost the make stage's producer link",
    );
  });

  it("ARM H3 — the declared-initial grammar never forms a link: the initial's string substitutes into the tensor slot (pinned dead shape)", () => {
    // The compose face is IDENTICAL to H1 — the card cannot see bindings;
    // its one honest statement of a wired input is the spell on the seat.
    const wf = composePolish({ input_image: "$image" });
    assert.strictEqual(
      upscaler(wf).inputs["image"],
      "$image",
      "SEEDVR2 HOP SPELL-WIRE ARM: the initial grammar's compose face lost the spell seat",
    );
    const plan = planMerge(
      [polishRow(wf)],
      { image: "/data/input/anchor.png" },
      // the real inputNames shape for a declared initial binding
      { polish: { image: "__initial__.image" } },
    );
    const seat = upscaler(plan.workflow as unknown as Wf).inputs["image"];
    assert.strictEqual(
      seat,
      "/data/input/anchor.png",
      "SEEDVR2 HOP DEAD-GRAMMAR PIN: the merged seat changed — the declared-initial substitute is a string VALUE in a tensor slot, " +
      "never a link (the engine's io.Image socket refuses it). If this reds, the merge plane's initial handling moved: " +
      "re-judge the grammar (an initial-bound tensor wire needs the loader plane or an admission refusal — an owed estate-side cure)",
    );
    assert.ok(
      !Array.isArray(seat) && !("__unload$0" in plan.workflow),
      "SEEDVR2 HOP DEAD-GRAMMAR PIN: the initial grammar minted a link — a request initial has no producer; re-judge the arms",
    );
  });

  it("ARM H4 — a path keeps the LoadImage disk handoff, stated as a real link at compose and namespaced at the merge (the path grammar)", () => {
    const dir = mkdtempSync(join(tmpdir(), "hop-arm-path-"));
    mkdirSync(dir, { recursive: true });
    const pic = join(dir, "anchor.png");
    writeFileSync(pic, "png");
    const wf = composePolish({ input_image: pic });
    assert.deepEqual(
      upscaler(wf).inputs["image"],
      ["LoadImage.0", 0],
      "SEEDVR2 HOP SPELL-WIRE ARM: the path grammar did not state the loader link into the upscaler's tensor seat",
    );
    const loader = Object.values(wf).find((n) => n.class_type === "LoadImage");
    assert.ok(loader, "SEEDVR2 HOP SPELL-WIRE ARM: the path grammar built no loader — the disk handoff is gone");
    assert.strictEqual(
      loader!.inputs["image"],
      pic,
      "SEEDVR2 HOP SPELL-WIRE ARM: the loader lost the stated path (the disk handoff's value)",
    );
    // the loader link survives the merge under the polish namespace
    const plan = planMerge([polishRow(wf)], {}, {});
    const nsKey = Object.keys(plan.workflow).find(
      (k) => (plan.workflow[k] as WfNode).class_type === "LoadImage",
    );
    assert.ok(nsKey, "the merged graph keeps the loader");
    assert.deepEqual(
      upscaler(plan.workflow as unknown as Wf).inputs["image"],
      [nsKey, 0],
      "SEEDVR2 HOP SPELL-WIRE ARM: the merge re-keyed the loader link away from the upscaler's tensor seat",
    );
  });

  it("ARM F — the F44 interplay: the hop carries no route pair (the upscale is unconditional), so the inert-sub-gate burn shape cannot occur", () => {
    // F44's burn (run-d96317409da9): a stated latent_2x sub-gate beside an
    // absent second-pass master composed into NO node — the plain pass
    // rendered. This hop states no route keys at all; the one declared
    // input channel is input_image, and the seat is judged by H1–H4.
    const paramKeys = upscale.params.map((p) => p.name);
    for (const f44 of ["upscale_route", "second_pass_enabled", "latent_2x"]) {
      assert.ok(
        !paramKeys.includes(f44),
        `SEEDVR2 HOP F44 INTERPLAY ARM: the hop declares "${f44}" — a route pair on an unconditional upscale is the inert-knob shape F44 refuses; state the route law or drop the key`,
      );
    }
    const doc = def.schema({ input_image: "$image" }) as Record<string, unknown>;
    assert.ok(
      !("upscale_route" in doc),
      "SEEDVR2 HOP F44 INTERPLAY ARM: the gated doc grew an upscale_route — the route-master gate is the h3 chain-route's law, not this hop's",
    );
    assert.ok(
      paramKeys.includes("input_image"),
      "SEEDVR2 HOP F44 INTERPLAY ARM: the action lost its declared input_image param — the hop's one input channel is unstated at the DECL",
    );
  });
});

// cards-h3-quant-run-plane.spec.ts — THE RUN-PLANE READ HALF of the
// axis-vocabulary law (ROADMAP §"THE GATE-11 SWEEP CURES", the OWED
// increment on cards-h3-layera-axis-vocabulary, 2026-11-04 → walled
// 2026-11-28). Registry row: cards-h3-quant-run-plane.
//
// THE WRITE PLANE was cured first (cards-h3-layera-axis-vocabulary):
// a Quant pick survives serializeLayerA into the saved doc. The row
// that cured it named the next hop honestly — "the quant stamp now
// PERSISTS but does not STEER — no compose consumer reads p.quant".
// The steering landed since, by construction and without a judge:
// the stamp never rides the card's params (liftCardParams consumes
// variant/quant at selection); it steers one hop UPSTREAM, through
// the compose ADDRESS — selectCardVariant resolves the (variant ×
// quant) cell, the cell's ROUTE wins the prepared modelId
// (cardsCompose), the models service folds the cell's lane_inputs
// into that address's row (THE CELL-LANE CASCADE, read half), and
// the h3 film action loads facts.unet into UNETLoader. Four seats,
// zero walls between them: every quant wall judged DECL projections
// against each other (pool-parity, facts-sync, encoding-truth) and
// the dead-card wall composed every route address but read node
// CLASSES, never the loader's file. A break at any seat composes the
// hybrid weights under a ConvRot pick with every wall green — the
// exact class the encoding-truth burn named ("INT8 != INT8 CONVROT
// != INT8 CONVROT PRUNED — the system needs ALL THREE").
//
// THE JOURNEY THIS WALL RIDES (the canon's fifth axis): the saved
// doc's quant → the estate's prepareCardParams (the real selection
// + overlay door) → the prepared modelId → the booted facts row at
// that address → the card's own compose → the serialized graph's
// UNETLoader.unet_name. The roster is the DECL's own cells (derived,
// never a frozen literal); the expected filename is each cell's own
// lane_inputs.unet.
//
// THE TOGGLE PROOF (receipt: receipts/2026-11-28-cards-h3-quant-run-plane.md):
// (T1) cardsCompose's modelId ignores sel.cellRoute → the ConvRot
// cells prepare the family head's address → THE STATED QUANT arm
// reds naming the address; (T2) the models service drops the cell's
// lane_inputs from the cascade → the address stays right and the same
// arm reds on the FILENAME (the hybrid weights under a ConvRot pick);
// (T3) selectCardVariant drops the stated quant (the stamp persists,
// the door ignores it — the row's own burn) → the stated-quant arm,
// the unknown-quant refusal, and the write→run edge all red.
//
// A FINDING NAMED, not cured here: the h3 card's `admits` entry
// 'quant' is dead surface — the write door judges liftCardParams'
// view, which consumes the R1 contract keys (variant/quant) before
// the judge runs; the quant coordinate's gate at the write door is
// selectCardVariant's resolveCellRow (the refusal arm above), never
// the admits list (the 2026-10-16 `recipe` class, card.ts's own note).
//
// Run: npx vitest run tests/walls/ts/suites/cards-h3-quant-run-plane.spec.ts
// @contract cards-h3-quant-run-plane
// THE HERMETIC ENGINE FIRST (the boot-models first-import law, mock
// law 1 in tests/helpers/hermetic-engine.ts): prime() fetches the
// engine's /object_info — the mock must register before the barrel's
// first evaluation or the live socket answers.
import "../../../helpers/hermetic-engine.ts";
import "../../../../tests/helpers/boot-models.ts";
import { afterAll, beforeAll, describe, it, onTestFinished } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { owningAtom, registryModel } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import { CardRegistryService } from "../../../../packages/harness/estate-queue/src/cardsRegistry.ts";
import { prepareCardParams } from "../../../../packages/harness/estate-queue/src/cardsCompose.ts";
import { assertHermeticRode } from "../../../helpers/hermetic-engine.ts";
import { installLaneStoreOverlay, restoreLaneStoreOverlay } from "../../../helpers/lane-store-overlay.ts";
import { LAWFUL_TEXT } from "../../../../packages/video/h3-timeline/tests/lawfulText.ts";
// THE WRITE DOOR (the liveness wall's presence-at-door boot): the
// storage + domain + drafts plugins over the bench remote.
import Storage from "@deepseek-ai/dsh-storage";
import {
  apply as jsonApply, Config as JsonConfig, inject as jsonInject, name as jsonName,
} from "@deepseek-ai/dsh-storage-json";
import {
  apply as domainApply, Config as DomainConfig, inject as domainInject, name as domainName,
} from "@deepseek-ai/dsh-storage-domain";
import { remoteErrorOf } from "@deepseek-ai/dsh-typert-protocol";
import draftsPlugin from "@melite/estate-drafts";
import type { Plugin } from "@deepseek-ai/cordis";
import type {} from "../../../../packages/harness/estate-queue/src/service.ts";

/** The family head the h3-timeline card boards (the card id IS the
 *  timeline variant's own route — the first-declared cell's address;
 *  the registry's ATOM behind it is resolved through owningAtom, never
 *  spelled — the 2026-09-22 survivor-id correction moved it to 'h3'). */
const FAMILY = "h3-timeline";
/** The variant whose three cells carry three different unets. */
const VARIANT = "timeline";

/** One DECL cell as this wall reads it: the coordinate, the route
 *  the address resolves to, and the file the run plane must load. */
interface DeclCell {
  readonly quant: string;
  readonly route: string;
  readonly unet: string;
}

/** The DECL's own cell roster for the timeline variant — the truth
 *  the run plane mirrors. Derived off the registry, never a frozen
 *  literal: a cell the DECL adds joins the sweep by construction. */
function declCells(): DeclCell[] {
  const decl = registryModel(owningAtom(FAMILY)) as {
    variants?: Array<{
      id: string;
      cells?: Array<{ quant: string; route?: string; lane_inputs?: { unet?: string } }>;
    }>;
  };
  const variant = decl.variants?.find((v) => v.id === VARIANT);
  assert.ok(variant, `the ${FAMILY} family declares the ${VARIANT} variant`);
  return (variant.cells ?? []).map((c) => ({
    quant: c.quant,
    route: c.route ?? "",
    unet: c.lane_inputs?.unet ?? "",
  }));
}

type GraphNode = { class_type?: string; inputs?: Record<string, unknown> };
type Graph = Record<string, GraphNode>;

/** Every UNETLoader filename a serialized graph wires — the run
 *  plane's own verdict (an empty list composes no weights at all). */
function unetNames(graph: Graph): string[] {
  const names: string[] = [];
  for (const node of Object.values(graph)) {
    if (node.class_type !== "UNETLoader") continue;
    names.push(String(node.inputs?.["unet_name"]));
  }
  return names;
}

/** THE JOURNEY, one walk: the saved doc's quant through the estate's
 *  real prepare door, then the card's own compose against the row the
 * prepared address resolves to. Returns the address the door chose
 *  and the loader filenames the graph carries. */
/** The card definition's compose face (what loadCardDefs serves). */
type CardDef = {
  schema: (doc: unknown) => unknown;
  compose: (doc: unknown, model: unknown, g: GraphBuilder, seat: string) => void;
};

function composeThroughTheDoor(
  svc: CardRegistryService,
  defs: ReadonlyMap<string, CardDef>,
  body: Record<string, unknown>,
): { modelId: string; unets: string[] } {
  const prep = prepareCardParams(svc, { model: FAMILY, variant: VARIANT, ...body }, FAMILY, "admission");
  const facts = svc.modelFacts() as Record<string, unknown>;
  const row = facts[prep.modelId];
  assert.ok(row, `the booted facts serve the prepared address '${prep.modelId}'`);
  const def = defs.get(prep.card);
  assert.ok(def, `the card defs serve '${prep.card}' (the prepared row's own card)`);
  const g = new GraphBuilder();
  def.compose(def.schema({ ...prep.params }), row, g, "quant-run-plane");
  return { modelId: prep.modelId, unets: unetNames(g.toJSON() as Graph) };
}

/** A composing fresh film doc (the card spec's own SHOT shape). */
function shot(): Record<string, unknown> {
  return { calls: [{ text: LAWFUL_TEXT, start_frame: 0, end_frame: 56 }] };
}

describe("cards-h3-quant-run-plane — the quant stamp steers the loader through the compose address", () => {
  let svc: CardRegistryService;
  let defs: Awaited<ReturnType<typeof loadCardDefs>>;

  beforeAll(async () => {
    const ctx = new Context();
    // the dangling sweep reads the queue seat's manifest — a bare
    // Context makes the sweep vacuous (the liveness wall's precedent)
    (ctx as unknown as { queue: unknown }).queue = {
      stateRoot: mkdtempSync(join(tmpdir(), "quant-run-plane-")),
      stateRoots: [] as string[],
    };
    svc = new CardRegistryService(ctx);
    await svc.prime();
    assertHermeticRode();
    defs = await loadCardDefs();
    // THE HERMETIC STORE: this wall's subject is the ADDRESS→FILE
    // fold, never the machine's download state — seed the declared
    // rows so the presence gate judges the law on every machine.
    installLaneStoreOverlay();
  }, 120_000);
  afterAll(() => restoreLaneStoreOverlay());

  it("THE ROSTER IS THE DECL'S: every timeline cell names its own unet, and the files are pairwise distinct", () => {
    const cells = declCells();
    assert.ok(cells.length >= 2,
      `the ${VARIANT} variant serves ${cells.length} cells — one cell is a roster the steering cannot be observed on`);
    for (const c of cells) {
      assert.ok(c.unet !== "", `cell ${c.quant} declares no lane_inputs.unet — the run plane has no file to steer to`);
      assert.ok(c.route !== "", `cell ${c.quant} declares no route — the address cannot carry its coordinate to the compose`);
    }
    const files = new Set(cells.map((c) => c.unet));
    assert.equal(files.size, cells.length,
      `the cells' unets are not pairwise distinct: ${cells.map((c) => `${c.quant}→${c.unet}`).join(", ")} — a quant that loads its sibling's file is the encoding-truth burn`);
  });

  it("THE STATED QUANT STEERS THE LOADER: each cell's doc composes the UNETLoader with that cell's own file, through the real door", () => {
    const cells = declCells();
    const mismatches: string[] = [];
    for (const cell of cells) {
      const { modelId, unets } = composeThroughTheDoor(svc, defs, { quant: cell.quant, ...shot() });
      if (modelId !== cell.route) {
        mismatches.push(`${cell.quant}: the door prepared address '${modelId}', the cell's route is '${cell.route}'`);
        continue;
      }
      if (unets.length === 0) {
        mismatches.push(`${cell.quant}: the composed graph carries no UNETLoader`);
        continue;
      }
      for (const name of unets) {
        if (name !== cell.unet) {
          mismatches.push(`${cell.quant}: UNETLoader unet_name '${name}', the cell declares '${cell.unet}'`);
        }
      }
    }
    assert.deepEqual(mismatches, [],
      `the quant stamp does not steer the run plane — a pick composes another cell's weights:\n  ${mismatches.join("\n  ")}`);
  });

  it("THE UNSTATED QUANT IS THE ADDRESS'S OWN CELL: a doc naming the family without a quant loads the cell routed to the family head", () => {
    const cells = declCells();
    const head = cells.find((c) => c.route === FAMILY);
    assert.ok(head, `no cell routes to the family head '${FAMILY}' — the unstated pick has no lawful default`);
    const { modelId, unets } = composeThroughTheDoor(svc, defs, shot());
    assert.equal(modelId, FAMILY, "the unstated doc composes under the family head's own address");
    assert.deepEqual(unets, [head.unet],
      `the unstated quant must load the head cell's file '${head.unet}' — a neighbor cell's weights under an unstated doc is the silent-default burn`);
  });

  it("AN UNKNOWN QUANT REFUSES AT THE DOOR — never a neighbor cell's weights in silence", () => {
    const cells = declCells();
    const ghost = "bf16_ghost_wall";
    assert.ok(!cells.some((c) => c.quant === ghost), "the ghost coordinate must be outside the roster");
    assert.throws(
      () => composeThroughTheDoor(svc, defs, { quant: ghost, ...shot() }),
      (e: unknown) => e instanceof Error && /quant/.test(e.message) && /ghost|unknown|no quant/i.test(e.message),
      "the refusal must speak the quant coordinate in its voice",
    );
  });
});

/** The stored stage row's params as the drafts door saved them. */
function stageParamsOf(doc: unknown, stageId: string): Record<string, unknown> {
  const stages = (doc as { stages?: unknown }).stages;
  assert.ok(Array.isArray(stages), "the served doc carries a stage list");
  const row = (stages as Array<Record<string, unknown>>).find((s) => s["id"] === stageId);
  assert.ok(row !== undefined, "the served doc carries the written stage");
  const params = row["params"];
  return params !== null && typeof params === "object" && !Array.isArray(params)
    ? params as Record<string, unknown>
    : {};
}

describe("cards-h3-quant-run-plane — the write→run edge: the pick lands at the drafts/patch door and the STORED row composes its cell", () => {
  const sig: AbortSignal = new AbortController().signal;

  it("THE SAVED DOC'S QUANT STEERS THE LOADER: a quant patched through the real write door lands in the row, and the row's own params compose that cell's file", async () => {
    const root = mkdtempSync(join(tmpdir(), "quant-run-plane-write-"));
    onTestFinished(() => rmSync(root, { recursive: true, force: true }));
    const ctx = new Context();
    // THE REAL REGISTRY (the drafts wall's every-boot law): the door's
    // legal key set is the card DECL — served by the same service the
    // estate composes with. The queue seat is stubbed for the dangling
    // sweep (the first describe's precedent).
    const rctx = new Context();
    (rctx as unknown as { queue: unknown }).queue = { stateRoot: root, stateRoots: [] as string[] };
    const registry = new CardRegistryService(rctx);
    await registry.prime();
    ctx.provide("cardRegistry", registry);
    await ctx.plugin(Storage as unknown as Plugin);
    await ctx.plugin(
      { name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as unknown as Plugin,
      { root: join(root, "storage") },
    );
    await ctx.plugin(
      { name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as unknown as Plugin,
      { backend: "json" },
    );
    await ctx.plugin(draftsPlugin as unknown as Plugin);
    const live = ctx as unknown as Context;
    // A NON-HEAD CELL: the steering is observable only where the cell's
    // file differs from the family head's (the roster arm proved the
    // files pairwise distinct; take the first cell routed away from the
    // head, derived off the DECL).
    const cell = declCells().find((c) => c.route !== FAMILY);
    assert.ok(cell, `no ${VARIANT} cell routes away from the family head — the write→run edge cannot be observed`);
    await live.benchRemote.ensure({ session: "qrp" }, sig);
    const added = await live.benchRemote.addStage("qrp", { card: FAMILY, expect_rev: 0 }, sig);
    const draftId = "bench-qrp";
    const stageId = String(added.stage);
    // THE PICK arrives exactly as the studio's ModelAxes sends it: a
    // params merge patch carrying the axis coordinate.
    const landed = await live.draftsRemote.remoteExportPatch(
      draftId, stageId, { params: { variant: VARIANT, quant: cell.quant, ...shot() } }, added.rev, sig,
    );
    assert.equal((landed as { delivered?: boolean }).delivered, true,
      "the quant coordinate rides the write door and lands — the axis key is admitted surface on this card");
    const after = await live.draftsRemote.get(draftId, sig);
    const stored = stageParamsOf(after, stageId);
    assert.equal(stored["quant"], cell.quant, "the stored row carries the picked coordinate (the write plane's cure, read back)");
    // THE RUN PLANE, from the STORED row's own params — never a re-typed
    // copy: what the next press composes is what the door saved.
    const defs = await loadCardDefs();
    const prep = prepareCardParams(registry, { model: FAMILY, ...stored }, FAMILY, "admission");
    assert.equal(prep.modelId, cell.route, `the stored row's quant prepares the cell's route '${cell.route}'`);
    const row = (registry.modelFacts() as Record<string, unknown>)[prep.modelId];
    const def = defs.get(prep.card);
    assert.ok(def, `the card defs serve '${prep.card}'`);
    const g = new GraphBuilder();
    def.compose(def.schema({ ...prep.params }), row, g, "quant-run-plane-write-edge");
    assert.deepEqual(unetNames(g.toJSON() as Graph), [cell.unet],
      `the stored row's quant must compose the cell's file '${cell.unet}'`);
  }, 120_000);

  it("THE WRITE DOOR REFUSES A COORDINATE OUTSIDE THE CARD'S SURFACE — the quant key is admitted surface, so the pick lands; a ghost KEY never does", async () => {
    const root = mkdtempSync(join(tmpdir(), "quant-run-plane-refuse-"));
    onTestFinished(() => rmSync(root, { recursive: true, force: true }));
    const ctx = new Context();
    const registry = new CardRegistryService(new Context());
    await registry.prime();
    ctx.provide("cardRegistry", registry);
    await ctx.plugin(Storage as unknown as Plugin);
    await ctx.plugin(
      { name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as unknown as Plugin,
      { root: join(root, "storage") },
    );
    await ctx.plugin(
      { name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as unknown as Plugin,
      { backend: "json" },
    );
    await ctx.plugin(draftsPlugin as unknown as Plugin);
    const live = ctx as unknown as Context;
    await live.benchRemote.ensure({ session: "qrp2" }, sig);
    const added = await live.benchRemote.addStage("qrp2", { card: FAMILY, expect_rev: 0 }, sig);
    const refused = await live.draftsRemote.remoteExportPatch(
      "bench-qrp2", String(added.stage), { params: { quant_ghost_key_zzz: "x" } }, added.rev, sig,
    ).then(() => null, (error: unknown) => (remoteErrorOf(error) ?? error) as Record<string, unknown>);
    assert.ok(refused !== null, "the write door refuses a key the card does not declare");
    assert.match(String(refused["message"] ?? ""), /quant_ghost_key_zzz/, "the refusal names the key");
  }, 120_000);
});

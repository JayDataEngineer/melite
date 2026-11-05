// @contract cards-modelless-family-facts
// modelless-family-facts.spec.ts — THE SILENT-PASS WALL (the
// operator's lost sfx run, 2026-11-03: "IF SOMETHING GENERATES
// WITHOUT THE UNDERLYING DATA, THAT IS AN EXTREME ERROR THAT CAUSES
// WORK THAT CANNOT BE RECOVERED").
//
// THE LESION: a card can declare model-less compose
// (flowKinds.requiresModel false → the registration lift) while its
// ONE boarded family's declared actions parse LANE FACTS — the
// model-less compose arm inferred the family but handed
// lane_inputs {}, so the press refused at the DEEPEST door with the
// family's own facts voice ("moss-sfx sfx: lane_inputs.model_path =
// undefined"), the run generated nothing, and the bench-born run
// kept nothing to restore. sfx burned live; h3's unet was one
// card-unit press behind it (parseH3Facts refuses an empty unet the
// same way).
//
// THE CURE (service.ts, THE SINGLE-FAMILY FACTS RESOLVE): the
// model-less arm splices the inferred family's own DECL
// lane_inputs — the same rows the model-ful arm's facts row carries
// (deriveRow) — so a card-unit press either composes on the
// family's declared facts or refuses at a NAMED gate. THE WALL
// pins the class over the REAL roster, never the one card:
//
//   ARM 1 — the burn's own door: the sfx card-unit press (model '')
//     COMPOSES, and the graph carries the family's declared
//     model_path on the loader (the exact press the operator lost).
//   ARM 2 — the roster walk: EVERY model-less single-family card
//     whose family declares actions composes-or-refuses LOUD with
//     NEVER a lane_inputs voice (the deep refusal is the bug).
//   ARM 3 — the splice's source: for every walked family, each
//     declared action's facts parse passes over the DECL's own
//     lane_inputs — the compose splice feeds exactly what the
//     family admission gate judged at registration.
//   ARM 4 — the pure-tool carve: a zero-family model-less card
//     still receives lane_inputs {} — the splice touches ONLY the
//     inferred single family, never the tool cards.
//
// Toggle: revert the splice (lane_inputs {} again) in service.ts →
// ARM 1 reds with the operator's verbatim refusal voice, ARM 2 reds
// naming every starving card; ARM 4 stays green (the carve is
// honest). Run:
//   npx vitest run packages/engines/comfyui-cordis/tests/modelless-family-facts.spec.ts
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Context } from "@deepseek-ai/cordis";

import { cascadeInit, getModel, registryIds, registryModel } from "../src/models/models.ts";
import { ComfyUIService, composeCards } from "../src/index.ts";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import { loadCardDefs } from "../src/cardDefs.ts";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import type { ModelDecl } from "@melite/comfyui-card-kit/model-contract";

const here = dirname(fileURLToPath(import.meta.url));
// THE FULL CARD SET through the real registration lift (composeCards
// → registerCard → the flowKinds.requiresModel lift) — the same
// composition the estate's composeOnce boots per press. The models
// registry boots FIRST (loadFacts renders rows through its reads).
await cascadeInit();
const factsDoc = loadFacts(
  join(here, "..", "data", "model-facts.json"),
  { getModel, registryIds, registryModel },
);
const defs: Map<string, CardDefinition> = await loadCardDefs();

const boot = async (): Promise<ComfyUIService> => {
  const ctx = new Context();
  await ctx.plugin({ apply(c: Context) { new ComfyUIService(c); } });
  await composeCards(ctx);
  const svc = ctx.comfyui as ComfyUIService;
  svc.setFacts(factsDoc);
  return svc;
};

/** THE ROSTER (derived, never hand-listed): every registered card
 *  whose compose lanes MODEL-LESS while boarding exactly ONE family
 *  whose DECL declares actions with a facts parse — the exact shape
 *  the burn starved. */
function rosterRows(): Array<{ card: string; family: string; decl: ModelDecl; def: CardDefinition }> {
  const rows: Array<{ card: string; family: string; decl: ModelDecl; def: CardDefinition }> = [];
  for (const [id, def] of defs) {
    if (def.requiresModel !== false) continue;
    if (def.boarded.length !== 1) continue;
    const family = def.boarded[0]!;
    let decl: ModelDecl;
    try {
      decl = getModel(family);
    } catch {
      // a ghost board is the card's own registration finding, not
      // this wall's — the compose door names it loud
      continue;
    }
    if ((decl.actions ?? []).length === 0) continue;
    rows.push({ card: id, family, decl, def });
  }
  return rows;
}

/** Typed fills for the params solver: the refusal names the type,
 *  the fill answers it (the card's own schema is the law — the
 *  solver only obeys what it names). */
const FILL_FOR: Record<string, unknown> = {
  number: 0, integer: 0, string: "probe", boolean: true, array: [], object: {},
};

const graphNodes = (graph: Record<string, unknown>): Array<[string, Record<string, unknown>]> =>
  Object.entries(graph as Record<string, Record<string, unknown>>);

describe("THE SILENT-PASS WALL — the model-less compose arm resolves the single boarded family's own facts (the lost sfx run, 2026-11-03)", () => {
  let svc: ComfyUIService;

  beforeAll(async () => {
    svc = await boot();
  });

  it("ARM 1 — the burn's own door: the sfx card-unit press (model '') COMPOSES on the family's declared facts", () => {
    const graph = svc.compose("sfx", "", { prompt: "sharp metallic clang with long decay" }, "burn_repro") as Record<string, unknown>;
    assert.ok(typeof graph === "object", "the press composes — the model-less arm resolved the family's lane facts");
    const loader = graphNodes(graph).find(([, n]) => n["class_type"] === "LoadAudiocoreModel");
    assert.ok(loader, "the graph carries LoadAudiocoreModel");
    const inputs = (loader[1]["inputs"] ?? {}) as Record<string, unknown>;
    assert.equal(
        inputs["model_path"], "MOSS-SoundEffect-v2.0-src",
      "the loader rides the family DECL's declared model_path — never an empty facts blob",
    );
    assert.equal(inputs["family"], "moss_sfx_v2", "the loader's family seat rides the DECL row too");
    const save = graphNodes(graph).find(([, n]) => n["class_type"] === "SaveAudio");
    assert.ok(save, "the graph carries SaveAudio (the press generates, not refuses)");
    assert.equal(
      ((save[1]["inputs"] ?? {}) as Record<string, unknown>)["filename_prefix"], "burn_repro/sfx",
      "the save rides the run-scoped prefix — the press is a real run, not a probe",
    );
  });

  it("ARM 2 — the roster walk: every model-less single-family card with declared actions refuses NEVER in the lane_inputs voice", () => {
    const rows = rosterRows();
    // the burn's two members are on the roster — derived, not listed
    const cards = rows.map((r) => r.card).sort();
    assert.ok(cards.includes("sfx"), `the roster walks the burned card (walked: ${cards.join(", ")})`);
    assert.ok(rows.length >= 2, `the class has members beyond sfx (walked ${String(rows.length)})`);
    for (const { card, def } of rows) {
      // THE PRESS RIDES LAWFUL PARAMS, DERIVED FROM THE CARD'S OWN
      // LAW: compose is probed, and each typed params refusal the
      // card's schema names ($.key expected T) is filled and retried
      // — an empty {} press dies at the schema gate and masks the
      // deeper door (the coverage gap this wall's toggle-proof
      // caught). Whatever refusal REMAINS is the card's named gate.
      let params: Record<string, unknown> = {};
      let last: Error | undefined;
      for (let fill = 0; fill < 24; fill++) {
        try {
          const graph = svc.compose(card, "", params, "roster_probe") as Record<string, unknown>;
          assert.equal(typeof graph, "object", `${card}: the card-unit press composes`);
          last = undefined;
          break;
        } catch (e) {
          last = e as Error;
          const named = /^\$\.([\w-]+) expected (\w+) but got/.exec(last.message);
          const missing = /^required param '([\w-]+)' (?:missing|or empty)/.exec(last.message);
          if (!named && !missing) break;
          // a required-but-missing key starts as a string; if the
          // card's schema wants a type, its own typed refusal names
          // it on the next pass and the fill is replaced
          const key = named?.[1] ?? missing![1]!;
          const value = (named ? FILL_FOR[named[2]!] : undefined) ?? "probe";
          let seat: Record<string, unknown> = params;
          const path = key.split(".");
          for (let i = 0; i < path.length - 1; i++) {
            const k = path[i]!;
            if (typeof seat[k] !== "object" || seat[k] === null) seat[k] = {};
            seat = seat[k] as Record<string, unknown>;
          }
          seat[path[path.length - 1]!] = value;
        }
      }
      if (last !== undefined) {
        const msg = last.message;
        assert.ok(
          !msg.includes("lane_inputs"),
          `${card}: the model-less press starved the family's facts — "${msg}" (the silent-pass lesion, service.ts THE SINGLE-FAMILY FACTS RESOLVE)`,
        );
      }
    }
  });

  it("ARM 3 — the splice's source: every walked family's declared actions parse the DECL's own lane_inputs, and a parse that refuses an empty row OWES the row", () => {
    for (const { family, decl } of rosterRows()) {
      const row = { ...(decl.lane_inputs ?? {}) };
      for (const action of decl.actions ?? []) {
        action.facts(row);
        // THE INTERLOCK DIRECTION: a facts parse that cannot take an
        // empty row (the sfx/h3 class) is only servable model-less
        // because the splice feeds the DECL's row — the family MUST
        // declare one, or the card-unit press starves again
        try {
          action.facts({});
        } catch {
          assert.ok(
            Object.keys(row).length > 0,
            `${family}: its action's facts parse refuses an empty row but the DECL declares no lane_inputs — the card-unit press would starve (declare the row)`,
          );
        }
      }
    }
  });

  it("ARM 4 — the pure-tool carve: a zero-family model-less card still receives lane_inputs {}", async () => {
    const seen: unknown[] = [];
    const ctx = new Context();
    await ctx.plugin({ apply(c: Context) { new ComfyUIService(c); } });
    const tool = ctx.comfyui as ComfyUIService;
    tool.registerCard({
      id: "probe_tool",
      skeleton: "tool",
      boarded: [],
      schema: (v: unknown) => (v ?? {}) as Record<string, unknown>,
      compose: (_p, model, g) => {
        seen.push(model.lane_inputs);
        g.node("TestNode", { a: 1 });
      },
      sidebar: { key: "gen", order: 99 },
      flowKinds: { inputs: {}, outputs: { image: "image" }, requiresModel: false },
    } as CardDefinition);
    tool.compose("probe_tool", null, {}, "carve_probe");
    assert.deepEqual(seen, [{}], "no family inferred → the empty facts blob stays (the splice touches only the single-family arm)");
  });
});

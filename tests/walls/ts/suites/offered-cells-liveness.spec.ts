// offered-cells-liveness.spec.ts — THE OFFERED-CELLS CONTRACT (the
// operator, 2026-10-12 ~21:00: "IS THE CONTRACT THAT MAKES SURE
// THAT NO BAD VARIANTS, NO BAD QUANTS, NO BAD FAMILIES WHERE IT
// PASSES ALL GREEN? IS THAT IN?" — it was NOT in; this suite is).
//
// THE LAW: every lane the axes can OFFER — derived live from the
// booted registry (every card's def.boarded set × every family's
// variants × every cell's quant, the roster no hand maintains) —
// must survive the three doors a human's click drives, with the
// CELL NAMED in every failure:
//
//   RESOLVE — selectCardVariant on the cell's stated coordinates
//   (variant + quant, the axes' own spelling) selects exactly that
//   cell, never a throw, never a silent neighbor. Both spellings
//   the GUI can write are judged: the loose {variant, quant} pair
//   and the model cell route when the cell declares one.
//
//   ADMIT — the registry's own write-door verdict
//   (admitStageRelations, the admitIncomplete voice the bench
//   patch door passes) accepts the cell's neutral doc. A cell
//   whose own defaults its own door refuses is a dead cell — the
//   exact "all green, click refuses" class.
//
//   COMPOSE — the card's compose, fed the cell's prepared params
//   (prepareCardParams — the run path's own merged view, overlay
//   stamps and all) and the probe-filled doc the liveness wall
//   proved, produces a NON-EMPTY graph of engine-owned node
//   classes. A cell that composes nothing or composes phantom
//   nodes is a run that dies on the lane.
//
// DEPTH: the roster derives from the live booted registry (the
// same seat pair the patch door composes — laneMigrate then
// admit), never a frozen list; the vocabulary is the facts file's
// own engine answer with its documented floors (the dead-card
// wall's spelling, one home).
import { assertHermeticRode } from "../../../helpers/hermetic-engine.ts";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { installLaneStoreOverlay, restoreLaneStoreOverlay } from "../../../helpers/lane-store-overlay.ts";
import { Context } from "@deepseek-ai/cordis";
import { CardRegistryService } from "../../../../packages/harness/estate-queue/src/cardsRegistry.ts";
import { FlowsSeatService } from "../../../../packages/harness/estate-queue/src/flowsData.ts";
import { selectCardVariant } from "../../../../packages/harness/estate-queue/src/cardsVariant.ts";
import { prepareCardParams } from "../../../../packages/harness/estate-queue/src/cardsCompose.ts";
import { loadCardDefs, owningAtom } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadFacts } from "@melite/comfyui-card-kit/facts";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);

type NodeShape = { class_type?: unknown };
type Graph = Record<string, NodeShape>;

/** The probe fills (the dead-card wall's own rows — one spelling,
 *  that suite's head is the home of this table's law). */
const PROBE_NUMBERS: Record<string, number> = {
  width: 512, height: 512,
  seed: -1,
  steps: 4,
  cfg: 4.5,
};
const PROBE_STRINGS: Record<string, string> = {};
const ESTATE_FILE_PROBE = FACTS_PATH;
PROBE_STRINGS.input_image = ESTATE_FILE_PROBE;
const ASSET_SUFFIX: Array<[RegExp, string]> = [
  [/audio|voice|speech/i, "probe.wav"],
  [/video|frames/i, "probe.mp4"],
  [/glb|mesh|rig/i, "probe.glb"],
  [/image|mask|img|pic|photo/i, "probe.png"],
];
function fillFor(name: string): unknown {
  if (name in PROBE_NUMBERS) return PROBE_NUMBERS[name];
  if (PROBE_STRINGS[name] !== undefined) return PROBE_STRINGS[name];
  const listShape = /(s|_list|_images|_inputs|_masks)$/i.test(name);
  const suffix = ASSET_SUFFIX.find(([re]) => re.test(name));
  if (suffix) return listShape ? [suffix[1]] : suffix[1];
  if (/^(is|has|use|enable|show|allow|double|crop)/i.test(name)) return false;
  if (/^(num|count|max|min|batch|frames|dur|quality|strength|denoise|shift|temp)/i.test(name)) return 1;
  return "the cells liveness probe";
}
function namedMulti(message: string): string[] {
  const names = new Set<string>();
  for (const m of message.matchAll(/'([A-Za-z_][\w-]*)'/g)) names.add(m[1]);
  for (const m of message.matchAll(/\$\.([A-Za-z_][\w-]*)/g)) names.add(m[1]);
  return [...names].filter((n) => !["random", "int", "undefined", "required"].includes(n));
}

let svc: CardRegistryService;
let bootCtx: Context;

beforeAll(async () => {
  bootCtx = new Context();
  new FlowsSeatService(bootCtx);
  (bootCtx as unknown as { queue: unknown }).queue = {
    stateRoot: mkdtempSync(join(tmpdir(), "cells-liveness-")),
    stateRoots: [] as string[],
  };
  svc = new CardRegistryService(bootCtx);
  await svc.prime();
  installLaneStoreOverlay();
}, 90_000);

afterAll(() => {
  restoreLaneStoreOverlay();
});

/** One offered cell, all its identity spellings. */
interface CellRow {
  card: string;
  atom: string;
  variantId: string;
  quant: string;
  route: string | null;
}

describe("THE OFFERED-CELLS CONTRACT — no bad variants, no bad quants, no bad families passing green (operator 2026-10-12)", () => {
  const raw = JSON.parse(readFileSync(FACTS_PATH, "utf8")) as {
    extension_node_types: Record<string, string[]>;
    core_node_types: Record<string, string[]>;
    engine_node_types?: string[];
  };
  const vocabulary = new Set<string>(raw.engine_node_types ?? []);
  for (const classes of Object.values(raw.extension_node_types)) for (const c of classes) vocabulary.add(c);
  for (const classes of Object.values(raw.core_node_types)) for (const c of classes) vocabulary.add(c);

  /** THE DERIVED ROSTER: every card's offered families (def.boarded
   *  verbatim — routes fold to their owning atoms, the offered-set
   *  law) × every visible variant × every cell. */
  const roster: CellRow[] = [];
  const rosterDead: string[] = [];
  beforeAll(async () => {
    const defs = await loadCardDefs();
    const facts = svc.modelFacts();
    for (const [cardId, def] of defs) {
      for (const family of def.boarded ?? []) {
        const atom = owningAtom(family);
        const famRow = facts[atom];
        if (famRow === undefined) {
          rosterDead.push(`${cardId}: offered family '${family}' (atom '${atom}') has no facts row — the axes would offer a lane the registry cannot resolve`);
          continue;
        }
        for (const variant of famRow.variants ?? []) {
          if (variant.hide_from_dropdown === true) continue;
          // THE LANE ROSTER (the axes' own offering): Recipe-group
          // rows ride the GUI's separate Recipe combobox (a param
          // on the lane, never a lane — the snapshot law), so they
          // are not lane cells. Selection still accepts a stated
          // recipe id (selectCardVariant's own law); that
          // select-yes/admit-no asymmetry is pinned as a CONTRACTS
          // §4 debt with this wall's receipt, not guessed at here.
          if (variant.group === "Recipe") continue;
          const cells = variant.cells ?? [];
          if (cells.length === 0) {
            roster.push({ card: cardId, atom, variantId: variant.id, quant: "", route: null });
            continue;
          }
          for (const cell of cells) {
            if (cell.hide_from_dropdown === true) continue;
            // an empty-string route is "no route" in the facts'
            // own spelling — treat it as absent, never as an
            // addressable id (a '' mid is a refusal voice).
            roster.push({ card: cardId, atom, variantId: variant.id, quant: cell.quant, route: typeof cell.route === "string" && cell.route !== "" ? cell.route : null });
          }
        }
      }
    }
  });

  it("the roster is not empty (a silent sweep judges nothing)", () => {
    expect(rosterDead, "offered families with no facts row").toEqual([]);
    expect(roster.length, "offered cells across the fleet").toBeGreaterThan(20);
  });

  it("RESOLVE: every offered cell selects exactly itself, under both axis spellings", () => {
    const facts = svc.modelFacts();
    const bad: string[] = [];
    for (const cell of roster) {
      const famRow = facts[cell.atom]!;
      // spelling 1: the loose pair (the Variant/Quant comboboxes)
      try {
        const sel = selectCardVariant(cell.atom, famRow, cell.quant === ""
          ? { variant: cell.variantId }
          : { variant: cell.variantId, quant: cell.quant }, "cells-liveness");
        if (sel.variantId !== cell.variantId || sel.quant !== cell.quant) {
          bad.push(`${cell.card} / ${cell.atom} / ${cell.variantId} / ${cell.quant}: loose spelling selected ${sel.variantId} / ${sel.quant}`);
        }
      } catch (err) {
        bad.push(`${cell.card} / ${cell.atom} / ${cell.variantId} / ${cell.quant}: loose spelling THREW: ${err instanceof Error ? err.message : String(err)}`);
      }
      // spelling 2: the model cell route, when the cell declares one
      if (cell.route === null) continue;
      try {
        const sel = selectCardVariant(cell.route, famRow, { model: cell.route }, "cells-liveness");
        if (sel.variantId !== cell.variantId || sel.quant !== cell.quant) {
          bad.push(`${cell.card} / ${cell.atom} / ${cell.variantId} / ${cell.quant}: route '${cell.route}' selected ${sel.variantId} / ${sel.quant}`);
        }
      } catch (err) {
        bad.push(`${cell.card} / ${cell.atom} / ${cell.variantId} / ${cell.quant}: route '${cell.route}' THREW: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    expect(bad, "offered cells that do not resolve to themselves").toEqual([]);
  });

  it("ADMIT: the write door accepts every offered cell's neutral doc", () => {
    const bad: string[] = [];
    for (const cell of roster) {
      const params: Record<string, unknown> = cell.route !== null
        ? { model: cell.route }
        : { model: cell.atom, variant: cell.variantId, ...(cell.quant !== "" ? { quant: cell.quant } : {}) };
      const verdict = svc.admitStageRelations(cell.card, params);
      if (!verdict.ok) {
        bad.push(`${cell.card} / ${cell.variantId} / ${cell.quant}: the door refuses the cell's own neutral doc — ${verdict.error}`);
      }
    }
    expect(bad, "offered cells whose own door refuses them (the click-refuses-all-green class)").toEqual([]);
  });

  it("COMPOSE: every offered cell composes a real, engine-owned graph", async () => {
    const defs = await loadCardDefs();
    const facts = svc.modelFacts();
    const bad: string[] = [];
    for (const cell of roster) {
      const def = defs.get(cell.card)!;
      const famRow = facts[cell.atom]!;
      const modelDoc = facts[cell.atom]!;
      // the run path's own merged view for this cell (overlay stamps
      // and all) — the params the compose would actually receive
      let prepared: Record<string, unknown> = {};
      try {
        prepared = prepareCardParams(svc, {
          model: cell.route ?? cell.atom,
          variant: cell.variantId,
          ...(cell.quant !== "" ? { quant: cell.quant } : {}),
        }, cell.route ?? cell.atom, "cells-liveness").params;
      } catch (err) {
        bad.push(`${cell.card} / ${cell.variantId} / ${cell.quant}: prepare THREW: ${err instanceof Error ? err.message : String(err)}`);
        continue;
      }
      const doc: Record<string, unknown> = { ...prepared };
      const filled = new Set<string>();
      let composed = false;
      let lastError = "";
      for (let round = 0; round < 14 && !composed; round++) {
        try {
          const g = new GraphBuilder();
          def.compose(def.schema({ ...doc }), modelDoc, g, `cells-liveness:${cell.atom}/${cell.variantId}/${cell.quant}`);
          const graph = g.toJSON() as Graph;
          if (!graph || Object.keys(graph).length === 0) {
            bad.push(`${cell.card} / ${cell.variantId} / ${cell.quant}: compose produced an EMPTY graph`);
          } else {
            const unknown: string[] = [];
            for (const [nid, node] of Object.entries(graph)) {
              const ct = node?.class_type;
              if (typeof ct !== "string" || ct.length === 0) unknown.push(`${nid}:<no class_type>`);
              else if (!vocabulary.has(ct)) unknown.push(ct);
            }
            if (unknown.length > 0) bad.push(`${cell.card} / ${cell.variantId} / ${cell.quant}: composes node classes the engine does not own: ${unknown.join(", ")}`);
          }
          composed = true;
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
          const enumOffer = /expected "([^"]+)"/.exec(lastError);
          const named = namedMulti(lastError);
          const fresh = enumOffer ? named : named.filter((n) => !filled.has(n));
          if (fresh.length === 0) {
            bad.push(`${cell.card} / ${cell.variantId} / ${cell.quant}: ${lastError}`);
            break;
          }
          for (const name of fresh) {
            filled.add(name);
            doc[name] = enumOffer ? (enumOffer[1] as string) : fillFor(name);
          }
        }
      }
      void famRow;
      // F1 (audit 2026-10-12-audit-offered-cells): a cell that
      // exhausts the 14-round probe budget without ever composing
      // used to pass silently — `continue` on any !composed cell
      // with no stuck-error push. Exhaustion is a bad row: the
      // probe never reached a composing doc, so the click is dead
      // on this cell even though no single round errored out.
      if (!composed) {
        bad.push(
          `${cell.card} / ${cell.variantId} / ${cell.quant}: never composed within the 14-round probe budget` +
            (lastError === "" ? "" : ` — last error: ${lastError}`),
        );
      }
    }
    expect(bad, "offered cells that cannot compose (dead clicks the green suites were passing)").toEqual([]);
  });
});

describe("the hermetic engine (the gate-37 flake cure: no live socket on the boot path)", () => {
  it("every prime rode the mock", () => {
    assertHermeticRode();
  });
});

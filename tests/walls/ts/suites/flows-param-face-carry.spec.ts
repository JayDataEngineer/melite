// flows-param-face-carry — THE FLOW FACE'S CARRY LAW (P0 census
// cell SD-4's enforceable half, 2026-11-12): every param a flow's
// TOOL advertises is CARRIED by the stage it targets, and every
// card-plane stage composes only params its card admits.
//
// The burn this closes (the audit's R9 join, p0-census-design §1 R9):
// the flow face has three spellings of the same param — the flow's
// own inputs (`initialValidators`), the agent tool's `properties`,
// and the `overlays` that map a property onto a stage param path.
// The leaf<->row interlock (flows-wiring) already judges the leaf's
// params against the row and the overlay's STAGE id against the
// row's stages — but nothing judged the two edges that decide
// whether a stated value ever lands:
//   * a tool property with no input and no overlay: the agent states
//     it, the flow carries nothing, the value is a silent drop at
//     the flow face (the operator's "the bar shows the number, the
//     engine never hears it", one plane up);
//   * an overlay whose PATH names a param the stage's card never
//     admits: the mapping points at a key the compose never reads —
//     the stated value dies between the tool call and the card door;
//   * a card-plane stage composing a key neither its card's carrier
//     schema nor the stage-routing roster names: the value reaches
//     no consumer at all.
//
// THE STAGE-ROUTING KEY (SD-4b, cured 2026-11-12): exactly ONE key
// rides a card-plane stage's doc outside the card's carrier schema —
// `model`, the family/variant selector `composeCardStageRow` reads
// at runsRegistry.ts:792 (`mid = params.model ?? service ?? card`)
// before it hands `{ ...params, card }` to the card door. It is a
// CITED exemption, not a roster: the wall's failure message names
// the code line, so a second unadmitted key cannot hide behind a
// list. The retired `filename_prefix` (image-upscale's polish stage)
// reached NO consumer — the upscale-tools card composes its own
// SaveImage prefix from the run id — and is gone.
//
// THE DEPTH: the rows are the REAL seat (seedFlowsSeat, the same
// registry the validate door serves) and the cards are the REAL
// defs (loadCardDefs — the same registry the card plane composes
// through). No hand list of flows, props, overlays, or card keys.
// No models boot here: this wall judges the flow↔card join, and the
// models registry's own boot walk is the model walls' path — a DECL
// mid-edit must red the model walls, not this one (each wall fires
// on its own path).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { seedFlowsSeat } from "../../../../packages/harness/estate-queue/src/flowsData.ts";
import { deriveDecls } from "../../../../packages/harness/estate-queue/src/cardsFacts.ts";
import { loadCardDefs } from "@melite/comfyui-cordis";

const SEAT = seedFlowsSeat();

/** The ONE stage-doc key the card plane reads outside a card's
 *  carrier schema: the routing selector at runsRegistry.ts:792. */
const STAGE_ROUTING_KEYS: readonly string[] = ["model"];

/** The flow's own statable set: its declared initial inputs, its
 *  required initials, and every param an overlay routes. */
function statableOf(row: {
  initialValidators?: Record<string, unknown>;
  requiredInitials?: readonly string[];
  tool?: { overlays?: readonly { param: string }[] } | null;
}): Set<string> {
  return new Set([
    ...Object.keys(row.initialValidators ?? {}),
    ...(row.requiredInitials ?? []),
    ...(row.tool?.overlays ?? []).map((o) => o.param),
  ]);
}

describe("THE FLOW FACE'S CARRY LAW (SD-4) — an advertised param reaches the stage it names, and a stage composes only what its card admits", () => {
  it("ARM 1 — every tool-advertised param is statable: a flow input or an overlay, never a dead property", () => {
    const failures: string[] = [];
    let judged = 0;
    for (const name of SEAT.names()) {
      const row = SEAT.get(name);
      if (row === undefined) continue;
      const props = Object.keys(row.tool?.properties ?? {});
      if (props.length === 0) continue;
      const statable = statableOf(row);
      for (const p of props) {
        judged += 1;
        if (!statable.has(p)) {
          failures.push(`${name}: the tool advertises '${p}' but no flow input and no overlay carries it — a stated value dies at the flow face (the bar shows the number, the engine never hears it)`);
        }
      }
    }
    assert.ok(judged > 0, "the seat serves no tool properties — the carry law judged nothing (a vacuous pass is the burn's own shape)");
    assert.deepEqual(failures, [], `FLOW FACE CARRY (arm 1) — ${failures.length} dead propert${failures.length === 1 ? "y" : "ies"} of ${judged} judged:\n${failures.join("\n")}`);
  });

  it("ARM 2 — every overlay lands on a param its stage's card admits (the declared surface, or the cited routing selector)", async () => {
    // THE RECUT (audit 015 C2, the same change): the old judge — the
    // path head must be a key the stage's params ALREADY carry — was
    // a proxy that held only while every overlay-able seat carried a
    // stamp. The one-home cure deletes the stamped defaults (seed,
    // duration), and a stated value lands through the door's overlay
    // merge, which admits by the CARD's surface, never by the stamp.
    // The judge is now the door's own join (flowsParamsOverlay's
    // cardAdmits law): knobs ∪ contract admits, plus the ONE cited
    // routing selector. The boot-folded mod fields stay the door's
    // runtime fold (an empty mod set can only over-red a future
    // mod-key overlay into a deliberate recut, never under-judge a
    // present one); no current overlay targets one.
    const defs = await loadCardDefs();
    // Studio-write admits ride the facts file's read manifest — a
    // registry seat this wall does not boot; no overlay targets one,
    // and a future one reds here into a deliberate extension.
    const decls = deriveDecls(defs, {});
    const failures: string[] = [];
    let judged = 0;
    const judgedSeats: string[] = [];
    for (const name of SEAT.names()) {
      const row = SEAT.get(name);
      if (row === undefined) continue;
      const stages = new Map(row.stages.map((s) => [s.id, s]));
      for (const ov of row.tool?.overlays ?? []) {
        judged += 1;
        const stage = stages.get(ov.stage);
        if (stage === undefined) {
          failures.push(`${name}: overlay '${ov.param}' targets stage '${ov.stage}' the row does not carry`);
          continue;
        }
        const head = ov.path?.[0];
        if (head === undefined) {
          failures.push(`${name}: overlay '${ov.param}' carries an empty path — it maps to no stage param`);
          continue;
        }
        const card = stage.card;
        const decl = card === "" ? undefined : decls[card];
        const admitted =
          (decl !== undefined &&
            (decl.schemaNames.includes(head) ||
              decl.admits.some((a) => a === head || (a.endsWith("*") && head.startsWith(a.slice(0, -1)))))) ||
          STAGE_ROUTING_KEYS.includes(head);
        judgedSeats.push(`${name}:${ov.param}->${stage.id}/${head}`);
        if (!admitted) {
          failures.push(`${name}: overlay '${ov.param}' -> ${ov.stage}.${head}, but card '${card}' admits [${decl === undefined ? "(no card)" : [...decl.schemaNames, ...decl.admits].join(", ")}] and '${head}' is not the routing selector (runsRegistry.ts:792) — the mapping names a key the compose never reads`);
        }
      }
    }
    assert.ok(judged > 0, "the seat serves no overlays — the overlay path law judged nothing");
    for (const canary of ["image-upscale:seed->polish/seed", "music-native:duration->music/duration"]) {
      assert.ok(judgedSeats.includes(canary), `the overlay walk never judged ${canary} — the seat join broke`);
    }
    assert.deepEqual(failures, [], `FLOW FACE CARRY (arm 2) — ${failures.length} mis-aimed overlay${failures.length === 1 ? "" : "s"} of ${judged} judged:\n${failures.join("\n")}`);
  });

  it("ARM 3 — a card-plane stage composes only params its card's carrier schema admits (the card door's key set)", async () => {
    const defs = await loadCardDefs();
    const failures: string[] = [];
    let judged = 0;
    for (const name of SEAT.names()) {
      const row = SEAT.get(name);
      if (row === undefined) continue;
      for (const stage of row.stages) {
        const card = (stage as { card?: string }).card;
        if (typeof card !== "string" || card === "") continue;
        const def = defs.get(card);
        if (def === undefined) {
          failures.push(`${name}: stage '${stage.id}' boards card '${card}' the card registry does not serve`);
          continue;
        }
        const carrier = def.schemaCarrier ?? def.schema;
        const admitted = new Set(Object.keys(carrier.dict ?? {}));
        // THE MOD BAG KEYS (the extend-video recut, 2026-11-12): a
        // card-declared modifier kind's bag rides stage params under
        // its param_key — "the bag key IS the contract" (params-emit,
        // emitModifierKinds) and the compose door carries it through
        // the gatedResolve rider list (h3-timeline card.ts — replace,
        // repair, extend). The carrier-schema proxy predates mod
        // bags; the card's own declared mods are the truth this wall
        // walks, exactly like the carrier row beside them.
        for (const mod of def.mods ?? []) {
          if (typeof mod.param_key === "string" && mod.param_key !== "") {
            admitted.add(mod.param_key);
          }
        }
        for (const key of Object.keys(stage.params ?? {})) {
          judged += 1;
          if (!admitted.has(key) && !STAGE_ROUTING_KEYS.includes(key)) {
            failures.push(`${name}: stage '${stage.id}' composes '${key}' but card '${card}' admits [${[...admitted].join(", ")}] and '${key}' is not the routing selector (runsRegistry.ts:792) — the value reaches no consumer`);
          }
        }
      }
    }
    assert.ok(judged > 0, "no card-plane stage param was judged — the card-door join is vacuous");
    // Non-vacuity canary for the recut: the mod-bag walk must judge
    // the first bag-carrying row (extend-video) — a wall that walks
    // nothing proves nothing.
    const extendRow = SEAT.get("extend-video");
    assert.ok(
      extendRow !== undefined &&
        Object.keys((extendRow.stages[0] as { params?: Record<string, unknown> })?.params ?? {}).includes("extend"),
      "the extend-video row lost its mod bag stamp — the bag-key recut judged nothing",
    );
    assert.deepEqual(failures, [], `FLOW FACE CARRY (arm 3) — ${failures.length} unadmitted stage param${failures.length === 1 ? "" : "s"} of ${judged} judged:\n${failures.join("\n")}`);
  });
});

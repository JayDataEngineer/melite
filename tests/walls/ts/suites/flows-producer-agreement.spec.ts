// flows-producer-agreement.spec.ts — U1 PRODUCER AGREEMENT (the mask-producer-law cure, 2026-11-01):
// every flow producer either declares its output bindings on the card's flowOutputBindings row
// or is bound by construction (every press it composes emits exactly one Save* node).
// The depth: the registry's own 11 flows (SEED.names, never a hand-list), the real
// expandRegistryFlow → composeFamilyStages → registryFlowToInline chain, the REAL run-seat
// compose (composeCardStageRow on the primed registry — the door itself, called white-box,
// never a re-spelling), and the REAL merge door (planMerge). No recorded graphs.
// ARM 1 (every registry flow merges): a flow whose card stage composes two Save* nodes with no
// declared bindings dies at the merge with the agent-UNREACHABLE "output_nodes" voice (the
// 2026-10-31 burn, qa8 §3.4). After the cure the merge judges bound producers and refuses every
// other failure in the producer's own voice. A card stage that composes anything but exactly
// one Save* with no declared bindings is the disagreement itself — RED. A single-save
// producer behind a misaddressed wire (the registry row names a channel the producer never
// declared) is the WIRE law's finding, not the producer's — named OWED, never landed red.
// A stage the lane-presence gate refuses for a pack this box does not carry is the PACK law's
// finding — named OWED, never landed red (the hermetic engine serves the recorded build, not
// every vendor pack; on a packed box the same arm judges for real).
// ARM 2 (the off-flow census): every producer card no registry flow stages either declares
// bindings or composes every derived press to a single Save* (bound by construction).
// ARM 3 (the one-truth wire law, 2026-11-01): for EVERY registry flow (SEED.names, never a
// hand-list), every wired channel resolves in the PRODUCER TABLE THE START DOOR BUILDS —
// the real composeCardStageRow outputs run through the REAL compileFlowInline, never a
// re-spelling. image-upscale/object-forge are the first reds: the row advertises card_io
// {image} while the door builds {default} (or nothing), so the wire WILL-REFUSE at the
// merge ("upstream stage produces no such channel"). No wire-misaddress owed escape: a
// channel the door's own table does not publish is the disagreement itself — RED. Pack
// skips (missing-extension only) and structural engine skips (never reaches planMerge)
// keep ARM 1's treatment: the environment is not the law.
// ARM 4 (the one-truth kind law, 2026-11-01): the default fill's kind equals the stage
// card's declared output media kind (def.flowKinds.outputs). music-native was the first
// red (the row retired 2026-11-14 with the wrapper retirement): the card declared {default:"audio"} and the engine-table fill published
// {default:"image"}. The arm judges end-to-end (compose + fill kind agreement) AND the
// fill leg directly (outputs emptied, card_io intact, through the real compileFlowInline:
// the filled outputs must equal the row's cardIo — the ONE TABLE both doors read).
import "../../../helpers/hermetic-engine.ts";
import "../../../helpers/boot-models.ts";
import { installLaneStoreOverlay, restoreLaneStoreOverlay } from "../../../helpers/lane-store-overlay.ts";
import { describe, it, beforeAll, afterAll } from "vitest";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Context } from "@deepseek-ai/cordis";
import { CardRegistryService } from "../../../../packages/harness/estate-queue/src/cardsRegistry.ts";
import { RunsRuntimeService } from "../../../../packages/harness/estate-queue/src/runsRegistry.ts";
import { FlowsSeatService } from "../../../../packages/harness/estate-queue/src/flowsData.ts";
import { QueueCore } from "../../../../packages/harness/estate-queue/src/queue.ts";
import { composeFamilyStages, liveFamilySeat } from "../../../../packages/harness/estate-queue/src/flowsFamilyCompose.ts";
import {
  expandRegistryFlow,
  seedFlowsSeat,
  registryFlowToInline,
} from "../../../../packages/harness/estate-queue/src/flowsData.ts";
import { loadCardDefs, planMerge } from "@melite/comfyui-cordis";
import type { EngineJson, MergeRow } from "@melite/comfyui-cordis";
import { compileFlowInline } from "../../../../packages/harness/estate-queue/src/runsStart.ts";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { getModel, registryIds, registryModel } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import { fillFor, namedMulti, undeclaredNames } from "../../../../packages/engines/comfyui-cordis/scripts/compose-probe.ts";

const SEED = seedFlowsSeat();
const CARD_PLANE_ENGINE = "comfyui";
const DUMMY: ModelFacts = { id: "x", card: "x", defaults: {}, lane_inputs: {}, card_knobs: [], variants: [], variant_groups: [], outputs: [] } as never;
const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);

let runSvc: RunsRuntimeService;
let probeDir: string;

beforeAll(async (): Promise<void> => {
  // THE RUNS SEAT (cards-run-row-truth): the real queue core + flow seat over an isolated
  // state root, the REAL primed card registry seated beside the runs runtime — the door's
  // own composition, so composeCardStageRow below is the seat's own call, never a copy.
  const state = mkdtempSync(join(tmpdir(), "producer-agreement-state-"));
  const ctx = new Context();
  new FlowsSeatService(ctx);
  const core = new QueueCore();
  (ctx as unknown as { queue: unknown }).queue = {
    core,
    stateRoot: state,
    get stateRoots(): string[] {
      return [state];
    },
  };
  const cardSvc = new CardRegistryService(ctx);
  await cardSvc.prime();
  (ctx as unknown as { cardRegistry: unknown }).cardRegistry = cardSvc;
  runSvc = new RunsRuntimeService(ctx);
  // the probe initials' files: the start door stats file-kind initials at claim, so the
  // wall's probe values ride real files (one per container, empty — compose never decodes).
  probeDir = mkdtempSync(join(tmpdir(), "producer-agreement-"));
  writeFileSync(join(probeDir, "probe.png"), "");
  writeFileSync(join(probeDir, "probe.mp4"), "");
  writeFileSync(join(probeDir, "probe.glb"), "");
  writeFileSync(join(probeDir, "probe.wav"), "");
  writeFileSync(join(probeDir, "probe.txt"), "");
  // THE HERMETIC STORE (lane-store-overlay): the wall composes EVERY
  // registry flow — its subject is producer/agreement, not the
  // machine's download state. Seed the declared rows a fresh-clone
  // store lacks so every stage composes past the presence gate.
  installLaneStoreOverlay();
}, 90_000);
afterAll(() => restoreLaneStoreOverlay());

/** The probe initial for a declared initial kind (the start door's own vocabulary, runsStart). */
function probeInitial(kind: string): string {
  const k = kind.toLowerCase();
  if (/(png|jpe?g|webp|photo|image|picture|thumb)/.test(k)) return join(probeDir, "probe.png");
  if (/(mp4|webm|mov|video|clip)/.test(k)) return join(probeDir, "probe.mp4");
  if (/(glb|gltf|mesh|fbx|obj|body|prop)/.test(k)) return join(probeDir, "probe.glb");
  if (/(wav|mp3|audio|voice|sound)/.test(k)) return join(probeDir, "probe.wav");
  if (/(json|params)/.test(k)) return JSON.stringify({ probe: true });
  return "the liveness probe";
}

type StageRow = Record<string, unknown>;

describe("U1 PRODUCER AGREEMENT: every flow producer is bound (declared bindings or one Save*)", () => {
  it("ARM 1 — every registry flow composes its card stages and merges (the real run-seat chain)", async () => {
    const defs = await loadCardDefs();
    const failures: string[] = [];
    const owed: string[] = [];
    const names = SEED.names();
    assert.ok(names.length > 0, "the registry seed names no flows — the sweep would pass vacuous (LAW 4 AXIS 1)");
    let merged = 0;
    for (const name of names) {
      const decl = SEED.get(name);
      assert.ok(decl !== undefined, `registry names ${name} but the getter misses it`);
      // the door's own order (flows-wiring): expand, COMPOSE the family stages, inline.
      const composed = composeFamilyStages(expandRegistryFlow(decl!, SEED), liveFamilySeat().decls, liveFamilySeat().state);
      const inlineDoc = registryFlowToInline(composed) as { stages?: StageRow[] };
      const stages: StageRow[] = Array.isArray(inlineDoc.stages) ? inlineDoc.stages : [];
      // the request initials a real run would carry: every {initial} edge's key, probed by the
      // flow's own declared validator kind (never a hand-list — the union derives from the row).
      const validators = (decl as unknown as { initialValidators?: Record<string, string> }).initialValidators ?? {};
      const initials: Record<string, EngineJson> = {};
      for (const [k, v] of Object.entries(validators)) initials[k] = probeInitial(String(v)) as EngineJson;
      const rows: MergeRow[] = [];
      const inputNames: Record<string, Record<string, string>> = {};
      const packSkipped = new Set<string>();
      for (const st of stages) {
        const sid = String(st["id"] ?? "?");
        const rowInputs = (typeof st["inputs"] === "object" && st["inputs"] !== null && !Array.isArray(st["inputs"]))
          ? (st["inputs"] as Record<string, unknown>)
          : {};
        const namesFor: Record<string, string> = {};
        for (const [iname, ref] of Object.entries(rowInputs)) {
          const rr = ref as Record<string, unknown>;
          if (typeof rr === "object" && rr !== null && !Array.isArray(rr) &&
            typeof rr["stage"] === "string" && typeof rr["output"] === "string") {
            namesFor[iname] = `${String(rr["stage"])}.${String(rr["output"])}`;
          } else if (typeof rr === "object" && rr !== null && !Array.isArray(rr) &&
            typeof rr["initial"] === "string") {
            const key = String(rr["initial"]);
            namesFor[iname] = `__initial__.${key}`;
            if (initials[key] === undefined) initials[key] = probeInitial(validators[key] ?? "text") as EngineJson;
          }
        }
        const card = typeof st["card"] === "string" ? st["card"] : "";
        const params = (typeof st["params"] === "object" && st["params"] !== null && !Array.isArray(st["params"]))
          ? { ...(st["params"] as Record<string, unknown>) }
          : {};
        if (card !== "") {
          // THE RUN SEAT ITSELF (runsRegistry composeCardStageRow, called white-box — the door,
          // never a re-spelling): the body recipe, the spell gate, phase1/phase2, the output
          // rename, the composed {workflow, output_nodes} + outputs + verbatim inputs.
          try {
            const composedStage = await (runSvc as unknown as {
              composeCardStageRow: (row: unknown, id: string, runId: string, label: string) => Promise<StageRow>;
            }).composeCardStageRow(st, sid, `wall-${name}-${sid}`, "wall ");
            const wf = (composedStage["params"] as Record<string, unknown>)["workflow"] as Record<string, EngineJson>;
            const saves = Object.entries(wf ?? {}).filter(([, n]) =>
              String((n as { class_type?: unknown }).class_type ?? "").startsWith("Save"));
            // THE PRODUCER VERDICT AT FLOW DEPTH: an unbound card stage must compose exactly
            // one saver (bound by construction) — anything else is the disagreement itself.
            // A bound stage already rode resolveCardFlowOutputsOrThrow inside phase2 (its own
            // teeth); the save count is not re-judged.
            const bound = ((defs.get(card)?.flowOutputBindings ?? []).length > 0);
            if (!bound && saves.length !== 1) {
              failures.push(`${name}/${sid}: card '${card}' declares no flowOutputBindings and composes ${saves.length} Save* nodes (${saves.map(([nid]) => nid).join(", ") || "none"}) — declare the bindings`);
              continue;
            }
            inputNames[sid] = namesFor;
            rows.push({
              stageId: sid, card,
              workflow: wf,
              outputs: (composedStage["outputs"] ?? {}) as MergeRow["outputs"],
              outputNodes: ((composedStage["params"] as Record<string, unknown>)["output_nodes"] ?? {}) as MergeRow["outputNodes"],
              params: (composedStage["params"] ?? {}) as MergeRow["params"],
            });
          } catch (e) {
            const text = (e as Error).message;
            // the PACK law's finding, never the producer's: the hermetic engine serves the
            // recorded build, not every vendor pack (MiniMaxH3, RTX) — on a packed box the
            // same arm judges for real. Only this voice class may skip, nothing else.
            if (/missing-extension/.test(text)) {
              packSkipped.add(sid);
              owed.push(`${name}/${sid}: pack-skipped on this box — ${text.slice(0, 200)}`);
            } else {
              failures.push(`${name}/${sid}: compose refused — ${text}`.slice(0, 400));
            }
          }
        } else if (typeof params["workflow"] === "object" && params["workflow"] !== null &&
          Object.keys(params["workflow"] as Record<string, unknown>).length > 0) {
          // the engine-composed row (family stages arrive graph-first): the workflow rides
          // params, the bindings beside it — the merge reads the row, never output_nodes.
          inputNames[sid] = namesFor;
          rows.push({
            stageId: sid,
            workflow: params["workflow"] as MergeRow["workflow"],
            outputs: (st["outputs"] ?? {}) as MergeRow["outputs"],
            outputNodes: ((params["output_nodes"] ?? {}) as MergeRow["outputNodes"]),
            params: params as MergeRow["params"],
          });
        } else {
          // another executor's row (craft-loop's engine-craft leg): it never reaches planMerge,
          // so the agreement cannot judge it — the skip is structural, named in the owed log.
          owed.push(`${name}/${sid}: structural skip — engine ${String(st["engine"] ?? "?")}, no card, no params.workflow (never reaches planMerge)`);
        }
      }
      if (rows.length === 0) {
        // a flow with no merge rows proves nothing — EVERY stage must be a structural skip
        // (no card, no params.workflow, a foreign engine that never reaches planMerge) or a
        // named pack-skip (the PACK law's finding, owed below, never landed red).
        const unjustified = stages.filter((st) => {
          const sid = String(st["id"] ?? "?");
          if (packSkipped.has(sid)) return false;
          const hasCard = typeof st["card"] === "string" && st["card"] !== "";
          const p = st["params"];
          const hasWf = typeof p === "object" && p !== null && !Array.isArray(p) &&
            typeof (p as Record<string, unknown>)["workflow"] === "object" &&
            (p as Record<string, unknown>)["workflow"] !== null;
          const foreign = String(st["engine"] ?? "") !== CARD_PLANE_ENGINE;
          return hasCard || hasWf || !foreign;
        }).map((st) => String(st["id"] ?? "?"));
        if (unjustified.length > 0) {
          failures.push(`${name}: no merge rows and unjustified stage(s) ${unjustified.join(", ")} — the sweep would pass vacuous`);
        } else if (stages.length > 0 && stages.every((st) => packSkipped.has(String(st["id"] ?? "?")))) {
          owed.push(`${name}: no stage judged — every stage pack-skipped on this box (${[...packSkipped].join(", ")}); on a packed box the same arm judges for real`);
        }
        continue;
      }
      try {
        planMerge(rows, initials, inputNames);
        merged += 1;
      } catch (e) {
        const text = (e as Error).message;
        // THE DOOR'S OWN VOICE, PINNED: the ambiguous-producers refusal walks the agent
        // through the declaration door (flowOutputBindings), never the agent-UNREACHABLE
        // "declare output_nodes" of the 2026-10-31 burn.
        if (/ambiguous producers/.test(text)) {
          if (!/flowOutputBindings/.test(text) || /declare output_nodes/.test(text)) {
            failures.push(`${name}: the merge refusal regressed to the unreachable voice — ${text}`.slice(0, 400));
          } else {
            failures.push(`${name}: the merge refused an unbound multi-save producer — ${text}`.slice(0, 400));
          }
          continue;
        }
        // THE WIRE law's finding, never the producer's: a single-save producer IS bound (the
        // arm above counted its one saver) — a channel the row names that the producer never
        // declared is the registry row's misaddress, owed to the flows lane, never landed red.
        const m = /upstream stage ("[^"]+") produces no such channel/.exec(text) ??
          /the upstream stage declares no mergeable producer/.exec(text);
        if (m !== null) {
          const upstreamId = /"[^"]+"/.exec(m[0]);
          const upstream = rows.find((r) => `"${r.stageId}"` === (upstreamId?.[0] ?? ""));
          const wf = (upstream?.workflow ?? {}) as Record<string, { class_type?: unknown }>;
          const saves = Object.values(wf).filter((n) => String(n?.class_type ?? "").startsWith("Save"));
          const upstreamCard = String(upstream?.card ?? "");
          const upstreamBound = upstreamCard !== "" && ((defs.get(upstreamCard)?.flowOutputBindings ?? []).length > 0);
          if (saves.length === 1 && !upstreamBound) {
            owed.push(`${name}: ${text.slice(0, 220)} — single-save producer, misaddressed wire (flows lane)`);
            continue;
          }
        }
        failures.push(`${name}: the merge refused — ${text}`.slice(0, 400));
      }
    }
    if (merged === 0) {
      failures.push("no registry flow reached the merge — the door never ran (every flow skipped or refused)");
    }
    assert.deepEqual(failures, [], "every registry flow must compose and merge:\n" + failures.join("\n"));
    for (const o of owed) console.log(`[producer-agreement OWED] ${o}`);
  });

  it("ARM 2 — the off-flow census: every producer no flow stages is bound (declared or one Save*)", async () => {
    const defs = await loadCardDefs();
    const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });
    const rawRows = JSON.parse(readFileSync(FACTS_PATH, "utf8")) as {
      rows: Record<string, { card?: string }>;
    };
    const staged = new Set<string>();
    for (const name of SEED.names()) {
      const decl = SEED.get(name);
      if (decl === undefined) continue;
      for (const st of expandRegistryFlow(decl, SEED).stages ?? []) {
        const c = (st as { card?: unknown }).card;
        if (typeof c === "string" && c !== "") staged.add(c);
      }
    }
    const findings: string[] = [];
    for (const def of defs.values()) {
      const outputs = (def as unknown as { flowKinds?: { outputs?: Record<string, unknown> } }).flowKinds?.outputs ?? {};
      if (Object.keys(outputs).length === 0) continue; // not a flow producer — nothing to bind
      const id = String((def as unknown as { id?: unknown }).id ?? "?");
      if ((def.flowOutputBindings ?? []).length > 0) continue; // declared — the first disjunct holds
      if (staged.has(id)) continue; // a flow stages it — ARM 1 judges its real presses
      if (def.requiresModel !== false) {
        findings.push(`${id}: unbound, off-flow, and requires a model — the keyless census cannot judge it (name it owed, never skip silent)`);
        continue;
      }
      // THE MODEL, DERIVED (the card-spec precedent): the card's own first facts row when the
      // file names one (sfx rides moss-sfx — DUMMY owns no family action), else DUMMY (mask).
      const modelId = Object.keys(rawRows.rows).sort().find((mid) => rawRows.rows[mid]?.card === id);
      const model: ModelFacts = modelId !== undefined ? (facts.models[modelId] as ModelFacts) : DUMMY;
      assert.ok(model !== undefined && model !== null, `${id}: facts names ${modelId} but loadFacts misses it`);
      // THE DERIVED PRESS MATRIX: the base press plus one press per list-kind bag, the entry
      // built from the kind's own field declarations (default, else the first declared option,
      // else the estate's own fill vocabulary) — never a hand-written bag.
      const arms: Array<{ label: string; seeds: Record<string, unknown> }> = [{ label: "base", seeds: {} }];
      for (const kind of def.mods ?? []) {
        const k = kind as unknown as {
          kind?: unknown; param_key?: unknown; cardinality?: unknown; fields?: readonly Record<string, unknown>[];
        };
        if (k.cardinality !== "list" || typeof k.param_key !== "string") continue;
        const entry: Record<string, unknown> = {};
        for (const f of k.fields ?? []) {
          const fname = String(f["name"] ?? "");
          if (fname === "") continue;
          const dflt = f["default"];
          if (dflt !== undefined && dflt !== "") {
            entry[fname] = dflt;
            continue;
          }
          const opts = f["options"];
          if (Array.isArray(opts) && opts.length > 0) {
            const first = opts[0] as Record<string, unknown>;
            if (first !== null && typeof first === "object" && "value" in first) {
              entry[fname] = first["value"];
              continue;
            }
          }
          entry[fname] = fillFor(fname, join(probeDir, "probe.png"));
        }
        arms.push({ label: String(k.kind ?? k.param_key), seeds: { [k.param_key]: [entry] } });
      }
      let composedAny = false;
      const multi: string[] = [];
      const voices: string[] = [];
      for (const arm of arms) {
        const probed = probeSeeded(def, arm.seeds, model);
        if (probed.graph === null) {
          const last = probed.refusals[probed.refusals.length - 1] ?? "no refusal recorded";
          voices.push(`${arm.label}: ${last.slice(0, 220)}`);
          continue;
        }
        composedAny = true;
        const saves = Object.entries(probed.graph).filter(([, n]) =>
          String((n as { class_type?: unknown }).class_type ?? "").startsWith("Save"));
        if (saves.length !== 1) {
          multi.push(`${arm.label} composes ${saves.length} Save* nodes (${saves.map(([nid]) => nid).join(", ") || "none"})`);
        }
      }
      if (!composedAny) {
        findings.push(`${id}: the census composed NO press (base + ${arms.length - 1} bag arms all refused) — unjudgeable is a finding, never a pass [${voices.join(" | ")}]`);
      }
      for (const m of multi) findings.push(`${id}: ${m} with no flowOutputBindings row — declare the bindings`);
    }
    assert.deepEqual(findings, [], "every off-flow producer must be bound:\n" + findings.join("\n"));
  });

  it("ARM 3 — every wired channel resolves in the producer table the start door builds", async () => {
    const failures: string[] = [];
    const owed: string[] = [];
    const names = SEED.names();
    assert.ok(names.length > 0, "the registry seed names no flows — the sweep would pass vacuous (LAW 4 AXIS 1)");
    let judged = 0;
    let merged = 0;
    for (const name of names) {
      const decl = SEED.get(name);
      assert.ok(decl !== undefined, `registry names ${name} but the getter misses it`);
      // the door's own order: expand, COMPOSE the family stages, inline.
      const composed = composeFamilyStages(expandRegistryFlow(decl!, SEED), liveFamilySeat().decls, liveFamilySeat().state);
      const inlineDoc = registryFlowToInline(composed) as { stages?: StageRow[] };
      const stages: StageRow[] = Array.isArray(inlineDoc.stages) ? inlineDoc.stages : [];
      const validators = (decl as unknown as { initialValidators?: Record<string, string> }).initialValidators ?? {};
      const initials: Record<string, EngineJson> = {};
      for (const [k, v] of Object.entries(validators)) initials[k] = probeInitial(String(v)) as EngineJson;
      // THE START DOOR'S OWN PRODUCER TABLE: every card stage through the real
      // composeCardStageRow (white-box, the door itself), family rows graph-first,
      // then the REAL compileFlowInline over the composed doc — the exact table
      // start registers. Never a re-spelling of either leg.
      const judgeable: StageRow[] = [];
      const unjudgeable = new Set<string>();
      for (const [i, st] of stages.entries()) {
        const sid = typeof st["id"] === "string" && st["id"] !== "" ? String(st["id"]) : "s_" + String(i);
        const card = typeof st["card"] === "string" ? String(st["card"]) : "";
        if (card !== "") {
          try {
            const composedStage = await (runSvc as unknown as {
              composeCardStageRow: (row: StageRow, id: string, runId: string, label: string) => Promise<StageRow>;
            }).composeCardStageRow(st, sid, "wall-producer-arm3", "wall stage ");
            // the composed door output is cardless (the compiler refuses card= rows —
            // the registry path composes them first, exactly as the start door does).
            const { card: _dropped, ...rest } = st;
            void _dropped;
            judgeable.push({
              ...rest,
              id: sid,
              params: composedStage["params"] as Record<string, unknown>,
              inputs: st["inputs"] as Record<string, unknown>,
              outputs: composedStage["outputs"] as Record<string, unknown>,
            });
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (/missing-extension/.test(message)) {
              unjudgeable.add(sid);
              owed.push(`${name}/${sid}: pack-skipped on this box — ${message.slice(0, 160)}`);
            } else {
              failures.push(`${name}/${sid}: the start door's own compose refuses — ${message.slice(0, 220)}`);
              unjudgeable.add(sid);
            }
          }
          continue;
        }
        const params = st["params"];
        const workflow = typeof params === "object" && params !== null && !Array.isArray(params)
          ? (params as Record<string, unknown>)["workflow"]
          : undefined;
        if (workflow !== undefined) {
          judgeable.push({ ...st, id: sid });
          continue;
        }
        // an engine row with no card and no graph never reaches planMerge (craft-loop).
        unjudgeable.add(sid);
        owed.push(`${name}/${sid}: structural skip — no card, no params.workflow (never reaches planMerge)`);
      }
      if (judgeable.length === 0) {
        owed.push(`${name}: no stage judged — every stage unjudgeable on this box; on a packed box the same arm judges for real`);
        continue;
      }
      // THE REAL COMPILER over the composed doc (known engines: the card plane —
      // every judgeable row rides it; structural engine rows were skipped above).
      const compiledOut = compileFlowInline(
        { id: name, stages: judgeable },
        [CARD_PLANE_ENGINE],
      ) as { stages?: Array<{ id: string; outputs: Record<string, unknown> }> } | { payload: { error: string } };
      if ("payload" in compiledOut) {
        failures.push(`${name}: the start door's own compiler refuses the composed doc — ${String(compiledOut.payload.error).slice(0, 220)}`);
        continue;
      }
      const table = new Map<string, Map<string, string>>();
      for (const row of compiledOut.stages ?? []) {
        const outs = new Map<string, string>();
        for (const [k, v] of Object.entries(row.outputs ?? {})) {
          if (typeof v === "string") outs.set(k, v);
        }
        table.set(row.id, outs);
      }
      // every FromStage wire in the ROWS (downstream pack-skip excuses nothing —
      // the wire is a row fact) resolves in the upstream's door-built table.
      for (const st of stages) {
        const sid = typeof st["id"] === "string" && st["id"] !== "" ? String(st["id"]) : "";
        const inputs = st["inputs"];
        if (typeof inputs !== "object" || inputs === null || Array.isArray(inputs)) continue;
        for (const [iname, edge] of Object.entries(inputs as Record<string, unknown>)) {
          if (typeof edge !== "object" || edge === null || Array.isArray(edge)) continue;
          const e = edge as Record<string, unknown>;
          if (typeof e["stage"] !== "string" || typeof e["output"] !== "string") continue;
          const up = String(e["stage"]);
          const channel = String(e["output"]);
          if (unjudgeable.has(up)) {
            owed.push(`${name}/${sid} input ${iname}: upstream ${up} unjudgeable on this box — wire unchecked here`);
            continue;
          }
          const outs = table.get(up);
          if (outs === undefined) {
            failures.push(`${name}/${sid} input ${iname}: upstream ${up} has no producer table at all`);
            continue;
          }
          judged++;
          if (!outs.has(channel)) {
            failures.push(
              `${name}/${sid} input ${iname}: wires channel ${JSON.stringify(channel)} — ` +
              `upstream stage ${JSON.stringify(up)} produces no such channel ` +
              `(the door's table: ${JSON.stringify([...outs.keys()].sort())})`,
            );
          }
        }
      }
      // belt: the merge itself must take the door-built rows (no wire owed-escape).
      const rows: MergeRow[] = [];
      const inputNames: Record<string, Record<string, string>> = {};
      let rowsOk = true;
      for (const row of compiledOut.stages ?? []) {
        const src = judgeable.find((s) => String(s["id"]) === row.id);
        const params = (src?.["params"] ?? {}) as Record<string, unknown>;
        const workflow = params["workflow"];
        if (typeof workflow !== "object" || workflow === null || Array.isArray(workflow)) {
          rowsOk = false;
          break;
        }
        rows.push({
          stageId: row.id,
          card: undefined,
          workflow: workflow as Record<string, EngineJson>,
          outputs: row.outputs as Record<string, EngineJson>,
          outputNodes: ((params["output_nodes"] ?? {}) as Record<string, EngineJson>),
          params: params as Record<string, EngineJson>,
        });
        inputNames[row.id] = {};
        const srcInputs = src?.["inputs"];
        if (typeof srcInputs === "object" && srcInputs !== null && !Array.isArray(srcInputs)) {
          for (const [iname, edge] of Object.entries(srcInputs as Record<string, unknown>)) {
            if (typeof edge !== "object" || edge === null || Array.isArray(edge)) continue;
            const e = edge as Record<string, unknown>;
            if (typeof e["stage"] === "string" && typeof e["output"] === "string") {
              inputNames[row.id]![iname] = String(e["stage"]) + "." + String(e["output"]);
            } else if (typeof e["initial"] === "string") {
              inputNames[row.id]![iname] = "__initial__." + String(e["initial"]);
            }
          }
        }
      }
      if (!rowsOk || rows.length === 0) continue;
      try {
        planMerge(rows, initials, inputNames);
        merged++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (/missing-extension/.test(message)) {
          owed.push(`${name}: merge pack-skipped on this box — ${message.slice(0, 160)}`);
        } else {
          failures.push(`${name}: planMerge refuses the door-built rows — ${message.slice(0, 240)}`);
        }
      }
    }
    assert.ok(judged > 0, "ARM 3 judged no wires — the sweep would pass vacuous (LAW 4 AXIS 1)");
    assert.deepEqual(failures, [], "every wired channel resolves in the start door's producer table:\n" + failures.join("\n") + "\n(owed, not failures:\n" + owed.join("\n") + ")");
  });

  it("ARM 4 — the default fill's kind equals the stage card's declared output media kind", async () => {
    const defs = await loadCardDefs();
    const kindFailures: string[] = [];
    const tableFailures: string[] = [];
    const owed: string[] = [];
    const names = SEED.names();
    assert.ok(names.length > 0, "the registry seed names no flows — the sweep would pass vacuous (LAW 4 AXIS 1)");
    let judged = 0;
    for (const name of names) {
      const decl = SEED.get(name);
      assert.ok(decl !== undefined, `registry names ${name} but the getter misses it`);
      const composed = composeFamilyStages(expandRegistryFlow(decl!, SEED), liveFamilySeat().decls, liveFamilySeat().state);
      const inlineDoc = registryFlowToInline(composed) as { stages?: StageRow[] };
      const stages: StageRow[] = Array.isArray(inlineDoc.stages) ? inlineDoc.stages : [];
      for (const [i, st] of stages.entries()) {
        const sid = typeof st["id"] === "string" && st["id"] !== "" ? String(st["id"]) : "s_" + String(i);
        const card = typeof st["card"] === "string" ? String(st["card"]) : "";
        if (card === "") continue;
        const def = defs.get(card);
        if (def === undefined) {
          kindFailures.push(`${name}/${sid}: card ${JSON.stringify(card)} names no registered card def`);
          continue;
        }
        const declared = (def as unknown as { flowKinds?: { outputs?: Record<string, unknown> } }).flowKinds?.outputs ?? {};
        if (Object.keys(declared).length === 0) continue; // not a producer card — nothing to kind-check
        // THE START DOOR'S OWN TABLE for this stage (white-box compose, the door itself).
        let finalOutputs: Record<string, unknown>;
        try {
          const composedStage = await (runSvc as unknown as {
            composeCardStageRow: (row: StageRow, id: string, runId: string, label: string) => Promise<StageRow>;
          }).composeCardStageRow(st, sid, "wall-producer-arm4", "wall stage ");
          finalOutputs = (composedStage["outputs"] ?? {}) as Record<string, unknown>;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          if (/missing-extension/.test(message)) {
            owed.push(`${name}/${sid}: pack-skipped on this box — ${message.slice(0, 160)}`);
            continue;
          }
          kindFailures.push(`${name}/${sid}: the start door's own compose refuses — ${message.slice(0, 220)}`);
          continue;
        }
        // (a) end-to-end kind law, ONLY where the row declares no outputs (the fill/
        // fallback leg supplies them — image-upscale is the live seat): the composed row
        // (the door's own compose output) through the REAL compileFlowInline, cardless
        // with card_io intact — the final kinds equal the card's declared kinds. Rows
        // that declare outputs narrow the card on purpose (the retired tts wrapper
        // published only wav of {audio, voice}) — the row's own declaration is ARM 1
        // + registry-wall territory, never this arm.
        const rowOutputs = st["outputs"];
        const rowEmpty = typeof rowOutputs !== "object" || rowOutputs === null || Object.keys(rowOutputs).length === 0;
        const declaredKinds = Object.values(declared).filter((v): v is string => typeof v === "string").sort();
        if (rowEmpty) {
          judged++;
          const endProbe = compileFlowInline(
            {
              id: "fill-probe",
              stages: [{
                id: "s",
                engine: CARD_PLANE_ENGINE,
                params: {},
                inputs: {},
                outputs: { ...finalOutputs },
                card_io: st["card_io"] as Record<string, unknown>,
                expected: {},
              }],
            },
            [CARD_PLANE_ENGINE],
          ) as { stages?: Array<{ outputs: Record<string, unknown> }> } | { payload: { error: string } };
          if ("payload" in endProbe) {
            kindFailures.push(`${name}/${sid}: the door's own compiler refuses the composed row — ${String(endProbe.payload.error).slice(0, 220)}`);
          } else {
            const filledKinds = Object.values(endProbe.stages?.[0]?.outputs ?? {}).filter((v): v is string => typeof v === "string").sort();
            if (JSON.stringify(filledKinds) !== JSON.stringify(declaredKinds)) {
              kindFailures.push(
                `${name}/${sid}: the fill leg publishes kinds ${JSON.stringify(filledKinds)} for card ` +
                `${JSON.stringify(card)} declaring ${JSON.stringify(declaredKinds)}`,
              );
            }
          }
        }
        // (b) the fill leg, directly: outputs emptied, card_io intact, through the REAL
        // compileFlowInline — the filled outputs must equal the row's cardIo (the ONE
        // TABLE both doors read), never the engine table's {default: <engine kind>}.
        const rowCardIo = st["card_io"];
        if (typeof rowCardIo !== "object" || rowCardIo === null || Array.isArray(rowCardIo)) continue;
        const cardIoEntries = Object.entries(rowCardIo as Record<string, unknown>).filter(([, v]) => typeof v === "string");
        if (cardIoEntries.length === 0) continue;
        const fillProbe = compileFlowInline(
          {
            id: "fill-probe",
            stages: [{
              id: "s",
              engine: CARD_PLANE_ENGINE,
              params: {},
              inputs: {},
              outputs: {},
              card_io: Object.fromEntries(cardIoEntries),
              expected: {},
            }],
          },
          [CARD_PLANE_ENGINE],
        ) as { stages?: Array<{ outputs: Record<string, unknown> }> } | { payload: { error: string } };
        if ("payload" in fillProbe) {
          tableFailures.push(`${name}/${sid}: the fill leg refuses a card_io-carrying stage — ${String(fillProbe.payload.error).slice(0, 220)}`);
          continue;
        }
        judged++;
        if (JSON.stringify(fillProbe.stages?.[0]?.outputs) !== JSON.stringify(Object.fromEntries(cardIoEntries))) {
          tableFailures.push(
            `${name}/${sid}: the default fill must read the card's cardIo table (the ONE TABLE), ` +
            `never the engine table — card ${JSON.stringify(card)} declares ${JSON.stringify(Object.fromEntries(cardIoEntries))}, ` +
            `the fill published ${JSON.stringify(fillProbe.stages?.[0]?.outputs)}`,
          );
        }
      }
    }
    assert.ok(judged > 0, "ARM 4 judged no card stages — the sweep would pass vacuous (LAW 4 AXIS 1)");
    // kind-lies first (music-native's {default: "image"} mislabel was the founding
    // failure; the row retired 2026-11-14, the ordering stays).
    const failures = [...kindFailures, ...tableFailures];
    assert.deepEqual(failures, [], "the default fill's kind equals the stage card's declared output media kind:\n" + failures.join("\n") + "\n(owed, not failures:\n" + owed.join("\n") + ")");
  });

  // ARM 5 — THE LINK-TYPE LAW (2026-11-01, the rig-hop dead ref, GPU
  // live-receipt C9): arms 1–4 judge the FLOW plane (producer binding,
  // wire channels, media kinds) — no arm judged the plane EDGE the
  // engine actually refuses: a producer link's ENGINE slot type against
  // the consumer input's ENGINE type. character-factory's lift→rig wire
  // sailed every arm here for its whole life while the live engine
  // refused the merged graph — `rig::PrimitiveString.0: Return type
  // mismatch between linked nodes (silently dropping rig::KimodoExportFBX.0 +
  // motion::RaySomaxBake.0)` — the family-coverage lesson one plane
  // deeper: card→family had a judge, flow→engine-slot had none, and the
  // operator hit the dead flow under an all-green suite.
  //
  // The arm replays the engine's return_type_mismatch validation
  // (execution.py validate_inputs → validate_node_input, non-strict
  // overlap) over EVERY registry flow's REAL merged graph (the same
  // compose → planMerge chain ARM 1 rides — the door, never a
  // re-spelling), with the TRACKED FULL BOOT CENSUS
  // (tests/walls/fixtures/object_info.boot.json — the engine's own
  // recorded object_info, the same bytes the boot-derived walls read)
  // as the served truth. Any link whose received slot type does not
  // overlap the consumer's declared input type is the silent-drop
  // class itself — RED, named flow/node/input. A class missing from
  // the census is the PACK law's finding (the hermetic boot records
  // this box's build) — owed, never a silent skip.
  it("ARM 5 — every merged graph's in-graph links carry engine slot types the served census links (the silent-drop class)", async () => {
    type CensusRow = {
      input?: { required?: Record<string, unknown>; optional?: Record<string, unknown> };
      output?: unknown[];
    };
    const census = JSON.parse(
      readFileSync(new URL("../../fixtures/object_info.boot.json", import.meta.url), "utf8"),
    ) as Record<string, CensusRow>;
    assert.ok(Object.keys(census).length > 0, "the boot census is non-empty (the arm has a served truth)");
    /** The engine's validate_node_input, non-strict: exact, '*', or
     *  comma-set overlap. (Union __ne__ overrides cannot exist in a
     *  JSON census — the served types are plain strings.) */
    const typesLink = (received: string, expected: string): boolean => {
      if (received === expected || received === "*" || expected === "*") return true;
      const r = received.split(",").map((s) => s.trim());
      const e = new Set(expected.split(",").map((s) => s.trim()));
      return r.some((t) => e.has(t));
    };
    const inputType = (row: CensusRow, name: string): string | null => {
      for (const sec of (["required", "optional"] as const)) {
        const v = row.input?.[sec]?.[name];
        if (Array.isArray(v) && typeof v[0] === "string") return v[0];
      }
      return null; // combo list or absent — no link can land there
    };
    const failures: string[] = [];
    const owed: string[] = [];
    const names = SEED.names();
    assert.ok(names.length > 0, "the registry seed names no flows — the sweep would pass vacuous (LAW 4 AXIS 1)");
    let judged = 0;
    let links = 0;
    for (const name of names) {
      const decl = SEED.get(name);
      assert.ok(decl !== undefined, `registry names ${name} but the getter misses it`);
      const composed = composeFamilyStages(expandRegistryFlow(decl!, SEED), liveFamilySeat().decls, liveFamilySeat().state);
      const inlineDoc = registryFlowToInline(composed) as { stages?: StageRow[] };
      const stages: StageRow[] = Array.isArray(inlineDoc.stages) ? inlineDoc.stages : [];
      const validators = (decl as unknown as { initialValidators?: Record<string, string> }).initialValidators ?? {};
      const initials: Record<string, EngineJson> = {};
      for (const [k, v] of Object.entries(validators)) initials[k] = probeInitial(String(v)) as EngineJson;
      const rows: MergeRow[] = [];
      const inputNames: Record<string, Record<string, string>> = {};
      let packSkipped = false;
      for (const st of stages) {
        const sid = String(st["id"] ?? "?");
        const rowInputs = (typeof st["inputs"] === "object" && st["inputs"] !== null && !Array.isArray(st["inputs"]))
          ? (st["inputs"] as Record<string, unknown>)
          : {};
        const namesFor: Record<string, string> = {};
        for (const [iname, ref] of Object.entries(rowInputs)) {
          const rr = ref as Record<string, unknown>;
          if (typeof rr === "object" && rr !== null && !Array.isArray(rr) &&
            typeof rr["stage"] === "string" && typeof rr["output"] === "string") {
            namesFor[iname] = `${String(rr["stage"])}.${String(rr["output"])}`;
          } else if (typeof rr === "object" && rr !== null && !Array.isArray(rr) &&
            typeof rr["initial"] === "string") {
            const key = String(rr["initial"]);
            namesFor[iname] = `__initial__.${key}`;
            if (initials[key] === undefined) initials[key] = probeInitial(validators[key] ?? "text") as EngineJson;
          }
        }
        const card = typeof st["card"] === "string" ? st["card"] : "";
        if (card === "") continue; // engine/family rows merge graph-first or never merge (craft-loop)
        try {
          const composedStage = await (runSvc as unknown as {
            composeCardStageRow: (row: unknown, id: string, runId: string, label: string) => Promise<StageRow>;
          }).composeCardStageRow(st, sid, "wall-linktype", "wall ");
          inputNames[sid] = namesFor;
          rows.push({
            stageId: sid, card,
            workflow: ((composedStage["params"] as Record<string, unknown>)["workflow"] ?? {}) as MergeRow["workflow"],
            outputs: (composedStage["outputs"] ?? {}) as MergeRow["outputs"],
            outputNodes: ((composedStage["params"] as Record<string, unknown>)["output_nodes"] ?? {}) as MergeRow["outputNodes"],
            params: (composedStage["params"] ?? {}) as MergeRow["params"],
          });
        } catch (e) {
          const text = (e as Error).message;
          if (/missing-extension/.test(text)) {
            packSkipped = true;
            owed.push(`${name}/${sid}: pack-skipped on this box — ${text.slice(0, 160)}`);
          } else {
            failures.push(`${name}/${sid}: compose refused — ${text}`.slice(0, 300));
          }
        }
      }
      if (rows.length === 0) {
        if (!packSkipped && stages.some((st) => typeof st["card"] === "string" && st["card"] !== "")) {
          failures.push(`${name}: no card stage composed — the link sweep would pass vacuous`);
        }
        continue;
      }
      let workflow: Record<string, Record<string, unknown>>;
      try {
        ({ workflow } = planMerge(rows, initials, inputNames) as { workflow: Record<string, Record<string, unknown>> });
      } catch (e) {
        const text = (e as Error).message;
        if (/missing-extension/.test(text)) {
          owed.push(`${name}: merge pack-skipped on this box — ${text.slice(0, 160)}`);
          continue;
        }
        failures.push(`${name}: the merge refused — ${text}`.slice(0, 300));
        continue;
      }
      // THE ENGINE'S LINK VALIDATION, REPLAYED: every [node, slot]
      // link input is judged against the census (the boot double).
      for (const [nid, node] of Object.entries(workflow)) {
        const cls = String(node["class_type"] ?? "");
        const info = census[cls];
        if (info === undefined) {
          owed.push(`${name}/${nid}: class ${cls} is not in the boot census (the pack law's finding — the hermetic boot records this box's build)`);
          continue;
        }
        const inputs = node["inputs"];
        if (typeof inputs !== "object" || inputs === null) continue;
        for (const [iname, val] of Object.entries(inputs as Record<string, unknown>)) {
          if (!Array.isArray(val) || val.length !== 2 || typeof val[0] !== "string" || typeof val[1] !== "number") continue;
          links += 1;
          const srcId = val[0] as string;
          const slot = val[1] as number;
          const src = workflow[srcId] as { class_type?: unknown } | undefined;
          if (src === undefined) continue; // the merge's own dangling gate owns this shape
          const srcCls = String(src["class_type"] ?? "");
          const srcInfo = census[srcCls];
          if (srcInfo === undefined) {
            owed.push(`${name}/${nid} input ${iname}: source class ${srcCls} is not in the boot census (the pack law's finding)`);
            continue;
          }
          const received = Array.isArray(srcInfo.output) ? (srcInfo.output[slot] as string | undefined) : undefined;
          const expected = inputType(info, iname);
          if (typeof received !== "string") {
            owed.push(`${name}/${nid} input ${iname}: ${srcCls} slot ${String(slot)} has no served output type in the census`);
            continue;
          }
          if (expected === null) continue; // combo/absent — no link can land there
          if (!typesLink(received, expected)) {
            failures.push(
              `${name}/${nid} input ${iname}: the link from ${srcCls}.${String(slot)} returns ${received} ` +
              `into ${cls}.${iname} (declared ${expected}) — the engine refuses this link ` +
              `(return_type_mismatch; its estate voice is "silently dropped outputs" — the C9 class)`,
            );
          }
          judged += 1;
        }
      }
    }
    assert.ok(links > 0, "ARM 5 saw no in-graph links — the sweep would pass vacuous (LAW 4 AXIS 1)");
    assert.ok(judged > 0, "ARM 5 judged no link against the census — the served truth never answered");
    assert.deepEqual(failures, [], "every merged graph's links must carry served engine types:\n" + failures.join("\n") + "\n(owed, not failures:\n" + owed.join("\n") + ")");
  });
  it("ARM 6 — the initial-grammar law: an initial-bound $spell never lands on a tensor slot (admission refusal + the two legal counter-shapes)", async () => {
    // THE BURN CLASS (audit 2026-11-14-initial-grammar-gap): a
    // $spell bound to an INITIAL resolves at the merge to the
    // initial's VALUE — legal on a value dial or a Load* file slot,
    // a BURN on a tensor slot (the F48 voices→ref_audios shape: the
    // kind gate green, the node handed a string where the engine
    // wants a link). The run seat must refuse at ADMISSION, judging
    // the SEAT the spell sits on in the COMPOSED graph against the
    // engine's own served slot types — never the media KIND (rig's
    // mesh_glb is a "mesh" port that legally takes an initial $glb:
    // a LoadGLB path seat; character-factory runs green).
    const burn = {
      id: "film",
      engine: "comfyui",
      card: "h3-timeline",
      description: "the initial-tensor burn probe (the F48 voices class)",
      inputs: { ref_audios: { initial: "ref_audios" } },
      params: {
        model: "h3-timeline",
        length: 56,
        calls: [{ text: "a slow push in", start_frame: 0, end_frame: 56 }],
        ref_audios: ["$ref_audios"],
      },
    };
    await assert.rejects(
      () => (runSvc as unknown as {
        composeCardStageRow: (row: unknown, id: string, runId: string, label: string) => Promise<StageRow>;
      }).composeCardStageRow(burn, "film", "wall-initial-grammar", "wall "),
      (e: Error) => {
        assert.match(e.message, /node "PlagueKindBundleIn" input "input_16" carries \$ref_audios but input "ref_audios" is an initial binding/);
        assert.match(e.message, /the initial's VALUE would land in the engine's "\*" slot, which wants a link/);
        assert.match(e.message, /Wire the input from a prior stage's output, or feed the file through the card's own loader param/);
        return true;
      },
    );
    // COUNTER-SHAPE 1 — the SAME tensor slot with a STAGE-bound
    // spell is the healthy grammar (image-upscale's polish:
    // input_image: "$image" wired from make's output).
    // COUNTER-SHAPE 2 — an initial-bound spell on a LOAD* file seat
    // is the healthy grammar too (character-factory's $mesh on rig's
    // LoadGLB path seat — the row that falsified the media-kind
    // judgment; the retired extend-video's $source_clip rode the same
    // law). All must compose CLEAN through the same seat.
    const owedPacks: string[] = [];
    let composedCount = 0;
    // (the retired wrappers — extend-video, body-to-somax — left
    // this probe 2026-11-14; both surviving counter-shape rows stay)
    for (const name of ["image-upscale", "character-factory"]) {
      const decl = SEED.get(name);
      assert.ok(decl !== undefined, `registry names no ${name} flow — the counter-shape probe is vacuous`);
      const composed = composeFamilyStages(expandRegistryFlow(decl!, SEED), liveFamilySeat().decls, liveFamilySeat().state);
      const inlineDoc = registryFlowToInline(composed) as { stages?: StageRow[] };
      const stages: StageRow[] = Array.isArray(inlineDoc.stages) ? inlineDoc.stages : [];
      assert.ok(stages.length > 0, `${name} inlines no stages`);
      for (const st of stages) {
        const card = typeof st["card"] === "string" ? st["card"] : "";
        if (card === "") continue;
        try {
          const composedStage = await (runSvc as unknown as {
            composeCardStageRow: (row: unknown, id: string, runId: string, label: string) => Promise<StageRow>;
          }).composeCardStageRow(st, String(st["id"] ?? "?"), `wall-grammar-${name}`, "wall ");
          assert.ok(
            (composedStage["params"] as Record<string, unknown>)["workflow"] !== undefined,
            `${name} composed no workflow`,
          );
          composedCount += 1;
        } catch (e) {
          const text = (e as Error).message;
          if (/missing-extension/.test(text)) {
            owedPacks.push(`${name}: pack-skipped on this box — ${text.slice(0, 160)}`);
          } else {
            throw new Error(`${name} refused clean compose — the initial-tensor rule false-fires: ${text}`);
          }
        }
      }
    }
    assert.ok(composedCount > 0, `both counter-shapes pack-skipped — the false-positive guard is vacuous (owed: ${owedPacks.join("; ")})`);
  });
});

/** The seed-aware probe loop: the base press plus bag-seeded presses, filled with the estate's
 *  own vocabulary (namedMulti/undeclaredNames/fillFor — the dead-card wall's parsers, one home).
 *  Seeds ride marked-filled (a refusal naming a seeded bag is the seed's own illegality, never
 *  a fill); a name matching a seeded entry field patches the ENTRY (top-level fills would strand
 *  on the card's undeclared-key gate); a `$.foo expected array` refusal wraps the list (the
 *  image-edit ordered-list voice); anything else fills top-level. Null = no press composed. */
function probeSeeded(
  def: {
    schema: (v: unknown) => Record<string, unknown>;
    compose: (params: Record<string, unknown>, model: ModelFacts, g: GraphBuilder, runId: string) => void;
    mods?: readonly unknown[];
  },
  seeds: Record<string, unknown>,
  model: ModelFacts,
): { graph: Record<string, { class_type?: unknown }> | null; refusals: string[] } {
  const estateFile = join(probeDir, "probe.png");
  const seedKeys = new Set(Object.keys(seeds));
  const seedFields = new Map<string, string>();
  for (const [bag, entries] of Object.entries(seeds)) {
    if (!Array.isArray(entries)) continue;
    for (const e of entries as Array<unknown>) {
      if (typeof e !== "object" || e === null) continue;
      for (const f of Object.keys(e as Record<string, unknown>)) seedFields.set(f, bag);
    }
  }
  const doc: Record<string, unknown> = {};
  const filled = new Set<string>(seedKeys);
  const patched = new Set<string>();
  const refusals: string[] = [];
  for (let round = 0; round < 14; round++) {
    try {
      const g = new GraphBuilder();
      def.compose(def.schema({ ...seeds, ...doc }) as Record<string, unknown>, model, g, "producer-census");
      const graph = g.toJSON() as Record<string, { class_type?: unknown }>;
      if (typeof graph === "object" && graph !== null && Object.keys(graph).length > 0) return { graph, refusals };
      return { graph: null, refusals };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      refusals.push(message);
      let deleted = false;
      for (const name of undeclaredNames(message)) {
        if (name in doc) {
          delete doc[name];
          filled.delete(name);
          deleted = true;
        }
      }
      const arrayNeed = /\$\.([A-Za-z0-9_]+) expected array/.exec(message);
      if (arrayNeed !== null) {
        const arrName = arrayNeed[1] as string;
        const f = fillFor(arrName, estateFile);
        doc[arrName] = Array.isArray(f) ? f : [f];
        filled.add(arrName);
        continue;
      }
      const named = namedMulti(message);
      const enumOffer = /expected "([^"]+)"/.exec(message);
      const fresh = enumOffer ? named : named.filter((n) => !filled.has(n));
      if (fresh.length === 0 && !deleted) return { graph: null, refusals };
      for (const name of fresh) {
        filled.add(name);
        const value = enumOffer ? enumOffer[1] : fillFor(name, estateFile);
        const bag = seedFields.get(name);
        if (bag !== undefined && !patched.has(`${bag}.${name}`) && !enumOffer) {
          patched.add(`${bag}.${name}`);
          const arr = (seeds[bag] as Array<Record<string, unknown>>).slice();
          arr[0] = { ...(arr[0] as Record<string, unknown>), [name]: value };
          (seeds as Record<string, unknown>)[bag] = arr;
        } else {
          doc[name] = value;
        }
      }
    }
  }
  return { graph: null, refusals };
}

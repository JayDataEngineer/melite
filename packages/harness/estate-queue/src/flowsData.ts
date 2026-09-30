// flowsData.ts — the TS flow-authoring plane, RE-HOMED (REBUILD-13,
// 2026-09-10): the named-flow declarations that lived in the dead
// gateway package (doors/flowsRegistry.ts, killed with the gateway
// app — KILL commit 40b57f94) live HERE as data, beside their
// serving owners (the runs registry {flow:} arms). Port verbatim:
// the eleven declarations, the live from_flow expansion, and the
// inline shim (registryFlowToInline) — validate and start resolve
// stages LIVE through expandRegistryFlow, no snapshot drift.
//
// THE COMPILE-TIME INITIAL GATE (REBUILD-21, the deferral closed):
// registryInitialsError + checkFileInitial + InitialsRoots port
// verbatim (photo/glb file-initial checks + bake_params via the
// re-homed belt); the runs registry's {flow:} arms run it BEFORE
// any run registers — start can never queue what validate refuses.
//
// QUEUE LANE LAW unchanged: no legacy (no flow.py read — existence
// rides this registry), no fallbacks, no hardcodes.
//
// Erasable-syntax TS only (node --experimental-strip-types).
import { LEGACY_RUN_MEDIA_PREFIX, RUN_MEDIA_PREFIX } from "@melite/contracts/benchStage";
import { statSync } from "node:fs";
import { join, resolve } from "node:path";
import { mediaVocab } from "./mediaKinds.ts";
import { validateBakeParams } from "./bakeParams.ts";

function isFile(p: string): boolean {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

/** One initial edge: {"initial": key} (the operator-supplied wire). */
export interface RegistryInitialEdge {
  readonly initial: string;
}

/** One stage edge: {"stage": id, "output": name} (an earlier stage). */
export interface RegistryStageEdge {
  readonly stage: string;
  readonly output: string;
}

export type RegistryEdge = RegistryInitialEdge | RegistryStageEdge;

/** A from_flow row (Stage.from_flow — the live reference): the
 *  stage is COPIED from the named flow's stage at expansion time
 *  (id overridden, inputs overridden), so the source stays the
 *  single truth — never a snapshot. */
export interface RegistryFromFlow {
  readonly flow: string;
  readonly stage: string;
}

/** One authoring-stage row (the Stage(...) fields, JSON-shaped). */
export interface RegistryStage {
  readonly id: string;
  readonly engine: string;
  readonly card: string;
  readonly description: string;
  readonly inputs: Record<string, RegistryEdge>;
  readonly expected: Record<string, string>;
  readonly outputs: Record<string, string>;
  readonly cardIo: Record<string, string>;
  readonly params: Record<string, unknown>;
  readonly skipWhen: { readonly initial: string; readonly when: string } | null;
  readonly fromFlow: RegistryFromFlow | null;
}

/** The compile-time initial kinds (flow.initial_validators). */
export type RegistryInitialKind = "photo" | "glb" | "bake_params";

/** One headless-tool overlay (FlowToolOverlay: tool param -> the
 *  stage doc path it stamps, with the value choices map). */
export interface RegistryToolOverlay {
  readonly param: string;
  readonly stage: string;
  readonly path: readonly string[];
  readonly choices: Record<string, string> | null;
}

/** One headless-tool property (FlowToolProperty). */
export interface RegistryToolProperty {
  readonly ptype: string;
  readonly description: string;
  readonly default: unknown;
  readonly hasDefault: boolean;
  readonly minimum: number | null;
  readonly maximum: number | null;
  readonly enum: readonly string[] | null;
}

/** The headless surface (FlowTool: name + version + schema +
 *  required + overlays). Absent (null) on flows with no tool=. */
export interface RegistryTool {
  readonly name: string;
  readonly version: number;
  readonly description: string;
  readonly properties: Record<string, RegistryToolProperty>;
  readonly required: readonly string[];
  readonly overlays: readonly RegistryToolOverlay[];
}

/** One named flow (the Flow(...) declaration, JSON-shaped). */
export interface RegistryFlow {
  readonly id: string;
  readonly description: string;
  readonly stages: readonly RegistryStage[];
  readonly initialValidators: Record<string, RegistryInitialKind>;
  readonly tool: RegistryTool | null;
  readonly skillRefs: readonly string[];
}

// ── shared builders ─────────────────────────────────────────────

export function initial(key: string): RegistryInitialEdge {
  return { initial: key };
}

export function fromStage(stage: string, output: string): RegistryStageEdge {
  return { stage, output };
}

export function plainStage(row: {
  readonly id: string;
  readonly engine: string;
  readonly card?: string;
  readonly description: string;
  readonly inputs: Record<string, RegistryEdge>;
  readonly expected?: Record<string, string>;
  readonly outputs?: Record<string, string>;
  readonly cardIo?: Record<string, string>;
  readonly params: Record<string, unknown>;
  readonly skipWhen?: { readonly initial: string; readonly when: string } | null;
}): RegistryStage {
  return {
    id: row.id,
    engine: row.engine,
    card: row.card ?? "",
    description: row.description,
    inputs: row.inputs,
    expected: row.expected ?? {},
    outputs: row.outputs ?? {},
    cardIo: row.cardIo ?? {},
    params: row.params,
    skipWhen: row.skipWhen ?? null,
    fromFlow: null,
  };
}

export function linkedStage(
  flow: string,
  stage: string,
  id: string,
  inputs: Record<string, RegistryEdge>,
): RegistryStage {
  return {
    id,
    engine: "",
    card: "",
    description: "",
    inputs,
    expected: {},
    outputs: {},
    cardIo: {},
    params: {},
    skipWhen: null,
    fromFlow: { flow, stage },
  };
}

// ── the eleven declarations ─────────────────────────────────────












/** The craft loop (stroke 55, plan §2.3): ONE engine stage on
 *  'craft' — act (a nested engine command) → capture (run-dir
 *  artifacts) → critique (the image-capable route, the capture
 *  attached) → decide (done | refine-with-next-command), bounded
 *  by max_iterations (default unlimited, hard cap 1000). The
 *  operator's card sketch verbatim: model dropdown, inputs
 *  (generic), prompt for the agent, optional max iterations. The
 *  stage params carry those four fields at DRIVE time (the agent
 *  composes them into the start doc; the registry row is the
 *  template + the agent leaf). */

/** The agent spawner (stroke 61, plan §5): ONE engine stage on
 *  'agent' — a general tool-calling loop with the task as its brief
 *  (packages/engines/agent). The operator's card sketch verbatim:
 *  MCPs (blender, unity, custom), skills (dreamshot…), max turns
 *  (default unlimited), inputs (the plus-box list). The stage
 *  params carry those fields at DRIVE time; the registry row is
 *  the template + the agent leaf. */

import { ANNY_HMR,
  ANNY_HMR_COMMERCIAL,
  ANNY_PARAMS,
  AUDIO_NATIVE_TTS,
  BODY_TO_SOMAX,
  CHARACTER,
  FIT_SEAT,
  IMAGE_UPSCALE,
  KIMODO_NATIVE,
  MUSIC_NATIVE,
  SKIN_APPLY,
  CRAFT_LOOP,
  AGENT_SPAWN } from "./flowsRegistryRows.ts";

const REGISTRY: Record<string, RegistryFlow> = {
  "anny-hmr": ANNY_HMR,
  "craft-loop": CRAFT_LOOP,
  "agent-spawn": AGENT_SPAWN,
  "anny-hmr-commercial": ANNY_HMR_COMMERCIAL,
  "anny-params": ANNY_PARAMS,
  "audio-native-tts": AUDIO_NATIVE_TTS,
  "body-to-somax": BODY_TO_SOMAX,
  character: CHARACTER,
  "fit-seat": FIT_SEAT,
  "image-upscale": IMAGE_UPSCALE,
  "kimodo-native": KIMODO_NATIVE,
  "music-native": MUSIC_NATIVE,
  "skin-apply": SKIN_APPLY,
};

// THE LIVE SEAT (G1, 2026-10-11 — live-reload-surface doc's type
// asymmetry, closed): the REGISTRY literal above is the BOOT SEED,
// never the registry itself. Registrations ride a fiber-owned
// disposer (ctx.effect at the plugin seam) exactly like cards and
// families — a drop-in can add a flow to a running host; disposing
// the fiber removes it. No filesystem discovery: the door stays a
// drop-in naming a seam, never a sweep.
const LIVE_FLOWS = new Map<string, RegistryFlow>(Object.entries(REGISTRY));

/** Register one flow into the live seat. LOUD: a duplicate id
 *  refuses (one owner per flow id — the same interlock as cards and
 *  model families). Returns the disposer; call it and the flow is
 *  gone from every read below. */
export function registerRegistryFlow(flow: RegistryFlow): () => void {
  if (LIVE_FLOWS.has(flow.id)) {
    throw new Error(
      `flow '${flow.id}' registered twice — one owner per flow id (the interlock)`,
    );
  }
  if (!Array.isArray(flow.stages) || flow.stages.length === 0) {
    throw new Error(
      `flow '${String(flow.id)}' has no stages — a flow is a pipeline, an empty one is authoring noise`,
    );
  }
  LIVE_FLOWS.set(flow.id, flow);
  return () => {
    // only OUR row dies — a later registration under the same id
    // (impossible today, the interlock above) would not be reverted
    if (LIVE_FLOWS.get(flow.id) === flow) LIVE_FLOWS.delete(flow.id);
  };
}

/** All registered flow names (the flow.scan_flow_ids order — sorted;
 *  the live seat, so a hot registration is visible at once). */
export function registryFlowNames(): string[] {
  return [...LIVE_FLOWS.keys()].sort();
}

/** The raw (unexpanded) declaration, or undefined for unknown names. */
export function getRegistryFlow(name: string): RegistryFlow | undefined {
  return LIVE_FLOWS.get(name);
}

/** Resolve every fromFlow row against its source flow (Stage.from_flow
 *  verbatim: the source row's engine/card/description/expected/
 *  outputs/card_io/params ride; the link's id + inputs win). Throws
 *  LOUD on a dangling link (authoring bug — never a silent row). */
export function expandRegistryFlow(flow: RegistryFlow): RegistryFlow {
  const stages: RegistryStage[] = flow.stages.map(
    (st: RegistryStage): RegistryStage => {
      if (st.fromFlow === null) return st;
      const link: RegistryFromFlow = st.fromFlow;
      // THE LIVE SEAT, not the boot literal (the G1 seat-gap finding,
      // 2026-09-28): link resolution read REGISTRY directly, so a
      // flow registered live could never be a from_flow TARGET — the
      // seat was write-only for expansion, and no wall could see it
      // (the seed flow the walls clone has no links). A drop-in that
      // registers a flow another flow links to is exactly the
      // composition the door exists for.
      const src: RegistryFlow | undefined = LIVE_FLOWS.get(link.flow);
      if (src === undefined) {
        throw new Error(
          "[flows_registry] flow " + flow.id + " stage " + st.id +
            " links unknown flow " + link.flow,
        );
      }
      const base: RegistryStage | undefined = src.stages.find(
        (s: RegistryStage): boolean => s.id === link.stage,
      );
      if (base === undefined) {
        throw new Error(
          "[flows_registry] flow " + flow.id + " stage " + st.id +
            " links unknown stage " + link.flow + "/" +
            link.stage,
        );
      }
      if (base.fromFlow !== null) {
        throw new Error(
          "[flows_registry] flow " + flow.id + " stage " + st.id +
            " links a linked stage (single-hop only): " +
            link.flow + "/" + link.stage,
        );
      }
      return { ...base, id: st.id, inputs: st.inputs };
    },
  );
  return { ...flow, stages };
}

/** The registry flow as a flow_from_body-shaped inline doc (the
 *  validate compile + start shim both ride the EXISTING inline
 *  pipelines — no second validator). Card rows ride card/card_io;
 *  skip_when rides verbatim. */
export function registryFlowToInline(flow: RegistryFlow): Record<string, unknown> {
  return {
    id: flow.id,
    description: flow.description,
    stages: flow.stages.map((st: RegistryStage): Record<string, unknown> => {
      const inputs: Record<string, unknown> = {};
      for (const [name, edge] of Object.entries(st.inputs)) {
        if ("initial" in edge) inputs[name] = { initial: edge.initial };
        else {
          inputs[name] = {
            stage: (edge as RegistryStageEdge).stage,
            output: (edge as RegistryStageEdge).output,
          };
        }
      }
      const row: Record<string, unknown> = {
        id: st.id,
        engine: st.engine,
        description: st.description,
        inputs,
        outputs: { ...st.outputs },
        expected: { ...st.expected },
        params: st.params,
      };
      if (st.card !== "") row["card"] = st.card;
      if (Object.keys(st.cardIo).length > 0) row["card_io"] = { ...st.cardIo };
      if (st.skipWhen !== null) {
        row["skip_when"] = {
          initial: st.skipWhen.initial,
          when: st.skipWhen.when,
        };
      }
      return row;
    }),
  };
}

// ── THE COMPILE-TIME INITIAL GATE (REBUILD-21; the
// initial_validators deferral closed — photo/glb file checks +
// bake_params via the belt) ──

export interface InitialsRoots {
  readonly repoRoot: string;
  readonly stateRoot: string;
}

/** Check one photo/glb initial value. Null = passes. */
function checkFileInitial(
  key: string,
  kind: RegistryInitialKind,
  value: unknown,
  roots: InitialsRoots,
): string | null {
  let ref: string;
  if (typeof value === "string") ref = value;
  else if (
    typeof value === "object" && value !== null && !Array.isArray(value) &&
    typeof (value as Record<string, unknown>)["path"] === "string"
  ) {
    ref = (value as Record<string, unknown>)["path"] as string;
  } else {
    return (
      "initial " + JSON.stringify(key) + " must be a file path string or " +
      "{path: ...} (got " + (typeof value) + ")"
    );
  }
  const raw: string = ref.trim();
  if (raw.startsWith("data:") || raw.startsWith("blob:")) {
    return (
      "initial " + JSON.stringify(key) +
      " is browser-local (nothing to stage) — upload the file first: " +
      "POST /v1/uploads, then pass its staged path"
    );
  }
  // (split never yields [] — [0] is always a string here)
  const dot: number = (raw.split(/[?#]/)[0] as string).lastIndexOf(".");
  const ext: string = dot >= 0
    ? (raw.split(/[?#]/)[0] as string).slice(dot + 1).toLowerCase()
    : "";
  // The vocab is TYPED DATA now (mediaKinds.ts, REBUILD-7) — no
  // repo-anchored kindsPath read survives the re-home.
  const kinds = mediaVocab();
  const allowed: readonly string[] = kind === "photo" ? kinds.image : kinds.model;
  if (!allowed.includes(ext)) {
    return (
      "initial " + JSON.stringify(key) + " is not a stageable " +
      (kind === "photo" ? "image" : "mesh") + " (got extension " +
      JSON.stringify(ext) + ")"
    );
  }
  if (raw.includes("..")) {
    return "initial " + JSON.stringify(key) + " refuses traversal";
  }
  const cands: string[] = [];
  // BOTH run-media spellings (operator, 2026-10-10: no breakage,
  // ever): the live /melite-media/runs/ and the legacy
  // /v1/assets/runs/ that stored benches, archives and run rows
  // still name. The media route serves both, so a chained input
  // resolves whichever spelling it carries.
  // the contract's two names (benchStage.ts) — the same pair the
  // media route mounts and the bench heals
  const ASSET_RUNS_PREFIX = LEGACY_RUN_MEDIA_PREFIX + "/";
  const MEDIA_RUNS_PREFIX = RUN_MEDIA_PREFIX + "/";
  const runPrefix = raw.startsWith(MEDIA_RUNS_PREFIX)
    ? MEDIA_RUNS_PREFIX
    : raw.startsWith(ASSET_RUNS_PREFIX) ? ASSET_RUNS_PREFIX : "";
  if (runPrefix !== "") {
    const rel: string = raw.slice(runPrefix.length);
    if (rel === "" || rel.endsWith("/") || !rel.includes("/")) {
      return (
        "initial " + JSON.stringify(key) +
        " is a malformed artifact URL (want " + RUN_MEDIA_PREFIX + "/<run_id>/<file>)"
      );
    }
    for (const root of [
      join(roots.stateRoot, "output"),
      join(roots.stateRoot, "test-output"),
      join(roots.repoRoot, "data", "runs", "output"),
      join(roots.repoRoot, "data", "runs", "test-output"),
    ]) {
      cands.push(join(root, rel));
    }
  } else if (raw.startsWith("/")) {
    cands.push(raw);
  } else {
    cands.push(resolve(roots.repoRoot, raw));
    cands.push(resolve(process.cwd(), raw));
  }
  for (const cand of cands) {
    if (isFile(cand)) return null;
  }
  return "initial " + JSON.stringify(key) + " is not on disk (" + raw + ")";
}

/** The compile-time gate over a registry flow's initial_validators:
 *  the first refusal text, or null when every PRESENT initial
 *  passes (absent initials ride — the $channel/branch arms own
 *  them). Runs BEFORE any run registers, on both doors. */
export function registryInitialsError(
  flow: RegistryFlow,
  body: Record<string, unknown>,
  roots: InitialsRoots,
): string | null {
  for (const [key, kind] of Object.entries(flow.initialValidators)) {
    const value: unknown = body[key];
    if (value === undefined || value === null) continue;
    if (kind === "bake_params") {
      const s: string | undefined = typeof value === "string"
        ? value
        : JSON.stringify(value);
      if (s === undefined) {
        return (
          "initial " + JSON.stringify(key) +
          " must be a params_json string or object (got " +
          (typeof value) + ")"
        );
      }
      const err: string | null = validateBakeParams(s);
      if (err !== null) {
        return "initial " + JSON.stringify(key) + " refuses the preset dialect: " + err;
      }
      continue;
    }
    const err: string | null = checkFileInitial(key, kind, value, roots);
    if (err !== null) return err;
  }
  return null;
}
// ── the skill-body render (REBUILD-16; the tail beyond the
// REBUILD-13 cut) ──

function edgeText(edge: RegistryEdge, flow: RegistryFlow): string {
  if ("initial" in edge) return "initial '" + edge.initial + "'";
  const src: string = edge.stage + "." + edge.output;
  let kind = "";
  for (const st of flow.stages) {
    const base: RegistryStage = st.fromFlow !== null ? resolveLink(st) : st;
    if (base.id === edge.stage) {
      kind = base.outputs[edge.output] ?? base.cardIo[edge.output] ?? "";
    }
  }
  return "stage " + src + (kind !== "" ? " (" + kind + ")" : "");
}

/** L8 (the fallback audit, 2026-09-28): a dangling fromFlow link used
 *  to fall back to the LINKING row (`?? st`) — the rendered skill body
 *  then described the link's own engine/card as if it were the linked
 *  base, lying to the agent that reads it. The REGISTRY is code: a
 *  link that cannot resolve is an authoring bug and REFUSES LOUD,
 *  naming the flow and stage. (Both callers guard fromFlow !== null
 *  before the call; the fence throw below is the rim's contract.) */
function resolveLink(st: RegistryStage): RegistryStage {
  if (st.fromFlow === null) {
    throw new Error("resolveLink: stage '" + st.id + "' carries no fromFlow link (caller guard missing)");
  }
  const link: RegistryFromFlow = st.fromFlow;
  // the LIVE SEAT, same law as expandRegistryFlow above
  const src: RegistryFlow | undefined = LIVE_FLOWS.get(link.flow);
  if (src === undefined) {
    throw new Error(
      "registry: stage '" + st.id + "' links from unknown flow '" + link.flow +
      "' (known flows: " + registryFlowNames().join(", ") + ")",
    );
  }
  const base: RegistryStage | undefined = src.stages.find((s: RegistryStage): boolean => s.id === link.stage);
  if (base === undefined) {
    throw new Error(
      "registry: stage '" + st.id + "' links from unknown stage '" + link.flow + "/" + link.stage +
      "' (known stages: " + src.stages.map((s: RegistryStage): string => s.id).sort().join(", ") + ")",
    );
  }
  return base;
}

/** Render one registry flow as its skill-body text. */
export function registrySkillBody(flow: RegistryFlow): string {
  const lines: string[] = ["# flow " + flow.id, "", flow.description, "", "## stages"];
  for (const st of flow.stages) {
    const base: RegistryStage = st.fromFlow !== null ? resolveLink(st) : st;
    let head = "- " + st.id + " (";
    head += st.fromFlow !== null
      ? "from " + st.fromFlow.flow + "/" + st.fromFlow.stage
      : base.engine + (base.card !== "" ? ", card " + base.card : "");
    head += ")";
    if (base.description !== "") head += ": " + base.description;
    lines.push(head);
    for (const [name, edge] of Object.entries(st.inputs)) {
      lines.push("  input " + name + ": " + edgeText(edge, flow));
    }
    for (const [name, kind] of Object.entries(base.outputs)) {
      lines.push("  output " + name + ": " + kind);
    }
    for (const [name, kind] of Object.entries(base.cardIo)) {
      lines.push("  card_io " + name + ": " + kind);
    }
    if (st.skipWhen !== null) {
      lines.push(
        "  skip when initial '" + st.skipWhen.initial + "' is " + st.skipWhen.when,
      );
    }
  }
  return lines.join("\n") + "\n";
}

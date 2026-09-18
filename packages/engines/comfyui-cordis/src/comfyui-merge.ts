// comfyui-merge.ts — merged submit: plan_merge + execute_flow (mergegraph.execute_flow port).
// (split from comfyui.ts 2026-09-18: pure move, zero logic changes).

import { dirname, join } from "node:path";
import { ACTIVE, ComfyError } from "./comfyui-types.ts";
import type { ActivePrompt, EngineJson } from "./comfyui-types.ts";
import { resolveEngineBaseUrl } from "./comfyui-config.ts";
import { uploadReferenced } from "./comfyui-upload.ts";
import { fetchOutputs, normalizeTimeoutS, publishOutputChannels } from "./comfyui-outputs.ts";
import { hookProgress, submitPrompt, waitTerminal } from "./comfyui-execute.ts";
import { sdkClient } from "./comfyui-transport.ts";
import type { ExecuteOpts } from "./comfyui-execute.ts";

// ── merged submit (mergegraph.execute_flow port) ──

export interface MergeRow {
  readonly stageId: string;
  readonly workflow: Record<string, EngineJson>;
  readonly outputs: Record<string, EngineJson>;
  readonly outputNodes: Record<string, EngineJson>;
  readonly params: Record<string, EngineJson>;
}

export interface MergeStageResult {
  readonly outputs: Record<string, EngineJson>;
  readonly artifacts: string[];
}

/** In-stage wire namespacing (mergegraph._namespace_wires): every
 *  [node_id, slot] link pointing inside the stage rewrites to the
 *  namespaced id. */
export function namespaceWires(
  node: EngineJson,
  sid: string,
  stageIds: Set<string>,
): EngineJson {
  if (Array.isArray(node)) {
    if (
      node.length === 2 &&
      typeof node[0] === "string" &&
      typeof node[1] === "number" &&
      stageIds.has(node[0] as string)
    ) {
      return [sid + "::" + (node[0] as string), node[1]];
    }
    return (node as EngineJson[]).map((v: EngineJson): EngineJson =>
      namespaceWires(v, sid, stageIds),
    );
  }
  if (typeof node === "object" && node !== null) {
    const out: Record<string, EngineJson> = {};
    for (const [k, v] of Object.entries(node as Record<string, EngineJson>)) {
      out[k] = namespaceWires(v, sid, stageIds);
    }
    return out;
  }
  return node;
}

/** $spell substitution (mergegraph._rewrite_spells): FromStage-wired
 *  names become link tuples, request initials substitute, anything
 *  left over refuses LOUD with the-identical text. */
export function rewriteSpells(
  value: EngineJson,
  links: Record<string, [string, number]>,
  initials: Record<string, EngineJson>,
  where: string,
): EngineJson {
  if (typeof value === "string" && value.startsWith("$")) {
    const name: string = value.slice(1);
    if (name in links) return links[name] as unknown as EngineJson;
    if (name in initials) return initials[name] as EngineJson;
    throw new ComfyError(
      where +
        ": workflow carries $" +
        name +
        " — neither a FromStage-wired " +
        "input name nor a request initial (the merged graph has " +
        "no later substitution seam; name it or wire it)",
    );
  }
  if (Array.isArray(value)) {
    return (value as EngineJson[]).map((v: EngineJson): EngineJson =>
      rewriteSpells(v, links, initials, where),
    );
  }
  if (typeof value === "object" && value !== null) {
    const out: Record<string, EngineJson> = {};
    for (const [k, v] of Object.entries(value as Record<string, EngineJson>)) {
      out[k] = rewriteSpells(v, links, initials, where);
    }
    return out;
  }
  return value;
}

/** A [node, slot] link shape (mergegraph._is_wire). */
export function isWire(v: EngineJson): boolean {
  return (
    Array.isArray(v) &&
    v.length === 2 &&
    typeof v[0] === "string" &&
    typeof v[1] === "number"
  );
}

/** The dangling-wire integrity gate (mergegraph._assert_wires_resolve):
 *  construction refuses here, never at the server. */
export function assertWiresResolve(
  merged: Record<string, EngineJson>,
  links: Record<string, [string, number]>,
): void {
  const ids: Set<string> = new Set(Object.keys(merged));
  const walk = (v: EngineJson): void => {
    if (isWire(v)) {
      const target: string = (v as EngineJson[])[0] as string;
      if (!ids.has(target)) {
        throw new ComfyError(
          "merged plan: wire " +
            JSON.stringify(v) +
            " targets no node in the merged graph",
        );
      }
      return;
    }
    if (Array.isArray(v)) {
      for (const x of v as EngineJson[]) walk(x);
      return;
    }
    if (typeof v === "object" && v !== null) {
      for (const x of Object.values(v as Record<string, EngineJson>)) walk(x);
    }
  };
  for (const node of Object.values(merged)) walk(node);
  for (const link of Object.values(links)) {
    // Untestable-by-construction arm (2026-09-12): links are built
    // from producers-table keys two loops above, which are merged
    // keys by construction — a link can never dangle through the
    // public planner (the wire half above IS reachable: hand-spelled
    // tuples ride rewriteSpells untouched, and the battery pins one).
    /* v8 ignore next */
    if (!ids.has(link[0])) {
      throw new ComfyError(
        "merged plan: link " +
          JSON.stringify(link) +
          " targets no node in the merged graph",
      );
    }
  }
}

/** The merge plan for the link-free shapes
 *  the TS preview serves: namespaced copy + FromStage link
 *  resolution + the Load file-slot gate + the dangling gate.
 *  Producer inference (_producers: declared output_nodes, else the
 *  single-Save binding) — an ambiguous graph refuses
 *  LOUD with the producer text. */
export function planMerge(
  rows: MergeRow[],
  initials: Record<string, EngineJson>,
  inputNames: Record<string, Record<string, string>>,
): { workflow: Record<string, EngineJson> } {
  const merged: Record<string, EngineJson> = {};
  const producers: Record<string, Record<string, string>> = {};
  for (const row of rows) {
    const sid: string = row.stageId;
    const wf: Record<string, EngineJson> = row.workflow;
    if (typeof wf !== "object" || wf === null || Object.keys(wf).length === 0) {
      throw new ComfyError(
        "stage " +
          JSON.stringify(sid) +
          ": no workflow to merge (card stages must " +
          "bridge first; engine-only stages need params.workflow)",
      );
    }
    // producer inference: declared output_nodes wins; else the
    // single-Save binding; anything else refuses LOUD.
    const declared: Record<string, EngineJson> = row.outputNodes ?? {};
    const stageProd: Record<string, string> = {};
    if (Object.keys(declared).length > 0) {
      for (const [channel, nid] of Object.entries(declared)) {
        if (!(String(nid) in wf)) {
          throw new ComfyError(
            "stage " +
              JSON.stringify(sid) +
              ": output_nodes names node " +
              JSON.stringify(String(nid)) +
              " for channel " +
              JSON.stringify(channel) +
              " — the workflow carries no such node",
          );
        }
        stageProd[sid + "::" + String(nid)] = channel;
      }
    } else {
      const saves: string[] = Object.keys(wf).filter((nid: string): boolean => {
        const n = wf[nid] as Record<string, EngineJson>;
        return (
          typeof n === "object" &&
          n !== null &&
          String((n as Record<string, EngineJson>)["class_type"] ?? "").startsWith("Save")
        );
      });
      if (saves.length === 1) {
        for (const channel of Object.keys(row.outputs ?? {})) {
          stageProd[sid + "::" + saves[0]] = channel;
        }
      } else if (saves.length > 1 && Object.keys(row.outputs ?? {}).length > 0) {
        throw new ComfyError(
          "stage " +
            JSON.stringify(sid) +
            ": ambiguous producers " +
            JSON.stringify(saves) +
            " — declare output_nodes {channel: node_id}",
        );
      }
    }
    const stageIds: Set<string> = new Set(Object.keys(wf));
    const nsKeys: string[] = [];
    for (const [nid, node] of Object.entries(wf)) {
      const key: string = sid + "::" + nid;
      if (key in merged) {
        throw new ComfyError(
          "stage " +
            JSON.stringify(sid) +
            ": duplicate namespaced node " +
            JSON.stringify(key) +
            " — stage ids and node ids collided",
        );
      }
      merged[key] = namespaceWires(node, sid, stageIds);
      nsKeys.push(key);
    }
    producers[sid] = stageProd;
    // this stage's FromStage-wired inputs -> link tuples.
    const links: Record<string, [string, number]> = {};
    for (const [name, ref] of Object.entries(inputNames[sid] ?? {})) {
      if (ref.startsWith("__initial__.")) continue;
      const dot: number = ref.indexOf(".");
      const upstream: string = dot < 0 ? ref : ref.slice(0, dot);
      const channel: string = dot < 0 ? "" : ref.slice(dot + 1);
      if (!(upstream in producers)) {
        throw new ComfyError(
          "stage " +
            JSON.stringify(sid) +
            " input " +
            JSON.stringify(name) +
            " wires " +
            JSON.stringify(ref) +
            " — the upstream stage declares no mergeable producer for it",
        );
      }
      // `upstream in producers` was just proved — the table read
      // casts (the ?? {} / ?. tolls are uncoverable arms, never
      // runtime paths; 2026-09-12).
      const table = producers[upstream] as Record<string, string>;
      const ups: string[] = Object.keys(table).filter(
        (n: string): boolean => table[n] === channel,
      );
      if (ups.length === 0) {
        throw new ComfyError(
          "stage " +
            JSON.stringify(sid) +
            " input " +
            JSON.stringify(name) +
            " wires channel " +
            JSON.stringify(channel) +
            " — upstream stage " +
            JSON.stringify(upstream) +
            " produces no such channel",
        );
      }
      links[name] = [ups[0] as string, 0];
    }
    // ROW-4 file-slot gate: a producer link
    // may only land in a tensor slot — Load* file slots refuse.
    for (const key of nsKeys) {
      const node = merged[key] as Record<string, EngineJson>;
      const cls: string = String(node["class_type"] ?? "");
      if (!cls.startsWith("Load")) continue;
      const ins = node["inputs"];
      if (typeof ins !== "object" || ins === null || Array.isArray(ins)) continue;
      for (const [slot, val] of Object.entries(ins as Record<string, EngineJson>)) {
        if (typeof val === "string" && val.startsWith("$") && val.slice(1) in links) {
          throw new ComfyError(
            "stage " +
              JSON.stringify(sid) +
              " node " +
              JSON.stringify(key.split("::", 2)[1]!) +
              " (" +
              cls +
              "): input " +
              JSON.stringify(slot) +
              " carries the $spell " +
              JSON.stringify(val) +
              " — a producer link cannot land in a file slot. The merged path needs the arm's " +
              "tensor entry (drop the loader); the per-stage path owns the disk handoff",
          );
        }
      }
    }
    for (const key of nsKeys) {
      const node = merged[key] as Record<string, EngineJson>;
      merged[key] = rewriteSpells(
        node,
        links,
        initials,
        "stage " + JSON.stringify(sid) + " node " + JSON.stringify(key.split("::", 2)[1]!),
      ) as Record<string, EngineJson>;
    }
    assertWiresResolve(merged, links);
  }
  return { workflow: merged };
}

export interface FlowResult {
  readonly stages: Record<string, MergeStageResult>;
  readonly promptId: string;
}

/** mergegraph.execute_flow port: plan, submit ONCE, tap-less poll,
 *  per-stage harvest.
 *
 *  NON-PLUGIN callers only (walls/probes/unit — no Context).
 *  Plugin paths (the flows-start worker) use
 *  ComfyUIHostService.executeFlow (same inner, fiber-owned prompts
 *  map + service-resolved server). Documented split, never two truths. */
export async function executeFlow(
  rows: MergeRow[],
  runDir: string,
  inputNames: Record<string, Record<string, string>>,
  initials: Record<string, EngineJson>,
  opts: ExecuteOpts = {},
  serverOverride: string = "",
): Promise<FlowResult> {
  const server: string =
    serverOverride !== "" ? serverOverride : resolveEngineBaseUrl();
  return executeFlowInner(rows, runDir, inputNames, initials, opts, server, ACTIVE);
}

/** Shared merged core (no resolution, no registry choice). */
export async function executeFlowInner(
  rows: MergeRow[],
  runDir: string,
  inputNames: Record<string, Record<string, string>>,
  initials: Record<string, EngineJson>,
  opts: ExecuteOpts,
  server: string,
  active: Map<string, ActivePrompt>,
): Promise<FlowResult> {
  const plan = planMerge(rows, { ...initials }, inputNames);
  const client = sdkClient(server);
  const staged = await uploadReferenced(client, plan.workflow, { runsRoot: dirname(String(runDir)) });
  const { promptId, clientId } = await submitPrompt(client, staged.graph);
  active.set(String(runDir), { promptId, clientId, server });
  // THE PROGRESS TAP: the merged submit mints ONE client — every
  // stage's row shares the same live fold (the report consumer
  // stamps each stage; the stages share the run).
  const unhook = hookProgress(client, promptId, opts.report);
  // the merged deadline: the SUM of the stages' own budgets;
  // per-stage floors apply.
  let budget: number = 0;
  for (const r of rows) {
    budget += normalizeTimeoutS(r.params["timeout_s"]);
  }
  const floor: number = Math.max(budget, 2400);
  const deadline: number = Date.now() + floor * 1000;
  try {
    const entry: Record<string, EngineJson> = await waitTerminal(
      client,
      promptId,
      deadline,
      opts.shouldStop ?? ((): boolean => false),
    );
    const allOutputs = entry["outputs"];
    const allRec: Record<string, EngineJson> =
      typeof allOutputs === "object" && allOutputs !== null && !Array.isArray(allOutputs)
        ? (allOutputs as Record<string, EngineJson>)
        : {};
    const results: Record<string, MergeStageResult> = {};
    for (const r of rows) {
      const prefix: string = r.stageId + "::";
      const subOutputs: Record<string, EngineJson> = {};
      for (const [k, v] of Object.entries(allRec)) {
        if (k.startsWith(prefix)) subOutputs[k.slice(prefix.length)] = v;
      }
      const stageDir: string = join(String(runDir), r.stageId);
      const arts: string[] = await fetchOutputs(client, stageDir, {
        outputs: subOutputs,
      }, r.params["timeout_s"]);
      results[r.stageId] = {
        outputs: publishOutputChannels(r.outputs, arts),
        artifacts: arts,
      };
    }
    return { stages: results, promptId };
  } finally {
    unhook?.();
    client.close();
    active.delete(String(runDir));
  }
}

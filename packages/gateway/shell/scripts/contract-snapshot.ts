// contract-snapshot — the recorded object_info for every node class
// the estate's flows emit (TS port of tools/contract_snapshot.py,
// deleted at the NO-ESTATE-PYTHON cut, 2026-09-08).
//
// The incident (character flow attempts 5-8, 2026-09-06): the replay
// walls pin what our renderers EMIT, not what ComfyUI ACCEPTS. This
// tool records the LIVE contract (GET /object_info/<Class> for every
// class_type the flows emit) beside the core pin, and the workflow
// contract wall asserts every emitted workflow satisfies the
// recording. Refresh discipline: re-run at every core pin bump
// (infra/comfyui/core.pin) and whenever a flow starts using a new
// node class — the wall FAILS LOUDLY on an unrecorded class, so
// drift is discovered at the wall, never on the GPU.
//
// The class census is a TEXT scan of flows/*/flow.py for the
// `"class_type": "<Cls>"` dict spelling (spec, never execution —
// the old tool compiled flows through the retired flow.py loader).
// A comment or docstring carrying that exact spelling would census
// a phantom class; the live fetch then refuses loud (MISSING), so a
// phantom fails the refresh instead of poisoning the recording.
//
// Usage:
//   node --experimental-strip-types packages/gateway/scripts/contract-snapshot.ts [--endpoint http://127.0.0.1:18466]
//   node --experimental-strip-types packages/gateway/scripts/contract-snapshot.ts --list-classes
//
// Writes infra/comfyui/contracts/object_info.json (atomic tmp+rename).
// Erasable-syntax TS only: no enums, no namespaces.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, renameSync, writeFileSync,
  mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE: string = dirname(fileURLToPath(import.meta.url));
// Ledger row 35: four segments up (scripts → shell → gateway → packages
// → repo) — the move into packages/gateway/shell/scripts left this at
// three, so REPO resolved to packages/gateway and every census ran
// against a flows/ dir that does not exist (always-empty, exit 1).
const REPO: string = resolve(HERE, "..", "..", "..", "..");
const CONTRACTS_PATH: string = join(REPO, "infra", "comfyui", "contracts",
  "object_info.json");
const FLOWS_DIR: string = join(REPO, "flows");

function collectClasses(): Map<string, Set<string>> {
  // class_type -> {flow names} across every flow source. Ledger row 35
  // (2026-09-10): the census used to regex flows/*/flow.py — dead since
  // the py retirement (flows carry tool.json + workflow.json only, so
  // the census was ALWAYS empty and exited 1, leaving object_info.json
  // unrefreshable). The workflow.json graph is the live source: every
  // node's class_type, walked structurally (no text regex over JSON).
  const classes = new Map<string, Set<string>>();
  let dirs: string[];
  try {
    dirs = readdirSync(FLOWS_DIR).sort();
  } catch {
    return classes;
  }
  for (const d of dirs) {
    const f = join(FLOWS_DIR, d, "workflow.json");
    if (!existsSync(f)) continue;
    let graph: unknown;
    try {
      graph = JSON.parse(readFileSync(f, "utf8"));
    } catch {
      console.error("flow " + d + ": workflow.json does not parse — skipping");
      continue;
    }
    // The graphs ship in API format: { "<node name>": { class_type,
    // inputs } } — a flat record, not a nodes[] array.
    if (graph === null || typeof graph !== "object" || Array.isArray(graph)) continue;
    for (const node of Object.values(graph as Record<string, unknown>)) {
      const cls = (node as { class_type?: unknown })?.class_type;
      if (typeof cls !== "string" || cls === "") continue;
      if (!classes.has(cls)) classes.set(cls, new Set());
      (classes.get(cls) as Set<string>).add(d);
    }
  }
  return classes;
}

function get(url: string): unknown {
  const r = spawnSync(process.execPath, ["-e",
    "fetch(process.argv[1]).then(async r=>{if(r.status>=400)" +
    "{process.stderr.write('status '+r.status);process.exit(1)}" +
    "const t=await r.text();process.stdout.write(t)})" +
    ".catch(e=>{process.stderr.write(String(e).slice(0,200));process.exit(1)})",
    url],
    { encoding: "utf8", timeout: 40000, maxBuffer: 256 << 20 });
  if (r.status !== 0) {
    throw new Error(url + " — " + (r.stderr || "fetch failed").trim()
      .slice(0, 120));
  }
  return JSON.parse((r.stdout ?? "{}") as string) as unknown;
}

function main(): number {
  const argv = process.argv.slice(2);
  let endpoint = "http://127.0.0.1:18466";
  let listOnly = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--endpoint") endpoint = argv[++i] ?? endpoint;
    else if (argv[i] === "--list-classes") listOnly = true;
    else {
      console.error("unknown arg " + JSON.stringify(argv[i]));
      return 2;
    }
  }

  const classes = collectClasses();
  if (classes.size === 0) {
    console.log("no workflow node classes found in any flow — " +
      "nothing to record");
    return 1;
  }
  if (listOnly) {
    for (const cls of [...classes.keys()].sort()) {
      console.log(cls + "  (" + [...(classes.get(cls) as Set<string>)]
        .sort().join(", ") + ")");
    }
    return 0;
  }

  const stats = get(endpoint + "/system_stats") as {
    system?: { comfyui_version?: string }; comfyui_version?: string };
  const version = stats?.system?.comfyui_version ??
    stats?.comfyui_version ?? "unknown";

  const nodes: Record<string, unknown> = {};
  const missing: string[] = [];
  for (const cls of [...classes.keys()].sort()) {
    try {
      const entry = get(endpoint + "/object_info/" + cls) as
        Record<string, unknown>;
      nodes[cls] = entry[cls];
    } catch (e) {
      missing.push(cls + " (" + String(e).slice(0, 100) + ")");
    }
  }
  if (missing.length > 0) {
    console.log("MISSING on the live endpoint — install the extension " +
      "or fix the flow before recording:");
    for (const m of missing) console.log("   " + m);
    return 2;
  }

  const pinF = join(REPO, "infra", "comfyui", "core.pin");
  const doc = {
    provenance: {
      endpoint,
      comfyui_version: version,
      core_pin: existsSync(pinF)
        ? readFileSync(pinF, "utf8").trim() : "",
      captured: new Date().toISOString(),
      flows: Object.fromEntries([...classes.entries()]
        .map(([k, v]) => [k, [...v].sort()])),
    },
    nodes,
  };
  mkdirSync(dirname(CONTRACTS_PATH), { recursive: true });
  const tmp = join(tmpdir(), "object_info." + process.pid + ".tmp");
  writeFileSync(tmp, JSON.stringify(doc, null, 1) + "\n");
  renameSync(tmp, CONTRACTS_PATH);
  console.log("recorded " + Object.keys(nodes).length +
    " node classes from ComfyUI " + version + " -> " + CONTRACTS_PATH);
  return 0;
}

process.exit(main());

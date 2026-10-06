// regen-object-info-min.ts — THE {r,o} PROJECTION REFRESH DOOR for
// the two tracked minimal engine snapshots:
//   tests/walls/fixtures/object_info.min.json   (the registry flows' classes)
//   tests/walls/fixtures/shipped-graph-doc.min.json (the shipped core classes)
// Fetches the live engine's /object_info and re-projects every class
// each fixture carries: required/optional INPUT KEY SETS in the
// engine's own declaration order, JSON 2-space sorted-keys with one
// trailing newline. This is the ONLY way those fixtures change: no
// hand edits, no frozen snapshot. Drift is a loud diff at regen
// time (git), never a silent fallback at run time.
//
// A class the live engine no longer serves FAILS LOUD (the operator
// decides: the flow that references it goes, or the engine pin
// moves) — it is never silently dropped from the fixture.
// A NEW class a flow references is added deliberately:
//   regen-object-info-min.ts --add ClassName
// appends it to the flows fixture (object_info.min.json) before
// the refresh runs.
//
// Run: pnpm --filter @melite/comfyui-cordis exec node
//      --experimental-strip-types scripts/regen-object-info-min.ts
// Endpoint: the endpoint config (QUEUE LANE LAW — no default host;
// no engine on the box = exit 1, never a partial write).

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { liveObjectInfo } from "../src/comfyui-transport.ts";
import { resolveEngineBaseUrl, resolveRepoRoot } from "../src/comfyui-config.ts";

type Min = { r?: string[]; o?: string[] };

const FLOWS_FIXTURE = resolve(
  resolveRepoRoot(),
  "tests/walls/fixtures/object_info.min.json",
);
const GRAPH_FIXTURE = resolve(
  resolveRepoRoot(),
  "tests/walls/fixtures/shipped-graph-doc.min.json",
);

function fail(msg: string): never {
  process.stderr.write("regen-object-info-min: " + msg + "\n");
  process.exit(1);
}

const args: string[] = process.argv.slice(2);
let addClass: string | null = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--add" && args[i + 1]) {
    addClass = args[i + 1];
    i++;
  } else {
    fail("unknown argument: " + args[i] + " (only --add <ClassName> exists)");
  }
}

const server: string = resolveEngineBaseUrl();
let live: Record<string, unknown>;
try {
  live = await liveObjectInfo(server);
} catch (exc: unknown) {
  fail("live /object_info fetch failed (" + String((exc as Error).message) + ") — no engine, no refresh");
}

/** Project one live class entry to its {r,o} key-set form. */
function project(entry: unknown): Min {
  const input = (entry as { input?: { required?: Record<string, unknown>; optional?: Record<string, unknown> } }).input ?? {};
  return {
    r: Object.keys(input.required ?? {}),
    o: Object.keys(input.optional ?? {}),
  };
}

/** Canonical bytes: class keys alphabetical, one trailing newline —
 *  two runs over the same engine produce identical bytes. */
function canonical(doc: Record<string, Min>): string {
  const sorted: Record<string, Min> = {};
  for (const ct of Object.keys(doc).sort()) sorted[ct] = doc[ct]!;
  return JSON.stringify(sorted, null, 2) + "\n";
}

function refresh(path: string, label: string): void {
  const doc = JSON.parse(readFileSync(path, "utf8")) as Record<string, Min>;
  const missing: string[] = Object.keys(doc).filter((ct) => !(ct in live));
  if (missing.length > 0) {
    fail(
      label + ": the live engine no longer serves " + missing.join(", ") +
      " — drop the flow that references the class or move the engine pin; never a silent fixture drop",
    );
  }
  for (const ct of Object.keys(doc)) doc[ct] = project(live[ct]);
  const body = canonical(doc);
  writeFileSync(path, body);
  process.stdout.write(label + ": " + Object.keys(doc).length + " classes projected (" + path + ")\n");
}

if (addClass !== null) {
  if (!(addClass in live)) fail("--add " + addClass + ": the live engine does not serve that class");
  const doc = JSON.parse(readFileSync(FLOWS_FIXTURE, "utf8")) as Record<string, Min>;
  doc[addClass] = project(live[addClass]);
  writeFileSync(FLOWS_FIXTURE, canonical(doc));
  process.stdout.write("flows fixture: added " + addClass + "\n");
}
refresh(FLOWS_FIXTURE, "flows fixture");
refresh(GRAPH_FIXTURE, "graph fixture");

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
import { liveObjectInfo } from "../src/comfyui-transport.js";
import { resolveEngineBaseUrl, resolveRepoRoot } from "../src/comfyui-config.js";
const FLOWS_FIXTURE = resolve(resolveRepoRoot(), "tests/walls/fixtures/object_info.min.json");
const GRAPH_FIXTURE = resolve(resolveRepoRoot(), "tests/walls/fixtures/shipped-graph-doc.min.json");
function fail(msg) {
    process.stderr.write("regen-object-info-min: " + msg + "\n");
    process.exit(1);
}
const args = process.argv.slice(2);
let addClass = null;
for (let i = 0; i < args.length; i++) {
    if (args[i] === "--add" && args[i + 1]) {
        addClass = args[i + 1];
        i++;
    }
    else {
        fail("unknown argument: " + args[i] + " (only --add <ClassName> exists)");
    }
}
const server = resolveEngineBaseUrl();
let live;
try {
    live = await liveObjectInfo(server);
}
catch (exc) {
    fail("live /object_info fetch failed (" + String(exc.message) + ") — no engine, no refresh");
}
/** Project one live class entry to its {r,o} key-set form. */
function project(entry) {
    const input = entry.input ?? {};
    return {
        r: Object.keys(input.required ?? {}),
        o: Object.keys(input.optional ?? {}),
    };
}
/** Canonical bytes: class keys alphabetical, one trailing newline —
 *  two runs over the same engine produce identical bytes. */
function canonical(doc) {
    const sorted = {};
    for (const ct of Object.keys(doc).sort())
        sorted[ct] = doc[ct];
    return JSON.stringify(sorted, null, 2) + "\n";
}
function refresh(path, label) {
    const doc = JSON.parse(readFileSync(path, "utf8"));
    const missing = Object.keys(doc).filter((ct) => !(ct in live));
    if (missing.length > 0) {
        fail(label + ": the live engine no longer serves " + missing.join(", ") +
            " — drop the flow that references the class or move the engine pin; never a silent fixture drop");
    }
    for (const ct of Object.keys(doc))
        doc[ct] = project(live[ct]);
    const body = canonical(doc);
    writeFileSync(path, body);
    process.stdout.write(label + ": " + Object.keys(doc).length + " classes projected (" + path + ")\n");
}
if (addClass !== null) {
    if (!(addClass in live))
        fail("--add " + addClass + ": the live engine does not serve that class");
    const doc = JSON.parse(readFileSync(FLOWS_FIXTURE, "utf8"));
    doc[addClass] = project(live[addClass]);
    writeFileSync(FLOWS_FIXTURE, canonical(doc));
    process.stdout.write("flows fixture: added " + addClass + "\n");
}
refresh(FLOWS_FIXTURE, "flows fixture");
refresh(GRAPH_FIXTURE, "graph fixture");
//# sourceMappingURL=regen-object-info-min.js.map
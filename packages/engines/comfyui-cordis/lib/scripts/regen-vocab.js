// regen-vocab.ts — THE ENGINE VOCAB REFRESH DOOR.
// Fetches the live engine's KSampler vocab (sampler_name /
// scheduler) via the SDK client and rewrites the closed-type arrays
// in packages/engines/comfyui-card-kit/src/vocab.ts. This is the
// ONLY way those arrays change: no hand edits, no frozen snapshot,
// no wall asserting set-equality with a pin. Drift is a loud diff
// at regen time (git), never a silent fallback at run time.
//
// Run: pnpm --filter @melite/comfyui-cordis exec node
//      --experimental-strip-types scripts/regen-vocab.ts
// Endpoint: the endpoint config (QUEUE LANE LAW — no default host).
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { sdkClient } from "../src/comfyui-transport.js";
import { resolveEngineBaseUrl, resolveRepoRoot } from "../src/comfyui-config.js";
const VOCAB_PATH = resolve(resolveRepoRoot(), "packages/engines/comfyui-card-kit/src/vocab.ts");
function fail(msg) {
    process.stderr.write("regen-vocab: " + msg + "\n");
    process.exit(1);
}
const server = resolveEngineBaseUrl();
const client = sdkClient(server);
const [samplers, schedulers] = await Promise.all([
    client.getSamplers(),
    client.getSchedulers(),
]);
const samplerList = samplers.map(String).sort();
const schedulerList = schedulers.map(String).sort();
if (samplerList.length === 0)
    fail("the engine served no samplers — refusing to write an empty vocabulary");
if (schedulerList.length === 0)
    fail("the engine served no schedulers — refusing to write an empty vocabulary");
const src = await import("node:fs").then((fs) => fs.readFileSync(VOCAB_PATH, "utf8"));
const quoted = (rows) => rows.map((s) => '  "' + s + '",').join("\n");
// Every block must MATCH (shape drift refuses loud); a match that
// rewrites to identical text is a clean no-op (values unchanged).
const blocks = [
    [
        /export const SAMPLER_OPTIONS: readonly string\[\] = \[[\s\S]*?\];/,
        "export const SAMPLER_OPTIONS: readonly string[] = [\n" + quoted(samplerList) + "\n];",
    ],
    [
        /export const SCHEDULER_OPTIONS: readonly string\[\] = \[[\s\S]*?\];/,
        "export const SCHEDULER_OPTIONS: readonly string[] = [\n" + quoted(schedulerList) + "\n];",
    ],
    [
        /\/\*\* The t2i\/t2v sampler vocabulary — \d+ members,[\s\S]*?\*\//,
        "/** The t2i/t2v sampler vocabulary — " + samplerList.length + " members, SORTED serve order\n *  (generated: scripts/regen-vocab.ts off the live engine). */",
    ],
    [
        /\/\*\* The scheduler vocabulary — \d+ members,[\s\S]*?\*\//,
        "/** The scheduler vocabulary — " + schedulerList.length + " members, SORTED serve order\n *  (generated: scripts/regen-vocab.ts off the live engine). */",
    ],
];
for (const [re] of blocks) {
    if (!re.test(src))
        fail("a vocab block did not match — vocab.ts shape drifted, refusing to write");
}
const next = blocks.reduce((acc, [re, out]) => acc.replace(re, out), src);
writeFileSync(VOCAB_PATH, next);
process.stdout.write("regen-vocab: " + samplerList.length + " samplers, " + schedulerList.length +
    " schedulers written off " + server + "\n");
//# sourceMappingURL=regen-vocab.js.map
/**
 * boot-address-set-probe.ts — THE REGEN LEG'S PROBE (E8): run the
 * boot-address-set derivation under plain node and print the
 * manifest as JSON on stdout. Spawned ONLY by
 * scripts/regen-node-vocab.mjs --boot (never imported — knip entry,
 * the dump-registry precedent); the derivation arm runs the same
 * module in-process under vitest.
 *
 * Run: node --experimental-strip-types --no-warnings \
 *        packages/engines/comfyui-cordis/scripts/boot-address-set-probe.ts \
 *        --facts packages/engines/comfyui-cordis/data/model-facts.json
 */
import { deriveBootAddressSet } from "./boot-address-set.js";
const args = process.argv.slice(2);
const factsFlag = args.indexOf("--facts");
const facts = factsFlag >= 0 ? (args[factsFlag + 1] ?? "") : "packages/engines/comfyui-cordis/data/model-facts.json";
if (facts === "") {
    console.error("REFUSED: --facts requires a path");
    process.exit(2);
}
try {
    const manifest = await deriveBootAddressSet({ facts_path: facts });
    process.stdout.write(JSON.stringify(manifest, null, 1) + "\n");
}
catch (err) {
    console.error("REFUSED: the address-set derivation did not run — " + (err instanceof Error ? err.message : String(err)));
    process.exit(3);
}
//# sourceMappingURL=boot-address-set-probe.js.map
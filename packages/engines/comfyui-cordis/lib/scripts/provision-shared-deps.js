// THE SHARED-DEP GUARD (ERRORS_2 2026-11-10, the owed SYSTEMIC wall):
// NO extension leg may upgrade a pinned shared dep under a live engine.
// Manager's git-url door runs each pack's requirements.txt pip leg inside
// the install request — whatever the pack pins (or floats) lands in the
// LIVE venv mid-flight. The estate's readable at-pin truth for its own
// packs is the vendored tree: this module diffs every provisioned pack's
// requirements against the RECORD pack's exactly-pinned set and the
// install door refuses loud on any delta (upgrade, downgrade, or a pin
// the record carries that the pack omits — an unpinned install floats).
//
// The record pack is melite-audio-nodes: its requirements file is
// byte-identical across the audio/tts/sfx triple and repo-walled so
// (the parity wall) — one file IS the estate's declared pin set.
import { readFileSync } from "node:fs";
import { join } from "node:path";
/** The vendored pack whose requirements file is the estate's pinned
 * record (byte-identical across the audio triple, repo-walled). */
export const RECORD_PACK = "melite-audio-nodes";
/** Parse a requirements.txt into its EXACTLY-pinned pairs (`name==version`
 * rows; comments and blank lines skipped, floating rows deliberately not
 * recorded — the guard judges pins, the engine base env owns the floats).
 * @param text the requirements.txt contents.
 * @returns the name→version map of `==` pins (bare names). */
export function parseRequirementPins(text) {
    const pins = new Map();
    for (const rawLine of text.split("\n")) {
        const line = rawLine.trim();
        if (line === "" || line.startsWith("#"))
            continue;
        const pin = /^([A-Za-z0-9_.-]+)==([^\s#]+)/.exec(line);
        if (pin !== null)
            pins.set(pin[1].toLowerCase(), pin[2]);
    }
    return pins;
}
/** Parse a requirements.txt into the dep NAMES it would install —
 * every requirement row (pinned or floating), never comments.
 * @param text the requirements.txt contents.
 * @returns the lowercase name set of mentioned deps. */
export function parseRequirementMentions(text) {
    const mentions = new Set();
    for (const rawLine of text.split("\n")) {
        const line = rawLine.trim();
        if (line === "" || line.startsWith("#"))
            continue;
        const name = /^([A-Za-z0-9_.-]+)/.exec(line);
        if (name !== null)
            mentions.add(name[1].toLowerCase());
    }
    return mentions;
}
/** The shared-dep deltas of one pack's requirements against the record:
 * every record-pinned dep the pack pins DIFFERENTLY (upgrade or
 * downgrade — both move the live venv under an engine), plus every
 * record-pinned dep the pack MENTIONS but leaves unpinned (pip would
 * float it). A pack that never mentions a record dep installs nothing
 * for it — clean by construction.
 * @param packText the pack's requirements.txt contents.
 * @param recordPins the record pack's exactly-pinned set.
 * @returns one refusal line per delta, empty when the pack agrees. */
export function sharedDepDeltas(packText, recordPins) {
    const deltas = [];
    const packPins = parseRequirementPins(packText);
    const mentions = parseRequirementMentions(packText);
    for (const [dep, recordVersion] of recordPins) {
        const packVersion = packPins.get(dep);
        if (packVersion !== undefined && packVersion !== recordVersion) {
            deltas.push(`${dep}==${packVersion} (record pins ==${recordVersion})`);
        }
        else if (packVersion === undefined && mentions.has(dep)) {
            deltas.push(`${dep} unpinned (record pins ==${recordVersion} — pip would float it)`);
        }
    }
    return deltas;
}
/** The record's pinned set, read from the vendored record pack.
 * @param vendorRoot the vendored extensions tree
 * (`vendor/comfyui_extensions`).
 * @returns the record's exactly-pinned name→version map.
 * @throws when the record pack or its requirements file is absent — a
 * missing record is a loud failure, never a vacuous pass. */
export function recordPinnedSet(vendorRoot) {
    const recordPath = join(vendorRoot, RECORD_PACK, "requirements.txt");
    return parseRequirementPins(readFileSync(recordPath, "utf8"));
}
/** The guard's verdict for one provision row: the pack's shared-dep
 * deltas against the record, read from the pack's vendored twin (the
 * at-pin content of record — the vendored tree IS what the pin names).
 * A row with NO vendored twin carries no readable at-pin truth here and
 * answers empty (the Manager door's own stranger path — this guard
 * judges the estate's packs).
 * @param vendorRoot the vendored extensions tree.
 * @param packDir the pack's directory name (the url's last segment).
 * @returns the refusal lines, empty when the pack agrees with the
 * record or has no vendored twin. */
export function rowSharedDepDeltas(vendorRoot, packDir) {
    let packText;
    try {
        packText = readFileSync(join(vendorRoot, packDir, "requirements.txt"), "utf8");
    }
    catch {
        return [];
    }
    return sharedDepDeltas(packText, recordPinnedSet(vendorRoot));
}
//# sourceMappingURL=provision-shared-deps.js.map
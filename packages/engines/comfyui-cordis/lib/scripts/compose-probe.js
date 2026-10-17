/**
 * compose-probe.ts — THE PROBE VOCABULARY (one home, two runners).
 *
 * The fill tables and refusal parsers card-compose-liveness.spec.ts
 * authored for the dead-card wall, extracted verbatim (2026-10-17,
 * journey-closure E8) so the boot-fixture derivation derives its
 * address set with THE SAME probe law the liveness wall composes
 * under — one probe vocabulary, never two drifting copies.
 *
 * PURE: no imports at all. Both runners load it — vitest (the walls
 * suites, workspace imports resolved through tsconfig paths) and
 * plain `node --experimental-strip-types` (the regen leg's probe,
 * scripts/regen-node-vocab.mjs →
 * packages/engines/comfyui-cordis/scripts/boot-address-set-probe.ts),
 * which resolves workspace packages from the cordis package's own
 * node_modules and cannot carry bare imports in this file.
 */
/** The probe fills, keyed by the refusing param's own name. Each
 *  value is chosen to be bounds-legal across the tree's numeric
 *  fields (512 inside every resolution bound, 4 inside steps/cfg
 *  bounds, -1 the seed convention); a field whose legal range
 *  EXCLUDES its probe reds the wall — that is a bounds worth
 *  seeing, and the cure is a row here with the field's name. */
const PROBE_NUMBERS = {
    width: 512, height: 512,
    seed: -1,
    steps: 4,
    cfg: 4.5,
    // anny's floorless numerics (2026-11-02, the dual-floor cure):
    // the schema defaults left these keys — the family cascade owns
    // the floors, so the RAW compose this probe drives refuses on
    // them by name. The values are anny's own family calibration,
    // inside the declared bounds.
    resolution: 768,
    framing: 1.2,
    focal_length: 50,
    samples: 64,
};
/** A gate that STATS the path ("is not a file on this estate") needs
 *  a file that exists — the caller passes its own always-present
 *  file (the liveness wall passes the facts file it already holds
 *  open). resolution rides the closed variant table (1024 is a
 *  member on every mesh lane). */
const ESTATE_FILE_PARAM = "input_image";
/** The probe asset, by the param's own media suffix — the compose
 *  gates read these as strings (a staged path), never arrays. */
const ASSET_SUFFIX = [
    [/audio|voice|speech/i, "probe.wav"],
    [/video|frames/i, "probe.mp4"],
    [/glb|mesh|rig/i, "probe.glb"],
    [/image|mask|img|pic|photo/i, "probe.png"],
];
/**
 * The probe doc for one refusing param, by its name's shape:
 * SINGULAR media names ride one path string (what a compose gate
 * reads); plural/list names ride one-element arrays.
 *
 * @param name — the refusing param's own name.
 * @param estateFile — an existing estate file handed to gates that
 *   stat their input (the caller's always-present file).
 * @returns a bounds-legal probe value for the param.
 */
export function fillFor(name, estateFile) {
    if (name in PROBE_NUMBERS)
        return PROBE_NUMBERS[name];
    if (name === ESTATE_FILE_PARAM)
        return estateFile;
    const listShape = /(s|_list|_images|_inputs|_masks)$/i.test(name);
    const suffix = ASSET_SUFFIX.find(([re]) => re.test(name));
    if (suffix)
        return listShape ? [suffix[1]] : suffix[1];
    if (/^(is|has|use|enable|show|allow|double|crop)/i.test(name))
        return false;
    if (/^(num|count|max|min|batch|frames|dur|quality|strength|denoise|shift|temp)/i.test(name))
        return 1;
    return "the liveness probe";
}
/**
 * The missing-param name a refusal names, if it names one. Reads
 * the card tier's own voices: the gated resolve ("required param
 * 'x' missing"), the schema walk (field paths), and the compose
 * gates ("required param ... on the ... card").
 *
 * @param message — the refusal's message.
 * @returns the named param, or null when the refusal names nothing.
 */
export function namedParam(message) {
    const patterns = [
        /params '([^']+)'/,
        /fields '([^']+)'/,
        /param '([A-Za-z_][\w-]*)'/,
        /'([A-Za-z_][\w-]*)' (?:is )?(?:missing|required)/,
        /(?:missing|required)[\w ]*'([A-Za-z_][\w-]*)'/i,
        /field '([A-Za-z_][\w-]*)'/,
        /([A-Za-z_][\w-]*) = undefined/,
    ];
    for (const re of patterns) {
        const m = re.exec(message);
        if (m)
            return m[1];
    }
    return null;
}
/**
 * Every param name a refusal lists (a gate may demand several —
 * 'ref_audio' + 'ref_text' ride together).
 *
 * @param message — the refusal's message.
 * @returns the distinct param names the message grounds.
 */
export function namedMulti(message) {
    const names = new Set();
    for (const m of message.matchAll(/'([A-Za-z_][\w-]*)'/g))
        names.add(m[1]);
    const first = namedParam(message);
    if (first)
        names.add(first);
    const undef = /([A-Za-z_][\w-]*) = undefined/.exec(message);
    if (undef)
        names.add(undef[1]);
    const bare = /([A-Za-z_][\w-]*) undefined is not/.exec(message);
    if (bare)
        names.add(bare[1]);
    // the schema walk's path voice: $.field expected "x" | "y"
    for (const m of message.matchAll(/\$\.([A-Za-z_][\w-]*)/g))
        names.add(m[1]);
    return [...names].filter((n) => !["random", "int", "undefined", "required"].includes(n));
}
/**
 * THE PROBE LOOP: compose, read the refusal's named param, fill,
 * retry (the dead-card wall's own loop, card-compose-liveness).
 * A refusal that names nothing new ends the loop — that is the
 * dead card. A closed enum overwrites even an already-filled name:
 * the first refusal may come unquoted ("not one of 1024|1536") and
 * strand a wrong probe; the quoted restatement is the card's own
 * correction.
 *
 * @param attempt — one compose round over the probed doc.
 * @param rounds — the loop bound (the wall rides 14).
 * @param estateFile — the existing file handed to stat gates.
 * @returns the composed graph or the refusals that killed the row.
 */
export function probeCompose(attempt, rounds, estateFile) {
    const doc = {};
    const filled = new Set();
    const refusals = [];
    for (let round = 0; round < rounds; round++) {
        try {
            return { composed: attempt(doc), filled: [...filled], refusals };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            refusals.push(message);
            const named = namedMulti(message);
            const enumOffer = /expected "([^"]+)"/.exec(message);
            const fresh = enumOffer ? named : named.filter((n) => !filled.has(n));
            if (fresh.length === 0)
                break;
            for (const name of fresh) {
                filled.add(name);
                doc[name] = enumOffer ? enumOffer[1] : fillFor(name, estateFile);
            }
        }
    }
    return { composed: null, filled: [...filled], refusals };
}
//# sourceMappingURL=compose-probe.js.map

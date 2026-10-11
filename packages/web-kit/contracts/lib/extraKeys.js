// extraKeys.ts — THE EXTRA-BAG CONTRACT (2026-10-10, the operator's
// law: the contracts should be so deep that it is
// literally impossible to speak two vocabularies").
//
// THE CRIME THIS FILE KILLS: every face read `meta.extra.<key>` by
// its own string literal — the form walker spelled `visible_when`,
// the tool face spelled `visibleWhen`, and the tool face's
// visibility grammar was DEAD CODE for every card ever declared
// (found 2026-10-10, li-e). Two faces, two spellings, one silent
// dead read — and nothing could catch it, because the vocabulary
// lived nowhere.
//
// THE LAW: the extra bag's vocabulary is declared HERE, once —
// spelling, wire type, owning faces. Writers type against ExtraBag
// (tsc refuses an unknown key at the literal — the compile-time
// wall); readers import the same constants (never a second
// spelling site); the harvest pin walks every real card and mod
// envelope and refuses any key outside EXTRA_KEYS (the net under
// both walls — a bypassed write is a test failure naming
// card + field + key).
//
// This module is the FLOOR: @melite/contracts has zero
// dependencies and no build step — the web tier (card-base) and
// the engine tier (comfyui-cordis, card packages) both sit on it.
// Nothing above may spell an extra-bag key as a bare string.
/** THE VOCABULARY — every extra-bag key that exists, exactly one
 *  spelling each. A key absent from this list is not part of the
 *  contract; adding one is a deliberate act recorded here with its
 *  type and owners below. */
export const EXTRA_KEYS = [
    'order',
    'group',
    'zone',
    'wtype',
    'width',
    'columns',
    'visible_when',
    'tooltip',
    'required',
    'hidden',
    'families',
    'max_stack',
    'media',
    'placeholder',
    'options',
    'optionsFrom',
    'serveDefault',
    'min',
    'max',
    'default',
];
/** The set form for O(1) membership (the harvest pin's judge). */
export const EXTRA_KEY_SET = new Set(EXTRA_KEYS);
// ── THE CLOSED FACE VOCABULARIES (the gap-closure order,
// 2026-10-10: "ALL THESE GAPS GONE") ─────────────────────────────
// Before these sets, wtype/media/zone/role were open strings: the
// renderer silently fell back to a plain text input for any
// unknown spelling — a typo'd wtype rendered wrong FOREVER with no
// refusal anywhere. Now each is a closed set at the floor: typed
// members in ExtraBag (tsc refuses foreign spellings at literals),
// bag() validates membership at write time, the boot validator
// refuses foreign values on any served envelope, and the estate
// law suite pins the wire. Adding a spelling is a contract act
// recorded here with its seat.
/** THE PRESENTATION VOCABULARY — every wtype and the seat that
 * renders it:
 *  - atom-routed (the form's atom router switches on them):
 *    number, select, slider, text, textarea, boolean, image,
 *    file, mesh (image/file/mesh route via the square provider)
 *  - rail (the input signature's stack): image_list
 *  - mod-face (rendered by the mod leaf / mod canvas, not atoms):
 *    mask (the region-mask canvas), loras, ip_adapters,
 *    controlnets (the picker bricks)
 */
export const WTYPE_SET = [
    'number', 'select', 'slider', 'text', 'textarea', 'boolean',
    'image', 'file', 'mesh', 'image_list',
    'mask', 'loras', 'ip_adapters', 'controlnets',
];
export const WTYPE_SEATS = {
    number: 'atom', select: 'atom', slider: 'atom', text: 'atom',
    textarea: 'atom', boolean: 'atom', image: 'atom', file: 'atom',
    mesh: 'atom', image_list: 'rail',
    mask: 'mod-face', loras: 'mod-face', ip_adapters: 'mod-face',
    controlnets: 'mod-face',
};
/** THE STACK MEDIA HINT SET (typed pickers on the input rail). mod =
 *  an engine-side .safetensors reference pack (RefMod-style): the
 *  stack renders the file face with a safetensors accept filter,
 *  and compose stems the picked path (the loader resolves stems
 *  against its own models dir). */
export const MEDIA_SET = ['video', 'audio', 'mod'];
/** THE RAIL/ZONE SEATS (estate-pinned closed since LAW 6). */
export const ZONE_SET = ['inputs', 'params', 'mods'];
/** THE SCHEMAMASTERY ROLE SET (meta.role — the only roles any
 *  face reads today; params-emit's format path arm). */
export const ROLE_SET = ['path'];
/** THE TYPED WRITE — declarations pass their literal through this
 *  so an unknown key or malformed value fails EVERY wall: tsc at
 *  the literal, this throw at runtime (spread arms), the boot
 *  validator on any served envelope, and the estate law suite on
 *  the wire. Never a silently dead write. */
export function bag(b) {
    const where = "extra bag";
    for (const key of Object.keys(b)) {
        if (!EXTRA_KEY_SET.has(key)) {
            throw new Error(where + " carries '" + key + "' — not in the contract's vocabulary (packages/web-kit/contracts/src/extraKeys.ts). " +
                'A key outside the table has no reader spelling and would be a silent dead write. Add it to EXTRA_KEYS with its type and owners, or fix the spelling.');
        }
    }
    // VALUE SHAPES (the gap-4 closure: a spread arm with a wrong
    // value type used to pass bag() silently — caught only at CI)
    const str = (k) => {
        const v = b[k];
        if (v !== undefined && typeof v !== 'string') {
            throw new Error(where + '.' + k + ' must be a string — got ' + JSON.stringify(v));
        }
    };
    const num = (k) => {
        const v = b[k];
        if (v !== undefined && typeof v !== 'number') {
            throw new Error(where + '.' + k + ' must be a number — got ' + JSON.stringify(v));
        }
    };
    const bool = (k) => {
        const v = b[k];
        if (v !== undefined && typeof v !== 'boolean') {
            throw new Error(where + '.' + k + ' must be a boolean — got ' + JSON.stringify(v));
        }
    };
    str('group');
    str('visible_when');
    str('tooltip');
    str('placeholder');
    str('optionsFrom');
    str('wtype');
    str('zone');
    str('media');
    bool('required');
    bool('hidden');
    bool('serveDefault');
    num('width');
    num('columns');
    num('max_stack');
    num('min');
    num('max');
    {
        const v = b['order'];
        if (v !== undefined && v !== null && typeof v !== 'number') {
            throw new Error(where + ".order must be a number or null — got " + JSON.stringify(v));
        }
    }
    {
        const v = b['families'];
        if (v !== undefined && (!Array.isArray(v) || v.some((x) => typeof x !== 'string'))) {
            throw new Error(where + '.families must be a string[] — got ' + JSON.stringify(v));
        }
    }
    // CLOSED SETS (gap-1/2 closure): foreign spellings refuse at the
    // write, naming the set's home
    if (b.wtype !== undefined && !WTYPE_SET.includes(b.wtype)) {
        throw new Error(where + " carries wtype '" + b.wtype + "' — not in WTYPE_SET. The renderer has no arm for it (a foreign wtype silently renders as a plain text input). Add it to WTYPE_SET with its seat, or fix the spelling.");
    }
    if (b.zone !== undefined && !ZONE_SET.includes(b.zone)) {
        throw new Error(where + " carries zone '" + b.zone + "' — not in ZONE_SET (" + ZONE_SET.join(', ') + ').');
    }
    if (b.media !== undefined && !MEDIA_SET.includes(b.media)) {
        throw new Error(where + " carries media '" + b.media + "' — not in MEDIA_SET (" + MEDIA_SET.join(', ') + ').');
    }
    // OPTIONS (gap-7 closure): rows well-formed, values unique (a
    // duplicate value is an ambiguous pick), labels non-empty
    if (b.options !== undefined) {
        const seen = new Set();
        for (const row of b.options) {
            const value = typeof row === 'string' ? row : row.value;
            const label = typeof row === 'string' ? row : row.label;
            if (value === '')
                throw new Error(where + '.options carries an empty value');
            if (label === '')
                throw new Error(where + ".options row '" + value + "' carries an empty label");
            if (seen.has(value))
                throw new Error(where + ".options carries duplicate value '" + value + "' — an ambiguous pick");
            seen.add(value);
        }
    }
    // THE GUARD GRAMMAR (gap-4 tail): a malformed visible_when
    // refused at the WRITE, not first at CI — every guard must carry
    // an operator, a non-empty key, non-empty wants
    if (b.visible_when !== undefined && b.visible_when !== '') {
        for (const guard of b.visible_when.split('&')) {
            const g = guard.trim();
            const ne = g.indexOf('!=');
            const eq = ne >= 0 ? -1 : g.indexOf('=');
            if (ne < 0 && eq < 0) {
                throw new Error(where + ".visible_when guard '" + g + "' carries no operator (= or !=)");
            }
            const at = ne >= 0 ? ne : eq;
            const key = g.slice(0, at).trim();
            const rhs = g.slice(at + (ne >= 0 ? 2 : 1)).trim();
            if (key === '')
                throw new Error(where + ".visible_when guard '" + g + "' carries an empty key");
            if (rhs === '')
                throw new Error(where + ".visible_when guard '" + g + "' carries an empty value");
        }
    }
    return b;
}
/** THE TYPED READ — one getter for every face. `extraOf(node)`
 *  narrows a serialized ref node's meta.extra to the bag type;
 *  faces read keys off the result, never off a bare record. */
export function extraOf(node) {
    const raw = node?.meta?.['extra'];
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
        return {};
    // wtype membership at the READ (strictness fix 5, 2026-10-01): the
    // write-side bag guard refuses foreign spellings, but this getter
    // narrows untyped serialized rows too — a wtype outside WTYPE_SET
    // must refuse here, never ride as a silent text fallback.
    const w = raw['wtype'];
    if (w !== undefined && w !== '' && !WTYPE_SET.includes(w)) {
        throw new Error("serialized extra carries wtype '" + String(w) + "' — not in WTYPE_SET. The renderer has no arm for it (add it with its seat, or fix the spelling).");
    }
    return raw;
}
//# sourceMappingURL=extraKeys.js.map

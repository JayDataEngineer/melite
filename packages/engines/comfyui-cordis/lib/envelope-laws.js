// envelope-laws.ts — THE BOOT GATE (the gap-3 closure, 2026-10-10:
// the operator's order "ALL THESE GAPS GONE"). The estate law
// suite (contract-law.spec.ts) holds every card at CI — but a
// hot-loaded plugin registers at RUNTIME and CI never sees it.
// This module is the same law, fired at REGISTRATION: every card,
// whatever its source, passes assertEnvelopeLaws before it joins
// the service — a foreign vocabulary refuses LOUD at the door,
// never serves silent.
//
// The laws here mirror the floor (@melite/contracts/extraKeys) and
// the CI suite; the one CI-only arm is the guard SIBLING check
// against live model axes (the models registry is not the card
// registry's to read here — registration-time allows the estate's
// axis spellings, CI pins the exact per-doc axes). THE ADMITTED
// SEATS (the tts dossier's B7 panel law, 2026-11-12): a guard may
// also name an ADMITTED key — the mod-bag seats the form state
// carries (the qvoice bag rides form state under its param_key;
// the reshoot/replace bag-key precedent seats mod-owned names on
// admits). Registration allows siblings + axes + admits; CI pins
// the exact per-doc set.
import { EXTRA_KEY_SET, WTYPE_SET, MEDIA_SET, ZONE_SET, ROLE_SET, } from '@melite/contracts/extraKeys';
/** The estate's axis spellings (axisKey law: variant-group ids
 *  lowercased — the durable draft seats). CI pins these exactly
 *  against each doc's own variant_groups; registration allows the
 *  known spellings so a family-scoped guard never refuses
 *  spuriously at boot. */
const AXIS_KEYS = ['model', 'variant', 'quant', 'recipe', 'precision'];
const where = (card, family, field) => `card '${card}' (family ${family}) field '${field}'`;
const check = (cond, msg) => {
    if (!cond)
        throw new EnvelopeLawRefusal(msg);
};
/** The refusal type — a distinct name so the door reads loud. */
export class EnvelopeLawRefusal extends Error {
    constructor(message) {
        super('envelope law: ' + message);
        this.name = 'EnvelopeLawRefusal';
    }
}
function checkBag(card, family, field, extra, siblings) {
    for (const [key, value] of Object.entries(extra)) {
        check(EXTRA_KEY_SET.has(key), where(card, family, field) + ` carries extra '${key}' — outside the contract's vocabulary (@melite/contracts/extraKeys)`);
        switch (key) {
            case 'wtype':
                check(typeof value === 'string' && WTYPE_SET.includes(value), where(card, family, field) + ` wtype '${String(value)}' — outside WTYPE_SET (the renderer has no arm; it would silently render as a text input)`);
                break;
            case 'media':
                check(typeof value === 'string' && MEDIA_SET.includes(value), where(card, family, field) + ` media '${String(value)}' — outside MEDIA_SET`);
                break;
            case 'zone':
                check(typeof value === 'string' && ZONE_SET.includes(value), where(card, family, field) + ` zone '${String(value)}' — outside ZONE_SET`);
                break;
            case 'order':
                check(value === null || typeof value === 'number', where(card, family, field) + ' order must be number|null');
                break;
            case 'width':
            case 'columns':
            case 'max_stack':
            case 'min':
            case 'max':
                check(typeof value === 'number', where(card, family, field) + ` ${key} must be a number`);
                break;
            case 'required':
            case 'hidden':
            case 'serveDefault':
                check(typeof value === 'boolean', where(card, family, field) + ` ${key} must be a boolean`);
                break;
            case 'group':
            case 'tooltip':
            case 'placeholder':
            case 'optionsFrom':
                check(typeof value === 'string', where(card, family, field) + ` ${key} must be a string`);
                break;
            case 'families':
                check(Array.isArray(value) && value.every((x) => typeof x === 'string'), where(card, family, field) + ' families must be a string[]');
                break;
            case 'options': {
                check(Array.isArray(value), where(card, family, field) + ' options must be an array');
                const seen = new Set();
                for (const row of value) {
                    const value2 = typeof row === 'string' ? row : row?.value;
                    const label = typeof row === 'string' ? row : row?.label;
                    check(typeof value2 === 'string' && value2 !== '', where(card, family, field) + ' options row carries an empty value');
                    check(typeof label === 'string' && label !== '', where(card, family, field) + ` options row '${String(value2)}' carries an empty label`);
                    check(!seen.has(String(value2)), where(card, family, field) + ` options carries duplicate value '${String(value2)}' — an ambiguous pick`);
                    seen.add(String(value2));
                }
                break;
            }
        }
    }
    // THE GUARD GRAMMAR: operator present, key non-empty + spelled
    // from the estate's seats, wants non-empty
    const vw = extra['visible_when'];
    if (typeof vw === 'string' && vw !== '') {
        for (const guard of vw.split('&')) {
            const g = guard.trim();
            const ne = g.indexOf('!=');
            const eq = ne >= 0 ? -1 : g.indexOf('=');
            check(ne >= 0 || eq >= 0, where(card, family, field) + ` visible_when guard '${g}' carries no operator`);
            const at = ne >= 0 ? ne : eq;
            const key = g.slice(0, at).trim();
            check(key !== '', where(card, family, field) + ` visible_when guard '${g}' carries an empty key`);
            check(siblings.includes(key), where(card, family, field) + ` visible_when guard key '${key}' is neither a declared sibling, a known axis, nor an admitted key — CI's law suite pins the exact per-doc axes`);
            const rhs = g.slice(at + (ne >= 0 ? 2 : 1)).trim();
            check(rhs !== '', where(card, family, field) + ` visible_when guard '${g}' carries an empty value`);
        }
    }
}
function walkEnvelope(card, family, env, siblings) {
    const seen = new Set([env.uid]);
    const queue = [{ id: env.uid, field: '' }];
    while (queue.length > 0) {
        const { id, field } = queue.shift();
        const node = env.refs[id];
        if (node === undefined)
            continue;
        const extra = node.meta?.['extra'];
        if (typeof extra === 'object' && extra !== null && !Array.isArray(extra)) {
            const bag = extra;
            checkBag(card, family, field || '·root', bag, siblings);
            check(!(bag['hidden'] === true && bag['required'] === true), where(card, family, field) + ' is hidden AND required — an unreachable input');
        }
        if (node.dict !== undefined) {
            for (const [name, ref] of Object.entries(node.dict)) {
                if (!seen.has(ref)) {
                    seen.add(ref);
                    queue.push({ id: ref, field: name });
                }
            }
        }
        if (node.list !== undefined) {
            for (const ref of node.list)
                if (!seen.has(ref)) {
                    seen.add(ref);
                    queue.push({ id: ref, field });
                }
        }
    }
    // roles: the closed role vocabulary on every ref (meta.role)
    for (const [id, node] of Object.entries(env.refs)) {
        const role = node.meta?.['role'];
        check(role === undefined || typeof role === 'string' && ROLE_SET.includes(role), `card '${card}' (family ${family}) ref ${id} carries role '${String(role)}' — outside ROLE_SET`);
    }
}
/** THE REGISTRATION GATE — registerCard calls this after the flow
 *  contract assert. Walks the card's serialized schema per boarded
 *  family plus every mod pack's envelope; any law below refuses
 *  the registration. */
export function assertEnvelopeLaws(def) {
    const carrier = (def.schemaCarrier ?? def.schema);
    const schema = typeof carrier.toJSON === 'function' ? carrier.toJSON() : null;
    if (schema === null || schema.refs === undefined)
        return;
    const rootKeys = Object.keys(schema.refs[schema.uid]?.dict ?? {});
    const siblings = [...rootKeys, ...AXIS_KEYS, ...(def.admits ?? [])];
    for (const family of [...(def.boarded ?? []), def.id]) {
        walkEnvelope(def.id, family, schema, siblings);
    }
}
/** THE PACK GATE — registerPack calls this beside validateFields:
 *  a mod pack's envelope obeys the same laws as a card's (the
 *  absorbed fields render through the same faces). */
export function assertPackEnvelopeLaws(pack, fields) {
    const env = typeof fields.toJSON === 'function' ? fields.toJSON() : null;
    if (env === null || env.refs === undefined)
        return;
    const packKeys = Object.keys(env.refs[env.uid]?.dict ?? {});
    walkEnvelope('pack:' + pack, '*', env, [...packKeys, ...AXIS_KEYS]);
}
//# sourceMappingURL=envelope-laws.js.map

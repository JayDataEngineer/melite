// dump-registry.ts — the serving-owned card-registry census emitter
// (PURGE S-decls, 2026-09-08). The TS card registry is the single
// declaration; consumers that need the census outside node read it
// through this dumper: one node invocation, JSON on stdout, nonzero
// on failure. No gateway, no GPU, no engine — the registry loads
// from the card plugin files alone. Consumers: the wall battery
// (historical: the retired scan) + the compose bridge
// (spells/skeleton for the $spell branch + stage-row extra).
//
// Usage:
//   node --experimental-strip-types --no-warnings \
//     packages/engines/comfyui-cordis/src/dump-registry.ts
//
// Emits: {"cards": {<id>: {"skeleton": str, "boarded": [str],
//   "requires": [str], "requiresByFamily": {fam: [str]},
//   "admits": [str], "spells": [str],
//   "knobs": [{name, type, array, role}]}}}
import { loadCardDefs } from "./cardDefs.js";
const defs = await loadCardDefs();
const cards = {};
for (const [id, def] of [...defs].sort(([a], [b]) => a < b ? -1 : 1)) {
    const carrier = def.schemaCarrier ?? def.schema;
    const dict = (typeof carrier === "function" && "dict" in carrier
        ? carrier.dict
        : undefined) ?? {};
    // A dict entry is a loose param-schema node: {type, list?, meta?}
    // with no declared contract (the defs walk is structural), so the
    // narrow reads below carry their own guards.
    const knobs = Object.entries(dict).map(([name, s]) => {
        // role rides the outer meta (nullable unions merge inner meta —
        // the params-emit.ts mirror, abridged: file slots are never
        // nullable, but the merge keeps the dumper honest).
        let inner = null;
        if (s?.type === 'union' && Array.isArray(s.list)) {
            const nonNull = s.list.filter((b) => !(b.type === 'const' && b.value === null));
            if (nonNull.length === 1 && s.list.length === 2)
                inner = nonNull[0];
        }
        const m = s?.meta ?? {};
        const im = inner ? { ...m, ...Object.fromEntries(Object.entries(inner.meta ?? {}).filter(([, v]) => v !== undefined)) } : m;
        return {
            name,
            type: (inner?.type ?? s?.type ?? 'any'),
            array: (inner?.type ?? s?.type) === 'array',
            role: (im.role ?? null),
        };
    });
    cards[id] = {
        skeleton: def.skeleton,
        boarded: [...(def.boarded ?? [])],
        requires: [...(def.requires ?? [])],
        requiresByFamily: { ...(def.requiresByFamily ?? {}) },
        admits: [...(def.admits ?? [])],
        spells: [...(def.spells ?? [])],
        knobs,
    };
}
process.stdout.write(JSON.stringify({ cards }) + '\n');
//# sourceMappingURL=dump-registry.js.map

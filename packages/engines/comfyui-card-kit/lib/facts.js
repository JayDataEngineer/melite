// Model facts — DERIVED, not declared (merged 2026-09-08,
// package-boundary extermination). The registry (models/) owns
// every model-owned key; the cards own the compose slices; loadFacts
// ASSEMBLES the row each reader (kit, service, doors, CLI, walls)
// renders from. One spelling is truth (the DECL), the row is its
// derived realization (paper §3.2.3) — the doubled spelling is dead.
//
// The slices file keeps ONLY what the registry cannot carry:
// per-card outputs/requires_by_family, the
// row roster and extension_node_types.
import { readFileSync } from 'node:fs';
/** The lane facts' ONE typed string reader (the attainment audit's
 *  F7, 2026-10-12): lane_inputs is Record<string, unknown> by
 *  declaration, and the region law at lanes-image.ts reads
 *  text_encode_node through an unchecked unknown. Absent, non-string,
 *  or empty read as undefined — a REFUSAL-grade absence, never a
 *  silent default.
 * @param raw the resolved lane_inputs (family + variant)
 * @param key the facts key to read
 * @returns the non-empty string at key, or undefined */
export function laneStringOf(raw, key) {
    const value = raw[key];
    return typeof value === 'string' && value !== '' ? value : undefined;
}
/** The facts door's ONE string extractor (the attainment audit's
 *  F4: ten hand copies across eight families, already diverged
 *  into three shapes — two of them casting the very values their
 *  own loop had just proved). The label names the refusing door
 *  (family + action) so the message stays the caller's own; the
 *  wording is pinned by the families' refusal assertions.
 * @param raw the resolved lane_inputs (family ⊕ variant)
 * @param key the facts key the door requires
 * @param label the refusing door's name (family + action), message-prefixed
 * @returns the non-empty string at key
 * @throws Error when the key is absent, not a string, or empty */
export function requireText(raw, key, label) {
    const value = raw[key];
    if (typeof value !== 'string' || value === '') {
        throw new Error(`${label}: lane_inputs.${key} = ${JSON.stringify(value)} — a non-empty string is required`);
    }
    return value;
}
/** Parse the diffusion-lane core: the four requireText model slots, the
 *  node-literal whitelist gate, and the optional sampling_shift number
 *  check. The refusal prose is the families' pinned form (the specs
 *  assert the family-tagged prefix + these tails).
 * @param raw the resolved lane_inputs (family ⊕ variant)
 * @param label the refusing door's name (family + action), message-prefixed
 * @param gate the facts key holding the node literal + the one allowed value
 * @param shift false to skip the sampling_shift check (edit doors carry none)
 * @returns the core facts; families project into their own typed shape
 * @throws Error when a model slot is missing, the node literal is not the
 *  whitelisted value, or sampling_shift is present but not a number */
export function parseDiffusionLaneFacts(raw, label, gate, shift = true) {
    const text = (key) => requireText(raw, key, label);
    const node = raw[gate.key];
    // !== refusal below proves node === gate.node; the returns carry
    // gate.node itself (already the literal type — no cast).
    if (node !== gate.node) {
        throw new Error(`${label}: lane_inputs.${gate.key} = ${JSON.stringify(node)} — the action builds on ${gate.node}`);
    }
    if (shift) {
        const value = raw.sampling_shift;
        if (value !== undefined && typeof value !== 'number') {
            throw new Error(`${label}: lane_inputs.sampling_shift = ${JSON.stringify(value)} — a number is required`);
        }
        return {
            unet: text('unet'),
            text_encoder: text('text_encoder'),
            vae: text('vae'),
            clip_type: text('clip_type'),
            node: gate.node,
            sampling_shift: value,
        };
    }
    return {
        unet: text('unet'),
        text_encoder: text('text_encoder'),
        vae: text('vae'),
        clip_type: text('clip_type'),
        node: gate.node,
    };
}
/** The edit door's max_images floor: a finite number ≥ 1, floored.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @param label the refusing door's name (family + action), message-prefixed
 *  @returns Math.floor(raw.max_images)
 *  @throws Error when max_images is absent, non-finite, or < 1 */
export function parseEditCap(raw, label) {
    const cap = raw.max_images;
    if (typeof cap !== 'number' || !Number.isFinite(cap) || cap < 1) {
        throw new Error(`${label}: lane_inputs.max_images = ${JSON.stringify(cap)} — a number ≥ 1 is required`);
    }
    return Math.floor(cap);
}
/** address → ladder owner, built from the registry ladders (variant
 *  + cell route claims; first claimant wins — boardings resolve
 *  before ladders at assembly). */
function addressOwners(reads) {
    const map = new Map();
    for (const id of reads.registryIds()) {
        map.set(id, id);
        const decl = reads.registryModel(id);
        for (const v of decl.variants ?? []) {
            if (v.route !== undefined && v.route !== id && !map.has(v.route))
                map.set(v.route, id);
            for (const c of v.cells ?? []) {
                if (c.route !== undefined && c.route !== id && !map.has(c.route))
                    map.set(c.route, id);
            }
        }
    }
    return map;
}
/** Deep-clone a relation declaration into the derived row's own
 *  data (the rows are frozen snapshots — never an alias into the
 *  registry's live DECL objects). Plain-JSON shapes only. */
function structuredCloneRelations(raw) {
    return JSON.parse(JSON.stringify(raw));
}
function artifactBasename(cell) {
    const a = cell.artifact;
    if (a === undefined || a === null)
        return '';
    if (typeof a.filename === 'string' && a.filename !== '')
        return a.filename.split('/').pop();
    if (typeof a.source_url === 'string' && a.source_url !== '')
        return a.source_url.split('/').pop();
    return '';
}
/** The derived row for one roster address (route addresses offer the
 *  shared matrix minus siblings' tables — the exporter rule, kept:
 *  keep variants routed to "" or the ladder owner). */
function deriveRow(reads, address, card, outputs, requires, owners) {
    const owner = owners.get(address) ?? address;
    const d = reads.getModel(address);
    const declVariants = (d.variants ?? []);
    // Route rows are SELF-CONTAINED (the exporter rule, kept): the
    // address offers the shared matrix with variants re-addressed to
    // itself (selecting standard under qwen3-tts-base stays on the
    // base table — consumers never leave the row). Recipe "" stays.
    const isRouteRow = address !== owner;
    const kept = isRouteRow
        ? declVariants.filter((v) => {
            const r = (v.route ?? '');
            return r === '' || r === owner;
        })
        : declVariants;
    const variants = kept.map((v) => {
        const reAddr = (r) => (isRouteRow && r !== '' ? address : r);
        return {
            id: v.id,
            label: v.label,
            group: v.group,
            ...(v.hide_from_dropdown === true ? { hide_from_dropdown: true } : {}),
            route: reAddr((v.route ?? '')),
            resolver_defaults: (v.resolver_defaults ?? {}),
            lane_inputs: (v.lane_inputs ?? {}),
            // THE ROUTE ENVELOPE (cardsVariant.envelopeRefusal reads it):
            // a distilled lane declares the closed bounds its sampler
            // marriage lives in — stated values outside refuse at compose.
            // number[] — the declaration (line 136), the floor, and every
            // consumer twin. The 2-tuple this cast claimed bought a reader
            // asking "is steps: [4] legal" a second answer; normalizeEnvelope
            // reads unknown and length-checks at runtime, so it accepts the
            // array either way.
            sampler_envelope: (v.sampler_envelope ?? null),
            defaults: (v.wire_defaults ?? {}),
            // THE LANE SURFACE + RELATIONS (2026-10-10, the fix shape):
            // carried VERBATIM from the DECL variant — present only where
            // declared (the absent-equals-empty law; deriveRow never
            // invents a surface).
            ...(Array.isArray(v.params)
                ? { params: [...v.params] } : {}),
            ...(v.relations !== undefined && v.relations !== null
                ? { relations: structuredCloneRelations(v.relations) } : {}),
            ...(v.bounds !== undefined && v.bounds !== null
                ? { bounds: JSON.parse(JSON.stringify(v.bounds)) } : {}),
            cells: (v.cells ?? []).map((c) => ({
                quant: c.quant,
                label: c.label,
                ...(c.hide_from_dropdown === true ? { hide_from_dropdown: true } : {}),
                route: reAddr((c.route ?? '')),
                artifact: artifactBasename(c),
                vram_peak_gb: (c.vram_peak_gb ?? null),
                // THE CELL SURFACE (the size-at-quant reshape): verbatim,
                // present only where the DECL declares it — deriveRow never
                // invents a surface member (the absent-equals-empty law).
                ...(Array.isArray(c.params) ? { params: [...c.params] } : {}),
            })),
        };
    });
    const row = {
        id: address,
        card,
        family: owner,
        defaults: (d.defaults ?? {}),
        lane_inputs: (d.lane_inputs ?? {}),
        variants,
        variant_groups: (d.variant_groups ?? []),
        outputs,
    };
    // THE BASE SURFACE + FAMILY RELATIONS (2026-10-10, the fix
    // shape): verbatim, present-only-where-declared.
    if (Array.isArray(d.params))
        row.params = [...d.params];
    if (d.relations !== undefined && d.relations !== null) {
        row.relations = structuredCloneRelations(d.relations);
    }
    // THE BASE BOUNDS (the RANGE RULE's carry): per-field numeric
    // domains, verbatim, present-only-where-declared.
    if (d.bounds !== undefined && d.bounds !== null) {
        row.bounds = JSON.parse(JSON.stringify(d.bounds));
    }
    const mods = d.mods;
    if (mods !== undefined && mods.length > 0)
        row.mods = mods;
    const accepts = d.accepts;
    if (accepts !== undefined && accepts.length > 0)
        row.accepts = accepts;
    if (d.studio !== undefined && d.studio !== null)
        row.studio = d.studio;
    if (requires !== undefined)
        row.requires_by_family = requires;
    return row;
}
/** Assemble the compose contract: frozen slices in, registry truth
 *  derived through the caller's reads, rows out. Same return shape
 *  every reader renders from — the file shrank, the callers boot
 *  the registry and pass their reads. */
export function loadFacts(path, reads) {
    const slices = JSON.parse(readFileSync(path, 'utf8'));
    const owners = addressOwners(reads);
    const models = {};
    for (const [address, slice] of Object.entries(slices.rows ?? {})) {
        if (slice.frozen !== undefined) {
            models[address] = slice.frozen;
            continue;
        }
        const cardSlice = slices.cards?.[slice.card];
        models[address] = deriveRow(reads, address, slice.card, cardSlice?.outputs ?? [], cardSlice?.requires_by_family, owners);
    }
    // THE EXPORTER RULE, AUTOMATED (2026-09-29, the third live break:
    // 'no-model-facts: krea-2-raw' — the raw variant stamped its route
    // as the model and the hand roster never listed the address, so
    // compose phase 1 refused a route the registry itself resolves).
    // The roster was a hand-copy of registry truth and had drifted
    // across 54 claimed addresses. Every address the registry claims
    // whose OWNING family serves a row now derives its own row —
    // through the same deriveRow that already shaped the hand-listed
    // route rows (qwen3-tts-base). A family with no roster row is a
    // serving decision (its routes cannot compose either way — the
    // family itself is unserved), never silently papered over here.
    for (const [address, owner] of owners) {
        if (models[address] !== undefined)
            continue;
        const ownerSlice = slices.rows?.[owner];
        if (ownerSlice === undefined || ownerSlice.frozen !== undefined)
            continue;
        const cardSlice = slices.cards?.[ownerSlice.card];
        models[address] = deriveRow(reads, address, ownerSlice.card, cardSlice?.outputs ?? [], cardSlice?.requires_by_family, owners);
    }
    return { models, extension_node_types: slices.extension_node_types ?? {}, owners: Object.fromEntries(owners) };
}
//# sourceMappingURL=facts.js.map
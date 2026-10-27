// melite_discover — Melite discover (the rework, 2026-09-09):
// ONE disclosure system over both planes. Grants the progressive
// disclosure LINES (clamped summary rows — the tier the agent
// routes on). Thin door wrapper (estateRequest) — the SHAPE lives
// in doors/disclose.ts; this file is the DSH ToolDefinition face
// (input schema, presentCall, output schema/render, execute).
import { defineTool } from '@deepseek-ai/dsh-tools';
import { jsonClean } from "../json-clean.js";
const TIMEOUT_MS = 15_000;
/** Counts-first clamp: over this many lines the default answer
 * clamps (counts + vocabulary + the first rows ride instead). */
const CLAMP = 12;
export function meliteDiscover(estate, expandEstateDoors) {
    // PRESENTATION SEAT (§7 P7, the tool-presentation wall — one
    // seat for the invalid face): the presenter rides defineTool
    // validation, and defineTool's soft gate OWNS invalid args
    // (invalid → undefined, never throw). The pre-purge re-attach over
    // that gate (a second, ungated seat rendering the generic card for
    // junk) is deleted — conversion invariance (presentCall output must
    // not change) now reads against the gated face. execute validation
    // (ToolArgsError/INVALID_ARGS) is unaffected.
    const presentCall = (args) => {
        const a = (args ?? {});
        const bits = [];
        if (typeof a.lookup === 'string' && a.lookup !== '')
            bits.push(a.lookup);
        if (typeof a.tags === 'string' && a.tags !== '')
            bits.push(a.tags);
        if (typeof a.q === 'string' && a.q !== '')
            bits.push(a.q);
        return { card: 'generic', title: 'Discover' + (bits.length > 0 ? ': ' + bits.join(' · ') : ''), kind: 'search' };
    };
    // Ledger row 8 (2026-09-10): defineTool wraps the literal — the
    // registry gains schema compilation + input validation
    // (ToolArgsError/INVALID_ARGS) + timeoutMs enforcement this face
    // never had as a raw registration.
    const def = defineTool({
        name: 'melite_discover',
        description: 'Progressive disclosure tier 1 over the estate (cards + flows): returns clamped summary LINES, never bodies. '
            + 'THE EXPANSION LAW: the estate\u2019s deeper doors (melite_view, comfy_manage, melite_skill_read, ledger_tail) '
            + 'seat themselves the first time you touch the catalog \u2014 they are never missing, only deferred. '
            + 'q is RANKED, never literal: every real word scores its best facet (exact tag, exact word, modality, trigram fuzzy) and each line says WHY it matched \u2014 a full user sentence works. tags= stays a hard facet. '
            + 'Args: lookup (all | cards | flows, default all) + tags (comma-separated card-declared tags, e.g. "image,upscale") '
            + '+ optional q (free-text filter). Prefer a FLOW when one fits the task — composition over single calls; '
            + 'fall back to cards. COUNTS-FIRST: a large estate clamps to counts + the tag vocabulary + the first '
            + 'rows; detail=true for every line. Open a line with melite_load (agents md + signature + skill lines).',
        // ParameterSchemaSpec grammar: the map IS the implicit object root
        // (no type/properties wrapper), per-property `required: true` when
        // needed — all three filters are optional here.
        parameters: {
            lookup: {
                type: 'string',
                description: 'Which plane to list: all (default) | cards | flows.',
            },
            tags: {
                type: 'string',
                description: 'Comma-separated card-declared tags (image,upscale,generate,enhance,...). Empty means unfiltered.',
            },
            q: {
                type: 'string',
                description: 'Optional free-text filter over names/titles/descriptions/ids.',
            },
            detail: {
                type: 'boolean',
                description: 'Counts-first: when the estate is large the answer clamps to the first rows + counts + the tag vocabulary. detail=true returns every line.',
            },
        },
        presentCall,
        output: {
            schema: {
                type: 'object',
                additionalProperties: true,
                properties: {
                    flows: {
                        type: 'array',
                        items: { type: 'object', additionalProperties: true },
                        description: 'Flow lines (name/title/description/stages/skillRefs) — present unless lookup=cards.',
                    },
                    cards: {
                        type: 'array',
                        items: { type: 'object', additionalProperties: true },
                        description: 'Card lines (id/label/description/tags) — present unless lookup=flows.',
                    },
                    error: { type: 'string', description: 'The refusal text — present exactly when the tool refused (render prints REFUSED).' },
                },
            },
            render: (args, value) => {
                const v = value;
                if (v && typeof v.error === 'string')
                    return [{ type: 'text', text: 'melite_discover REFUSED: ' + v.error }];
                // THE MODEL-FACING LINES (the render IS the tool response the
                // model reads — dsh-tools createSuccessResult builds content
                // from output.render; the envelope only feeds the GUI). A
                // counts-only line starves routing: melite_load demands a name
                // "exactly as discovered", so the render MUST carry the lines.
                // Counts-first stays — but detail=true HONESTLY lifts it here
                // too (2026-09-21, the chatlog audit: the render once clamped
                // to 8 rows while promising "detail=true lists every line" —
                // the promise and the behavior disagreed and an agent burned
                // calls hunting the hidden rows, guessing retired model names).
                const wantsAll = args?.detail === true;
                const RENDER_CLAMP = wantsAll ? Number.POSITIVE_INFINITY : 8;
                const flows = Array.isArray(v?.flows) ? v.flows : [];
                const cards = Array.isArray(v?.cards) ? v.cards : [];
                const nf = typeof v?.counts?.flows === 'number' ? v.counts.flows : flows.length;
                const nc = typeof v?.counts?.cards === 'number' ? v.counts.cards : cards.length;
                const line = (x) => typeof x === 'string' ? x : '';
                const num = (x) => typeof x === 'number' ? String(x) : '?';
                // STROKE 85 (the operator's report: an agent read this list as
                // "cards on the bench" and wrecked the bench probing it):
                // discover walks THE ESTATE CATALOG — every card/flow that
                // exists — never the bench's staged working set. The line
                // says so, and names the bench's read door.
                const out = [`discover: ${nf} flows, ${nc} cards in the estate CATALOG (not your bench — read the bench's staged cards with melite_construct verb=read) — open one with melite_load`];
                // THE EMPTY ANSWER TEACHES (2026-09-21, the blind-first-call
                // audit: q is literal — a blind agent typing the user's
                // sentence got a bare 0/0 and had to reinvent strategy).
                if (flows.length === 0 && cards.length === 0) {
                    out.push('no match. q is ranked (tag/word/modality/trigram) — try the MODALITY as tags= (video, image, audio, 3d, generate, edit), fewer words, or lookup=all for the estate-wide first pass.');
                }
                if (flows.length > 0) {
                    out.push('flows:');
                    for (const f of flows.slice(0, RENDER_CLAMP)) {
                        out.push(`  ${line(f?.name)} — ${line(f?.title)} (${num(f?.stages)} stages)`);
                    }
                    if (!wantsAll && nf > RENDER_CLAMP)
                        out.push(`  +${nf - RENDER_CLAMP} more — detail=true lists every line`);
                }
                if (cards.length > 0) {
                    out.push('cards:');
                    for (const c of cards.slice(0, RENDER_CLAMP)) {
                        const tags = Array.isArray(c?.tags) ? c.tags.filter((t) => typeof t === 'string') : [];
                        const why = typeof c?.matched_by === 'string' && c.matched_by !== '' ? c.matched_by : '';
                        out.push(`  ${line(c?.id)} — ${line(c?.label)}${tags.length > 0 ? ` [${tags.join(',')}]` : ''}${why !== '' ? ` · why: ${line(why)}` : ''}`);
                    }
                    if (!wantsAll && nc > RENDER_CLAMP)
                        out.push(`  +${nc - RENDER_CLAMP} more — narrow with tags/q, or detail=true`);
                }
                if (Array.isArray(v?.tag_vocabulary)) {
                    const vocab = v.tag_vocabulary.filter((t) => typeof t === 'string');
                    if (vocab.length > 0)
                        out.push('tag vocabulary: ' + vocab.join(', '));
                }
                if (typeof v?.hint === 'string' && v.hint !== '')
                    out.push('hint: ' + v.hint);
                return [{ type: 'text', text: out.join('\n') }];
            },
        },
        async execute(args, exec) {
            // THE EXPANSION LAW: the catalog was touched — seat the estate's
            // deferred doors (view / manage / skill twins / ledger) for the
            // NEXT request boundary. Idempotent; a no-op once seated.
            expandEstateDoors();
            // defineTool input validation runs in the wrapper BEFORE the body
            // (invalid args throw ToolArgsError there) — args is always a
            // defined object here, so no nullish fallback exists to cover
            // (2026-09-12).
            const a = args;
            // The seat reads defaulted strings — the query string's own
            // defaults (the router parsed them the same way).
            const lookup = typeof a.lookup === 'string' && a.lookup !== '' ? a.lookup : 'all';
            const q = typeof a.q === 'string' && a.q !== '' ? a.q : '';
            const tags = typeof a.tags === 'string' && a.tags !== '' ? a.tags : '';
            try {
                const res = await estate.discover(lookup, q, tags, exec.signal, TIMEOUT_MS);
                // The gateway's /v1/discover answer IS the canonical result —
                // the wire-shape assertion mirrors the music card's gwJson
                // bridge (the tool trusts its own gateway contract; the
                // refusal branch constructs the shape literally).
                // COUNTS-FIRST (the bench rework, 2026-09-10): a large
                // estate clamps to the first CLAMP lines + counts + the tag
                // vocabulary (the scan digest); detail=true returns every
                // line. The default answer stays small enough to reason over.
                const r = res;
                const flows = Array.isArray(r.flows) ? r.flows : [];
                const cards = Array.isArray(r.cards) ? r.cards : [];
                if (a.detail !== true && (flows.length > CLAMP || cards.length > CLAMP)) {
                    const vocab = new Set();
                    for (const c of cards) {
                        const t = c['tags'];
                        if (Array.isArray(t))
                            for (const x of t)
                                if (typeof x === 'string' && x !== '')
                                    vocab.add(x);
                    }
                    return jsonClean({
                        counts: { flows: flows.length, cards: cards.length },
                        tag_vocabulary: [...vocab].sort().slice(0, 40),
                        flows: flows.slice(0, CLAMP),
                        cards: cards.slice(0, CLAMP),
                        hint: 'clamped — narrow with tags/q, or detail=true for every line',
                    });
                }
                // THE EMPTY-AND HINT (attempt-4's gap, verified 2026-09-24:
                // tags=image,video,audio → 0 because tags is an AND — no card
                // carries all three). A zero row with a multi-tag query names
                // the law; one tag per search is the idiom.
                if (flows.length === 0 && cards.length === 0) {
                    const tagCount = typeof a.tags === 'string' ? a.tags.split(',').filter((t) => t.trim() !== '').length : 0;
                    if (tagCount > 1) {
                        return jsonClean({
                            counts: { flows: 0, cards: 0 },
                            hint: '0 rows — tags is an AND: a card must carry EVERY listed tag. One tag per search (e.g. tags=video), or detail the vocabulary with lookup=cards.',
                        });
                    }
                }
                return jsonClean(res);
            }
            catch (e) {
                const err = e;
                // makeEstateRequest throws LOUD with its own named text when no
                // seat serves the lane ("no remote serves GET /v1/discover…") —
                // that message IS the honest answer; no string sniffing here.
                return jsonClean({ error: typeof err.body === 'string' && err.body !== '' ? err.body : (err.message ?? 'discover failed') });
            }
        },
    });
    // (§7 P7: the presenter rides defineTool validation — no second,
    // ungated seat over the gate. The tool-presentation wall pins the
    // gated face.)
    return def;
}
//# sourceMappingURL=melite-discover.js.map

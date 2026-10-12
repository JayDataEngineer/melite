/**
 * melite_skill_index - THE BINDING VOCABULARY (the no-dump rework,
 * 2026-09-21).
 *
 * This tool NEVER lists skill rows. The old flat dump was the core
 * breach of the progressive-disclosure architecture: an agent
 * scanning 63 rows picked a card-scoped generic prose skill over
 * the family's lane doc and ran a distilled turbo checkpoint at 25
 * steps — the index itself taught the wrong path. Skills bind to
 * their owner; disclosure of actual skills flows through the owning
 * surface (melite_load serves a card's/family's tier-1 skill
 * lines). This scan serves only the vocabulary: one row per FAMILY
 * and per CARD, each with its ENTRANCE doc id and skill count, plus
 * the flow count. To learn a skill id: open the owner.
 */
import { defineTool } from '@deepseek-ai/dsh-tools';
import { jsonClean } from "../json-clean.js";
const INDEX_TIMEOUT_MS = 15_000;
export function skillIndex(request) {
    // PRESENTATION ADAPTATION (tool-presentation wall + conversion
    // invariance — presentCall output must not change): defineTool
    // soft-gates presentCall behind arg validation (invalid → undefined),
    // but the raw face always returned the tool's own generic card, and
    // the wall pins that (junk/invalid args during streaming + replay
    // still render the generic view, never throw). The presenter is
    // shared: it rides the definition AND is re-attached over the gate
    // below. execute validation (ToolArgsError/INVALID_ARGS) is
    // unaffected.
    const presentCall = () => {
        return { card: 'generic', title: 'Skill index', kind: 'search' };
    };
    // Ledger row 8 (2026-09-10): defineTool wraps the literal — the
    // registry gains schema compilation + input validation
    // (ToolArgsError/INVALID_ARGS) + timeoutMs enforcement this face
    // never had as a raw registration.
    const def = defineTool({
        name: 'melite_skill_index',
        description: 'THE SELECTION LAW (operator 2026-09-21): this index serves the LIVE BENCH only — the cards composed '
            + 'this session and the families they name, one binding line each (entrance doc id + skill count). An '
            + 'EMPTY BENCH LISTS NOTHING: to find a card or flow call melite_discover (the paid door), never this '
            + 'index. To see actual skill lines, open the owner with melite_load; to read a body you already hold '
            + 'an id for, use melite_skill_read. This index never lists skill rows.',
        // ParameterSchemaSpec grammar: the map IS the implicit object root
        // — no arguments, so the map is empty.
        parameters: {},
        presentCall,
        output: {
            schema: {
                type: 'object',
                additionalProperties: true,
                properties: {
                    count: { type: 'number', description: 'Total skill docs across cards and flows.', required: true },
                    cards: {
                        type: 'array',
                        description: 'One row per card: id/genre/skills/entrance (the AGENT.md row id, or null).',
                        required: true,
                    },
                    flows: {
                        type: 'object',
                        additionalProperties: true,
                        description: 'Registry flow count + ids.',
                        required: true,
                    },
                    error: { type: 'string', description: 'The refusal text — present exactly when the tool refused (render prints REFUSED).' },
                },
            },
            render: (_args, value) => {
                const v = value;
                if (v && typeof v.error === 'string')
                    return [{ type: 'text', text: 'melite_skill_index REFUSED: ' + v.error }];
                // THE NO-DUMP LAW (render side): even if a legacy seat leaks
                // a flat `skills` array, it NEVER renders — the dump is dead.
                // THE CARD ABSTRACTION LAW (operator 2026-09-21): the agent's
                // tier-1 NEVER names the model plane — family rows are dropped
                // here even when a seat serves them. Cards + flows only.
                const cards = Array.isArray(v?.cards) ? v.cards : [];
                const flowCount = typeof v?.flows?.count === 'number' ? v.flows.count : 0;
                const count = typeof v?.count === 'number' ? v.count : 0;
                const line = (r) => {
                    const id = typeof r?.id === 'string' ? r.id : '';
                    if (id === '')
                        return '';
                    const genre = typeof r?.genre === 'string' && r.genre !== '' ? ` (${r.genre})` : '';
                    const n = typeof r?.skills === 'number' ? r.skills : 0;
                    const skills = n === 0 ? 'no skills' : n === 1 ? '1 skill' : `${n} skills`;
                    const entrance = typeof r?.entrance === 'string' && r.entrance !== ''
                        ? `entrance ${r.entrance}, ${skills}`
                        : 'no entrance doc';
                    return `  ${id}${genre} — ${entrance}`;
                };
                if (cards.length === 0 && flowCount === 0) {
                    return [{
                            type: 'text',
                            text: 'melite_skill_index: THE CATALOG IS THE SELECTION — nothing is listed while the bench is empty. Call melite_discover (the paid door) to find a card or flow; craft rows appear here only for what the bench holds.',
                        }];
                }
                const cardsWord = cards.length === 1 ? 'card' : 'cards';
                const out = [
                    `melite_skill_index: ${count} skills across ${cards.length} ${cardsWord} · ${flowCount} flows — the bench's selection only; open a card with melite_load; this index never lists skill rows or model families`,
                ];
                for (const c of cards) {
                    const l = line(c);
                    if (l !== '')
                        out.push(l);
                }
                return [{ type: 'text', text: out.join('\n') }];
            },
        },
        async execute(_args, exec) {
            const res = await request('GET', '/v1/skills', undefined, exec.signal, INDEX_TIMEOUT_MS);
            // A seat serving the LEGACY flat shape (a `skills` rows array)
            // contributes nothing — families/cards default empty and the
            // rows never ride (the wall pins the leak dead).
            const cards = Array.isArray(res.cards) ? res.cards : [];
            const flows = (res.flows !== null && typeof res.flows === 'object')
                ? res.flows
                : {};
            const flowCount = typeof flows.count === 'number' ? flows.count : 0;
            const count = cards.length + flowCount;
            return jsonClean({ count: cards.length + flowCount, cards, flows: { count: flowCount, ids: flows.ids ?? [] } });
        },
    });
    // Re-attach the unconditional presenter over defineTool's
    // soft-validation gate (see the adaptation above).
    def.presentCall = presentCall;
    return def;
}
//# sourceMappingURL=skill-index.js.map
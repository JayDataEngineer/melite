/**
 * melite_skill_read - progressive disclosure TIER 2: one skill's full body,
 * loaded ONLY when needed (GET /v1/skills/<id>). Every read is ledgered
 * gateway-side (skill.read in _ledger.jsonl), so which recipes the
 * agent actually used is auditable after the fact.
 *
 * Ids come from melite_load (its skill section prints every boarded skill id): global lane docs are bare stems
 * ("swap", "directing"), model card docs are "model:<id>", and
 * per-model skills are "model:<id>:<stem>". An id no door serves
 * answers "no such skill" — never invent one.
 */
import { defineTool } from '@deepseek-ai/dsh-tools';
import { jsonClean } from "../json-clean.js";
const READ_TIMEOUT_MS = 15_000;
export function skillRead(estate) {
    // PRESENTATION SEAT (§7 P7, the tool-presentation wall — one
    // seat for the invalid face): the presenter rides defineTool
    // validation, and defineTool's soft gate OWNS invalid args
    // (invalid → undefined, never throw). The pre-purge re-attach over
    // that gate (a second, ungated seat rendering the generic card for
    // junk) is deleted — conversion invariance (presentCall output must
    // not change) now reads against the gated face. execute validation
    // (ToolArgsError/INVALID_ARGS) is unaffected.
    const presentCall = (args) => {
        const a = (typeof args === "object" && args !== null ? args : {});
        return {
            card: 'generic',
            title: `Read skill ${String(a.id ?? '?')}`,
            kind: 'read',
            rawInput: String(a.id ?? '?'),
        };
    };
    // Ledger row 8 (2026-09-10): defineTool wraps the literal — the
    // registry gains schema compilation + input validation
    // (ToolArgsError/INVALID_ARGS) + timeoutMs enforcement this face
    // never had as a raw registration.
    const def = defineTool({
        name: 'melite_skill_read',
        description: 'Load ONE skill document in full (progressive disclosure tier 2): markdown body plus its '
            + 'name/description and genre/model when scoped. Discover ids first with melite_load. '
            + 'Reads are recorded in the gateway ledger (skill.read) - the audit trail of which '
            + 'recipes informed a generation. Args: id (from melite_load).',
        // ParameterSchemaSpec grammar: the map IS the implicit object root
        // (no type/properties wrapper), per-property `required: true`.
        parameters: {
            id: {
                type: 'string',
                description: 'Skill id from melite_load\'s skill section: "<stem>", "model:<id>" or "model:<id>:<stem>".',
                required: true,
            },
        },
        presentCall,
        output: {
            schema: {
                type: 'object',
                additionalProperties: true,
                properties: {
                    id: { type: 'string', required: true },
                    name: { type: 'string', description: 'Skill title from frontmatter.' },
                    description: { type: 'string', description: 'One-line summary.' },
                    content: { type: 'string', description: 'The full markdown body.', required: true },
                    error: { type: 'string', description: 'The refusal text — present exactly when the tool refused (render prints REFUSED).' },
                },
            },
            render: (args, value) => {
                const a = (typeof args === "object" && args !== null ? args : {});
                const v = value;
                if (v && typeof v.error === 'string' && v.error !== '') {
                    return [{ type: 'text', text: 'melite_skill_read REFUSED: ' + v.error }];
                }
                // THE BODY RIDES (the render IS the model-facing tool response
                // — see melite-discover's render note): tier 2's whole purpose
                // is "load ONE skill document in full" so the agent writes
                // prompts from the craft it READS. A title-only line leaves
                // the agent having read nothing.
                const head = 'melite_skill_read ' + String(a.id ?? v.id ?? '?') + ': ' + String(v.name ?? 'loaded');
                const body = typeof v.content === 'string' ? v.content : '';
                return [{ type: 'text', text: body !== '' ? head + '\n' + body : head + '\n(no body)' }];
            },
        },
        async execute(args, exec) {
            // defineTool input validation runs in the wrapper BEFORE the body
            // (invalid args throw ToolArgsError there) — args is always a
            // defined object and id a required string here, so honest casts
            // ride instead of gate-dead typeof fallbacks (2026-09-12).
            const a = args;
            const id = a.id;
            if (id.length === 0) {
                throw new Error('melite_skill_read: "id" is required (a skill id string from melite_load\'s skill section)');
            }
            // Unknown ids arrive as RayGatewayError with the gateway's 404 body
            // VERBATIM - let it propagate; that IS the honest answer.
            const res = await estate.skillRead(id, exec.signal, READ_TIMEOUT_MS);
            return jsonClean({
                id: res.id ?? id,
                name: res.name ?? null,
                description: res.description ?? null,
                genre: res.genre ?? null,
                model: res.model ?? null,
                content: res.content ?? '',
            });
        },
    });
    // (§7 P7: the presenter rides defineTool validation — no second,
    // ungated seat over the gate. The tool-presentation wall pins the
    // gated face.)
    return def;
}
//# sourceMappingURL=skill-read.js.map

/**
 * melite_skill_write - the agent AUTHORS a skill (POST /v1/skills).
 * The lora hand-off's second half (operator 2026-11-09): once a model
 * family can pick up a lora, the same conversation can tell the agent
 * the trigger words and examples, and the agent lands a skill doc that
 * every later load serves — so the knowledge travels with the estate
 * instead of dying in the chat.
 *
 * The doc lands in the estate's authored plane and is served by the
 * SAME walk as the tracked skill docs, so its id is exactly
 * "model:<model>:<name>" (what melite_load prints and melite_skill_read
 * takes). Writes are ledgered gateway-side (skill.write).
 */
import { defineTool } from '@deepseek-ai/dsh-tools';
import { jsonClean } from "../json-clean.js";
const WRITE_TIMEOUT_MS = 15_000;
export function skillWrite(estate) {
    const presentCall = (args) => {
        const a = (typeof args === 'object' && args !== null ? args : {});
        return {
            card: 'generic',
            title: `Write skill ${String(a.model ?? '?')}/${String(a.name ?? '?')}`,
            kind: 'edit',
            rawInput: `${String(a.model ?? '?')}/${String(a.name ?? '?')}`,
        };
    };
    const def = defineTool({
        name: 'melite_skill_write',
        description: 'Author ONE skill document for a model family (the lora hand-off\'s second half): name it so '
            + 'it is known by that name, and record the operator\'s trigger words and examples so every '
            + 'later load serves them. The doc lands in the estate\'s authored plane and is served by the '
            + 'same walk as tracked skills — its id is "model:<model>:<name>", readable with '
            + 'melite_skill_read and listed by melite_load. Never invent trigger words: when the operator '
            + 'has not stated them, omit trigger_words and the doc records the blank. Args: model, name, '
            + 'description, plus trigger_words / examples / body / lora / replace.',
        // ParameterSchemaSpec grammar: the map IS the implicit object root,
        // per-property `required: true`.
        parameters: {
            model: {
                type: 'string',
                description: 'The model family the skill serves (e.g. "krea-2") — the family must exist.',
                required: true,
            },
            name: {
                type: 'string',
                description: 'The skill\'s name: path-safe (letters, digits, . _ -) and it IS the id leaf.',
                required: true,
            },
            description: {
                type: 'string',
                description: 'One-line summary printed by every load (what the skill is for).',
                required: true,
            },
            trigger_words: {
                type: 'array',
                items: { type: 'string' },
                description: 'The operator\'s trigger words, verbatim and in order. Omit when not stated.',
            },
            examples: {
                type: 'array',
                items: { type: 'string' },
                description: 'The operator\'s example prompts, verbatim. Omit when not stated.',
            },
            body: {
                type: 'string',
                description: 'Extra markdown after the rendered sections (use notes, strengths, gotchas).',
            },
            lora: {
                type: 'string',
                description: 'The loras mod row this skill documents (the tray file name), when it is for a lora.',
            },
            replace: {
                type: 'boolean',
                description: 'Rewrite an existing doc. The door refuses otherwise, so the previous trigger words are never lost silently.',
            },
        },
        presentCall,
        output: {
            schema: {
                type: 'object',
                additionalProperties: true,
                properties: {
                    id: { type: 'string', description: 'The served id ("model:<model>:<name>").', required: true },
                    path: { type: 'string', description: 'The doc\'s path on disk.', required: true },
                    replaced: { type: 'boolean', description: 'Whether an existing doc was rewritten.', required: true },
                    name: { type: 'string' },
                    description: { type: 'string' },
                    error: { type: 'string', description: 'The refusal text — present exactly when the tool refused (render prints REFUSED).' },
                },
            },
            render: (args, value) => {
                const a = (typeof args === 'object' && args !== null ? args : {});
                const v = value;
                if (v && typeof v.error === 'string' && v.error !== '') {
                    return [{ type: 'text', text: 'melite_skill_write REFUSED: ' + v.error }];
                }
                const head = 'melite_skill_write ' + String(v.id ?? `model:${String(a.model ?? '?')}:${String(a.name ?? '?')}`)
                    + (v.replaced === true ? ' (rewritten)' : ' (written)');
                return [{ type: 'text', text: head + '\nserved at once by melite_load and melite_skill_read\n' + String(v.path ?? '') }];
            },
        },
        async execute(args, exec) {
            // defineTool input validation runs in the wrapper BEFORE the body
            // (invalid args throw ToolArgsError there) — the required fields
            // are strings here.
            const a = args;
            const doc = {
                model: a.model,
                name: a.name,
                description: a.description,
                trigger_words: Array.isArray(a.trigger_words) ? a.trigger_words : [],
                examples: Array.isArray(a.examples) ? a.examples : [],
                body: typeof a.body === 'string' ? a.body : '',
                lora: typeof a.lora === 'string' ? a.lora : '',
                replace: a.replace === true,
            };
            // A refusal arrives as the seat's error with the door's voice
            // VERBATIM — let it propagate; that IS the honest answer.
            const res = (await estate.skillWrite(doc, exec.signal, WRITE_TIMEOUT_MS));
            return jsonClean({
                id: res.id,
                path: res.path,
                replaced: res.replaced === true,
                name: res.name ?? null,
                description: res.description ?? null,
            });
        },
    });
    return def;
}
//# sourceMappingURL=skill-write.js.map

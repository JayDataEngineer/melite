// cardTool.ts — THE CARD-TOOL BUILDER (roadmap §13, the audio-cards
// DRY audit 2026-09-20). Six tool faces (tts, music, motion,
// h3-timeline, image-gen, image-edit) each restated the same
// ~150-line skeleton around the two-door execute — the exact
// degeneration LAW 2 exists to prevent, one plane above the
// transport this package already owns (estateCall.ts absorbed the
// hand-copied GatewayError blocks; this absorbs the tool shape).
//
// WHAT THE BUILDER OWNS (identical for every card tool):
//   the flow-envelope OUTPUT_SCHEMA, declared JSON-array param
//   normalization, the two-door execute (drafts → start + the
//   {model:} lift), the GatewayError mapping, the presentation
//   projections (render/presentationMeta/presentResult), and the
//   presentCall preview row.
// WHAT THE CARD STILL OWNS (the spec surface below): the tool-plane
//   name + flow id, the identity prose, the emitted params spec
//   (emitParamsSpec + any extra knobs), the default model, and the
//   driving field the preview reads.
import { defineTool } from '@deepseek-ai/dsh-tools';
import { GatewayError, jsonLane } from "./estateCall.js";
/** The flow envelope every card tool returns, stated once: flow +
 *  model + the run ids/status/error arms. defineTool infers
 *  execute's return from it, and the cards' annotations name the
 *  same inference — so multi-arm returns check arm-by-arm instead of
 *  collapsing into a union whose `?: undefined` fillers poison the
 *  schema's `& Record<string, JsonValue>` tail (gate-found,
 *  2026-09-12). */
export const CARD_TOOL_OUTPUT = {
    type: 'object',
    additionalProperties: true,
    properties: {
        flow: { type: 'string', required: true },
        model: { type: 'string', required: true },
        run_id: { type: 'string', description: 'The queue run id — poll with run_status.' },
        draft_id: { type: 'string', description: 'The minted card draft id.' },
        status: { type: 'string', description: 'Registration status (queued/running).' },
        error: { type: 'string', description: 'Named refusal reason, when the estate refused.' },
    },
};
function jsonArrayValue(value) {
    if (typeof value !== 'string')
        return value;
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : value;
    }
    catch {
        return value;
    }
}
export function normalizeJsonArrayParams(params, keys) {
    const normalized = { ...params };
    for (const key of keys ?? []) {
        const value = normalized[key];
        if (value !== undefined)
            normalized[key] = jsonArrayValue(value);
    }
    return normalized;
}
/** Build a card's tool face over the shared skeleton. Behavior is
 *  the six faces' verbatim common core — their tool.spec.ts walls
 *  pin it and must stay green unchanged. `timeoutMs` is left
 *  unstated by every current card (the six faces' TIMEOUT_MS
 *  constants were declared and never passed — a dead class this
 *  builder refuses to resurrect; jsonLane's 60s default governs). */
export function defineCardTool(call, spec) {
    const gw = jsonLane(call);
    const { name: TOOL_NAME, flow: FLOW, label, description, defaultModel: DEFAULT_MODEL, previewField, previewValue, timeoutMs } = spec;
    const previewPart = previewValue ?? ((a) => `${previewField}=${String(a[previewField] ?? '').slice(0, 60)}`);
    /** The explicit model resolve (cordis-architecture F13, 2026-10-20):
     *  defaulting is ONE named step here — never a hidden
     *  `a.model ?? DEFAULT_MODEL` at each consumer (explicit >
     *  implicit at boundaries: the spec's declared default applies
     *  once, visibly, and both the preview and the run read the SAME
     *  resolved value).
     *  @param a the validated tool args (model optional — the closed
     *  enum's default applies when absent or empty). */
    const resolveModelArg = (a) => typeof a.model === 'string' && a.model !== '' ? a.model : DEFAULT_MODEL;
    return defineTool({
        name: TOOL_NAME,
        description,
        parameters: spec.parameters,
        presentCall(args) {
            // Validated args (defineTool's wrapper): the preview field is
            // a required knob — always present. model is the optional enum
            // default.
            const a = args;
            return {
                card: 'generic',
                title: label,
                kind: 'execute',
                rawInput: `model=${resolveModelArg(a)} ${previewPart(a)}`,
            };
        },
        output: {
            schema: CARD_TOOL_OUTPUT,
            render: (_args, value) => {
                const v = (value ?? {});
                if (typeof v.error === 'string' && v.error) {
                    return [{ type: 'text', text: `${TOOL_NAME} REFUSED: ${v.error}` }];
                }
                return [{
                        type: 'text',
                        text: `${TOOL_NAME} [${String(v.model ?? '?')}] → ${String(v.run_id ?? '?')} — poll with run_status`,
                    }];
            },
            // presentationMeta: the tool-private payload persisted verbatim on
            // tool/result — the facts presenters and client renderers narrow
            // (model + run ids, or the named refusal). Pure: called on live
            // streaming AND session-log replay.
            presentationMeta: (_args, value) => {
                const v = (value ?? {});
                return {
                    flow: String(v.flow ?? FLOW),
                    model: String(v.model ?? '?'),
                    ...typeof v.run_id === 'string' && v.run_id !== '' ? { run_id: v.run_id } : {},
                    ...typeof v.draft_id === 'string' && v.draft_id !== '' ? { draft_id: v.draft_id } : {},
                    ...typeof v.status === 'string' && v.status !== '' ? { status: v.status } : {},
                    ...typeof v.error === 'string' && v.error !== '' ? { error: v.error } : {},
                };
            },
        },
        // presentResult: the COMPLETED card's render intent — title only; the
        // raw result content (render above) carries the body line. Reads
        // result.meta (the projection), never re-derives.
        presentResult(_args, result) {
            if (result?.meta == null)
                return undefined;
            const m = result.meta;
            const model = typeof m.model === 'string' && m.model !== '' ? m.model : '?';
            if (typeof m.error === 'string' && m.error !== '') {
                return { card: 'generic', title: `${label} [${model}] — REFUSED` };
            }
            const runId = typeof m.run_id === 'string' && m.run_id !== '' ? m.run_id : '?';
            return { card: 'generic', title: `${label} [${model}] → ${runId}` };
        },
        // The tool plane returns the FLOW ENVELOPE (flow + model + the
        // run ids/status/error arms the output schema declares) — never
        // a CardResult (the card plane owns artifacts).
        async execute(args, exec) {
            // Validated args (the defineTool wrapper) — always the object.
            const a = args;
            // The emitted params spec synthesizes a CLOSED model enum —
            // the wrapper rejects ''/unknown values at the seam, so a
            // validated model is always a served entry. Cards serving
            // the semantic style enum resolve values through
            // spec.resolveModel first: the estate's admission spelling
            // (a route atom) crosses the wire, while the envelope and
            // preview keep the picked style value.
            const rawModel = resolveModelArg(a);
            const model = spec.resolveModel !== undefined ? spec.resolveModel(rawModel) : rawModel;
            const params = {};
            for (const [k, v] of Object.entries(a))
                if (k !== 'model')
                    params[k] = v;
            const normalizedParams = normalizeJsonArrayParams(params, spec.jsonArrayParams);
            // Declared JSON arrays and the per-card transform ride BEFORE
            // both doors; the draft params and start lift see the same body.
            const preparedParams = normalizedParams;
            spec.prepare?.(preparedParams);
            try {
                // DOOR ONE (compose — CARD BIRTH LAW): the stage doc names
                // the model as the stage's service; the params carry the
                // card's own surface.
                const draft = await gw('POST', '/v1/flows/drafts', {
                    intent: FLOW,
                    stages: [{ title: label, kind: 'generation', service: model, params: preparedParams }],
                }, exec?.signal, timeoutMs);
                const draftId = typeof draft.draftId === 'string' ? draft.draftId : '';
                if (draftId === '')
                    return { flow: FLOW, model: rawModel, error: 'gateway draft POST returned no draftId' };
                // DOOR TWO (start): draft_id + exactly one door key — the
                // {model:} arm resolves, composes, and queues the run.
                // THE ENVELOPE LIFT (card_compose_body 363-372): the start
                // body carries the card params BESIDE the envelope keys —
                // the editor's own wire posts the SAME body (params + model)
                // with draft_id added; the {model:} arm lifts body-minus-
                // envelope as the ONE params stanza. A params-less body
                // composes defaults only and refuses on required fields.
                const started = await gw('POST', '/v1/flows/start', {
                    ...preparedParams,
                    model,
                    draft_id: draftId,
                }, exec?.signal, timeoutMs);
                const named = typeof started.error === 'string' ? started.error : '';
                if (named !== '')
                    return { flow: FLOW, model: rawModel, error: named };
                if (typeof started.run_id !== 'string' || started.run_id === '') {
                    return { flow: FLOW, model: rawModel, error: 'gateway start returned no run_id' };
                }
                return {
                    flow: FLOW,
                    model: rawModel,
                    draft_id: draftId,
                    run_id: started.run_id,
                    status: typeof started.status === 'string' ? started.status : 'queued',
                };
            }
            catch (e) {
                // jsonLane's contract: transport faults arrive wrapped as
                // GatewayError(0, message, ""); a PRE-ABORTED signal throws
                // the DOMException BEFORE the lane — cancellation propagates,
                // never becomes a refusal value.
                if (e instanceof GatewayError) {
                    // Named refusals (4xx/5xx bodies carrying {error}) are
                    // DOMAIN OUTCOMES — canonical values, not throws.
                    return { flow: FLOW, model: rawModel, error: e.named || e.body || `estate ${e.status}` };
                }
                throw e;
            }
        },
    });
}
//# sourceMappingURL=cardTool.js.map

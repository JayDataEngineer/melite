// Mask-studio card flow tools — the agents bundle's tools (the JS
// carrier; the Python twin was purged 2026-08-20). Same TOOLS contract,
// consumed out of process via /v1/agent-manifest.
//
// All calls go through the ONE run door, the status poll, and the
// form-spec pre-flight. ALWAYS call get_flow_spec BEFORE submitting.
const TIMEOUT_MS = 30_000;
/** The estate ctx (set once by the manifest door that serves these
 *  tools — the lanes answer through its mounted listeners). */
let estateCtx;
/** Wire the estate context (the serving door calls this at mount). */
export function bindEstate(ctx) {
    estateCtx = ctx;
}
async function laneJson(method, path, body, signal) {
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const fused = signal === undefined ? timeout : AbortSignal.any([timeout, signal]);
    fused.throwIfAborted();
    if (estateCtx === undefined)
        throw new Error("mask-studio tools: no estate context bound (bindEstate)");
    throw new Error("mask-studio tools: estate lane " + method + " " + path + " died with the gateway (2026-09-10) — migrate to a named Typert remote");
}
/** Pre-flight: the form spec for a model route (fields + defaults). */
export async function getFlowSpec(route = "mask-studio", signal) {
    return laneJson("GET", "/v1/form-spec?model=" + encodeURIComponent(route), undefined, signal);
}
/** Poll a running generation — brick progress + the output artifacts. */
export async function getRunStatus(runId, signal) {
    return laneJson("GET", "/v1/flows/status/" + encodeURIComponent(runId), undefined, signal);
}
/** CARD BIRTH LAW (operator order 2026-09-06): the start door
 * 4xxes a start without a doc-backed draft_id. This bundle is
 * consumed out of process (no @melite/catalog import — the tools
 * ship as the standalone agents carrier), so the compose-then-start
 * ritual lives here module-locally: same draft door, same law. */
async function ensureDraftId(body, signal) {
    const declared = body.draft_id;
    if (typeof declared === "string" && declared !== "")
        return declared;
    // same dead lane, same loud voice (postJson never existed here —
    // the ReferenceError bridge fixed 2026-09-12)
    const doc = await laneJson("POST", "/v1/flows/drafts", body, signal);
    const draftId = doc.draftId;
    if (typeof draftId !== "string" || !draftId) {
        throw new Error("card compose returned no draftId — refusing to start cardless");
    }
    return draftId;
}
/** Submit a mask-studio run through the ONE run door (shape 2). */
export async function submitMaskRun(args, signal) {
    const { route = "mask-studio", input_image, prompt, detect_mode = "body", detection_threshold = 0.35, sam_threshold = 0.93, sam_dilation = 0, export_face = false, export_hands = false, export_body = false, export_paint = false, outputs, ...params } = args;
    const body = { model: route };
    if (input_image !== undefined)
        body.input_image = input_image;
    if (prompt !== undefined)
        body.prompt = prompt;
    Object.assign(body, {
        detect_mode, detection_threshold, sam_threshold, sam_dilation,
        export_face, export_hands, export_body, export_paint,
    });
    if (outputs !== undefined)
        body.outputs = outputs;
    Object.assign(body, params); // forwarded verbatim; the compile layer rejects loudly
    body.draft_id = await ensureDraftId(body, signal);
    return laneJson("POST", "/v1/flows/start", body, signal);
}
export const TOOLS = [
    {
        name: "get_flow_spec",
        description: "Pre-flight form spec for the mask-studio route — authoritative fields + defaults (call BEFORE submitting).",
        input_schema: { type: "object", properties: { route: { type: "string", default: "mask-studio" } } },
        call: (a) => getFlowSpec(a.route ?? "mask-studio"),
    },
    {
        name: "submit_mask_run",
        description: "Submit a mask-studio run (detect → SAM3 refine → export masks) — returns {run_id, bricks, total}. Prefer the `outputs` recipe: one {filter, selection} entry per mask, the phase-C hierarchy (see AGENT.md).",
        input_schema: {
            type: "object",
            properties: {
                input_image: { type: "string", description: "photo to mask — artifact id from the media library" },
                prompt: { type: "string", description: "what to isolate (optional; detect_mode drives detection)" },
                detect_mode: { type: "string", default: "body" },
                detection_threshold: { type: "number", default: 0.35 },
                sam_threshold: { type: "number", default: 0.93 },
                sam_dilation: { type: "integer", default: 0 },
                export_face: { type: "boolean", default: false },
                export_hands: { type: "boolean", default: false },
                export_body: { type: "boolean", default: false },
                export_paint: { type: "boolean", default: false },
                outputs: {
                    type: "array",
                    description: "THE RECIPE — one {filter?, selection} entry per mask; overrides the flat recipe params (AGENT.md grammar)",
                    items: { type: "object" },
                },
            },
            required: ["input_image"],
        },
        call: (a) => submitMaskRun(a),
    },
    {
        name: "get_run_status",
        description: "Poll a run by run_id — brick progress and the output mask artifacts.",
        input_schema: { type: "object", properties: { run_id: { type: "string" } }, required: ["run_id"] },
        call: (a) => getRunStatus(a.run_id),
    },
];
//# sourceMappingURL=tools.js.map

// The tool face of the clothing-placement card (M2′ stroke 2,
import { GatewayError, jsonLane, type EstateCall } from '@melite/estate-call'
// 2026-09-09): the card package emits its DSH tool ITSELF — the
// tool-str-replace-editor receipt (one package, one tool, the
// capability seam consumed in execute). This kills the
// fetch-registrar bridge for this card: no manifest round-trip, no
// host-side generic executor — the schema, the prose, and the
// execute path all live in the card's package. One spelling.
//
// EXECUTOR PATH (the card's own law, its header: "The card RUNS via
// the flow path, never the {model:}/draft path"): the two-door
// birth+queue sequence the flow_run tool rides — POST
// /v1/flows/drafts {flow: card id, ...params} mints the draft (the
// estate's cardGate validates admission), then POST
// /v1/flows/start rides draft_id into the queue. Refusals are
// CANONICAL VALUES (a domain outcome the renderer explains), never
// thrown; infrastructure failures throw (the DSH tool contract).
// LEAF IMPORTS, never the engine root (M2′ stroke 2): the root
// index pulls models.ts's boot TLA, whose bootModels awaits
// cardDefs — and cardDefs composes THIS package — a cycle that
// deadlocks ESM evaluation (an in-progress module's dynamic import
// waits for full evaluation). The card's data flows leaf-ward only.
import { emitParamsSpec } from "@melite/comfyui-cordis/params-emit";
import { identity, schema } from "./card.ts";
import { defineTool } from "@deepseek-ai/dsh-tools";
import type { InferValue, ToolDefinition, ParameterSchemaSpec } from "@deepseek-ai/dsh-tools";

/**
 * The TOOL-plane name: the card id, hyphens→underscores, no
 * suffix (the DSH tool-name convention — cookbook's read_file; the
 * operator's receipt 2026-09-09). The REGISTRY-row plane keeps its
 * own law (cardWireName: id + "_card") — two planes, two names,
 * each stated once.
 */
export const TOOL_NAME = "clothing_placement";

const FLOW = "clothing-placement"
const TIMEOUT_MS = 15e3

/** The output envelope, stated once: defineTool infers execute's
 * return from it, and the execute annotation below names the same
 * inference — so multi-arm returns check arm-by-arm instead of
 * collapsing into a union whose `?: undefined` fillers poison the
 * schema's `& Record<string, JsonValue>` tail (gate-found, 2026-09-12). */
const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: true,
  properties: {
    run_id: { type: "string", description: "The queue run id — poll with run_status." },
    draft_id: { type: "string", description: "The minted card draft id." },
    flow: { type: "string", required: true },
    status: { type: "string", description: "Registration status (queued/running)." },
    error: { type: "string", description: "Named refusal reason, when the estate refused." },
  },
} as const

type OutputEnvelope = InferValue<typeof OUTPUT_SCHEMA>

export function buildCardTool(call: EstateCall): ToolDefinition {
  const gw = jsonLane(call)
  return defineTool({
    name: TOOL_NAME,
    description: identity.description,
    // The DSH spec projection, derived in the engine from the same
    // walk that serves /v1/tools params (one family, two planes).
    parameters: emitParamsSpec(schema as never, []) as ParameterSchemaSpec,
    presentCall(args: unknown) {
      // defineTool's wrapper validates args BEFORE this body runs
      // (dsh-tools: invalid args → presentCall returns undefined at
      // the seam) — body/garment are required knobs, always present
      // here, and args itself is always the validated object.
      const a = args as Record<string, unknown>;
      return {
        card: "generic",
        title: identity.label,
        kind: "execute",
        rawInput: `body=${String(a.body)} garment=${String(a.garment)}`,
      };
    },
    output: {
      // The DSL's explicit object form: per-property required,
      // openness declared (the value map never acquires an
      // accidental JSON-Schema default). render is the pure Native
      // projection of one validated canonical value.
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => {
        const v = (value ?? {}) as Record<string, unknown>;
        if (typeof v.error === "string" && v.error) {
          return [{ type: "text", text: `${TOOL_NAME} REFUSED: ${v.error}` }];
        }
        return [{
          type: "text",
          text: `${TOOL_NAME} → ${String(v.run_id ?? "?")} — poll with run_status`,
        }];
      },
      // presentationMeta: the persisted tile channel — every card tool
      // emits {draft_id, run_id, model?, status, error} verbatim; the
      // client card view narrows it (never parses render prose). Pure:
      // live streaming AND session-log replay.
      presentationMeta: (_args, value) => {
        const v = (value ?? {}) as Record<string, unknown>;
        return {
          flow: FLOW,
          ...typeof v.run_id === "string" && v.run_id !== "" ? { run_id: v.run_id } : {},
          ...typeof v.draft_id === "string" && v.draft_id !== "" ? { draft_id: v.draft_id } : {},
          ...typeof v.status === "string" && v.status !== "" ? { status: v.status } : {},
          ...typeof v.error === "string" && v.error !== "" ? { error: v.error } : {},
        };
      },
    },
    // The tool plane returns the FLOW ENVELOPE (flow + the run
    // ids/status/error arms the output schema declares) — never a
    // CardResult (the card plane owns artifacts). The annotation names
    // the schema's own inference (OUTPUT_SCHEMA above): each arm checks
    // against the envelope directly.
    async execute(args, exec): Promise<OutputEnvelope> {
      try {
        const composed = await gw( "POST", "/v1/flows/drafts", { flow: FLOW, ...args }, exec.signal, TIMEOUT_MS);
        const draftId = (composed.draftId ?? composed.draft_id) as string | undefined;
        if (typeof draftId !== "string" || draftId === "") {
          return { flow: FLOW, error: "card compose returned no draftId" };
        }
        const started = await gw( "POST", "/v1/flows/start", { flow: FLOW, ...args, draft_id: draftId }, exec.signal, TIMEOUT_MS);
        if (typeof started.error === "string" && started.error) {
          return { flow: FLOW, error: started.error };
        }
        return {
          flow: FLOW,
          draft_id: draftId,
          run_id: (started.run_id ?? "") as string,
          status: (started.status ?? "queued") as string,
        };
      } catch (e) {
        if (e instanceof GatewayError) {
          // The named refusal: a domain outcome, canonically.
          let named = "";
          try {
            named = String((JSON.parse(e.body) as { error?: unknown }).error ?? "");
          } catch { named = ""; }
          return { flow: FLOW, error: named || e.body || `estate ${e.status}` };
        }
        throw e;
      }
    },
  });
}

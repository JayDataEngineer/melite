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
// gateway's cardGate validates admission), then POST
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
import type { ToolDefinition, ParameterSchemaSpec } from "@deepseek-ai/dsh-tools";

/**
 * The TOOL-plane name: the card id, hyphens→underscores, no
 * suffix (the DSH tool-name convention — cookbook's read_file; the
 * operator's receipt 2026-09-09). The REGISTRY-row plane keeps its
 * own law (cardWireName: id + "_card") — two planes, two names,
 * each stated once.
 */
export const TOOL_NAME = "clothing_placement";

/** The Melite gateway base URL default (the loopback listen — the
 *  same value melite-tools' Config defaults to; a plugin Config owns
 *  its own default). */
/** Gateway answered non-2xx; body carried verbatim (the named
 *  refusal — RayGatewayError's counterpart, owned by this package:
 *  cross-package imports of host internals are not a seam). */
export function buildCardTool(call: EstateCall): ToolDefinition {
  return defineTool({
    name: TOOL_NAME,
    description: identity.description,
    // The DSH spec projection, derived in the engine from the same
    // walk that serves /v1/tools params (one family, two planes).
    parameters: emitParamsSpec(schema as never, []) as ParameterSchemaSpec,
    presentCall(args: unknown) {
      const a = (args ?? {}) as Record<string, unknown>;
      return {
        card: "generic",
        title: identity.label,
        kind: "execute",
        rawInput: `body=${String(a.body ?? "?")} garment=${String(a.garment ?? "?")}`,
      };
    },
    output: {
      // The DSL's explicit object form: per-property required,
      // openness declared (the value map never acquires an
      // accidental JSON-Schema default). render is the pure Native
      // projection of one validated canonical value.
      schema: {
        type: "object",
        additionalProperties: true,
        properties: {
          run_id: { type: "string", description: "The queue run id — poll with run_status." },
          draft_id: { type: "string", description: "The minted card draft id." },
          flow: { type: "string", required: true },
          status: { type: "string", description: "Registration status (queued/running)." },
          error: { type: "string", description: "Named refusal reason, when the gateway refused." },
        },
      },
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
    async execute(args, exec): Promise<CardResult> {
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
          return { flow: FLOW, error: named || e.body || `gateway ${e.status}` };
        }
        throw e;
      }
    },
  });
}

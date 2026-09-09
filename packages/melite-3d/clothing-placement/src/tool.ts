// The tool face of the clothing-placement card (M2′ stroke 2,
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
import { cardWireName } from "@comfyui/cordis/service";
import { emitParamsSchema } from "@comfyui/cordis/params-emit";
import { identity, schema } from "./card.ts";

/** The Melite gateway base URL default (the loopback listen — the
 *  same value melite-tools' Config defaults to; a plugin Config owns
 *  its own default). */
export const DEFAULT_GATEWAY_URL = "http://localhost:33081";

/** Gateway answered non-2xx; body carried verbatim (the named
 *  refusal — RayGatewayError's counterpart, owned by this package:
 *  cross-package imports of host internals are not a seam). */
export class GatewayError extends Error {
  readonly status: number;
  readonly body: string;
  constructor(status: number, path: string, body: string) {
    super(`gateway ${status} ${path}: ${body}`);
    this.name = "GatewayError";
    this.status = status;
    this.body = body;
  }
}

async function gwJson(
  gatewayUrl: string,
  method: string,
  path: string,
  body: unknown,
  signal: AbortSignal | undefined,
  timeoutMs: number,
): Promise<Record<string, unknown>> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  if (signal) signal.addEventListener("abort", () => ctl.abort(), { once: true });
  try {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (process.env.INF_AGENT_SESSION) headers["x-agent-session"] = process.env.INF_AGENT_SESSION;
    const r = await fetch(gatewayUrl.replace(/\/$/, "") + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ctl.signal,
    });
    const text = await r.text();
    if (!r.ok) throw new GatewayError(r.status, path, text.slice(0, 400));
    return JSON.parse(text) as Record<string, unknown>;
  } finally {
    clearTimeout(t);
  }
}

/** The tool surface this package contributes to a host's tools
 *  service (the Consumer-owned structural shape — the capability
 *  seam law: the Consumer keeps its own declaration of what it
 *  contributes; never an `unknown`). */
export interface CardToolShape {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, unknown>;
  presentCall(args: unknown): Record<string, unknown>;
  readonly output: {
    readonly schema: Record<string, unknown>;
    render(args: unknown, value: unknown): Array<{ type: "text"; text: string }>;
  };
  execute(
    args: Record<string, unknown>,
    exec: { signal: AbortSignal },
  ): Promise<Record<string, unknown>>;
}

/** The minimal tools-service surface this package consumes where the
 *  composing host provides one (optional contribution — ctx.get law). */
export interface ToolsServiceLike {
  register(tool: CardToolShape): () => void;
}

const FLOW = "clothing-placement";
const TIMEOUT_MS = 15e3;

/** Build the card's DSH tool. Every emitted field derives from the
 *  package's own single spelling: name from the id law, prose from
 *  identity, parameters from the card's Schemastery schema via the
 *  engine's emitter (the same projection /v1/tools serves). */
export function buildCardTool(gatewayUrl: string): CardToolShape {
  return {
    name: cardWireName(FLOW),
    description: identity.description,
    parameters: emitParamsSchema(schema as never, []) as Record<string, unknown>,
    presentCall(args) {
      const a = (args ?? {}) as Record<string, unknown>;
      return {
        card: "generic",
        title: identity.label,
        kind: "execute",
        rawInput: `body=${String(a.body ?? "?")} garment=${String(a.garment ?? "?")}`,
      };
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: true,
        properties: {
          run_id: { type: "string", description: "The queue run id — poll with run_status." },
          draft_id: { type: "string", description: "The minted card draft id." },
          flow: { type: "string" },
        },
        required: ["run_id", "flow"],
      },
      render: (_args, value) => {
        const v = (value ?? {}) as Record<string, unknown>;
        if (typeof v.error === "string" && v.error) {
          return [{ type: "text", text: `${cardWireName(FLOW)} REFUSED: ${v.error}` }];
        }
        return [{
          type: "text",
          text: `${cardWireName(FLOW)} \u2192 ${String(v.run_id ?? "?")} \u2014 poll with run_status`,
        }];
      },
    },
    async execute(args, exec) {
      try {
        const composed = await gwJson(gatewayUrl, "POST", "/v1/flows/drafts", { flow: FLOW, ...args }, exec.signal, TIMEOUT_MS);
        const draftId = (composed.draftId ?? composed.draft_id) as string | undefined;
        if (typeof draftId !== "string" || draftId === "") {
          return { flow: FLOW, error: "card compose returned no draftId" };
        }
        const started = await gwJson(gatewayUrl, "POST", "/v1/flows/start", { flow: FLOW, ...args, draft_id: draftId }, exec.signal, TIMEOUT_MS);
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
  };
}

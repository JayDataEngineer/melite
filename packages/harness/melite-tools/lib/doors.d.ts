import type { LlmStreamSeam } from './llm-complete.js';
import { mcpFormDoc } from '@melite/engine-mcp/formDoc';
/** The tool-row shape, DERIVED from the contract's own signature
 *  (rolldown's dts emit chokes on cross-package type-only imports —
 *  the agent/craft precedent is value-only imports; this keeps the
 *  single-source law without a second declaration). */
type McpToolRows = Parameters<typeof mcpFormDoc>[0]['tools'];
export declare const inject: string[];
/** Door config — same spelling as the tool plane's. */
export interface Config {
    /**
     * The card LLM preference (operator order: "muse-spark-1.3-contributor
     * i want to use over glm-5v-turbo"): the route the ✦ enhance door
     * prefers BETWEEN the caller's explicit llm and the host default
     * model. An ordered candidate, never a contract — a name absent
     * from the live list falls to the default arm (llm-complete's
     * resolution law). An explicit empty string disables the arm.
     */
    enhancePreference?: string;
}
/** The shipped default: the operator's named card model. */
export declare const DEFAULT_ENHANCE_PREFERENCE = "muse-spark-1.3-contributor";
/** The seated MCP servers (folded LIVE from the tools seat's
 *  schemas: every mcp__<server>__<tool> name contributes its
 *  server; sorted for deterministic serving). Empty when none are
 *  seated — the census IS the truth, never a config copy. */
export declare function seatedMcpServers(c: CtxView): string[];
/** The OPTED-IN MCP servers (the estate's own engines seat: the
 *  config's mcpEngines field seats ids 'mcp:<server>' — the
 *  2026-10-12 operator law makes the MCP card EXPERIMENTAL OPT-IN,
 *  so /v1/forms + /v1/model-catalog fold the card on the estate's
 *  opt-in, NEVER on the ambient tools census: the operator's DSH
 *  lane always carries harness mcp__<server>__<tool> schemas, and
 *  ambient presence is not intent (error j2,
 *  dev_docs/ERRORS.md:86). The card's TILES (the MCPs plus-box —
 *  mcpToolsOf) and the per-server form-spec docs ride the ambient
 *  seatedMcpServers still: the spawned subagent is a DSH harness
 *  spawn, ambient servers are what it can actually be granted — only
 *  the card's PRESENCE is opt-in. The probe never propagates: a
 *  throw from get() or ids() folds nothing (the doors 200 with no
 *  card rather than 500 on a half-mounted seat). */
export declare function seatedMcpEngines(c: CtxView): string[];
/** One server's tool rows (the LIVE census for its form's options:
 *  bare tool names — the executor composes mcp__<server>__<tool>
 *  on the wire). */
export declare function mcpToolsOf(c: CtxView, server: string): McpToolRows;
/** Minimal structural view of the services the doors touch. */
interface CtxView {
    /** The documented optional-service probe (cordis-tutorial/
     *  03-services.md: skip inject, probe at the use site) — the typed
     *  replacement for the retired `as unknown as { get }` casts
     *  (F-2/F-4, 2026-11-05). */
    get(name: string): unknown;
    effect(effect: () => void, label?: string): unknown;
    llm: LlmStreamSeam;
    registry: {
        values(): Iterable<{
            fibers: Iterable<{
                uid: number | null;
                store: unknown;
                inertia?: Promise<void>;
            }>;
        }>;
    };
    tools: {
        schemas(): Array<{
            name: string;
            description?: string;
            parameters?: unknown;
        }>;
    };
    webServer: {
        /** The host's bound port (the own-origin seam reads it live). */
        port: number;
        register(route: {
            kind: 'exact' | 'prefix';
            path: string;
            handler: (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => void;
        }): () => void;
    };
}
/** THE PENDING GRACE (the 3088 brick, 2026-09-26 — live proof: a
 * fiber stuck mid-transition held the pending gate closed for 10
 * hours while every non-seat door served fine). "Still activating"
 * is a BOOT-RACE answer, but the state is cheap to observe and
 * GLOBAL: any ONE wedged fiber (a failed plugin-tree reload, a hung
 * MCP seat handshake) would brick every seat door forever. The
 * stamp starts when the state is first observed and clears when it
 * lifts; past ESTATE_PENDING_GRACE_MS the state is a WEDGE, not an
 * activation — the gate opens and the seat probe's own honest voice
 * answers (serve, or the missing-seat 502 naming the family). */
export declare const ESTATE_PENDING_GRACE_MS = 120000;
/** THE RE-ARM QUIET (li-l, the flap brick): a fiber cycling
 *  activating→ready→activating (the multi-host blender-seat
 *  collision, live proof 2026-10-10: three mcp_server.py children
 *  from three hosts, 3379 remounts in one log) reset the stamp to
 *  null on every momentary lift and held the gate closed FOREVER.
 *  The stamp now lifts only after a SUSTAINED quiet — flapping
 *  cannot extend the grace window. Exported for the re-arm wall
 *  (a later boot race gets a fresh window: doors.spec.ts). */
export declare const ESTATE_PENDING_REARM_MS = 10000;
export declare function apply(c: CtxView, config?: Config): void;
export {};
//# sourceMappingURL=doors.d.ts.map

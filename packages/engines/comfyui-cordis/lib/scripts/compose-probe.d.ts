/**
 * compose-probe.ts — THE PROBE VOCABULARY (one home, two runners).
 *
 * The fill tables and refusal parsers card-compose-liveness.spec.ts
 * authored for the dead-card wall, extracted verbatim (2026-10-17,
 * journey-closure E8) so the boot-fixture derivation derives its
 * address set with THE SAME probe law the liveness wall composes
 * under — one probe vocabulary, never two drifting copies.
 *
 * PURE: no imports at all. Both runners load it — vitest (the walls
 * suites, workspace imports resolved through tsconfig paths) and
 * plain `node --experimental-strip-types` (the regen leg's probe,
 * scripts/regen-node-vocab.mjs →
 * packages/engines/comfyui-cordis/scripts/boot-address-set-probe.ts),
 * which resolves workspace packages from the cordis package's own
 * node_modules and cannot carry bare imports in this file.
 */
/**
 * The probe doc for one refusing param, by its name's shape:
 * SINGULAR media names ride one path string (what a compose gate
 * reads); plural/list names ride one-element arrays.
 *
 * @param name — the refusing param's own name.
 * @param estateFile — an existing estate file handed to gates that
 *   stat their input (the caller's always-present file).
 * @returns a bounds-legal probe value for the param.
 */
export declare function fillFor(name: string, estateFile: string): unknown;
/**
 * The missing-param name a refusal names, if it names one. Reads
 * the card tier's own voices: the gated resolve ("required param
 * 'x' missing"), the schema walk (field paths), and the compose
 * gates ("required param ... on the ... card").
 *
 * @param message — the refusal's message.
 * @returns the named param, or null when the refusal names nothing.
 */
export declare function namedParam(message: string): string | null;
/**
 * Every param name a refusal lists (a gate may demand several —
 * 'ref_audio' + 'ref_text' ride together).
 *
 * @param message — the refusal's message.
 * @returns the distinct param names the message grounds.
 */
export declare function namedMulti(message: string): string[];
/** The undeclared names a schema-admission refusal lists, if it
 * lists any — the probe's DELETE instruction (a key the doc carries
 * that the card does not know can never be filled into legality;
 * it must leave the doc).
 *
 * @param message — the refusal's message.
 * @returns the undeclared param names, unquoted comma text. */
export declare function undeclaredNames(message: string): string[];
/** A composed graph as the probe reads it: node id → its class_type
 *  and wired inputs (the /prompt wire's untyped JSON). */
export interface ProbeGraph {
    [nodeId: string]: {
        class_type?: unknown;
        inputs?: Record<string, unknown>;
    } | undefined;
}
/** One probe round's attempt: build the doc, compose, return the
 *  graph — or throw the compose's own refusal. */
export type ProbeAttempt = (doc: Record<string, unknown>) => ProbeGraph;
/** The outcome of one probed compose. */
export interface ProbeResult {
    /** The composed graph, or null when every round refused. */
    composed: ProbeGraph | null;
    /** The filled param names, in fill order. */
    filled: string[];
    /** The refusals seen, in order (the dead card's own voice). */
    refusals: string[];
}
/**
 * THE PROBE LOOP: compose, read the refusal's named param, fill,
 * retry (the dead-card wall's own loop, card-compose-liveness).
 * A refusal that names nothing new ends the loop — that is the
 * dead card. A closed enum overwrites even an already-filled name:
 * the first refusal may come unquoted ("not one of 1024|1536") and
 * strand a wrong probe; the quoted restatement is the card's own
 * correction.
 *
 * @param attempt — one compose round over the probed doc.
 * @param rounds — the loop bound (the wall rides 14).
 * @param estateFile — the existing file handed to stat gates.
 * @returns the composed graph or the refusals that killed the row.
 */
export declare function probeCompose(attempt: ProbeAttempt, rounds: number, estateFile: string): ProbeResult;

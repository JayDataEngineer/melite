/**
 * THE EXPANSION SEAT (progressive disclosure, operator 2026-10-08 —
 * the Tool Search Tool law over our own toolset).
 *
 * The eager trio (discover / load / construct) is the whole melite
 * schema surface in a session's FIRST request. The deferred estate
 * doors — view, model upkeep, the skill twins, the ledger — seat
 * themselves the moment the catalog is touched (any discover or
 * load execute), so a chat that never touches media never pays
 * their tokens.
 *
 * WHY THIS IS LEGAL AT ALL: DSH's EpochHeader carries the assembled
 * tool schemas PER REQUEST and appends a `change` snapshot when the
 * set changes (session.md, the request-envelope contract) —
 * mid-session registration is native, the next model call simply
 * sees the seated doors. No DSH core surface is touched: this is
 * our own registry membership, our own tools.
 *
 * The registrar is set once per plugin mount by apply(); the eager
 * builders call {@link expandEstateDoors} at execute entry. A small
 * module of its own so the builders never import index.ts (no
 * cycle: index -> builders -> expansion <- index).
 */
/** apply() installs the registrar here. */
export declare function installExpansion(registrar: () => void): void;
/** Plugin-unload arm: the deferred registrations' disposers are
 * plugin-lifetime — apply collects them and hands the flush here. */
export declare function clearExpansion(): void;
/** Seat the deferred estate doors (idempotent, safe to call from
 * any execute arm, any number of times). */
export declare function expandEstateDoors(): void;
//# sourceMappingURL=expansion.d.ts.map

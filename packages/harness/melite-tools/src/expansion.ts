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

/** Set by apply() — seats the deferred doors (idempotent). Null on
 * an unmounted plugin; the call is then a no-op. */
let seatDeferred: (() => void) | null = null

/** apply() installs the registrar here. */
export function installExpansion(registrar: () => void): void {
  seatDeferred = registrar
}

/** Plugin-unload arm: the deferred registrations' disposers are
 * plugin-lifetime — apply collects them and hands the flush here. */
export function clearExpansion(): void {
  seatDeferred = null
}

/** Seat the deferred estate doors (idempotent, safe to call from
 * any execute arm, any number of times). */
export function expandEstateDoors(): void {
  seatDeferred?.()
}

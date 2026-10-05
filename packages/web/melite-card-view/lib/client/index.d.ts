/**
 * `@melite-plugin/dsh-card-view` — browser half.
 *
 * Two planes over the estate's cards surface (the bench rework, plan
 * §1 strokes 1/4):
 *
 * 1. The chat plane (unchanged): the `tool.call.toolview` keyed slot,
 *    keyed to the wire tool names in CARD_TOOLS — the Melite draft
 *    producers registered by @melite/harness-tools. Unclaimed keys
 *    fall back to the generic tool row, so this registration is
 *    additive for our own tools.
 *
 * 2. The sidebar plane (new, 2026-09-10): the `cards` tab TYPE on the
 *    native right-sidebar registry (two registrations sharing one
 *    kind, the ui-sidebar-right contract — the shipped
 *    documentpreview is the reference) plus the `cards` resource
 *    provider (ctx.resources) the body reads through `useResource`.
 *    The tab claims `dsh-resource://cards/**`; `openTab('cards')`
 *    opens the bench page. This replaces the dsh-better-sidebar
 *    registry (retired with the plugin) — the native subsystem is
 *    the one the web profile ships.
 *
 * Registration waits for seat declarations via ctx.slots.inject (the
 * declaration ledger's wait seam); unload cancels a pending wait and
 * cascades the registration.
 *
 * Failure policy: slot/registry problems are logged, never thrown —
 * the web shell fails the whole boot when a plugin apply throws, and
 * an external plugin must not take the GUI down.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { StageViewOwnerProps, ToolCallOwnerProps } from './types.js';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface SlotMap {
        'tool.call.toolview': {
            kind: 'keyed';
            scope: 'session';
            owner: ToolCallOwnerProps;
        };
        /**
         * Keyed stage surface, dispatched by card name (the ui-tool
         * 'tool.call.toolview' law, mirrored). Register with
         * `key: '<card name>'` to own how one card's stage renders inside
         * the zoom card — the key domain is open (any card name), so a
         * typo simply never renders. An unclaimed key falls back to the
         * generic form-spec card; registering is additive for your own
         * card and a takeover for a shipped one. The owner passes the
         * stage's identity, its frozen bench row, and the drill's own
         * verbs, so the view stays a pure function of what the bench
         * already knows.
         */
        'cards.stage.view': {
            kind: 'keyed';
            scope: 'session';
            owner: StageViewOwnerProps;
        };
    }
}
/** Every card tool that produces a draft — the card tile renders for ALL of them. */
export { CARD_TOOLS } from './card-tools.js';
/** Required services (fiber inject waiting — the registries must be up
 *  first: the native sidebar subsystem + the resource model + the
 *  sidebar's navigation face, which the conversation card's rows ride
 *  to open the Cards tab at a draft stage — the old embed's law — and
 *  the gateway client's remote service, which carries the mounted
 *  estate namespaces the bench tail consumes). */
export declare const inject: string[];
/**
 * Register both planes: the toolview keys for every card tool, and the
 * cards tab (type + body + resource provider).
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): Promise<void>;
//# sourceMappingURL=index.d.ts.map

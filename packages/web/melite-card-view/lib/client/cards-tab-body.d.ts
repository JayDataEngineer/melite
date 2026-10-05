/** cards-tab-body.tsx — CardsTab + the address law (extracted from
 * CardsTab.tsx hour 15; the tab body's own composition — the bench,
 * draft, and run views ride their own seam files). */
/**
 * The Cards tab body — the bench's user plane (plan §5: "the user
 * browses visually in the tab").
 *
 * Bench view (`dsh-resource://cards/bench`): the stage rows GROUPED BY
 * CARD (the categories — each card's stages under its own header with
 * a count), each row opening a DSH Modal drilldown (id/card/engine/
 * params — the chat tile's drilldown pattern, primitives Modal), the
 * revision trail's head, and the Run gesture — which projects the
 * stages onto the flow_inline wire and starts them under the bench's
 * own draft_id, EXACTLY what melite_flow's bench verb does (one
 * truth, two planes; the model's plane is per-call reads, never this
 * component's frames).
 *
 * Run view (`dsh-resource://cards/run/<runId>`): live status + stage
 * rows + artifacts, riding the resource provider's frames — plus the
 * way back: "Back to bench" navigates home, and "Restore to bench"
 * turns the card BACK INTO A FLOW (drafts/get on the run's draft_id
 * + per-stage bench/add-stage as the user, CAS-chained).
 *
 * ADDRESS LAW (the `loading sidebar://cards…` hang, dead 2026-09-11):
 * the shell's navigation address is the SHELL's (guide clicks arrive
 * as the tab id's own address, not a cards address). An address that
 * does not parse as a cards address serves the BENCH — the tab never
 * sits on a resource no provider claims.
 *
 * The body is dispatched by the keyed `sidebar.right.pane.tab` seat
 * under the type's id; the address arrives through the standard
 * `useTabInfo` hook, the value through the standard `useResource`
 * hook. Local prop typings (the package's local-spelling pattern —
 * see index.ts) keep this package off sibling runtime imports.
 */
import { createElement as h } from 'react';
import type { StageViewOwnerProps } from './types.js';
import type { CardsBenchValue, CardsDraftValue, CardsRunValue } from './cards-resource.js';
/** The injected tab information hook's shape (dsh-client-ui-sidebar-right's
 *  UseSidebarRightTabInfo, spelled locally). */
interface TabInfo {
    readonly tab: {
        readonly kind: string;
        readonly contentId?: string;
        readonly navigation: {
            readonly address: string;
        };
        readonly actions: {
            openResource(address: string): void;
        };
    };
}
/** The global standard resource hook's shape (UseResource specialized to
 *  the cards protocol, local spelling). */
interface ResourceHook {
    (address: string): {
        status: 'none' | 'loading' | 'live' | 'failed';
        value?: CardsBenchValue | CardsRunValue | CardsDraftValue;
        failure?: {
            message?: string;
        };
    };
}
export interface CardsTabProps {
    useTabInfo?: () => TabInfo;
    useResource?: ResourceHook;
    /** The conversation this tab serves (SessionStandardProps — the
     *  ui-session merge delivers sessionId to every session-scoped slot
     *  body). The bench is per-conversation (stroke 44): the tab binds
     *  its bench to exactly this key; unattributed seats serve 'main'. */
    sessionId?: string;
    /** Injected by the slot system because the seat registration
     *  declares 'cards.stage.view' + 'cards.stage.preview' as children
     *  (PropsRenderSlots shape; optional so test doubles and legacy
     *  mounts render the generic card). */
    renderSlot?: StageViewRenderSlot;
}
/** The typed dispatch fn the slot system injects for the declared
 *  children — RenderSlotFn spelled locally so the component file
 *  stays free of the slot package's runtime graph. Hour-9: the
 *  preview seam's consult rides the same injection (keyed by media
 *  kind — the shared video/image previews). */
export interface StageViewRenderSlot {
    (key: 'cards.stage.view', owner: StageViewOwnerProps, opts?: {
        entryKey?: string;
        fallback?: import('react').ReactNode;
    }): import('react').ReactNode;
    (key: 'cards.stage.preview', owner: import('@melite/contracts').PreviewOwnerProps, opts?: {
        entryKey?: string;
        fallback?: import('react').ReactNode;
    }): import('react').ReactNode;
}
/** ADDRESS LAW (the `loading sidebar://cards…` hang, dead 2026-09-11):
 *  the shell's navigation address is the SHELL's (guide clicks arrive
 *  as the tab id's own address, not a cards address). An address that
 *  does not parse as a cards address serves the BENCH — the tab never
 *  sits on a resource no provider claims. */
export declare function resolveCardsAddress(rawAddress: string): string;
export declare function CardsTab(props: CardsTabProps): ReturnType<typeof h>;
export {};
//# sourceMappingURL=cards-tab-body.d.ts.map

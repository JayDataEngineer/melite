/**
 * assets-tab — the ONE DSH right-sidebar tab that is NOT cards:
 *
 *   ComfyUI Manager — a direct GUI on the estate's management plane.
 *     Every button is ONE action of the manage-plane SSOT
 *     (@melite/estate-queue's managePlane.ts — Cordis provisioning +
 *     ComfyUI-Manager), reached over the `manage` Typert remote
 *     (MANAGE_TYPERT_REMOTE — the host binds it in the estate
 *     composition; the deck seats the namespace card-base's
 *     manageRemote() accessor hands back). The vocabulary mirrors the
 *     comfy_manage agent tool 1:1. Progressive
 *     disclosure: status is the cheap index and refreshes SILENTLY
 *     after every mutating action (never through the result pane —
 *     that pane belongs to the user's last explicit dispatch);
 *     discovery (installed packs, snapshots) renders as ROWS in place.
 *     INFERENCE LAW honored by construction — no action here
 *     runs inference, and lifecycle actions are refused SERVER-side
 *     while any run reads running/queued (the guard lives in the SSOT,
 *     never in this panel).
 *
 * Transport history (kill ledger): the tab's calls died with the
 * gateway app (this plugin's /v1/manage proxy, then a ctx.remote.lane
 * shape that never mounted client-side — "remote.lane is not a
 * function", 2026-09-10), then rode a hand-rolled fetch frame
 * (2026-09-10 to 2026-10-01). Today the panel rides the MOUNTED
 * `manage` Typert namespace (@melite/estate-manage's generated
 * client, seated by the deck's apply): the Connection owns
 * transport, RPC ids, and frame validation; this panel owns the
 * envelope's reply mapping and its voices.
 *
 * Siblings' fate (NO LEGACY): Ray Media deleted with the media plugin
 * (5cbb5bcc — DSH's own media system owns that surface); Ray Flows
 * retired with the yaml spec library (35f2f830).
 */
import * as React from 'react';
import type { ManageActDoc, ManageEnvelopeRow, ManageJsonValue } from '@melite/estate-manage/types';
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol';
interface ManageReply {
    action?: string;
    ok?: boolean;
    detail?: string;
    data?: unknown;
    code?: string;
    status?: number;
    state?: string;
    next_action?: string;
    operation_id?: string;
    misses?: string[];
    partial?: boolean;
    restart_required?: boolean;
}
/** The manage lane's face (the generated namespace's one method —
 *  structural so this panel never imports the remote package at
 *  runtime). */
export interface ManageLane {
    readonly act: (doc: ManageActDoc, signal?: AbortSignal) => Promise<RemoteResult<ManageEnvelopeRow>>;
}
/** Seat the manage namespace (called once by the deck's apply;
 *  `undefined` unseats — the loud-refusal arm a panel render without
 *  the contribution meets). */
export declare function seatManageNamespace(lane: ManageLane | undefined): void;
export declare function postManage(action: string, payload: Record<string, ManageJsonValue>, signal?: AbortSignal): Promise<ManageReply>;
export declare function ComfyManagerPanel(): React.ReactElement;
interface TabCtx {
    effect(fn: () => void, name?: string): unknown;
    sidebarRightTabs: {
        register(def: {
            id: string;
            kind: string;
            title(): string;
            guide?: Array<{
                id: string;
                order: number;
                title(): string;
                description?(): string;
                icon?: React.ComponentType<{
                    size?: number;
                    className?: string;
                }>;
            }>;
        }): unknown;
    };
    slots: {
        inject(name: 'sidebar.right.pane.tab', declare: () => unknown): unknown;
        register(options: {
            name: 'sidebar.right.pane.tab';
            key: string;
        }, component: React.ComponentType<Record<string, unknown>>): unknown;
    };
}
export declare function registerAssetsTab(ctx: TabCtx): void;
export {};
//# sourceMappingURL=assets-tab.d.ts.map

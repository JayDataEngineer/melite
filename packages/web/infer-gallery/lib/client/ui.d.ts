/**
 * Shared primitives for the media family (audit F6: the two panels
 * declared a "sibling styling family" by copy-paste — these are the
 * copies, promoted). Tokens live in ui.tokens.ts; every structural
 * element used twice lives here once.
 *
 * PRIMITIVE LAW (2026-09-09, restored with the full port): anything
 * DSH ships rides DSH — Input, Button, Pill, Modal, Tooltip come
 * from `@deepseek-ai/dsh-client-ui-primitives` (a platform module —
 * the frozen module table answers it, the bundle never inlines it).
 * The panels run inside the DSH host where the --dsw-* tokens live.
 * What remains handrolled below has NO DSH counterpart
 * (shell/stat/empty/error text chrome) — if DSH ships it later, the
 * handroll dies the same day.
 */
import type { JSX, ReactNode } from 'react';
export declare const FONT = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
export declare const MONO = "ui-monospace, monospace";
/** The stage every non-image tile/card sits on. */
export declare const gradientStage = "linear-gradient(160deg, var(--dsw-alias-bg-layer-1, #1e293b) 0%, var(--dsw-alias-bg-layer-2, #0f172a) 100%)";
/** Caption scrim over posters. */
export declare const gradientCaption = "linear-gradient(to top, var(--dsw-alias-fill-subtle, rgba(2,6,23,0.92)), transparent)";
export declare function PanelShell({ dataAttr, children }: {
    dataAttr: string;
    children: ReactNode;
}): JSX.Element;
export declare function Stat({ children }: {
    children: ReactNode;
}): JSX.Element;
export declare function SearchInput({ value, onChange, placeholder }: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
}): JSX.Element;
export declare function RefreshButton({ loading, onClick }: {
    loading: boolean;
    onClick: () => void;
}): JSX.Element;
export declare function Empty({ children }: {
    children: ReactNode;
}): JSX.Element;
export declare function ErrorBanner({ children }: {
    children: ReactNode;
}): JSX.Element;
export interface GatewayError {
    gateway: string;
    message: string;
}
/** Per-gateway notes: transport failures, door drops and dedupe overlap
 * all ride the same errors channel — the message says which. */
export declare function GatewayErrors({ errors }: {
    errors: GatewayError[];
}): JSX.Element | null;
//# sourceMappingURL=ui.d.ts.map

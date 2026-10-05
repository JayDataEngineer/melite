import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Tooltip } from '@deepseek-ai/dsh-client-ui-primitives';
import { cn } from "./chrome.js";
import css from './card.module.css';
/** The estate's tooltip anchor: the DSH Tooltip atom over a REAL
 *  layout box (a display:contents or fragment child measures a zero
 *  rect and pins the bubble to the viewport corner).
 * @param props.tip - bubble text; absent renders the child bare.
 * @param props.side - bubble placement, default 'top'.
 * @param props.delayDuration - hover delay in ms, default 300.
 * @param props.children - the single anchor element. */
export function Tip({ tip, side = 'top', delayDuration = 300, children }) {
    if (tip === undefined)
        return children;
    return (_jsx(Tooltip, { label: tip, side: side, delayMs: delayDuration, children: _jsx("span", { className: css.tipAnchor, children: children }) }));
}
export function ControlRow({ label, hint, children, density = 'md', className, }) {
    return (_jsxs("label", { className: cn(density === 'sm' ? css.ctlRowSm : css.ctlRow, className), children: [_jsxs("span", { children: [label, hint != null ? hint : null] }), children] }));
}
// ── SectionLabel — the uppercase group heading ──────────────────────
export function SectionLabel({ children, tail, className, }) {
    return (_jsxs("div", { className: cn(css.sectionLabel, className), children: [_jsx("span", { className: css.sectionLabelText, children: children }), tail != null ? _jsx("span", { className: css.sectionLabelTail, children: tail }) : null] }));
}
// ── EmptyState — the shared nothing-here block ──────────────────────
export function EmptyState({ icon, title, hint, variant = 'pane', className, }) {
    return (_jsxs("div", { "data-slot": "empty-state", "data-variant": variant, className: cn(variant === 'overlay' ? css.emptyOverlay : css.emptyPane, className), children: [icon, _jsx("p", { className: css.emptyTitle, children: title }), hint != null ? _jsx("p", { className: css.emptyHint, children: hint }) : null] }));
}
// ── Skeleton — the pane grammar's loading face ───────────────────────
/** Skeleton — the quiet loading block (promoted 2026-09-18 from
 *  motion's kit, where it was the estate's only copy): a bare div
 *  with the estate pulse. EmptyState is the pane's empty face;
 *  Skeleton is its loading face. */
export function Skeleton({ className, ...props }) {
    return _jsx("div", { "data-slot": 'skeleton', className: cn(css.skeleton, className), ...props });
}
export function PaneHeader({ title, meta, hint, lead, variant = 'strip', className, }) {
    if (variant === 'preview') {
        return (_jsxs("div", { "data-slot": "pane-header", "data-variant": "preview", className: cn(css.paneHeaderPreview, className), children: [lead, title != null ? _jsx("span", { className: css.paneTitle, children: title }) : null, meta != null ? _jsx("span", { className: css.paneMeta, children: meta }) : null, hint] }));
    }
    return (_jsxs("div", { "data-slot": "pane-header", "data-variant": "strip", className: cn(css.paneHeaderStrip, className), children: [lead, title != null ? _jsx("span", { className: css.paneTitle, children: title }) : null, meta != null ? _jsx("span", { className: css.paneMetaNum, children: meta }) : null, hint != null ? _jsx("span", { className: css.paneHint, children: hint }) : null] }));
}
export function PaneShell({ children, className }) {
    return (_jsx("div", { "data-slot": "pane-shell", className: cn(css.paneShell, className), children: children }));
}
//# sourceMappingURL=layout.js.map

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * StudioShell + RailSection + defineShellDeclaration — the ONE card
 * chrome owner (founded 2026-09-12, debt extermination: the six
 * studio-local copies — anny/ideo/mask shells, motion/h3 kits, mesh
 * shell.ts — collapsed here, bodies byte-identical). Same props,
 * same declaration shape, DSH-token styling. The rail still projects
 * through the shell-provided slot when one exists.
 *
 * Reached through the `/client` door (`@melite/card-base/client`):
 * shell body, rail section, declaration door. Styling rides `./shell.module.css`
 * (the anny rule set — the superset; the kits' shellErrors look
 * unified here: same border/bg, danger-ink text, reset rows,
 * aligned icon).
 */
import { IconWarningTriangleOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives';
import { StudioRail } from "./studioRail.js";
import { cx } from "./chrome.js";
import { ToastViewport } from "./toast.js";
import styles from "./shell.module.css";
/** The loud error line — shell-owned chrome. Same DOM the assembly
 *  body always rendered. */
export function StudioShellErrorLine({ errors, }) {
    if (errors.length === 0)
        return null;
    return (_jsx("div", { role: "alert", className: styles.errorLine, children: errors.map((e) => (_jsxs("p", { className: styles.errorRow, children: [_jsx(IconWarningTriangleOutlineRegular, { className: styles.errorIcon }), e.id, ": ", e.message] }, e.id))) }));
}
/** The studio body: params column LEFT (projected into the shell rail
 *  slot when one exists), preview RIGHT, optional bottom bar, then the
 *  error line. The uniform three-slot shape — timeline and form cards
 *  are the same grain, forms simply leave the right/bottom slots empty.
 *
 *  THE TOAST LAW (stroke 36): the shell mounts the ONE toast viewport
 *  — toasts are shell-owned chrome exactly like the error line (the
 *  construction law: no studio wires it, no studio can forget it).
 *  Before: motion hand-mounted a copy in a slot the contract never
 *  had (type drift), anny pushed toasts with NO viewport mounted —
 *  silently dropped — and ideogram4 hand-wired its own outside the
 *  shell. The per-studio mount is DEAD; any toast pushed from any
 *  seam renders here, once. */
export function StudioShell({ params, preview, bottom, errors = [], className, }) {
    return (_jsxs("div", { className: cx(styles.shell, className), children: [_jsx(StudioRail, { children: params }), preview, bottom, _jsx(StudioShellErrorLine, { errors: errors }), _jsx(ToastViewport, {})] }));
}
export function RailSection({ title, actions, children, className, titleClassName, ...props }) {
    return (_jsxs("section", { "data-slot": "rail-section", "aria-label": typeof title === "string" ? title : undefined, className: cx(styles.railSection, className), ...props, children: [_jsxs("div", { className: styles.railHead, children: [_jsx("p", { className: cx(styles.railTitle, titleClassName), children: title }), actions] }), children] }));
}
/** The construction door: one obvious way to build a declaration,
 *  typed at the call site. Runtime-frozen. */
export function defineShellDeclaration(declaration) {
    return Object.freeze(declaration);
}
export { StudioRail };
//# sourceMappingURL=shell.js.map

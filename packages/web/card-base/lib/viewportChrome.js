import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { cx } from "./chrome.js";
import { STAGE_BACKGROUND_DARK } from "./stage3d.js";
import styles from "./viewportChrome.module.css";
export function ViewportFrame({ children, label, empty, className, style, ...props }) {
    return (_jsxs("div", { "data-slot": "viewport-frame", "aria-label": label, className: cx(styles.frame, className), 
        // The stage colour reaches CSS through this property (the sheets
        // never spell the hex); a caller's own properties still win.
        // React's CSSProperties declares no custom-property index, so
        // writing one needs the cast.
        style: { "--melite-stage-bg": STAGE_BACKGROUND_DARK, ...style }, ...props, children: [children, empty] }));
}
const DOCK_CLASS = {
    "top-right": styles.dockTopRight,
    "top-left": styles.dockTopLeft,
    "bottom-right": styles.dockBottomRight,
    "bottom-left": styles.dockBottomLeft,
    "bottom-center": styles.dockBottomCenter,
    bottom: styles.dockBottom,
    fill: styles.dockFill,
    "edge-right": styles.dockEdgeRight,
    "edge-left": styles.dockEdgeLeft,
};
export function ViewportAnchor({ dock = "top-right", className, ...props }) {
    return (_jsx("div", { "data-slot": "viewport-anchor", "data-dock": dock, className: cx(DOCK_CLASS[dock], className), ...props }));
}
export function ReferenceImageBadge({ url, label, className, ...props }) {
    if (!url)
        return null;
    return (_jsxs("figure", { "data-slot": "reference-image-badge", "data-reference-image": true, "aria-label": label, className: cx(styles.badge, className), ...props, children: [_jsx("img", { src: url, alt: label, className: styles.badgeImg, draggable: false }), _jsx("figcaption", { className: styles.badgeCaption, children: label })] }));
}
//# sourceMappingURL=viewportChrome.js.map
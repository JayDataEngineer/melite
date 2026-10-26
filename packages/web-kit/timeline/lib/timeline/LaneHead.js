import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * LaneHead — THE ONE LANE HEAD SHELL (SD-8 lane parity, operator item
 * c 2026-11-08: the keyframes bar's format was "not shared with the
 * audio sort of bar"). The gutter's four bespoke head grammars
 * (.laneHead / .laneHeadBeats / .audioHead / .laneRow) collapse into
 * this one anatomy: a glyph-or-dot slot, a label, an accent tint, a
 * title voice, and door/detach slots — every gutter head renders
 * through it, so no bespoke grammar can grow back. The heights stay
 * tenant-derived (the head takes the SAME number the lane body takes;
 * the height-mirror arm pins the pairing).
 */
import { clsx as cn } from "clsx";
import css from "./timeline.module.css";
/** One head, one grammar (SD-8). */
export function LaneHead(props) {
    const { variant, glyph, dotColor, label, accent, height, title, iconAttr, door, detach } = props;
    return (_jsxs("div", { className: cn(css.laneHeadShell), "data-lane-head": variant, "data-audio-icon": iconAttr, style: { height, ...(accent ? { color: accent } : {}) }, title: title, children: [glyph, dotColor && (_jsx("span", { className: css.laneDot, "data-lane-dot": variant, style: { background: dotColor }, "aria-hidden": true })), _jsx("span", { className: css.gutterLabel, children: label }), door, detach] }));
}
//# sourceMappingURL=LaneHead.js.map
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "./chrome.js";
import css from './card.module.css';
function Svg({ className, style, children, ...rest }) {
    return (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", focusable: "false", className: className, style: style, ...rest, children: children }));
}
export function X({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("path", { d: "M18 6 6 18" }), _jsx("path", { d: "m6 6 12 12" })] }));
}
export function ChevronDown({ className, style, ...rest }) {
    return (_jsx(Svg, { className: className, style: style, ...rest, children: _jsx("path", { d: "m6 9 6 6 6-6" }) }));
}
export function ChevronLeft({ className, style, ...rest }) {
    return (_jsx(Svg, { className: className, style: style, ...rest, children: _jsx("path", { d: "m15 18-6-6 6-6" }) }));
}
export function ChevronRight({ className, style, ...rest }) {
    return (_jsx(Svg, { className: className, style: style, ...rest, children: _jsx("path", { d: "m9 18 6-6-6-6" }) }));
}
export function Upload({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), _jsx("path", { d: "m17 8-5-5-5 5" }), _jsx("path", { d: "M12 3v12" })] }));
}
export function PersonStanding({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("circle", { cx: "12", cy: "5", r: "1" }), _jsx("path", { d: "m9 20 3-6 3 6" }), _jsx("path", { d: "m6 8 6 2 6-2" }), _jsx("path", { d: "M12 10v4" })] }));
}
export function User({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" }), _jsx("circle", { cx: "12", cy: "7", r: "4" })] }));
}
export function Link2({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("path", { d: "M9 17H7A5 5 0 0 1 7 7h2" }), _jsx("path", { d: "M15 7h2a5 5 0 1 1 0 10h-2" }), _jsx("path", { d: "M8 12h8" })] }));
}
export function Plus({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("path", { d: "M12 5v14" }), _jsx("path", { d: "M5 12h14" })] }));
}
export function Check({ className, style, ...rest }) {
    return (_jsx(Svg, { className: className, style: style, ...rest, children: _jsx("path", { d: "M20 6 9 17l-5-5" }) }));
}
export function Box({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("path", { d: "M21 8.5v7a2 2 0 0 1-1 1.73l-6 3.5a2 2 0 0 1-2 0l-6-3.5A2 2 0 0 1 5 15.5v-7a2 2 0 0 1 1-1.73l6-3.5a2 2 0 0 1 2 0l6 3.5a2 2 0 0 1 1 1.73Z" }), _jsx("path", { d: "m5.3 7.3 6.7 3.9 6.7-3.9" }), _jsx("path", { d: "M12 22V11" })] }));
}
export function Layers({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("path", { d: "m12 2 9 4.9-9 4.9-9-4.9L12 2Z" }), _jsx("path", { d: "m3 11.9 9 4.9 9-4.9" }), _jsx("path", { d: "m3 16.9 9 4.9 9-4.9" })] }));
}
export function Palette({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("circle", { cx: "13.5", cy: "6.5", r: "1" }), _jsx("circle", { cx: "17.5", cy: "10.5", r: "1" }), _jsx("circle", { cx: "8.5", cy: "7.5", r: "1" }), _jsx("circle", { cx: "6.5", cy: "12.5", r: "1" }), _jsx("path", { d: "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.26-.29-.43-.68-.43-1.12A1.68 1.68 0 0 1 14.46 16h2.08A5.46 5.46 0 0 0 22 10.5C21.94 5.75 17.5 2 12 2Z" })] }));
}
export function Move({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("path", { d: "m5 9-3 3 3 3" }), _jsx("path", { d: "m9 5 3-3 3 3" }), _jsx("path", { d: "m15 19-3 3-3-3" }), _jsx("path", { d: "m19 9 3 3-3 3" }), _jsx("path", { d: "M2 12h20" }), _jsx("path", { d: "M12 2v20" })] }));
}
/** The circular-arrow glyph, spinning by construction (the Loader2
 *  contract: callers size and tint it, never animate it). */
export function Loader2({ className, style, ...rest }) {
    return (_jsx(Svg, { className: cn(css.iconSpin, className), style: style, ...rest, children: _jsx("path", { d: "M21 12a9 9 0 1 1-6.219-8.56" }) }));
}
export function AlertTriangle({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("path", { d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" }), _jsx("path", { d: "M12 9v4" }), _jsx("path", { d: "M12 17h.01" })] }));
}
/** h3's name for the alert triangle — same drawing. */
export function TriangleAlert({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("path", { d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" }), _jsx("path", { d: "M12 9v4" }), _jsx("path", { d: "M12 17h.01" })] }));
}
export function Clapperboard({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("path", { d: "M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z" }), _jsx("path", { d: "m6.2 5.3 3.1 3.9" }), _jsx("path", { d: "m12.4 3.4 3.1 4" }), _jsx("path", { d: "M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" })] }));
}
export function Type({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("path", { d: "M4 7V5h16v2" }), _jsx("path", { d: "M12 5v14" }), _jsx("path", { d: "M9 19h6" })] }));
}
export function Copy({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("rect", { x: "9", y: "9", width: "12", height: "12", rx: "2" }), _jsx("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })] }));
}
export function Image({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }), _jsx("circle", { cx: "9", cy: "9", r: "2" }), _jsx("path", { d: "m21 15-3.5-3.5a1.5 1.5 0 0 0-2 0L6 21" })] }));
}
export function Brush({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("path", { d: "m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" }), _jsx("path", { d: "M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z" })] }));
}
export function Focus({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("path", { d: "M3 7V5a2 2 0 0 1 2-2h2" }), _jsx("path", { d: "M17 3h2a2 2 0 0 1 2 2v2" }), _jsx("path", { d: "M21 17v2a2 2 0 0 1-2 2h-2" }), _jsx("path", { d: "M7 21H5a2 2 0 0 1-2-2v-2" }), _jsx("circle", { cx: "12", cy: "12", r: "3" })] }));
}
export function Expand({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("path", { d: "m15 15 6 6" }), _jsx("path", { d: "m21 15v6h-6" }), _jsx("path", { d: "m9 9-6-6" }), _jsx("path", { d: "m3 9V3h6" })] }));
}
export function Hand({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("path", { d: "M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2" }), _jsx("path", { d: "M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2" }), _jsx("path", { d: "M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8" }), _jsx("path", { d: "M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" })] }));
}
export function Info({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("path", { d: "M12 16v-4" }), _jsx("path", { d: "M12 8h.01" })] }));
}
export function Pause({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("rect", { x: "14", y: "4", width: "4", height: "16", rx: "1" }), _jsx("rect", { x: "6", y: "4", width: "4", height: "16", rx: "1" })] }));
}
export function Download({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), _jsx("path", { d: "m7 10 5 5 5-5" }), _jsx("path", { d: "M12 15V3" })] }));
}
export function EyeOff({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("path", { d: "M9.88 9.88a3 3 0 1 0 4.24 4.24" }), _jsx("path", { d: "M10.73 5.08A10.4 10.4 0 0 1 12 5c7 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68" }), _jsx("path", { d: "M6.61 6.61A13.5 13.5 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.39-1.61" }), _jsx("path", { d: "m2 2 20 20" })] }));
}
export function RefreshCw({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" }), _jsx("path", { d: "M21 3v5h-5" }), _jsx("path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" }), _jsx("path", { d: "M3 21v-5h5" })] }));
}
export function RotateCw({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("path", { d: "M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" }), _jsx("path", { d: "M21 3v5h-5" })] }));
}
export function RotateCcw({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }), _jsx("path", { d: "M3 3v5h5" })] }));
}
export function Target({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("circle", { cx: "12", cy: "12", r: "6" }), _jsx("circle", { cx: "12", cy: "12", r: "2" })] }));
}
export function ImagePlus({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("path", { d: "M16 5h6" }), _jsx("path", { d: "M19 2v6" }), _jsx("path", { d: "M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5" }), _jsx("path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" }), _jsx("circle", { cx: "9", cy: "9", r: "2" })] }));
}
export function Camera({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("path", { d: "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" }), _jsx("circle", { cx: "12", cy: "13", r: "3" })] }));
}
export function FileBox({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }), _jsx("path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }), _jsx("path", { d: "M10 9H8" }), _jsx("path", { d: "M16 13H8" }), _jsx("path", { d: "M16 17H8" })] }));
}
/** Lucide-faithful `audio-lines` (new 2026-10-08 — the history kind
 * face's audio glyph; no prior card copy existed to unify). */
export function AudioLines({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("path", { d: "M2 10v3" }), _jsx("path", { d: "M6 6v11" }), _jsx("path", { d: "M10 3v18" }), _jsx("path", { d: "M14 8v7" }), _jsx("path", { d: "M18 5v13" }), _jsx("path", { d: "M22 10v3" })] }));
}
export function Film({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }), _jsx("path", { d: "M7 3v18" }), _jsx("path", { d: "M3 7.5h4" }), _jsx("path", { d: "M3 12h18" }), _jsx("path", { d: "M3 16.5h4" }), _jsx("path", { d: "M17 3v18" }), _jsx("path", { d: "M17 7.5h4" }), _jsx("path", { d: "M17 16.5h4" })] }));
}
export function Crop({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("path", { d: "M6 2v14a2 2 0 0 0 2 2h14" }), _jsx("path", { d: "M18 22V8a2 2 0 0 0-2-2H2" })] }));
}
export function Frame({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("path", { d: "M22 6H2" }), _jsx("path", { d: "M22 18H2" }), _jsx("path", { d: "M6 2v20" }), _jsx("path", { d: "M18 2v20" })] }));
}
export function Volume2({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("polygon", { points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5" }), _jsx("path", { d: "M15.54 8.46a5 5 0 0 1 0 7.07" }), _jsx("path", { d: "M19.07 4.93a10 10 0 0 1 0 14.14" })] }));
}
export function VolumeX({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("polygon", { points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5" }), _jsx("line", { x1: "22", x2: "16", y1: "9", y2: "15" }), _jsx("line", { x1: "16", x2: "22", y1: "9", y2: "15" })] }));
}
export function Maximize({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("path", { d: "M8 3H5a2 2 0 0 0-2 2v3" }), _jsx("path", { d: "M21 8V5a2 2 0 0 0-2-2h-3" }), _jsx("path", { d: "M3 16v3a2 2 0 0 0 2 2h3" }), _jsx("path", { d: "M16 21h3a2 2 0 0 0 2-2v-3" })] }));
}
export function Minimize2({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("path", { d: "M4 14h6v6" }), _jsx("path", { d: "M20 10h-6V4" }), _jsx("path", { d: "m14 10 7-7" }), _jsx("path", { d: "m3 21 7-7" })] }));
}
export function Dices({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("rect", { width: "12", height: "12", x: "2", y: "10", rx: "2", ry: "2" }), _jsx("path", { d: "m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6" }), _jsx("path", { d: "M6 18h.01" }), _jsx("path", { d: "M10 14h.01" }), _jsx("path", { d: "M15 6h.01" }), _jsx("path", { d: "M18 9h.01" })] }));
}
/* ── lucide-faithful keepers (one drawing, one name) ──────────── */
export function Square({ className, style, ...rest }) {
    return (_jsx(Svg, { className: className, style: style, ...rest, children: _jsx("rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }) }));
}
export function Eye({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("path", { d: "M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" }), _jsx("circle", { cx: "12", cy: "12", r: "3" })] }));
}
export function Play({ className, style, ...rest }) {
    return (_jsx(Svg, { className: className, style: style, ...rest, children: _jsx("path", { d: "m6 3 14 9-14 9V3z" }) }));
}
/** Motion's simplified eye variant. */
export function EyeAlt({ className, style, ...rest }) {
    return (_jsxs(Svg, { className: className, style: style, ...rest, children: [_jsx("path", { d: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" }), _jsx("circle", { cx: "12", cy: "12", r: "3" })] }));
}
/** Motion's sharp-corner play variant. */
export function PlayAlt({ className, style, ...rest }) {
    return (_jsx(Svg, { className: className, style: style, ...rest, children: _jsx("path", { d: "M6 4l14 8-14 8V4z" }) }));
}
//# sourceMappingURL=icons.js.map

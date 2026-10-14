import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export { Film, Image, Upload } from "@melite/card-base/client";
function base(name, className) {
    return {
        xmlns: "http://www.w3.org/2000/svg",
        width: 24,
        height: 24,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 2,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": true,
        className: ["lucide", `lucide-${name}`, className].filter(Boolean).join(" "),
    };
}
export function ListMusic({ className, ...rest }) {
    return (_jsxs("svg", { ...base("list-music", className), ...rest, children: [_jsx("path", { d: "M16 5H3" }), _jsx("path", { d: "M11 12H3" }), _jsx("path", { d: "M11 19H3" }), _jsx("path", { d: "M21 16V5" }), _jsx("circle", { cx: "18", cy: "16", r: "3" })] }));
}
export function Music({ className, ...rest }) {
    return (_jsxs("svg", { ...base("music", className), ...rest, children: [_jsx("path", { d: "M9 18V5l12-2v13" }), _jsx("circle", { cx: "6", cy: "18", r: "3" }), _jsx("circle", { cx: "18", cy: "16", r: "3" })] }));
}
export function ZoomIn({ className, ...rest }) {
    return (_jsxs("svg", { ...base("zoom-in", className), ...rest, children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("line", { x1: "21", x2: "16.65", y1: "21", y2: "16.65" }), _jsx("line", { x1: "11", x2: "11", y1: "8", y2: "14" }), _jsx("line", { x1: "8", x2: "14", y1: "11", y2: "11" })] }));
}
export function Mic({ className, ...rest }) {
    return (_jsxs("svg", { ...base("mic", className), ...rest, children: [_jsx("path", { d: "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" }), _jsx("path", { d: "M19 10v2a7 7 0 0 1-14 0v-2" }), _jsx("line", { x1: "12", x2: "12", y1: "19", y2: "22" })] }));
}
export function Zap({ className, ...rest }) {
    return (_jsx("svg", { ...base("zap", className), ...rest, children: _jsx("polygon", { points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2" }) }));
}
export function ZoomOut({ className, ...rest }) {
    return (_jsxs("svg", { ...base("zoom-out", className), ...rest, children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("line", { x1: "21", x2: "16.65", y1: "21", y2: "16.65" }), _jsx("line", { x1: "8", x2: "14", y1: "11", y2: "11" })] }));
}
//# sourceMappingURL=icons.js.map

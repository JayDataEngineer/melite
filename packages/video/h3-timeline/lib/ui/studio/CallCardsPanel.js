import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import { Button, Input } from "@deepseek-ai/dsh-client-ui-primitives";
import { SpecAtom, Tip } from "@melite/card-base/client";
import { cn } from '@melite/card-base/client';
import { ChevronLeft } from '@melite/card-base/client';
import s from "./studio.module.css";
import { VIDEO_TIMELINE_TRACKS } from "./docModel.js";
import { CallCard } from "./CallCard.js";
import { deliveredFrames } from '@melite/models-h3/timelineContract';
/** Layer B rail: compact call rows ⇄ focused call editor + legacy
 *  keyframes (monolith lines 3320–3416 + 3847–3924; per-call bodies
 *  render through CallCard). */
export function CallCardsPanel({ calls, selected, setSelected, fps, sourceOptions, keyframes, handleKeyframeMove, handleKeyframeDelete, setKeyframeSource, deps, }) {
    return (_jsx(_Fragment, { children: _jsxs("div", { className: s.panel, "data-testid": "tl-call-panel", children: [selected == null ? (_jsxs("div", { className: s.rowsHead, children: [_jsx("span", { className: s.rowsTitle, children: "Model calls" }), _jsx("span", { className: s.rowsHint, children: "click a row \u2014 or its clip in the bar \u2014 to edit that call here \u00B7 a call's prompt is text, or beat segments within it \u00B7 guides + knobs ride the call \u00B7 the compiler cuts windows at call boundaries" })] })) : (_jsxs("div", { className: s.focusHead, children: [_jsx(Tip, { tip: "Back to the run's global parameters \u2014 or click any empty spot in the timeline", children: _jsxs(Button, { variant: "ghost", onClick: () => setSelected(null), "aria-label": "Back to global parameters", "data-testid": "tl-back-to-global", className: s.backBtn, children: [_jsx(ChevronLeft, { className: s.sz12, "aria-hidden": true }), " Global"] }) }), _jsxs("span", { className: s.focusTitle, children: ["#", selected.callIdx, " \u00B7 Model call ", selected.callIdx + 1] }), selected.beatIdx != null && (_jsxs("span", { className: s.beatFlag, children: ["beat ", selected.beatIdx + 1, " selected"] }))] })), _jsx("datalist", { id: "tl-kf-sources", children: sourceOptions.map((o) => (_jsxs("option", { value: o.name, children: [o.title, " \u00B7 ", o.name] }, `${o.title}:${o.name}`))) }), selected == null && (_jsx("div", { className: s.compactList, children: calls.map((c, i) => {
                        const activeKnobs = c.knobs ? Object.keys(c.knobs).length : 0;
                        const excerpt = c.text ?? "";
                        return (_jsxs(Button, { variant: "ghost", type: "button", "data-call-row": i, onClick: () => setSelected({ callIdx: i }), className: s.callRow, children: [_jsxs("span", { className: s.callIdx, children: ["#", i] }), _jsx("span", { className: cn(s.excerpt, excerpt.trim() ? s.excerptFull : s.excerptEmpty), children: excerpt.trim() || "(empty — needs a prompt)" }), activeKnobs > 0 && (_jsx("span", { className: s.knobBadge, children: activeKnobs })), _jsxs("span", { className: s.callDur, title: `span ${((c.end_frame - c.start_frame) / fps).toFixed(1)}s — delivered after the seam's carry`, children: [(deliveredFrames(c, i) / fps).toFixed(1), "s"] })] }, i));
                    }) })), selected != null && (_jsx("div", { className: s.focusList, children: calls.map((c, i) => (_jsx(CallCard, { c: c, i: i, deps: deps }, i))) })), selected == null && keyframes.length > 0 && (_jsxs("div", { className: s.kfPanel, "data-testid": "tl-keyframe-panel", children: [_jsxs("div", { className: s.kfHead, children: [_jsx("span", { className: s.kfTitle, children: "Frame-exact keyframes" }), _jsx("span", { className: s.kfHint, children: "legacy vocabulary \u2014 prefer a beat's guides; a hand image at a cut is that window's first frame" })] }), _jsx("div", { className: s.compactList, children: keyframes.map((k, i) => {
                                const track = VIDEO_TIMELINE_TRACKS.find((t) => t.uuid === k.kind);
                                // Dead-arm cut: DocKeyframe.kind ∈ image|clip|audio, all
                                // three tracks exist with color triples (docModel.ts) —
                                // color is never null, so ?. / ?? never fire.
                                const color = `rgb(${track.color[0]}, ${track.color[1]}, ${track.color[2]})`;
                                return (_jsxs("div", { "data-kf-row": i, "data-wired": k.source.trim() ? "true" : "false", className: s.kfRow, children: [_jsx("span", { className: s.kfKind, style: { color, background: `${color}1f`, border: `1px solid ${color}55` }, children: k.kind }), _jsx(SpecAtom, { f: { name: `kf_${i}_frame`, label: `Keyframe ${i} frame`, type: "number" }, value: k.frame, placeholder: "", onEdit: (_, v) => {
                                                const n = typeof v === "string" && v.trim() !== "" ? Number(v) : undefined;
                                                if (n !== undefined)
                                                    handleKeyframeMove(`kf-${i}`, Math.round(n));
                                            } }), _jsx(Input, { list: "tl-kf-sources", value: k.source, placeholder: sourceOptions.length ? "artifact name or filename…" : "uploaded filename…", "aria-label": `Keyframe ${i} source`, "data-testid": "tl-kf-source", onChange: (e) => setKeyframeSource(i, e.target.value), className: cn(s.kfIn, !k.source.trim() && s.textInEmpty) }), _jsxs("span", { className: s.kfTime, children: [(k.frame / fps).toFixed(2), "s"] }), _jsx(Tip, { tip: `Delete this ${k.kind} keyframe`, children: _jsx(Button, { variant: "ghost", onClick: () => handleKeyframeDelete(`kf-${i}`), "aria-label": `Delete keyframe ${i}`, className: s.kfDel, children: "\u00D7" }) })] }, i));
                            }) })] }))] }) }));
}
//# sourceMappingURL=CallCardsPanel.js.map

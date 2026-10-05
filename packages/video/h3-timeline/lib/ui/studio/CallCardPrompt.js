import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. (2026-09-15, the operator's cut: NO
 * prompt segments, NO prompt beats — text mode only, forever.)
 */
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { cn } from '@melite/card-base/client';
import s from "./studio.module.css";
/** One call's prompt editor: ONE textarea + ✨ H3 style. */
export function CallCardPrompt({ c, i, handlePromptUpdate, enhanceOne, undoEnhance, enhancing, enhanceErr, enhanceUndo, }) {
    return (_jsxs("div", { className: s.beatsWrap, children: [_jsxs("div", { className: s.textHead, children: [_jsx("span", { className: s.textLabel, children: "the prompt this call sends to H3" }), _jsxs("span", { className: s.enhanceRow, children: [_jsx(Button, { type: "button", title: "Rewrite this call's prompt in H3 cinematic style", "aria-label": "Enhance call " + i + " prompt", "data-testid": "tl-call-enhance", disabled: !(c.text ?? "").trim() || enhancing["call-" + i] === true, onClick: () => void enhanceOne(
                                // (the button is disabled unless the text is non-blank, so
                                // text is a string here — the `!` records that proof.)
                                "call-" + i, c.text, (t) => handlePromptUpdate("call-" + i, t)), className: s.enhanceBtn, children: enhancing["call-" + i] === true ? "enhancing…" : "\u2728 H3 style" }), enhanceUndo["call-" + i] !== undefined && (_jsx(Button, { type: "button", "aria-label": "Undo enhance call " + i + " prompt", "data-testid": "tl-call-enhance-undo", onClick: () => undoEnhance("call-" + i, (t) => handlePromptUpdate("call-" + i, t)), className: s.undoBtn, children: "\u21a9 undo" }))] })] }), enhanceErr["call-" + i] && (_jsx("span", { className: s.beatErr, "data-testid": "tl-call-enhance-error", children: enhanceErr["call-" + i] })), _jsx("textarea", { value: c.text ?? "", placeholder: "describe the action, camera, and mood for this call \u2014 empty calls refuse the plan", "aria-label": `Call ${i} prompt`, "data-testid": "tl-call-prompt", rows: 2, onChange: (e) => handlePromptUpdate(`call-${i}`, e.target.value), className: cn(s.promptBox, !(c.text ?? "").trim() && s.promptBoxEmpty) })] }));
}
//# sourceMappingURL=CallCardPrompt.js.map

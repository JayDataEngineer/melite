import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
//
// 2026-11-05 (F2, the nativity audit): the scrollbar + zoom chrome that
// lived below this point was never upstream code — it is melite's estate
// rewrite (DSH Button + card-base Tip, the kit CSS module, estate
// testids). It re-homed to ../TimelineScrollbar.tsx; this file carries
// upstream content only, so upstream pulls diff clean again.
import { useEffect } from "react";
import { DEFAULT_PROMPT_COLOR } from "./styles.js";
export const SCROLLBAR_HEIGHT = 10;
export const SCROLLBAR_TOTAL_HEIGHT = SCROLLBAR_HEIGHT + 4; // height + vertical padding
export function TimelineEditingOverlay(props) {
    const { editingPrompt, timelineState, theme, darkMode, editingPromptDivRef, onPromptUpdate, setEditingPrompt } = props;
    // Focus the editing overlay and place cursor at end for stable visual alignment.
    useEffect(() => {
        if (!editingPrompt)
            return;
        const el = editingPromptDivRef.current;
        if (!el)
            return;
        requestAnimationFrame(() => {
            try {
                el.focus();
                const sel = window.getSelection?.();
                if (!sel)
                    return;
                const range = document.createRange();
                range.selectNodeContents(el);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            }
            catch {
                // Ignore selection errors (e.g., if element unmounted).
            }
        });
    }, [editingPrompt?.uuid]);
    if (!editingPrompt)
        return null;
    // Find the prompt to get its color
    const prompt = timelineState?.prompts.find(p => p.uuid === editingPrompt.uuid);
    const color = prompt?.color || DEFAULT_PROMPT_COLOR;
    const borderColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    return (_jsxs(_Fragment, { children: [_jsx("div", { style: {
                    position: "absolute",
                    inset: 0,
                    zIndex: 9,
                    background: "transparent",
                }, onMouseDown: (e) => {
                    // If click is outside the editor, blur it (triggers commit via onBlur).
                    const editor = editingPromptDivRef.current;
                    if (editor && !editor.contains(e.target)) {
                        editor.blur();
                    }
                    // Always prevent the canvas from seeing the click while editing.
                    e.preventDefault();
                    e.stopPropagation();
                }, onDoubleClick: (e) => {
                    // Prevent accidental re-entering edit or creating interactions behind the overlay.
                    e.preventDefault();
                    e.stopPropagation();
                } }), _jsx("div", { style: {
                    position: "absolute",
                    left: `${editingPrompt.x}px`,
                    top: `${editingPrompt.y}px`,
                    width: `${editingPrompt.width}px`,
                    height: `${editingPrompt.height}px`,
                    fontSize: "12px",
                    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    // True vertical centering (avoids UA input baseline quirks).
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxSizing: "border-box",
                    border: "none",
                    boxShadow: `inset 0 0 0 2px ${borderColor}`,
                    borderRadius: "5px",
                    outline: "none",
                    backgroundColor: darkMode ? "rgba(13, 21, 32, 0.95)" : "rgba(13, 21, 32, 0.95)", // blue-1 (theme --blue-1 #0d1520)
                    color: theme.promptTextColor,
                    padding: 0,
                    zIndex: 10,
                }, children: _jsx("div", { ref: editingPromptDivRef, contentEditable: true, suppressContentEditableWarning: true, onBlur: (e) => {
                        const nextText = (e.currentTarget.textContent ?? "");
                        if (onPromptUpdate && nextText !== editingPrompt.text) {
                            onPromptUpdate(editingPrompt.uuid, nextText);
                            // Small delay to let optimistic update propagate before hiding input
                            setTimeout(() => setEditingPrompt(null), 0);
                        }
                        else {
                            setEditingPrompt(null);
                        }
                    }, onKeyDown: (e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            e.currentTarget.blur();
                        }
                        else if (e.key === "Escape") {
                            e.preventDefault();
                            setEditingPrompt(null);
                        }
                    }, style: {
                        flex: 1,
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                        padding: "0 8px",
                        whiteSpace: "nowrap",
                        overflowX: "auto",
                        overflowY: "hidden",
                        outline: "none",
                    }, children: editingPrompt.text }) }, editingPrompt.uuid)] }));
}
//# sourceMappingURL=timeline-overlays.js.map
// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect } from "react";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { Tip } from "@melite/card-base/client";
import css from "../timeline.module.css";
import { FRAME_LABELS_HEIGHT, TRACK_HEIGHT } from "./TimelineConstants.ts";
import { DEFAULT_PROMPT_COLOR } from "./styles.ts";
import type { TimelineTheme } from "./styles.ts";
import type { TimelineMessage } from "./messages.ts";
import { getZoomEnvelopeEndFrame } from "./timeline-scales.ts";
import type { TimelineEditingDraft, TimelineInteractionSnapshot } from "./timeline-interaction-state.ts";
import type { ViserViewport } from "./timeline-viewport.ts";

export const SCROLLBAR_HEIGHT = 10;
export const SCROLLBAR_TOTAL_HEIGHT = SCROLLBAR_HEIGHT + 4; // height + vertical padding

export interface TimelineEditingOverlayProps {
 editingPrompt: TimelineEditingDraft | null;
 timelineState: TimelineMessage | null;
 theme: TimelineTheme;
 darkMode: boolean;
 editingPromptDivRef: TimelineInteractionSnapshot["editingPromptDivRef"];
 onPromptUpdate?: (promptId: string, newText: string) => void;
 setEditingPrompt: TimelineInteractionSnapshot["setEditingPrompt"];
}

export function TimelineEditingOverlay(props: TimelineEditingOverlayProps) {
 const { editingPrompt, timelineState, theme, darkMode, editingPromptDivRef, onPromptUpdate, setEditingPrompt } = props;
 // Focus the editing overlay and place cursor at end for stable visual alignment.
 useEffect(() => {
 if (!editingPrompt) return;
 const el = editingPromptDivRef.current;
 if (!el) return;
 requestAnimationFrame(() => {
 try {
 el.focus();
 const sel = window.getSelection?.();
 if (!sel) return;
 const range = document.createRange();
 range.selectNodeContents(el);
 range.collapse(false);
 sel.removeAllRanges();
 sel.addRange(range);
 } catch {
 // Ignore selection errors (e.g., if element unmounted).
 }
 });
 }, [editingPrompt?.uuid]);
 if (!editingPrompt) return null;
 // Find the prompt to get its color
 const prompt = timelineState?.prompts.find(p => p.uuid === editingPrompt.uuid);
 const color = prompt?.color || DEFAULT_PROMPT_COLOR;
 const borderColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
 return (
 <>
 {/* Click-catcher: clicking anywhere outside the editable prompt exits editing mode and prevents canvas interactions */}
 <div
 style={{
 position: "absolute",
 inset: 0,
 zIndex: 9,
 background: "transparent",
 }}
 onMouseDown={(e) => {
 // If click is outside the editor, blur it (triggers commit via onBlur).
 const editor = editingPromptDivRef.current;
 if (editor && !editor.contains(e.target as Node)) {
 editor.blur();
 }
 // Always prevent the canvas from seeing the click while editing.
 e.preventDefault();
 e.stopPropagation();
 }}
 onDoubleClick={(e) => {
 // Prevent accidental re-entering edit or creating interactions behind the overlay.
 e.preventDefault();
 e.stopPropagation();
 }}
 />

 <div
 // Remount per prompt to avoid React re-render clobbering caret position while editing.
 key={editingPrompt.uuid}
 style={{
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
 }}
 >
 <div
 ref={editingPromptDivRef}
 contentEditable
 suppressContentEditableWarning
 onBlur={(e) => {
 const nextText = (e.currentTarget.textContent ?? "");
 if (onPromptUpdate && nextText !== editingPrompt.text) {
 onPromptUpdate(editingPrompt.uuid, nextText);
 // Small delay to let optimistic update propagate before hiding input
 setTimeout(() => setEditingPrompt(null), 0);
 } else {
 setEditingPrompt(null);
 }
 }}
 onKeyDown={(e) => {
 if (e.key === "Enter") {
 e.preventDefault();
 (e.currentTarget as HTMLDivElement).blur();
 } else if (e.key === "Escape") {
 e.preventDefault();
 setEditingPrompt(null);
 }
 }}
 style={{
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
 }}
 >
 {editingPrompt.text}
 </div>
 </div>
 </>
 );
}

export interface TimelineScrollbarProps {
 timelineState: TimelineMessage;
 zoomLevel: number;
 panOffset: number;
 darkMode: boolean;
 scrollbarTrackRef: ViserViewport["scrollbarTrackRef"];
 onScrollbarTrackMouseDown: ViserViewport["onScrollbarTrackMouseDown"];
 onScrollbarThumbMouseDown: ViserViewport["onScrollbarThumbMouseDown"];
 zoomBy: ViserViewport["zoomBy"];
 resetZoom: ViserViewport["resetZoom"];
}

export function TimelineScrollbar(props: TimelineScrollbarProps) {
 const { timelineState, zoomLevel, panOffset, darkMode, scrollbarTrackRef,
 onScrollbarTrackMouseDown, onScrollbarThumbMouseDown, zoomBy, resetZoom } = props;
 // ── Horizontal scrollbar geometry ─────────────────────────────────
 // The thumb covers the visible window as a fraction of the full frame
 // range; it shrinks as the user zooms in. Show only when there are
 // off-screen frames to reach (maxPan > 0.5 frame).
 const scrollEnvelopeEnd = getZoomEnvelopeEndFrame(timelineState);
 const scrollTotalFrames = Math.max(1, scrollEnvelopeEnd - timelineState.start_frame + 1);
 const scrollVisibleFrames = scrollTotalFrames / zoomLevel;
 const scrollMaxPan = Math.max(0, scrollTotalFrames - scrollVisibleFrames);
 // Always visible — the wheel-only pan is undiscoverable + buggy. At zoom 1
 // the thumb fills the track (nothing to scroll); it shrinks as you zoom in.
 // Cap at 97% even at zoom 1 so the thumb is always visually distinct from
 // the track (a solid bar reads as a divider, not a scrollbar).
 const showScrollbar = true;
 const rawThumbPct = Math.min(97, Math.max(8, (scrollVisibleFrames / scrollTotalFrames) * 100));
 const thumbWidthPct = rawThumbPct;
 const thumbLeftPct = scrollMaxPan > 0
 ? (panOffset / scrollMaxPan) * (100 - thumbWidthPct)
 : (100 - thumbWidthPct) / 2; // center when non-scrollable
 return (
 <>
 {showScrollbar && (
 <div
 style={{
 display: "flex",
 alignItems: "center",
 gap: 4,
 width: "100%",
 height: `${SCROLLBAR_HEIGHT + 4}px`,
 padding: "0 2px",
 backgroundColor: darkMode ? "rgba(13,21,32,0.6)" : "rgba(0,0,0,0.04)", // blue-1 tint (theme --blue-1 #0d1520)
 borderTop: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"}`,
 }}
 >
 <div
 ref={scrollbarTrackRef}
 data-testid="timeline-scrollbar-track"
 onMouseDown={onScrollbarTrackMouseDown}
 style={{
 position: "relative",
 flex: 1,
 height: `${SCROLLBAR_HEIGHT}px`,
 backgroundColor: darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)",
 cursor: "pointer",
 borderRadius: "4px",
 }}
 >
 <div
 data-testid="timeline-scrollbar-thumb"
 onMouseDown={onScrollbarThumbMouseDown}
 style={{
 position: "absolute",
 top: 0,
 bottom: 0,
 left: `${thumbLeftPct}%`,
 width: `${thumbWidthPct}%`,
 backgroundColor: darkMode
 ? "rgba(176, 180, 186, 0.9)" // --slate-11 #b0b4ba @ 90%
 : "rgba(100, 105, 120, 0.75)",
 border: `1px solid ${darkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"}`,
 borderRadius: "4px",
 cursor: "grab",
 boxShadow: darkMode ? "0 1px 3px rgba(0,0,0,0.4)" : "none",
 transition: "background-color 0.15s",
 }}
 onMouseEnter={(e) => {
 e.currentTarget.style.backgroundColor = darkMode
 ? "rgba(237, 238, 240, 0.95)" // --slate-12 #edeef0
 : "rgba(80, 85, 100, 0.9)";
 }}
 onMouseLeave={(e) => {
 e.currentTarget.style.backgroundColor = darkMode
 ? "rgba(176, 180, 186, 0.9)"
 : "rgba(100, 105, 120, 0.75)";
 }}
 />
 </div>
 <Tip tip="Zoom out">
 <Button variant="ghost" size="sm"
 data-testid="timeline-zoom-out"
 onClick={() => zoomBy(1 / 1.5)}
 aria-label="Zoom out"
 className={css.miniBtn}
 style={{ padding: 0 }}
 >−</Button>
 </Tip>
 <Tip tip="Fit to window (reset zoom)">
 <Button variant="ghost" size="sm"
 data-testid="timeline-zoom-fit"
 onClick={resetZoom}
 className={css.miniFitBtn}
 >fit</Button>
 </Tip>
 <Tip tip="Zoom in">
 <Button variant="ghost" size="sm"
 data-testid="timeline-zoom-in"
 onClick={() => zoomBy(1.5)}
 aria-label="Zoom in"
 className={css.miniBtn}
 style={{ padding: 0 }}
 >+</Button>
 </Tip>
 </div>
 )}
 </>
 );
}

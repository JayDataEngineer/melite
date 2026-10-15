import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * MotionTimelineBarLanes — the bar's lane bodies (split from
 * MotionTimelineBar.tsx, pure move): prompt clips, beats, audio
 * tracks, keyframe lanes. Chrome (gutter/ruler/playhead) lives in
 * MotionTimelineBarChrome.
 */
import { Image, Mic, Music, Zap } from "./icons.js";
import { clsx as cn } from "clsx";
import { ASSET_DRAG_MIME, Tip } from '@melite/card-base/client';
import { PROMPT_COLORS } from "./viser-timeline/styles.js";
import { AUDIO_CARDS_H, AUDIO_H, LANE_H, rgb } from "./MotionTimelineBarLayout.js";
import { Button, IconCloseOutlineRegular, Input } from '@deepseek-ai/dsh-client-ui-primitives';
import css from "./timeline.module.css";
import { useState } from "react";
import { timelineCopy } from "../timelineCopy.js";
/** Draggable/resizable prompt clips (bar line 994). */
export function TimelinePromptsLane(props) {
    const { prompts, fps, promptsHeight, emptyPromptsHint, onPromptAdd, dragId, lastPromptRef, firstPromptRef, selectedId, previews, frameToPx, frameAt, startDrag, playhead, onPromptUpdate, onPromptDelete, } = props;
    // Inline prompt editor: the clip being edited + its local text.
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState("");
    const commitEdit = (id) => {
        setEditingId(null);
        const text = editText.trim();
        const p = prompts.find((x) => x.uuid === id);
        if (p && text !== p.text)
            onPromptUpdate(id, text);
    };
    return (_jsx(_Fragment, { children: _jsxs("div", { className: cn(css.promptsLane, onPromptAdd && css.canAdd), style: { height: promptsHeight, background: "var(--dsw-alias-bg-layer-1)" }, onDoubleClick: (e) => {
                // The additive gesture on the surfaces no clip owns (gaps,
                // the past-the-end margin) — a clip's own double-click is
                // inline edit and never reaches here (stopPropagation;
                // the closest() guard covers the editor input's path).
                if (!onPromptAdd)
                    return;
                if (e.target.closest("[data-prompt-clip]"))
                    return;
                // UNclamped — the past-the-end margin is this surface's
                // whole point (double-click past the last frame = append).
                const f = frameAt(e.clientX);
                if (f != null)
                    onPromptAdd(f);
            }, children: [prompts.length === 0 && (_jsx("div", { className: css.emptyCenter, children: _jsx("span", { className: css.emptyHint, children: emptyPromptsHint }) })), prompts.map((p, i) => {
                    const color = rgb(PROMPT_COLORS[i % PROMPT_COLORS.length]);
                    const isEditing = editingId === p.uuid;
                    const isMoving = dragId === p.uuid;
                    const isLast = p.uuid === lastPromptRef.current;
                    const isFirst = p.uuid === firstPromptRef.current;
                    const isSelected = selectedId === p.uuid;
                    const previewUrl = previews?.[p.uuid];
                    const wPx = frameToPx(Math.max(1, p.end_frame - p.start_frame));
                    const clipTip = `${p.text || "(empty)"} — frames ${p.start_frame}–${p.end_frame} (${((p.end_frame - p.start_frame) / Math.max(1, fps)).toFixed(1)}s)\n\nDrag body: move · Drag edges: resize · Double-click: edit · Click: select`;
                    return (_jsx(Tip, { tip: clipTip, children: _jsxs("div", { "data-prompt-clip": p.uuid, className: cn(css.promptClip, isMoving ? css.clipMoving : isSelected ? css.clipSelected : undefined), style: {
                                left: frameToPx(p.start_frame),
                                width: `max(26px, ${wPx}px)`,
                                background: `linear-gradient(135deg, ${color}33, ${color}14)`,
                                borderLeft: `3px solid ${color}`,
                                transition: isMoving ? "none" : "border-color .12s",
                            }, 
                            // The preview video is pointer-events-none, so hover
                            // handlers live on the clip: rest = first frame,
                            // hover = plays (NLE strip behavior).
                            onMouseEnter: (e) => {
                                const v = e.currentTarget.querySelector("video");
                                if (v)
                                    v.play().catch(() => { });
                            }, onMouseLeave: (e) => {
                                const v = e.currentTarget.querySelector("video");
                                if (v)
                                    v.pause();
                            }, onPointerDown: (e) => !isEditing &&
                                startDrag(e, {
                                    kind: "prompt-move",
                                    id: p.uuid,
                                    startX: e.clientX,
                                    startF: p.start_frame,
                                    endF: p.end_frame,
                                    moved: false,
                                }), onDoubleClick: (e) => {
                                e.stopPropagation();
                                setEditText(p.text);
                                setEditingId(p.uuid);
                            }, children: [_jsx("div", { "data-prompt-edge": "l", title: isFirst ? timelineCopy.firstCallTitle : undefined, className: cn(css.edgeL, isFirst && css.edgeDead), onPointerDown: (e) => !isFirst &&
                                        startDrag(e, {
                                            kind: "prompt-l",
                                            id: p.uuid,
                                            startX: e.clientX,
                                            startF: p.start_frame,
                                            endF: p.end_frame,
                                            moved: false,
                                        }), children: _jsx("div", { className: css.gripPill }) }), p.seam === "extend" && !isFirst && (_jsx("div", { className: css.seamDot, style: { background: playhead, boxShadow: `0 0 4px ${playhead}` }, title: timelineCopy.seamExtendTitle })), _jsx(Tip, { tip: isLast
                                        ? "PULL to extend the motion — the timeline + duration grow as you drag"
                                        : "Drag to resize this card", children: _jsx("div", { "data-prompt-edge": "r", className: cn(css.edgeR, isLast && css.edgeWide), onPointerDown: (e) => startDrag(e, {
                                            kind: "prompt-r",
                                            id: p.uuid,
                                            startX: e.clientX,
                                            startF: p.start_frame,
                                            endF: p.end_frame,
                                            moved: false,
                                        }), children: _jsx("div", { className: cn(css.gripPillR, isLast && css.gripPillBright) }) }) }), isEditing ? (_jsx(Input, { autoFocus: true, value: editText, onChange: (e) => setEditText(e.target.value), onBlur: () => commitEdit(p.uuid), onKeyDown: (e) => {
                                        if (e.key === "Enter")
                                            commitEdit(p.uuid);
                                        if (e.key === "Escape")
                                            setEditingId(null);
                                    }, onPointerDown: (e) => e.stopPropagation(), onDoubleClick: (e) => e.stopPropagation(), placeholder: timelineCopy.promptPlaceholder, className: css.clipEditor })) : previewUrl ? (_jsxs("div", { className: css.previewWrap, children: [_jsx("video", { src: previewUrl, muted: true, loop: true, playsInline: true, preload: "metadata", className: css.previewVideo }), _jsx("div", { className: css.scrim }), _jsxs("div", { className: css.clipTextCol, children: [_jsx("span", { className: css.clipTitle, style: { color }, children: p.text || _jsx("span", { className: css.clipEmpty, children: timelineCopy.emptyClip }) }), wPx > 72 && (_jsx("span", { className: css.clipDur, children: timelineCopy.clipSeconds({ seconds: ((p.end_frame - p.start_frame) / Math.max(1, fps)).toFixed(1) }) }))] })] })) : (_jsxs("div", { className: css.clipTextStack, children: [_jsx("span", { className: css.clipTitle, style: { color }, children: p.text || _jsx("span", { className: css.clipEmpty, children: timelineCopy.emptyClip }) }), wPx > 64 && (_jsx("span", { className: css.clipDur, children: timelineCopy.clipSeconds({ seconds: ((p.end_frame - p.start_frame) / Math.max(1, fps)).toFixed(1) }) }))] })), p.override && !isEditing && (_jsx("span", { title: timelineCopy.knobOverrideTitle, className: css.knobDot })), p.audio && !isEditing && (_jsx(Music, { "aria-hidden": true, className: css.refAudioBadge })), (p.refImages ?? 0) > 0 && !isEditing && (_jsxs("span", { "data-testid": "tl-ref-badge", className: css.refBadge, title: timelineCopy.refImagesTitle({ count: p.refImages ?? 0 }), children: [_jsx(Image, { "aria-hidden": true }), _jsx("span", { className: css.refCount, children: p.refImages })] })), !isEditing && (_jsx(Tip, { tip: "Delete this prompt card", children: _jsx(Button, { variant: "ghost", size: "sm", onPointerDown: (e) => e.stopPropagation(), onClick: (e) => {
                                            e.stopPropagation();
                                            onPromptDelete(p.uuid);
                                        }, "aria-label": timelineCopy.deletePromptCardAria, className: css.promptDelete, children: _jsx(IconCloseOutlineRegular, {}) }) }))] }) }, p.uuid));
                })] }) }));
}
/** Layer C prompt beats within the calls (bar line 1261). */
export function TimelineBeatsLane(props) {
    const { beats, beatsHeight, beatsHint, fps, selectedId, onSelect, onBeatAdd, xToFrame, frameToPx, } = props;
    if (beats == null)
        return null;
    return (_jsx(_Fragment, { children: _jsxs("div", { "data-beats-row": true, className: cn(css.beatsLane, onBeatAdd && css.beatsAdd), style: { height: beatsHeight, background: "var(--dsw-alias-bg-layer-1)" }, onDoubleClick: (e) => {
                if (!onBeatAdd)
                    return;
                const f = xToFrame(e.clientX);
                if (f != null)
                    onBeatAdd(f);
            }, children: [beats.length === 0 && (_jsx("div", { className: css.beatsEmpty, children: _jsx("span", { className: css.hintLine, children: beatsHint }) })), beats.map((b) => {
                    const color = rgb(b.color ?? [176, 180, 186]);
                    const isSelected = selectedId === b.id;
                    const bW = frameToPx(Math.max(1, b.end_frame - b.start_frame));
                    return (_jsx(Tip, { tip: `${b.text || "(empty)"} — frames ${b.start_frame}–${b.end_frame} (${((b.end_frame - b.start_frame) / Math.max(1, fps)).toFixed(1)}s)\n\nClick: edit in the call card`, children: _jsx("div", { "data-beat-clip": b.id, onClick: () => onSelect?.(b.id), className: cn(css.beatClip, isSelected && css.beatSelected), style: {
                                left: frameToPx(b.start_frame),
                                width: `max(14px, ${bW}px)`,
                                background: `linear-gradient(135deg, ${color}2e, ${color}12)`,
                                borderLeft: `3px solid ${color}`,
                            }, children: _jsx("span", { className: css.beatLabel, children: _jsx("span", { className: css.truncate, children: b.text || _jsx("span", { className: css.beatEmpty, children: timelineCopy.emptyClip }) }) }) }) }, b.id));
                })] }) }));
}
/** Native audio tracks, same scroll + scale (bar line 1316). */
export function TimelineAudioLanes(props) {
    const { audioLayers, prompts, fps, frameToPx, xToFrame, startDrag, audioClipCards, onAudioDrop, onAudioDropAt, onAudioFileDrop, onAudioClipMove, onAudioClipDelete, } = props;
    return (_jsx(_Fragment, { children: audioLayers?.map((L) => {
            const clips = L.clips ?? [];
            // (2026-09-22, the D-M-E card law) the lane's glyph + accent
            // ride its clips: dialogue a mic, sfx a bolt, music the note.
            const Glyph = L.icon === "mic" ? Mic : L.icon === "zap" ? Zap : Music;
            const accent = L.accent;
            return (_jsx("div", { "data-audio-layer": L.id, "data-wired": L.stem ? "true" : "false", "data-clips": clips.length ? "true" : "false", "data-lane-cards": audioClipCards ? "true" : "false", className: css.audioLane, style: { height: audioClipCards ? AUDIO_CARDS_H : AUDIO_H, background: "color-mix(in srgb, var(--dsw-alias-state-business-primary) 3%, transparent)" }, onDragOver: (e) => e.preventDefault(), onDrop: (e) => {
                    e.preventDefault();
                    // (2026-09-02 NaN guard) `?? 0` catches null but NOT
                    // NaN — a coordinate-less drop produced NaN frames
                    // that serialized as start_frame: null.
                    const t = xToFrame(e.clientX);
                    const f = t != null && Number.isFinite(t) ? t : 0;
                    // (Layer A NLE law) the upload door FIRST: an OS file
                    // drop lands as a positioned clip through the tenant's
                    // file reader. No handler → ignored (never a bad write).
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                        onAudioFileDrop?.(L.id, file, f);
                        return;
                    }
                    try {
                        const payload = JSON.parse(e.dataTransfer.getData(ASSET_DRAG_MIME) || "null");
                        if (payload && typeof payload.url === "string") {
                            if (onAudioDropAt)
                                onAudioDropAt(L.id, payload.url, f);
                            else
                                onAudioDrop?.(L.id, payload.url);
                        }
                    }
                    catch { /* not our payload — ignore, never a bad write */ }
                }, children: clips.length ? (clips.map((c) => {
                    const a = (c.start_frame / Math.max(1, fps)).toFixed(1);
                    const b = ((c.start_frame + c.dur_frames) / Math.max(1, fps)).toFixed(1);
                    return (_jsxs("div", { "data-audio-clip": c.id, "data-card": audioClipCards ? "true" : undefined, title: timelineCopy.audioClipTitle({ name: c.name, start: a, end: b, gain: c.gain != null ? c.gain.toFixed(2) : null }), className: cn(css.audioClip, audioClipCards && css.audioCard), style: {
                            left: frameToPx(c.start_frame),
                            width: `max(6px, ${frameToPx(Math.max(1, c.dur_frames))}px)`,
                            ...(audioClipCards && accent ? {
                                background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 32%, transparent), color-mix(in srgb, ${accent} 10%, transparent))`,
                                borderColor: `color-mix(in srgb, ${accent} 45%, transparent)`,
                                borderLeftColor: accent,
                                borderLeftWidth: 3,
                            } : {}),
                        }, onPointerDown: (e) => {
                            if (!onAudioClipMove)
                                return;
                            startDrag(e, {
                                kind: "audio-clip",
                                layerId: L.id,
                                id: c.id,
                                startX: e.clientX,
                                startF: c.start_frame,
                                durF: c.dur_frames,
                                moved: false,
                            });
                        }, children: [audioClipCards && (_jsx("span", { "aria-hidden": true, className: css.audioCardIcon, style: accent ? { color: accent } : undefined, children: _jsx(Glyph, {}) })), c.gain != null && (_jsx("span", { "aria-hidden": true, className: css.gainFill, style: { height: `${Math.max(4, Math.min(100, c.gain * 50))}%` } })), _jsxs("span", { className: css.audioClipLabel, children: [_jsx("span", { className: css.audioName, children: c.name }), _jsx("span", { className: css.audioTime, children: timelineCopy.clipSeconds({ seconds: a }) })] }), onAudioClipDelete && (_jsx(Button, { variant: "ghost", size: "sm", "data-audio-clip-delete": c.id, "aria-label": timelineCopy.deleteClipAria({ name: c.name }), onClick: (e) => { e.stopPropagation(); onAudioClipDelete(L.id, c.id); }, className: css.audioClipDelete, children: _jsx(IconCloseOutlineRegular, {}) }))] }, c.id));
                })) : L.stem ? (prompts.map((p, i) => {
                    const a = (p.start_frame / Math.max(1, fps)).toFixed(1);
                    const b = (p.end_frame / Math.max(1, fps)).toFixed(1);
                    return (_jsx("div", { "data-audio-slice": i, title: timelineCopy.audioSliceTitle({ call: i, start: a, end: b }), className: css.audioSlice, style: {
                            left: frameToPx(p.start_frame),
                            width: `max(4px, ${frameToPx(Math.max(1, p.end_frame - p.start_frame))}px)`,
                        }, children: _jsx("span", { className: css.sliceLabel, children: timelineCopy.sliceRange({ start: a, end: b }) }) }, p.uuid));
                })) : (_jsx("div", { className: css.audioDrop, children: _jsx("span", { className: css.dropHint, children: timelineCopy.audioDropHint }) })) }, L.id));
        }) }));
}
/** Keyframe lanes: pin, drag, hover-X delete (bar line 1443). */
export function TimelineKeyframeLanes(props) {
    const { tracks, keyframes, laneHint, dragId, frameToPx, xToFrame, startDrag, onKeyframeAdd, onKeyframeDelete, } = props;
    return (_jsx(_Fragment, { children: tracks.map((track, ti) => {
            const kfs = keyframes.filter((k) => k.track_id === track.uuid);
            const color = rgb(track.color ?? [176, 180, 186]);
            return (_jsxs("div", { "data-lane": track.uuid, className: css.kfLane, style: { height: LANE_H }, onDoubleClick: (e) => {
                    const f = xToFrame(e.clientX);
                    if (f != null)
                        onKeyframeAdd(track.uuid, f);
                }, children: [keyframes.length === 0 && ti === 0 && (_jsx("span", { className: css.laneHint, children: laneHint })), kfs.map((kf) => {
                        const isMoving = dragId === kf.uuid;
                        return (_jsxs("div", { className: css.kfWrap, style: { left: frameToPx(kf.frame) }, "data-drop-hint": kf.dropHint, children: [_jsx(Tip, { tip: `${track.name} constraint @ frame ${kf.frame} — drag to move, click to jump, hover ✕ to delete${kf.dropHint ? `\n\n${kf.dropHint}` : ""}`, children: _jsx(Button, { variant: "ghost", size: "sm", "data-kf": kf.uuid, "aria-label": kf.ariaLabel ?? timelineCopy.keyframeAria({ track: track.name, frame: kf.frame }), onPointerDown: (e) => startDrag(e, {
                                            kind: "kf",
                                            id: kf.uuid,
                                            startX: e.clientX,
                                            frame: kf.frame,
                                            moved: false,
                                        }), onDoubleClick: (e) => e.stopPropagation(), className: css.kfBtn, children: _jsx("span", { className: cn(css.kfDiamond, isMoving && css.kfMoving), style: { background: color, borderColor: color } }) }) }), kf.thumbUrl !== undefined && (_jsx("img", { src: kf.thumbUrl, alt: "", draggable: false, "data-kf-thumb": kf.uuid, style: {
                                        position: "absolute", left: 10, top: "50%",
                                        transform: "translateY(-50%)", width: 14, height: 14,
                                        borderRadius: 3, objectFit: "cover", pointerEvents: "none",
                                        boxShadow: "0 0 0 1px var(--dsw-alias-border-l4)",
                                    } })), kf.readout !== undefined && (_jsx("span", { "data-kf-frame": kf.uuid, style: {
                                        position: "absolute", left: kf.thumbUrl !== undefined ? 26 : 10, top: "50%",
                                        transform: "translateY(-50%)", fontSize: 9, lineHeight: 1,
                                        color: "var(--dsw-alias-label-secondary)", whiteSpace: "nowrap",
                                        fontVariantNumeric: "tabular-nums", pointerEvents: "none",
                                    }, children: kf.readout })), _jsx(Tip, { tip: `Delete ${track.name} keyframe at frame ${kf.frame}`, children: _jsx(Button, { variant: "ghost", size: "sm", onPointerDown: (e) => e.stopPropagation(), onClick: (e) => {
                                            e.stopPropagation();
                                            onKeyframeDelete(kf.uuid);
                                        }, "aria-label": timelineCopy.deleteKeyframeAria({ track: track.name, frame: kf.frame }), className: css.kfDelete, children: _jsx(IconCloseOutlineRegular, {}) }) })] }, kf.uuid));
                    })] }, track.uuid));
        }) }));
}
//# sourceMappingURL=MotionTimelineBarLanes.js.map
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { OverlayKnob, SectionLabel, SpecAtom, Tip } from "@melite/card-base/client";
import { cn } from '@melite/card-base/client';
import { ChevronDown, X } from '@melite/card-base/client';
import s from "./studio.module.css";
import { GUIDE_KINDS, KNOB_ORDER, VIDEO_TIMELINE_TRACKS } from "./docModel.js";
import { readAsDataURL } from '@melite/card-base/client';
import { SourceRow } from '@melite/card-base/client';
import { FirstFrameSlot, SeamControls } from "./CallFrameSubcard.js";
import { CallCardPrompt } from "./CallCardPrompt.js";
import { REF_UPLOAD_SPEC, declaredShortName } from "./refUtils.js";
import { IMAGE_BUS_SLOTS, REF_CAPS, deliveredFrames, mergeDeclaredRefs, normalizeDeclaredRefs, refGenreOf, splitRefList, } from "@melite/models-h3/timelineContract";
/** A CARD-LEVEL reference chip (2026-09-23, the operator: the
 *  agent-persisted card-level refs showed NOWHERE): display-only — the
 *  studio never writes the declared surface (the agent path owns it),
 *  so there is no edit door to lie about. The full URL rides the
 *  title; a dead URL shows its broken thumb honestly. */
function DeclaredChip({ url, kind }) {
    const short = declaredShortName(url);
    return (_jsxs("span", { className: s.declaredChip, "data-testid": "tl-declared-ref", title: `card-level reference — rides every window's bus (edit via the card params, not this call)\n${url}`, children: [kind === "image" ? _jsx("img", { src: url, alt: short, className: s.declaredThumb }) : null, _jsx("span", { className: s.declaredName, children: short }), _jsx("span", { className: s.declaredTag, children: "card" })] }));
}
/** A REDUNDANT per-call copy (H4, 2026-09-23 — no hole left): a
 *  per-call chip already riding card-level hides from the lane (the
 *  bus dedupes it) — but hiding is not stranding. This row names
 *  the copy and offers its × : stripping the per-call copy changes
 *  NOTHING on the bus (the value still rides card-level), so the
 *  door cannot lie. */
function RedundantRow({ name, onStrip }) {
    const short = name.startsWith("data:") ? `upload (${name.length} chars)` : declaredShortName(name);
    return (_jsxs("span", { className: s.redundantRow, "data-testid": "tl-redundant-ref", title: `redundant per-call copy — already rides card-level, so the bus ignores this entry\n${name}\n× strips the copy (the bus is unchanged)`, children: [_jsxs("span", { className: s.redundantName, children: ["\u27E1 ", short] }), _jsx("button", { type: "button", className: s.redundantX, "data-testid": "tl-redundant-strip", onClick: onStrip, title: "strip the redundant per-call copy", children: "\u00D7" })] }));
}
/** ONE ref bucket — the estate's SourceRow per chip (the operator's
 *  2026-09-13 law: SourceRow owns EVERY input slot): pick from the
 *  available artifacts, upload inline (data: URL chip), remove via
 *  clear. The wire form is the comma string (the card's wireList
 *  law — trimmed entries, empties absent). */
function RefsBucket({ label, kind, accept, cap, value, artifacts, onChange, disabled, disabledHint, declared, }) {
    const chips = splitRefList(value);
    // per-call chips already riding as card-level hide (the bus dedupes
    // them) — true indices address the wire, never the view.
    const shown = chips
        .map((ch, idx) => ({ ch, idx }))
        .filter(({ ch }) => !declared.includes(ch));
    const bus = mergeDeclaredRefs(declared, chips);
    const over = bus.length > cap;
    const candidates = artifacts
        .filter((a) => refGenreOf(a.name, a.url) === kind && !chips.includes(a.name))
        .map((a) => ({ id: a.name, label: a.name, url: a.url }));
    const setChips = (next) => onChange(next.length ? next.join(", ") : "");
    // THE REDUNDANT COPIES (H4 — no hole left): per-call chips already
    // riding card-level hide from the lane but NOT from the door —
    // each names itself with a × that strips the copy (the bus is
    // unchanged: the value still rides card-level).
    const redundant = chips.filter((ch) => declared.includes(ch));
    const up = REF_UPLOAD_SPEC[kind];
    const disabledTitle = disabledHint ?? "pinned window — this input stands down";
    // THE PICK TRANSLATION (the slot grammar): a From-flow pick hands
    // the candidate's URL — the refs wire carries artifact NAMES (the
    // estate re-resolves names each run). A data: URL or bare name
    // rides verbatim.
    const chipOf = (v) => {
        const byUrl = candidates.find((c) => c.url === v);
        return byUrl !== undefined ? byUrl.id : v;
    };
    return (_jsxs("div", { className: s.refRow, "data-testid": "tl-call-ref-bucket", "data-disabled": disabled ? "true" : undefined, title: disabled ? disabledTitle : undefined, children: [_jsx(SectionLabel, { tail: _jsxs("span", { className: over ? s.refCountOver : disabled ? s.refCountOver : undefined, title: disabled
                        ? disabledTitle
                        : over ? `${bus.length} claimed — the bus holds ${cap}` : `${bus.length} of ${cap}${declared.length ? ` (${declared.length} card-level)` : ""}`, children: [bus.length, "/", cap, over ? " over cap" : "", disabled ? " · pinned" : ""] }), children: label }), _jsxs("div", { className: s.chips, style: disabled ? { opacity: 0.45, pointerEvents: "none" } : undefined, children: [declared.map((url) => (_jsx(DeclaredChip, { url: url, kind: kind }, `declared-${url}`))), shown.map(({ ch: chip, idx: ci }) => (_jsx(SourceRow, { label: chip.startsWith("data:") ? `upload ${ci + 1}` : chip, 
                        /* v8 ignore next -- RefsBucket mounts only as video/audio (its two call sites); the image lane is separate inline JSX (probe 2026-09-19) */
                        kind: kind === "image" ? "image" : "file", accept: accept, value: chip.startsWith("data:") ? null : chip, onEdit: (v) => {
                            if (v === "")
                                setChips(chips.filter((_, x) => x !== ci));
                            else
                                setChips(chips.map((x, idx) => (idx === ci ? chipOf(v) : x)));
                        }, candidates: candidates, onFile: async (f) => {
                            try {
                                const data = await readAsDataURL(f);
                                setChips(chips.map((x, idx) => (idx === ci ? data : x)));
                            }
                            catch { /* unreadable — the pickers never throw */ }
                        } }, `${chip}-${ci}`))), _jsx(SourceRow, { label: `+ ${label.toLowerCase()}`, 
                        /* v8 ignore next -- RefsBucket mounts only as video/audio (its two call sites); the image lane is separate inline JSX (probe 2026-09-19) */
                        kind: kind === "image" ? "image" : "file", accept: accept, value: null, onEdit: (v) => { if (v !== "")
                            setChips([...chips, chipOf(v)]); }, candidates: candidates, onFile: async (f) => {
                            if (f.size > up.maxMb * 1024 * 1024)
                                return;
                            try {
                                setChips([...chips, await readAsDataURL(f)]);
                            }
                            catch { /* unreadable — the pickers never throw */ }
                        } }), redundant.map((name) => (_jsx(RedundantRow, { name: name, onStrip: () => setChips(chips.filter((ch) => ch !== name)) }, `redundant-${name}`)))] })] }));
}
/** One focused model-call card (monolith lines 3418–3466 + 3641–3844;
 *  the prompt block lives in CallCardPrompt). */
export function CallCard({ c, i, deps, }) {
    const { selected, fps, layerA, knobFields, callCardRefs, artifactIndex, linkGroups, refArtifacts, handlePromptDelete, handlePromptUpdate, enhanceOne, undoEnhance, enhancing, enhanceErr, enhanceUndo, setCallSpan, setCallGuide, setCallTransition, setCallRefs, setCallKnob, voicePinnedCalls, audioClipsPresent, } = deps;
    // Focused mode: only the SELECTED call's card renders — the
    // rail is that call's editor (the others are one click away
    // via their bar clips / the back button).
    if (selected != null && i !== selected.callIdx)
        return null;
    const activeKnobs = c.knobs ? Object.keys(c.knobs).length : 0;
    const callSelected = selected?.callIdx === i;
    return (_jsxs("div", { "data-call-card": i, "data-guides": GUIDE_KINDS.filter((k) => (c[k] ?? "").trim()).join(" ") || undefined, "data-knobs": activeKnobs || undefined, "data-selected": callSelected ? "true" : undefined, ref: (el) => { callCardRefs.current[i] = el; }, className: cn(s.callCard, callSelected && s.callCardSel), children: [_jsxs("div", { className: s.cardHead, children: [_jsxs("span", { className: s.cardId, children: ["#", i, " \u00B7 Model call ", i + 1] }), _jsxs("span", { className: s.cardSpan, title: `frames ${c.start_frame}–${c.end_frame} (end exclusive) — delivered ${deliveredFrames(c, i)}f after the seam's carry`, children: ["frames ", c.start_frame, "\u2013", c.end_frame, " \u00B7 span ", ((c.end_frame - c.start_frame) / fps).toFixed(1), "s \u2192 delivered ", (deliveredFrames(c, i) / fps).toFixed(1), "s"] }), activeKnobs > 0 && (_jsxs("span", { className: s.knobTag, children: [activeKnobs, " knob", activeKnobs === 1 ? "" : "s"] })), _jsx(Tip, { tip: "Delete this call \u2014 its span merges into the neighbor", children: _jsxs(Button, { variant: "ghost", onClick: () => handlePromptDelete(`call-${i}`), "aria-label": `Delete call ${i}`, className: s.delBtn, children: [_jsx(X, { className: s.sz10, "aria-hidden": true }), " Delete"] }) })] }), _jsx(CallCardPrompt, { c: c, i: i, handlePromptUpdate: handlePromptUpdate, enhanceOne: enhanceOne, undoEnhance: undoEnhance, enhancing: enhancing, enhanceErr: enhanceErr, enhanceUndo: enhanceUndo }), _jsxs("div", { className: s.spanRow, children: [_jsx("span", { className: s.spanLabel, children: "Span" }), _jsx(SpecAtom, { f: { name: `call_${i}_start_frame`, label: `Call ${i} start frame`, type: "number", min: 0, step: 1 }, value: c.start_frame, placeholder: "", onEdit: (_, v) => {
                            const n = typeof v === "string" && v.trim() !== "" ? Number(v) : undefined;
                            if (n !== undefined)
                                setCallSpan(i, "start", Math.round(n));
                        } }), _jsx("span", { className: s.spanDash, children: "\u2013" }), _jsx(SpecAtom, { f: { name: `call_${i}_end_frame`, label: `Call ${i} end frame`, type: "number", min: 0, step: 1 }, value: c.end_frame, placeholder: "", onEdit: (_, v) => {
                            const n = typeof v === "string" && v.trim() !== "" ? Number(v) : undefined;
                            if (n !== undefined)
                                setCallSpan(i, "end", Math.round(n));
                        } }), _jsx("span", { className: s.spanNote, children: "end exclusive \u00B7 edit ripples the cut into the neighbor" })] }), _jsxs("div", { className: s.callRefs, "data-testid": "tl-call-refs", children: [_jsx(SectionLabel, { children: "Reference bundle (this call)" }), _jsxs("div", { className: s.callRefsBody, children: [(() => {
                                const chips = splitRefList(c.refs?.images);
                                // THE DECLARED SURFACE (2026-09-23): card-level refs ride
                                // ahead of the per-call chips in bus order (the compose's
                                // mergeRefs twin) — the bundle shows what rides, not just
                                // what this call owns. True indices address the wire.
                                const declared = normalizeDeclaredRefs(layerA?.ref_images);
                                const bus = mergeDeclaredRefs(declared, chips);
                                const shown = chips
                                    .map((ch, idx) => ({ ch, idx }))
                                    .filter(({ ch }) => !declared.includes(ch));
                                // THE REDUNDANT COPIES (H4 — same door as the buckets).
                                const redundant = chips.filter((ch) => declared.includes(ch));
                                const anchor = (c.image ?? "").trim() !== "" ? 1 : 0;
                                const total = anchor + bus.length;
                                const over = total > IMAGE_BUS_SLOTS;
                                const candidates = refArtifacts
                                    .filter((a) => refGenreOf(a.name, a.url) === "image" && !chips.includes(a.name))
                                    .map((a) => ({ id: a.name, label: a.name, url: a.url }));
                                const setChips = (next) => setCallRefs(i, "images", next.length ? next.join(", ") : "");
                                const up = REF_UPLOAD_SPEC.image;
                                // THE PICK TRANSLATION (the slot grammar): a From-flow pick
                                // hands the candidate's URL — the refs wire carries artifact
                                // NAMES (the estate re-resolves names each run). A data: URL
                                // or bare name rides verbatim.
                                const chipOf = (v) => {
                                    const byUrl = candidates.find((cand) => cand.url === v);
                                    return byUrl !== undefined ? byUrl.id : v;
                                };
                                return (_jsxs("div", { className: s.refRow, "data-testid": "tl-call-ref-bucket", children: [_jsx(SectionLabel, { tail: _jsxs("span", { className: over ? s.refCountOver : undefined, title: over
                                                    ? `${total} image slots claimed — the bus holds ${IMAGE_BUS_SLOTS} (1 anchor + ${REF_CAPS.images} refs); the compose slices the overflow`
                                                    : `${total} of ${IMAGE_BUS_SLOTS} image slots on the bus${declared.length ? ` (${declared.length} card-level)` : ""}`, "data-testid": "tl-call-ref-images", children: [total, "/", IMAGE_BUS_SLOTS, over ? " over bus" : ""] }), children: "Images \u2014 slot 1 anchors \u00B7 slots 2\u20139 reference" }), _jsxs("div", { className: s.chips, children: [_jsx(FirstFrameSlot, { testId: "tl-first-frame", callIndex: i, value: c.image, onChange: (source) => setCallGuide(i, "image", source), nameToUrl: artifactIndex.byName, urlToName: artifactIndex.byUrl, links: linkGroups }), declared.map((url) => (_jsx(DeclaredChip, { url: url, kind: "image" }, `declared-${url}`))), shown.map(({ ch: chip, idx: ci }) => (_jsx(SourceRow, { label: chip.startsWith("data:") ? `upload ${ci + 1}` : chip, kind: "image", value: chip.startsWith("data:") ? null : chip, onEdit: (v) => {
                                                        if (v === "")
                                                            setChips(chips.filter((_, x) => x !== ci));
                                                        else
                                                            setChips(chips.map((x, idx) => (idx === ci ? chipOf(v) : x)));
                                                    }, candidates: candidates, onFile: async (f) => {
                                                        try {
                                                            const data = await readAsDataURL(f);
                                                            setChips(chips.map((x, idx) => (idx === ci ? data : x)));
                                                        }
                                                        catch { /* unreadable — the pickers never throw */ }
                                                    } }, `${chip}-${ci}`))), _jsx(SourceRow, { label: "+ ref image", kind: "image", value: null, onEdit: (v) => { if (v !== "")
                                                        setChips([...chips, chipOf(v)]); }, candidates: candidates, onFile: async (f) => {
                                                        if (f.size > up.maxMb * 1024 * 1024)
                                                            return;
                                                        try {
                                                            setChips([...chips, await readAsDataURL(f)]);
                                                        }
                                                        catch { /* unreadable — the pickers never throw */ }
                                                    } }), redundant.map((name) => (_jsx(RedundantRow, { name: name, onStrip: () => setChips(chips.filter((ch) => ch !== name)) }, `redundant-${name}`)))] })] }));
                            })(), _jsx(RefsBucket, { label: "Ref videos", kind: "video", accept: "video/*", cap: REF_CAPS.videos, value: c.refs?.videos, artifacts: refArtifacts, onChange: (v) => setCallRefs(i, "videos", v), declared: normalizeDeclaredRefs(layerA?.ref_videos) }), _jsx(RefsBucket, { label: "Ref audios", kind: "audio", accept: "audio/*", cap: REF_CAPS.audios, value: c.refs?.audios, artifacts: refArtifacts, onChange: (v) => setCallRefs(i, "audios", v), declared: normalizeDeclaredRefs(layerA?.ref_audios), disabled: audioClipsPresent || (voicePinnedCalls?.has(i) ?? false), disabledHint: audioClipsPresent
                                    ? "THE BLOCKER: the timeline carries audio clips — the clips own the model's audio inputs; clear the D-M-E lanes to use reference audio"
                                    : "a dialogue/sfx clip pins this window — the pin owns its audio conditioning (remove the clip or move it to hear this input again)" }), _jsx(SeamControls, { callIndex: i, transition: c.transition, onTransition: (t) => setCallTransition(i, t) })] })] }), _jsx("div", { className: s.guidesRow, children: ["clip", "audio"].map((kind) => {
                    const track = VIDEO_TIMELINE_TRACKS.find((t) => t.uuid === kind);
                    // Dead-arm cut: every VIDEO_TIMELINE_TRACKS entry carries a
                    // color triple (docModel.ts literal) and both map keys exist —
                    // color is never null, so ?. / ?? never fire.
                    const color = `rgb(${track.color[0]}, ${track.color[1]}, ${track.color[2]})`;
                    const src = c[kind] ?? "";
                    return (_jsxs("span", { className: s.guideWrap, children: [_jsx("span", { className: s.guideDot, style: { background: src.trim() ? color : "transparent", border: `1px solid ${color}77` }, "aria-hidden": true }), _jsx("input", { list: "tl-kf-sources", value: src, placeholder: kind, "aria-label": `Call ${i} ${kind} guide`, "data-testid": "tl-call-guide", onChange: (e) => setCallGuide(i, kind, e.target.value), className: cn(s.guideRaw, !src.trim() && s.guideInEmpty) })] }, kind));
                }) }), _jsxs("details", { className: s.knobFold, children: [_jsxs("summary", { className: s.knobSummary, children: [_jsx(ChevronDown, { className: cn(s.sz10, s.chev), "aria-hidden": true }), "Call knobs", activeKnobs > 0 && (_jsx("span", { className: s.knobCount, children: activeKnobs }))] }), _jsx("div", { className: s.knobGrid, children: KNOB_ORDER.map((knob) => (_jsx(OverlayKnob, { name: knob, field: knobFields[knob], value: c.knobs?.[knob], base: layerA?.[knob], ariaLabel: `Call ${i} knob: ${knob}`, onEdit: (v) => setCallKnob(i, knob, v) }, knob))) })] })] }, i));
}
//# sourceMappingURL=CallCard.js.map

import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { statusOf, RUN_STATUS_WORDS } from "@melite/contracts/stageView";
import { refGenreOf } from '@melite/models-h3/timelineContract';
import { EmptyState, PaneHeader } from "@melite/card-base/client";
import { FilmPlayer } from "@melite-plugin/timeline/ui/timeline";
import { Clapperboard } from '@melite/card-base/client';
import s from "./studio.module.css";
function recordOf(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value)
        ? value
        : {};
}
function historyRows(stage) {
    const sources = [];
    const metadataHistory = stage.result?.metadata?.history;
    if (Array.isArray(metadataHistory))
        sources.push(metadataHistory);
    if (Array.isArray(stage.history))
        sources.push(stage.history);
    const out = [];
    for (const raw of sources)
        for (const value of raw) {
            const entry = recordOf(value);
            const direct = typeof entry.video === "string" ? entry.video : "";
            const artifacts = recordOf(entry.artifacts);
            const assets = Array.isArray(entry.assetUrls)
                ? entry.assetUrls.filter((url) => typeof url === "string")
                : [];
            const rows = Object.entries(artifacts)
                .filter((entry) => {
                const [name, url] = entry;
                return typeof url === "string" && url !== "" && refGenreOf(name, url) === "video";
            });
            const film = rows.find(([name, url]) => /(?:^|\/)h3_t4_film_\d+_\.mp4$/i.test(name) || /h3_t4_film_\d+_\.mp4(?:$|[?#])/i.test(url));
            const named = rows[0]?.[1];
            const flat = assets.find((url) => refGenreOf("", url) === "video");
            const video = direct !== "" && refGenreOf("", direct) === "video"
                ? direct
                : film?.[1] ?? named ?? flat ?? "";
            if (video === "")
                continue;
            const runId = typeof entry.runId === "string"
                ? entry.runId
                : typeof entry.run_id === "string" ? entry.run_id : undefined;
            out.push({
                ...(runId !== undefined ? { runId } : {}),
                ...(typeof entry.status === "string" ? { status: entry.status } : {}),
                ...(typeof entry.at === "number" ? { at: entry.at } : {}),
                ...(typeof entry.durationSec === "number" ? { durationSec: entry.durationSec } : {}),
                video,
            });
        }
    const seen = new Set();
    return out.filter((entry) => {
        const key = entry.runId ?? entry.video;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
/** Preview pane: final cut + window tiles + run history (lines 3928–4061).
 * Chrome rides the shared kit (2026-09-07): preview PaneHeader +
 * EmptyState (the aspirational TimelinePreview twin is deleted; this
 * pane is the one preview).
 *
 *  Behavior-neutral wiring (the ONLY edit in the whole split): the inline
 *  `onDuration={(sec) => setFilmDurSec(sec)}` is now the `onDuration` prop —
 *  the tenant passes the identical closure. The `running` prop is threaded
 *  explicitly (unlike the aspirational TimelinePreview sibling, which
 *  derives it from stage.status — that derivation can transiently disagree
 *  with the shell's live run flag, so this pane keeps the prop). */
export function StudioPreview({ stage, running, filmstrip, filmRef, filmMap, frameIdx, barTotal, fps, handleFilmTime, handlePlayingChange, onDuration, }) {
    return (_jsx(_Fragment, { children: _jsxs("div", { "data-testid": "tl-filmstrip", className: s.filmBox, children: [_jsx(PaneHeader, { variant: "preview", title: "Preview", meta: running
                        ? "— filling as the run lands…"
                        : filmstrip.windows.length
                            ? "— from the last run (unchanged windows reuse on re-run)"
                            : "— run compiles the calls into windows; each renders once, seams chained" }), (() => {
                    const hist = historyRows(stage);
                    if (!hist?.length)
                        return null;
                    return (_jsxs("div", { "data-testid": "tl-run-history", className: s.histRow, children: [_jsxs("span", { className: s.histTitle, children: ["Runs (", hist.length, ")"] }), hist.slice(0, 8).map((h, i) => {
                                // the owner's done family decides the tick — a run the
                                // estate settles 'succeeded' or a cached row is as done
                                // as 'completed'. A word outside the vocabulary is not a
                                // done run: this seat reads membership itself, because
                                // the contract fold refuses unknown words (operator
                                // decision 2026-10-12) and the studio must still mount
                                // for any word it is handed. The word is derived ONCE —
                                // an absent status folds to "" here, which the
                                // membership test already answers, so the classifier is
                                // never handed a coalesced second read.
                                const word = (h.status ?? "").toLowerCase();
                                return (_jsxs("a", { href: h.video, target: "_blank", rel: "noreferrer", title: h.runId +
                                        " · " + (h.status ?? "?") +
                                        " · " + (h.durationSec ?? "?") + "s" +
                                        (h.at ? " · " + new Date(h.at * 1000).toLocaleString() : ""), className: s.histChip, children: [(RUN_STATUS_WORDS.has(word) && statusOf(word) === "done") ? "✓" : "×", " ", (h.runId ?? "run").replace(/^run-/, "").slice(0, 8), " \u00B7 ", h.durationSec ?? "?", "s"] }, h.runId ?? i));
                            })] }));
                })(), _jsxs("div", { className: s.heroRow, children: [filmstrip.final && (_jsxs("div", { "data-testid": "tl-final-cut", className: s.finalCut, children: [_jsx(FilmPlayer, { ref: filmRef, src: filmstrip.final, className: s.player, "data-testid": "tl-film-player", onTime: handleFilmTime, onPlayingChange: handlePlayingChange, onDuration: onDuration }), _jsxs("div", { className: s.cutBar, children: [_jsx(Clapperboard, { className: s.cutIcon, "aria-hidden": true }), _jsx("span", { className: s.cutTitle, children: "Final cut" }), _jsxs("span", { className: s.cutTime, children: [(frameIdx / (filmMap?.fps ?? (fps || 24))).toFixed(2), "s \u00B7 frame ", frameIdx, "/", barTotal] }), _jsx("a", { href: filmstrip.final, target: "_blank", rel: "noreferrer", className: s.cutOpen, children: "open" })] })] })), !filmstrip.final && filmstrip.windows.map((w) => (_jsxs("div", { "data-testid": "tl-window-tile", "data-window": w.name, title: w.name, className: s.winTile, children: [_jsx("video", { src: w.url, muted: true, playsInline: true, preload: "metadata", controls: true, className: s.winVid }), _jsx("span", { className: s.winName, title: w.name, children: /_w(\d+)_/.exec(w.name)?.[1] != null ? `window ${/_w(\d+)_/.exec(w.name)[1]}` : w.name })] }, w.name))), !filmstrip.windows.length && !filmstrip.final && (_jsx(EmptyState, { icon: _jsx(Clapperboard, { className: s.emptyGlyph, "aria-hidden": true }), title: "No render yet \u2014 author the calls below, then Run.", hint: "Each window renders once; unchanged windows reuse across retakes." }))] })] }) }));
}
//# sourceMappingURL=StudioPreview.js.map

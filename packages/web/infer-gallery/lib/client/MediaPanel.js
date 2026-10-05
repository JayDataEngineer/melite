import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { Pill, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives';
import { MediaDrilldown } from "../drilldown.js";
import { loadDraftOntoBench, loadRunOntoBench } from "./bench-load.js";
import { artifactNameOf, artifactPathOfUrl, deleteArtifact, renameArtifact } from "./artifact-ops.js";
import { decodeRuns, decodeDrafts } from "./decode.js";
import { useFeed } from "./useFeed.js";
import css from './overlay.module.css';
import { Empty, ErrorBanner, GatewayErrors, PanelShell, RefreshButton, SearchInput, Stat, gradientCaption, gradientStage, } from "./ui.js";
import { MEDIA_KINDS } from "./media-kinds.js";
import { estateArtifactAddress } from "./artifact-address.js";
import { bgBase2, bgBase3, borderL2, fillSubtle2, labelPrimary1, labelPrimary3, labelPrimary4, labelSecondary2, stateBusinessPrimary, stateBusinessPrimaryBg2, stateWarnPrimary1, stateWarnPrimary2, textTertiary1, textTertiary2, } from "./ui.tokens.js";
/** JSON key order = classifier precedence (video beats image on a contradictory row). */
const KIND_ORDER = Object.keys(MEDIA_KINDS.kinds);
const KIND_LABEL = Object.fromEntries(KIND_ORDER.map((k) => [k, MEDIA_KINDS.kinds[k].label]));
const extRe = (exts) => new RegExp('\\.(' + exts.join('|') + ')(\\?|$)', 'i');
const KIND_RE = Object.fromEntries(KIND_ORDER.map((kind) => [kind, extRe(MEDIA_KINDS.kinds[kind].exts)]));
/** Numbered frame dumps (per-frame PNG exports) — noise in a run with 100+ frames. */
const FRAME_DUMP = /(^|_)\d{3,}_?\.png$/i;
/* FILENAME CONTRACTS with the render lanes — declared once, used by name
 * (the Sep-6 audit's F5: magic stems and suffix regexes restated at every
 * use site drift silently). Pinned by the media-sidebar wall
 * (filename contracts single definition). */
/** Concatenated film = video WITHOUT a per-window suffix; window films
 *  carry it. THE REAL SPELLING (live proof, BRIEF4 2026-09-23):
 *  `<stem>_w<idx>_<seq>_.mp4` — the sequence rides a TRAILING
 *  UNDERSCORE before the extension; the old hash-then-dot pattern
 *  matched nothing, so windows classified as finals. */
const WINDOW_FILM = /_w\d+_\w+_?\.mp4$/i;
/** (D-C2, 2026-09-28: the `i` flag is not cosmetic — bench-load's
 * hero pick spelled the same law case-insensitively while this
 * listing filter did not, so an .MP4 window film classified as a
 * FINAL here while the hero skipped it. The media-sidebar wall's
 * one-spelling arm caught the drift; the two declarations are now
 * character-identical.) */
/** Poster siblings rendered beside a film, keyed by artifact stem. */
const POSTER_STEMS = [/^(.+)_last_frame\.png$/i, /^(.+)_poster\.png$/i];
/** Classifier — kind ORDER comes from the SSOT's key order; the
 *  type field beats the URL, mime prefixes are the last resort. */
export function kindOf(a) {
    const t = a.type ?? '';
    const u = a.url ?? '';
    for (const kind of KIND_ORDER) {
        if (t === kind)
            return kind;
    }
    for (const kind of KIND_ORDER) {
        if (KIND_RE[kind].test(u))
            return kind;
    }
    if (t.startsWith('video/'))
        return 'video';
    if (t.startsWith('audio/') || t === 'audio')
        return 'audio';
    if (t.startsWith('image/'))
        return 'image';
    return null;
}
/** params is UNTRUSTED wire data — only a structurally-validated
 * calls[0].text feeds tile labels (audit F8: the old raw cast trusted
 * any object shape). */
export function callsTextOf(params) {
    if (params == null || typeof params !== 'object')
        return '';
    const calls = params.calls;
    if (!Array.isArray(calls) || calls.length === 0)
        return '';
    const text = calls[0]?.text;
    return typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : '';
}
/** The artifact's file name — THE ONE LAW (artifact-ops' resolver):
 *  an artifact-route URL's last path segment is the ROUTE's word, so
 *  reading the path named every artifact "artifact". */
function baseName(u) {
    return artifactNameOf(u);
}
function timeLabel(sec) {
    if (typeof sec !== 'number' || !Number.isFinite(sec) || sec <= 0)
        return '';
    try {
        return new Date(sec * 1000).toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
        });
    }
    catch {
        return '';
    }
}
/** Flatten the runs feed into media tiles (poster map, frame-flood
 *  guard, dedup by url, label law, final-film-first sort tie-break). */
export function flatten(runs) {
    const items = [];
    const seen = new Set();
    for (const run of runs) {
        const arts = Array.isArray(run.artifacts) ? run.artifacts : [];
        // Poster map: sibling *_last_frame.png / *_poster.png keyed by artifact stem.
        const posters = new Map();
        for (const a of arts) {
            const n = a.name ?? baseName(a.url ?? '');
            const m = POSTER_STEMS.map((re) => n.match(re)).find((x) => x !== null);
            if (m !== undefined && a.url)
                posters.set(m[1], a.url);
        }
        // Image-flood guard: runs that dump every frame would drown the grid —
        // when a run has >20 images, drop numbered frame dumps, keep the rest.
        // (Display-tier cap for gateways that don't truncate themselves; the
        // runs seat already caps LISTED images at policy.maxListedImages and
        // flags it via the run-row `truncated` marker — see media-kinds.ts.)
        const imageCount = arts.reduce((n, a) => (kindOf(a) === 'image' ? n + 1 : n), 0);
        const dropFrames = imageCount > 20;
        for (const a of arts) {
            const kind = kindOf(a);
            const url = a.url ?? '';
            if (kind === null || url === '' || seen.has(url))
                continue;
            seen.add(url);
            const file = a.name ?? baseName(url);
            if (dropFrames && kind === 'image' && FRAME_DUMP.test(file))
                continue;
            const stem = file.replace(/\.[^.]+$/, '');
            const prompt = String(run.prompt ?? '').replace(/\s+/g, ' ').trim();
            // YAML-flow runs carry no run.prompt — the story text lives in
            // params.calls[0].text; use it before the bare flow name so the
            // tile is labeled AND searchable ("cyberpunk" must hit).
            const callsText = callsTextOf(run.params);
            const labelSrc = prompt !== '' ? prompt : (run.name ?? '') !== '' ? String(run.name) : callsText;
            const head = labelSrc !== ''
                ? '"' + labelSrc.slice(0, 48) + (labelSrc.length > 48 ? '\u2026' : '') + '"'
                : String(run.flow ?? run.run_id ?? '');
            // concatenated film = video without a _w<N>_hash window suffix
            const isFinal = kind === 'video' && !WINDOW_FILM.test(file);
            let poster = '';
            if (kind === 'video') {
                poster = posters.get(stem) ?? (isFinal ? url : '');
                if (poster === '')
                    poster = run.thumbnail ?? '';
            }
            else if (kind === 'image') {
                poster = url;
            }
            items.push({
                id: url,
                kind,
                url,
                poster,
                head,
                final: isFinal,
                runId: String(run.run_id ?? ''),
                draftId: typeof run.draft_id === 'string' ? run.draft_id : '',
                time: timeLabel(run.created_at),
                file,
                created: typeof run.created_at === 'number' ? run.created_at : 0,
            });
        }
    }
    items.sort((a, b) => (b.created - a.created) || (Number(b.final) - Number(a.final)));
    return items;
}
function Glyph({ kind, size = 26 }) {
    if (kind === 'video') {
        return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: [_jsx("rect", { x: "2.5", y: "5", width: "13", height: "14", rx: "2.2", stroke: "currentColor", strokeWidth: "1.6" }), _jsx("path", { d: "M15.5 10.5 21 7.6v8.8l-5.5-2.9", stroke: "currentColor", strokeWidth: "1.6", strokeLinejoin: "round" })] }));
    }
    if (kind === 'audio') {
        return (_jsx("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: _jsx("path", { d: "M4 10v4M8 6.5v11M12 3.5v17M16 7.5v9M20 10v4", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round" }) }));
    }
    if (kind === 'model') {
        return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: [_jsx("path", { d: "M12 2.8 20 7.4v9.2l-8 4.6-8-4.6V7.4", stroke: "currentColor", strokeWidth: "1.6", strokeLinejoin: "round" }), _jsx("path", { d: "M12 12 20 7.4M12 12 4 7.4M12 12v9.2", stroke: "currentColor", strokeWidth: "1.6", strokeLinejoin: "round" })] }));
    }
    if (kind === 'image') {
        return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: [_jsx("rect", { x: "3.5", y: "4.5", width: "17", height: "15", rx: "2", stroke: "currentColor", strokeWidth: "1.6" }), _jsx("path", { d: "m6 16 4.5-5.5 3 3.5L16 11l2.5 3", stroke: "currentColor", strokeWidth: "1.6", strokeLinejoin: "round" }), _jsx("circle", { cx: "9", cy: "8.5", r: "1.3", fill: "currentColor" })] }));
    }
    const _exhaustive = kind;
    return _exhaustive;
}
/** Tile badge rule — ONE place: a model tile always badges 3D,
 *  everything else badges nothing (the operator's order: the FINAL
 *  FILM tag is dead — a tile's preview IS its currency, never a
 *  status ribbon). */
function badgeFor(item) {
    if (item.kind === 'model')
        return { text: '3D', warn: false };
    return null;
}
/** The wand's face — a HISTORY glyph (the operator's order:
 *  no 'CARDS' text on the tile). The action is unchanged: restore
 *  this run's workflow onto the bench and open the cards tab. */
function HistoryIcon({ size = 13 }) {
    return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", "aria-hidden": "true", children: [_jsx("path", { d: "M4.6 8.2A8 8 0 1 1 4 14", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" }), _jsx("path", { d: "M4.2 3.4v5h5", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("path", { d: "M12 7.5V12l3.5 2", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" })] }));
}
function TileBadge({ item }) {
    const badge = badgeFor(item);
    if (badge === null)
        return null;
    return (_jsx("span", { style: {
            position: 'absolute', left: 6, top: 6,
            background: badge.warn
                ? stateWarnPrimary2
                : stateBusinessPrimaryBg2,
            color: badge.warn
                ? bgBase3
                : stateBusinessPrimary,
            borderRadius: 5, padding: '2px 6px',
            fontSize: 9, fontWeight: 700, letterSpacing: 0.4,
        }, children: badge.text }));
}
/** Image tiles sit on the base surface (no letterbox); everything else on
 *  the gradient stage — the shared token-backed gradient (ui.tsx), never
 *  a restated literal (the single-site token law). */
function tileBgFor(kind) {
    if (kind === 'image')
        return bgBase2;
    return gradientStage;
}
/**
 * The centered preview — DSH's Modal (headless), the FlowCards drilldown
 * ride verbatim: body portal, mask, Escape, aria-modal, and focus
 * handling are the primitive's, never ours. The 2026-09-10 operator
 * audit caught this as a handrolled portal (own keydown listener, own
 * fixed mask div, own z-index) — retired. Media sizing rides the
 * `.lightbox` class (overlay.module.css); inner flex + captions stay
 * as content styles. (THE LOST MODAL, restored with the full port —
 * the bare gallery opened a new browser tab instead.)
 */
function Overlay({ item, onClose, openArtifact, siblings, onNavigate, onDelete, onRename }) {
    // ONE face everywhere (the operator's 1:1 order): the shared
    // MediaDrilldown — this surface only adapts its richer item (the
    // sidebar door keeps the gallery's full MediaItem currency).
    // The walk hands back the drilldown's lean item; the panel
    // re-finds ITS MediaItem by url (the walk set came from this
    // list — the hit always exists) so setPreview keeps the full
    // currency (id, poster, runId…).
    return (_jsx(MediaDrilldown, { item: item, onClose: onClose, openArtifact: (drill) => { openArtifact(item); }, siblings: siblings, onNavigate: (next) => {
            /* v8 ignore next 1 -- the walk item came FROM siblings; find-by-url always hits (probe 2026-09-20) */
            onNavigate(siblings.find((s) => s.url === next.url));
        }, onDelete: (drill) => onDelete(item), onRename: (drill, name) => onRename(item, name) }));
}
/** Sidebar tab glyph — exported for the (JSX-free) client entry. */
export function MediaTabIcon({ size }) {
    return (_jsxs("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true", children: [_jsx("rect", { x: "1.8", y: "3", width: "8.4", height: "10", rx: "1.4", stroke: "currentColor", strokeWidth: "1.3" }), _jsx("path", { d: "M10.2 6.4 14 4.6v6.8l-3.8-1.8", stroke: "currentColor", strokeWidth: "1.3", strokeLinejoin: "round" }), _jsx("path", { d: "M3.6 5.4h1.6M3.6 8h1.6M3.6 10.6h1.6", stroke: "currentColor", strokeWidth: "1.1", strokeLinecap: "round" })] }));
}
export function MediaPanel({ useTabInfo, sessionId }) {
    /* TWO independent feeds (useFeed): runs and drafts each own their
     * fetch/decode/never-stale engine — one failing never blanks the other
     * (the drafts feed's error is deliberately not rendered; the runs view
     * stays fully usable). */
    /* THE FULL PORT's transport: the feeds ride the GALLERY's OWN host
     * routes — same-origin /infer-gallery/runs + /infer-gallery/drafts
     * (the host serves the 500-run window and rewrites artifact names
     * to its same-origin artifact route; the deleted dsh-media rode
     * /v1/flows/* and its dead /v1/assets artifact URLs). */
    const runsFeed = useFeed('/infer-gallery/runs', decodeRuns, { runs: [], errors: [] });
    const draftsFeed = useFeed('/infer-gallery/drafts', decodeDrafts, { drafts: [], errors: [] });
    const runs = runsFeed.data.runs;
    const gatewayErrors = runsFeed.data.errors;
    const drafts = draftsFeed.data.drafts;
    const loading = runsFeed.loading;
    /* uiError: action errors (wand/draft open) — kept separate from the
     * feed's transport error so a failed open never reads as a dead feed. */
    const [uiError, setUiError] = useState('');
    const error = runsFeed.error !== '' ? runsFeed.error : uiError;
    const setError = setUiError;
    const [cat, setCat] = useState('all');
    const [search, setSearch] = useState('');
    const [preview, setPreview] = useState(null);
    const [tab, setTab] = useState('artifacts');
    /* THE SORT CONTROL (operator 2026-09-23): the archive is the
     * operator's record — Newest is the default scan, Oldest and A–Z
     * are the two reorderings the date wall made necessary. Applies to
     * the artifacts grid AND the drilldown's prev/next siblings (they
     * share `shown`). */
    const [sort, setSort] = useState('new');
    /* The tab's own navigation face (the standard hook every tab body
     * receives). Hook-count law: the prop is stable per mount, so the
     * conditional call keeps one hook order for the panel's lifetime. */
    const tabInfo = useTabInfo !== undefined ? useTabInfo() : undefined;
    /** Open one 3D artifact as the estate-artifact resource (ModelView). */
    const openArtifact = (item) => {
        const open = tabInfo?.tab.actions.openResource;
        if (open === undefined) {
            setUiError('3D view unavailable — the sidebar tab service is not loaded.');
            return;
        }
        open(estateArtifactAddress(item.url));
    };
    const load = runsFeed.reload;
    /** THE WAND (hunk 4, 2026-09-10; restore arm 2026-09-11;
     *  RUN-FIRST law, the media-sidebar audit 2026-09-22): "recover
     *  the cards that made this media" restores the run's workflow onto
     *  THE BENCH and opens the cards tab on it. NOT a bare run-address
     *  open: the run view hydrates from the registry's LIVE runs only,
     *  so settled runs land on `runs/unknown-run` — the wand resolves
     *  the run's OWN sidecar record first (stroke 45's law: the
     *  workflow that HAD that media — a live row draft serves whatever
     *  the draft holds NOW, which is wrong the moment the draft moved
     *  on). The row draft is the FALLBACK only: when the sidecar keeps
     *  no recoverable record but the draft still lives (a pruned run
     *  dir), the draft restores through the same bench CAS load. The
     *  window-global → DOM-claim → iframe relay it replaced
     *  (window.__meliteDeckOpenWithDraft) retired with the deck
     *  takeover. */
    const openCards = (item) => {
        const open = tabInfo?.tab.actions.openResource;
        if (open === undefined) {
            setError('Media Flow view unavailable — the sidebar tab service is not loaded.');
            return;
        }
        const deps = { openResource: open, onError: setError, sessionId };
        // THE MUTABLE-BENCH REFUSAL (stroke 45): a bench-prefixed
        // draft_id names the LIVING bench — loading it serves whatever
        // the bench holds NOW, never the workflow that made this image.
        // Bench-born artifacts always carry their run id: restore from
        // the run's own record instead (never a draft fallback either).
        const canDraft = item.draftId !== '' && !item.draftId.startsWith('bench-');
        if (item.runId !== '') {
            // Silent probe: the run load opens through the probe on
            // success; only its failure (captured, never surfaced twice)
            // falls back to the row draft — or surfaces honestly when no
            // draft may serve.
            const probed = [];
            let probeError = '';
            void loadRunOntoBench(item.runId, {
                openResource: (address) => { probed.push(address); },
                onError: (message) => { probeError = message; },
                sessionId,
            }).then(() => {
                if (probed.length > 0) {
                    for (const address of probed)
                        open(address);
                    return;
                }
                if (canDraft) {
                    void loadDraftOntoBench(item.draftId, deps);
                    return;
                }
                setError(probeError !== '' ? probeError : 'this run keeps no card record — nothing to restore');
            });
            return;
        }
        if (canDraft) {
            void loadDraftOntoBench(item.draftId, deps);
            return;
        }
        setError('this run keeps no card record — nothing to restore');
    };
    /** FLOW OPEN (hunk 4): a draft row loads onto THE BENCH (the shared
     *  state both authors edit) and opens the cards tab — bench-load.ts. */
    const openDraft = (draftId) => {
        if (draftId === '')
            return;
        const open = tabInfo?.tab.actions.openResource;
        if (open === undefined) {
            setError('Media Flow view unavailable — the sidebar tab service is not loaded.');
            return;
        }
        void loadDraftOntoBench(draftId, { openResource: open, onError: setError, sessionId });
    };
    /** THE MODAL MUTATIONS (the mediasidebar's popup modal on media
     *  stuff): delete unlinks the artifact file then closes the modal
     *  and reloads the feed; rename re-points the open preview onto
     *  the door's answer and reloads behind it. Both throw LOUD for
     *  the drilldown's error face when the URL rides no gallery path
     *  or the door refuses. */
    const deleteItem = async (item) => {
        const target = artifactPathOfUrl(item.url);
        if (target === null)
            throw new Error('delete failed (not a gallery artifact — nothing to delete)');
        await deleteArtifact(target);
        setPreview(null);
        load();
    };
    const renameItem = async (item, name) => {
        const target = artifactPathOfUrl(item.url);
        if (target === null)
            throw new Error('rename failed (not a gallery artifact — nothing to rename)');
        const next = await renameArtifact(target, name);
        setPreview({ ...item, id: next.url, url: next.url, file: next.path.split('/').pop() ?? name });
        load();
    };
    const items = useMemo(() => flatten(runs), [runs]);
    /* TRUNCATION VISIBILITY (audit gap 6): the route stashes {listed,total}
     * on run rows the seat capped — surface the count so a 3-of-40
     * listing never reads as data loss. */
    const truncatedRuns = useMemo(() => runs.filter((r) => r.truncated !== undefined && r.truncated.total > r.truncated.listed).length, [runs]);
    const counts = useMemo(() => {
        const c = { all: items.length, ...Object.fromEntries(KIND_ORDER.map((k) => [k, 0])) };
        for (const it of items)
            c[it.kind] += 1;
        return c;
    }, [items]);
    const shown = useMemo(() => {
        const q = search.trim().toLowerCase();
        const out = items.filter((it) => {
            if (cat !== 'all' && it.kind !== cat)
                return false;
            if (q === '')
                return true;
            return (it.head + ' ' + it.file + ' ' + it.time).toLowerCase().includes(q);
        });
        if (sort === 'old')
            out.sort((a, b) => a.created - b.created);
        else if (sort === 'name')
            out.sort((a, b) => a.file.localeCompare(b.file));
        return out;
    }, [items, cat, search, sort]);
    /* Category chips ride the DSH Pill 1:1 (active/onClick/children —
     * the handrolled bordered-button replica died here 2026-09-09: the
     * panel runs inside the DSH host, so the DSW pill chrome IS the
     * native look. The flows/artifacts segmented control stays custom —
     * DSH ships no segmented atom.) */
    const chip = (c, label) => {
        return (_jsxs(Pill, { active: cat === c, onClick: () => { setCat(c); }, children: [label, " ", counts[c]] }, c));
    };
    return (_jsxs(PanelShell, { dataAttr: "infer-media-panel", children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }, children: [_jsx("span", { style: { fontWeight: 700, fontSize: 14 }, children: "Infer Media" }), _jsxs(Stat, { children: [runs.length, " runs \u00B7 ", items.length, " artifacts", gatewayErrors.length > 0 ? ' · ' + gatewayErrors.length + ' gateway note' + (gatewayErrors.length > 1 ? 's' : '') : '', truncatedRuns > 0 ? ' · ' + truncatedRuns + ' capped' : ''] }), _jsx("span", { style: { flex: 1 } }), _jsx("span", { style: { display: 'flex', gap: 4 }, children: ['flows', 'artifacts'].map((t) => (_jsx(Pill, { active: tab === t, onClick: () => { setTab(t); }, children: t === 'flows' ? 'Flows ' + String(drafts.length) : 'Artifacts ' + String(items.length) }, t))) }), _jsx("span", { style: { display: 'flex', gap: 4 }, children: [['new', 'Newest'], ['old', 'Oldest'], ['name', 'A–Z']].map(([m, label]) => (_jsx(Pill, { active: sort === m, onClick: () => { setSort(m); }, children: label }, m))) }), _jsx(SearchInput, { value: search, onChange: setSearch, placeholder: "search prompt, file\u2026" }), _jsx(RefreshButton, { loading: loading, onClick: load })] }), _jsxs("div", { style: { display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }, children: [chip('all', 'All'), KIND_ORDER.map((k) => chip(k, KIND_LABEL[k]))] }), tab === 'flows'
                ? (drafts.length === 0
                    ? _jsx(Empty, { children: "no composed cards yet \u2014 build one in a chat." })
                    : _jsx("div", { "data-infer-media-drafts": "1", style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: drafts.map((d) => (_jsxs("button", { onClick: () => { openDraft(d.draft_id ?? ''); }, "data-draft": d.draft_id, style: {
                                display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                                border: '1px solid ' + borderL2, borderRadius: 10, padding: '8px 12px',
                                background: gradientStage, cursor: 'pointer',
                                color: labelPrimary1, fontFamily: 'inherit',
                            }, children: [_jsx("span", { style: { fontSize: 15, lineHeight: 0, color: stateWarnPrimary1 }, children: "\u25B8" }), _jsxs("span", { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }, children: [_jsx("span", { style: { fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: d.name || d.draft_id }), _jsxs("span", { style: { fontSize: 10, fontFamily: 'ui-monospace, monospace', color: labelSecondary2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, children: [d.model || 'card', " \u00B7 ", d.draft_id] })] }), typeof d.source === 'string' && d.source !== ''
                                    ? _jsx("span", { style: { fontSize: 9, color: textTertiary2, border: '1px solid ' + borderL2, borderRadius: 6, padding: '2px 6px' }, children: d.source.replace(/^https?:\/\//, '') })
                                    : null] }, d.draft_id ?? Math.random()))) }))
                : _jsx(GatewayErrors, { errors: gatewayErrors }), tab === 'artifacts' && (error !== ''
                ? _jsxs(ErrorBanner, { children: ["failed to load runs: ", error] })
                : loading && items.length === 0
                    ? _jsx(Empty, { children: "loading runs\u2026" })
                    : shown.length === 0
                        ? _jsx(Empty, { children: "no artifacts match." })
                        : (_jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: 10 }, children: shown.map((it) => (_jsxs("button", { onClick: () => { setPreview(it); }, style: {
                                    position: 'relative', aspectRatio: '16 / 9', borderRadius: 10, overflow: 'hidden',
                                    border: '1px solid ' + borderL2, cursor: 'pointer', padding: 0,
                                    background: tileBgFor(it.kind),
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: textTertiary2,
                                    textAlign: 'left', fontFamily: 'inherit',
                                }, children: [it.poster !== '' && it.kind !== 'video'
                                        ? _jsx("img", { src: it.poster, alt: "", loading: "lazy", style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' } })
                                        : it.kind === 'video'
                                            ? (
                                            // contain, never cover: a cropped video tile
                                            // hides its own frame — the operator's
                                            // "video not fitting" catch (images keep
                                            // cover: a square tile cropping a photo is
                                            // the thumbnail law, a video cropped is a
                                            // lie about what was made).
                                            _jsx("video", { src: it.url, poster: it.poster !== '' && it.poster !== it.url ? it.poster : undefined, muted: true, playsInline: true, preload: "metadata", disablePictureInPicture: true, "aria-hidden": "true", tabIndex: -1, style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' } }))
                                            : null, it.kind === 'video'
                                        ? (_jsx("span", { style: {
                                                position: 'absolute', right: 6, bottom: 6, background: fillSubtle2,
                                                borderRadius: 6, padding: 3, lineHeight: 0, color: labelPrimary4,
                                            }, children: _jsx(Glyph, { kind: "video", size: 14 }) }))
                                        : null, _jsx(TileBadge, { item: it }), _jsx(Tooltip, { label: "Open as cards \u2014 this run, live in the cards tab", children: _jsx("span", { role: "button", tabIndex: 0, className: css.wand, "aria-label": "Open as cards \u2014 this run", onClick: (e) => {
                                                e.stopPropagation();
                                                openCards(it);
                                            }, onKeyDown: (e) => {
                                                if (e.key === 'Enter') {
                                                    e.stopPropagation();
                                                    openCards(it);
                                                }
                                            }, children: _jsx(HistoryIcon, {}) }) }), it.poster === '' && it.kind !== 'video'
                                        ? _jsx("span", { style: { color: textTertiary1 }, children: _jsx(Glyph, { kind: it.kind }) })
                                        : null, _jsxs("span", { style: {
                                            position: 'absolute', left: 0, right: 0, bottom: 0, padding: '16px 6px 4px',
                                            background: gradientCaption,
                                            fontSize: 10, lineHeight: 1.35, color: labelPrimary3,
                                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                        }, children: [it.head !== '' ? it.head + ' \u2014 ' : '', [it.time, it.file].filter(Boolean).join(' · ')] })] }, it.id))) }))), preview !== null
                ? _jsx(Overlay, { item: preview, onClose: () => { setPreview(null); }, openArtifact: openArtifact, siblings: shown, onNavigate: (next) => { setPreview(next); }, onDelete: deleteItem, onRename: renameItem })
                : null] }));
}
//# sourceMappingURL=MediaPanel.js.map

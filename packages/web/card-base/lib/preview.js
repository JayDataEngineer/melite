/**
 * preview.tsx — THE SHARED PREVIEW COMPONENTS (the preview seam's
 * built-in claims, hour-9 2026-09-13 — the operator's law: "Where
 * the VIDEO PREVIEW and the IMAGE PREVIEW of other cards go in a
 * SLOT with SHARED DSH PRIMITIVES"). One preview per media kind,
 * DSH-pure: native media elements on card-base chrome, DSW tokens
 * BARE (no fallbacks — the hour-8 name law), zero bespoke islands.
 *
 * These are the DEFAULTS the pattern prescribes (the ui-tool law:
 * "central default views"); a card claims its kind's preview only
 * to specialize — the h3 studio rides the shared VIDEO preview for
 * its hero, exactly as an image-gen card rides the IMAGE one.
 */
import { createElement as h, useEffect, useState, useSyncExternalStore } from 'react';
import { Button, Pill } from '@deepseek-ai/dsh-client-ui-primitives';
import { GlbStagePreview } from "./glb-stage.js";
import { PoserFigureStage } from "./poser-figure.js";
import { AudioLines, Box, Film, Image, Type } from "./icons.js";
import { EmptyState } from "./layout.js";
import { isLiveRunStatus } from '@melite/contracts/stageView';
import { cn } from "./chrome.js";
import { chromeCopy } from "./locales/chromeCopy.js";
import s from './preview.module.css';
import { pickCellOf, readPick, writePick } from "./pick-store.js";
export { resetPickCellsForTests } from "./pick-store.js";
/** THE PICK CELLS (DSH's client state law): the view subscribes to
 *  the identity-keyed mirror the pick-store module owns; a
 *  presentation component never owns store-lifetime state. */
function usePickCell(id) {
    const cell = pickCellOf(id);
    const key = useSyncExternalStore((onChange) => { cell.listeners.add(onChange); return () => { cell.listeners.delete(onChange); }; }, () => readPick(cell));
    const set = (next) => { writePick(cell, next); };
    return [key, set];
}
/** THE HISTORY HERO (stroke 40 + the output-component stroke): one
 * hook, three faces — the hero artifact, the REST of whatever set
 * the hero belongs to (the current run's other outputs, or a picked
 * history entry's other outputs — a multi-output card shows its
 * full set either way, never the current row under an old hero),
 * and THE STALENESS FACT (an explicitly picked entry is NOT the
 * current generation — the badge law; the between-runs fallback
 * hero gets NO badge: with no current run, the newest archive is
 * the closest thing to current, not a stale one). */
/** The view-identity cell id (stage + run, else urls) — ONE law,
 * exported so a preview's specialized pick cells (the video face's
 * current-set pick) derive from the SAME identity, never re-derive. */
export function previewCellIdOf(props) {
    return props.runId !== undefined && props.runId !== ''
        ? `${props.stageId}\u0000run:${props.runId}`
        : `${props.stageId}\u0000${props.artifacts.map((a) => a.url).join('|')}`;
}
function useHistoryHero(props, opts) {
    const flat = props.artifacts.length > 0
        ? props.artifacts
        : (props.history ?? []).flat();
    const history = props.history ?? [];
    // THE PICK IS A KEY, NEVER AN INDEX (the operator's catch,
    // 2026-09-21: "the state constantly corrupts"): history is
    // NEWEST-FIRST and grows at the HEAD — an index-based pick points
    // at a DIFFERENT entry the moment a run archives (viewing the
    // wrong generation, silently). The pick stores the entry's url-set
    // key (its stable identity); the index is DERIVED per render.
    const keyOf = (entry) => entry.map((a) => a.url).join('|');
    // THE CELL ID IS THE VIEW IDENTITY (stage + run): a new run or a
    // stage switch IS a different cell — the reset falls out of
    // identity, no effect timers, no mount-lifetime coupling. The
    // DSH client-state law: the store lives outside the component.
    // THE RUN-ID KEY (2026-09-20, the operator's catch: "random when
    // I click"): the key is stageId + RUN ID — NOT the artifact urls.
    // The urls VANISH mid-run (the start patch's result is {run_id}
    // only), so a urls-keyed cell DIED at every run boundary and a
    // picked history tile silently unpicked — the hero jumped and the
    // clicks read as random. The run id is stable across the whole
    // cycle (start patch → live flips → terminal), so the pick
    // survives the churn; a genuinely new run still resets (fresh
    // cell). Pre-run rows (runId '') fall back to the urls key.
    const cellId = previewCellIdOf(props);
    const [pickedKey, setPickedKey] = usePickCell(cellId);
    const picked = pickedKey === null ? -1 : history.findIndex((e) => keyOf(e) === pickedKey);
    // THE TOGGLE LAW (the operator's bug report, 2026-09-16: "not
    // respecting whether I click on historical preview or the image
    // preview"): a history pick is a VIEW, not a one-way door —
    // clicking the picked tile again returns to current, and the
    // badge's return control rides the same seam.
    const promote = (i) => {
        // the strip only renders tiles for entries that exist (the
        // owner builder filters empty rows) — a bad index would throw
        // LOUD at keyOf, never silently collapse
        const k = keyOf(history[i]);
        setPickedKey(k !== pickedKey ? k : null);
    };
    const returnToCurrent = () => { setPickedKey(null); };
    const entry = picked >= 0 && history[picked] !== undefined && history[picked].length > 0
        ? history[picked]
        : null;
    const source = entry ?? flat;
    // THE SELF-PICK LAW (the operator's bug, 2026-10-01: the badge
    // read "Not current — earlier generation" after switching back
    // to the right one): a pick whose url-set IS the current
    // generation's is a view of the CURRENT hero, not an earlier
    // one — no staleness exists to warn about, and a badge claiming
    // one is a false alarm the operator cannot dismiss by picking
    // correctly. With no live artifacts the newest archive is the
    // closest thing to current (the between-runs law above), so
    // picking THAT entry is likewise not stale; only an older
    // archive badges. The pick itself (the toggle, the pressed
    // mark) is untouched — only the false warning goes.
    const currentSet = props.artifacts.length > 0 ? props.artifacts : history[0];
    const viewingHistory = entry !== null
        && (currentSet === undefined || keyOf(entry) !== keyOf(currentSet));
    // THE HERO INDEX (2026-09-22, the operator's catch b): "the
    // preview only shows of the three clips one clip" — a film run's
    // artifacts arrive in SAVE ORDER (windows first, the composed
    // film last), so source[0] is a WINDOW and the product hides in
    // the links. A preview may name its own hero (the video face
    // names the film); the remainder keeps order around it.
    const heroIdx = opts?.heroIndex !== undefined && source.length > 0
        ? Math.min(Math.max(0, opts.heroIndex(source)), source.length - 1)
        : 0;
    return {
        hero: source[heroIdx],
        rest: [...source.slice(0, heroIdx), ...source.slice(heroIdx + 1)].slice(0, 12),
        viewingHistory,
        // ('' and undefined both mean no note — the owner builder sends
        // empty slots to keep historyNotes index-aligned with history;
        // a self-pick carries no note — it is not stale)
        note: !viewingHistory ? undefined : ((props.historyNotes ?? [])[picked] || undefined),
        picked: entry !== null ? picked : -1,
        promote,
        returnToCurrent,
    };
}
/** THE NOT-CURRENT BADGE (the output-component stroke — the
 * operator's law: "a tag or indicator to show they are not
 * current"). Rendered while an explicit history pick owns the hero;
 * when the entry's params snapshot differs from the live params the
 * chip names the keys (shared by every presenter). */
/** THE NOT-CURRENT BADGE (the output-component stroke — the
 * operator's law: "a tag or indicator to show they are not
 * current") — AND THE RETURN CONTROL (the toggle law, 2026-09-16):
 * the badge is the visible way back to the current generation;
 * clicking it restores the current hero. */
function StaleBadge(props) {
    // THE DSH CAPSULE (S7j, the chrome canon): the return control rides
    // Pill — the catalog's interactive capsule (README line 77: Tag is
    // the READ-ONLY badge; "for Pill when the capsule is selectable
    // (active and onClick…)"). Testid, hover title, and the seat-bubble
    // stopPropagation ride the Pill rest channel; s.staleBadge keeps
    // only the layout placement.
    return h(Pill, {
        className: s.staleBadge,
        // the spread escape: ButtonHTMLAttributes has no data-* index
        ...({ 'data-testid': 'history-stale-badge' }),
        // THE SEAT BUBBLE (the operator's catch, 2026-09-21, proven
        // LIVE: the picked state was unrecoverable): the badge rides
        // INSIDE the drilldown seat (role=button — the whole face opens
        // the media walk), so the return click BUBBLED to the seat and
        // the walk overlay opened OVER the badge — every later click
        // landed on the lightbox, never the drill. The badge consumes
        // its own click; the hero (and only the hero) opens the walk.
        onClick: (e) => { e.stopPropagation(); props.onReturn(); },
        title: chromeCopy.staleReturnTitle,
    }, 'Not current — earlier generation', props.note === undefined ? null : ` · differs: ${props.note}`, ' · Return to current');
}
/** ONE HISTORY THUMB with an HONEST DEAD FACE (the operator's
 *  catch, 2026-09-21: "There's no sideways error"): an archived
 *  artifact whose file left the disk rendered the browser's silent
 *  broken-image glyph — no error, no name, nothing. The strip is
 *  the sideways row; a dead entry shows its NAME and a missing
 *  marker, never a silent void.
 *  THE KIND FACE (the operator's catches, 2026-10-08): (1) audio
 *  history tiles read 'gone' — an <img> decodes ONLY images, so a
 *  non-image url seated in an <img> fires onError on mount and
 *  every audio/video/mesh tile wore the FALSE dead face ("it says
 *  gone instead historical view under the preview"). (2) the first
 *  cut put the artifact NAME in the chip — "a long rectangle with
 *  a file name" (music/SaveAudioAdvanced.0_music_00002.mp3)
 *  instead of something compact. THE FACE: the thumb rides the
 *  owner's DECLARED kind (the primary-output law — the same kind
 *  that picked this presenter): image decodes as itself (the dead
 *  face stays its honesty); every other kind renders a COMPACT
 *  48×48 glyph square — the image thumb row's own rhythm — with
 *  the full artifact name on the TILE BUTTON's tooltip, never in
 *  the face. No decode to fail, no false 'gone', no long box. */
function HistoryThumb(props) {
    const [dead, setDead] = useState(false);
    if (props.kind !== 'image') {
        const Glyph = props.kind === 'audio' ? AudioLines : props.kind === 'video' ? Film : Box;
        // the glyph carries the face; the TILE button's title (the
        // entry's artifact names — HistoryStrip) is the name + the
        // accessible label (the icon set's aria-hidden law holds)
        return h(Glyph, {
            className: s.thumbFace,
            'data-testid': `history-thumb-${props.kind}`,
        });
    }
    if (dead) {
        return h('span', {
            className: cn(s.thumb, s.thumbDead),
            'data-testid': 'history-thumb-missing',
            title: chromeCopy.artifactGoneTitle({ name: props.a.name }),
        }, 'gone');
    }
    return h('img', {
        key: props.a.url, className: s.thumb, src: props.a.url, alt: props.a.name, loading: 'lazy',
        onError: () => { setDead(true); },
    });
}
function HistoryStrip(props, promote, testid, picked) {
    // THE OPT-OUT (gap 4): a card that claims its own bottom bar
    // serves historyStrip: false — the strip is OFF, the history data
    // still rides the owner (the promote seam stays armed for a
    // future face; nothing is deleted, the bar is claimed).
    if (props.historyStrip === false)
        return null;
    const history = props.history ?? [];
    if (history.length === 0)
        return null;
    const notes = props.historyNotes ?? [];
    return h('div', { className: s.historyBlock, 'data-testid': testid }, h('span', { className: s.historyTitle }, chromeCopy.historyTitle), h('div', { className: s.thumbRow }, history.map((entry, i) => h('button', {
        key: String(i) + '|' + String(entry[0]?.url ?? ''),
        type: 'button',
        // ARGUED RAW SEAT (S7j, the tile-face class): a media-thumb
        // tile is a layout face — a Button conversion would pill a
        // 40px image tile (the card-view tile ruling, S6g); DSH's own
        // media card is a raw button + module css (ui-deliverables
        // PresentedFileCard.tsx:40 css.cardPreview).
        // THE PICKED MARK (the toggle law): the tile that owns the
        // hero says so — a picked tile with no mark reads as an
        // ignored click (the operator's report).
        className: cn(s.historyTile, i === picked ? s.historyTileActive : undefined),
        'aria-pressed': i === picked,
        title: entry.map((a) => a.name).join(', ') + (notes[i] ? chromeCopy.historyDiffersSuffix({ note: String(notes[i]) }) : '') + (i === picked ? chromeCopy.historyViewingCurrentSuffix : ''),
        // THE SEAT BUBBLE (same law as the badge above): the strip
        // rides inside the walk-opening seat — an unconsumed thumb
        // click picked AND opened the lightbox, which ate the badge
        // and the run button (the jsdom walls never saw it: no
        // hit-testing). The thumb consumes its own click.
        onClick: (e) => { e.stopPropagation(); promote(i); },
    }, entry.slice(0, 1).map((a, j) => h(HistoryThumb, { key: String(i) + '|' + String(j) + '|' + a.url, a, kind: props.kind }))))));
}
/** THE SEAT-SAFE NEW-TAB LINK (the seat-bubble law, ledger #45):
 *  rest links ride INSIDE the walk-opening drilldown seat — the
 *  link consumes its own click so opening the tab never also opens
 *  the walk (the thumb/badge fix's sibling; one wrapper, both
 *  presenters — the platform owns the link, we own the wrap). */
function seatSafeLink(a, i = 0) {
    return h('a', {
        key: String(i) + '|' + a.url + a.name, className: s.stripLink, href: a.url, target: '_blank', rel: 'noreferrer',
        title: a.name,
        onClick: (e) => { e.stopPropagation(); },
    }, a.name);
}
/** THE VIDEO PREVIEW — one hero film, one native player (the kit's
 *  FilmPlayer law: native <video controls>; no library, no kit). The
 *  hero is THE FILM (the composed artifact — a film run's artifacts
 *  arrive windows-first, the film last, so the named film wins the
 *  seat; any other video card keeps the first). The set's other
 *  clips render as PLAYABLE THUMBS in the strip (the operator's
 *  catch b, 2026-09-22: "the preview only shows one of the three
 *  clips" — a text link is not a preview): click a thumb to promote
 *  it into the hero, click it again to return (the toggle law);
 *  the name still opens the file raw in a new tab. The set is the
 *  CURRENT run's (or the picked history entry's — never mixed).
 *  Honest empty state while no artifact has landed. */
export function VideoStagePreview(props) {
    const { hero: defaultHero, rest, viewingHistory, note, picked, promote, returnToCurrent } = useHistoryHero(props, {
        // the film is the product; windows are ingredients
        heroIndex: (src) => {
            const i = src.findIndex((a) => /(^|[^a-z])film([^a-z]|$)/i.test(a.name));
            return i >= 0 ? i : 0;
        },
    });
    // the current-set face pick: a promoted thumb owns the hero until
    // toggled off — keyed by url on the SAME view identity cell
    const [faceUrl, setFaceUrl] = usePickCell(`${previewCellIdOf(props)}\u0000face`);
    const promoted = faceUrl !== null && defaultHero !== undefined && (defaultHero.url === faceUrl || rest.some((a) => a.url === faceUrl))
        ? (defaultHero.url === faceUrl ? defaultHero : rest.find((a) => a.url === faceUrl))
        : undefined;
    const hero = promoted ?? defaultHero;
    // EVERY clip stays visible (the all-visible law): the strip holds
    // the whole set — the default hero included — and the hero mirrors
    // the pick; the promoted thumb never vanishes from the strip, so
    // the toggle-back click always exists
    const others = defaultHero !== undefined ? [defaultHero, ...rest] : [];
    return h('div', { className: s.stagePreview, 'data-testid': 'stage-preview-video' }, viewingHistory ? h(StaleBadge, { note, onReturn: returnToCurrent }) : null, hero === undefined
        ? h(EmptyState, {
            variant: 'bare', className: s.empty, icon: h(Film, { className: s.emptyGlyph }),
            title: isLiveRunStatus(props.runStatus) ? 'rendering… the film lands here' : 'No render yet — run lands the film here',
        })
        : h('video', {
            className: s.hero, controls: true, playsInline: true, key: hero.url,
            src: hero.url, 'data-testid': 'stage-preview-video-hero',
        }), others.length > 0
        ? h('div', { className: s.strip, 'data-testid': 'stage-preview-video-strip' }, others.map((a) => h('button', {
            key: a.url, type: 'button',
            // ARGUED RAW SEAT (S7j, the tile-face class): a playable
            // 128px video tile — a Button would pill a media face (the
            // S6g tile ruling; DSH's own media card is a raw button +
            // module css, PresentedFileCard.tsx:40).
            className: cn(s.thumbVideoBtn, a.url === faceUrl ? s.thumbVideoActive : undefined),
            'aria-pressed': a.url === faceUrl,
            title: a.name + (a.url === faceUrl ? chromeCopy.filmViewingSuffix : chromeCopy.filmPreviewSuffix),
            onClick: (e) => { e.stopPropagation(); setFaceUrl(a.url !== faceUrl ? a.url : null); },
        }, h('video', { className: s.thumbVideo, src: a.url, muted: true, playsInline: true, preload: 'metadata' }), h('span', { className: s.thumbVideoName }, a.name))))
        : null, HistoryStrip(props, promote, 'stage-output-history', picked));
}
/** THE IMAGE PREVIEW — the latest render hero (native <img>), the
 *  active set's thumbs beneath (the CURRENT run's gallery, or the
 *  picked history entry's full set — a multi-output card never shows
 *  the current row under an old hero), then THE OUTPUT HISTORY
 *  (stroke 40): the stage's previous unique outputs, newest first —
 *  click one to view it in the hero. Same chrome, same law. */
export function ImageStagePreview(props) {
    const { hero, rest, viewingHistory, note, picked, promote, returnToCurrent } = useHistoryHero(props);
    // THE LAYOUT-PRESERVING SWAP (the 2026-09-21 pull, frame-proven:
    // sh 800→490 for ONE frame at landing — the url-keyed img unmounted
    // before the new bitmap decoded, the seat collapsed 310px, the
    // scroller clamped 355→46, and the operator's position died). The
    // seat holds the LAST DECODED bitmap; the incoming hero rides
    // behind (absolute, invisible) until its onLoad commits it — the
    // seat NEVER has zero height across a generation swap, and a run
    // that clears the result keeps the previous image standing.
    const [loadedUrl, setLoadedUrl] = useState(null);
    const heroUrl = hero === undefined ? null : hero.url;
    const seatUrl = loadedUrl ?? heroUrl;
    const incoming = heroUrl !== null && seatUrl !== heroUrl ? heroUrl : null;
    return h('div', { className: cn(s.stagePreview), 'data-testid': 'stage-preview-image' }, viewingHistory ? h(StaleBadge, { note, onReturn: returnToCurrent }) : null, seatUrl !== null
        ? h('img', {
            className: s.heroImg, key: seatUrl, src: seatUrl, alt: hero === undefined ? '' : hero.name,
            'data-testid': 'stage-preview-image-hero',
            onLoad: () => { setLoadedUrl(seatUrl); },
        })
        : h(EmptyState, {
            variant: 'bare', className: s.empty, icon: h(Image, { className: s.emptyGlyph }),
            title: isLiveRunStatus(props.runStatus) ? 'rendering… the image lands here' : 'No render yet — run lands the image here',
        }), incoming !== null
        ? h('img', {
            key: 'incoming-' + incoming, className: s.heroIncoming, src: incoming, alt: '',
            'data-testid': 'stage-preview-image-hero', onLoad: () => { setLoadedUrl(incoming); },
        })
        : null, rest.length > 0
        ? h('div', { className: s.thumbRow }, rest.map((a, i) => h('img', {
            key: String(i) + '|' + a.url, className: s.thumb, src: a.url, alt: a.name, loading: 'lazy',
        })))
        : null, HistoryStrip(props, promote, 'stage-output-history', picked));
}
/** THE AUDIO PREVIEW — one hero track, one native player (the same
 *  law as the video preview: native <audio controls>; no library).
 *  The active set's named clips follow in the strip row. */
export function AudioStagePreview(props) {
    const { hero, rest, viewingHistory, note, picked, promote, returnToCurrent } = useHistoryHero(props);
    return h('div', { className: s.stagePreview, 'data-testid': 'stage-preview-audio' }, viewingHistory ? h(StaleBadge, { note, onReturn: returnToCurrent }) : null, hero === undefined
        ? h(EmptyState, {
            variant: 'bare', className: s.empty, icon: h(AudioLines, { className: s.emptyGlyph }),
            title: isLiveRunStatus(props.runStatus) ? 'rendering… the track lands here' : 'No render yet — run lands the track here',
        })
        : h('audio', {
            className: s.heroAudio, controls: true, key: hero.url,
            src: hero.url, 'data-testid': 'stage-preview-audio-hero',
        }), rest.length > 0
        ? h('div', { className: s.strip }, rest.map(seatSafeLink))
        : null, HistoryStrip(props, promote, 'stage-output-history', picked));
}
/** THE TEXT PREVIEW (the tagger stroke, 2026-10-24 — the operator's
 *  catch: "the output text isn't saving in media, nor is available
 *  in the card preview"): the hero artifact's WORDS, fetched and
 *  shown — a tagger's tags, a caption, a result row — with one COPY
 *  verb (the words are the product; a download link is not a
 *  preview). Same history law as every kind: the stale badge, the
 *  strip, the honest empty state. The rest set rides plain links
 *  (a second text file opens by name, like the audio seat). */
/** The text hero's copy verb — mounted ONLY beside a landed body
 *  (the mount-site ternary owns the null law, so the verb receives
 *  a narrowed string, never a guard). A host without the clipboard
 *  API (an insecure context) gets an inert verb, never a throw;
 *  the mount gate re-runs on hero swap, so the copied flag resets
 *  with the body it copied. */
function TextCopyButton(props) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        const clip = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
        if (clip === undefined)
            return;
        void clip.writeText(props.body).then(() => { setCopied(true); });
    };
    // THE CATALOG VERB (S7j, the chrome canon): a standalone action
    // verb rides the Button atom (the card-view bench-bar idiom, S6a:
    // outline + sm); testid and the accessible name ride the Button
    // rest channel; s.textCopy keeps only the layout placement.
    return h(Button, {
        variant: 'outline',
        size: 'sm',
        className: s.textCopy,
        onClick: copy,
        // the spread escape: ButtonHTMLAttributes has no data-* index
        ...({ 'data-testid': 'stage-preview-text-copy' }),
        'aria-label': chromeCopy.textCopyAria,
    }, copied ? 'copied ✓' : 'copy');
}
export function TextStagePreview(props) {
    const { hero, rest, viewingHistory, note, picked, promote, returnToCurrent } = useHistoryHero(props);
    const heroUrl = hero === undefined ? null : hero.url;
    // the body follows the HERO identity (url-keyed): a picked history
    // entry or a new run's landing refetches; an in-flight fetch from a
    // superseded hero never lands (the alive flag kills it on change)
    const [body, setBody] = useState(null);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        if (heroUrl === null) {
            setBody(null);
            setFailed(false);
            return;
        }
        let alive = true;
        setBody(null);
        setFailed(false);
        fetch(heroUrl)
            .then((r) => {
            if (!r.ok)
                throw new Error(String(r.status));
            return r.text();
        })
            .then((t) => { if (alive)
            setBody(t); })
            .catch(() => { if (alive)
            setFailed(true); });
        return () => { alive = false; };
    }, [heroUrl]);
    return h('div', { className: s.stagePreview, 'data-testid': 'stage-preview-text' }, viewingHistory ? h(StaleBadge, { note, onReturn: returnToCurrent }) : null, hero === undefined
        ? h(EmptyState, {
            variant: 'bare', className: s.empty, icon: h(Type, { className: s.emptyGlyph }),
            title: isLiveRunStatus(props.runStatus) ? 'rendering… the text lands here' : 'No render yet — run lands the text here',
        })
        : h('div', { className: s.textSeat }, body !== null
            ? h('pre', {
                className: s.textHero, key: hero.url,
                'data-testid': 'stage-preview-text-body',
            }, body)
            : failed
                ? h(EmptyState, {
                    variant: 'bare', className: s.empty, icon: h(Type, { className: s.emptyGlyph }),
                    ...{ 'data-testid': 'stage-preview-text-failed' },
                    title: `the text could not load — ${hero.name}`,
                })
                : h(EmptyState, {
                    variant: 'bare', className: s.empty, icon: h(Type, { className: s.emptyGlyph }),
                    ...{ 'data-testid': 'stage-preview-text-loading' },
                    title: 'loading…',
                }), body !== null
            ? h(TextCopyButton, { body })
            : null), rest.length > 0
        ? h('div', { className: s.strip }, rest.map(seatSafeLink))
        : null, HistoryStrip(props, promote, 'stage-output-history', picked));
}
/** THE MESH PREVIEW — the seam's adapter onto the raw-three
 *  multi-asset stage (GlbStagePreview, the substrate law: NO
 *  @react-three in any client bundle). The ACTIVE set becomes
 *  stage assets (the current run's, or a picked history entry's —
 *  mesh gains the full history law every other kind already had);
 *  the empty hint honors the live-run flag. THE LIVE FIGURE
 *  (stroke 90): a card-declared preview.figure replaces the empty
 *  tombstone with the native figure (the /poser bind mesh) — the
 *  studio-viewport capability on the form card; run outputs still
 *  take the stage the moment they exist. */
export function MeshStagePreview(props) {
    const { hero, rest, viewingHistory, note, picked, promote, returnToCurrent } = useHistoryHero(props);
    const active = hero === undefined ? [] : [hero, ...rest];
    return h('div', { className: s.stagePreview, 'data-testid': 'stage-preview-mesh' }, viewingHistory ? h(StaleBadge, { note, onReturn: returnToCurrent }) : null, active.length > 0
        ? h(GlbStagePreview, {
            assets: active.map((a, i) => ({ id: `${props.stageId}:${a.name || i}`, url: a.url, name: a.name })),
            emptyHint: isLiveRunStatus(props.runStatus) ? 'rendering… the mesh lands here' : 'No render yet — run lands the mesh here',
        })
        : props.figure !== undefined
            ? h(PoserFigureStage, {
                identityModel: props.figure.identityModel,
                identityCoeffs: props.figure.identityCoeffs,
                localChanges: props.figure.localChanges,
                framing: props.figure.framing,
                focalLength: props.figure.focalLength,
                label: `poser-figure:${props.stageId}`,
            })
            : h(GlbStagePreview, {
                assets: [],
                emptyHint: isLiveRunStatus(props.runStatus) ? 'rendering… the mesh lands here' : 'No render yet — run lands the mesh here',
            }), HistoryStrip(props, promote, 'stage-output-history', picked));
}
/** THE MESH PREVIEW — the raw-three multi-asset stage (the substrate
 *  law: NO @react-three in any client bundle). Reached through the
 *  `/client` door like every other seam in this row. */
export { GlbStagePreview, autoFitToHeight, applyWireframe, applyWeightsHeat, skeletonHelperFor, heatColor, slotLabelOf, turntableTick, TURNTABLE_SPEED } from "./glb-stage.js";
export { ReportView } from "./report-view.js";
export { PoserFigureStage, figureGeometry, figureCoeffsOf, figureLocalChangesOf, figureCameraOf, figureShapeSig } from "./poser-figure.js";
export { ViewportFrame, ViewportAnchor, ReferenceImageBadge } from "./viewportChrome.js";
//# sourceMappingURL=preview.js.map
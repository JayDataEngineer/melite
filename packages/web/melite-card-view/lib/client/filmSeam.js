/**
 * filmSeam.tsx — THE FORM CARD'S OPTIONAL TIMELINE SEAM (the
 * form-seams stroke, 2026-09-17): "form cards can have an optional
 * SEAM for a timeline that stretches along the bottom".
 *
 * The shell's three-slot shape puts the PREVIEW in the right slot
 * and the TIMELINE in the bottom slot — two different slots, one
 * logical face (the bar scrubs the player). The seam object is the
 * bridge: the player writes (handle + clock), the bar reads. A
 * plain observable box — no store, no context, the smallest honest
 * straddle: createFilmSeam() once per stage view (a lazy
 * useState initializer in the owner), FilmSeamPlayer into the
 * preview slot, FilmSeamBar into the shell's bottom slot when the
 * card CLAIMS the seam (the served spec's preview.timeline) AND a
 * film artifact exists.
 */
import { useCallback, useEffect, useState } from 'react';
import { createElement as h } from 'react';
import { FilmPlayer, TimelineScrubBar } from '@melite-plugin/timeline/ui/timeline';
import s from './filmSeam.module.css';
export function createFilmSeam(fps = 0) {
    const listeners = new Set();
    // THE LISTENER FAULT LAW (the client-store fold's guarantee, applied
    // here too): a subscriber that throws must not stop the others, and
    // must never break the write that notified it. The loops below ran
    // bare until the 1.6 verification found it — the catalog folds kept
    // this guard and the seam did not.
    const notify = () => {
        for (const fn of [...listeners]) {
            try {
                fn();
            }
            catch (e) {
                console.warn('[filmSeam] subscriber fault:', e);
            }
        }
    };
    const seam = {
        handle: null,
        current: 0,
        duration: 0,
        playing: false,
        fps,
        subscribe(fn) {
            listeners.add(fn);
            return () => { listeners.delete(fn); };
        },
        bind(handle) {
            seam.handle = handle;
            notify();
        },
        report(partial) {
            Object.assign(seam, partial);
            notify();
        },
    };
    return seam;
}
/** THE PREVIEW SLOT FACE — the shared player, wired to the seam.
 * Carries the FIT LAW (one law per estate — .hero's own): the
 * shared player renders a bare <video>; without the class a
 * 1344px film overflows a narrow pane sideways (the operator's
 * tall-screen catch, 2026-09-23). */
export function FilmSeamPlayer(props) {
    const { seam, src } = props;
    const onTime = useCallback((sec) => { seam.report({ current: sec }); }, [seam]);
    const onDuration = useCallback((sec) => { seam.report({ duration: sec }); }, [seam]);
    const onPlayingChange = useCallback((playing) => { seam.report({ playing }); }, [seam]);
    const ref = (handle) => { seam.bind(handle); };
    return h(FilmPlayer, {
        src,
        className: s.player,
        onTime,
        onDuration,
        onPlayingChange,
        ref,
        'data-testid': props['data-testid'] ?? 'film-seam-player',
    });
}
/** THE BOTTOM SLOT FACE — the shared scrub bar, reading the seam */
export function FilmSeamBar(props) {
    const { seam } = props;
    const [, force] = useState(0);
    useEffect(() => seam.subscribe(() => { force((n) => n + 1); }), [seam]);
    const onSeek = useCallback((sec) => {
        seam.handle?.seekTo(sec);
        // optimistic playhead (the 4Hz poll confirms; the drag never waits)
        seam.report({ current: sec });
    }, [seam]);
    const onTogglePlay = useCallback(() => { seam.handle?.toggle(); }, [seam]);
    return h(TimelineScrubBar, {
        current: seam.current,
        duration: seam.duration > 0 ? seam.duration : (seam.handle?.duration() ?? 0),
        onSeek,
        onTogglePlay,
        playing: seam.playing,
        fps: seam.fps > 0 ? seam.fps : undefined,
        'data-testid': props['data-testid'] ?? 'film-seam-bar',
    });
}
//# sourceMappingURL=filmSeam.js.map

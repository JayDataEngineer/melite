import { jsx as _jsx } from "react/jsx-runtime";
/**
 * FilmPlayer — ONE film, ONE native player (the timeline genre's
 * shared video surface, moved from h3-timeline's kit 2026-09-17:
 * the operator's generic-tools stroke — "other cards, like H3
 * Timeline (timeline bar at the bottom, video preview, dynamic
 * parameters on the left), share code"). The timeline-genre card
 * now composes from shared rails: StudioShell + CardForm
 * (@melite/card-base), MotionTimelineBar (this package), and THIS
 * player — the imperative seam the bar's playhead drives
 * (seekTo/current/duration/play/pause/toggle) with the
 * time/duration/playing reports. Time reports keep both sources
 * (the element's timeupdate clock + a 4Hz poll while playing) so a
 * silent event path never freezes the bar.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
export const FilmPlayer = forwardRef(function FilmPlayer({ src, onTime, onDuration, onPlayingChange, onEnded, muted, loop, autoPlay, poster, className, "data-testid": tid }, ref) {
    const videoRef = useRef(null);
    const pendingSeekRef = useRef(null);
    const seekRafRef = useRef(null);
    const seekTo = useCallback((sec) => {
        pendingSeekRef.current = sec;
        if (seekRafRef.current != null)
            return;
        seekRafRef.current = requestAnimationFrame(() => {
            seekRafRef.current = null;
            // (pendingSeek is always a number here: seekTo sets it before
            // scheduling and this callback is its only reader — the `as`
            // records the single-writer proof, no dead null arm.)
            const target = pendingSeekRef.current;
            pendingSeekRef.current = null;
            const el = videoRef.current;
            if (!el)
                return;
            const d = el.duration;
            const t = Math.max(0, Number.isFinite(d) && d > 0 ? Math.min(target, d) : target);
            el.currentTime = t;
        });
    }, []);
    useEffect(() => () => {
        if (seekRafRef.current != null)
            cancelAnimationFrame(seekRafRef.current);
    }, []);
    useImperativeHandle(ref, () => ({
        // (The handle is callable only while mounted — React nulls the
        // imperative ref on unmount — and the <video> always renders,
        // so videoRef is non-null here; `!` records that proof.)
        seekTo,
        current: () => videoRef.current.currentTime,
        duration: () => {
            const d = videoRef.current.duration;
            return Number.isFinite(d) ? d : 0;
        },
        // R-S11 (2026-10-22): play() returns a promise; `void`ing it left
        // a no-gesture autoplay-policy rejection unhandled. The catch is
        // the api.ts:14-17 policy exemption — browser-policy rejection,
        // not a backend failure.
        play: () => {
            videoRef.current?.play().catch(() => {
                /* autoplay policy, no gesture — not a backend failure */
            });
        },
        pause: () => void videoRef.current?.pause(),
        toggle: () => {
            const el = videoRef.current;
            if (el.paused) {
                el.play().catch(() => {
                    /* autoplay policy, no gesture — not a backend failure */
                });
            }
            else
                el.pause();
        },
    }), [seekTo]);
    const onTimeRef = useRef(onTime);
    onTimeRef.current = onTime;
    const handleTime = useCallback((t) => {
        onTimeRef.current?.(t);
    }, []);
    useEffect(() => {
        const id = window.setInterval(() => {
            // (The interval is cleared on unmount — videoRef is non-null on
            // every tick; `!` records that proof.)
            const el = videoRef.current;
            if (el.paused || el.ended)
                return;
            const t = el.currentTime;
            if (Number.isFinite(t) && t >= 0)
                onTimeRef.current?.(t);
        }, 250);
        return () => window.clearInterval(id);
    }, []);
    return (_jsx("video", { ref: videoRef, className: className, "data-testid": tid, src: src, muted: muted, loop: loop, autoPlay: autoPlay, playsInline: true, preload: "metadata", controls: true, poster: poster, onTimeUpdate: (e) => handleTime(e.currentTarget.currentTime), onPlay: () => onPlayingChange?.(true), onPause: () => onPlayingChange?.(false), onEnded: () => onEnded?.(), onLoadedMetadata: (e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0)
                onDuration?.(d);
        } }));
});
//# sourceMappingURL=FilmPlayer.js.map

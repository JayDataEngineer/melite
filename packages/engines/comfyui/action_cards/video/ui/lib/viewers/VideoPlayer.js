import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Custom video player — native <video> with a polished control overlay.
// Modeled after redshiftdb's VideoPlayer pattern.
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { ScrubInput } from '@melite/cards/form-fields';
import { Maximize, Minimize2, Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX, } from "@melite/card-base/client";
import styles from "./VideoPlayer.module.css";
function fmtTime(s) {
    if (!isFinite(s) || s < 0)
        return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
}
export function VideoPlayer({ src, className, autoPlay = false }) {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [current, setCurrent] = useState(0);
    const [duration, setDuration] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [ended, setEnded] = useState(false);
    const hideTimer = useRef(null);
    const pokeControls = useCallback(() => {
        setShowControls(true);
        if (hideTimer.current)
            clearTimeout(hideTimer.current);
        if (playing) {
            hideTimer.current = setTimeout(() => setShowControls(false), 2500);
        }
    }, [playing]);
    useEffect(() => {
        if (fullscreen)
            pokeControls();
    }, [fullscreen, pokeControls]);
    const onTimeUpdate = useCallback(() => {
        const v = videoRef.current;
        if (!v)
            return;
        setCurrent(v.currentTime);
        if (v.buffered.length > 0) {
            setBuffered(v.buffered.end(v.buffered.length - 1));
        }
    }, []);
    const togglePlay = useCallback(() => {
        const v = videoRef.current;
        if (!v)
            return;
        if (v.paused) {
            v.play().catch(() => { });
            setEnded(false);
        }
        else {
            v.pause();
        }
    }, []);
    const seek = useCallback((t) => {
        const v = videoRef.current;
        if (!v || !Number.isFinite(t) || t < 0)
            return;
        const maxTime = Number.isFinite(duration) && duration > 0 ? duration : v.duration;
        if (!Number.isFinite(maxTime) || maxTime <= 0)
            return;
        v.currentTime = Math.min(t, maxTime);
    }, [duration]);
    const skip = useCallback((delta) => {
        const v = videoRef.current;
        if (!v)
            return;
        seek(v.currentTime + delta);
    }, [seek]);
    const toggleMute = useCallback(() => {
        const v = videoRef.current;
        if (!v)
            return;
        v.muted = !v.muted;
    }, []);
    const toggleFullscreen = useCallback(() => {
        const el = containerRef.current;
        if (!el)
            return;
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => { });
        }
        else {
            el.requestFullscreen().catch(() => { });
        }
    }, []);
    useEffect(() => {
        const onFsChange = () => setFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", onFsChange);
        return () => document.removeEventListener("fullscreenchange", onFsChange);
    }, []);
    useEffect(() => {
        const el = containerRef.current;
        if (!el)
            return;
        const onKey = (e) => {
            if (e.key === " " || e.key === "k") {
                e.preventDefault();
                togglePlay();
            }
            else if (e.key === "ArrowLeft") {
                e.preventDefault();
                skip(-5);
            }
            else if (e.key === "ArrowRight") {
                e.preventDefault();
                skip(5);
            }
            else if (e.key === "f") {
                e.preventDefault();
                toggleFullscreen();
            }
            else if (e.key === "m") {
                e.preventDefault();
                toggleMute();
            }
        };
        el.addEventListener("keydown", onKey);
        return () => el.removeEventListener("keydown", onKey);
    }, [togglePlay, skip, toggleFullscreen, toggleMute]);
    useEffect(() => {
        if (playing)
            pokeControls();
        else
            setShowControls(true);
    }, [playing, pokeControls]);
    const pct = duration > 0 ? (current / duration) * 100 : 0;
    const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;
    return (_jsxs("div", { ref: containerRef, tabIndex: 0, className: `${styles.root} ${fullscreen ? styles.rootFullscreen : styles.rootWindowed} ${className ?? ""}`, onMouseMove: pokeControls, onMouseLeave: () => playing && setShowControls(false), style: { cursor: showControls ? "default" : "none" }, children: [_jsx("video", { ref: videoRef, src: src, crossOrigin: "anonymous", playsInline: true, autoPlay: autoPlay, className: fullscreen ? styles.videoFullscreen : styles.videoWindowed, style: fullscreen ? undefined : { aspectRatio: "16 / 9", maxHeight: "78vh" }, onClick: togglePlay, onPlay: () => { setPlaying(true); setEnded(false); }, onPause: () => setPlaying(false), onTimeUpdate: onTimeUpdate, onLoadedMetadata: (e) => {
                    const d = e.currentTarget.duration;
                    if (Number.isFinite(d) && d > 0)
                        setDuration(d);
                }, onDurationChange: (e) => {
                    const d = e.currentTarget.duration;
                    if (Number.isFinite(d) && d > 0)
                        setDuration(d);
                }, onEnded: () => { setEnded(true); setPlaying(false); }, onVolumeChange: (e) => { setVolume(e.currentTarget.volume); setMuted(e.currentTarget.muted); } }), !playing && (_jsx(Button, { variant: "ghost", onClick: togglePlay, className: styles.centerPlay, "aria-label": ended ? "Replay" : "Play", children: _jsx("span", { className: styles.centerPlayDisc, children: ended
                        ? _jsx(RotateCcw, { className: styles.centerIcon })
                        : _jsx(Play, { className: `${styles.centerIcon} ${styles.centerIconFill} ${styles.centerIconNudge}` }) }) })), _jsxs("div", { className: `${styles.controlBar} ${showControls ? styles.controlBarShown : styles.controlBarHidden}`, children: [_jsxs("div", { className: styles.seekBar, onClick: (e) => {
                            if (!Number.isFinite(duration) || duration <= 0)
                                return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            const ratio = (e.clientX - rect.left) / rect.width;
                            seek(ratio * duration);
                        }, children: [_jsx("div", { className: styles.seekTrack }), _jsx("div", { className: styles.seekBuffered, style: { width: `${bufferedPct}%` } }), _jsx("div", { className: styles.seekPlayed, style: { width: `${pct}%` } }), _jsx("div", { className: styles.seekKnob, style: { left: `calc(${pct}% - 7px)` } })] }), _jsxs("div", { className: styles.buttonsRow, children: [_jsx(Button, { variant: "ghost", onClick: togglePlay, className: styles.transportBtn, "aria-label": playing ? "Pause" : "Play", children: playing ? _jsx(Pause, { className: styles.transportIcon }) : _jsx(Play, { className: styles.transportIcon }) }), _jsx(Button, { variant: "ghost", onClick: () => skip(-10), className: styles.transportBtn, "aria-label": "Back 10 seconds", children: _jsx(RotateCcw, { className: styles.transportIconSm }) }), _jsx(Button, { variant: "ghost", onClick: () => skip(10), className: styles.transportBtn, "aria-label": "Forward 10 seconds", children: _jsx(RotateCw, { className: styles.transportIconSm }) }), _jsxs("div", { className: styles.volumeWrap, children: [_jsx(Button, { variant: "ghost", onClick: toggleMute, className: styles.transportBtn, children: muted || volume === 0 ? _jsx(VolumeX, { className: styles.transportIconSm }) : _jsx(Volume2, { className: styles.transportIconSm }) }), _jsx(ScrubInput, { min: 0, max: 1, step: 0.05, value: muted ? 0 : volume, onChange: (e) => {
                                            const v = parseFloat(e.target.value);
                                            const vid = videoRef.current;
                                            if (vid) {
                                                vid.volume = v;
                                                vid.muted = v === 0;
                                            }
                                        }, className: styles.volumeSlider })] }), _jsxs("span", { className: styles.timeLabel, children: [fmtTime(current), " / ", fmtTime(duration)] }), _jsx("div", { className: styles.spacer }), _jsx(Button, { variant: "ghost", onClick: toggleFullscreen, className: styles.transportBtn, children: fullscreen ? _jsx(Minimize2, { className: styles.transportIconSm }) : _jsx(Maximize, { className: styles.transportIconSm }) })] })] })] }));
}
//# sourceMappingURL=VideoPlayer.js.map

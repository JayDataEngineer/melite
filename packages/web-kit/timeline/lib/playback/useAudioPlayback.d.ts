export declare function useAudioPlayback(): {
    play: () => void;
    pause: () => void;
    seek: (time: number) => void;
};
/**
 * E2.4: Schedule linear gain ramps on an {@link AudioParam} to mirror the
 * renderer's `afade=t=in|out` filter chain. Public for unit testing with a
 * mock AudioContext.
 *
 * Automation regions (in the cue's own clock, where 0 = cue start):
 *   - Fade-in:  [0, fadeIn]              gain: 0      → volume
 *   - Steady:   [fadeIn, dur - fadeOut]  gain: volume
 *   - Fade-out: [dur - fadeOut, dur]     gain: volume → 0
 *
 * When playback begins at `offset` into the cue, source-clock time 0 is
 * `offset` in the cue's clock. We translate each region accordingly and
 * skip any portion that is already in the past.
 *
 * Clamps `fadeIn`/`fadeOut` to `dur / 2` (matches `_build_audio_filter`
 * in `render_service.py`). With no fades, the param is left at `volume`.
 */
export declare function scheduleFadeAutomation(param: AudioParam, volume: number, cueDuration: number, fadeInRaw: number, fadeOutRaw: number, offset: number, now: number): void;
//# sourceMappingURL=useAudioPlayback.d.ts.map
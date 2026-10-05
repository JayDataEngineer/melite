import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import styles from "./AudioWaveform.module.css";
export function AudioWaveform({ audioUrl, height = 60, color = "#3b82f6", className }) {
    const containerRef = useRef(null);
    const wavesurferRef = useRef(null);
    useEffect(() => {
        if (!containerRef.current || !audioUrl)
            return;
        const loadWaveSurfer = async () => {
            try {
                const WaveSurfer = (await import("wavesurfer.js")).default;
                const ws = WaveSurfer.create({
                    container: containerRef.current,
                    height,
                    waveColor: color,
                    progressColor: color,
                    cursorColor: "#ffffff",
                    barWidth: 2,
                    barGap: 1,
                    barRadius: 2,
                    normalize: true,
                    autoplay: false,
                    interact: true,
                });
                ws.load(audioUrl).catch((err) => {
                    // Unreachable / undecodable audio (server URL down, e2e env with
                    // no backend) must degrade gracefully — an uncaught rejection
                    // here leaks out of the component and trips the vitest
                    // unhandled-error gate. The tile just stays an empty waveform.
                    console.warn("AudioWaveform: failed to load", audioUrl, err);
                });
                wavesurferRef.current = ws;
                return () => {
                    ws.destroy();
                };
            }
            catch (error) {
                console.error("Failed to load WaveSurfer:", error);
            }
        };
        const cleanup = loadWaveSurfer();
        return () => {
            cleanup?.then((fn) => fn?.());
        };
    }, [audioUrl, height, color]);
    return (_jsx("div", { ref: containerRef, className: className ? `${styles.cell} ${className}` : styles.cell }));
}
//# sourceMappingURL=AudioWaveform.js.map

/**
 * E3.8 — Client-side video frame extraction.
 *
 * Extracts a single frame from a video at a given timestamp by seeking
 * a hidden <video> element and drawing it to a <canvas>. Returns a PNG
 * data URL, or null if extraction fails (best-effort — the caller
 * continues without a first-frame anchor rather than blocking).
 *
 * Used by the SmartSplit flow to grab the opening frame of each detected
 * scene and set it as the segment's firstFrameB64 anchor.
 */
/**
 * Extract a frame from `videoUrl` at `timeSeconds`.
 * @returns PNG data URL, or null on any failure.
 */
export async function extractVideoFrame(videoUrl, timeSeconds) {
    return new Promise((resolve) => {
        if (!videoUrl || timeSeconds < 0) {
            resolve(null);
            return;
        }
        const video = document.createElement('video');
        video.src = videoUrl;
        video.crossOrigin = 'anonymous';
        video.muted = true;
        video.preload = 'auto';
        video.playsInline = true;
        let settled = false;
        const cleanup = () => {
            video.removeAttribute('src');
            try {
                video.load();
            }
            catch { /* noop */ }
        };
        const done = (result) => {
            if (settled)
                return;
            settled = true;
            cleanup();
            resolve(result);
        };
        // Timeout — if the video can't seek in 5s, give up.
        const timer = setTimeout(() => done(null), 5000);
        video.onloadedmetadata = () => {
            // Clamp the seek time to the video duration.
            const t = Math.min(timeSeconds, Math.max(0, (video.duration || timeSeconds) - 0.05));
            try {
                video.currentTime = t;
            }
            catch {
                // Browser API: currentTime setter throws if the media isn't seekable
                // yet (e.g. blob not fully loaded). Same policy exemption as play()/
                // fullscreen — browser-API rejection, not a backend failure.
                clearTimeout(timer);
                done(null);
            }
        };
        video.onseeked = () => {
            clearTimeout(timer);
            try {
                const canvas = document.createElement('canvas');
                // Cap the extraction resolution to keep data URLs manageable.
                // The generation model snaps to VAE factors anyway, so a 512px
                // long edge is plenty for a first-frame anchor.
                const maxDim = 512;
                const vw = video.videoWidth || 640;
                const vh = video.videoHeight || 480;
                const scale = Math.min(1, maxDim / Math.max(vw, vh));
                canvas.width = Math.round(vw * scale);
                canvas.height = Math.round(vh * scale);
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    done(null);
                    return;
                }
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/png');
                done(dataUrl || null);
            }
            catch (e) {
                // NO SILENT SWALLOW — canvas drawing can fail on tainted cross-origin
                // media or if the video element is in an invalid state. Log so we know
                // when frame extraction is silently falling back to null.
                console.error('[extract-video-frame] canvas draw/toDataURL failed:', e);
                done(null);
            }
        };
        video.onerror = () => {
            clearTimeout(timer);
            done(null);
        };
    });
}
/**
 * Extract the opening frame for each scene in parallel (bounded — at most
 * `concurrency` extractions in flight at once). Returns an array aligned
 * with the input `times` (null where extraction failed).
 */
export async function extractFramesBatch(videoUrl, times, concurrency = 3) {
    const results = new Array(times.length).fill(null);
    let next = 0;
    const workers = Array.from({ length: Math.min(concurrency, times.length) }, async () => {
        while (true) {
            const idx = next++;
            if (idx >= times.length)
                break;
            results[idx] = await extractVideoFrame(videoUrl, times[idx]);
        }
    });
    await Promise.all(workers);
    return results;
}
//# sourceMappingURL=extractVideoFrame.js.map

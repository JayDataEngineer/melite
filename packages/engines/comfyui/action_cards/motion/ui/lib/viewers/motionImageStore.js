/**
 * motionImageStore — THE motion render-snapshot cache.
 *
 * A motion asset is an NPZ, not an image: every surface that wants a picture
 * of one renders a frame off-screen, keeps the JPEG data URL, and serves the
 * cached copy on every later visit instead of re-rendering. Two surfaces share
 * that mechanic and this one record: the Media sidebar tile (keyed by asset
 * URL, through poster-shell's usePosterDataUrl) and the motion card's
 * collapsed tile (keyed by stage id).
 *
 * The record persists best-effort to localStorage under one key. The persisted
 * value is user-writable and therefore validated on load: anything that is not
 * a plain record starts fresh (the render that fills it is cheap and
 * self-healing). A write failure (quota, private mode) leaves the in-memory
 * record serving for the session.
 */
import { createClientStore } from "@melite/catalog/clientStore";
const STORAGE_KEY = "motion-images";
function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw)
            return {};
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return parsed;
        }
    }
    catch {
        // Corrupt JSON — start fresh.
    }
    return {};
}
function persist(images) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
    }
    catch {
        // Quota error — non-fatal; the in-memory record still serves this session.
    }
}
export const useMotionImageStore = createClientStore((set, get) => ({
    images: load(),
    setImage: (key, dataUrl) => {
        const images = { ...get().images, [key]: dataUrl };
        persist(images);
        set({ images });
    },
    clearImage: (key) => {
        if (!(key in get().images))
            return;
        const images = { ...get().images };
        delete images[key];
        persist(images);
        set({ images });
    },
}));
//# sourceMappingURL=motionImageStore.js.map

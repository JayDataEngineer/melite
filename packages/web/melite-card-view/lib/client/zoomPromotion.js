export const ZOOM_OVERLAY_SELECTOR = "[data-card-zoom-overlay]";
export const PREVIEW_DIALOG_SELECTOR = "[data-asset-preview-dialog]";
/** Close-start marker, queried two ways: document-wide (the full path,
 * for debuggers) and per overlay root (the bare marker -- querySelector only
 * searches DESCENDANTS, so the root query must not name the root itself). */
export const ZOOM_CLOSING_SELECTOR = "[data-card-zoom-overlay] [data-card-closing]";
const CLOSING_ATTR = "data-card-closing";
const ROOT_CLOSING_SELECTOR = "[" + CLOSING_ATTR + "]";
export const GRID_PIN_SELECTOR = "[data-grid-pin]";
const GLIDE_MS = 300;
const GLIDE_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const DEFAULT_SELECTORS = [ZOOM_OVERLAY_SELECTOR];
const Z_INDEX = "2147483000";
const BG = "var(--dsw-alias-bg-base, #17171c)";
export const FULLSCREEN_CLASS = "melite-zoom-fullscreen";
const CLEARABLE = ["position", "inset", "width", "height", "zIndex", "background"];
export function createZoomPromotion(frame, deps) {
    let zoomOpen = false;
    let stopped = false;
    let timer;
    let observer = null;
    let restBox = null;
    let glide = null;
    const selectors = deps.overlaySelectors ?? DEFAULT_SELECTORS;
    const fitEnabled = deps.fitHeight ?? true;
    const slabBackground = deps.background ?? BG;
    const docOf = () => frame.contentDocument;
    const overlayRoots = () => {
        const doc = docOf();
        if (doc === null)
            return [];
        const out = [];
        for (const sel of selectors) {
            try {
                // querySelectorAll is the union path (drilldown + lightbox roots).
                // Minimal docs (and the oldest fakes) only offer querySelector --
                // degrade to single-root semantics rather than wedging.
                const all = doc.querySelectorAll;
                if (typeof all === "function") {
                    ;
                    all.call(doc, sel)
                        .forEach((el) => out.push(el));
                }
                else {
                    const one = doc.querySelector(sel);
                    if (one != null)
                        out.push(one);
                }
            }
            catch { /* a bad selector must never wedge the machine */ }
        }
        return out;
    };
    const overlayOpen = () => overlayRoots().length > 0;
    const closeGlideWanted = () => {
        const doc = docOf();
        if (doc === null)
            return false;
        const roots = overlayRoots();
        if (roots.length === 0)
            return false;
        return roots.every((root) => {
            try {
                return root.querySelector(ROOT_CLOSING_SELECTOR) != null;
            }
            catch {
                return false;
            }
        });
    };
    const gridNode = () => {
        const doc = docOf();
        if (doc === null)
            return null;
        try {
            return doc.querySelector(GRID_PIN_SELECTOR) ?? null;
        }
        catch {
            return null;
        }
    };
    const pinGrid = () => {
        if (restBox === null)
            return;
        const grid = gridNode();
        if (grid === null)
            return;
        try {
            grid.style.maxWidth = restBox.width + "px";
        }
        catch { /* a hostile node must never wedge the machine */ }
    };
    const unpinGrid = () => {
        const grid = gridNode();
        if (grid === null)
            return;
        try {
            grid.style.maxWidth = "";
        }
        catch { /* a dead grid must never wedge the machine (row 28 — cf. L142/179/205) */ }
    };
    const fit = () => {
        if (stopped || !fitEnabled)
            return;
        const doc = docOf();
        if (doc === null || doc.documentElement === null)
            return;
        const h = Math.max(doc.documentElement.scrollHeight ?? 0, doc.body?.scrollHeight ?? 0);
        if (h > 0 && frame.style.position !== "fixed")
            frame.style.height = h + "px";
    };
    const cancelGlide = () => {
        if (glide === null)
            return;
        try {
            glide.cancel();
        }
        catch { /* a dead animation must never wedge the machine */ }
        glide = null;
    };
    const applyZoom = (open) => {
        if (stopped || open === zoomOpen)
            return false;
        zoomOpen = open;
        if (open) {
            try {
                const r = frame.getBoundingClientRect?.();
                restBox = r ? { left: r.left, top: r.top, width: r.width, height: r.height } : null;
            }
            catch {
                restBox = null;
            }
            frame.classList.add(FULLSCREEN_CLASS);
            frame.style.position = "fixed";
            frame.style.inset = "0";
            frame.style.width = "100vw";
            frame.style.height = "100vh";
            frame.style.zIndex = Z_INDEX;
            frame.style.background = slabBackground;
            pinGrid();
        }
        else {
            cancelGlide();
            frame.classList.remove(FULLSCREEN_CLASS);
            for (const k of CLEARABLE)
                frame.style[k] = "";
            frame.style.transform = "";
            frame.style.clipPath = "";
            unpinGrid();
            fit();
        }
        return true;
    };
    const maybeGlide = () => {
        if (stopped || glide !== null || frame.animate === undefined)
            return;
        if (!closeGlideWanted())
            return;
        let from = null;
        try {
            const r = frame.getBoundingClientRect?.();
            from = r ? { left: r.left, top: r.top, width: r.width, height: r.height } : null;
        }
        catch {
            from = null;
        }
        const to = restBox;
        if (from === null || to === null)
            return;
        const dx = to.left - from.left;
        const dy = to.top - from.top;
        const dw = from.width - to.width;
        const dh = from.height - to.height;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(dw) < 1 && Math.abs(dh) < 1)
            return;
        const endClip = "inset(0px " + Math.max(0, dw) + "px " + Math.max(0, dh) + "px 0px)";
        try {
            glide = frame.animate([
                { transform: "translate(0px, 0px)", clipPath: "inset(0px 0px 0px 0px)" },
                { transform: "translate(" + dx + "px, " + dy + "px)", clipPath: endClip },
            ], { duration: GLIDE_MS, easing: GLIDE_EASE, fill: "forwards" });
        }
        catch {
            glide = null;
        }
    };
    const syncZoom = () => {
        if (stopped)
            return;
        const open = overlayOpen();
        if (applyZoom(open))
            return;
        if (open)
            maybeGlide();
    };
    const tick = () => {
        if (stopped)
            return;
        syncZoom();
        if (zoomOpen)
            return;
        fit();
    };
    const arm = () => {
        if (stopped)
            return;
        const doc = docOf();
        if (doc === null)
            return;
        applyZoom(false);
        deps.onDocReady?.(doc);
        if (timer === undefined)
            timer = deps.setInterval(tick, deps.intervalMs);
        observer?.disconnect();
        observer = new deps.MutationObserverCtor(() => {
            if (stopped)
                return;
            syncZoom();
        });
        observer.observe(doc, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: [CLOSING_ATTR],
        });
        tick();
    };
    return {
        attach() {
            frame.addEventListener("load", arm);
            if (frame.contentDocument?.readyState === "complete")
                arm();
        },
        detach() {
            stopped = true;
            frame.removeEventListener("load", arm);
            if (timer !== undefined)
                deps.clearInterval(timer);
            timer = undefined;
            observer?.disconnect();
            observer = null;
            cancelGlide();
            frame.classList.remove(FULLSCREEN_CLASS);
            for (const k of CLEARABLE)
                frame.style[k] = "";
            frame.style.transform = "";
            frame.style.clipPath = "";
            unpinGrid();
        },
        sync: syncZoom,
        tick,
        load: arm,
        isZoomOpen: () => zoomOpen,
    };
}
//# sourceMappingURL=zoomPromotion.js.map

export interface PromotableFrameStyle {
    position: string;
    inset: string;
    width: string;
    height: string;
    zIndex: string;
    background: string;
    transform: string;
    clipPath: string;
}
export interface PromotableGridNode {
    style: {
        maxWidth: string;
    };
}
export interface PromotableFrame {
    contentDocument: Document | null;
    classList: {
        add(c: string): void;
        remove(c: string): void;
    };
    style: PromotableFrameStyle;
    getBoundingClientRect?: () => {
        left: number;
        top: number;
        width: number;
        height: number;
    };
    animate?: (keyframes: Record<string, string>[], options: {
        duration: number;
        easing: string;
        fill: FillMode;
    }) => {
        cancel(): void;
    };
}
export interface ZoomPromotionDeps {
    intervalMs: number;
    setInterval: (fn: () => void, ms: number) => number;
    clearInterval: (id: number) => void;
    MutationObserverCtor: new (cb: () => void) => {
        observe(t: unknown, o: unknown): void;
        disconnect(): void;
    };
    onDocReady?: (doc: Document) => void;
    overlaySelectors?: readonly string[];
    fitHeight?: boolean;
    background?: string;
}
export interface ZoomPromotion {
    attach(): void;
    detach(): void;
    sync(): void;
    tick(): void;
    load(): void;
    isZoomOpen(): boolean;
}
export declare const ZOOM_OVERLAY_SELECTOR = "[data-card-zoom-overlay]";
export declare const PREVIEW_DIALOG_SELECTOR = "[data-asset-preview-dialog]";
/** Close-start marker, queried two ways: document-wide (the full path,
 * for debuggers) and per overlay root (the bare marker -- querySelector only
 * searches DESCENDANTS, so the root query must not name the root itself). */
export declare const ZOOM_CLOSING_SELECTOR = "[data-card-zoom-overlay] [data-card-closing]";
export declare const GRID_PIN_SELECTOR = "[data-grid-pin]";
export declare const FULLSCREEN_CLASS = "melite-zoom-fullscreen";
export declare function createZoomPromotion(frame: PromotableFrame & {
    addEventListener(type: string, fn: () => void): void;
    removeEventListener(type: string, fn: () => void): void;
}, deps: ZoomPromotionDeps): ZoomPromotion;
//# sourceMappingURL=zoomPromotion.d.ts.map

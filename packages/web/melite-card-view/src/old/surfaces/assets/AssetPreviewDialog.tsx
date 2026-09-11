// Full-screen media lightbox — borderless overlay, click-to-zoom with pan.
//
// Derived from the run protocol: the archive is fetched fresh on mount via
// listMedia() (an asset is a 1-level flow — the store is gone), and
// prev/next navigates within the selected asset's category.
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Copy,
  Check,
  Search,
} from "lucide-react";
import type { MediaAsset } from "../library/media";
import { listMedia } from "../library/media";
import { useMediaVersion } from "../library/mediaVersion";
import { copyText } from "@melite/ui";
import { AssetMedia } from "./AssetMedia"
import { isImageAsset } from "./AssetMedia.utils";
import { readWorkflowFromPng } from "@melite/formats";
import { Tip } from "@melite/ui/tip";

function readWorkflow(url: string): Record<string, unknown> | null {
  if (!url.startsWith("data:image/png")) return null;
  const parsed = readWorkflowFromPng(url);
  return parsed && typeof parsed === "object"
    ? (parsed as Record<string, unknown>)
    : null;
}

const ZOOM_MIN = 1;
const ZOOM_MAX = 5;
/** Multiplicative zoom step per wheel notch (finer than the keyboard's ±1). */
const WHEEL_ZOOM_FACTOR = 1.2;
/** A wheel delta of ≥ this many px is a discrete mouse notch (fixed ×1.2);
 * smaller deltas are trackpad pinches, which zoom delta-proportionally so a
 * pinch gesture glides instead of lurching ×1.2 per event. */
const WHEEL_NOTCH_MIN = 50;
/** Sensitivity for delta-proportional (trackpad pinch) zoom: px → exponent. */
const WHEEL_PINCH_SENSITIVITY = 0.01;
/** Easing for zoom/pan retargets (ease-out-quint-ish). While a drag is
 * active the transition is NONE — a transition during a drag makes the
 * image lag behind the cursor (the classic "laggy pan" jank). */
const VIEW_EASE = "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)";
/** The minimap viewport rectangle follows the same easing (as percentages). */
const RECT_EASE = [
  "left",
  "top",
  "width",
  "height",
]
  .map((p) => `${p} 220ms cubic-bezier(0.22, 1, 0.36, 1)`)
  .join(", ");
const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

export function AssetPreviewDialog({
  asset,
  onClose,
  onSelect,
  onOpenStretchy,
  onSendToKimodo,
  onSendToSomax,
  navList,
}: {
  asset: MediaAsset | null;
  onClose: () => void;
  onSelect: (a: MediaAsset) => void;
  onOpenStretchy?: (a: MediaAsset) => void;
  onSendToKimodo?: (a: MediaAsset) => void;
  onSendToSomax?: (a: MediaAsset) => void;
  /** Explicit navigation list override (e.g. the flow card outputs).
  * When provided the archive is NOT fetched — the arrows navigate exactly
  * this ordered list instead of the same-category bucket. */
  navList?: MediaAsset[] | null;
}) {
  // The archive is the run protocol — fetched fresh whenever the dialog opens
  // (it's mounted conditionally). No shared store to keep in sync. Skipped
  // when a navList is supplied: the caller owns the navigation order.
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const mediaVersion = useMediaVersion((s) => s.version);
  useEffect(() => {
    if (navList) return;
    listMedia()
      .then(setMedia)
      .catch(() => setMedia([]));
  }, [mediaVersion, navList]);
  
  /* ── navigation ────────────────────────────────────────────────── */
  const cat = asset?.category;
  const list = useMemo(
    () => navList ?? (cat ? media.filter((a) => a.category === cat) : media),
    [navList, media, cat],
  );
  const [idx, setIdx] = useState(-1);
  
  useEffect(() => {
    if (asset) setIdx(list.findIndex((a) => a.id === asset.id));
  }, [asset, list]);
  
  const hasPrev = idx > 0;
  const hasNext = idx >= 0 && idx < list.length - 1;
  
  /* ── zoom / pan ────────────────────────────────────────────────── */
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<{ x: number; y: number } | null>(
    null,
  );
  const canZoom = !!asset && isImageAsset(asset);
  const imgContainerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const didDragRef = useRef(false);
  const isZoomed = zoom > 1;

  /* ── magnifier (minimap navigator) + image dimensions ────────────── */
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [showNav, setShowNav] = useState(false);
  const [navDragging, setNavDragging] = useState(false);
  const navThumbRef = useRef<HTMLDivElement>(null);
  
  // Mirrors of the zoom/pan/canZoom state for the (stable) native wheel
  // listener — reading these avoids re-binding the listener on every pan
  // tick, which would thrash addEventListener/removeEventListener during a
  // single drag/scroll gesture.
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const panRef = useRef(pan);
  panRef.current = pan;
  const canZoomRef = useRef(canZoom);
  canZoomRef.current = canZoom;
  
  const resetZoom = useCallback(() => {
    setZoom(1);
            setPan({ x: 0, y: 0 });
  }, []);
  
  /** Clamp the pan so the zoomed image can NEVER be scrolled/dragged past
  * the container edges — the pan is bounded to the visible overflow on
  * each axis. Without this the wheel/drag pan is unbounded and the user
  * can scroll into empty space above/beside the image ("infinite scroll").
  * `z` is the zoom the clamp should reflect (the new target for
  * zoomToPoint; the current zoom elsewhere). */
  const clampPanFor = useCallback(
    (x: number, y: number, z: number): { x: number; y: number } => {
    const el = imgContainerRef.current;
      const img = imgRef.current;
      if (!el || !img) return { x, y };
      const cRect = el.getBoundingClientRect();
      // offsetWidth/Height are the image's PRE-transform layout size; scaled
      // by z they're the on-screen size. The image is centered in the
      // container (flex items-center justify-center), so the maximum pan in
      // each axis is half the amount the scaled image overflows the container.
      const scaledW = img.offsetWidth * z;
      const scaledH = img.offsetHeight * z;
      const maxX = Math.max(0, (scaledW - cRect.width) / 2);
      const maxY = Math.max(0, (scaledH - cRect.height) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, x)),
        y: Math.min(maxY, Math.max(-maxY, y)),
  };
    },
    [],
  );
  
  /** Zoom to a target level, keeping the screen-space point under (sx, sy)
  * PINNED under it — the pixel under the cursor stays under the cursor.
  *
  * Math: the transform maps an image point q (offset from the image center)
  * to screen offset q·z + pan. Holding the cursor's image point q fixed
  * while z changes gives pan' = off − q·z', with q = (off − pan)/z captured
  * BEFORE the change.
  *
  * The 2026-08-16 fix: the old code set pan = −cursorOffset, which moves the
  * cursor's pixel TOWARD the image center on every notch (it only coincides
  * with the correct pan at exactly z = 2). Combined with the per-notch
  * ×1.2 jump that was the "odd and janky" wheel zoom. */
  const zoomToPoint = useCallback(
    (target: number, sx: number, sy: number) => {
    const el = imgContainerRef.current;
      if (!el) {
      setZoom(target);
        return;
}
      const rect = el.getBoundingClientRect();
      // Cursor offset from the container center.
      const offX = sx - rect.left - rect.width / 2;
      const offY = sy - rect.top - rect.height / 2;
      const z0 = zoomRef.current;
      const p0 = panRef.current;
      // The image point currently under the cursor.
      const q = { x: (offX - p0.x) / z0, y: (offY - p0.y) / z0 };
      setZoom(target);
      setPan(clampPanFor(offX - q.x * target, offY - q.y * target, target));
    },
    [clampPanFor],
  );
  
  const navigate = useCallback(
    (dir: number) => {
      const next = idx + dir;
      if (next >= 0 && next < list.length) {
        resetZoom();
        onSelect(list[next]);
}
    },
    [idx, list, onSelect, resetZoom],
  );
  
  /* ── copy workflow ─────────────────────────────────────────────── */
  const [copiedWf, setCopiedWf] = useState(false);
  const hasWf = !!asset && isImageAsset(asset) && !!readWorkflow(asset.url);
  const copyWorkflow = useCallback(() => {
    if (!asset) return;
    const wf = readWorkflow(asset.url);
    if (!wf) return;
    // copyText falls back to execCommand on plain-HTTP origins (Tailscale/
    // LAN), where navigator.clipboard is undefined. Before 2026-08-18 this
    // fire-and-forget write FAILED silently there AND still flipped the
    // copied-state check — a lie. Now the check only shows on real success.
    void copyText(JSON.stringify(wf, null, 2)).then((ok) => {
      if (!ok) {
        console.error("[AssetPreviewDialog] copy workflow failed — clipboard unavailable");
        return;
      }
      setCopiedWf(true);
      setTimeout(() => setCopiedWf(false), 1500);
    });
  }, [asset]);
  
  /* ── keyboard ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (!asset) return;
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          if (isZoomed) resetZoom();
          else onClose();
          break;
        case "ArrowLeft":
          navigate(-1);
          break;
        case "ArrowRight":
          navigate(1);
          break;
        case "+":
        case "=":
          if (canZoom) setZoom((z) => Math.min(ZOOM_MAX, z + 1));
          break;
        case "-":
        case "_":
          if (canZoom) {
            setZoom((z) => Math.max(ZOOM_MIN, z - 1));
            setPan({ x: 0, y: 0 });
}
          break;
}
  };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [asset, isZoomed, navigate, onClose, resetZoom, canZoom]);
  
  // Reset zoom + dims on asset change (the img is keyed by asset.id, so the
  // new element mounts without a transition — no glitchy zoom-out animation
  // on prev/next navigation).
  useEffect(() => {
        resetZoom();
        setDims(null);
  }, [asset?.id]);
  
  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
  };
  }, []);
  
  /* ── mouse drag for pan ─────────────────────────────────────────── */
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isZoomed) return;
    didDragRef.current = false;
    setDragging({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    didDragRef.current = true;
    setPan(clampPanFor(e.clientX - dragging.x, e.clientY - dragging.y, zoom));
  };
  const handleMouseUp = () => setDragging(null);
  
  /* ── click to zoom ─────────────────────────────────────────────── */
  const handleImageClick = useCallback(
    (e: React.MouseEvent) => {
      if (!canZoom || didDragRef.current) return;
      if (isZoomed) {
        resetZoom();
      } else {
        zoomToPoint(2, e.clientX, e.clientY);
}
    },
    [canZoom, isZoomed, resetZoom, zoomToPoint],
  );
  
  /* ── scroll wheel: Ctrl+wheel zooms to cursor; plain wheel pans when zoomed ─
  * React attaches `onWheel` as a PASSIVE listener at the document root, so
  * `e.preventDefault()` inside a React wheel handler is a no-op (and the
  * browser still performs its default action). For Ctrl+wheel that default
  * action is PAGE ZOOM — the whole app behind this overlay resizes, which
  * is exactly the "underlying stuff " we must NOT touch. We therefore attach
  * a NATIVE, explicitly non-passive listener so preventDefault() actually
  * swallows the gesture and we apply our own image zoom instead.
   *
   * Ctrl/Cmd+wheel → zoom toward the cursor (the pixel under the mouse stays
   * fixed, matching the click-to-zoom anchor); the retarget EASES via the
   * img's transition instead of snapping. Plain wheel → pan, only once
   * zoomed in (clamped so the image can't be scrolled past its edges). */
  useEffect(() => {
    const el = imgContainerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!canZoomRef.current) return;
      if (e.ctrlKey || e.metaKey) {
        // Browser would page-zoom here — MUST swallow regardless of clamp.
      e.preventDefault();
        const cur = zoomRef.current;
        // Normalize Firefox's line-mode deltas (~40px per line) so a notch
        // lands in the discrete bucket like every other browser. A discrete
        // mouse notch applies the fixed ×1.2 step; a trackpad pinch (many
        // small deltas) zooms delta-proportionally so the gesture glides.
        const raw = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
        let factor =
          Math.abs(raw) >= WHEEL_NOTCH_MIN
            ? raw < 0
              ? WHEEL_ZOOM_FACTOR
              : 1 / WHEEL_ZOOM_FACTOR
            : Math.exp(-raw * WHEEL_PINCH_SENSITIVITY);
        // One event can never blow past a 2× step (absurd deltas).
        factor = Math.max(0.5, Math.min(2, factor));
        const next = clampZoom(cur * factor);
        if (next !== cur) zoomToPoint(next, e.clientX, e.clientY);
        return;
}
      // Plain wheel: pan only while zoomed in.
      if (zoomRef.current <= 1) return;
      e.preventDefault();
      const p = panRef.current;
      setPan(clampPanFor(p.x - e.deltaX, p.y - e.deltaY, zoomRef.current));
  };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [asset?.id, zoomToPoint, clampPanFor]);
  
  /* ── magnifier (minimap) navigation ─────────────────────────────────
  * The thumbnail is a fixed SQUARE — it does NOT change shape with the
  * image's aspect (a wide image makes a wide image, not a wide magnifier);
  * the image is object-contain'd inside it, so its displayed rect is
  * letterboxed. All pointer/viewport math goes through navImageGeometry()
  * to map between the square's coords and the IMAGE's fractions.
  *
  * A pointer down/drag on the thumbnail centers that part of the image in
  * the main view: screen(q) = q·z + pan = 0 ⇒ pan = −q·z, with q measured
  * from the image center (the fraction is from the left/top edge, hence
  * the −0.5). Clamped to the same pan bounds as wheel/drag. */
  const navImageGeometry = useCallback(() => {
    const nav = navThumbRef.current;
    if (!nav) return null;
    const nRect = nav.getBoundingClientRect();
    if (!nRect.width || !nRect.height) return null;
    const a = dims ? dims.w / dims.h : 1;
    // object-contain inside the square thumb: the displayed image size and
    // its centered letterbox offsets.
    const dispW = Math.min(nRect.width, nRect.height * a);
    const dispH = Math.min(nRect.height, nRect.width / a);
    return {
      sizeW: nRect.width,
      sizeH: nRect.height,
      offsetX: (nRect.width - dispW) / 2,
      offsetY: (nRect.height - dispH) / 2,
      dispW,
      dispH,
    };
  }, [dims]);

  const applyNavPoint = useCallback(
    (sx: number, sy: number) => {
      const nav = navThumbRef.current;
      const img = imgRef.current;
      if (!nav || !img) return;
      const nRect = nav.getBoundingClientRect();
      const geo = navImageGeometry();
      if (!nRect.width || !nRect.height || !geo) return;
      const fx = Math.min(
        1,
        Math.max(0, (sx - nRect.left - geo.offsetX) / geo.dispW),
      );
      const fy = Math.min(
        1,
        Math.max(0, (sy - nRect.top - geo.offsetY) / geo.dispH),
      );
      const z = zoomRef.current;
      const qx = (fx - 0.5) * img.offsetWidth;
      const qy = (fy - 0.5) * img.offsetHeight;
      setPan(clampPanFor(-qx * z, -qy * z, z));
    },
    [clampPanFor, navImageGeometry],
  );
  // Stable mirror for the window-level pointermove listener below.
  const applyNavPointRef = useRef(applyNavPoint);
  applyNavPointRef.current = applyNavPoint;

  const onNavPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    applyNavPoint(e.clientX, e.clientY);
    setNavDragging(true);
  };

  // Follow the pointer until release — window-level so a fast drag that
  // outruns the small thumbnail still tracks.
  useEffect(() => {
    if (!navDragging) return;
    const move = (ev: PointerEvent) =>
      applyNavPointRef.current(ev.clientX, ev.clientY);
    const up = () => setNavDragging(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [navDragging]);

  /* ── download ──────────────────────────────────────────────────── */
  const handleDownload = () => {
    if (!asset) return;
    const link = document.createElement("a");
    link.href = asset.url;
    link.download = asset.name;
    link.click();
  };

  /* ── image dimensions (bottom bar) ───────────────────────────────── */
  const handleImgLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const el = e.currentTarget;
      if (el.naturalWidth > 0 && el.naturalHeight > 0) {
        setDims({ w: el.naturalWidth, h: el.naturalHeight });
      }
    },
    [],
  );

  if (!asset) return null;
  const { name, size, url, type } = asset;
  const isImage = isImageAsset(asset);

  /* ── magnifier: the live viewport as a fraction of the image ───────
  * The visible width/height fractions are (container / scaled image); the
  * container CENTER sits at image fraction 0.5 − pan/(z·layout size).
  * The image-fraction rect is then placed inside the SQUARE thumb via the
  * letterbox geometry and expressed as percentages of the square. */
  const navRect = (() => {
    if (!isImage) return null;
    const el = imgContainerRef.current;
    const img = imgRef.current;
    const geo = navImageGeometry();
    if (!el || !img || !geo || !img.offsetWidth || !img.offsetHeight) {
      return null;
    }
    const cRect = el.getBoundingClientRect();
    if (!cRect.width || !cRect.height) return null;
    const w = Math.min(1, cRect.width / (img.offsetWidth * zoom));
    const h = Math.min(1, cRect.height / (img.offsetHeight * zoom));
    const cx = 0.5 - pan.x / (zoom * img.offsetWidth);
    const cy = 0.5 - pan.y / (zoom * img.offsetHeight);
    const l = Math.max(0, Math.min(1 - w, cx - w / 2));
    const t = Math.max(0, Math.min(1 - h, cy - h / 2));
    return {
      left: (geo.offsetX + l * geo.dispW) / geo.sizeW,
      top: (geo.offsetY + t * geo.dispH) / geo.sizeH,
      w: (w * geo.dispW) / geo.sizeW,
      h: (h * geo.dispH) / geo.sizeH,
    };
  })();
  const ext = name.split(".").pop()?.toUpperCase() || "";
  const sizeLabel = formatSizeLabel(size);
  
  return (
        <div
      className="fixed inset-0 z-[100000] flex flex-col bg-black/90"
      data-asset-preview-dialog
      role="dialog"
      aria-modal="true"
      aria-label={`Preview: ${name}`}
    >
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 text-foreground/90">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="truncate font-medium">{name}</span>
          <span className="shrink-0 text-xs text-foreground/40">
            {idx + 1} / {list.length}
          </span>
    </div>
    <button
          onClick={onClose}
          className="rounded-lg p-2 transition-colors hover:bg-white/15"
          aria-label="Close (Esc)"
    >
          <X className="size-5" />
    </button>
    </div>
    
      {/* ── Media area ──────────────────────────────────────────────── */}
        <div
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
              }}
    >
        {/* Prev arrow */}
        {hasPrev && (
    <button
            onClick={() => navigate(-1)}
            aria-label="Previous (←)"
            className="absolute left-4 top-1/2 z-10 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-foreground transition-colors hover:bg-white/25"
    >
            <ChevronLeft className="size-7" />
    </button>
          )}
          
        {/* Image with zoom/pan */}
        <div
          ref={imgContainerRef}
          className="flex max-h-full w-full max-w-full items-center justify-center"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
              }}
    >
          {isImage ? (
            <img
              key={asset.id}
              ref={imgRef}
              src={url}
              alt=""
              draggable={false}
              onClick={handleImageClick}
              onLoad={handleImgLoad}
              className="select-none [-webkit-user-drag:none]"
              style={{
                // The layout size NEVER changes with zoom: the fit
                // constraints stay on at EVERY zoom level and only the
                // transform scales. (Swapping maxWidth to "none" when
                // zoomed made the first wheel notch a giant instant
                // relayout that fought the transform transition — the
                // lurching "janky" wheel zoom.)
                maxWidth: "90vw",
                maxHeight: "80vh",
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                objectFit: "contain",
                // Smooth: every zoom/pan retarget eases; while a drag (or a
                // minimap drag) is active there is NO transition — the image
                // must track the cursor 1:1, not trail behind it.
                transition:
                  dragging || navDragging ? "none" : VIEW_EASE,
                willChange: "transform",
                cursor: canZoom
                  ? isZoomed
                    ? dragging
                      ? "grabbing"
                      : "grab"
                    : "zoom-in"
                  : undefined,
              }}
            />
              ) : (
            <AssetMedia
              asset={asset}
              mode="full"
              className="max-w-[88vw] max-h-[80vh] object-contain"
              style={{
                cursor: canZoom
                  ? isZoomed
                    ? dragging
                      ? "grabbing"
                      : "grab"
                    : "zoom-in"
                  : undefined,
              }}
            />
          )}
    </div>
    
        {/* Next arrow */}
        {hasNext && (
    <button
            onClick={() => navigate(1)}
            aria-label="Next (→)"
            className="absolute right-4 top-1/2 z-10 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-foreground transition-colors hover:bg-white/25"
    >
            <ChevronRight className="size-7" />
    </button>
          )}

        {/* Magnifier: the minimap navigator (bottom-right). Click or drag
            anywhere on the thumbnail to center that part of the image in
            the main view; the outlined rectangle is the live viewport. */}
        {isImage && showNav && (
          <div
            data-asset-minimap
            className="absolute bottom-4 right-4 z-10 w-44 rounded-xl border border-white/15 bg-black/70 p-1.5 shadow-2xl backdrop-blur"
          >
            <div
              ref={navThumbRef}
              onPointerDown={onNavPointerDown}
              className="relative aspect-square cursor-crosshair touch-none overflow-hidden rounded-lg"
            >
              <img
                src={url}
                alt=""
                draggable={false}
                className="pointer-events-none h-full w-full select-none object-contain"
              />
              {navRect && (
                <div
                  data-asset-minimap-rect
                  className="absolute border-2 border-white/90 bg-white/10"
                  style={{
                    left: `${navRect.left * 100}%`,
                    top: `${navRect.top * 100}%`,
                    width: `${navRect.w * 100}%`,
                    height: `${navRect.h * 100}%`,
                    // The huge spread shadow dims everything OUTSIDE the
                    // viewport (clipped to the thumb by overflow-hidden).
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
                    transition:
                      dragging || navDragging ? "none" : RECT_EASE,
                  }}
                />
              )}
            </div>
            <div className="px-1 pt-1 text-center font-mono text-[10px] text-foreground/50">
              {Math.round(zoom * 100)}%
            </div>
          </div>
        )}
    </div>
    
      {/* ── Bottom bar: metadata + actions ──────────────────────────── */}
      <div className="flex items-center justify-between gap-4 border-t border-white/10 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-x-3 text-xs text-foreground/50">
          {ext && <span className="font-mono text-foreground/60">{ext}</span>}
          {dims && (
            <span className="font-mono text-foreground/60" data-asset-dims>
              {dims.w} × {dims.h}
            </span>
          )}
          {sizeLabel && <span>{sizeLabel}</span>}
          {type && !ext && <span className="font-mono">{type}</span>}
    </div>
    
        <div className="flex shrink-0 items-center gap-1.5">
          {/* Magnifier — toggles the minimap navigator (bottom-right of
              the media area) for click/drag navigation while zoomed. */}
          {isImage && (
            <Tip tip="Magnifier — navigate the zoomed image">
              <button
                onClick={() => setShowNav((v) => !v)}
                data-asset-minimap-toggle
                aria-pressed={showNav}
                aria-label="Magnifier (navigator)"
                className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/20 hover:text-foreground ${
                  showNav
                    ? "bg-white/25 text-foreground"
                    : "bg-white/10 text-foreground/70"
                }`}
              >
                <Search className="size-3.5" />
              </button>
            </Tip>
          )}
          {onOpenStretchy &&
            asset &&
            asset.name.toLowerCase().endsWith(".psd") && (
            <ActionBtn
              onClick={() => {
                  onOpenStretchy(asset);
                onClose();
              }}
                label="Stretchy"
            />
          )}
          {onSendToKimodo && asset && /\.(glb|gltf|fbx)$/i.test(asset.name) && (
            <ActionBtn
              onClick={() => {
                onSendToKimodo(asset);
                onClose();
              }}
              label="Kimodo"
            />
          )}
          {onSendToSomax && asset && /\.(glb|gltf|fbx)$/i.test(asset.name) && (
            <ActionBtn
              onClick={() => {
                onSendToSomax(asset);
                onClose();
              }}
              label="SOMAX"
            />
          )}
          
          {hasWf && (
    <Tip tip="Copy workflow JSON">
      <button
              onClick={copyWorkflow}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-foreground/70 transition-colors hover:bg-white/20 hover:text-foreground"
              aria-label="Copy workflow JSON"
    >
              {copiedWf ? (
                <Check className="size-3.5 text-brand" />
              ) : (
                <Copy className="size-3.5" />
          )}
      </button>
    </Tip>
          )}
          
    <Tip tip="Download">
      <button
            onClick={handleDownload}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-foreground/70 transition-colors hover:bg-white/20 hover:text-foreground"
            aria-label="Download"
      >
            <Download className="size-3.5" />
      </button>
    </Tip>
    </div>
    </div>
    </div>
  );
}

function formatSizeLabel(bytes: number): string {
  if (bytes <= 0) return "";
  return bytes > 1048576
    ? `${(bytes / 1048576).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

function ActionBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex h-6 items-center gap-1 rounded-full bg-brand/15 px-2 text-[10px] text-brand/80
                 transition-all hover:bg-brand/25 hover:text-brand shrink-0"
    >
      {label}
    </button>
  );
}

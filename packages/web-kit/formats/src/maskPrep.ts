/**
 * maskPrep — mask preparation (ported from the retired python
 * implementation; the lockstep fixtures are gone — the deterministic
 * loops below are the authority now).
 *
 * Where it runs:
 *   • Mask Studio "Prep preview" (view-only — shows the EFFECTIVE mask
 *     the Inpaint card will consume; the studio itself writes RAW masks).
 *   • Canvas Inpaint Studio (live preview before commit).
 *
 * Numbers are IEEE-754 float64 on both sides; accumulation order is fixed
 * (kernel index ascending) so sequences match Python exactly.
 *
 * NO GPU, no ComfyUI calls — pure geometry, same as the Python module.
 */

// ── Op container ─────────────────────────────────────────────────────────

export interface MaskPrep {
  /** >0 dilate, <0 erode (px, exact Euclidean disk, binarize at 0.5) */
  grow: number;
  /** gaussian falloff radius px (sigma = radius/2). 0 = off */
  feather: number;
  /** re-binarize at >= t AFTER feather. 0 (or negative) = disabled sentinel */
  threshold: number;
  /** 1 - m, applied LAST */
  invert: boolean;
}

export function isIdentityPrep(p: MaskPrep): boolean {
  return (
    p.grow === 0 &&
    p.feather === 0 &&
    p.threshold <= 0 &&
    !p.invert
  );
}

export interface OutpaintSpec {
  top: number;
  right: number;
  bottom: number;
  left: number;
  overlap: number;
}

/** Latent alignment: padded canvas dims round up to a multiple of this. */
export const DEFAULT_ALIGNMENT = 8;

// ── Matrix type ──────────────────────────────────────────────────────────

/** Row-major float64 mask, 1.0 = regenerate. Shape: {h, w}. */
export interface MaskMat {
  w: number;
  h: number;
  data: Float64Array;
}

export function matFromNested(rows: number[][]): MaskMat {
  const h = rows.length;
  const w = h > 0 ? rows[0]!.length : 0;
  const data = new Float64Array(h * w);
  for (let y = 0; y < h; y++) {
    const row = rows[y]!;
    if (row!.length !== w) throw new Error("ragged matrix");
    for (let x = 0; x < w; x++) data[y * w + x] = row![x]!;
  }
  return { w, h, data };
}

export function matToNested(m: MaskMat): number[][] {
  const out: number[][] = [];
  for (let y = 0; y < m.h; y++) {
    const row: number[] = new Array(m.w);
    for (let x = 0; x < m.w; x++) row[x] = m.data[y * m.w + x]!;
    out.push(row);
  }
  return out;
}

export function cloneMat(m: MaskMat): MaskMat {
  return { w: m.w, h: m.h, data: new Float64Array(m.data) };
}

// ── Exact Euclidean disk ─────────────────────────────────────────────────

/** Half-width of the disk per row offset dy ∈ [-r, r]: floor(sqrt(r²-dy²)). */
export function diskRowHalfWidths(radius: number): number[] {
  const r = radius | 0;
  const out: number[] = [];
  for (let dy = -r; dy <= r; dy++) {
    out.push(Math.floor(Math.sqrt(r * r - dy * dy)));
  }
  return out;
}

/** Horizontal sliding-window OR (half-width k) via prefix sums, O(h·w). */
function horizDilateBool(
  b: Uint8Array, w: number, h: number, k: number,
): Uint8Array {
  if (k <= 0) return b.slice();
  const pw = w + 2 * k;
  const padded = new Int32Array(h * pw); // 0-filled = False padding
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) padded[y * pw + k + x] = b[y * w + x]!;
  }
  const out = new Uint8Array(h * w);
  for (let y = 0; y < h; y++) {
    // running prefix along the padded row
    let csum = 0;
    const cpre = new Int32Array(pw + 1);
    for (let t = 0; t < pw; t++) {
      csum += padded[y * pw + t]!;
      cpre[t + 1] = csum;
    }
    for (let x = 0; x < w; x++) {
      // window covers padded [x, x+2k] → cpre[x+2k+1] - cpre[x]
      out[y * w + x] =
        cpre[x + 2 * k + 1]! - cpre[x]! > 0 ? 1 : 0;
    }
  }
  return out;
}

/** Exact disk dilation/erosion. Erode = ~dilate(~b); outside behaves as
 *  mask material for erosion (lenient edges — GrowMask parity). */
function diskMorph(
  b: Uint8Array, w: number, h: number, radius: number, erode: boolean,
): Uint8Array {
  const r = radius | 0;
  if (r <= 0) return b.slice();
  const src = new Uint8Array(b.length);
  if (erode) for (let i = 0; i < b.length; i++) src[i] = b[i] ? 0 : 1;
  else src.set(b);
  const acc = new Uint8Array(h * w);
  const hw = diskRowHalfWidths(r);
  for (let dy = -r; dy <= r; dy++) {
    const k = hw[dy + r]!;
    /* v8 ignore next -- k = floor(sqrt(r^2 - dy^2)) >= 0 by construction
       (diskRowHalfWidths), so this never fires; kept as armor (2026-09-12) */
    if (k < 0) continue;
    const row = horizDilateBool(src, w, h, k);
    if (dy === 0) {
      for (let i = 0; i < acc.length; i++) if (row[i]) acc[i] = 1;
    } else if (dy > 0) {
      for (let y = dy; y < h; y++) {
        const ai = y * w, ri = (y - dy) * w;
        for (let x = 0; x < w; x++) if (row[ri + x]) acc[ai + x] = 1;
      }
    } else {
      for (let y = 0; y < h + dy; y++) {
        const ai = y * w, ri = (y - dy) * w;
        for (let x = 0; x < w; x++) if (row[ri + x]) acc[ai + x] = 1;
      }
    }
  }
  if (!erode) return acc;
  const out = new Uint8Array(b.length);
  for (let i = 0; i < acc.length; i++) out[i] = acc[i] ? 0 : 1;
  return out;
}

/** Dilate/erode the ≥0.5 region by an exact disk. Eroding to empty
 *  THROWS (no silent fallback — mirror of the Python hard error). */
export function growMask(m: MaskMat, px: number): MaskMat {
  px = px | 0;
  if (px === 0) return cloneMat(m);
  const b = new Uint8Array(m.w * m.h);
  for (let i = 0; i < b.length; i++) b[i] = m.data[i]! >= 0.5 ? 1 : 0;
  let outB: Uint8Array;
  if (px > 0) {
    outB = diskMorph(b, m.w, m.h, px, false);
  } else {
    outB = diskMorph(b, m.w, m.h, -px, true);
    let any2 = false;
    for (let i = 0; i < outB.length; i++) if (outB[i]!) { any2 = true; break; }
    if (!any2) {
      throw new Error(
        `maskPrep: grow(${px}) eroded the mask to NOTHING — the ` +
        `regenerate region vanished. Reduce the shrink (grow < 0) or ` +
        `paint a larger region. NO SILENT FALLBACK.`,
      );
    }
  }
  const data = new Float64Array(outB.length);
  for (let i = 0; i < outB.length; i++) data[i] = outB[i]!;
  return { w: m.w, h: m.h, data };
}

// ── Feather ──────────────────────────────────────────────────────────────

/** sigma = radius/2, truncated at ±ceil(3σ), renormalized. */
export function gaussianKernel(radius: number): Float64Array {
  const sigma = radius / 2;
  const k = Math.max(1, Math.ceil(3 * sigma));
  const xs: number[] = [];
  for (let x = -k; x <= k; x++) xs.push(x);
  const g = new Float64Array(xs.length);
  let sum = 0;
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i]!;
    g[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
    sum += g[i]!;
  }
  for (let i = 0; i < g.length; i++) g[i] = g[i]! / sum;
  return g;
}

/** 1D convolution along an axis, replicate edges, fixed accumulation
 *  order (kernel index ascending) — the parity-critical loop. */
function convAxisReplicate(
  m: MaskMat, kernel: Float64Array, axis: 0 | 1,
): MaskMat {
  const { w, h, data } = m;
  const k = (kernel.length - 1) >> 1;
  const out = new Float64Array(w * h);
  if (axis === 1) {
    for (let y = 0; y < h; y++) {
      const rowIn = new Float64Array(w + 2 * k);
      for (let t = 0; t < k; t++) rowIn[t] = data[y * w]!;
      for (let x = 0; x < w; x++) rowIn[k + x] = data[y * w + x]!;
      for (let t = 0; t < k; t++) rowIn[k + w + t] = data[y * w + w - 1]!;
      for (let x = 0; x < w; x++) {
        let acc = 0;
        for (let i = 0; i < kernel.length; i++) {
          acc += kernel[i]! * rowIn[i + x]!;
        }
        out[y * w + x] = acc;
      }
    }
  } else {
    for (let x = 0; x < w; x++) {
      const colIn = new Float64Array(h + 2 * k);
      for (let t = 0; t < k; t++) colIn[t] = data[x]!;
      for (let y = 0; y < h; y++) colIn[k + y] = data[y * w + x]!;
      for (let t = 0; t < k; t++) colIn[k + h + t] = data[(h - 1) * w + x]!;
      for (let y = 0; y < h; y++) {
        let acc = 0;
        for (let i = 0; i < kernel.length; i++) {
          acc += kernel[i]! * colIn[i + y]!;
        }
        out[y * w + x] = acc;
      }
    }
  }
  return { w, h, data: out };
}

/** Gaussian feather (columns then rows — same axis order as Python). */
export function featherMask(m: MaskMat, radius: number): MaskMat {
  radius = radius | 0;
  if (radius <= 0) return cloneMat(m);
  const kernel = gaussianKernel(radius);
  let out = convAxisReplicate(m, kernel, 1);
  out = convAxisReplicate(out, kernel, 0);
  return out;
}

// ── Threshold / invert / coverage ────────────────────────────────────────

export function thresholdMask(m: MaskMat, t: number): MaskMat {
  if (t <= 0) return cloneMat(m);
  const data = new Float64Array(m.data.length);
  for (let i = 0; i < data.length; i++) data[i] = m.data[i]! >= t ? 1 : 0;
  return { w: m.w, h: m.h, data };
}

export function invertMask(m: MaskMat): MaskMat {
  const data = new Float64Array(m.data.length);
  for (let i = 0; i < data.length; i++) data[i] = 1 - m.data[i]!;
  return { w: m.w, h: m.h, data };
}

export function coverage(m: MaskMat): number {
  let s = 0;
  for (let i = 0; i < m.data.length; i++) s += m.data[i]!;
  return s / m.data.length;
}

export interface PrepReport {
  applied: string[];
}

/** FIXED chain: grow → feather → threshold → invert. */
export function applyPrep(m: MaskMat, prep: MaskPrep): {
  mask: MaskMat; report: PrepReport;
} {
  let out = cloneMat(m);
  const applied: string[] = [];
  if (prep.grow) {
    out = growMask(out, prep.grow);
    applied.push(`grow(${prep.grow}px)`);
  }
  if (prep.feather) {
    out = featherMask(out, prep.feather);
    applied.push(`feather(${prep.feather}px)`);
  }
  if (prep.threshold > 0) {
    out = thresholdMask(out, prep.threshold);
    applied.push(`threshold(${prep.threshold})`);
  }
  if (prep.invert) {
    out = invertMask(out);
    applied.push("invert");
  }
  return { mask: out, report: { applied: applied.length ? applied : ["identity"] } };
}

// ── Outpaint ─────────────────────────────────────────────────────────────

export function roundToMultiple(
  value: number, multiple: number = DEFAULT_ALIGNMENT,
): number {
  if (multiple <= 0) throw new Error("alignment multiple must be > 0");
  return (Math.ceil(value / multiple)) * multiple;
}

export interface OutpaintGeometry {
  newW: number;
  newH: number;
  offX: number;
  offY: number;
  mask: MaskMat; // 1.0 = regenerate
  actualRight: number;
  actualBottom: number;
}

/** Derive padded-canvas geometry + regenerate mask (border ∪ overlap). */
export function deriveOutpaint(
  origW: number, origH: number, spec: OutpaintSpec,
  alignment: number = DEFAULT_ALIGNMENT,
): OutpaintGeometry {
  if (origW <= 0 || origH <= 0) throw new Error("original dims must be positive");
  if (spec.top < 0 || spec.right < 0 || spec.bottom < 0 || spec.left < 0) {
    throw new Error("outpaint pads must be >= 0");
  }
  if (spec.overlap < 0) throw new Error("overlap must be >= 0");
  const newW = roundToMultiple(origW + spec.left + spec.right, alignment);
  const newH = roundToMultiple(origH + spec.top + spec.bottom, alignment);
  const offX = spec.left, offY = spec.top;
  const keep = new Uint8Array(newW * newH);
  for (let y = offY; y < offY + origH; y++) {
    for (let x = offX; x < offX + origW; x++) keep[y * newW + x] = 1;
  }
  const border = new Uint8Array(keep.length);
  for (let i = 0; i < keep.length; i++) border[i] = keep[i] ? 0 : 1;
  const grown = spec.overlap > 0
    ? diskMorph(border, newW, newH, spec.overlap, false)
    : border;
  const data = new Float64Array(grown.length);
  for (let i = 0; i < grown.length; i++) data[i] = grown[i]!;
  return {
    newW, newH, offX, offY,
    mask: { w: newW, h: newH, data },
    actualRight: newW - offX - origW,
    actualBottom: newH - offY - origH,
  };
}

/** Overlap seam-kill on an ALREADY-padded canvas (client composite).
 *  Original rect = (left, top) .. (w-right, h-bottom). */
export function applyOutpaintOverlap(
  m: MaskMat, spec: OutpaintSpec,
): MaskMat {
  const { w, h } = m;
  if (spec.top + spec.bottom > h || spec.left + spec.right > w) {
    throw new Error(
      `maskPrep: pads (t${spec.top}/r${spec.right}/b${spec.bottom}/` +
      `l${spec.left}) exceed canvas ${w}x${h}`,
    );
  }
  const keep = new Uint8Array(w * h);
  for (let y = spec.top; y < h - spec.bottom; y++) {
    for (let x = spec.left; x < w - spec.right; x++) keep[y * w + x] = 1;
  }
  const border = new Uint8Array(w * h);
  for (let i = 0; i < keep.length; i++) border[i] = keep[i] ? 0 : 1;
  const grown = spec.overlap > 0
    ? diskMorph(border, w, h, spec.overlap, false)
    : border;
  const data = new Float64Array(w * h);
  for (let i = 0; i < data.length; i++) {
    data[i] = m.data[i]! > grown[i]! ? m.data[i]! : grown[i]!;
  }
  return { w, h, data };
}

/** Place wired 1:1 at (offX, offY) and union (max). */
export function unionMaskAt(
  canvasMask: MaskMat, wired: MaskMat, offX: number, offY: number,
): MaskMat {
  const out = cloneMat(canvasMask);
  for (let y = 0; y < wired.h; y++) {
    for (let x = 0; x < wired.w; x++) {
      const v = wired.data[y * wired.w + x]!;
      const i = (offY + y) * out.w + (offX + x);
      if (v > out.data[i]!) out.data[i] = v;
    }
  }
  return out;
}

// ── ImageData bridge (studio/canvas preview source) ──────────────────────

/** Extract a mask from ImageData. channel: "alpha" (RGBA canvas carrier)
 *  or "red" (white-on-black studio carrier). Values → [0,1] float64. */
export function maskFromImageData(
  img: ImageData, channel: "alpha" | "red" = "alpha",
): MaskMat {
  const { width: w, height: h, data } = img;
  const out = new Float64Array(w * h);
  const stride = 4; // ImageData is always RGBA
  const off = channel === "alpha" ? 3 : 0;
  for (let i = 0; i < w * h; i++) out[i] = data[i * stride + off]! / 255;
  return { w, h, data: out };
}

/** Composite a mask into ImageData as tinted RGBA (premultiplied by the
 *  caller's tint color) — the studio overlay renderer. */
export function tintMaskToImageData(
  m: MaskMat, img: ImageData, r: number, g: number, b: number, alpha = 128,
): void {
  for (let i = 0; i < m.w * m.h; i++) {
    const v = m.data[i]!;
    const o = i * 4;
    img.data[o] = Math.round(
      img.data[o]! * (1 - v) + r * v,
    );
    img.data[o + 1] = Math.round(
      img.data[o + 1]! * (1 - v) + g * v,
    );
    img.data[o + 2] = Math.round(
      img.data[o + 2]! * (1 - v) + b * v,
    );
    img.data[o + 3] = Math.round(
      img.data[o + 3]! * (1 - v) + alpha * v,
    );
  }
}

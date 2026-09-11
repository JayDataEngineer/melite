// psdExport.spec.ts — the layered-PSD writer for the Export card.
// Node-runnable with a scripted browser double: document.createElement
// (canvas + anchor), Image (success/error arms), and ImageData are
// stubbed; the double composites source-over correctly, while PSD
// STRUCTURE (records, blend keys, planes, offsets) is asserted byte-exact
// from the real writer output. No network, no real canvas.
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { buildPsd, downloadBlob } from "../src/psdExport.ts";

type Globals = Record<string, unknown>;
const G = globalThis as unknown as Globals;
const realDocument = G.document;
const realImage = G.Image;
const realImageData = G.ImageData;
const realConsoleWarn = console.warn;

// ── Fakes ──────────────────────────────────────────────────────────────────

const pixelRegistry = new Map<string, Uint8ClampedArray>();

class FakeCtx {
  buf: Uint8ClampedArray;
  globalAlpha = 1;
  globalCompositeOperation = "source-over";
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.buf = new Uint8ClampedArray(w * h * 4);
  }
  clearRect(): void {
    this.buf.fill(0);
  }
  drawImage(src: unknown, ..._rest: unknown[]): void {
    const srcBuf =
      src instanceof FakeCanvas
        ? src.ctx.buf
        : pixelRegistry.get((src as { src: string }).src) ?? new Uint8ClampedArray(this.buf.length);
    const a = this.globalAlpha;
    for (let i = 0; i < this.buf.length; i += 4) {
      const sa = (srcBuf[i + 3] / 255) * a;
      const da = this.buf[i + 3] / 255;
      const outA = sa + da * (1 - sa);
      for (let c = 0; c < 3; c++) {
        this.buf[i + c] =
          outA === 0
            ? 0
            : (srcBuf[i + c] * sa + this.buf[i + c] * da * (1 - sa)) / outA;
      }
      this.buf[i + 3] = outA * 255;
    }
  }
  getImageData(): { data: Uint8ClampedArray } {
    return { data: this.buf.slice() };
  }
  putImageData(img: { data: Uint8ClampedArray }, _x: number, _y: number): void {
    this.buf.set(img.data.subarray(0, this.buf.length));
  }
}

class FakeCanvas {
  width = 0;
  height = 0;
  ctx: FakeCtx | null = null;
  getContext(): FakeCtx {
    if (!this.ctx) this.ctx = new FakeCtx(this.width, this.height);
    return this.ctx;
  }
  toDataURL(): string {
    return "data:image/png;base64,AA==";
  }
}

class FakeImage {
  onload: (() => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  private _src = "";
  get src(): string {
    return this._src;
  }
  set src(v: string) {
    this._src = v;
    if (v.includes("THROW")) this.onerror?.(new Error("bad png"));
    else this.onload?.();
  }
}

class FakeImageData {
  constructor(
    readonly data: Uint8ClampedArray,
    readonly width: number,
    readonly height: number,
  ) {}
}

interface FakeAnchor {
  href: string;
  download: string;
  clicks: number;
  removed: boolean;
  click(): void;
  remove(): void;
}
const anchors: FakeAnchor[] = [];
const appended: unknown[] = [];
const removed: unknown[] = [];

function installFakes(): void {
  G.document = {
    createElement: (tag: string) => {
      if (tag === "canvas") return new FakeCanvas();
      const a: FakeAnchor = {
        href: "",
        download: "",
        clicks: 0,
        removed: false,
        click() {
          this.clicks++;
        },
        remove() {
          this.removed = true;
        },
      };
      anchors.push(a);
      return a;
    },
    body: {
      appendChild: (el: unknown) => {
        appended.push(el);
      },
      removeChild: (el: unknown) => {
        removed.push(el);
      },
    },
  };
  G.Image = FakeImage;
  G.ImageData = FakeImageData;
}

afterEach(() => {
  G.document = realDocument;
  G.Image = realImage;
  G.ImageData = realImageData;
  console.warn = realConsoleWarn;
  pixelRegistry.clear();
  anchors.length = 0;
  appended.length = 0;
  removed.length = 0;
});

function rgba(r: number, g: number, b: number, a = 255): Uint8ClampedArray {
  return new Uint8ClampedArray([r, g, b, a]);
}

async function psdBytes(
  layers: Array<{
    name: string;
    dataUrl: string | null;
    blendMode?: string;
    opacity?: number;
    visible?: boolean;
  }>,
  w = 1,
  h = 1,
  merged?: Uint8ClampedArray,
): Promise<Uint8Array> {
  const blob = await buildPsd(
    layers.map((l) => ({
      name: l.name,
      dataUrl: l.dataUrl,
      blendMode: (l.blendMode ?? "normal") as "normal",
      opacity: l.opacity ?? 1,
      visible: l.visible ?? true,
    })),
    w,
    h,
    merged,
  );
  assert.equal(blob.type, "image/vnd.adobe.photoshop");
  return new Uint8Array(await blob.arrayBuffer());
}

function u16(b: Uint8Array, off: number): number {
  return (b[off] * 256 + b[off + 1]) >>> 0;
}
function u32(b: Uint8Array, off: number): number {
  return b[off] * 2 ** 24 + b[off + 1] * 2 ** 16 + b[off + 2] * 256 + b[off + 3];
}
function i16(b: Uint8Array, off: number): number {
  const v = u16(b, off);
  return v >= 0x8000 ? v - 0x10000 : v;
}
function ascii(b: Uint8Array, off: number, len: number): string {
  return new TextDecoder().decode(b.subarray(off, off + len));
}

// ── buildPsd ───────────────────────────────────────────────────────────────

describe("buildPsd", () => {
  it("writes a byte-exact single-layer PSD with provided merged data", async () => {
    installFakes();
    const url = "data:image/png;base64,red";
    pixelRegistry.set(url, rgba(255, 0, 0));
    const b = await psdBytes(
      [{ name: "bg", dataUrl: url }],
      1,
      1,
      rgba(255, 0, 0),
    );
    // Header: signature, version, channels, height, width, depth, mode.
    assert.equal(ascii(b, 0, 4), "8BPS");
    assert.equal(u16(b, 4), 1);
    assert.equal(u16(b, 12), 3);
    assert.equal(u32(b, 14), 1);
    assert.equal(u32(b, 18), 1);
    assert.equal(u16(b, 22), 8);
    assert.equal(u16(b, 24), 3);
    // Empty color-mode + image-resources sections.
    assert.equal(u32(b, 26), 0);
    assert.equal(u32(b, 30), 0);
    // Layer section: mask length 88, info length 84, one layer.
    assert.equal(u32(b, 34), 88);
    assert.equal(u32(b, 38), 84);
    assert.equal(i16(b, 42), 1);
    // Layer record: rect, 4 channels, 8BIM, norm key, opaque, visible.
    assert.equal(u32(b, 44), 0);
    assert.equal(u32(b, 52), 1);
    assert.equal(u32(b, 56), 1);
    assert.equal(u16(b, 60), 4);
    assert.equal(i16(b, 62), 0);
    assert.equal(i16(b, 68), 1);
    assert.equal(i16(b, 74), 2);
    assert.equal(i16(b, 80), -1);
    assert.equal(ascii(b, 86, 4), "8BIM");
    assert.equal(ascii(b, 90, 4), "norm");
    assert.equal(b[94], 255);
    assert.equal(b[95], 0);
    assert.equal(b[96], 0);
    assert.equal(b[97], 0);
    // Extra data: no mask, no ranges, Pascal name "bg" + 1 pad byte.
    assert.equal(u32(b, 98), 12);
    assert.equal(b[110], 2);
    assert.equal(ascii(b, 111, 2), "bg");
    // Channel data: raw R/G/B/alpha planes of the red pixel.
    assert.equal(u16(b, 114), 0);
    assert.equal(b[116], 255);
    assert.equal(u16(b, 117), 0);
    assert.equal(b[119], 0);
    assert.equal(u16(b, 120), 0);
    assert.equal(b[122], 0);
    assert.equal(u16(b, 123), 0);
    assert.equal(b[125], 255);
    // Merged image data: raw R/G/B planes of the provided composite.
    assert.equal(u16(b, 126), 0);
    assert.equal(b[128], 255);
    assert.equal(b[129], 0);
    assert.equal(b[130], 0);
    assert.equal(b.length, 131);
  });

  it("composites visible layers, skipping hidden and sourceless ones", async () => {
    installFakes();
    const red = "data:image/png;base64,red";
    const green = "data:image/png;base64,green";
    pixelRegistry.set(red, rgba(255, 0, 0));
    pixelRegistry.set(green, rgba(0, 255, 0));
    const b = await psdBytes([
      { name: "red", dataUrl: red },
      { name: "green", dataUrl: green, blendMode: "multiply" },
      { name: "ghost", dataUrl: red, visible: false },
      { name: "empty", dataUrl: null },
    ]);
    // All three decoded layers recorded (hidden included), sourceless skipped.
    assert.equal(i16(b, 42), 3);
    const text = new TextDecoder().decode(b);
    assert.ok(text.includes("norm"));
    assert.ok(text.includes("mul "));
    assert.ok(text.includes("ghost"));
    assert.ok(!text.includes("empty"));
    // Green drew last at full alpha → merged composite is green.
    const infoLen = u32(b, 38);
    const m = 42 + infoLen;
    assert.equal(u16(b, m), 0);
    assert.equal(b[m + 2], 0);
    assert.equal(b[m + 3], 255);
    assert.equal(b[m + 4], 0);
  });

  it("skips undecodable layers with a warning and writes blank merged", async () => {
    installFakes();
    const warnings: unknown[][] = [];
    console.warn = (...args: unknown[]) => {
      warnings.push(args);
    };
    const b = await psdBytes([{ name: "bad", dataUrl: "data:image/png;THROW" }]);
    assert.equal(warnings.length, 1);
    assert.equal(i16(b, 42), 0);
    const m = 42 + u32(b, 38);
    assert.deepEqual(Array.from(b.subarray(m + 2, m + 5)), [0, 0, 0]);
  });

  it("maps every blend mode to its PSD key, unknown to norm", async () => {
    installFakes();
    const url = "data:image/png;base64,px";
    pixelRegistry.set(url, rgba(1, 2, 3));
    const modes: Array<[string, string]> = [
      ["normal", "norm"],
      ["multiply", "mul "],
      ["screen", "scrn"],
      ["overlay", "over"],
      ["darken", "dark"],
      ["lighten", "lite"],
      ["color-dodge", "d dg"],
      ["color-burn", "div "],
      ["hard-light", "hLit"],
      ["soft-light", "sLit"],
      ["difference", "diff"],
      ["exclusion", "smud"],
      ["hue", "hue "],
      ["saturation", "sat "],
      ["color", "colr"],
      ["luminosity", "lum "],
      ["bogus-mode", "norm"],
    ];
    for (const [mode, key] of modes) {
      const b = await psdBytes([{ name: "x", dataUrl: url, blendMode: mode }]);
      assert.equal(ascii(b, 90, 4), key, mode);
    }
  });

  it("truncates 255+ char names and flags hidden + translucent layers", async () => {
    installFakes();
    const url = "data:image/png;base64,px";
    pixelRegistry.set(url, rgba(9, 9, 9));
    const b = await psdBytes(
      [{ name: "n".repeat(300), dataUrl: url, opacity: 0.5, visible: false }],
      1,
      1,
      rgba(9, 9, 9),
    );
    assert.equal(b[94], 128);
    assert.equal(b[96] & 0b10, 0b10);
    assert.equal(b[110], 255);
    assert.equal(ascii(b, 111, 3), "nnn");
  });
});

// ── downloadBlob ───────────────────────────────────────────────────────────

describe("downloadBlob", () => {
  it("drives an anchor download and cleans up", async () => {
    installFakes();
    const realCreate = URL.createObjectURL;
    const realRevoke = URL.revokeObjectURL;
    const seen: Blob[] = [];
    URL.createObjectURL = ((blob: Blob) => {
      seen.push(blob);
      return "blob:fake";
    }) as typeof URL.createObjectURL;
    let revoked = "";
    URL.revokeObjectURL = ((url: string) => {
      revoked += url;
    }) as typeof URL.revokeObjectURL;
    try {
      downloadBlob(new Blob(["psd"]), "art.psd");
      assert.equal(anchors.length, 1);
      assert.equal(anchors[0].href, "blob:fake");
      assert.equal(anchors[0].download, "art.psd");
      assert.equal(anchors[0].clicks, 1);
      assert.deepEqual(appended, [anchors[0]]);
      // Revocation is deferred; the anchor removes itself synchronously.
      assert.equal(anchors[0].removed, true);
      assert.equal(seen.length, 1);
      await new Promise((r) => setTimeout(r, 1100));
      assert.equal(revoked, "blob:fake");
    } finally {
      URL.createObjectURL = realCreate;
      URL.revokeObjectURL = realRevoke;
    }
  });
});

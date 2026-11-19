// downloads.spec.ts — the Export card's download helpers.
// Node-runnable with a scripted document double (anchor + canvas list);
// Blob/atob/URL are real Node web APIs. Covers the base64 bridge
// (default/explicit MIME + invalid arm), the motion-NPZ guard, and the
// largest-canvas picker (empty/zero-area/null-blob arms).
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import {
  downloadBase64Payload,
  downloadCanvasScreenshot,
  downloadMotionNpz,
} from "../src/downloads.ts";
import type { PoseMotion } from "../src/textToPose.ts";

type Globals = Record<string, unknown>;
const G = globalThis as unknown as Globals;
const realDocument = G.document;
const realConsoleError = console.error;

interface FakeAnchor {
  href: string;
  download: string;
  clicks: number;
  click(): void;
  remove(): void;
}
const anchors: FakeAnchor[] = [];

class FakeShotCanvas {
  toBlobCalls = 0;
  constructor(
    readonly width: number,
    readonly height: number,
    private readonly blob: Blob | null,
  ) {}
  toBlob(cb: (b: Blob | null) => void): void {
    this.toBlobCalls++;
    cb(this.blob);
  }
}

let canvasList: FakeShotCanvas[] = [];

function installDocument(): void {
  G.document = {
    createElement: () => {
      const a: FakeAnchor = {
        href: "",
        download: "",
        clicks: 0,
        click() {
          this.clicks++;
        },
        remove() {},
      };
      anchors.push(a);
      return a;
    },
    body: { appendChild() {}, removeChild() {} },
    querySelectorAll: () => canvasList,
  };
}

const realCreate = URL.createObjectURL;
const realRevoke = URL.revokeObjectURL;
let lastObjectUrlBlob: Blob | null = null;

function installUrls(): void {
  URL.createObjectURL = ((blob: Blob) => {
    lastObjectUrlBlob = blob;
    return "blob:fake";
  }) as typeof URL.createObjectURL;
  URL.revokeObjectURL = (() => {}) as typeof URL.revokeObjectURL;
}

afterEach(() => {
  G.document = realDocument;
  console.error = realConsoleError;
  URL.createObjectURL = realCreate;
  URL.revokeObjectURL = realRevoke;
  anchors.length = 0;
  canvasList = [];
  lastObjectUrlBlob = null;
});

describe("downloadBase64Payload", () => {
  it("bridges base64 through a blob URL with default and explicit MIME", () => {
    installDocument();
    installUrls();
    downloadBase64Payload(btoa("hello"), "hi.bin");
    assert.equal(anchors.length, 1);
    assert.equal(anchors[0].download, "hi.bin");
    assert.equal(anchors[0].href, "blob:fake");
    assert.equal(anchors[0].clicks, 1);
    assert.equal(lastObjectUrlBlob?.type, "application/octet-stream");
    downloadBase64Payload(btoa("hi"), "hi.txt", "text/plain");
    assert.equal(anchors.length, 2);
    assert.equal(lastObjectUrlBlob?.type, "text/plain");
  });

  it("reports invalid base64 without downloading", () => {
    installDocument();
    installUrls();
    const errors: unknown[][] = [];
    console.error = (...args: unknown[]) => {
      errors.push(args);
    };
    downloadBase64Payload("!!!not-base64!!!", "bad.bin");
    assert.equal(errors.length, 1);
    assert.equal(anchors.length, 0);
  });
});

describe("downloadMotionNpz", () => {
  it("throws when the motion carries no NPZ payload", () => {
    assert.throws(
      () =>
        downloadMotionNpz({ fps: 30 } as unknown as PoseMotion, "m.npz"),
      /No NPZ data in motion result/,
    );
  });

  it("downloads the embedded payload with default and explicit names", () => {
    installDocument();
    installUrls();
    const motion = { fps: 30, soma_npz_b64: btoa("npz-bytes") } as unknown as PoseMotion;
    downloadMotionNpz(motion);
    assert.equal(anchors[0].download, "motion.npz");
    downloadMotionNpz(motion, "custom.npz");
    assert.equal(anchors[1].download, "custom.npz");
    assert.equal(anchors.length, 2);
  });
});

describe("downloadCanvasScreenshot", () => {
  it("returns silently with no canvases or only zero-area ones", () => {
    installDocument();
    installUrls();
    canvasList = [];
    downloadCanvasScreenshot();
    assert.equal(anchors.length, 0);
    canvasList = [new FakeShotCanvas(0, 0, new Blob(["x"]))];
    downloadCanvasScreenshot("zero.png");
    assert.equal(anchors.length, 0);
  });

  it("screenshots the largest canvas by area", () => {
    installDocument();
    installUrls();
    const small = new FakeShotCanvas(10, 10, new Blob(["small"]));
    const big = new FakeShotCanvas(20, 20, new Blob(["big"]));
    canvasList = [small, big];
    downloadCanvasScreenshot();
    assert.equal(small.toBlobCalls, 0);
    assert.equal(big.toBlobCalls, 1);
    assert.equal(anchors.length, 1);
    assert.equal(anchors[0].download, "pose.png");
  });

  it("returns silently when the canvas yields no blob", () => {
    installDocument();
    installUrls();
    canvasList = [new FakeShotCanvas(30, 30, null)];
    downloadCanvasScreenshot("noblob.png");
    assert.equal(anchors.length, 0);
  });
});

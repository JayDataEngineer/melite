// openPoseCanvas.spec.ts — the OpenPose stick-figure renderer.
// Node-runnable with a recording 2d-context double; the PNG Blob comes
// from the real atob/Blob path. Covers option defaults, backgrounds,
// limb/joint skip arms (low confidence, invalid coords, short arrays),
// and the returned blob contract.
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { renderOpenPoseCanvas } from "../src/openPoseCanvas.ts";

class FakePoseCtx {
  calls: Array<{ m: string; args: unknown[] }> = [];
  fillStyles: string[] = [];
  lineCap = "";
  lineJoin = "";
  lineWidth = 0;
  strokeStyle = "";
  private _fillStyle = "";
  get fillStyle(): string {
    return this._fillStyle;
  }
  set fillStyle(v: string) {
    this._fillStyle = v;
    this.fillStyles.push(v);
  }
  private rec(m: string, args: unknown[]): void {
    this.calls.push({ m, args });
  }
  clearRect(...args: unknown[]): void {
    this.rec("clearRect", args);
  }
  fillRect(...args: unknown[]): void {
    this.rec("fillRect", args);
  }
  beginPath(): void {
    this.rec("beginPath", []);
  }
  moveTo(...args: unknown[]): void {
    this.rec("moveTo", args);
  }
  lineTo(...args: unknown[]): void {
    this.rec("lineTo", args);
  }
  stroke(): void {
    this.rec("stroke", []);
  }
  arc(...args: unknown[]): void {
    this.rec("arc", args);
  }
  fill(): void {
    this.rec("fill", []);
  }
  count(m: string): number {
    return this.calls.filter((c) => c.m === m).length;
  }
}

class FakePoseCanvas {
  width = 0;
  height = 0;
  ctx = new FakePoseCtx();
  getContext(): FakePoseCtx {
    return this.ctx;
  }
  toDataURL(): string {
    return `data:image/png;base64,${Buffer.from([1, 2, 3]).toString("base64")}`;
  }
}

type Globals = Record<string, unknown>;
const G = globalThis as unknown as Globals;
const realDocument = G.document;

const created: FakePoseCanvas[] = [];

function installDocument(): void {
  G.document = {
    createElement: () => {
      const c = new FakePoseCanvas();
      created.push(c);
      return c;
    },
  };
}

function lastCanvas(): FakePoseCanvas {
  return created[created.length - 1];
}

afterEach(() => {
  G.document = realDocument;
  created.length = 0;
});

function fullFigure(set: (kp: number[]) => void = () => {}): number[] {
  const kp = new Array(18 * 3).fill(0);
  for (let j = 0; j < 18; j++) {
    kp[j * 3] = 100 + j;
    kp[j * 3 + 1] = 200 + j;
    kp[j * 3 + 2] = 1;
  }
  set(kp);
  return kp;
}

describe("renderOpenPoseCanvas", () => {
  it("renders defaults on a transparent 1024 canvas", async () => {
    installDocument();
    const blob = await renderOpenPoseCanvas(fullFigure(), {});
    const canvas = lastCanvas();
    assert.equal(canvas.width, 1024);
    assert.equal(canvas.height, 1024);
    assert.equal(canvas.ctx.count("clearRect"), 1);
    assert.equal(canvas.ctx.count("fillRect"), 0);
    assert.equal(canvas.ctx.lineCap, "round");
    assert.equal(canvas.ctx.lineJoin, "round");
    assert.equal(canvas.ctx.lineWidth, 4);
    // All 18 limbs + 18 joint dots.
    assert.equal(canvas.ctx.count("stroke"), 18);
    assert.equal(canvas.ctx.count("arc"), 18);
    assert.equal(canvas.ctx.calls.find((c) => c.m === "arc")?.args[2], 5);
    assert.equal(blob.type, "image/png");
    assert.equal(blob.size, 3);
  });

  it("honors explicit options and a solid background", async () => {
    installDocument();
    await renderOpenPoseCanvas(
      fullFigure(),
      { width: 64, height: 32, background: "#123456", lineWidth: 2, pointRadius: 3 },
    );
    const canvas = lastCanvas();
    assert.equal(canvas.width, 64);
    assert.equal(canvas.height, 32);
    assert.equal(canvas.ctx.count("clearRect"), 0);
    assert.equal(canvas.ctx.count("fillRect"), 1);
    // Background color is set before the fill (joint dots recolor after).
    assert.equal(canvas.ctx.fillStyles[0], "#123456");
    assert.equal(canvas.ctx.lineWidth, 2);
    assert.equal(canvas.ctx.calls.find((c) => c.m === "arc")?.args[2], 3);
  });

  it("skips low-confidence and invalid limbs and dots", async () => {
    installDocument();
    const kp = fullFigure((k) => {
      k[0 * 3 + 2] = 0; // nose invisible → (0,1),(0,14),(0,15) skipped
      k[2 * 3 + 2] = 0; // → (1,2),(2,3) skipped via second joint
      k[8 * 3] = NaN; // → (1,8),(8,9),(8,11) skipped via bad coords
    });
    await renderOpenPoseCanvas(kp, {});
    const canvas = lastCanvas();
    assert.equal(canvas.ctx.count("stroke"), 10);
    assert.equal(canvas.ctx.count("arc"), 15);
  });

  it("skips limbs from a negative first joint with confident endpoints", async () => {
    installDocument();
    const kp = fullFigure((k) => {
      k[1 * 3] = NaN; // neck x invalid, confidence fine
    });
    await renderOpenPoseCanvas(kp, {});
    const canvas = lastCanvas();
    // (0,1),(1,2),(1,5),(1,8),(1,11) skipped via the first disjunct.
    assert.equal(canvas.ctx.count("stroke"), 13);
    assert.equal(canvas.ctx.count("arc"), 17);
  });

  it("treats missing entries as invisible", async () => {
    installDocument();
    await renderOpenPoseCanvas([1, 2, 0.9], {});
    const canvas = lastCanvas();
    assert.equal(canvas.ctx.count("stroke"), 0);
    assert.equal(canvas.ctx.count("arc"), 1);
  });
});

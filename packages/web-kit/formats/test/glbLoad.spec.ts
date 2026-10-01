// glbLoad.spec.ts — the shared DRACO-configured GLB loading kernel.
// Node-runnable: constructing GLTFLoader/DRACOLoader touches no DOM (the
// decoder worker spawns only on DRACO content), Box3 math is headless,
// and uncompressed GLBs load through fetch data: URLs (no network).
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import * as THREE from "three";
import { autoFitToHeight, loadGLB, makeGLTFLoader } from "../src/glbLoad.ts";

// three's FileLoader streams fetch bodies and builds a ProgressEvent per
// chunk — Node has no ProgressEvent, so shim the constructor shape the
// loader uses (type + init fields). We pin OUR kernel (shared loader,
// resolve/reject wiring, auto-fit math), not three's progress events.
const realProgressEvent = (globalThis as unknown as Record<string, unknown>).ProgressEvent;

afterEach(() => {
  if (realProgressEvent === undefined) {
    delete (globalThis as unknown as Record<string, unknown>).ProgressEvent;
  } else {
    (globalThis as unknown as Record<string, unknown>).ProgressEvent = realProgressEvent;
  }
});

function installProgressEventShim(): void {
  (globalThis as unknown as Record<string, unknown>).ProgressEvent = class {
    readonly type: string;
    constructor(type: string, init?: Record<string, unknown>) {
      this.type = type;
      Object.assign(this, init);
    }
  };
}

function tinyGlbUrl(): string {
  const json = JSON.stringify({
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ name: "empty" }],
  });
  return `data:application/octet-stream;base64,${Buffer.from(json).toString("base64")}`;
}

describe("makeGLTFLoader", () => {
  it("builds DRACO-configured loaders with a shared decoder", () => {
    const a = makeGLTFLoader();
    const b = makeGLTFLoader();
    assert.ok(a !== b);
    assert.equal(a.dracoLoader !== null, true);
    // Same shared decoder behind both loaders.
    assert.equal(a.dracoLoader, b.dracoLoader);
    // Default base (vitest serves "/") resolves the local decoder dir.
    const inner = a as unknown as {
      dracoLoader: { decoderPath: string };
    };
    assert.equal(inner.dracoLoader.decoderPath, "/draco/gltf/");
  });
});

describe("loadGLB", () => {
  it("resolves an uncompressed GLB data URL", async () => {
    installProgressEventShim();
    const gltf = await loadGLB(tinyGlbUrl());
    // Duck-typed: the loader's internal three copy may differ from the
    // spec's (workspace resolution), so instanceof is unreliable here.
    // (GLTFParser builds scenes as Groups, not Scenes.)
    assert.equal((gltf.scene as unknown as { isGroup: boolean }).isGroup, true);
    // Second call reuses the shared loader instance.
    const again = await loadGLB(tinyGlbUrl());
    assert.equal((again.scene as unknown as { isGroup: boolean }).isGroup, true);
  });

  it("rejects undecodable bytes", async () => {
    await assert.rejects(
      loadGLB("data:application/octet-stream;base64,!!!not-base64!!!"),
      /./,
    );
  });
});

describe("autoFitToHeight", () => {
  it("scales the largest dimension to the target with feet on y=0", () => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 1));
    const box = autoFitToHeight(mesh);
    // THE DEFAULT IS ONE VALUE (2026-10-13): the two copies of this
    // algorithm disagreed — 1.8 here, 1.6 in the card-base glb-stage —
    // so the same mesh framed in a card stage and framed in the
    // gallery came out at different heights. 1.6 is the de-facto law:
    // every explicit call site already passed it.
    assert.ok(Math.abs(mesh.scale.x - 1.6 / 4) < 1e-9);
    // Box min.y was −2 → lifted to 0.
    assert.ok(Math.abs(mesh.position.y - 2 * (1.6 / 4)) < 1e-9);
    // X/Z centered (-0 is zero here).
    assert.ok(Math.abs(mesh.position.x) < 1e-9);
    assert.ok(Math.abs(mesh.position.z) < 1e-9);
    // Returns the pre-normalization box.
    assert.deepEqual(box.min.toArray(), [-1, -2, -0.5]);
  });

  it("honors an explicit target height and survives empty roots", () => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 3));
    autoFitToHeight(mesh, 3.6);
    assert.ok(Math.abs(mesh.scale.x - 3.6 / 3) < 1e-9);
    const empty = new THREE.Group();
    const box = autoFitToHeight(empty);
    assert.equal(empty.scale.x, 1);
    assert.ok(box.isEmpty());
  });
});

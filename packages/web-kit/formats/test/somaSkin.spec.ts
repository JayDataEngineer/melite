// somaSkin.spec.ts — matrix inverse, rest-pose extraction, LBS deform,
// and the cached skin load (failure arms + int64-variant success).
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import {
  SKIN_URL,
  deformFrame,
  invert4,
  loadSomaSkin,
  restPoseFromBind,
} from "../src/somaSkin.ts";
import type { SomaSkin } from "../src/somaSkin.ts";

const realFetch = globalThis.fetch;
let fetchCalls = 0;

afterEach(() => {
  globalThis.fetch = realFetch;
});

// ── Minimal NPZ builder (stored entries, method 0) ─────────────────────────

function npy(descr: string, shape: string, payload: Uint8Array): Uint8Array {
  const header = `{'descr': '${descr}', 'fortran_order': False, 'shape': ${shape}, }`;
  const enc = new TextEncoder().encode(header);
  // Pad so data starts on a 64-byte boundary (numpy convention; the
  // parser only needs a correct header length).
  const pad = 64 - ((10 + enc.length + 1) % 64);
  const full = new Uint8Array(enc.length + pad + 1);
  full.set(enc, 0);
  full.fill(0x20, enc.length, enc.length + pad);
  full[enc.length + pad] = 0x0a;
  const out = new Uint8Array(10 + full.length + payload.length);
  out.set([0x93, 0x4e, 0x55, 0x4d, 0x50, 0x59, 1, 0], 0);
  new DataView(out.buffer).setUint16(8, full.length, true);
  out.set(full, 10);
  out.set(payload, 10 + full.length);
  return out;
}

function u16(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >> 8) & 0xff]);
}

function u32(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]);
}

function npz(entries: Array<[string, Uint8Array]>): Uint8Array {
  const local: number[] = [];
  const central: number[] = [];
  let off = 0;
  const push = (arr: number[], bytes: Uint8Array): void => {
    for (const b of bytes) arr.push(b);
  };
  for (const [name, data] of entries) {
    const nb = new TextEncoder().encode(name);
    push(local, new Uint8Array([0x50, 0x4b, 0x03, 0x04]));
    push(local, u16(20)); push(local, u16(0)); push(local, u16(0));
    push(local, u16(0)); push(local, u16(0)); push(local, u32(0));
    push(local, u32(data.length)); push(local, u32(data.length));
    push(local, u16(nb.length)); push(local, u16(0));
    push(local, nb);
    const dataOff = off;
    push(local, data);
    off = local.length;
    void dataOff;
    push(central, new Uint8Array([0x50, 0x4b, 0x01, 0x02]));
    push(central, u16(20)); push(central, u16(20)); push(central, u16(0));
    push(central, u16(0)); push(central, u16(0)); push(central, u16(0));
    push(central, u32(0)); push(central, u32(data.length)); push(central, u32(data.length));
    push(central, u16(nb.length)); push(central, u16(0)); push(central, u16(0));
    push(central, u16(0)); push(central, u16(0)); push(central, u32(0));
    push(central, u32(local.length - data.length - nb.length - 30));
    push(central, nb);
  }
  const cdOff = local.length;
  const all = new Uint8Array(local.length + central.length + 22);
  all.set(local, 0);
  all.set(central, local.length);
  const e = local.length + central.length;
  all.set([0x50, 0x4b, 0x05, 0x06], e);
  all.set(u16(0), e + 4); all.set(u16(0), e + 6);
  all.set(u16(entries.length), e + 8); all.set(u16(entries.length), e + 10);
  all.set(u32(central.length), e + 12); all.set(u32(cdOff), e + 16);
  all.set(u16(0), e + 20);
  return all;
}

function f32(vals: number[]): Uint8Array {
  return new Uint8Array(new Float32Array(vals).buffer);
}

function i64(vals: number[]): Uint8Array {
  const out = new Uint8Array(vals.length * 8);
  const dv = new DataView(out.buffer);
  vals.forEach((v, i) => dv.setBigInt64(i * 8, BigInt(v), true));
  return out;
}

/** 77 identity 4×4 row-major matrices. */
function identityBind(): Uint8Array {
  const vals: number[] = [];
  for (let j = 0; j < 77; j++) {
    vals.push(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
  }
  return f32(vals);
}

/** Success-variant NPZ: int64 faces + int64 lbs_indices. */
export function skinNpzInt64(): Uint8Array {
  return npz([
    ["bind_vertices.npy", npy("<f4", "(1, 3)", f32([1, 2, 3]))],
    ["faces.npy", npy("<i8", "(1, 3)", i64([0, 0, 0]))],
    ["bind_rig_transform.npy", npy("<f4", "(77, 4, 4)", identityBind())],
    ["lbs_indices.npy", npy("<i8", "(1, 8)", i64([0, 0, 0, 0, 0, 0, 0, 0]))],
    ["lbs_weights.npy", npy("<f4", "(1, 8)", f32([1, 0, 0, 0, 0, 0, 0, 0]))],
  ]);
}

describe("invert4", () => {
  it("inverts identity to identity", () => {
    const id = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    assert.deepEqual(Array.from(invert4(id)), Array.from(id));
  });

  it("inverts a diagonal scale", () => {
    const m = new Float32Array([2, 0, 0, 0, 0, 3, 0, 0, 0, 0, 4, 0, 0, 0, 0, 1]);
    const inv = Array.from(invert4(m));
    const want = [0.5, 0, 0, 0, 0, 1 / 3, 0, 0, 0, 0, 0.25, 0, 0, 0, 0, 1];
    for (let i = 0; i < 16; i++) assert.ok(Math.abs(inv[i] - want[i]) < 1e-6, `idx ${i}`);
  });

  it("swaps pivot rows when the diagonal is zero", () => {
    // X/Y swap + translation: its own inverse up to the translation sign.
    const m = new Float32Array([0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    assert.deepEqual(Array.from(invert4(m)), Array.from(m));
  });

  it("leaves a singular column as-is instead of dividing by zero", () => {
    const m = new Float32Array([0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    const inv = invert4(m);
    assert.equal(inv.length, 16);
    assert.ok(inv.every((v) => Number.isFinite(v)));
  });

  it("inverts a translation", () => {
    const m = new Float32Array([1, 0, 0, 5, 0, 1, 0, 6, 0, 0, 1, 7, 0, 0, 0, 1]);
    const inv = Array.from(invert4(m));
    assert.ok(Math.abs(inv[3] + 5) < 1e-5 && Math.abs(inv[7] + 6) < 1e-5 && Math.abs(inv[11] + 7) < 1e-5);
  });
});

describe("restPoseFromBind", () => {
  it("extracts translation + rotation blocks", () => {
    const bind = new Float32Array([
      1, 0, 0, 5,
      0, 1, 0, 6,
      0, 0, 1, 7,
      0, 0, 0, 1,
    ]);
    const { restJoints, restRots } = restPoseFromBind(bind, 1);
    assert.deepEqual(Array.from(restJoints), [5, 6, 7]);
    assert.deepEqual(Array.from(restRots), [1, 0, 0, 0, 1, 0, 0, 0, 1]);
  });
});

describe("deformFrame", () => {
  function toySkin(): SomaSkin {
    return {
      bindVertices: new Float32Array([1, 0, 0, 0, 2, 0]),
      faces: new Uint32Array([0, 1, 0]),
      lbsIndices: new Uint32Array([0, 1, 1, 0]),
      lbsWeights: new Float32Array([1, 0, 0.5, 0.5]),
      bindRigInv: new Float32Array([
        1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
        1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
      ]),
      restJoints: new Float32Array(6),
      restRots: new Float32Array(18),
      vertexCount: 2,
      faceCount: 1,
      jointCount: 2,
      influences: 2,
    };
  }

  it("applies posed translation through identity binds (zero weights skipped)", () => {
    const skin = toySkin();
    const rot = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1]);
    const pos = new Float32Array([10, 0, 0, 0, 20, 0]);
    const out = new Float32Array(6);
    deformFrame(rot, pos, skin, out);
    // v0 fully on joint 0 (w=1, second influence w=0 skipped): (1,0,0)+(10,0,0).
    // v1 split 0.5/0.5 over joints 0/1: 0.5*((0,2,0)+(10,0,0)) + 0.5*((0,2,0)+(0,20,0)).
    const got = Array.from(out);
    const want = [11, 0, 0, 5, 12, 0];
    for (let i = 0; i < 6; i++) assert.ok(Math.abs(got[i] - want[i]) < 1e-5, `idx ${i}: ${got[i]}`);
  });
});

describe("loadSomaSkin", () => {
  it("pins the provision door", () => {
    assert.equal(SKIN_URL, "/v1/models/kimodo/provisions/skin_standard.npz");
  });

  it("throws on fetch failure and re-fetches the next call", async () => {
    fetchCalls = 0;
    // 404 (no apiFetch retry) for the throw arm — fast and deterministic.
    globalThis.fetch = (async () => {
      fetchCalls++;
      return new Response("no", { status: 404 });
    }) as typeof fetch;
    await assert.rejects(loadSomaSkin(), /Failed to fetch SOMA skin: 404/);
    assert.equal(fetchCalls, 1);
    // A skin missing keys throws through the same reset path.
    globalThis.fetch = (async () =>
      new Response(npz([["stray.npy", npy("<f4", "(1,)", f32([1]))]]) as unknown as BodyInit)) as typeof fetch;
    await assert.rejects(loadSomaSkin(), /SOMA skin missing keys/);
    // …then prove failures did not poison the cache: the next call
    // fetches again and succeeds.
    const bytes = skinNpzInt64();
    globalThis.fetch = (async () => {
      fetchCalls++;
      return new Response(bytes as unknown as BodyInit);
    }) as typeof fetch;
    const skin = await loadSomaSkin();
    assert.equal(fetchCalls, 2);
    assert.equal(skin.jointCount, 77);
    assert.equal(skin.influences, 8);
    assert.equal(skin.vertexCount, 1);
    assert.deepEqual(Array.from(skin.bindVertices), [1, 2, 3]);
    assert.deepEqual(Array.from(skin.faces), [0, 0, 0]);
    assert.deepEqual(Array.from(skin.lbsIndices), [0, 0, 0, 0, 0, 0, 0, 0]);
  });
});

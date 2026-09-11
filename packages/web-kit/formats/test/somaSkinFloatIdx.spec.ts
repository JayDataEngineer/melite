// somaSkinFloatIdx.spec.ts — the float32-lbs_indices load variant
// (third session-cache-isolated file; measured together with
// somaSkin.spec.ts + somaSkinDtypes.spec.ts for the union coverage).
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { loadSomaSkin } from "../src/somaSkin.ts";

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

function npy(descr: string, shape: string, payload: Uint8Array): Uint8Array {
  const header = `{'descr': '${descr}', 'fortran_order': False, 'shape': ${shape}, }`;
  const enc = new TextEncoder().encode(header);
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
    push(local, data);
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

function i32(vals: number[]): Uint8Array {
  return new Uint8Array(new Int32Array(vals).buffer);
}

function i64(vals: number[]): Uint8Array {
  const out = new Uint8Array(vals.length * 8);
  const dv = new DataView(out.buffer);
  vals.forEach((v, i) => dv.setBigInt64(i * 8, BigInt(v), true));
  return out;
}

describe("loadSomaSkin float32-indices variant", () => {
  it("truncates float32 lbs_indices (non-integer array arm)", async () => {
    const words: number[] = [];
    for (let j = 0; j < 77; j++) {
      words.push(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    }
    const bytes = npz([
      ["bind_vertices.npy", npy("<f4", "(1, 3)", f32([1, 2, 3]))],
      ["faces.npy", npy("<i8", "(1, 3)", i64([0, 0, 0]))],
      ["bind_rig_transform.npy", npy("<f4", "(77, 4, 4)", f32(words))],
      // float32 indices → Uint32Array.from truncation arm.
      ["lbs_indices.npy", npy("<f4", "(1, 4)", f32([0, 0, 0, 0]))],
      ["lbs_weights.npy", npy("<f4", "(1, 4)", f32([1, 0, 0, 0]))],
    ]);
    globalThis.fetch = (async () => new Response(bytes as unknown as BodyInit)) as typeof fetch;
    const skin = await loadSomaSkin();
    assert.equal(skin.vertexCount, 1);
    assert.deepEqual(Array.from(skin.lbsIndices), [0, 0, 0, 0]);
  });
});

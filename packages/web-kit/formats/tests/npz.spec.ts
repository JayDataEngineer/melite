// npz.spec.ts — the minimal browser-side NPZ reader. ZIP central-directory
// structures and .npy payloads are built byte-by-byte in-test; DEFLATE
// entries are compressed via CompressionStream("deflate-raw").
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { parseNpz } from "../src/npz.ts";
import type { NpyArray } from "../src/npz.ts";

const enc = new TextEncoder();
const u16 = (n: number): number[] => [n & 0xff, (n >> 8) & 0xff];
const u32 = (n: number): number[] => [
  n & 0xff,
  (n >> 8) & 0xff,
  (n >> 16) & 0xff,
  (n >> 24) & 0xff,
];

/** Raw .npy bytes: magic + version + header + payload. */
const npy = (dtype: string, shape: number[], payload: Uint8Array, ver = 1): Uint8Array => {
  const shapeStr =
    shape.length === 0 ? "()" : shape.length === 1 ? `(${shape[0]},)` : `(${shape.join(", ")})`;
  const header = enc.encode(`{'descr': '${dtype}', 'fortran_order': False, 'shape': ${shapeStr}, }\n`);
  const pre =
    ver <= 1
      ? [0x93, 0x4e, 0x55, 0x4d, 0x50, 0x59, 1, 0, ...u16(header.length)]
      : [0x93, 0x4e, 0x55, 0x4d, 0x50, 0x59, 2, 0, ...u32(header.length)];
  return new Uint8Array([...pre, ...header, ...payload]);
};

const f4payload = (vals: number[]): Uint8Array =>
  new Uint8Array(new Float32Array(vals).buffer);
const f8payload = (vals: number[]): Uint8Array =>
  new Uint8Array(new Float64Array(vals).buffer);
const i4payload = (vals: number[]): Uint8Array =>
  new Uint8Array(new Int32Array(vals).buffer);
const i8payload = (vals: bigint[]): Uint8Array =>
  new Uint8Array(new BigInt64Array(vals).buffer);

const deflateRaw = async (b: Uint8Array): Promise<Uint8Array> => {
  const cs = new CompressionStream("deflate-raw");
  const stream = new Blob([b as BlobPart]).stream().pipeThrough(cs);
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

interface Entry {
  name: string;
  data: Uint8Array;
  method: number;
}

/** Minimal ZIP: local headers + data, central directory, EOCD. */
const zip = (entries: Entry[], opts: { comment?: string; eocdEntries?: number } = {}): Uint8Array => {
  const local: number[] = [];
  const cd: number[] = [];
  let off = 0;
  for (const e of entries) {
    const nb = Array.from(enc.encode(e.name));
    const lfh = [
      ...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(e.method),
      ...u16(0), ...u16(0), ...u32(0),
      ...u32(e.data.length), ...u32(e.data.length),
      ...u16(nb.length), ...u16(0),
    ];
    local.push(...lfh, ...nb, ...e.data);
    cd.push(
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(e.method),
      ...u16(0), ...u16(0), ...u32(0),
      ...u32(e.data.length), ...u32(e.data.length),
      ...u16(nb.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(0), ...u32(off), ...nb,
    );
    off += lfh.length + nb.length + e.data.length;
  }
  const comment = Array.from(enc.encode(opts.comment ?? ""));
  const cdOff = local.length;
  const n = opts.eocdEntries ?? entries.length;
  return new Uint8Array([
    ...local,
    ...cd,
    ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(n), ...u16(n),
    ...u32(cd.length), ...u32(cdOff), ...u16(comment.length), ...comment,
  ]);
};

const get = (m: Map<string, NpyArray>, key: string): NpyArray => {
  const v = m.get(key);
  assert.ok(v, `expected key ${key}`);
  return v;
};

describe("parseNpz stored entries", () => {
  it("reads a stored float32 array and strips .npy", async () => {
    const m = await parseNpz(zip([{ name: "arr.npy", data: npy("<f4", [3], f4payload([1, 2.5, -3])), method: 0 }]));
    const a = get(m, "arr");
    assert.deepEqual(a.shape, [3]);
    assert.ok(a.data instanceof Float32Array);
    assert.deepEqual(Array.from(a.data as Float32Array), [1, 2.5, -3]);
  });

  it("reads multi-dimensional shapes", async () => {
    const m = await parseNpz(zip([{ name: "m.npy", data: npy("<f4", [2, 3], f4payload([1, 2, 3, 4, 5, 6])), method: 0 }]));
    assert.deepEqual(get(m, "m").shape, [2, 3]);
  });

  it("reads scalar-shaped (empty dims) arrays", async () => {
    const m = await parseNpz(zip([{ name: "s.npy", data: npy("<f4", [], f4payload([9])), method: 0 }]));
    assert.deepEqual(get(m, "s").shape, []);
  });

  it("reads version-2 headers", async () => {
    const m = await parseNpz(zip([{ name: "v2.npy", data: npy("<f4", [2], f4payload([4, 5]), 2), method: 0 }]));
    assert.deepEqual(Array.from(get(m, "v2").data as Float32Array), [4, 5]);
  });
});

describe("parseNpz dtypes", () => {
  it("handles every supported dtype spelling", async () => {
    const entries: Entry[] = [
      { name: "a.npy", data: npy("<f4", [1], f4payload([1])), method: 0 },
      { name: "b.npy", data: npy("|f4", [1], f4payload([2])), method: 0 },
      { name: "c.npy", data: npy("=f4", [1], f4payload([3])), method: 0 },
      { name: "d.npy", data: npy("<f8", [1], f8payload([4])), method: 0 },
      { name: "e.npy", data: npy("|f8", [1], f8payload([5])), method: 0 },
      { name: "f.npy", data: npy("=f8", [1], f8payload([6])), method: 0 },
      { name: "g.npy", data: npy("<i4", [1], i4payload([7])), method: 0 },
      { name: "h.npy", data: npy("|i4", [1], i4payload([8])), method: 0 },
      { name: "i.npy", data: npy("=i4", [1], i4payload([9])), method: 0 },
      { name: "j.npy", data: npy("<i8", [1], i8payload([10n])), method: 0 },
      { name: "k.npy", data: npy("|i8", [1], i8payload([11n])), method: 0 },
      { name: "l.npy", data: npy("=i8", [1], i8payload([12n])), method: 0 },
    ];
    const m = await parseNpz(zip(entries));
    assert.equal(m.size, 12);
    for (const [k, want] of [["a", 1], ["b", 2], ["c", 3], ["d", 4], ["e", 5], ["f", 6]] as const) {
      const a = get(m, k);
      assert.ok(a.data instanceof Float32Array, k);
      assert.equal((a.data as Float32Array)[0], want);
    }
    for (const [k, want] of [["g", 7], ["h", 8], ["i", 9]] as const) {
      const a = get(m, k);
      assert.ok(a.data instanceof Uint32Array, k);
      assert.equal((a.data as Uint32Array)[0], want);
    }
    for (const [k, want] of [["j", 10n], ["k", 11n], ["l", 12n]] as const) {
      const a = get(m, k);
      assert.ok(a.data instanceof BigInt64Array, k);
      assert.equal((a.data as BigInt64Array)[0], want);
    }
  });

  it("skips unsupported dtypes, bad magic, and unparseable headers", async () => {
    const boolHeader = enc.encode("{'descr': '|b1', 'fortran_order': False, 'shape': (2,), }\n");
    const badMagic = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    const noDescr = enc.encode("{'shape': (2,), }\n");
    const m = await parseNpz(
      zip([
        { name: "flag.npy", data: new Uint8Array([0x93, 0x4e, 0x55, 0x4d, 0x50, 0x59, 1, 0, ...u16(boolHeader.length), ...boolHeader, 1, 0]), method: 0 },
        { name: "bad.npy", data: badMagic, method: 0 },
        { name: "nodescr.npy", data: new Uint8Array([0x93, 0x4e, 0x55, 0x4d, 0x50, 0x59, 1, 0, ...u16(noDescr.length), ...noDescr, 0, 0]), method: 0 },
        { name: "notes.txt", data: enc.encode("not an array"), method: 0 },
        { name: "ok.npy", data: npy("<f4", [1], f4payload([1])), method: 0 },
      ]),
    );
    assert.deepEqual([...m.keys()], ["ok"]);
  });
});

describe("parseNpz deflated entries", () => {
  it("inflates method-8 entries", async () => {
    const raw = npy("<f4", [2], f4payload([1.5, -2.5]));
    const m = await parseNpz(zip([{ name: "z.npy", data: await deflateRaw(raw), method: 8 }]));
    assert.deepEqual(Array.from(get(m, "z").data as Float32Array), [1.5, -2.5]);
  });
});

describe("parseNpz archive errors", () => {
  it("throws on an unsupported compression method", async () => {
    const bytes = zip([{ name: "x.npy", data: npy("<f4", [1], f4payload([1])), method: 12 }]);
    await assert.rejects(parseNpz(bytes), /unsupported compression method 12/);
  });

  it("throws when the EOCD is missing", async () => {
    await assert.rejects(parseNpz(new Uint8Array([1, 2, 3])), /End-of-Central-Directory/);
  });

  it("stops at a corrupt central-directory entry", async () => {
    const bytes = zip(
      [{ name: "ok.npy", data: npy("<f4", [1], f4payload([1])), method: 0 }],
      { eocdEntries: 2 },
    );
    const m = await parseNpz(bytes);
    assert.deepEqual([...m.keys()], ["ok"]);
  });

  it("finds the EOCD behind a zip comment", async () => {
    const bytes = zip(
      [{ name: "ok.npy", data: npy("<f4", [1], f4payload([1])), method: 0 }],
      { comment: "hi" },
    );
    assert.deepEqual([...(await parseNpz(bytes)).keys()], ["ok"]);
  });
});

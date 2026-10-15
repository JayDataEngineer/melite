// user-loras.spec.ts — THE OPERATOR'S OWN LoRA PLANE (2026-10-13).
//
// userLoras.ts had NO spec at all: 126 uncovered entries, the largest
// single debt in the tree. It is the plane behind `comfy_manage
// lora_install` — the operator's own files, copied into the engine's
// loras directory, never fetched (the no-remote law) — and every
// refusal in it is a name an operator reads.
//
// Each case below is the refusal's OWN shape: a bad row must never
// take the good rows down with it, and a refusal must name the field.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  installUserLora,
  installUserLoraBytes,
  installUserLoraBuffer,
  resolveEngineLorasDir,
  LORA_BYTES_CAP,
  loraNamesFromObjectInfo,
  refmodNamesFromObjectInfo,
  readUserLoraRows,
  unboardedRows,
  userLoraFlavor,
  userLorasPath,
  validateUserLoraRow,
} from "../src/userLoras.ts";
import { apply as userLorasFlavor } from "../src/mods/userLorasFlavor.ts";
import { chmodSync, mkdtempSync, readdirSync, rmSync, writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let root = "";

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "melite-user-loras-"));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

const write = (name: string, body: string): string => {
  const path = join(root, name);
  writeFileSync(path, body, "utf8");
  return path;
};

describe("validateUserLoraRow — one row's refusals, each naming its field", () => {
  it("refuses a non-object (the bag's own shape)", () => {
    for (const raw of [null, 42, "row", ["a"]]) {
      expect(validateUserLoraRow(raw, 0).problem, JSON.stringify(raw)).toMatch(/row 0: not an object/u);
    }
  });

  it("requires an id (the bag stores it)", () => {
    expect(validateUserLoraRow({}, 0).problem).toMatch(/row 0: id is required/u);
    expect(validateUserLoraRow({ id: "   " }, 0).problem).toMatch(/id is required/u);
    expect(validateUserLoraRow({ id: 7 }, 0).problem).toMatch(/id is required/u);
  });

  it("requires a filename, and it must be a LoRA file", () => {
    expect(validateUserLoraRow({ id: "a" }, 1).problem).toMatch(/row 1 \(a\): filename is required/u);
    expect(validateUserLoraRow({ id: "a", filename: "x.txt" }, 2).problem).toMatch(/must be a LoRA file/u);
    expect(validateUserLoraRow({ id: "a", filename: "x.txt" }, 2).problem).toMatch(/got "\.txt"/u);
    // an extension-less name reports ITSELF, not an empty extension
    expect(validateUserLoraRow({ id: "a", filename: "plain" }, 3).problem).toMatch(/got "plain"/u);
    // case is normalized on the extension (the NAME rides verbatim)
    expect(validateUserLoraRow({ id: "a", filename: "x.SAFETENSORS", families: ["h3"] }, 4).row?.filename).toBe("x.SAFETENSORS");
  });

  it("requires families (a row rides a model) and drops non-strings", () => {
    expect(validateUserLoraRow({ id: "a", filename: "a.safetensors" }, 0).problem).toMatch(/families is required/u);
    expect(validateUserLoraRow({ id: "a", filename: "a.safetensors", families: "h3" }, 0).problem).toMatch(/families is required/u);
    expect(validateUserLoraRow({ id: "a", filename: "a.safetensors", families: ["h3", "", 7] }, 0).row?.families).toEqual(["h3"]);
  });

  it("carries the optional fields only when they are real", () => {
    const row = validateUserLoraRow(
      {
        id: "a",
        filename: "a.safetensors",
        families: ["h3"],
        label: "My LoRA",
        category: "char",
        default_strength: 0.8,
        source_url: "https://example.invalid/a",
        // junk of each optional kind must be dropped, not carried
        also_label: 1,
      },
      0,
    ).row;
    expect(row).toEqual({
      id: "a",
      filename: "a.safetensors",
      families: ["h3"],
      label: "My LoRA",
      category: "char",
      default_strength: 0.8,
      source_url: "https://example.invalid/a",
    });
    // an EMPTY string and a non-finite number are both "not carried"
    const bare = validateUserLoraRow(
      { id: "b", filename: "b.bin", families: ["h3"], label: "", category: 3, default_strength: Number.NaN },
      1,
    ).row;
    expect(bare).toEqual({ id: "b", filename: "b.bin", families: ["h3"] });
  });

  it("trims the id and filename it carries", () => {
    const row = validateUserLoraRow({ id: "  a  ", filename: "  x.safetensors  ", families: ["h3"] }, 0).row;
    expect(row?.id).toBe("a");
    expect(row?.filename).toBe("x.safetensors");
  });

  // 007 L5 (cured 2026-10-21): a user row's step facts and tooltip
  // SURVIVE the read — they used to drop silently — and a wrong
  // shape refuses by name, the per-row law every other field obeys.
  it("carries the step facts and tooltip a user row declares (007 L5)", () => {
    const row = validateUserLoraRow(
      {
        id: "my-turbo",
        filename: "my-turbo.safetensors",
        families: ["h3"],
        steps: 6,
        steps_min: 4,
        steps_max: 8,
        tooltip: "my distill — 4 to 8 steps",
      },
      0,
    ).row;
    expect(row).toEqual({
      id: "my-turbo",
      filename: "my-turbo.safetensors",
      families: ["h3"],
      steps: 6,
      steps_min: 4,
      steps_max: 8,
      tooltip: "my distill — 4 to 8 steps",
    });
    // the flavor's rows flow them through (the restart-survival gate:
    // what the picker serves is what the file declared)
    expect(row).toBeDefined();
    const flavor = userLoraFlavor({ path: "p", rows: [row!], problems: [], absent: false });
    expect(flavor?.rows[0]).toEqual({
      id: "my-turbo",
      filename: "my-turbo.safetensors",
      steps: 6,
      steps_min: 4,
      steps_max: 8,
      tooltip: "my distill — 4 to 8 steps",
    });
  });

  it("refuses a wrong-shaped step fact by name, and an inverted domain (007 L5)", () => {
    expect(validateUserLoraRow({ id: "a", filename: "a.safetensors", families: ["h3"], steps: "six" }, 0).problem)
      .toBe("row 0 (a): steps must be a finite number");
    expect(validateUserLoraRow({ id: "a", filename: "a.safetensors", families: ["h3"], steps_min: Number.NaN }, 0).problem)
      .toBe("row 0 (a): steps_min must be a finite number");
    expect(
      validateUserLoraRow({ id: "a", filename: "a.safetensors", families: ["h3"], steps_min: 9, steps_max: 4 }, 0).problem,
    ).toBe("row 0 (a): steps_min (9) exceeds steps_max (4)");
  });
});

describe("readUserLoraRows — the file door (absent is not an error)", () => {
  it("an absent file is the opt-in silence, never a failure", () => {
    const file = readUserLoraRows(join(root, "nope.json"));
    expect(file.absent).toBe(true);
    expect(file.rows).toEqual([]);
    expect(file.problems).toEqual([]);
  });

  it("reads BOTH served shapes (a bare array, or {rows: [...]})", () => {
    const bare = readUserLoraRows(write("bare.json", JSON.stringify([{ id: "a", filename: "a.safetensors", families: ["h3"] }])));
    expect(bare.rows.map((r) => r.id)).toEqual(["a"]);
    const wrapped = readUserLoraRows(write("wrapped.json", JSON.stringify({ rows: [{ id: "b", filename: "b.bin", families: ["h3"] }] })));
    expect(wrapped.rows.map((r) => r.id)).toEqual(["b"]);
  });

  it("a bad row never takes the good rows down", () => {
    const file = readUserLoraRows(write(
      "mixed.json",
      JSON.stringify([
        { id: "good", filename: "good.safetensors", families: ["h3"] },
        { id: "bad" },
        { id: "also-good", filename: "also.bin", families: ["z-image"] },
      ]),
    ));
    expect(file.rows.map((r) => r.id)).toEqual(["good", "also-good"]);
    expect(file.problems).toHaveLength(1);
    expect(file.problems[0]).toMatch(/row 1 \(bad\): filename is required/u);
  });

  it("names its own refusal for unparseable and misshapen files", () => {
    expect(readUserLoraRows(write("bad.json", "{not json")).problems[0]).toMatch(/is not JSON/u);
    expect(readUserLoraRows(write("shape.json", JSON.stringify({ nope: [] }))).problems[0]).toMatch(
      /must be an array of rows, or \{"rows": \[\.\.\.\]\}/u,
    );
    // a DIRECTORY is a read that fails, not a parse that fails
    const dir = join(root, "a-dir");
    mkdirSync(dir);
    expect(readUserLoraRows(dir).problems[0]).toMatch(/could not be read/u);
  });
});

describe("loraNamesFromObjectInfo — the engine's own fact, bounds-checked", () => {
  const node = (names: unknown): unknown => ({
    LoraLoaderModelOnly: { input: { required: { lora_name: [names, {}] } } },
  });

  it("reads the declared names", () => {
    expect(loraNamesFromObjectInfo(node(["a.safetensors", "b.safetensors"]))).toEqual(["a.safetensors", "b.safetensors"]);
  });

  it("a hostile or truncated object_info answers empty, never throws", () => {
    for (const info of [null, 42, "x", [], {}, { LoraLoaderModelOnly: null }, { LoraLoaderModelOnly: {} }, node(null), node("nope"), node(42), node([42])]) {
      expect(loraNamesFromObjectInfo(info), JSON.stringify(info)).toEqual([]);
    }
    // deeper truncations: a non-object node row, a junk input row,
    // a junk required group — each answers empty at its own seat
    for (const info of [{ LoraLoaderModelOnly: 42 }, { LoraLoaderModelOnly: { input: "junk" } }, { LoraLoaderModelOnly: { input: { required: "junk" } } }]) {
      expect(loraNamesFromObjectInfo(info), JSON.stringify(info)).toEqual([]);
    }
  });

  it("a lora_name that is not the [names, {}] tuple answers empty at its own seat", () => {
    // every served object_info spells lora_name as the [names, {}]
    // tuple; a declaration that drops the tuple (a bare string, a bare
    // names list, a keyed object) answers empty, never throws.
    for (const field of ["nope", { 0: ["a.safetensors"] }, 42, null]) {
      const info = { LoraLoaderModelOnly: { input: { required: { lora_name: field } } } };
      expect(loraNamesFromObjectInfo(info), JSON.stringify(field)).toEqual([]);
    }
  });

  it("members that are not strings or are empty fall away; the real names ride", () => {
    expect(loraNamesFromObjectInfo(node([42, "", "ok.safetensors", null]))).toEqual(["ok.safetensors"]);
  });
});

describe("refmodNamesFromObjectInfo — the refmods combo fact (the listing door's reader, 2026-11-05)", () => {
  // The served declaration shape: the vendored loader's INPUT_TYPES
  // (ComfyUI-MiniMaxH3Mod nodes.py:757) spells every mod_N slot as the
  // [names, {}] combo tuple, names headed by the "(none)" sentinel.
  const loader = (slots: unknown): unknown => ({
    MiniMaxH3RefModsLoader: { input: { required: slots } },
  });
  const combo = (names: unknown): unknown => [names, {}];

  it("unions every mod_N slot's combo, deduped and sorted, minus the (none) sentinel", () => {
    const info = loader({
      show_info: combo([]),
      mod_1: combo(["(none)", "pack_b", "pack_a"]),
      strength_1: combo([]),
      mod_2: combo(["pack_a", "sub/dir/pack_c"]),
      copies_2: combo([]),
    });
    expect(refmodNamesFromObjectInfo(info)).toEqual(["pack_a", "pack_b", "sub/dir/pack_c"]);
  });

  it("a hostile or truncated object_info answers empty, never throws (the empty-on-absent law)", () => {
    for (const info of [null, 42, "x", [], {}, { MiniMaxH3RefModsLoader: null }, { MiniMaxH3RefModsLoader: {} },
      loader(null), loader("nope"), loader(42), loader({ mod_1: null }), loader({ mod_1: "nope" }), loader({ mod_1: [42, {}] }),
      { MiniMaxH3RefModsLoader: 42 }, { MiniMaxH3RefModsLoader: { input: "junk" } }, { MiniMaxH3RefModsLoader: { input: { required: "junk" } } }]) {
      expect(refmodNamesFromObjectInfo(info), JSON.stringify(info)).toEqual([]);
    }
  });

  it("members that are not stems fall away; the real stems ride (engine down = empty, never a synthetic list)", () => {
    expect(refmodNamesFromObjectInfo(loader({ mod_1: combo([42, "", null, "real_pack"]) }))).toEqual(["real_pack"]);
    // the absent node is the engine-down / pack-absent shape: EMPTY
    expect(refmodNamesFromObjectInfo({ LoraLoaderModelOnly: { input: { required: { lora_name: [["a"], {}] } } } })).toEqual([]);
  });
});

describe("unboardedRows — what the ENGINE lacks, named here not at /prompt", () => {
  const rows = [
    { id: "known", filename: "h3/one.safetensors", families: ["h3"] },
    { id: "ghost", filename: "mine/never.safetensors", families: ["h3"] },
  ];

  it("an empty combo is the stand-down: nothing is unboarded", () => {
    expect(unboardedRows(rows, [])).toEqual([]);
  });

  it("names each row the engine does not have, with its own file", () => {
    expect(unboardedRows(rows, ["h3/one.safetensors"])).toEqual([
      'ghost: the engine has no "mine/never.safetensors" in its LoRA list',
    ]);
  });
});

describe("installUserLora — a COPY of the operator's own file, never a fetch", () => {
  it("refuses loudly: no such file, not a file, not a LoRA", () => {
    expect(installUserLora(join(root, "gone.safetensors"), root).ok).toBe(false);
    expect(installUserLora(join(root, "gone.safetensors"), root)).toMatchObject({ reason: expect.stringMatching(/no such file/u) });
    expect(installUserLora(root, root)).toMatchObject({ reason: expect.stringMatching(/is not a file/u) });
    const txt = write("notes.txt", "x");
    expect(installUserLora(txt, root)).toMatchObject({ reason: expect.stringMatching(/is not a LoRA file/u) });
  });

  it("copies the bytes so the name joins the combo", () => {
    const dir = join(root, "loras");
    const src = write("mine.safetensors", "weights");
    const out = installUserLora(src, dir);
    expect(out.ok).toBe(true);
    expect(out).toMatchObject({ filename: "mine.safetensors", bytes: 7 });
    expect(readFileSync(join(dir, "mine.safetensors"), "utf8")).toBe("weights");
  });

  // THE RECEIPT ATTESTS TO WHAT LANDED (audit M-S4): an empty
  // source is refused — never published, never receipted ok — and
  // the corpse is removed with it.
  it("a 0-byte source refuses and leaves nothing landed (the receipt attests to the landed file)", () => {
    const dir = join(root, "empty-loras");
    const src = write("empty.safetensors", "");
    const out = installUserLora(src, dir);
    expect(out.ok).toBe(false);
    expect(out).toMatchObject({ reason: expect.stringMatching(/0 bytes/u) });
    expect(existsSync(join(dir, "empty.safetensors"))).toBe(false);
    expect(readdirSync(dir).filter((f) => f.includes(".part-"))).toEqual([]);
  });

  // THE ORPHAN SWEEP (audit M-S5): a part file from ANOTHER pid is
  // definitionally a crash corpse — the next landing in the same
  // directory reaps it; a part file from THIS process is a live
  // concurrent writer and must survive.
  it("the sweep reaps foreign-pid part corpses and spares this process's live parts", () => {
    const dir = join(root, "sweep-loras");
    mkdirSync(dir, { recursive: true });
    // the parts ride the ENGINE's loras dir (write() lands in root)
    writeFileSync(join(dir, ".corpse.safetensors.part-999999-100-abc"), "torn");
    writeFileSync(join(dir, `.live.safetensors.part-${process.pid}-101-def`), "in flight");
    const out = installUserLora(write("fresh.safetensors", "weights"), dir);
    expect(out.ok).toBe(true);
    expect(existsSync(join(dir, ".corpse.safetensors.part-999999-100-abc"))).toBe(false);
    expect(existsSync(join(dir, `.live.safetensors.part-${process.pid}-101-def`))).toBe(true);
  });

  it("THE ATOMIC LANDING (audit I-E4, 2026-10-22): a failed write leaves no part file and no final name; a landed write leaves no part file either", () => {
    // The failure leg: the loras dir exists as a READ-ONLY directory,
    // so mkdirSync no-ops and the write itself throws EACCES — the
    // door must answer ok:false AND leave nothing behind (no
    // truncated final file, no stray .part-*).
    const dir = join(root, "ro-loras");
    mkdirSync(dir);
    chmodSync(dir, 0o555);
    try {
      const out = installUserLoraBuffer("torn.safetensors", new TextEncoder().encode("weights"), dir);
      expect(out.ok).toBe(false);
      expect(out).toMatchObject({ reason: expect.stringMatching(/writing into .* failed/u) });
      expect(existsSync(join(dir, "torn.safetensors"))).toBe(false);
      expect(readdirSync(dir).filter((f) => f.includes(".part-"))).toEqual([]);
    } finally {
      chmodSync(dir, 0o755);
    }
    // The success leg: the final name carries the bytes and the part
    // file is gone — rename, not a copy that could tear.
    const okDir = join(root, "ok-loras");
    const bytes = new TextEncoder().encode("weights");
    const good = installUserLoraBuffer("good.safetensors", bytes, okDir);
    expect(good).toMatchObject({ ok: true, filename: "good.safetensors", bytes: 7 });
    expect(readFileSync(join(okDir, "good.safetensors"))).toEqual(Buffer.from(bytes));
    expect(readdirSync(okDir).filter((f) => f.includes(".part-"))).toEqual([]);
    // Two installs of the same name race to one COMPLETE file — the
    // loser's rename overwrites atomically, never interleaves.
    const a = installUserLoraBuffer("race.safetensors", new TextEncoder().encode("aaaa"), okDir);
    const b = installUserLoraBuffer("race.safetensors", new TextEncoder().encode("bbbbbb"), okDir);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    const landed = readFileSync(join(okDir, "race.safetensors"), "utf8");
    expect(["aaaa", "bbbbbb"]).toContain(landed);
    expect(readdirSync(okDir).filter((f) => f.includes(".part-"))).toEqual([]);
  });

  it("refuses when the copy cannot land, naming the directory", () => {
    const src = write("mine.safetensors", "weights");
    const blocker = write("blocker.txt", "x");
    const out = installUserLora(src, join(blocker, "loras"));
    expect(out).toMatchObject({ ok: false, reason: expect.stringMatching(/copy into .* failed/u) });
  });
});

describe("installUserLoraBytes — the uploads rail's data-URL spelling", () => {
  it("refuses a name it cannot carry", () => {
    for (const name of ["", "   ", ".", ".."]) {
      expect(installUserLoraBytes(name, "data:application/octet-stream;base64,AAA=", root), name).toMatchObject({
        ok: false,
        reason: expect.stringMatching(/filename is required/u),
      });
    }
    expect(installUserLoraBytes("notes.txt", "data:application/octet-stream;base64,AAA=", root)).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/is not a LoRA file/u),
    });
  });

  it("refuses a payload it will not take, before writing anything", () => {
    expect(installUserLoraBytes("a.safetensors", "not-a-data-url", root)).toMatchObject({ ok: false });
    expect(installUserLoraBytes("a.safetensors", "data:application/octet-stream;base64,@@@", root)).toMatchObject({ ok: false });
    // nothing landed for either refusal
    expect(existsSync(join(root, "a.safetensors"))).toBe(false);
  });

  it("refuses each mis-shaped data URL with its own naming", () => {
    // a comma but no base64 marker: the meta is spelled wrong
    expect(installUserLoraBytes("a.safetensors", "data:text/plain,QUJD", root)).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/only base64 data URLs/u),
    });
    // a base64 marker with no payload at all
    expect(installUserLoraBytes("a.safetensors", "data:application/octet-stream;base64,", root)).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/carried no bytes/u),
    });
    // all-junk payload decodes to zero bytes (Buffer.from never
    // throws on base64 — it skips what it does not know)
    expect(installUserLoraBytes("a.safetensors", "data:application/octet-stream;base64,@", root)).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/decoded to zero bytes/u),
    });
    expect(existsSync(join(root, "a.safetensors"))).toBe(false);
  });

  it("refuses an oversize upload BEFORE any decode, by its declared length", () => {
    // the transport's own length hint: an oversize upload must
    // never become a decode (the OOM door) — the refusal names the
    // copy-in alternative
    const out = installUserLoraBytes("a.safetensors", "data:application/octet-stream;base64,QUJD", root, 1024 * 1024 * 1024);
    expect(out).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/over the 512MB door cap .*copy it in from the machine/u),
    });
    expect(existsSync(join(root, "a.safetensors"))).toBe(false);
  });

  it("refuses when the engine's loras directory cannot be made, naming the write", () => {
    // a target under a plain FILE: mkdir cannot run there
    const blocker = write("blocker.txt", "x");
    const out = installUserLoraBytes("a.safetensors", "data:application/octet-stream;base64,QUJD", join(blocker, "loras"));
    expect(out).toMatchObject({ ok: false, reason: expect.stringMatching(/failed/u) });
  });

  it("writes the decoded bytes under the basename it was given", () => {
    const dir = join(root, "loras");
    const out = installUserLoraBytes("dir/one.safetensors", "data:application/octet-stream;base64,QUJD", dir);
    expect(out.ok).toBe(true);
    expect(out).toMatchObject({ filename: "one.safetensors", bytes: 3 });
    expect(readFileSync(join(dir, "one.safetensors"), "utf8")).toBe("ABC");
  });
});

describe("userLoraFlavor — the runtime catalog projection", () => {
  it("no rows is no flavor (nothing to offer)", () => {
    expect(userLoraFlavor({ path: "p", rows: [], problems: [], absent: true })).toBeNull();
  });

  it("unions the families across rows, sorted and deduped", () => {
    const flavor = userLoraFlavor({
      path: "p",
      problems: ["row 9: id is required"],
      absent: false,
      rows: [
        { id: "a", filename: "a.safetensors", families: ["z-image", "h3"] },
        { id: "b", filename: "b.bin", families: ["h3"] },
      ],
    });
    expect(flavor?.families).toEqual(["h3", "z-image"]);
    expect(flavor?.pack).toBe("loras");
    expect(flavor?.runtimeCatalog).toBe(true);
    expect(flavor?.rows.map((r) => r["id"])).toEqual(["a", "b"]);
    // the projection DROPS the per-row families key: the registration
    // carries families once, and the rows must typecheck as plain
    // catalog rows (a families key on a served row would be a second
    // truth about boarding)
    for (const row of flavor?.rows ?? []) {
      expect("families" in row).toBe(false);
    }
  });
});

// ── THE COMPOSED FLAVOR (2026-10-15) — the cure for the two-step
// door: the rows file at userLorasPath() registers through the
// engine's own mod plane (composeModPlane composes
// mods/userLorasFlavor.ts), so a user's rows serve with no patch
// file. These arms pin the module's apply() contract: absent file
// is a silent no-op (the shipped state), bad rows log their
// problems and the good ones still serve.
describe("userLorasFlavor (the composed registration — no patch file)", () => {
  type Registered = { pack: string; families: string[]; rows: unknown[] };
  const mount = (): { registered: Registered[]; logs: string[] } => {
    const registered: Registered[] = [];
    const logs: string[] = [];
    const ctx = {
      effect: (fn: () => () => void): (() => void) => fn(),
      comfyui: {
        registerFlavor: (flavor: Registered): (() => void) => {
          registered.push(flavor);
          return () => { registered.splice(registered.indexOf(flavor), 1); };
        },
      },
      logger: (): { warn: (m: string) => void; info: (m: string) => void } => ({
        warn: (m: string): void => { logs.push("warn: " + m); },
        info: (m: string): void => { logs.push("info: " + m); },
      }),
    };
    userLorasFlavor(ctx as never);
    return { registered, logs };
  };
  const withPath = (path: string, body: string | null, run: () => void): void => {
    const prev = process.env["MELITE_USER_LORAS"];
    process.env["MELITE_USER_LORAS"] = path;
    try {
      if (body !== null) writeFileSync(path, body, "utf8");
      run();
    } finally {
      if (prev === undefined) delete process.env["MELITE_USER_LORAS"];
      else process.env["MELITE_USER_LORAS"] = prev;
    }
  };

  it("an absent file registers nothing and logs nothing (the shipped state)", () => {
    withPath(join(root, "absent.json"), null, () => {
      const { registered, logs } = mount();
      expect(registered).toHaveLength(0);
      expect(logs).toHaveLength(0);
    });
  });

  it("rows register as a loras flavor through the compose's own ctx", () => {
    withPath(join(root, "rows.json"), JSON.stringify([
      { id: "mine", filename: "z-image/mine.safetensors", families: ["z-image"], label: "Mine" },
    ]), () => {
      const { registered, logs } = mount();
      expect(registered).toHaveLength(1);
      expect(registered[0]?.pack).toBe("loras");
      expect(registered[0]?.families).toEqual(["z-image"]);
      expect(logs.some((l) => /1 user row/.test(l))).toBe(true);
    });
  });

  it("a bad row logs its problem; the good row still serves", () => {
    withPath(join(root, "mixed.json"), JSON.stringify([
      { filename: "no-id.safetensors", families: ["h3"] },
      { id: "good", filename: "h3/good.safetensors", families: ["h3"] },
    ]), () => {
      const { registered, logs } = mount();
      expect(logs.some((l) => /warn: row refused/.test(l))).toBe(true);
      expect(registered).toHaveLength(1);
      expect(registered[0]?.rows.map((r) => (r as { id: string }).id)).toEqual(["good"]);
    });
  });

  it("a file whose rows all refuse registers nothing", () => {
    withPath(join(root, "allbad.json"), JSON.stringify([
      { filename: "no-id.safetensors", families: ["h3"] },
    ]), () => {
      const { registered, logs } = mount();
      expect(registered).toHaveLength(0);
      expect(logs.some((l) => /served no rows/.test(l))).toBe(true);
    });
  });

  it("userLorasPath is one spelling: the env override wins, the default is the repo file", () => {
    const prev = process.env["MELITE_USER_LORAS"];
    try {
      process.env["MELITE_USER_LORAS"] = "/tmp/elsewhere.json";
      expect(userLorasPath()).toBe("/tmp/elsewhere.json");
      delete process.env["MELITE_USER_LORAS"];
      expect(userLorasPath()).toBe("./data/loras/user-loras.json");
    } finally {
      if (prev === undefined) delete process.env["MELITE_USER_LORAS"];
      else process.env["MELITE_USER_LORAS"] = prev;
    }
  });
});

describe("installUserLoraBuffer — the binary door's raw-bytes spelling (2026-10-17)", () => {
  const PAYLOAD = new Uint8Array([0x53, 0x41, 0x46, 0x45]);

  it("writes the bytes through and answers name + count", () => {
    const dir = join(root, "loras");
    const out = installUserLoraBuffer("mine.safetensors", PAYLOAD, dir);
    expect(out.ok).toBe(true);
    expect(out).toMatchObject({ filename: "mine.safetensors", bytes: 4 });
    expect(readFileSync(join(dir, "mine.safetensors"))).toEqual(Buffer.from(PAYLOAD));
  });

  it("refuses the names and extensions the loader will not take", () => {
    for (const name of ["", "  ", ".", ".."]) {
      expect(installUserLoraBuffer(name, PAYLOAD, root), JSON.stringify(name)).toMatchObject({
        ok: false,
        reason: expect.stringMatching(/filename is required/u),
      });
    }
    expect(installUserLoraBuffer("notes.txt", PAYLOAD, root)).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/is not a LoRA file/u),
    });
  });

  it("refuses empty and over-cap payloads before writing anything", () => {
    expect(installUserLoraBuffer("a.safetensors", new Uint8Array(0), root)).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/carried no bytes/u),
    });
    // a length past the 512MB cap, WITHOUT a real half-GB
    // allocation (a unit seat must stay CI-box-sized): the boundary
    // arm reads byteLength only — the refusal lands before any write
    const over: Uint8Array = new Proxy(new Uint8Array(1), {
      get: (t, k) => (k === "byteLength" ? LORA_BYTES_CAP + 1 : Reflect.get(t, k)),
    }) as Uint8Array;
    expect(installUserLoraBuffer("a.safetensors", over, root)).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/over the 512MB door cap/u),
    });
    expect(existsSync(join(root, "a.safetensors"))).toBe(false);
  });

  it("refuses loudly when the write cannot land, naming the directory", () => {
    const blocker = write("blocker.txt", "x");
    const out = installUserLoraBuffer("mine.safetensors", PAYLOAD, join(blocker, "loras"));
    expect(out).toMatchObject({ ok: false, reason: expect.stringMatching(/writing into .* failed/u) });
  });
});

describe("resolveEngineLorasDir — the ONE dir spelling every lora door reads", () => {
  it("the declared env override wins", () => {
    const prev = process.env["MELITE_COMFYUI_LORAS_DIR"];
    try {
      process.env["MELITE_COMFYUI_LORAS_DIR"] = "/opt/elsewhere/loras";
      expect(resolveEngineLorasDir({})).toBe("/opt/elsewhere/loras");
    } finally {
      if (prev === undefined) delete process.env["MELITE_COMFYUI_LORAS_DIR"];
      else process.env["MELITE_COMFYUI_LORAS_DIR"] = prev;
    }
  });

  it("without the env, the endpoint's model base + loras answers", () => {
    const prev = process.env["MELITE_COMFYUI_LORAS_DIR"];
    try {
      delete process.env["MELITE_COMFYUI_LORAS_DIR"];
      expect(resolveEngineLorasDir({ model_base_path: "/srv/models" })).toBe(join("/srv/models", "loras"));
      // nothing declared answers null — never a guessed path
      expect(resolveEngineLorasDir({})).toBe(null);
      expect(resolveEngineLorasDir({ model_base_path: 7 })).toBe(null);
    } finally {
      if (prev === undefined) delete process.env["MELITE_COMFYUI_LORAS_DIR"];
      else process.env["MELITE_COMFYUI_LORAS_DIR"] = prev;
    }
  });
});

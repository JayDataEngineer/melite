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
  loraNamesFromObjectInfo,
  readUserLoraRows,
  unboardedRows,
  userLoraFlavor,
  validateUserLoraRow,
} from "../src/userLoras.ts";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
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
  });
});

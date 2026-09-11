// runs-list.spec.ts — the restore-port row law: runArtifacts emits
// the estate's full media vocab (incl. "model" — the img-to-mesh
// lane's GLB rows), and runRowOrNull admits those rows. A
// model-only completed run MUST list: runs/list adoption
// (fetchLatestRunForDraft) is the reload-proof zoom path, and the
// image-era refusal dropped every model run from it. Non-media
// rows ("spec") still refuse the whole run — the gate keeps teeth.
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  artifactType,
  firstQuery,
  listRuns,
  mediaCandidates,
  parseIntPy,
  runArtifacts,
  runDirHasMedia,
  runRowOrNull,
  runThumbnail,
  sidecarNum,
  sidecarStr,
  sidecarStrFound,
  strtolPy,
} from "../src/runsList.ts";

let TMP = "";
afterEach(() => {
  if (TMP !== "") {
    for (const d of TMP.split(":")) {
      try {
        chmodSync(d, 0o755);
      } catch {
        /* gone */
      }
      rmSync(d, { recursive: true, force: true });
    }
    TMP = "";
  }
});
const tmp = (): string => {
  const d = mkdtempSync(join(tmpdir(), "runs-list-"));
  TMP = TMP === "" ? d : TMP + ":" + d;
  return d;
};
const bytes = (s: string): Uint8Array => Buffer.from(s, "utf8");

function modelRunDir(): string {
  const dir: string = mkdtempSync(join(tmpdir(), "runs-list-model-"));
  writeFileSync(join(dir, "_flow.json"), '{"status":"completed"}');
  writeFileSync(join(dir, "_request.json"), "{}");
  mkdirSync(join(dir, "img-to-mesh"));
  writeFileSync(join(dir, "img-to-mesh", "trellis2_native_00002.glb"), "glb-bytes");
  return dir;
}

function stamp(
  artifacts: Record<string, unknown>[],
): Parameters<typeof runRowOrNull>[0] {
  return {
    run_id: "run-d53efe52c7ea-9237220c",
    name: "trellis2-native",
    flow: "trellis2-native",
    status: "completed",
    created_at: 1789159481,
    prompt: "",
    seed: 42,
    thumbnail: "",
    artifacts,
    params: { seed: 42 },
    draft_id: "bench-main",
  };
}

describe("runArtifacts model rows", () => {
  it("a model-only run dir emits one 6-key model row", () => {
    const arts = runArtifacts(modelRunDir(), "./output/run-x");
    assert.equal(arts.length, 1);
    const row = arts[0] as Record<string, unknown>;
    assert.equal(row["type"], "model");
    assert.deepEqual(Object.keys(row).sort(), [
      "bytes",
      "name",
      "path",
      "size",
      "type",
      "url",
    ]);
  });
});

describe("runRowOrNull model rows", () => {
  it("the img-to-mesh stamp lists (the adoption row)", () => {
    const arts = runArtifacts(modelRunDir(), "./output/run-x");
    const row = runRowOrNull(stamp(arts));
    assert.notEqual(row, null);
    assert.equal(
      (row as Record<string, unknown>)["run_id"],
      "run-d53efe52c7ea-9237220c",
    );
  });

  it("image rows still list", () => {
    const row = runRowOrNull(
      stamp([
        {
          name: "gen_00001_.png",
          path: "./output/run-x/generate/gen_00001_.png",
          bytes: 10,
          url: "run-x/generate/gen_00001_.png",
          type: "image",
          size: 10,
        },
      ]),
    );
    assert.notEqual(row, null);
  });

  it("non-media rows still refuse the whole run", () => {
    const row = runRowOrNull(
      stamp([
        {
          name: "tool.json",
          path: "./output/run-x/tool.json",
          bytes: 2,
          url: "run-x/tool.json",
          type: "spec",
          size: 2,
        },
      ]),
    );
    assert.equal(row, null);
  });
});

describe("strtolPy + sidecarNum", () => {
  it("scans the C idiom (spaces, sign, digits; 0 when no digits lead)", () => {
    assert.equal(strtolPy("  -12x"), -12);
    assert.equal(strtolPy("+5"), 5);
    assert.equal(strtolPy("42"), 42);
    assert.equal(strtolPy("abc"), 0);
    assert.equal(strtolPy(""), 0);
    assert.equal(strtolPy("  +"), 0);
    assert.equal(sidecarNum('{"created": 42}', "created", 0), 42);
    assert.equal(sidecarNum('{"created":  -7}', "created", 0), -7);
    assert.equal(sidecarNum('{"created_at": 9}', "created", 7), 7);
    assert.equal(sidecarNum('{}', "created", 7), 7);
  });
});

describe("sidecarStr", () => {
  it("reads the byte idiom (skips blanks, stops at the quote)", () => {
    assert.equal(sidecarStr(bytes('{"pipeline": "flow_inline"}'), "pipeline", 64), "flow_inline");
    assert.equal(sidecarStr(bytes('{"pipeline":\t "x"}'), "pipeline", 64), "x");
    assert.equal(sidecarStr(bytes('{"pipeline": 5}'), "pipeline", 64), "");
    assert.equal(sidecarStr(bytes('{"a": "abc'), "a", 64), "abc");
    assert.equal(sidecarStr(bytes('{"a":""}'), "a", 64), "");
    assert.equal(sidecarStr(bytes('{"b": "x"}'), "a", 64), "");
    // a longer key sharing the prefix never misfires the scan.
    assert.equal(sidecarStr(bytes('{"pipelinex": "y", "pipeline": "z"}'), "pipeline", 64), "z");
  });

  it("decodes the C escapes (unknown rides literally, \\u stays u)", () => {
    assert.equal(
      sidecarStr(bytes('{"a":"A\\nB\\rc\\td\\"e\\\\f\\ug"}'), "a", 64),
      'A\nB\rc\td"e\\fug',
    );
    // a trailing backslash swallows the closing quote (C parity).
    assert.equal(sidecarStr(bytes('{"a":"ab\\"'), "a", 64), 'ab"');
  });

  it("caps in BYTES (multibyte chars split mid-rune)", () => {
    assert.equal(sidecarStr(bytes('{"a":"abcdef"}'), "a", 4), "abc");
    assert.equal(sidecarStr(bytes('{"a":"éx"}'), "a", 3), "é");
    assert.equal(sidecarStr(bytes('{"a":"éx"}'), "a", 2), "�");
  });
});

describe("sidecarStrFound", () => {
  it("splits absent/non-string from present (even empty)", () => {
    assert.deepEqual(sidecarStrFound(bytes("{}"), "status", 16), [false, ""]);
    assert.deepEqual(sidecarStrFound(bytes('{"status": 5}'), "status", 16), [false, ""]);
    assert.deepEqual(sidecarStrFound(bytes('{"status": ""}'), "status", 16), [true, ""]);
    assert.deepEqual(sidecarStrFound(bytes('{"status": "x"}'), "status", 16), [true, "x"]);
    assert.deepEqual(sidecarStrFound(bytes('{"status": "a\\nb\\rc\\td"}'), "status", 64), [true, "a\nb\rc\td"]);
    assert.deepEqual(sidecarStrFound(bytes('{"status": "a\\ub"}'), "status", 64), [true, "aub"]);
    assert.deepEqual(sidecarStrFound(bytes('{"status": "abcdef"}'), "status", 4), [true, "abc"]);
  });
});

describe("artifactType", () => {
  it("classifies the estate vocab (case washes, the unknown rides file)", () => {
    assert.deepEqual(
      ["a.png", "A.JPG", "s.svg", "v.mp4", "a.wav", "m.glb", "r.json", "p.md", "x", "e.exe"].map(artifactType),
      ["image", "image", "image", "video", "audio", "model", "spec", "text", "file", "file"],
    );
  });
});

describe("mediaCandidates", () => {
  it("lists top files + one level (byte order, _ skipped, dirs never rows)", () => {
    const root = tmp();
    writeFileSync(join(root, "b.png"), "b");
    writeFileSync(join(root, "A.mp3"), "a");
    writeFileSync(join(root, "_flow.json"), "{}");
    writeFileSync(join(root, "plain"), "f");
    mkdirSync(join(root, "gen"));
    writeFileSync(join(root, "gen", "x.png"), "x");
    writeFileSync(join(root, "gen", "_y.png"), "y");
    mkdirSync(join(root, "gen", "deep"));
    writeFileSync(join(root, "gen", "deep", "z.png"), "z");
    const rels = mediaCandidates(root).map((c) => c.rel);
    // (tops first in byte order, then the one-level subs — two loops.)
    assert.deepEqual(rels, ["A.mp3", "b.png", "plain", "gen/x.png"]);
  });

  it("an unreadable root lists nothing; an unreadable sub is skipped", () => {
    const root = tmp();
    assert.deepEqual(mediaCandidates(join(root, "missing")), []);
    mkdirSync(join(root, "sub"));
    writeFileSync(join(root, "sub", "x.png"), "x");
    chmodSync(join(root, "sub"), 0o000);
    try {
      assert.deepEqual(mediaCandidates(root).map((c) => c.rel), []);
    } finally {
      chmodSync(join(root, "sub"), 0o755);
    }
  });
});

describe("runArtifacts", () => {
  it("caps images (the truncated marker rides last), counts the rest, skips the docs", () => {
    const root = tmp();
    for (let i = 0; i < 5; i++) writeFileSync(join(root, "i" + i + ".png"), "img");
    writeFileSync(join(root, "v.mp4"), "v");
    writeFileSync(join(root, "a.wav"), "a");
    writeFileSync(join(root, "m.glb"), "m");
    writeFileSync(join(root, "s.svg"), "svg");
    writeFileSync(join(root, "tool.json"), "{}");
    writeFileSync(join(root, "n.txt"), "n");
    writeFileSync(join(root, "noext"), "n");
    const arts = runArtifacts(root, "./output/run-x") as Record<string, unknown>[];
    const kinds = arts.map((a) => a["type"]);
    assert.deepEqual(kinds, ["audio", "image", "image", "image", "model", "video", undefined]);
    assert.deepEqual(arts[arts.length - 1], { truncated: true, listed: 6, total: 9 });
    const img = arts[1] as Record<string, unknown>;
    assert.equal(img["name"], "i0.png");
    assert.equal(img["path"], "./output/run-x/i0.png");
    assert.equal(img["url"], "run-x/i0.png");
    assert.equal(img["bytes"], 3);
  });

  it("the literal without a slash rides whole; dangling links read -1", () => {
    const root = tmp();
    writeFileSync(join(root, "b.png"), "bb");
    symlinkSync(join(root, "ghost.png"), join(root, "link.png"));
    const arts = runArtifacts(root, "run-x") as Record<string, unknown>[];
    assert.equal(arts.length, 2);
    assert.equal(arts[0]!["url"], "run-x/b.png");
    assert.equal(arts[1]!["bytes"], -1);
  });
});

describe("runThumbnail", () => {
  it("the cached poster wins, else the first image, else nothing", () => {
    const root = tmp();
    assert.equal(runThumbnail(root, "run-x"), "");
    writeFileSync(join(root, "v.mp4"), "v");
    mkdirSync(join(root, "gen"));
    writeFileSync(join(root, "gen", "x.png"), "x");
    assert.equal(runThumbnail(root, "run-x"), "run-x/gen/x.png");
    writeFileSync(join(root, "_poster.jpg"), "p");
    assert.equal(runThumbnail(root, "run-x"), "run-x/_poster.jpg");
  });
});

describe("runDirHasMedia", () => {
  it("reads the py absences (no _ skip, no inner isdir check, gallery sets only)", () => {
    const root = tmp();
    assert.equal(runDirHasMedia(root), false);
    writeFileSync(join(root, "s.svg"), "s");
    assert.equal(runDirHasMedia(root), false);
    writeFileSync(join(root, "_poster.jpg"), "p");
    assert.equal(runDirHasMedia(root), true);
    const nested = join(tmp(), "n");
    mkdirSync(join(nested, "sub"), { recursive: true });
    writeFileSync(join(nested, "sub", "note.txt"), "t");
    writeFileSync(join(nested, "sub", "x.png"), "x");
    assert.equal(runDirHasMedia(nested), true);
    const dirAsMedia = join(tmp(), "d");
    mkdirSync(join(dirAsMedia, "sub"), { recursive: true });
    mkdirSync(join(dirAsMedia, "sub", "x.mp4"));
    assert.equal(runDirHasMedia(dirAsMedia), true);
    assert.equal(runDirHasMedia(join(root, "missing")), false);
  });

  it("an unreadable sub never fails the scan", () => {
    const root = tmp();
    writeFileSync(join(root, "plain"), "f");
    mkdirSync(join(root, "sub"));
    writeFileSync(join(root, "sub", "x.png"), "x");
    chmodSync(join(root, "sub"), 0o000);
    try {
      assert.equal(runDirHasMedia(root), false);
    } finally {
      chmodSync(join(root, "sub"), 0o755);
    }
  });
});

describe("runRowOrNull gates", () => {
  const art = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    name: "gen_00001_.png",
    path: "./output/run-x/generate/gen_00001_.png",
    bytes: 10,
    url: "run-x/generate/gen_00001_.png",
    type: "image",
    size: 10,
    ...over,
  });
  const row = (over: Record<string, unknown> = {}): Parameters<typeof runRowOrNull>[0] => ({
    run_id: "run-d53efe52c7ea-9237220c",
    name: "trellis2-native",
    flow: "trellis2-native",
    status: "completed",
    created_at: 1789159481,
    prompt: "",
    seed: 42,
    thumbnail: "",
    artifacts: [art()],
    params: { seed: 42 },
    draft_id: "bench-main",
    ...over,
  });
  it("refuses ids, statuses, stamps and artifact rows (queued never lists)", () => {
    assert.ok(runRowOrNull(row()) !== null);
    assert.equal(runRowOrNull(row({ run_id: "x" })), null);
    assert.equal(runRowOrNull(row({ status: "queued" })), null);
    assert.equal(runRowOrNull(row({ status: "weird" })), null);
    assert.equal(runRowOrNull(row({ created_at: -1 })), null);
    assert.equal(runRowOrNull(row({ created_at: 1.5 })), null);
    assert.equal(runRowOrNull(row({ seed: 1.5 })), null);
    assert.equal(runRowOrNull(row({ seed: "42" })), null);
    assert.equal(runRowOrNull(row({ artifacts: [art({ type: "spec" })] })), null);
    assert.equal(runRowOrNull(row({ artifacts: [art({ bytes: -1 })] })), null);
    assert.equal(runRowOrNull(row({ artifacts: [art({ name: "" })] })), null);
    assert.equal(runRowOrNull(row({ artifacts: [art({ size: "x" })] })), null);
    assert.equal(runRowOrNull(row({ artifacts: [["x"]] })), null);
    const short = art() as Record<string, unknown>;
    delete short["size"];
    assert.equal(runRowOrNull(row({ artifacts: [short] })), null);
    assert.equal(runRowOrNull(row({ artifacts: [{ truncated: true, listed: 2 }] })), null);
    assert.equal(runRowOrNull(row({ artifacts: [{ truncated: false, listed: 1, total: 2 }] })), null);
    assert.equal(runRowOrNull(row({ artifacts: [{ truncated: true, listed: -1, total: 2 }] })), null);
    assert.ok(runRowOrNull(row({ artifacts: [{ truncated: true, listed: 2, total: 3 }] })) !== null);
    assert.ok(runRowOrNull(row({ artifacts: [art({ type: "video" }), art({ type: "audio" }), art({ type: "model" })] })) !== null);
  });
});

describe("parseIntPy + firstQuery", () => {
  it("parses the py int (underscores ride, junk refuses)", () => {
    assert.equal(parseIntPy("10"), 10);
    assert.equal(parseIntPy(" 1_0 "), 10);
    assert.equal(parseIntPy("+5"), 5);
    assert.equal(parseIntPy("-3"), -3);
    assert.equal(parseIntPy("x"), null);
    assert.equal(parseIntPy(""), null);
    assert.equal(parseIntPy("1__0"), null);
    assert.equal(parseIntPy("1_"), null);
    assert.equal(parseIntPy("0x1"), null);
    assert.equal(parseIntPy("1.5"), null);
  });

  it("the first non-blank wins (urllib parity)", () => {
    assert.equal(firstQuery({}, "limit", "d"), "d");
    assert.equal(firstQuery({ limit: ["", "5", "6"] }, "limit", "d"), "5");
    assert.equal(firstQuery({ limit: ["", ""] }, "limit", "d"), "d");
  });
});

describe("listRuns envelope", () => {
  const sidecar = (over: Record<string, unknown> = {}): string =>
    JSON.stringify({
      status: "completed",
      pipeline: "flow_inline",
      prompt: "hi",
      draft_id: "d1",
      seed: 7,
      created_at: 100,
      ...over,
    });
  const populate = (state: string): void => {
    const out = join(state, "output");
    const put = (name: string, flow: string | null, media: boolean): void => {
      mkdirSync(join(out, name), { recursive: true });
      if (flow !== null) writeFileSync(join(out, name, "_flow.json"), flow);
      if (media) writeFileSync(join(out, name, "a.png"), "img");
    };
    put("run-good", sidecar(), true);
    put("run-nofile", null, false);
    put("run-zombie", sidecar({ status: "running", created: 50, created_at: undefined, seed: undefined }), false);
    put("run-err", sidecar({ status: "error", created: 60, created_at: 60 }), false);
    put("run-nostatus", "{}", false);
    put("run-empty-status", sidecar({ status: "" }), false);
    put("run-private", sidecar({ pipeline: "_hidden" }), false);
    put("run-BAD!", sidecar(), false);
    mkdirSync(join(out, "notes"), { recursive: true });
  };
  it("a missing root lists nothing", async () => {
    assert.deepEqual(await listRuns(join(tmp(), "missing"), 10, async () => true), {
      count: 0,
      runs: [],
    });
  });

  it("the media ent sorts first even when it reads first (the comparator's b road)", async () => {
    // (V8 compares pivot-first — a lone media ent only ever rides
    // the a road; the media-first pair forces the b road.)
    const state = tmp();
    const out = join(state, "output");
    mkdirSync(join(out, "run-aaa"), { recursive: true });
    writeFileSync(join(out, "run-aaa", "_flow.json"), sidecar());
    writeFileSync(join(out, "run-aaa", "a.png"), "img");
    mkdirSync(join(out, "run-bbb"), { recursive: true });
    writeFileSync(join(out, "run-bbb", "_flow.json"), sidecar());
    const { count, runs } = await listRuns(state, 5, async () => true);
    assert.equal(count, 2);
    assert.deepEqual(
      runs.map((r) => r["run_id"]),
      ["run-aaa", "run-bbb"],
    );
  });

  it("scans, sorts media-first + newest, skips-but-counts refusals", async () => {
    const state = tmp();
    populate(state);
    const { count, runs } = await listRuns(state, 500, async (id) => id === "d1");
    assert.equal(count, 8);
    assert.deepEqual(
      runs.map((r) => r["run_id"]),
      ["run-good", "run-err", "run-zombie", "run-nofile", "run-nostatus"],
    );
    const good = runs[0] as Record<string, unknown>;
    assert.equal(good["status"], "completed");
    assert.equal(good["prompt"], "hi");
    assert.equal(good["draft_id"], "d1");
    assert.deepEqual(good["params"], { seed: 7 });
    assert.equal(good["thumbnail"], "run-good/a.png");
    assert.equal((good["artifacts"] as unknown[]).length, 1);
    const err = runs[1] as Record<string, unknown>;
    assert.equal(err["status"], "failed");
    assert.equal(err["created_at"], 60);
    const zombie = runs[2] as Record<string, unknown>;
    assert.equal(zombie["status"], "failed");
    assert.equal(zombie["created_at"], 50);
    assert.deepEqual(zombie["params"], { seed: -1 });
    const nofile = runs[3] as Record<string, unknown>;
    // (no sidecar file at all reads the "success" default — only a
    // present-but-keyless sidecar reads "unknown".)
    assert.equal(nofile["status"], "success");
    // the orphan draft clears (never the row).
    const { runs: ghosted } = await listRuns(state, 500, async () => false);
    assert.equal((ghosted[0] as Record<string, unknown>)["draft_id"], "");
  });

  it("the limit slices (count still counts every dir)", async () => {
    const state = tmp();
    populate(state);
    // (the slice rides the sorted list — the two loud-skips sort high.)
    const { count, runs } = await listRuns(state, 5, async () => true);
    assert.equal(count, 8);
    assert.equal(runs.length, 2);
    assert.equal(runs[0]!["run_id"], "run-good");
  });

  it("the 8192 collected cap holds", async () => {
    const state = tmp();
    const out = join(state, "output");
    mkdirSync(out, { recursive: true });
    for (let i = 0; i < 8195; i++) {
      mkdirSync(join(out, "run-" + String(i).padStart(5, "0")));
    }
    const { count, runs } = await listRuns(state, 3, async () => true);
    assert.equal(count, 8192);
    assert.equal(runs.length, 3);
  }, 240000);
});

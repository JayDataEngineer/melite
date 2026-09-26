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
  listRunsAcross,
  mediaCandidates,
  parseIntOrNull,
  runArtifacts,
  runDirHasMedia,
  runRowOrNull,
  runThumbnail,
  sidecarNum,
  sidecarStr,
  sidecarStrFound,
  parseLeadingInt,
} from "../src/runsList.ts";
// The picker half of the depth wall (wall 8): listMedia is the media
// package's own door — imported from source, never the built lib.
import { listMedia } from "../../../estate/media/src/index.ts";

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

  it("THE EXPORT CARRY (the FULL PATH): export_name + export_path ride the list row verbatim; absent stamps stay absent", () => {
    const withPath = runRowOrNull({
      ...stamp([]),
      export_name: "night-keeper",
      export_path: "/mnt/data/models/audio/voices/night-keeper_17.qvoice",
    }) as Record<string, unknown>;
    assert.equal(withPath["export_name"], "night-keeper");
    assert.equal(
      withPath["export_path"],
      "/mnt/data/models/audio/voices/night-keeper_17.qvoice",
    );
    const bare = runRowOrNull(stamp([])) as Record<string, unknown>;
    assert.ok(!("export_name" in bare));
    assert.ok(!("export_path" in bare));
  });
});

describe("parseLeadingInt + sidecarNum", () => {
  it("scans the C idiom (spaces, sign, digits; 0 when no digits lead)", () => {
    assert.equal(parseLeadingInt("  -12x"), -12);
    assert.equal(parseLeadingInt("+5"), 5);
    assert.equal(parseLeadingInt("42"), 42);
    assert.equal(parseLeadingInt("abc"), 0);
    assert.equal(parseLeadingInt(""), 0);
    assert.equal(parseLeadingInt("  +"), 0);
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
    // a trailing backslash swallows the closing quote (the scanner keeps it).
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

  it("the engine film leads H3 media before audio and window artifacts", () => {
    const root = tmp();
    for (const name of [
      "h3_t4_w1_00001_.mp4",
      "h3_t4_film_audio_00001.flac",
      "h3_t4_film_00002_.mp4",
    ]) writeFileSync(join(root, name), name);
    const arts = runArtifacts(root, "run-x") as Record<string, unknown>[];
    assert.deepEqual(arts.map((art) => art["name"]), [
      "h3_t4_film_00002_.mp4",
      "h3_t4_film_audio_00001.flac",
      "h3_t4_w1_00001_.mp4",
    ]);
  });

  it("the literal without a slash rides whole; dangling links DROP (a dead artifact never kills the row)", () => {
    const root = tmp();
    writeFileSync(join(root, "b.png"), "bb");
    symlinkSync(join(root, "ghost.png"), join(root, "link.png"));
    const arts = runArtifacts(root, "run-x") as Record<string, unknown>[];
    // stroke 82: a -1 bytes row fed artifactRowOk's row-refusal —
    // one dangling link erased the WHOLE run from runs/list. The
    // dead candidate drops instead; the row survives.
    assert.equal(arts.length, 1);
    assert.equal(arts[0]!["url"], "run-x/b.png");
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

describe("parseIntOrNull + firstQuery", () => {
  it("parses the py int (underscores ride, junk refuses)", () => {
    assert.equal(parseIntOrNull("10"), 10);
    assert.equal(parseIntOrNull(" 1_0 "), 10);
    assert.equal(parseIntOrNull("+5"), 5);
    assert.equal(parseIntOrNull("-3"), -3);
    assert.equal(parseIntOrNull("x"), null);
    assert.equal(parseIntOrNull(""), null);
    assert.equal(parseIntOrNull("1__0"), null);
    assert.equal(parseIntOrNull("1_"), null);
    assert.equal(parseIntOrNull("0x1"), null);
    assert.equal(parseIntOrNull("1.5"), null);
  });

  it("the first non-blank wins", () => {
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
  it("stroke-82: a bulky sidecar payload never zombies the identity keys (the 8191 slice)", async () => {
    // The sidecar's key order puts the identity scalars FIRST
    // (stroke 82); a stages/error payload past 8K used to push
    // pipeline/draft_id/created_at past the slice window and the
    // row listed degraded (empty pipeline, draft cleared, 0 age).
    const state = tmp();
    const out = join(state, "output");
    mkdirSync(join(out, "run-fat"), { recursive: true });
    writeFileSync(
      join(out, "run-fat", "_flow.json"),
      JSON.stringify({
        run_id: "run-fat",
        status: "completed",
        created_at: 1234567890,
        test: false,
        draft_id: "d-fat",
        pipeline: "flow_inline",
        error: "",
        stages: [{ id: "s", blob: "x".repeat(9000) }],
        skipped_stages: [],
        artifacts: [],
        graph: [],
      }),
    );
    const { count, runs } = await listRuns(state, 10, async () => true);
    assert.equal(count, 1);
    const row = runs[0] as Record<string, unknown>;
    assert.equal(row["flow"], "flow_inline");
    assert.equal(row["draft_id"], "d-fat");
    assert.equal(row["created_at"], 1234567890);
  });

  it("a missing root lists nothing", async () => {
    assert.deepEqual(await listRuns(join(tmp(), "missing"), 10, async () => true), {
      count: 0,
      runs: [],
    });
  });

  it("carries export stamps when the sidecar declares them", async () => {
    const state = tmp();
    const dir = join(state, "output", "run-export");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "_flow.json"), JSON.stringify({
      status: "completed",
      pipeline: "voice",
      prompt: "hello",
      seed: 7,
      created_at: 100,
      export_name: "night-keeper",
      export_path: "/mnt/voices/night-keeper.qvoice",
    }));
    const { runs } = await listRuns(state, 10, async () => true);
    assert.equal(runs.length, 1);
    assert.equal(runs[0]!["export_name"], "night-keeper");
    assert.equal(runs[0]!["export_path"], "/mnt/voices/night-keeper.qvoice");
  });

  it("serves the first manifest row when run ids collide", async () => {
    const first = tmp();
    const second = tmp();
    for (const [state, pipeline] of [[first, "first"], [second, "second"]] as const) {
      const dir = join(state, "output", "run-same");
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "_flow.json"), JSON.stringify({
        status: "completed",
        pipeline,
        seed: 1,
        created_at: 1,
      }));
    }
    const result = await listRunsAcross([first, second], 10, async () => true);
    assert.equal(result.count, 2);
    assert.equal(result.runs.length, 1);
    assert.equal(result.runs[0]!["flow"], "first");
    assert.equal(result.runs[0]!["served_from"], first);
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

  it("a dangling symlink drops its candidate, never the row (the listRuns half)", async () => {
    // The runArtifacts half rides the "dangling links DROP" wall
    // above; this is the envelope half: a finished run whose dir
    // holds one good png plus one dangling png link still lists,
    // carrying exactly the good artifact.
    const state = tmp();
    const dir = join(state, "output", "run-dangle");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "_flow.json"),
      JSON.stringify({
        status: "completed",
        pipeline: "flow_inline",
        prompt: "hi",
        draft_id: "d1",
        seed: 7,
        created_at: 100,
      }),
    );
    writeFileSync(join(dir, "good.png"), "img");
    symlinkSync(join(dir, "ghost.png"), join(dir, "link.png"));
    const { count, runs } = await listRuns(state, 10, async () => true);
    assert.equal(count, 1);
    assert.equal(runs.length, 1);
    const arts = (runs[0] as Record<string, unknown>)["artifacts"] as Record<string, unknown>[];
    assert.equal(arts.length, 1);
    assert.equal(arts[0]!["name"], "good.png");
    assert.ok((arts[0]!["bytes"] as number) >= 0, "no dead -1 candidate rides the row");
  });

  it("the depth law diverges on purpose: listMedia browses depth 3, rows state depth 2", async () => {
    // DELIBERATE DIVERGENCE (stroke 82): the picker browses every
    // file the byte route can SERVE (listMedia walks run/stage/file
    // — depth 3, and parseTarget has no depth cap, so l1/l2/deep.png
    // serves), while the restore-port rows state the artifact
    // CONVENTION (mediaCandidates walks top + one level only — depth
    // 2, the editor_runs.py one-level law). A 2-deep file is browsed
    // but never rowed.
    const state = tmp();
    const dir = join(state, "output", "run-aaa1-deep");
    mkdirSync(join(dir, "l1", "l2"), { recursive: true });
    writeFileSync(join(dir, "l1", "l2", "deep.png"), "d");
    writeFileSync(
      join(dir, "_flow.json"),
      JSON.stringify({
        status: "completed",
        pipeline: "flow_inline",
        prompt: "hi",
        draft_id: "d1",
        seed: 7,
        created_at: 100,
      }),
    );
    // Half one: the picker advertises the 2-deep file.
    const { count, items } = await listMedia(state, "all");
    assert.equal(count, 1);
    assert.deepEqual(
      items.map((i) => i.name),
      ["l1/l2/deep.png"],
    );
    assert.equal(items[0]?.runId, "run-aaa1-deep");
    // Half two: the row convention never carries it.
    assert.deepEqual(mediaCandidates(dir).map((c) => c.rel), []);
    assert.deepEqual(runArtifacts(dir, "./output/run-aaa1-deep"), []);
    const { runs } = await listRuns(state, 10, async () => true);
    assert.equal(runs.length, 1);
    assert.deepEqual((runs[0] as Record<string, unknown>)["artifacts"], []);
  });
});

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
  noteRunTreeChanged,
  parseIntOrNull,
  runArchivedArtifacts,
  runArtifacts,
  runDirHasMedia,
  runRowOrNull,
  runThumbnail,
  sidecarNum,
  sidecarBool,
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
      // json/md/txt/csv are TEXT now (the tagger stroke, 2026-10-24):
      // the private spec/text split minted types the list loop then
      // dropped — a tags.txt never rode a run row.
      ["image", "image", "image", "video", "audio", "model", "text", "text", "file", "file"],
    );
  });

  it("THE TEXT MINTS classify text (SaveText's own emitted spellings)", () => {
    assert.equal(artifactType("SaveText.0_tags_00001.txt"), "text");
    assert.equal(artifactType("tags.csv"), "text");
    assert.equal(artifactType("README.md"), "text");
    assert.equal(artifactType("result.json"), "text");
    assert.equal(artifactType("notes.yaml"), "file");
  });
});

describe("THE TEXT ROW (the tagger repair, 2026-10-24)", () => {
  it("a tags.txt artifact row passes the gate — text lists in the runs feed", () => {
    const row = runRowOrNull(
      stamp([
        {
          name: "SaveText.0_tags_00001.txt",
          path: "./output/run-x/tagger/SaveText.0_tags_00001.txt",
          bytes: 10,
          url: "run-x/tagger/SaveText.0_tags_00001.txt",
          type: "text",
          size: 10,
        },
      ]),
    );
    assert.notEqual(row, null);
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
  it("caps images (the truncated marker rides last); docs list as text now (the tagger repair)", () => {
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
    // byte order: a.wav, i0-i4 (capped at 3), m.glb, n.txt, [noext
    // skips], s.svg (image, capped out), tool.json, v.mp4 — json and
    // txt LIST as text now; before the text stroke they were "docs"
    // the loop dropped, so a tagger run's product never rode a row.
    assert.deepEqual(kinds, ["audio", "image", "image", "image", "model", "text", "text", "video", undefined]);
    assert.deepEqual(arts[arts.length - 1], { truncated: true, listed: 8, total: 11 });
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
  it("the cached poster wins, else a video render leads, else the first still, else nothing", () => {
    // THE WITNESS LAW (F32 cure, 2026-11-13): a video-carrying run's
    // face is its video. The old law put the first image first, and a
    // reshoot run's first image is a WITNESS plate (raw warp, magenta
    // disocclusions) — the operator's pink preview beside a film that
    // measured 0.00 % magenta. A still is the face only where no video
    // exists (every image-only run).
    const root = tmp();
    assert.equal(runThumbnail(root, "run-x"), "");
    writeFileSync(join(root, "v.mp4"), "v");
    mkdirSync(join(root, "gen"));
    writeFileSync(join(root, "gen", "x.png"), "x");
    assert.equal(runThumbnail(root, "run-x"), "run-x/v.mp4");
    rmSync(join(root, "v.mp4"));
    assert.equal(runThumbnail(root, "run-x"), "run-x/gen/x.png");
    writeFileSync(join(root, "_poster.jpg"), "p");
    assert.equal(runThumbnail(root, "run-x"), "run-x/_poster.jpg");
  });

  // THE PREVIEWS CURE class 2 (operator 2026-11-12: "the preview
  // images all inaccurate"): video-only h3 runs found no image
  // candidate and served thumbnail '' — every window tile painted
  // frame 0 of an intermediate segment with nothing naming it. A
  // video-only run keeps a face: the ENGINE FILM leads (the
  // in-graph assembly's product, wherever it sits), else the first
  // video candidate.
  it("a video-only run keeps a face — the engine film leads, else the first video", () => {
    const root = tmp();
    mkdirSync(join(root, "h3-film"));
    writeFileSync(join(root, "h3-film", "h3_t4_w1_00057_.mp4"), "v");
    writeFileSync(join(root, "h3-film", "h3_t4_w2_00114_.mp4"), "v");
    mkdirSync(join(root, "h3-final"));
    writeFileSync(join(root, "h3-final", "h3_t4_film_00114_.mp4"), "v");
    // the engine film wins though its dir sorts AFTER the windows'
    assert.equal(runThumbnail(root, "run-x"), "run-x/h3-final/h3_t4_film_00114_.mp4");
    rmSync(join(root, "h3-final"), { recursive: true });
    // window-only: the first video candidate keeps the face at all
    assert.equal(runThumbnail(root, "run-x"), "run-x/h3-film/h3_t4_w1_00057_.mp4");
  });

  // THE F32 CURE (report round 7, operator-visible): a reshoot run
  // saves WITNESS stills beside its film — the raw warp plate the
  // guide pins carries magenta disocclusions, and the first-image
  // rule painted the tile with it (8.8 % pink) while the FILM itself
  // measured 0.00 %. The deliverable leads: a film-named video wins
  // over any still; witnesses keep their face only when no film
  // exists.
  it("a run whose stills are witnesses serves its FILM, never the witness plate", () => {
    const root = tmp();
    mkdirSync(join(root, "h3-film"));
    writeFileSync(join(root, "h3-film", "h3_t4_w1_00057_.mp4"), "v");
    writeFileSync(join(root, "reshoot_warp_00001_.png"), "p");
    writeFileSync(join(root, "reshoot_orbit_00001_.png"), "p");
    assert.equal(runThumbnail(root, "run-x"), "run-x/h3-film/h3_t4_w1_00057_.mp4");
    // no film (the run died before its terminal): the witness still is
    // the only frame evidence, so it keeps the face
    rmSync(join(root, "h3-film"), { recursive: true });
    // (name order: orbit sorts before warp — either witness keeps the face)
    assert.equal(runThumbnail(root, "run-x"), "run-x/reshoot_orbit_00001_.png");
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
  it("refuses ids, statuses, stamps and artifact rows (W-12: queued now LISTS verbatim)", () => {
    assert.ok(runRowOrNull(row()) !== null);
    assert.equal(runRowOrNull(row({ run_id: "x" })), null);
    // THE VERBATIM READ (W-12, 2026-11-05): a queued sidecar word is a
    // lawful row word — the gate admits it so the queued run serves
    // verbatim instead of vanishing from the face that must show it.
    assert.ok(runRowOrNull(row({ status: "queued" })) !== null);
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
    // THE CAPPED FACE (previews 2b): the row field rides when the
    // ints are sane, refuses the row whole when they are not — the
    // gate never serves a half-shaped truncation verdict.
    const withField = row({ truncated: { listed: 3, total: 6 } }) as Parameters<typeof runRowOrNull>[0] & { truncated?: { listed: number; total: number } };
    assert.deepEqual(
      (runRowOrNull(withField) as Record<string, unknown>)["truncated"],
      { listed: 3, total: 6 },
    );
    const badField = row({ truncated: { listed: -1, total: 6 } }) as Parameters<typeof runRowOrNull>[0] & { truncated?: { listed: number; total: number } };
    assert.equal(runRowOrNull(badField), null);
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
    put("run-active", sidecar({ status: "running", created: 50, created_at: undefined, seed: undefined }), false);
    put("run-err", sidecar({ status: "error", created: 60, created_at: 60 }), false);
    put("run-nostatus", "{}", false);
    put("run-empty-status", sidecar({ status: "" }), false);
    put("run-private", sidecar({ pipeline: "_hidden" }), false);
    put("run-BAD!", sidecar(), false);
    mkdirSync(join(out, "notes"), { recursive: true });
    // THE VISIBLE-BENCH LANE (item (b)): one test:true run rides
    // the test-output/ seat — the union scan counts and serves it
    // (media, created 150: sorts between run-good and run-err).
    const lane = join(state, "test-output", "run-lane");
    mkdirSync(lane, { recursive: true });
    writeFileSync(join(lane, "_flow.json"), sidecar({ created: 150, created_at: 150, test: true }));
    writeFileSync(join(lane, "a.png"), "img");
  };
  it("a truncated listing stamps the ROW FIELD (the panel's capped face — previews 2b, 2026-11-12)", async () => {
    // The marker rode only INSIDE the artifacts array; the panel's
    // capped counter reads the run row's `truncated` field, which
    // the seat never stamped — a 3-of-6 listing read as complete
    // and the grid never said a product was missing.
    const state = tmp();
    const dir = join(state, "output", "run-capped");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "_flow.json"), JSON.stringify({
      status: "completed", pipeline: "flow_inline", seed: 7, created_at: 100,
    }));
    for (let i = 0; i < 6; i++) writeFileSync(join(dir, "i" + i + ".png"), "img");
    const { runs } = await listRuns(state, 10, async () => true);
    const row = runs[0] as Record<string, unknown>;
    const arts = row["artifacts"] as Array<Record<string, unknown>>;
    assert.deepEqual(arts[arts.length - 1], { truncated: true, listed: 3, total: 6 });
    assert.deepEqual(row["truncated"], { listed: 3, total: 6 });
  });

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

  it("subdir media rides the warm scan too (the frames layout lists)", async () => {
    // (D6) the scan cache keys on dir + sidecar mtimes; a run whose
    // artifacts live one level down (the h3 frames layout) must list
    // through runDirHasMedia's subdir walk on the FRESH pass.
    const state = tmp();
    const dir = join(state, "output", "run-subdir-media");
    mkdirSync(join(dir, "frames"), { recursive: true });
    writeFileSync(join(dir, "_flow.json"), JSON.stringify({
      status: "completed", pipeline: "voice", seed: 7, created_at: 100,
    }));
    writeFileSync(join(dir, "frames", "w0_abc.png"), "png");
    const { runs } = await listRuns(state, 10, async () => true);
    assert.equal(runs.length, 1);
    assert.ok(runs[0]!["thumbnail"] !== undefined || Array.isArray(runs[0]!["artifacts"]),
      "the subdir artifact surfaced on the row");
    const arts = runs[0]!["artifacts"] as Record<string, unknown>[];
    assert.ok(arts.some((a) => String(a["url"] ?? "").includes("frames/w0_abc.png")),
      "the subdir artifact is listed by its run-relative name");
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

  it("THE STAGE-ID DIGEST: the run's composed stage ids ride the row as an array; pre-digest sidecars stay keyless", async () => {
    // Commission 015 §6 finding 6 — per-stage last_run needs the
    // list row to name membership. CSV on disk, array on the wire;
    // absent on the era that predates the stamp (the export_name
    // precedent law: optional key, never guessed).
    const state = tmp();
    const digested = join(state, "output", "run-new");
    mkdirSync(digested, { recursive: true });
    writeFileSync(join(digested, "_flow.json"), JSON.stringify({
      status: "completed",
      pipeline: "voice",
      seed: 7,
      created_at: 100,
      stage_ids: "s_0,s_2",
    }));
    const legacy = join(state, "output", "run-old");
    mkdirSync(legacy, { recursive: true });
    writeFileSync(join(legacy, "_flow.json"), JSON.stringify({
      status: "completed",
      pipeline: "voice",
      seed: 7,
      created_at: 50,
    }));
    const { runs } = await listRuns(state, 10, async () => true);
    assert.equal(runs.length, 2);
    assert.deepEqual(runs[0]!["stage_ids"], ["s_0", "s_2"]);
    assert.ok(!("stage_ids" in (runs[1] as Record<string, unknown>)), "the pre-digest era carries no key at all");
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
    // THE VISIBLE-BENCH COUNT (item (b)): the union scan counts
    // the test-output/ seat too — 9 dirs, the lane row sorting
    // media-first by its created stamp (newest of the media tier).
    assert.equal(count, 9);
    // THE TEXT-STROKE ORDER (the 2026-10-24 tagger repair: json ∈
    // galleryText, so a sidecar-only dir IS media-class — run-nostatus
    // ("{}", created 0) sorts media-first ahead of run-nofile (no
    // sidecar file at all, the lone non-media dir). Before the stroke
    // both were non-media and the tie broke by scan order.
    assert.deepEqual(
      runs.map((r) => r["run_id"]),
      ["run-lane", "run-good", "run-err", "run-active", "run-nostatus", "run-nofile"],
    );
    const lane = runs[0] as Record<string, unknown>;
    assert.equal(lane["test"], true);
    assert.equal(
      (lane["artifacts"] as Record<string, unknown>[])[0]!["path"],
      "./test-output/run-lane/a.png",
    );
    const good = runs[1] as Record<string, unknown>;
    assert.equal(good["status"], "completed");
    assert.equal(good["prompt"], "hi");
    assert.equal(good["draft_id"], "d1");
    assert.deepEqual(good["params"], { seed: 7 });
    assert.equal(good["thumbnail"], "run-good/a.png");
    assert.equal((good["artifacts"] as unknown[]).length, 1);
    const err = runs[2] as Record<string, unknown>;
    assert.equal(err["status"], "failed");
    assert.equal(err["created_at"], 60);
    // THE VERBATIM READ (W-12, 2026-11-05): a running sidecar row
    // serves "running" — the read never stamps a terminal word on a
    // non-terminal run (the old zombie override served "failed" here).
    const active = runs[3] as Record<string, unknown>;
    assert.equal(active["status"], "running",
      "a running sidecar reads running verbatim — never the terminal 'failed'");
    assert.equal(active["created_at"], 50);
    assert.deepEqual(active["params"], { seed: -1 });
    const nofile = runs[5] as Record<string, unknown>;
    // (no sidecar file at all reads the "success" default — only a
    // present-but-keyless sidecar reads "unknown".)
    assert.equal(nofile["status"], "success");
    const nostatus = runs[4] as Record<string, unknown>;
    // (the keyless "{}" sidecar reads "unknown", pinned by id — the
    // text stroke moved it ahead of nofile, its status law unchanged.)
    assert.equal(nostatus["run_id"], "run-nostatus");
    assert.equal(nostatus["status"], "unknown");
    // the orphan draft clears (never the row).
    const { runs: ghosted } = await listRuns(state, 500, async () => false);
    assert.equal((ghosted[0] as Record<string, unknown>)["draft_id"], "");
  });

  it("a PRESENT-but-unreadable sidecar reads unknown, never success (strictness fix 7)", async () => {
    const state = tmp();
    const out = join(state, "output");
    mkdirSync(join(out, "run-torn"), { recursive: true });
    // _flow.json exists but cannot be read as a file — EISDIR stands in
    // for any torn/permission read that is NOT the no-file law
    mkdirSync(join(out, "run-torn", "_flow.json"));
    const { runs } = await listRuns(state, 500, async () => false);
    const torn = runs.find((r) => r["run_id"] === "run-torn") as Record<string, unknown> | undefined;
    assert.ok(torn, "the torn row is served");
    assert.equal(torn["status"], "unknown");
  });

  it("the limit slices (count still counts every dir)", async () => {
    const state = tmp();
    populate(state);
    // (the slice rides the sorted list — the two loud-skips sort high.)
    const { count, runs } = await listRuns(state, 5, async () => true);
    assert.equal(count, 9);
    assert.equal(runs.length, 2);
    assert.equal(runs[0]!["run_id"], "run-lane");
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
    // DELIBERATE DIVERGENCE (stroke 82): the picker browses every file the byte route can SERVE (listMedia walks run/stage/file — depth 3, and parseTarget has no depth cap, so l1/l2/deep.png serves).
    // The restore-port rows state the artifact CONVENTION instead (mediaCandidates in runsList.ts walks top + one level only — depth 2, the one-level law).
    // A 2-deep file is browsed but never rowed.
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

describe("THE VERBATIM READ (W-12, 2026-11-05): a non-terminal sidecar word never serves a terminal word", () => {
  // THE BURN (FRICTION_3 :469, verbatim): a bench read ~1 s after a
  // [queued] press showed `last_run run-936922a1d3fd-abdf75fd (failed)`
  // while run_status on the same id said `completed`; a re-read flipped
  // the bench to `(completed)`. The old disk-only zombie override
  // (buildRunCard: `if (status === "running") status = "failed"`)
  // stamped every non-terminal sidecar row with the terminal word.
  // THE LAW: the row carries queued/running VERBATIM until the settle
  // rewrites the sidecar; zombies are the boot sweep's
  // (queueSweep.bootSweep), never a read-time guess. "error" is the
  // one lawful normalization (a terminal word → the row's failed).
  const plant = (state: string, run: string, status: string): string => {
    const dir = join(state, "output", run);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "_flow.json"),
      JSON.stringify({ status, pipeline: "flow_inline", draft_id: "d1", seed: 7, created_at: 100 }),
    );
    return dir;
  };
  const rowOf = async (state: string, run: string): Promise<Record<string, unknown>> => {
    const { runs } = await listRuns(state, 10, async () => true);
    const row = runs.find((r) => r["run_id"] === run) as Record<string, unknown> | undefined;
    assert.ok(row, `the ${run} row is served (a non-terminal run never vanishes from the face)`);
    return row;
  };

  it("a QUEUED sidecar row reads queued verbatim — never the terminal 'failed'", async () => {
    const state = tmp();
    plant(state, "run-queued-live", "queued");
    const row = await rowOf(state, "run-queued-live");
    assert.equal(row["status"], "queued",
      "a queued run serves its own word; the read must not fold it to a terminal word");
  });

  it("a RUNNING sidecar row reads running verbatim — never the terminal 'failed' (the burn shape)", async () => {
    const state = tmp();
    plant(state, "run-running-live", "running");
    const row = await rowOf(state, "run-running-live");
    assert.equal(row["status"], "running",
      "a queue-window read serves 'running' — the old override received 'failed' here (the burn's row face)");
  });

  it("the settle flip: the same id's sidecar settling completed re-reads completed (the cache cannot pin the stale word)", async () => {
    const state = tmp();
    const dir = plant(state, "run-settles", "running");
    assert.equal((await rowOf(state, "run-settles"))["status"], "running");
    // the settle door's own shape: the sidecar REWRITE (queueSidecar's
    // write) bumps the _flow.json mtime — the row cache's key — so the
    // settled word busts the cache and re-reads fresh.
    await new Promise((r) => setTimeout(r, 20));
    writeFileSync(
      join(dir, "_flow.json"),
      JSON.stringify({ status: "completed", pipeline: "flow_inline", draft_id: "d1", seed: 7, created_at: 100 }),
    );
    assert.equal((await rowOf(state, "run-settles"))["status"], "completed",
      "a settled run serves its settled word — the mtime-keyed cache never pins the pre-settle word");
  });

  it("the error→failed normalization stays (the one lawful terminal fold)", async () => {
    const state = tmp();
    plant(state, "run-err-still", "error");
    const row = await rowOf(state, "run-err-still");
    assert.equal(row["status"], "failed",
      "a terminal 'error' sidecar word maps to the row's 'failed' — unchanged by W-12");
  });
});

describe("THE BENCH INCARNATION, LISTED (W-3 / F3-11, 2026-11-05): the epoch rides the row beside the digest it joins with", () => {
  // THE JOIN CHAIN: the sidecar's identity prefix carries the bench
  // doc's `epoch` at press (queueSidecar's `bench_epoch`, stamped by
  // the run start from the door's bench doc); the row projects it
  // verbatim so melite-construct's withLastRun can require equality
  // alongside draft_id — a post-clear read binds only post-clear
  // runs. THE PROJECTION GAP: the identity keys do NOT ride the row
  // wholesale (buildRunCard projects explicitly), so this describe
  // is the depth judge for exactly that seat — unwiring the
  // projection reds HERE, and the W-12 arms above stay untouched.
  const plant = (state: string, run: string, withEpoch: boolean): void => {
    const dir = join(state, "output", run);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "_flow.json"),
      JSON.stringify({
        run_id: run,
        status: "completed",
        created_at: 100,
        test: false,
        draft_id: "d1",
        pipeline: "flow_inline",
        stage_ids: "s_1",
        ...(withEpoch ? { bench_epoch: "2" } : {}),
      }),
    );
  };
  const rowOf = async (state: string, run: string): Promise<Record<string, unknown>> => {
    const { runs } = await listRuns(state, 10, async () => true);
    const row = runs.find((r) => r["run_id"] === run) as Record<string, unknown> | undefined;
    assert.ok(row, `the ${run} row is served`);
    return row;
  };

  it("a stamped sidecar projects bench_epoch onto the row verbatim — the join's run half", async () => {
    const state = tmp();
    plant(state, "run-epoch-stamped", true);
    assert.equal((await rowOf(state, "run-epoch-stamped"))["bench_epoch"], "2",
      "the incarnation rides the row verbatim — reverting the projection reds the construct join's wall family");
  });

  it("an unstamped sidecar (pre-cure run) stamps nothing — the optional-key law", async () => {
    const state = tmp();
    plant(state, "run-epoch-absent", false);
    const row = await rowOf(state, "run-epoch-absent");
    assert.ok(!("bench_epoch" in row), "absent stays absent — never guessed");
  });
});

describe("THE RUNS-PER-DRAFT DOOR (the stale-two-run chat audit's cure 3)", () => {
  // THE FIXTURE LAW (audit §walls c): two runs, distinct `draft_id`s
  // in sidecar rows — the sidecar scalars the real writer seats
  // ahead of every payload (queueSidecar's IDENTITY KEYS), so the
  // 8191-byte window always reaches them.
  const put = (state: string, name: string, over: Record<string, unknown>): void => {
    const dir = join(state, "output", name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "_flow.json"), JSON.stringify({
      run_id: name,
      status: "completed",
      pipeline: "flow_inline",
      seed: 7,
      test: false,
      created_at: 100,
      ...over,
    }));
    writeFileSync(join(dir, "a.png"), "img");
  };
  const twoDrafts = (): string => {
    const state = tmp();
    put(state, "run-alpha", { draft_id: "bench-alpha", created_at: 200 });
    put(state, "run-beta", { draft_id: "bench-beta", created_at: 100 });
    return state;
  };

  it("the draft filter returns only that draft's runs (the audit's (c) arm)", async () => {
    const state = twoDrafts();
    const { count, runs } = await listRuns(state, 10, async () => true, { draftId: "bench-alpha" });
    assert.equal(count, 2, "the scan total is unchanged — the filter narrows the ROWS, never the count");
    assert.deepEqual(runs.map((r) => r["run_id"]), ["run-alpha"], "no foreign draft row serves");
    const beta = await listRuns(state, 10, async () => true, { draftId: "bench-beta" });
    assert.deepEqual(beta.runs.map((r) => r["run_id"]), ["run-beta"]);
    const none = await listRuns(state, 10, async () => true, { draftId: "bench-gone" });
    assert.deepEqual(none.runs, [], "a draft with no takes serves the empty face, never a guess");
  });

  it("the bench-stage filter matches the stage_ids digest (the bench address rides first)", async () => {
    // The digest maps bench_stage_id FIRST (queueSidecar's stage_ids
    // seat) — a bench stage's takes are the rows whose array names it.
    const state = tmp();
    put(state, "run-s1", { draft_id: "d1", stage_ids: "s_0,s_1", created_at: 200 });
    put(state, "run-s2", { draft_id: "d1", stage_ids: "s_2", created_at: 100 });
    const { runs } = await listRuns(state, 10, async () => true, { benchStageId: "s_1" });
    assert.deepEqual(runs.map((r) => r["run_id"]), ["run-s1"]);
    const solo = await listRuns(state, 10, async () => true, { benchStageId: "s_2" });
    assert.deepEqual(solo.runs.map((r) => r["run_id"]), ["run-s2"]);
  });

  it("the filter's window is the draft's own tail, never the global limit's", async () => {
    // The draft's OLDER takes survive a foreign NEWER run: the slice
    // rides the FILTERED order, so a limit-1 unfiltered press cannot
    // crowd the draft's archive out of its own door.
    const state = tmp();
    put(state, "run-foreign", { draft_id: "bench-other", created_at: 300 });
    put(state, "run-new", { draft_id: "bench-mine", created_at: 200 });
    put(state, "run-old", { draft_id: "bench-mine", created_at: 100 });
    const unfiltered = await listRuns(state, 1, async () => true);
    assert.deepEqual(unfiltered.runs.map((r) => r["run_id"]), ["run-foreign"], "the global window slices before build");
    const filtered = await listRuns(state, 1, async () => true, { draftId: "bench-mine" });
    assert.deepEqual(filtered.runs.map((r) => r["run_id"]), ["run-new"], "the filtered window slices AFTER the filter");
  });

  it("the filter reads the SERVED row — an orphan-cleared link matches nothing", async () => {
    // applyDraftOverlay's law: orphans lose their draft link, never
    // the row. The filter judges the row's own claim, so a deleted
    // draft's cleared rows serve no draft archive (the unfiltered
    // gallery still lists them — visibility is not lost).
    const state = twoDrafts();
    const { runs } = await listRuns(state, 10, async () => false, { draftId: "bench-alpha" });
    assert.deepEqual(runs, []);
    const unfiltered = await listRuns(state, 10, async () => false);
    assert.equal(unfiltered.runs.length, 2, "the rows themselves survive, links cleared");
  });
});

describe("THE ARCHIVED FACE (mass-archive law, operator ruling 2026-11-14 item (a))", () => {
  const tuckDir = (): string => {
    const dir: string = mkdtempSync(join(tmpdir(), "runs-list-tuck-"));
    TMP = TMP === "" ? dir : TMP + ":" + dir;
    return dir;
  };

  it("runArchivedArtifacts: an absent _archived/ dir reads as the empty face, never a throw", () => {
    const dir = tuckDir();
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "live.png"), "img");
    assert.deepEqual(runArchivedArtifacts(dir, "./output/run-tuck"), []);
  });

  it("tucked rows ride the 6-key shape with _archived/ in path/url — top files + one subdir level, sidecars skipped", () => {
    const dir = tuckDir();
    mkdirSync(join(dir, "_archived", "gen"), { recursive: true });
    writeFileSync(join(dir, "_archived", "old.png"), "old");
    writeFileSync(join(dir, "_archived", "gen", "deep.mp4"), "deep");
    writeFileSync(join(dir, "_archived", "_flow.json"), "{}"); // provenance: never media
    const arts = runArchivedArtifacts(dir, "./output/run-tuck");
    assert.equal(arts.length, 2);
    for (const a of arts) {
      assert.deepEqual(Object.keys(a).sort(), ["bytes", "name", "path", "size", "type", "url"]);
    }
    const top = arts.find((a) => a["name"] === "old.png") as Record<string, unknown>;
    assert.equal(top["type"], "image");
    assert.equal(top["path"], "./output/run-tuck/_archived/old.png");
    assert.equal(top["url"], "run-tuck/_archived/old.png");
    const deep = arts.find((a) => a["name"] === "deep.mp4") as Record<string, unknown>;
    assert.equal(deep["type"], "video");
    assert.equal(deep["path"], "./output/run-tuck/_archived/gen/deep.mp4");
    assert.equal(deep["url"], "run-tuck/_archived/gen/deep.mp4");
  });

  it("no image cap rides the tucked face (the tuck is an operator gesture, never an engine frame-dump)", () => {
    const dir = tuckDir();
    mkdirSync(join(dir, "_archived"), { recursive: true });
    for (let i = 0; i < 25; i++) writeFileSync(join(dir, "_archived", "f" + i + ".png"), "img");
    const arts = runArchivedArtifacts(dir, "./output/run-tuck");
    assert.equal(arts.length, 25);
  });

  it("runRowOrNull: archived rides ALONGSIDE the live list; empty stamps nothing; a bad tucked row refuses the run", () => {
    const good = {
      name: "old.png",
      path: "./output/run-x/_archived/old.png",
      bytes: 3,
      url: "run-x/_archived/old.png",
      type: "image",
      size: 3,
    };
    const row = runRowOrNull({
      ...stamp([]),
      archived: [good],
    }) as Record<string, unknown>;
    assert.deepEqual(row["archived"], [good]);
    assert.deepEqual(row["artifacts"], []);
    // runs with nothing archived stamp nothing (optional key, never guessed).
    const bare = runRowOrNull(stamp([])) as Record<string, unknown>;
    assert.ok(!("archived" in bare));
    // the gate keeps teeth on the tucked face too: one bad row
    // refuses the whole run, exactly like the live face.
    assert.equal(
      runRowOrNull({ ...stamp([]), archived: [{ ...good, type: "spec" }] }),
      null,
    );
  });

  it("listRuns: a tucked run rows both faces — the live walk never sees the tucked bytes", async () => {
    const state = tmp();
    const dir = join(state, "output", "run-tucked");
    mkdirSync(join(dir, "_archived"), { recursive: true });
    writeFileSync(
      join(dir, "_flow.json"),
      JSON.stringify({
        status: "completed", pipeline: "voice", prompt: "hi", draft_id: "d1", seed: 7, created_at: 100,
      }),
    );
    writeFileSync(join(dir, "live.png"), "img");
    writeFileSync(join(dir, "_archived", "old.png"), "tucked");
    const { count, runs } = await listRuns(state, 10, async () => true);
    assert.equal(count, 1);
    const row = runs[0] as Record<string, unknown>;
    const arts = row["artifacts"] as Record<string, unknown>[];
    assert.ok(arts.some((a) => a["name"] === "live.png"), "the live file lists live");
    assert.ok(!arts.some((a) => String(a["name"] ?? "").includes("old")), "the tucked file never lists live");
    const archived = row["archived"] as Record<string, unknown>[];
    assert.equal(archived.length, 1);
    assert.equal(archived[0]!["name"], "old.png");
    assert.equal(archived[0]!["url"], "run-tucked/_archived/old.png");
  });
});

describe("THE VISIBLE-BENCH FACE (operator ruling 2026-11-14, item (b))", () => {
  it("sidecarBool: true/false literals read; absent and non-boolean read the default (never guessed)", () => {
    assert.equal(sidecarBool('{"test":true}', "test", false), true);
    assert.equal(sidecarBool('{"test":false}', "test", true), false);
    assert.equal(sidecarBool('{}', "test", false), false);
    assert.equal(sidecarBool('{"test":"yes"}', "test", false), false);
    assert.equal(sidecarBool('{"test":1}', "test", true), true);
    assert.equal(sidecarBool("", "test", false), false);
  });

  it("runRowOrNull: the test stamp rides ALWAYS (the live face's law — absent reads production)", () => {
    const stamped = runRowOrNull({ ...stamp([]), test: true }) as Record<string, unknown>;
    assert.equal(stamped["test"], true);
    const bare = runRowOrNull(stamp([])) as Record<string, unknown>;
    assert.equal(bare["test"], false);
  });

  it("listRuns: a test-output/ run lists with test:true — scratch is storage, never invisibility", async () => {
    const state = tmp();
    const prod = join(state, "output", "run-prod");
    mkdirSync(prod, { recursive: true });
    writeFileSync(join(prod, "_flow.json"), JSON.stringify({
      status: "completed", pipeline: "voice", prompt: "hi", draft_id: "d1", seed: 7, created_at: 100,
    }));
    writeFileSync(join(prod, "live.png"), "img");
    const lane = join(state, "test-output", "run-lane");
    mkdirSync(lane, { recursive: true });
    writeFileSync(join(lane, "_flow.json"), JSON.stringify({
      status: "completed", pipeline: "voice", prompt: "hi", draft_id: "d1", seed: 7, created_at: 200, test: true,
    }));
    writeFileSync(join(lane, "probe.png"), "img");
    const { count, runs } = await listRuns(state, 10, async () => true);
    assert.equal(count, 2);
    assert.equal(runs.length, 2);
    const testRow = runs.find((r) => r["run_id"] === "run-lane") as Record<string, unknown>;
    assert.ok(testRow, "the test-lane run lists");
    assert.equal(testRow["test"], true);
    const arts = testRow["artifacts"] as Record<string, unknown>[];
    assert.equal(arts[0]!["path"], "./test-output/run-lane/probe.png");
    assert.equal(arts[0]!["url"], "run-lane/probe.png");
    const prodRow = runs.find((r) => r["run_id"] === "run-prod") as Record<string, unknown>;
    assert.ok(prodRow, "the production run still lists");
    assert.equal(prodRow["test"], false);
    assert.equal((prodRow["artifacts"] as Record<string, unknown>[])[0]!["path"], "./output/run-prod/live.png");
  });

  it("listRuns: a pre-cure sidecar without the test key reads production (never guessed)", async () => {
    const state = tmp();
    const lane = join(state, "test-output", "run-legacy");
    mkdirSync(lane, { recursive: true });
    writeFileSync(join(lane, "_flow.json"), JSON.stringify({
      status: "completed", pipeline: "voice", seed: 7, created_at: 100,
    }));
    writeFileSync(join(lane, "old.png"), "img");
    const { runs } = await listRuns(state, 10, async () => true);
    assert.equal(runs[0]!["test"], false);
  });

  it("listRuns: a same run id in both seats serves production (first seat wins)", async () => {
    const state = tmp();
    for (const seat of ["output", "test-output"]) {
      const dir = join(state, seat, "run-same");
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "_flow.json"), JSON.stringify({
        status: "completed",
        pipeline: seat === "output" ? "prod-voice" : "lane-voice",
        seed: 7,
        created_at: 100,
        ...(seat === "test-output" ? { test: true } : {}),
      }));
      writeFileSync(join(dir, "a.png"), "img");
    }
    const { count, runs } = await listRuns(state, 10, async () => true);
    assert.equal(count, 1);
    assert.equal(runs.length, 1);
    assert.equal(runs[0]!["flow"], "prod-voice");
    assert.equal(runs[0]!["test"], false);
  });

  it("listRunsAcross: test rows union across manifest roots carrying served_from + the test stamp", async () => {
    const first = tmp();
    const lane = join(first, "test-output", "run-away");
    mkdirSync(lane, { recursive: true });
    writeFileSync(join(lane, "_flow.json"), JSON.stringify({
      status: "completed", pipeline: "voice", seed: 7, created_at: 100, test: true,
    }));
    writeFileSync(join(lane, "a.png"), "img");
    const { count, runs } = await listRunsAcross([first], 10, async () => true);
    assert.equal(count, 1);
    assert.equal(runs[0]!["run_id"], "run-away");
    assert.equal(runs[0]!["test"], true);
    assert.equal(runs[0]!["served_from"], first);
  });
});

describe("runArchivedArtifacts — the tucked walk's own edges", () => {
  const tuckDir = (): string => {
    const dir: string = mkdtempSync(join(tmpdir(), "runs-list-tuckedge-"));
    TMP = TMP === "" ? dir : TMP + ":" + dir;
    return dir;
  };

  it("a slash-less literal rides whole (the archived runBase fold names the dir itself)", () => {
    const dir = tuckDir();
    mkdirSync(join(dir, "_archived"), { recursive: true });
    writeFileSync(join(dir, "_archived", "old.png"), "old");
    const arts = runArchivedArtifacts(dir, "run-tuck");
    assert.equal(arts.length, 1);
    assert.equal(arts[0]!["path"], "run-tuck/_archived/old.png");
    assert.equal(arts[0]!["url"], "run-tuck/_archived/old.png");
  });

  it("audio/model/text tuck while non-media drops silently (the tucked type fold judges every side)", () => {
    const dir = tuckDir();
    mkdirSync(join(dir, "_archived"), { recursive: true });
    writeFileSync(join(dir, "_archived", "v.wav"), "a"); // audio: judges past video
    writeFileSync(join(dir, "_archived", "m.glb"), "m"); // model: judges past audio
    writeFileSync(join(dir, "_archived", "n.txt"), "n"); // text: judges past model
    writeFileSync(join(dir, "_archived", "notes"), "non-media drops, never refuses");
    const arts = runArchivedArtifacts(dir, "./output/run-tuck");
    const byName = new Map(arts.map((a) => [a["name"], a["type"]]));
    assert.equal(byName.get("v.wav"), "audio");
    assert.equal(byName.get("m.glb"), "model");
    assert.equal(byName.get("n.txt"), "text");
    assert.ok(!byName.has("notes"), "a non-media tucked file drops silently");
  });

  it("a dangling tucked link drops, never refuses (the tucked size fold's -1)", () => {
    const dir = tuckDir();
    mkdirSync(join(dir, "_archived"), { recursive: true });
    writeFileSync(join(dir, "_archived", "old.png"), "old");
    symlinkSync(join(dir, "_archived", "ghost.png"), join(dir, "_archived", "link.png"));
    const arts = runArchivedArtifacts(dir, "./output/run-tuck");
    assert.deepEqual(arts.map((a) => a["name"]), ["old.png"]);
  });

  it("an unreadable tucked subdir is skipped, never a throw", () => {
    const dir = tuckDir();
    mkdirSync(join(dir, "_archived", "sub"), { recursive: true });
    writeFileSync(join(dir, "_archived", "sub", "x.png"), "x");
    writeFileSync(join(dir, "_archived", "top.png"), "t");
    chmodSync(join(dir, "_archived", "sub"), 0o000);
    try {
      assert.deepEqual(
        runArchivedArtifacts(dir, "./output/run-tuck").map((a) => a["name"]),
        ["top.png"],
      );
    } finally {
      chmodSync(join(dir, "_archived", "sub"), 0o755);
    }
  });

  it("a non-servable tucked leaf and a nested tucked dir are skipped (the tucked sub-loop's two continues)", () => {
    const dir = tuckDir();
    mkdirSync(join(dir, "_archived", "sub", "nested"), { recursive: true });
    writeFileSync(join(dir, "_archived", "sub", "_skip.png"), "s"); // underscore leaf: never servable
    writeFileSync(join(dir, "_archived", "sub", "keep.png"), "k");
    writeFileSync(join(dir, "_archived", "sub", "nested", "deep.png"), "d"); // depth 3: never walked
    const arts = runArchivedArtifacts(dir, "./output/run-tuck");
    assert.deepEqual(arts.map((a) => a["name"]), ["keep.png"]);
  });
});

describe("runDirHasMedia — the subdir walk's patience", () => {
  it("a subdir's non-media files don't vote — the walk keeps looking", () => {
    const root = tmp();
    mkdirSync(join(root, "sub"));
    writeFileSync(join(root, "sub", "plain"), "f"); // no extension: keeps looking
    writeFileSync(join(root, "sub", "x.png"), "x");
    assert.equal(runDirHasMedia(root), true);
  });
});

describe("noteRunTreeChanged — the mutation notice (the gallery-rename staleness cure)", () => {
  const sidecar = (): string =>
    JSON.stringify({ status: "completed", pipeline: "voice", seed: 7, created_at: 100 });

  it("a path naming no run id is a no-op — the caches hold", async () => {
    const state = tmp();
    const dir = join(state, "output", "run-noticed");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "_flow.json"), sidecar());
    writeFileSync(join(dir, "a.png"), "img");
    const before = await listRuns(state, 10, async () => true);
    assert.equal(before.runs.length, 1);
    noteRunTreeChanged(join(state, "output", "notes", "a.png")); // no run-<id> segment
    const after = await listRuns(state, 10, async () => true);
    assert.deepEqual(after, before);
  });

  it("a gallery rename invalidates the cached row — the next list rebuilds it", async () => {
    const state = tmp();
    const dir = join(state, "output", "run-mut");
    mkdirSync(join(dir, "gen"), { recursive: true });
    writeFileSync(join(dir, "_flow.json"), sidecar());
    writeFileSync(join(dir, "gen", "old.png"), "img");
    const first = await listRuns(state, 10, async () => true);
    const firstArts = first.runs[0]!["artifacts"] as Record<string, unknown>[];
    assert.ok(firstArts.some((a) => a["url"] === "run-mut/gen/old.png"));
    // the mutation lands one level down: the run dir mtime never
    // moves, so the un-noticed list serves the pre-mutation row
    rmSync(join(dir, "gen", "old.png"));
    writeFileSync(join(dir, "gen", "new.png"), "img");
    const stale = await listRuns(state, 10, async () => true);
    const staleArts = stale.runs[0]!["artifacts"] as Record<string, unknown>[];
    assert.ok(
      staleArts.some((a) => a["url"] === "run-mut/gen/old.png"),
      "without the notice the cache holds the pre-mutation row",
    );
    // the notice names the run by its path segment: both caches drop
    // it and the next list rebuilds from disk
    noteRunTreeChanged(join(dir, "gen", "new.png"));
    const fresh = await listRuns(state, 10, async () => true);
    const freshArts = fresh.runs[0]!["artifacts"] as Record<string, unknown>[];
    assert.ok(freshArts.some((a) => a["url"] === "run-mut/gen/new.png"));
    assert.ok(!freshArts.some((a) => a["url"] === "run-mut/gen/old.png"));
  });
});

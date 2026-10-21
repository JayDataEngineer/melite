// provision-models channel writers — the manager-local model-list and
// the security_level pin that admit declared estate rows into
// Manager's install whitelist (desktop audit: every provision row
// failed "catalog does not contain exactly one row").
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  MELITE_MODEL_BASE,
  ensureManagerSecurityWeak,
  fetchSnapshotVerified,
  fetchVerified,
  hfRepoFiles,
  mergedTreeMiss,
  snapshotCoversLoadSet,
  snapshotDest,
  snapshotDirPresent,
  snapshotFilesForPatterns,
  verifyHandPlacedTrees,
  writeManagerLocalModelList,
  type HandPlacedCheck,
} from "../scripts/provision-models.ts";
import { setDry } from "../scripts/provision-shared.ts";

describe("fetchVerified truncation retry", () => {
  const dir = mkdtempSync(join(tmpdir(), "melite-trunc-"));
  mkdirSync(join(dir, "sub"), { recursive: true });
  const good = Buffer.from("the whole declared artifact, not a byte less", "utf8");
  const want = createHash("sha256").update(good).digest("hex");

  it("deletes a mismatched partial and re-queues; the digest gate owns the verdict", async () => {
    let calls = 0;
    // fake Manager: first install "completes" a truncated stream,
    // second lands the declared bytes
    const manager = {
      async installModel() {
        calls += 1;
        const { writeFile } = await import("node:fs/promises");
        const bytes = calls === 1 ? good.subarray(0, 7) : good;
        await writeFile(join(dir, "sub", "model.safetensors"), bytes);
        return { installed: true, detail: "queue 1/1" };
      },
    };
    const st = await fetchVerified("", dir, "fam/provision/model.safetensors",
      "https://x/model.safetensors", "model.safetensors", "sub", want,
      manager, { type: MELITE_MODEL_BASE, base: MELITE_MODEL_BASE });
    assert.equal(st, "ok");
    assert.equal(calls, 2, "the truncated first attempt is retried exactly once more");

    rmSync(dir, { recursive: true, force: true });
  });

  it("fails loud after the final attempt still lands wrong bytes", async () => {
    let calls = 0;
    const manager = {
      async installModel() {
        calls += 1;
        const { writeFile } = await import("node:fs/promises");
        await writeFile(join(dir, "sub", "model.safetensors"), good.subarray(0, 5));
        return { installed: true, detail: "queue 1/1" };
      },
    };
    const st = await fetchVerified("", dir, "fam/provision/model.safetensors",
      "https://x/model.safetensors", "model.safetensors", "sub", want,
      manager, { type: MELITE_MODEL_BASE, base: MELITE_MODEL_BASE });
    assert.equal(st, "bad");
    assert.equal(calls, 3, "three attempts, then the row fails");
  });
});

describe("writeManagerLocalModelList", () => {
  const dir = mkdtempSync(join(tmpdir(), "melite-mll-"));

  it("writes one whitelist row per declared provision, deterministically sorted", () => {
    const listPath = join(dir, "custom_nodes", "comfyui-manager", "model-list.json");
    writeManagerLocalModelList(listPath, [
      { family: "zeta", row: { name: "b.safetensors", folder: "/loras/h3/", url: "https://x/b" } },
      { family: "anima", row: { name: "a.safetensors", folder: "diffusion_models", url: "https://x/a" } },
    ]);
    const parsed = JSON.parse(readFileSync(listPath, "utf8")) as {
      models: Array<Record<string, string>>;
    };
    assert.equal(parsed.models.length, 2);
    // sorted by save_path+filename: diffusion_models before loras/h3
    assert.deepEqual(parsed.models.map((m) => m.filename), ["a.safetensors", "b.safetensors"]);
    for (const m of parsed.models) {
      assert.equal(m.type, MELITE_MODEL_BASE);
      assert.equal(m.base, MELITE_MODEL_BASE);
      assert.doesNotMatch(m.save_path, /^\/|\/$/u);
    }
    assert.equal(parsed.models[1].save_path, "loras/h3");

    // rerun byte-matches (idempotent surface for the running engine)
    const before = readFileSync(listPath, "utf8");
    writeManagerLocalModelList(listPath, [
      { family: "anima", row: { name: "a.safetensors", folder: "diffusion_models", url: "https://x/a" } },
      { family: "zeta", row: { name: "b.safetensors", folder: "/loras/h3/", url: "https://x/b" } },
    ]);
    assert.equal(readFileSync(listPath, "utf8"), before);

    rmSync(dir, { recursive: true, force: true });
  });
});

describe("ensureManagerSecurityWeak", () => {
  const dir = mkdtempSync(join(tmpdir(), "melite-sec-"));

  it("creates the config when absent and reports a restart is needed", () => {
    const p = join(dir, "a", "config.ini");
    assert.equal(ensureManagerSecurityWeak(p), false);
    assert.match(readFileSync(p, "utf8"), /^\[default\]\nsecurity_level = weak\n$/u);
  });

  it("replaces only the security_level line of an existing config", () => {
    const p = join(dir, "b", "config.ini");
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p,
      "[default]\nchannel_url = https://comfy.org\nsecurity_level = normal-\nui_mode = dark\n");
    assert.equal(ensureManagerSecurityWeak(p), false);
    const text = readFileSync(p, "utf8");
    assert.match(text, /channel_url = https:\/\/comfy\.org\n/u);
    assert.match(text, /security_level = weak\n/u);
    assert.match(text, /ui_mode = dark\n/u);

    // already weak: untouched, no restart needed
    assert.equal(ensureManagerSecurityWeak(p), true);
  });

  it("appends the pin when a config carries no security_level line", () => {
    const p = join(dir, "c", "config.ini");
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, "[default]\nui_mode = dark\n");
    assert.equal(ensureManagerSecurityWeak(p), false);
    assert.match(readFileSync(p, "utf8"), /ui_mode = dark\nsecurity_level = weak\n$/u);

    rmSync(dir, { recursive: true, force: true });
  });
});

describe("snapshotDest", () => {
  it("joins folder + tree and strips stray slashes", () => {
    assert.equal(snapshotDest("audio/qwen3-tts/hf", "Qwen3-TTS-12Hz-0.6B-Base"), "audio/qwen3-tts/hf/Qwen3-TTS-12Hz-0.6B-Base");
    assert.equal(snapshotDest("/audio/qwen3-tts/hf/", "Qwen3-TTS-12Hz-0.6B-Base"), "audio/qwen3-tts/hf/Qwen3-TTS-12Hz-0.6B-Base");
    assert.equal(snapshotDest("", "Qwen3-TTS-12Hz-1.7B-VoiceDesign"), "Qwen3-TTS-12Hz-1.7B-VoiceDesign");
  });
});

describe("snapshotFilesForPatterns", () => {
  const siblings = [
    ".gitattributes",
    "README.md",
    "config.json",
    "model.safetensors",
    "speech_tokenizer/config.json",
    "speech_tokenizer/model.safetensors",
    "tokenizer_config.json",
    "vocab.json",
  ];

  it("matches exact files plus dir/* prefixes, deduped and sorted", () => {
    assert.deepEqual(
      snapshotFilesForPatterns(siblings, ["config.json", "model.safetensors", "speech_tokenizer/*", "config.json"]),
      ["config.json", "model.safetensors", "speech_tokenizer/config.json", "speech_tokenizer/model.safetensors"],
    );
  });

  it("a bare dir without its star matches nothing", () => {
    assert.deepEqual(snapshotFilesForPatterns(siblings, ["speech_tokenizer"]), []);
    assert.deepEqual(snapshotFilesForPatterns(siblings, ["nope/*"]), []);
  });
});

describe("snapshotCoversLoadSet", () => {
  it("requires the config, the weights, and a speech-tokenizer file", () => {
    assert.equal(snapshotCoversLoadSet(["config.json", "model.safetensors", "speech_tokenizer/config.json"]), true);
    assert.equal(snapshotCoversLoadSet(["model.safetensors", "speech_tokenizer/config.json"]), false);
    assert.equal(snapshotCoversLoadSet(["config.json", "speech_tokenizer/config.json"]), false);
    assert.equal(snapshotCoversLoadSet(["config.json", "model.safetensors"]), false);
    assert.equal(snapshotCoversLoadSet(["config.json", "model.safetensors", "speech_tokenizer/"]), false);
  });
});

describe("hfRepoFiles", () => {
  it("rides the REVISION-PINNED tree door and maps file rows to paths (the unpinned listing was a drift seam)", async () => {
    const seen: string[] = [];
    const fake = (async (url: unknown) => {
      seen.push(String(url));
      return new Response(JSON.stringify([
        { type: "file", path: "config.json" },
        { type: "file", path: "model.safetensors" },
        { type: "directory", path: "sub" },
        "not-a-row",
      ]));
    }) as typeof globalThis.fetch;
    assert.deepEqual(await hfRepoFiles("Qwen/X", "f".repeat(40), fake), ["config.json", "model.safetensors"]);
    assert.deepEqual(seen, ["https://huggingface.co/api/models/Qwen/X/tree/" + "f".repeat(40) + "?recursive=true"]);
  });

  it("throws loud on a non-2xx answer", async () => {
    const fake = (async () => new Response("no", { status: 404 })) as typeof globalThis.fetch;
    await assert.rejects(() => hfRepoFiles("Qwen/X", "f".repeat(40), fake), /HTTP 404/);
  });
});

describe("snapshotDirPresent", () => {
  const dir = mkdtempSync(join(tmpdir(), "melite-snap-present-"));

  it("needs both anchor files in the dest tree", () => {
    const dest = join(dir, "audio", "qwen3-tts", "hf", "Tree");
    mkdirSync(dest, { recursive: true });
    assert.equal(snapshotDirPresent(dir, "audio/qwen3-tts/hf", "Tree"), false);
    writeFileSync(join(dest, "config.json"), "{}");
    assert.equal(snapshotDirPresent(dir, "audio/qwen3-tts/hf", "Tree"), false);
    writeFileSync(join(dest, "model.safetensors"), "bytes");
    assert.equal(snapshotDirPresent(dir, "audio/qwen3-tts/hf", "Tree"), true);

    rmSync(dir, { recursive: true, force: true });
  });
});

describe("fetchSnapshotVerified", () => {
  const tree = {
    name: "Tree",
    folder: "audio/qwen3-tts/hf",
    repo_id: "Qwen/Tree",
    revision: "a".repeat(40),
    allow_patterns: ["config.json", "model.safetensors", "speech_tokenizer/*"],
  };
  const siblingsBody = JSON.stringify([
    { type: "file", path: "config.json" },
    { type: "file", path: "model.safetensors" },
    { type: "file", path: "speech_tokenizer/config.json" },
  ]);

  it("skips a tree that already holds the load set (no fetch fires)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "melite-snap-skip-"));
    const dest = join(dir, "audio", "qwen3-tts", "hf", "Tree");
    mkdirSync(dest, { recursive: true });
    writeFileSync(join(dest, "config.json"), "{}");
    writeFileSync(join(dest, "model.safetensors"), "bytes");
    let fired = false;
    const fake = (async () => { fired = true; return new Response("x"); }) as typeof globalThis.fetch;
    assert.equal(await fetchSnapshotVerified(dir, "fam", tree, fake), "skipped");
    assert.equal(fired, false, "a present tree fires no request");
    rmSync(dir, { recursive: true, force: true });
  });

  it("refuses patterns that miss the load set", async () => {
    const dir = mkdtempSync(join(tmpdir(), "melite-snap-cover-"));
    const fake = (async () => new Response(siblingsBody)) as typeof globalThis.fetch;
    const thin = { ...tree, allow_patterns: ["config.json"] };
    assert.equal(await fetchSnapshotVerified(dir, "fam", thin, fake), "bad");
    rmSync(dir, { recursive: true, force: true });
  });

  it("downloads the pattern hits and verifies the landed tree", async () => {
    const dir = mkdtempSync(join(tmpdir(), "melite-snap-ok-"));
    const bodies: Record<string, string> = {
      "config.json": '{"model":true}',
      "model.safetensors": "weights-bytes",
      "speech_tokenizer/config.json": '{"tok":true}',
    };
    const seen: string[] = [];
    const fake = (async (url: string) => {
      seen.push(url);
      if (url.includes("/api/models/Qwen/Tree/tree/") && url.endsWith("?recursive=true")) return new Response(siblingsBody);
      const file = url.split("/").slice(-1)[0] ?? "";
      const speech = url.includes("/speech_tokenizer/") ? "speech_tokenizer/" + file : file;
      const body = bodies[speech] ?? bodies[file] ?? "";
      return new Response(body);
    }) as typeof globalThis.fetch;
    assert.equal(await fetchSnapshotVerified(dir, "fam", tree, fake), "ok");
    assert.equal(readFileSync(join(dir, "audio", "qwen3-tts", "hf", "Tree", "config.json"), "utf8"), '{"model":true}');
    assert.equal(readFileSync(join(dir, "audio", "qwen3-tts", "hf", "Tree", "model.safetensors"), "utf8"), "weights-bytes");
    assert.equal(readFileSync(join(dir, "audio", "qwen3-tts", "hf", "Tree", "speech_tokenizer", "config.json"), "utf8"), '{"tok":true}');
    // every file rode the pinned revision URL
    for (const url of seen.filter((u) => !u.includes("/api/models/"))) {
      assert.ok(url.includes("/resolve/" + "a".repeat(40) + "/"), `pinned revision URL: ${url}`);
    }
    rmSync(dir, { recursive: true, force: true });
  });

  it("fails loud when one file 404s", async () => {
    const dir = mkdtempSync(join(tmpdir(), "melite-snap-bad-"));
    const fake = (async (url: string) => {
      if (url.includes("/api/models/Qwen/Tree/tree/") && url.endsWith("?recursive=true")) return new Response(siblingsBody);
      return new Response("no", { status: 404 });
    }) as typeof globalThis.fetch;
    assert.equal(await fetchSnapshotVerified(dir, "fam", tree, fake), "bad");
    rmSync(dir, { recursive: true, force: true });
  });

  it("DRY plans an absent tree and skips a present one", async () => {
    const dir = mkdtempSync(join(tmpdir(), "melite-snap-dry-"));
    setDry(true);
    try {
      const fake = (async () => new Response(siblingsBody)) as typeof globalThis.fetch;
      assert.equal(await fetchSnapshotVerified(dir, "fam", tree, fake), "planned");
      const dest = join(dir, "audio", "qwen3-tts", "hf", "Tree");
      mkdirSync(dest, { recursive: true });
      writeFileSync(join(dest, "config.json"), "{}");
      writeFileSync(join(dest, "model.safetensors"), "bytes");
      assert.equal(await fetchSnapshotVerified(dir, "fam", tree, fake), "skipped");
    } finally {
      setDry(false);
    }
    rmSync(dir, { recursive: true, force: true });
  });
});

describe("verifyHandPlacedTrees", () => {
  const dir = mkdtempSync(join(tmpdir(), "melite-hand-"));
  const roots = ["audio", "audio/qwen3-tts/hf"];
  const checks: HandPlacedCheck[] = [{
    family: "qwen3-tts",
    handPlaced: ["qwen3-tts/hf/Qwen3-TTS-12Hz-0.6B-Base", "Qwen3-TTS-12Hz-0.6B-CustomVoice-merged"],
    fetched: ["Qwen3-TTS-12Hz-0.6B-Base"],
  }];

  it("splits the missing into merged (hand-only) vs fetch-covered", () => {
    // the fetchable tree lands where the snapshot loop puts it
    const landed = join(dir, "audio", "qwen3-tts", "hf", "Qwen3-TTS-12Hz-0.6B-Base");
    mkdirSync(landed, { recursive: true });
    writeFileSync(join(landed, "config.json"), "{}");
    const verdict = verifyHandPlacedTrees(dir, roots, checks);
    assert.deepEqual(verdict.present, ["qwen3-tts:qwen3-tts/hf/Qwen3-TTS-12Hz-0.6B-Base"]);
    assert.deepEqual(verdict.missingFetched, []);
    assert.deepEqual(verdict.missingMerged, [{
      family: "qwen3-tts",
      tree: "Qwen3-TTS-12Hz-0.6B-CustomVoice-merged",
    }]);

    rmSync(dir, { recursive: true, force: true });
  });

  it("an unfetched fetchable tree lands in missingFetched", () => {
    const empty = mkdtempSync(join(tmpdir(), "melite-hand-empty-"));
    const verdict = verifyHandPlacedTrees(empty, roots, checks);
    assert.deepEqual(verdict.present, []);
    assert.deepEqual(
      verdict.missingFetched.map((m) => m.tree),
      ["qwen3-tts/hf/Qwen3-TTS-12Hz-0.6B-Base"],
    );
    assert.deepEqual(
      verdict.missingMerged.map((m) => m.tree),
      ["Qwen3-TTS-12Hz-0.6B-CustomVoice-merged"],
    );
    rmSync(empty, { recursive: true, force: true });
  });
});

describe("mergedTreeMiss", () => {
  it("names the tree, the hand-only cause, and the node's own folder", () => {
    const miss = mergedTreeMiss("qwen3-tts-voicedesign", "Qwen3-TTS-12Hz-1.7B-Base-merged");
    assert.match(miss, /Qwen3-TTS-12Hz-1\.7B-Base-merged/u);
    assert.match(miss, /no upstream repo/u);
    assert.match(miss, /extra_model_paths\.yaml/u);
    assert.match(miss, /audio\/qwen3-tts\/hf/u);
  });
});

// iac-doors-law.spec.ts — the provisioning IaC is PROVEN, not
// argued. The estate's infrastructure-as-code is the DECL plane: a
// stranger with a fresh clone must be able to reconstruct the whole
// model store from the DECLs alone (url + sha256 + size on every
// row), through doors that actually exist. Three truths, judged:
//
//   1. the fresh-machine doors exist (probe:fresh-clone,
//      rehearse:first-image name real scripts — deletable by no
//      silent commit);
//   2. every provisions row is complete (url, sha256, size — the
//      reconstruction promise has no holes);
//   3. the pins are REAL: a declared artifact on disk hashes to its
//      DECL sha256 (spot-verified on the smallest row — the full
//      sweep is the rehearsal's byte-level receipt, R2).
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..", "..", "..");

const sh = (args: string[]): string =>
  execFileSync(args[0]!, args.slice(1), { cwd: ROOT, encoding: "utf8" }).trim();

function provisionRows(): { folder: string; name: string; size: number; sha: string; url: string }[] {
  const decls = sh(["git", "ls-files", "packages/models/*/src/index.ts"]).split("\n").filter(Boolean);
  const rows: { folder: string; name: string; size: number; sha: string; url: string }[] = [];
  const seen = new Set<string>();
  for (const decl of decls) {
    const src = readFileSync(join(ROOT, decl), "utf8");
    for (const m of src.matchAll(/\{[^{}]*?"name":\s*"([^"]+)"[^{}]*?"folder":\s*"([^"]+)"[^{}]*?\}/gu)) {
      const lit = m[0];
      // DIRECTORY SNAPSHOT ROWS ride their own arm below — a whole
      // HF tree has no single-file url/sha/size triple to state.
      if (/"repo_id":/u.test(lit)) continue;
      rows.push({
        name: m[1]!,
        folder: m[2]!,
        size: Number(/"size_bytes":\s*(\d+)/u.exec(lit)?.[1] ?? 0),
        sha: /"sha256":\s*"([0-9a-f]+)"/u.exec(lit)?.[1] ?? "",
        url: /"url":\s*"([^"]+)"/u.exec(lit)?.[1] ?? "",
      });
    }
    for (const m of src.matchAll(/\{[^{}]*?"folder":\s*"([^"]+)"[^{}]*?"name":\s*"([^"]+)"[^{}]*?\}/gu)) {
      const lit = m[0];
      // same exemption, folder-first spelling of the same row.
      if (/"repo_id":/u.test(lit)) continue;
      rows.push({
        name: m[2]!,
        folder: m[1]!,
        size: Number(/"size_bytes":\s*(\d+)/u.exec(lit)?.[1] ?? 0),
        sha: /"sha256":\s*"([0-9a-f]+)"/u.exec(lit)?.[1] ?? "",
        url: /"url":\s*"([^"]+)"/u.exec(lit)?.[1] ?? "",
      });
    }
  }
  return rows.filter((r) => {
    const k = `${r.folder}/${r.name}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Directory snapshot rows — whole-HF-tree provisions judged by their own law. */
function snapshotRows(): { name: string; repoId: string; revision: string; patterns: number }[] {
  const decls = sh(["git", "ls-files", "packages/models/*/src/index.ts"]).split("\n").filter(Boolean);
  const out: { name: string; repoId: string; revision: string; patterns: number }[] = [];
  for (const decl of decls) {
    const src = readFileSync(join(ROOT, decl), "utf8");
    for (const m of src.matchAll(/\{[^{}]*?"repo_id":\s*"([^"]+)"[^{}]*?\}/gu)) {
      const lit = m[0];
      // The snapshot door's signature is allow_patterns + revision —
      // note-rows ("type"/"note" metadata) carry repo_id without being
      // provisions and stay outside this census.
      if (!/"allow_patterns":/u.test(lit) || !/"revision":/u.test(lit)) continue;
      out.push({
        name: /"name":\s*"([^"]+)"/u.exec(lit)?.[1] ?? "(unnamed)",
        repoId: m[1]!,
        revision: /"revision":\s*"([0-9a-f]+)"/u.exec(lit)?.[1] ?? "",
        patterns: (lit.match(/allow_patterns[\s\S]*?\]/u)?.[0]?.match(/"/gu)?.length ?? 0) / 2,
      });
    }
  }
  return out;
}

function storeRoot(): string | undefined {
  const overlay = join(ROOT, "data", "inference.local.json");
  if (!existsSync(overlay)) return undefined;
  try {
    const cfg = JSON.parse(readFileSync(overlay, "utf8")) as {
      models?: { read_root?: string; download_root?: string };
    };
    return cfg.models?.read_root ?? cfg.models?.download_root;
  } catch {
    return undefined;
  }
}

describe("THE IAC LAW — the store is reconstructable from DECLs, through real doors", () => {
  it("the fresh-machine doors exist and are wired in package.json", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as Record<string, { scripts?: Record<string, string> }>;
    const scripts = pkg.scripts!;
    const doors: [string, string][] = [
      ["probe:fresh-clone", "tools/fresh-clone-probe.mjs"],
      ["rehearse:first-image", "tools/first-image-rehearsal.mjs"],
    ];
    for (const [door, tool] of doors) {
      const line = scripts[door];
      expect(line, `package.json door ${door} names its tool`).toContain(tool);
      expect(existsSync(join(ROOT, tool)), `${tool} exists on disk`).toBe(true);
    }
  });

  it("the fresh-clone door tests its own premise (a stranger has no credentials)", () => {
    // The probe's fiction is a STRANGER's clone. A private remote is
    // clonable only with this box's stored credential, so the clone
    // step can pass while proving nothing about strangers. The door
    // must run its own anonymous ls-remote (credential helper
    // disabled, no terminal prompt) and carry the result in its
    // verdict — deleting that test would silently restore the
    // overclaim.
    const probe = readFileSync(join(ROOT, "tools", "fresh-clone-probe.mjs"), "utf8");
    expect(probe, "the anonymous preflight disables the credential helper").toContain('"credential.helper="');
    expect(probe, "the anonymous preflight refuses a terminal prompt").toContain("GIT_TERMINAL_PROMPT");
    expect(probe, "the premise verdict is named").toContain("STRANGER_CLONE");
    expect(probe, "the report carries the premise line").toContain("premise:");
  });

  it("the engine-fixture regen doors exist, are wired, and their fixtures exist (GT-09)", () => {
    // The regen doors are the ONLY way the tracked engine snapshots
    // change (no hand edits), and nothing judged that they — or the
    // fixtures they write — exist. A deleted door would leave the
    // snapshots frozen with no lawful refresh path.
    const pkg = JSON.parse(
      readFileSync(join(ROOT, "packages", "engines", "comfyui-cordis", "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };
    const scripts = pkg.scripts!;
    const doors: [string, string, string][] = [
      ["regen:vocab", "scripts/regen-vocab.ts", ""],
      ["regen:object-info", "scripts/regen-object-info-min.ts", ""],
    ];
    for (const [door, script] of doors) {
      expect(scripts[door], `comfyui-cordis door ${door} exists`).toContain(script);
      expect(
        existsSync(join(ROOT, "packages", "engines", "comfyui-cordis", script)),
        `${script} exists on disk`,
      ).toBe(true);
    }
    for (const fixture of [
      "tests/walls/fixtures/object_info.min.json",
      "tests/walls/fixtures/shipped-graph-doc.min.json",
    ]) {
      expect(existsSync(join(ROOT, fixture)), `regen target ${fixture} exists`).toBe(true);
    }
  });

  it("every provisions row is complete: url + sha256 + size_bytes (the reconstruction promise)", () => {
    const rows = provisionRows();
    expect(rows.length, "the DECL plane carries provisions rows — the parse is armed").toBeGreaterThan(50);
    const noUrl = rows.filter((r) => r.url === "" || !/^https?:\/\//.test(r.url));
    const noSha = rows.filter((r) => r.sha === "" || r.sha.length !== 64);
    const noSize = rows.filter((r) => r.size <= 0);
    expect(noUrl, "rows without a fetchable url").toEqual([]);
    expect(noSha, "rows without a 64-hex sha256 pin").toEqual([]);
    expect(noSize, "rows without declared bytes").toEqual([]);
    // DIRECTORY SNAPSHOT ROWS (model-families audit fix 8) carry no
    // single-file triple — a whole HF tree has no one sha/size — so
    // their own completeness law is repo_id + 40-hex revision +
    // a non-empty allow_patterns list. Anything less would pin a
    // floating HEAD the store cannot reconstruct.
    const snap = snapshotRows();
    expect(snap.length, "the snapshot door is armed — at least one directory provision").toBeGreaterThan(0);
    for (const s of snap) {
      expect(s.repoId, `${s.name}: snapshot rows pin a repo_id`).toMatch(/^[\w.-]+\/[\w.-]+$/u);
      expect(s.revision, `${s.name}: snapshot rows pin a 40-hex revision, not a floating HEAD`).toMatch(/^[0-9a-f]{40}$/u);
      expect(s.patterns, `${s.name}: snapshot rows name the files they fetch`).toBeGreaterThan(0);
    }
  });

  it("a declared artifact on disk hashes to its DECL pin (the pins are real)", { timeout: 120_000 }, async () => {
    const STORE = storeRoot();
    if (STORE === undefined) {
      console.warn("SKIP-LOUD: no store overlay on this clone — the disk half of the law cannot judge here");
      return;
    }
    const rows = provisionRows()
      .filter((r) => r.sha !== "" && r.size > 0)
      .map((r) => ({ ...r, path: join(STORE, r.folder, r.name) }))
      .filter((r) => existsSync(r.path));
    expect(rows.length, "declared+present rows the spot-check can choose from").toBeGreaterThan(40);
    // the smallest row keeps the arm fast; the full sweep is the
    // rehearsal's byte-level receipt
    const target = rows.reduce((a, b) => (a.size <= b.size ? a : b))!;
    const disk = statSync(target.path);
    expect(disk.size, `${target.folder}/${target.name} byte count matches the DECL`).toBe(target.size);
    // chunked stream, never whole-file (the estate's sha law: a
    // single Buffer refuses >2GiB files)
    const h = createHash("sha256");
    const stream = createReadStream(target.path);
    for await (const chunk of stream) h.update(chunk as Buffer);
    expect(h.digest("hex"), `${target.folder}/${target.name} hashes to its DECL pin`).toBe(target.sha);
  });

  it("the rehearsal's engine seat matches the estate's pinned engine", () => {
    const rehearsal = readFileSync(join(ROOT, "tools", "first-image-rehearsal.mjs"), "utf8");
    expect(rehearsal, "the rehearsal defaults to the estate engine :8188").toMatch(/127\.0\.0\.1:8188/);
  });
});

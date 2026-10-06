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

  it("every provisions row is complete: url + sha256 + size_bytes (the reconstruction promise)", () => {
    const rows = provisionRows();
    expect(rows.length, "the DECL plane carries provisions rows — the parse is armed").toBeGreaterThan(50);
    const noUrl = rows.filter((r) => r.url === "" || !/^https?:\/\//.test(r.url));
    const noSha = rows.filter((r) => r.sha === "" || r.sha.length !== 64);
    const noSize = rows.filter((r) => r.size <= 0);
    expect(noUrl, "rows without a fetchable url").toEqual([]);
    expect(noSha, "rows without a 64-hex sha256 pin").toEqual([]);
    expect(noSize, "rows without declared bytes").toEqual([]);
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

// consumer-install-github-way.spec.ts — THE KEYLESS GITHUB-INSTALL WALL
//
// The consumer install path: a Melite release seats into a DSH profile
// entirely from the release's public assets — no npm account, no token,
// no clone, no build permission. This wall owns the scaffold's contract:
// the profile shape it writes, the overrides coverage that makes the
// whole release resolvable from its own assets, the loud refusals (a
// manifest without names, a bundle the release does not carry, a foreign
// profile), and the refuse-or-backup law over pre-existing state.
//
// Run: npx vitest run tests/walls/ts/suites/consumer-install-github-way.spec.ts
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, existsSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const SCRIPT = join(ROOT, "tools", "consumer-install.mjs");

/** A fixture release: N tiny packages packed as tarballs plus a
 *  manifest-2. The scaffold never opens the tarballs (it maps name →
 *  asset from the manifest), but real tarballs keep the fixture the
 *  same shape a minted release has. */
function fixtureRelease(dir: string, rows: Array<{ name: string; version: string }>): string {
  mkdirSync(dir, { recursive: true });
  const packages: Array<{ name: string; version: string; file: string; bytes: number; sha256: string }> = [];
  for (const { name, version } of rows) {
    const pkgDir = join(dir, ".pkgs", name.replace("@", "").replace("/", "-"));
    mkdirSync(join(pkgDir, "package"), { recursive: true });
    writeFileSync(join(pkgDir, "package", "package.json"), JSON.stringify({ name, version, private: true }) + "\n");
    const file = `${name.replace("@", "").replace("/", "-")}-${version}.tgz`;
    execFileSync("tar", ["-czf", join(dir, file), "-C", pkgDir, "package"]);
    packages.push({ name, version, file, bytes: 1, sha256: "0".repeat(64) });
  }
  writeFileSync(
    join(dir, "release-manifest.json"),
    JSON.stringify({ manifest: 2, tag: "v-test", commit: "0".repeat(40), packedAt: "test", packages }) + "\n",
  );
  return dir;
}

/** The release set of the studio profile's melite rows (the names the
 *  base mounts). External @deepseek-ai/* rows never ride the release. */
const STUDIO_ROWS = [
  "@melite/harness-provisioner", "@melite/harness-tools", "@melite-plugin/dsh-estate",
  "@melite/card-base", "@melite/three-client", "@melite-plugin/dsh-card-view",
  "@melite-plugin/dsh-card-deck", "@melite-plugin/dsh-gallery",
  "@melite/video-h3-timeline", "@melite/motion-motion", "@melite/image-input-prep",
];

/** Run the installer; the refusal arms need stderr and the exit code, so
 *  capture instead of letting execFileSync throw. */
function runInstallerChecked(argv: string[]): { code: number; out: string } {
  try {
    const out = execFileSync("node", [SCRIPT, ...argv], { encoding: "utf8", maxBuffer: 16 << 20, stdio: ["ignore", "pipe", "pipe"] }) as unknown as string;
    return { code: 0, out };
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return { code: err.status ?? 1, out: (err.stdout ?? "") + (err.stderr ?? "") };
  }
}

describe("consumer-install (the keyless github-way scaffold)", () => {
  it("seats the studio profile from a release: URL dependencies, exact bundle rows, pinned estate seats", () => {
    const work = mkdtempSync(join(tmpdir(), "consumer-install-"));
    try {
      const from = fixtureRelease(join(work, "release"), STUDIO_ROWS.map((name) => ({ name, version: "1.0.0-test" })));
      const dshHome = join(work, "dsh");
      const { code, out } = runInstallerChecked(["--tag", "v-test", "--dsh-home", dshHome, "--from", from, "--no-install"]);
      expect(code, out).toBe(0);

      const pkg = JSON.parse(readFileSync(join(dshHome, "profiles/melite-test/package.json"), "utf8"));
      // every mounted melite bundle is a direct dependency on its release asset
      for (const name of STUDIO_ROWS) {
        expect(pkg.dependencies[name], `${name} must be a direct dependency`).toMatch(/^file:.*\.tgz$/);
      }
      // in-box rows are bundle rows only — never release dependencies
      expect(pkg.dependencies["@deepseek-ai/dsh-base"]).toBeUndefined();
      expect(pkg.dsh.profile.bundles).toContain("@deepseek-ai/dsh-base");
      expect(pkg.dsh.profile.bundles).toContain("@melite/harness-tools");
      expect(new Set(pkg.dsh.profile.bundles).size).toBe(pkg.dsh.profile.bundles.length);

      // the estate seats are pinned by configuration — no unpinned boot
      const patch = readFileSync(join(dshHome, "profiles/melite-test/cordis.patch.yml"), "utf8");
      expect(patch).toContain("- id: melite-estate");
      expect(patch).toMatch(/stateRoot: .*\.local\/share\/melite\/melite-test/);
      expect(patch).toContain("durableDownloads: true");

      const prov = JSON.parse(readFileSync(join(dshHome, "profiles/melite-test/render-provenance.json"), "utf8"));
      expect(prov.renderer).toBe("consumer-install");
      expect(prov.packages).toBe(STUDIO_ROWS.length);
    } finally { rmSync(work, { recursive: true, force: true }); }
  });

  it("the overrides map covers EVERY package of the release — the graph resolves from its own assets", () => {
    const work = mkdtempSync(join(tmpdir(), "consumer-install-"));
    try {
      const rows = [...STUDIO_ROWS, "@melite/models-h3", "@melite/audio-tts"];
      const from = fixtureRelease(join(work, "release"), rows.map((name) => ({ name, version: "1.0.0-test" })));
      const dshHome = join(work, "dsh");
      const { code, out } = runInstallerChecked(["--tag", "v-test", "--dsh-home", dshHome, "--from", from, "--no-install"]);
      expect(code, out).toBe(0);
      const ws = readFileSync(join(dshHome, "profiles/melite-test/pnpm-workspace.yaml"), "utf8");
      const named = [...ws.matchAll(/^  "(?<name>@[^"]+)": (?<url>".*")$/gm)];
      expect(named.length, "one override row per release package — no more, no fewer").toBe(rows.length);
      for (const m of named) {
        expect(m.groups!.url).toMatch(/^"file:.*\.tgz"$/);
      }
      for (const name of rows) expect(ws).toContain(`"${name}"`);
      // the map is the coverage: a package only reachable through another
      // package's dependency graph still resolves from its release asset
      expect(ws).toContain('"@melite/models-h3"');
      expect(ws).toContain('"@melite/audio-tts"');
    } finally { rmSync(work, { recursive: true, force: true }); }
  });

  it("refuses a manifest without package names (v1) — the cure is a named-row release", () => {
    const work = mkdtempSync(join(tmpdir(), "consumer-install-"));
    try {
      const from = fixtureRelease(join(work, "release"), STUDIO_ROWS.map((name) => ({ name, version: "1.0.0-test" })));
      const manifestPath = join(from, "release-manifest.json");
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      const v1 = { ...manifest, manifest: 1, packages: manifest.packages.map(({ name, ...rest }: { name: string } & Record<string, unknown>) => rest) };
      writeFileSync(manifestPath, JSON.stringify(v1) + "\n");
      const { code, out } = runInstallerChecked(["--tag", "v-test", "--dsh-home", join(work, "dsh"), "--from", from, "--no-install"]);
      expect(code).not.toBe(0);
      expect(out).toContain("without package names");
    } finally { rmSync(work, { recursive: true, force: true }); }
  });

  it("refuses a profile whose bundle the release does not carry — never boot into a missing dependency", () => {
    const work = mkdtempSync(join(tmpdir(), "consumer-install-"));
    try {
      const short = STUDIO_ROWS.filter((n) => n !== "@melite/card-base");
      const from = fixtureRelease(join(work, "release"), short.map((name) => ({ name, version: "1.0.0-test" })));
      const { code, out } = runInstallerChecked(["--tag", "v-test", "--dsh-home", join(work, "dsh"), "--from", from, "--no-install"]);
      expect(code).not.toBe(0);
      expect(out).toContain("@melite/card-base");
      expect(out).toContain("does not carry it");
    } finally { rmSync(work, { recursive: true, force: true }); }
  });

  it("refuse-or-backup: a foreign profile package.json is never clobbered silently", () => {
    const work = mkdtempSync(join(tmpdir(), "consumer-install-"));
    try {
      const from = fixtureRelease(join(work, "release"), STUDIO_ROWS.map((name) => ({ name, version: "1.0.0-test" })));
      const dshHome = join(work, "dsh");
      const pkgPath = join(dshHome, "profiles/melite-test/package.json");
      mkdirSync(dirname(pkgPath), { recursive: true });
      writeFileSync(pkgPath, '{"name": "hand-composed"}\n');
      const refused = runInstallerChecked(["--tag", "v-test", "--dsh-home", dshHome, "--from", from, "--no-install"]);
      expect(refused.code).not.toBe(0);
      expect(refused.out).toContain("--force-render");
      expect(readFileSync(pkgPath, "utf8")).toContain("hand-composed");

      const forced = runInstallerChecked(["--tag", "v-test", "--dsh-home", dshHome, "--from", from, "--no-install", "--force-render"]);
      expect(forced.code, forced.out).toBe(0);
      expect(readFileSync(pkgPath + ".prerender.bak", "utf8")).toContain("hand-composed");
      expect(readFileSync(pkgPath, "utf8")).toContain("dsh-profile-melite-test");
      // a re-render of our own output needs no force
      const again = runInstallerChecked(["--tag", "v-test", "--dsh-home", dshHome, "--from", from, "--no-install"]);
      expect(again.code, again.out).toBe(0);
    } finally { rmSync(work, { recursive: true, force: true }); }
  });

  it("the estate profile disables the web rows and carries no headless pin", () => {
    const work = mkdtempSync(join(tmpdir(), "consumer-install-"));
    try {
      const rows = ["@melite/harness-provisioner", "@melite/harness-tools", "@melite-plugin/dsh-estate"]
        .map((name) => ({ name, version: "1.0.0-test" }));
      const from = fixtureRelease(join(work, "release"), rows);
      const dshHome = join(work, "dsh");
      const { code, out } = runInstallerChecked(["--tag", "v-test", "--dsh-home", dshHome, "--from", from, "--profile", "estate", "--no-install"]);
      expect(code, out).toBe(0);
      const patch = readFileSync(join(dshHome, "profiles/estate/cordis.patch.yml"), "utf8");
      expect(patch).toContain("- id: infer-card-view\n  disabled: true");
      // HEADLESS IS DSH'S (2026-11-14): the retired melite-tools
      // `headless: true` interface row must not grow back — the run
      // doors follow the home's persisted delegation record.
      expect(patch).not.toContain("headless");
      expect(patch).not.toContain("durableDownloads");
      const pkg = JSON.parse(readFileSync(join(dshHome, "profiles/estate/package.json"), "utf8"));
      expect(pkg.dependencies["@melite-plugin/dsh-card-view"]).toBeUndefined();
    } finally { rmSync(work, { recursive: true, force: true }); }
  });

  it("refuses the retired melite headless profile — HEADLESS IS DSH'S", () => {
    const work = mkdtempSync(join(tmpdir(), "consumer-install-"));
    try {
      const from = fixtureRelease(join(work, "release"), STUDIO_ROWS.map((name) => ({ name, version: "1.0.0-test" })));
      const { code, out } = runInstallerChecked(["--tag", "v-test", "--dsh-home", join(work, "dsh"), "--from", from, "--profile", "headless", "--no-install"]);
      expect(code).not.toBe(0);
      expect(out).toContain("unknown profile 'headless'");
      expect(out).toContain("known: melite-test, estate");
    } finally { rmSync(work, { recursive: true, force: true }); }
  });

  it("requires --tag — the install is pinned to a release, never a moving ref", () => {
    const r = runInstallerChecked(["--dsh-home", "/tmp/x", "--no-install"]);
    expect(r.code).not.toBe(0);
    expect(r.out).toContain("--tag is required");
  });
});

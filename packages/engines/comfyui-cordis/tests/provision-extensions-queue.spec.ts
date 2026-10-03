// provision-extensions manager channel — the allow_git_url_install
// flag writer that admits git-url installs, and the on-disk remote
// verification (the estate's operator law 2026-10-13: Manager is
// the ONE extension vendor; the CLI never clones — installs ride
// POST /customnode/install/git_url, verified by the clone's remote).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import { join } from "node:path";
import {
  clearStaleInstall,
  ensureManagerGitUrlAllowed,
  installedHead,
  urlInstalled,
} from "../scripts/provision-extensions-install.ts";
import { symlinkSync, existsSync } from "node:fs";

describe("ensureManagerGitUrlAllowed", () => {
  const dir = mkdtempSync(join(tmpdir(), "melite-ext-flag-"));
  const cfg = join(dir, "config.ini");

  it("creates the config with the flag and reports it unstable", () => {
    assert.equal(ensureManagerGitUrlAllowed(cfg), false);
    assert.match(readFileSync(cfg, "utf8"),
      /allow_git_url_install = true/);
  });
  it("is idempotent once the flag is pinned", () => {
    assert.equal(ensureManagerGitUrlAllowed(cfg), true);
  });
  it("appends the flag to an existing config without touching it otherwise", () => {
    const cfg2 = join(dir, "existing.ini");
    writeFileSync(cfg2, "[default]\nsecurity_level = weak\n");
    assert.equal(ensureManagerGitUrlAllowed(cfg2), false);
    const text = readFileSync(cfg2, "utf8");
    assert.match(text, /security_level = weak/);
    assert.match(text, /allow_git_url_install = true/);
  });
  it("refuses to bless a flag set to false", () => {
    const cfg3 = join(dir, "false.ini");
    writeFileSync(cfg3, "[default]\nallow_git_url_install = false\n");
    assert.equal(ensureManagerGitUrlAllowed(cfg3), false);
  });

  it("cleans up", () => { rmSync(dir, { recursive: true, force: true }); });
});

describe("urlInstalled + installedHead", () => {
  const dir = mkdtempSync(join(tmpdir(), "melite-ext-verify-"));
  const url = "https://github.com/JayDataEngineer/melite-sfx-nodes.git";
  const cn = join(dir, "custom_nodes", "melite-sfx-nodes");
  mkdirSync(cn, { recursive: true });
  execSync("git init -q", { cwd: cn });
  execSync("git config remote.origin.url " + url, { cwd: cn });
  execSync("git commit -q --allow-empty -m probe", { cwd: cn });

  it("matches the installed clone by its git remote, not its dir name", () => {
    assert.equal(urlInstalled(url, dir), true);
    assert.equal(urlInstalled(
      "https://github.com/JayDataEngineer/melite-poser-nodes", dir), false);
  });
  it("normalizes trailing slashes and .git suffixes", () => {
    assert.equal(urlInstalled(
      "https://github.com/JayDataEngineer/melite-sfx-nodes", dir), true);
  });
  it("reads the installed HEAD for ref-pin verification", () => {
    const head = execSync("git rev-parse HEAD",
      { cwd: cn, encoding: "utf8" }).trim();
    assert.equal(installedHead(dir, "melite-sfx-nodes"), head);
    assert.equal(installedHead(dir, "not-a-clone"), "");
  });

  it("cleans up", () => { rmSync(dir, { recursive: true, force: true }); });
});

describe("clearStaleInstall", () => {
  const url = "https://github.com/JayDataEngineer/melite-sfx-nodes";
  let dir: string;
  let cn: string;

  it("sets up", () => {
    dir = mkdtempSync(join(tmpdir(), "melite-clear-"));
    cn = join(dir, "custom_nodes");
    mkdirSync(cn);
  });

  it("no-ops when the path is absent", () => {
    assert.equal(clearStaleInstall(url, dir), "");
  });

  it("unlinks a dev-era symlink without touching its target", () => {
    const victim = join(dir, "vendor-copy");
    mkdirSync(victim);
    writeFileSync(join(victim, "nodes.py"), "# pack\n");
    symlinkSync(victim, join(cn, "melite-sfx-nodes"));
    assert.equal(clearStaleInstall(url, dir), "symlink");
    assert.equal(existsSync(join(cn, "melite-sfx-nodes")), false);
    assert.equal(existsSync(join(victim, "nodes.py")), true);
  });

  it("removes a real-copy directory (no git, no remote)", () => {
    mkdirSync(join(cn, "melite-sfx-nodes"));
    writeFileSync(join(cn, "melite-sfx-nodes", "nodes.py"), "# pack\n");
    assert.equal(clearStaleInstall(url, dir), "directory");
    assert.equal(existsSync(join(cn, "melite-sfx-nodes")), false);
  });

  it("removes a stale clone with a different remote", () => {
    const other = join(dir, "other-origin.git");
    execSync("git init --quiet --bare " + JSON.stringify(other),
      { encoding: "utf8" });
    execSync("git clone --quiet " + JSON.stringify(other) +
      " melite-sfx-nodes", { cwd: cn, encoding: "utf8" });
    assert.equal(clearStaleInstall(url, dir), "stale clone");
    assert.equal(existsSync(join(cn, "melite-sfx-nodes")), false);
  });

  it("keeps a Manager install of this remote", () => {
    const keep = join(cn, "melite-sfx-nodes");
    const origin = join(dir, "pack-origin.git");
    execSync("git init --quiet --bare " + JSON.stringify(origin),
      { encoding: "utf8" });
    execSync("git clone --quiet " + JSON.stringify(origin) +
      " melite-sfx-nodes", { cwd: cn, encoding: "utf8" });
    execSync("git remote set-url origin " + url,
      { cwd: keep, encoding: "utf8" });
    assert.equal(clearStaleInstall(url, dir), "");
    assert.equal(existsSync(join(keep, ".git")), true);
  });

  it("cleans up", () => { rmSync(dir, { recursive: true, force: true }); });
});

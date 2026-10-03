// provision-extensions manager-queue channel — the payload contract
// for /manager/queue/install (unknown git-url form), the drain
// predicate over /manager/queue/status, the allow_git_url_install
// flag writer, and the on-disk remote verification (the estate's
// operator law 2026-10-13: Manager is the ONE extension vendor; the
// CLI never clones).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import { join } from "node:path";
import {
  ensureManagerGitUrlAllowed,
  installedHead,
  queueDrained,
  queueInstallPayload,
  urlInstalled,
} from "../scripts/provision-extensions-install.ts";

describe("queueInstallPayload", () => {
  it("builds the unknown git-url form Manager's route accepts", () => {
    const body = queueInstallPayload(
      "melite-sfx-nodes", "https://github.com/JayDataEngineer/melite-sfx-nodes");
    assert.deepEqual(body, {
      id: "unknown",
      version: "unknown",
      selected_version: "unknown",
      files: ["https://github.com/JayDataEngineer/melite-sfx-nodes"],
      pip: [],
      channel: "default",
      mode: "cache",
      ui_id: "melite-sfx-nodes",
    });
  });
});

describe("queueDrained", () => {
  it("drains only when nothing processes and counts match", () => {
    assert.equal(queueDrained(
      { total_count: 3, done_count: 3, is_processing: false }), true);
    assert.equal(queueDrained(
      { total_count: 3, done_count: 2, is_processing: false }), false);
    assert.equal(queueDrained(
      { total_count: 3, done_count: 3, is_processing: true }), false);
  });
});

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

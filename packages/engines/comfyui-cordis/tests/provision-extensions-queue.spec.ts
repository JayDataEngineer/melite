// provision-extensions manager channel — the config pin that admits
// git-url installs and holds the estate-proven channel (Manager
// 3.41's own Comfy-Org default raises InvalidChannel, its cache
// never warms, and every git-url install is refused), and the
// on-disk remote verification (the estate's operator law
// 2026-10-13: Manager is the ONE extension vendor; the CLI never
// clones — installs ride POST /customnode/install/git_url,
// verified by the clone's remote).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import { join } from "node:path";
import {
  clearStaleInstall,
  ensureManagerPinnedConfig,
  installedDirFor,
  installedHead,
  landedVerdict,
  urlInstalled,
} from "../scripts/provision-extensions-install.ts";
import { symlinkSync, existsSync } from "node:fs";

describe("ensureManagerPinnedConfig", () => {
  const dir = mkdtempSync(join(tmpdir(), "melite-ext-flag-"));
  const cfg = join(dir, "config.ini");

  it("creates the config with both pins and reports it unstable", () => {
    assert.equal(ensureManagerPinnedConfig(cfg), false);
    const text = readFileSync(cfg, "utf8");
    assert.match(text, /allow_git_url_install = true/);
    assert.match(text, /channel_url = https:\/\/raw\.githubusercontent\.com\/ltdrdata\/ComfyUI-Manager\/main/);
  });
  it("is idempotent once both pins are in place", () => {
    assert.equal(ensureManagerPinnedConfig(cfg), true);
  });
  it("appends the pins to an existing config without touching it otherwise", () => {
    const cfg2 = join(dir, "existing.ini");
    writeFileSync(cfg2, "[default]\nsecurity_level = weak\n");
    assert.equal(ensureManagerPinnedConfig(cfg2), false);
    const text = readFileSync(cfg2, "utf8");
    assert.match(text, /security_level = weak/);
    assert.match(text, /allow_git_url_install = true/);
  });
  it("refuses to bless a flag set to false", () => {
    const cfg3 = join(dir, "false.ini");
    writeFileSync(cfg3, "[default]\nallow_git_url_install = false\n");
    assert.equal(ensureManagerPinnedConfig(cfg3), false);
  });
  it("replaces Manager's own Comfy-Org default channel with the estate-proven one", () => {
    // the stranger's fresh boot: Manager 3.41 writes its default
    // channel, its cache-update thread raises InvalidChannel, and
    // every git-url install is refused until the pin rewrites it
    const cfg4 = join(dir, "comfyorg.ini");
    writeFileSync(cfg4,
      "[default]\nsecurity_level = normal-\nchannel_url = https://raw.githubusercontent.com/Comfy-Org/ComfyUI-Manager/main\n");
    assert.equal(ensureManagerPinnedConfig(cfg4), false);
    const text = readFileSync(cfg4, "utf8");
    assert.doesNotMatch(text, /Comfy-Org/);
    assert.match(text, /channel_url = https:\/\/raw\.githubusercontent\.com\/ltdrdata\/ComfyUI-Manager\/main/);
    assert.match(text, /security_level = normal-/);
    assert.equal(ensureManagerPinnedConfig(cfg4), true);
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

  it("removes a foreign-remote clone squatting a renamed casing of the row's name", () => {
    // the impact packs' live shape (2026-10-15): a clone of
    // comfyanonymous/ComfyUI.git sat at "comfyui-impact-pack", so
    // Manager answered "Already exists" over it and installed
    // nothing — the declaration is the truth, the squatter goes.
    rmSync(join(cn, "melite-sfx-nodes"), { recursive: true, force: true });
    const other = join(dir, "foreign-origin.git");
    execSync("git init --quiet --bare " + JSON.stringify(other),
      { encoding: "utf8" });
    execSync("git clone --quiet " + JSON.stringify(other) +
      " MELITE-SFX-NODES", { cwd: cn, encoding: "utf8" });
    assert.equal(clearStaleInstall(url, dir), "stale clone");
    assert.equal(existsSync(join(cn, "MELITE-SFX-NODES")), false);
  });

  it("keeps a renamed dir that carries the row's own remote", () => {
    const keep = join(cn, "Melite-Sfx-Nodes");
    const origin = join(dir, "pack-origin-2.git");
    execSync("git init --quiet --bare " + JSON.stringify(origin),
      { encoding: "utf8" });
    execSync("git clone --quiet " + JSON.stringify(origin) +
      " Melite-Sfx-Nodes", { cwd: cn, encoding: "utf8" });
    execSync("git remote set-url origin " + url,
      { cwd: keep, encoding: "utf8" });
    assert.equal(clearStaleInstall(url, dir), "");
    assert.equal(existsSync(join(keep, ".git")), true);
  });

  it("cleans up", () => { rmSync(dir, { recursive: true, force: true }); });
});

describe("landedVerdict (the CLI step's landed-HEAD law)", () => {
  // The runtime provider fails closed on the landed commit
  // (manager-provider.ts:415-432) and the CLI step now speaks the
  // same law: a declared pin is checked against the commit on disk,
  // and a row that reports none is unverifiable, not a pass.
  const workspace = mkdtempSync(join(tmpdir(), "melite-ext-verdict-"));
  const url = "https://github.com/JayDataEngineer/melite-tts-nodes";

  // a row is verified in the directory whose git remote IS the url —
  // Manager renames install dirs, so the repo name is not the dir.
  const landAClone = (dir: string, head: string, atUrl: string = url): void => {
    const path = join(workspace, "custom_nodes", dir);
    mkdirSync(path, { recursive: true });
    execSync("git init -q . && git config user.email t@t && git config user.name t && " +
      "git commit -q --allow-empty -m seed", { cwd: path, encoding: "utf8" });
    execSync("git remote add origin " + atUrl, { cwd: path, encoding: "utf8" });
    if (head !== "") execSync("git reset -q --hard " + head, { cwd: path, encoding: "utf8" });
  };

  const commit = (dir: string): string => execSync("git rev-parse HEAD", {
    cwd: join(workspace, "custom_nodes", dir),
    encoding: "utf8",
  }).trim();

  it("a clone at the declared ref passes — the step's own equality", () => {
    landAClone("melite-tts-nodes", "");
    const head = commit("melite-tts-nodes");
    assert.equal(landedVerdict("melite-tts-nodes", url, head, workspace), "");
  });

  it("verifies the head in the dir whose remote IS the url — Manager renames install dirs", () => {
    // the live seven-pack shape (2026-10-15): Manager landed
    // lrzjason/Comfyui-QwenEditUtils as "qweneditutils" while the
    // name-derived lookup read the absent "Comfyui-QwenEditUtils" —
    // seven rows pinned exactly were failed as unverifiable.
    const qu = "https://github.com/lrzjason/Comfyui-QwenEditUtils";
    landAClone("qweneditutils", "", qu);
    const head = commit("qweneditutils");
    assert.equal(installedDirFor(qu, workspace), "qweneditutils");
    assert.equal(landedVerdict("Comfyui-QwenEditUtils", qu, head, workspace), "");
  });

  it("the SAME clone, advanced one commit, is drift — named with both shas", () => {
    const clone = join(workspace, "custom_nodes", "melite-tts-nodes");
    const atPin = commit("melite-tts-nodes");
    execSync("git commit -q --allow-empty -m drift && git rev-parse HEAD", {
      cwd: clone,
      encoding: "utf8",
    }).trim();
    const verdict = landedVerdict("melite-tts-nodes", url, atPin, workspace);
    assert.match(verdict, /landed at/);
    assert.match(verdict, /but the declaration pins/);
  });

  it("a row that reports no landed commit is unverifiable — never a pass", () => {
    // the impact packs' shape: Manager installed a zip (a version,
    // no .git), so nothing landed that could be compared.
    mkdirSync(join(workspace, "custom_nodes", "zip-only"), { recursive: true });
    assert.match(
      landedVerdict("comfyui-impact-pack",
        "https://github.com/ltdrdata/ComfyUI-Impact-Pack",
        "5bed9d5545ef430406a5d6d7233e5c0a5e75051a", workspace),
      /reports no landed commit/,
    );
  });

  it("a row with no declared ref carries no verdict (the registry install)", () => {
    assert.equal(landedVerdict("comfyui-impact-pack",
      "https://github.com/ltdrdata/ComfyUI-Impact-Pack", "", workspace), "");
  });
});

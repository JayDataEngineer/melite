// provision-extensions manager channel — the config pin that admits
// git-url installs and holds the estate-proven channel (Manager
// 3.41's own Comfy-Org default raises InvalidChannel, its cache
// never warms, and every git-url install is refused), and the
// on-disk remote verification (the estate's operator law
// 2026-10-13: Manager is the ONE extension vendor; the CLI never
// clones — installs ride POST /customnode/install/git_url,
// verified by the clone's remote).
import { describe, it, vi } from "vitest";
// verifyRoots reads the live tree through engineLiveRoot (the
// overlay seam). The box's own overlay is not this wall's subject —
// mock it to the passed cfg value so every arm is deterministic
// (in production the overlay's value wins over the tracked
// fallback; that precedence is engineField's law, walled in
// provision-config.spec).
vi.mock("../scripts/provision-config.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../scripts/provision-config.ts")>()),
  engineLiveRoot: (cfg: { live_root?: string }): string =>
    (cfg.live_root ?? "").trim(),
}));
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { execSync } from "node:child_process";
import { join } from "node:path";

// GIT SCRUB (2026-10-20): this spec's scratch repos are hermetic
// by construction, but a `git commit --only` PARENT exports its
// transient GIT_INDEX_FILE into pre-commit-hook children — the
// scratch commit then built trees from THIS repo's next-index
// and died on blobs the scratch object store never had
// ("invalid object for .agents/skills/..."; the hook bounced two
// clean commits on it while every bare run stayed green). Every
// git child here runs with the repo-locating vars scrubbed so
// cwd is the only truth.
const gitEnv = {
  ...process.env,
  GIT_INDEX_FILE: undefined,
  GIT_DIR: undefined,
  GIT_WORK_TREE: undefined,
} as typeof process.env;
import {
  clearStaleInstall,
  ensureManagerPinnedConfig,
  installedDirFor,
  installedHead,
  landedIn,
  landedVerdict,
  urlInstalled,
  verifyRoots,
} from "../scripts/provision-extensions-install.ts";
import { runtime } from "../scripts/provision-shared.ts";
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
  const url = "https://github.com/JayDataEngineer/melite-audio-nodes.git";
  const cn = join(dir, "custom_nodes", "melite-audio-nodes");
  mkdirSync(cn, { recursive: true });
  execSync("git init -q", { cwd: cn, env: gitEnv });
  execSync("git config remote.origin.url " + url, { cwd: cn, env: gitEnv });
  execSync("git commit -q --allow-empty -m probe", { cwd: cn, env: gitEnv });

  it("matches the installed clone by its git remote, not its dir name", () => {
    assert.equal(urlInstalled(url, dir), true);
    assert.equal(urlInstalled(
      "https://github.com/JayDataEngineer/melite-poser-nodes", dir), false);
  });
  it("normalizes trailing slashes and .git suffixes", () => {
    assert.equal(urlInstalled(
      "https://github.com/JayDataEngineer/melite-audio-nodes", dir), true);
  });
  it("reads the installed HEAD for ref-pin verification", () => {
    const head = execSync("git rev-parse HEAD",
      { cwd: cn, encoding: "utf8", env: gitEnv }).trim();
    assert.equal(installedHead(dir, "melite-audio-nodes"), head);
    assert.equal(installedHead(dir, "not-a-clone"), "");
  });

  it("cleans up", () => { rmSync(dir, { recursive: true, force: true }); });
});

describe("clearStaleInstall", () => {
  const url = "https://github.com/JayDataEngineer/melite-audio-nodes";
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
    symlinkSync(victim, join(cn, "melite-audio-nodes"));
    assert.equal(clearStaleInstall(url, dir), "symlink");
    assert.equal(existsSync(join(cn, "melite-audio-nodes")), false);
    assert.equal(existsSync(join(victim, "nodes.py")), true);
  });

  it("removes a real-copy directory (no git, no remote)", () => {
    mkdirSync(join(cn, "melite-audio-nodes"));
    writeFileSync(join(cn, "melite-audio-nodes", "nodes.py"), "# pack\n");
    assert.equal(clearStaleInstall(url, dir), "directory");
    assert.equal(existsSync(join(cn, "melite-audio-nodes")), false);
  });

  it("removes a stale clone with a different remote", () => {
    const other = join(dir, "other-origin.git");
    execSync("git init --quiet --bare " + JSON.stringify(other),
      { encoding: "utf8" });
    execSync("git clone --quiet " + JSON.stringify(other) +
      " melite-audio-nodes", { cwd: cn, encoding: "utf8" });
    assert.equal(clearStaleInstall(url, dir), "stale clone");
    assert.equal(existsSync(join(cn, "melite-audio-nodes")), false);
  });

  it("keeps a Manager install of this remote", () => {
    const keep = join(cn, "melite-audio-nodes");
    const origin = join(dir, "pack-origin.git");
    execSync("git init --quiet --bare " + JSON.stringify(origin),
      { encoding: "utf8" });
    execSync("git clone --quiet " + JSON.stringify(origin) +
      " melite-audio-nodes", { cwd: cn, encoding: "utf8" });
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
    rmSync(join(cn, "melite-audio-nodes"), { recursive: true, force: true });
    const other = join(dir, "foreign-origin.git");
    execSync("git init --quiet --bare " + JSON.stringify(other),
      { encoding: "utf8" });
    execSync("git clone --quiet " + JSON.stringify(other) +
      " MELITE-AUDIO-NODES", { cwd: cn, encoding: "utf8" });
    assert.equal(clearStaleInstall(url, dir), "stale clone");
    assert.equal(existsSync(join(cn, "MELITE-AUDIO-NODES")), false);
  });

  it("keeps a renamed dir that carries the row's own remote", () => {
    const keep = join(cn, "Melite-Audio-Nodes");
    const origin = join(dir, "pack-origin-2.git");
    execSync("git init --quiet --bare " + JSON.stringify(origin),
      { encoding: "utf8" });
    execSync("git clone --quiet " + JSON.stringify(origin) +
      " Melite-Audio-Nodes", { cwd: cn, encoding: "utf8" });
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
  const url = "https://github.com/JayDataEngineer/melite-audio-nodes";

  // a row is verified in the directory whose git remote IS the url —
  // Manager renames install dirs, so the repo name is not the dir.
  const landAClone = (dir: string, head: string, atUrl: string = url): void => {
    const path = join(workspace, "custom_nodes", dir);
    mkdirSync(path, { recursive: true });
    execSync("git init -q . && git config user.email t@t && git config user.name t && " +
      "git commit -q --allow-empty -m seed", { cwd: path, encoding: "utf8", env: gitEnv });
    execSync("git remote add origin " + atUrl, { cwd: path, encoding: "utf8", env: gitEnv });
    if (head !== "") execSync("git reset -q --hard " + head, { cwd: path, encoding: "utf8", env: gitEnv });
  };

  const commit = (dir: string): string => execSync("git rev-parse HEAD", {
    cwd: join(workspace, "custom_nodes", dir),
    encoding: "utf8",
  }).trim();

  it("a clone at the declared ref passes — the step's own equality", () => {
    landAClone("melite-audio-nodes", "");
    const head = commit("melite-audio-nodes");
    assert.equal(landedVerdict("melite-audio-nodes", url, head, [workspace]), "");
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
    assert.equal(landedVerdict("Comfyui-QwenEditUtils", qu, head, [workspace]), "");
  });

  it("the SAME clone, advanced one commit, is drift — named with both shas", () => {
    const clone = join(workspace, "custom_nodes", "melite-audio-nodes");
    const atPin = commit("melite-audio-nodes");
    execSync("git commit -q --allow-empty -m drift && git rev-parse HEAD", {
      cwd: clone,
      encoding: "utf8",
      env: gitEnv,
    }).trim();
    const verdict = landedVerdict("melite-audio-nodes", url, atPin, [workspace]);
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
        "5bed9d5545ef430406a5d6d7233e5c0a5e75051a", [workspace]),
      /reports no landed commit/,
    );
  });

  it("a row with no declared ref carries no verdict (the registry install)", () => {
    assert.equal(landedVerdict("comfyui-impact-pack",
      "https://github.com/ltdrdata/ComfyUI-Impact-Pack", "", [workspace]), "");
  });
});

describe("the two-tree verify (landedIn + verifyRoots)", () => {
  // The 2026-10-16 misreport class (roadmap): Manager's door
  // installs into the tree its engine runs from (the live engine's
  // service tree), while the CLI verified only against the repo's
  // IaC runtime — so a new row landed at its pin was retried into
  // Manager's "Already exists" 400s until the loop exhausted, then
  // reported FAILED. The cure: verify against EVERY tree, and say
  // which one held the clone.
  const url = "https://github.com/JayDataEngineer/melite-kimodo-nodes";
  const mkTree = (tag: string, withClone: boolean): string => {
    const root = mkdtempSync(join(tmpdir(), "melite-two-tree-" + tag + "-"));
    if (!withClone) {
      mkdirSync(join(root, "custom_nodes"), { recursive: true });
      return root;
    }
    const clone = join(root, "custom_nodes", "melite-kimodo-nodes");
    mkdirSync(clone, { recursive: true });
    execSync("git init -q . && git config user.email t@t && " +
      "git config user.name t && git commit -q --allow-empty -m seed",
      { cwd: clone, encoding: "utf8", env: gitEnv });
    execSync("git remote add origin " + url, { cwd: clone, encoding: "utf8", env: gitEnv });
    return root;
  };
  // the IaC runtime is EMPTY (the exact misreport shape: Manager
  // never installs there on the two-tree estate); only the live
  // engine's tree carries the clone.
  const iac = mkTree("iac", false);
  const live = mkTree("live", true);
  const liveHead = execSync("git rev-parse HEAD",
    { cwd: join(live, "custom_nodes", "melite-kimodo-nodes"), encoding: "utf8", env: gitEnv }).trim();

  it("landedIn finds the row in the SECOND tree when the IaC runtime is empty", () => {
    // the exact GGUF/audio-pins shape: RUNTIME never saw the
    // install; the live engine's tree has it at the pin.
    assert.equal(landedIn(url, [iac, live])?.root, live);
    assert.equal(landedIn(url, [iac]) ?? null, null);
  });

  it("the verdict across BOTH trees passes at the pin and names the tree on drift", () => {
    assert.equal(
      landedVerdict("melite-kimodo-nodes", url, liveHead, [iac, live]), "");
    const drifted = landedVerdict("melite-kimodo-nodes", url,
      "1111111111111111111111111111111111111111", [iac, live]);
    assert.match(drifted, /landed at/);
    assert.match(drifted, new RegExp(live.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      "the drift verdict names the tree the clone sits in");
  });

  it("an unverifiable row across both trees names BOTH in the refusal", () => {
    const verdict = landedVerdict("melite-kimodo-nodes",
      "https://github.com/JayDataEngineer/melite-poser-nodes",
      "2222222222222222222222222222222222222222", [iac, live]);
    assert.match(verdict, /no custom_nodes clone in/);
    assert.match(verdict, new RegExp(
      (iac + ", " + live).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  });

  it("verifyRoots: no live root declared → the IaC runtime alone", () => {
    assert.deepEqual(verifyRoots({}), [runtime()]);
  });

  it("verifyRoots: a declared live root joins AFTER the IaC runtime; RUNTIME itself never duplicates", () => {
    assert.deepEqual(verifyRoots({ live_root: live }), [runtime(), live]);
    assert.deepEqual(verifyRoots({ live_root: runtime() }), [runtime()]);
  });

  it("verifyRoots refuses loud when the overlay names a missing live tree", () => {
    // a declared tree the box does not have is a misconfiguration,
    // not a skip. die() is the CLI's process boundary (REFUSED +
    // exit 2), so the wall intercepts the exit and reads the
    // refusal text.
    const lines: string[] = [];
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error("exit " + (code ?? 0));
    }) as never);
    const logSpy = vi.spyOn(console, "log").mockImplementation((...args) => {
      lines.push(args.join(" "));
    });
    try {
      assert.throws(() => verifyRoots({ live_root: iac + "-absent" }), /exit 2/);
      assert.match(lines.join("\n"), /live_root names a tree that does not exist/);
    } finally {
      exitSpy.mockRestore();
      logSpy.mockRestore();
    }
  });

  it("cleans up", () => {
    rmSync(iac, { recursive: true, force: true });
    rmSync(live, { recursive: true, force: true });
  });
});

// wiring-roots.spec.ts — THE ROOTS WALL (the wiring-roots audit,
// 2026-10-13): four roots claimed to be one store and nothing
// reconciled them. A generator bug (anchorDir before the
// empty-guard, 74ab5927) collapsed every yaml category onto the
// checkout for nine days, and the only thing keeping the estate
// composing was the engine tree's own unowned symlink farm — drift
// invisible to every gate because the engine freezes folder roots
// at boot and no wall compared the config, the generated file, the
// engine's booted copy, and the estate store.
//
// This wall owns that seam, all four legs machine-checked:
//   1. IDEMPOTENCE — the yaml on disk is exactly what the config
//      produces (a stale file means `provision paths` was not run
//      after a config edit).
//   2. STORE — the yaml's base IS the estate store root (the
//      estate door and the engine read one store, not two).
//   3. CLOSURE — every family DECL provision folder's category is a
//      yaml key (a weights folder the engine never mounts is a
//      lane that refuses at /prompt — the taggers law).
//   4. BOOT FRESHNESS — the engine process's own yaml equals the
//      generated one; ComfyUI reads folder roots once at boot, so a
//      regenerated file under a running engine is inert until
//      restart. The wall reads the unit process's working tree
//      through /proc — the boot truth, not the config's claim.
//
// Run: npx vitest run tests/walls/ts/suites/wiring-roots.spec.ts
// (or the whole gate: pnpm run test). The battery's engine contract
// holds: the boot legs fail loud when no local engine unit exists,
// exactly like the compose doors fail without an engine.
//
// THE DELEGATION SEAM (re-audit S3, 2026-10-13): legs 4 and 5 read
// the OWNER'S MACHINE — a systemd --user unit and /proc — and no CI
// seat can own that truth; on a runner without the engine
// `systemctl --user show` returns MainPID=0 and the legs would fail
// on a contract CI never had. They stand down under
// MELITE_TIER_DELEGATED=1 (the env tests.yml :33-34/:94-95 already
// sets on the unit/coverage jobs, the same seam the typecheck gate
// rides); the owning surface is the operator's local `pnpm run test`
// on the estate box, where the engine contract is real. The three
// pure legs (repo config, generated yaml, DECL tables) run
// everywhere — they are CI-portable by construction.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import "../../../helpers/boot-models.ts";
import { registryIds, registryModel } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import { boundModelFolders, loadConfig } from "../../../../packages/engines/comfyui-cordis/scripts/provision-config.ts";
import { DEFAULT_CONFIG, REPO, RUNTIME } from "../../../../packages/engines/comfyui-cordis/scripts/provision-shared.ts";
import { wiringYamlBody } from "../../../../packages/engines/comfyui-cordis/scripts/provision-instance-layout.ts";
import { cmdBootCmd } from "../../../../packages/engines/comfyui-cordis/scripts/provision-instance-managed.ts";
import { loadStoreRoot } from "../../../../packages/estate/models/src/index.ts";

const here = fileURLToPath(import.meta.url);

/** The engine unit this estate's battery phones (provision
 *  "managed"): the boot-freshness leg resolves its process. */
const ENGINE_UNIT = "melite-comfyui.service";

function generatedBody(): string {
  return wiringYamlBody(boundModelFolders(loadConfig(DEFAULT_CONFIG)));
}

/** The yaml on disk under the repo's runtime tree. */
function diskBody(): string {
  return readFileSync(`${RUNTIME}/extra_model_paths.yaml`, "utf8");
}

/** The base_path the generated body binds (first melite_weights row). */
function baseOf(body: string): string {
  const row = body.split("\n").find((l) => l.startsWith("  base_path: "));
  assert.ok(row !== undefined, "the yaml carries a base_path row");
  return row.slice("  base_path: ".length);
}

/** The category keys the generated body mounts (two-space rows
 *  under melite_weights, minus base_path). */
function keysOf(body: string): Set<string> {
  const keys = new Set<string>();
  for (const line of body.split("\n")) {
    const m = /^  ([A-Za-z0-9_]+): .+$/.exec(line);
    if (m && m[1] !== "base_path") keys.add(m[1]);
  }
  assert.ok(keys.size > 0, "the yaml mounts at least one category");
  return keys;
}

// DELEGATION SEAM (S3): 1 in CI's delegated seats (unit + coverage
// jobs), 0 on the estate box — see the header comment.
const DELEGATED = process.env.MELITE_TIER_DELEGATED === "1";

describe("the wiring-roots wall (one store, four truths, all reconciled)", () => {
  it("IDEMPOTENCE — the runtime yaml is exactly what the config produces", () => {
    const expected = generatedBody();
    const disk = diskBody();
    assert.equal(disk, expected,
      "data/runtime/comfyui/extra_model_paths.yaml is stale against inference.config.json — run `node --experimental-strip-types packages/engines/comfyui-cordis/scripts/provision.ts paths` and restart the engine (folder roots freeze at boot)");
  });

  it("STORE — the yaml's base IS the estate store root (one store, not two)", () => {
    const storeRoot = loadStoreRoot(REPO);
    assert.ok(storeRoot !== "", "the estate store root resolves non-empty");
    assert.equal(baseOf(generatedBody()), storeRoot,
      "the engine's mounted base and the estate's store root diverged — the estate door and the engine would read different stores");
  });

  it("CLOSURE — every family DECL provision category is a mounted yaml key", () => {
    const mounted = keysOf(generatedBody());
    const missed: string[] = [];
    for (const id of registryIds()) {
      const rows = (registryModel(id) as { provisions?: Array<Record<string, unknown>> }).provisions ?? [];
      for (const row of rows) {
        const folder = String(row["folder"] ?? "");
        if (folder === "") continue;
        const category = folder.split("/")[0];
        if (!mounted.has(category)) missed.push(`${id}: ${folder}`);
      }
    }
    assert.deepEqual(missed, [],
      "provision folders whose category the engine never mounts — the lane refuses at /prompt with the weights on disk (add the category to extra_model_folders)");
  });
});

// THE MACHINE LEGS (S3): owner-local by design — see the header's
// delegation note. skipIf, never a conditional assert: a delegated
// run REPORTS the skip; it does not paint a green bar over a leg
// it never read.
describe.skipIf(DELEGATED)("the boot legs (the engine process's own truths)", () => {
  it("BOOT FRESHNESS — the running engine's yaml equals the generated one", () => {
    let pid = "";
    try {
      pid = execFileSync("systemctl", ["--user", "show", "-p", "MainPID", "--value", ENGINE_UNIT],
        { encoding: "utf8" }).trim();
    } catch {
      assert.fail(`${ENGINE_UNIT} is not queryable on this box — the battery's engine contract is broken (the compose doors need the same engine); cannot judge boot freshness`);
    }
    assert.notEqual(pid, "0",
      `${ENGINE_UNIT} has no running process — start the unit; folder roots are read once at boot and the wall judges the boot truth`);
    let cwd = "";
    try {
      cwd = readlinkSync(`/proc/${pid}/cwd`);
    } catch {
      assert.fail(`cannot resolve /proc/${pid}/cwd for ${ENGINE_UNIT} — the boot truth is unreadable and the wall never guesses`);
    }
    let booted = "";
    try {
      booted = readFileSync(`${cwd}/extra_model_paths.yaml`, "utf8");
    } catch {
      assert.fail(`the engine tree at ${cwd} carries no extra_model_paths.yaml — ComfyUI auto-loads it from its working directory at boot`);
    }
    assert.equal(booted, generatedBody(),
      `the engine tree's yaml (${cwd}/extra_model_paths.yaml) is stale against the generated one — the running engine still serves the roots it booted with; sync the tree and restart the unit (folder roots freeze at boot)`);
  });

  it("BOOT ENV — the managed boot line carries no binary env exports (packs converge themselves)", () => {
    // The pack law (operator ruling, 2026-10-17): every melite
    // nodepack is a plain ComfyUI extension — Manager installs it
    // and the pack's own install.py converges its native binaries
    // pack-locally. The estate exports nothing on the boot line.
    // The LIVE unit's /proc environ is its own boot history, never
    // this wall's subject (the :8188 engine never restarts).
    const printed: string[] = [];
    const realLog = console.log;
    console.log = (...a: unknown[]) => { printed.push(a.join(" ")); };
    try {
      cmdBootCmd({ provision: "managed", port: 8188 });
    } finally {
      console.log = realLog;
    }
    const boot = printed.find((l) => l.includes("main.py"));
    assert.ok(boot !== undefined, "the managed boot line composes");
    assert.ok(boot.startsWith("cd "),
      "the managed boot line starts at cd (a bare start — no env prefix)");
    assert.doesNotMatch(boot, /\b[A-Z][A-Z0-9_]*=/,
      "the managed boot line exports a binary env var — the packs own " +
      "their binaries now (install.py + pack-local discovery); the " +
      "estate provision seats are dead law (pack-law ruling, 2026-10-17)");
  });
});

// dev_docs/audits/features/wiring-roots-mismatch-2026-10-13.md is
// the audit this wall closes; the drift-sweep audits
// (drift-sweep-{audio,image-3d,video}-2026-10-13.md) are the class
// hunt that found the seam.
void here;

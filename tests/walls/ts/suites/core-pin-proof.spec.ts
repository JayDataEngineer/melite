// core-pin-proof.spec.ts — THE LOCAL PIN PROOF (audit 005/E4,
// 2026-10-22): `pnpm run test` must fail when a `core_node_types`
// class is missing at the pin, with NO network. The upstream e2e
// gate (extension-upstream.e2e.ts) proves the classes against
// raw.githubusercontent — but it self-skips keyless, so CI proved
// nothing about the pin. This wall proves the same law against the
// RUNTIME CLONE the provisioner owns: the pin's tree is read from
// the clone's own git objects (`git show <pin>:<file>`), so the
// proof holds even mid-hop (a deliberate bump lands in the pin file
// before the operator's sync checks the tree out). BYO machines with
// no runtime clone skip WITH a reason. Drift refusal is NOT here —
// it belongs to `provision verify`, where it can act (E0).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { repo, runtime } from "../../../../packages/engines/comfyui-cordis/scripts/provision-shared.ts";
import { corePinStatus } from "../../../../packages/engines/comfyui-cordis/scripts/provision-instance-managed.ts";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const PIN_F = join(repo(), "infra", "comfyui", "core.pin");
const FACTS = join(repo(), "packages", "engines", "comfyui-cordis",
  "data", "model-facts.json");

function pinText(): string {
  return readFileSync(PIN_F, "utf8").split("\n")
    .map((l) => l.trim()).find((l) => l && !l.startsWith("#")) ?? "";
}

function roster(): Record<string, readonly string[]> {
  const facts = JSON.parse(readFileSync(FACTS, "utf8")) as
    { core_node_types?: Record<string, readonly string[]> };
  return facts.core_node_types ?? {};
}

describe("the core pin, proven locally (audit 005/E4)", () => {
  it("core.pin carries one 40-hex sha", () => {
    assert.match(pinText(), /^[0-9a-f]{40}$/u,
      "no sha in infra/comfyui/core.pin — the local pin proof has nothing to prove against");
  });

  it("the core-served roster is non-empty", () => {
    assert.ok(Object.keys(roster()).length > 0,
      "core_node_types is empty — the phantom-pack cure left nothing core-served?");
  });

  it.skipIf(!existsSync(join(runtime(), ".git")))(
    "every core_node_types class exists at the pin, no network",
    { timeout: 30_000 },
    () => {
      const pin = pinText();
      // the clone's own objects carry the pin's tree after any
      // provision; a missing object means the machine never fetched
      // this pin — named, never a silent green
      const probe = spawnSync("git",
        ["-C", runtime(), "cat-file", "-e", pin],
        { stdio: "pipe" });
      assert.equal(probe.status, 0,
        `the runtime clone does not carry ${pin.slice(0, 12)} — run \`provision sync\` once; the local pin proof reads the clone's objects`);
      const failures: string[] = [];
      for (const [file, classes] of Object.entries(roster())) {
        let text: string;
        try {
          text = execFileSync("git",
            ["-C", runtime(), "show", `${pin}:${file}`],
            { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
        } catch {
          failures.push(`${file}: absent from the pinned core ${pin.slice(0, 12)}`);
          continue;
        }
        for (const cls of classes) {
          if (!new RegExp(`^class ${cls}\\b`, "mu").test(text)) {
            failures.push(`${file}: class ${cls} not defined at the pinned core ${pin.slice(0, 12)}`);
          }
        }
      }
      assert.deepEqual(failures.sort(), [],
        "these core-served claims are false at the pinned engine — families gated on them are broken");
    });

  // (the cold-start drive catch, 2026-11-12): the FIBO hop's
  // requirements-diff note named the frontend/templates pins but
  // MISSED comfy-kitchen 0.2.36→0.2.39 (+ aimdo, +docs) — the live
  // venv was hand-patched so the estate served on, while every cold
  // walk burned at boot: `uv sync --frozen` seated the stale lock,
  // and core's comfy/text_encoders/llama.py died importing
  // comfy_kitchen.int8_decode (ModuleNotFoundError, engine never
  // answered). The pin file and the uv project are ONE hop: this arm
  // reads the pin's OWN requirements.txt from the clone's git
  // objects and demands version parity on every exactly-pinned
  // name the pyproject also pins exactly.
  it.skipIf(!existsSync(join(runtime(), ".git")))(
    "every exact pin the core's requirements.txt states, the uv project matches (the FIBO-hop class)",
    { timeout: 30_000 },
    () => {
      const pin = pinText();
      const probe = spawnSync("git",
        ["-C", runtime(), "cat-file", "-e", pin],
        { stdio: "pipe" });
      assert.equal(probe.status, 0,
        `the runtime clone does not carry ${pin.slice(0, 12)} — run \`provision sync\` once; the pin-parity arm reads the clone's objects`);
      const coreReq = execFileSync("git",
        ["-C", runtime(), "show", `${pin}:requirements.txt`],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      const corePins = new Map<string, string>();
      for (const m of coreReq.matchAll(/^([A-Za-z0-9_.-]+)==([^ \t#\n]+)/gm)) {
        corePins.set(m[1]!.toLowerCase().replaceAll("_", "-"), m[2]!);
      }
      assert.ok(corePins.size > 0, "the pin's requirements.txt pins nothing exact — the arm has nothing to judge");
      const pyproject = readFileSync(join(repo(), "infra", "comfyui", "pyproject.toml"), "utf8");
      const pyPins = new Map<string, string>();
      for (const m of pyproject.matchAll(/^\s*"([A-Za-z0-9_.-]+)==([^"]+)"/gm)) {
        pyPins.set(m[1]!.toLowerCase().replaceAll("_", "-"), m[2]!);
      }
      assert.ok(pyPins.size > 0,
        "the pyproject parse found no exact pins — the arm refuses to pass vacuously (the R4-05 lesson)");
      const drift: string[] = [];
      for (const [name, coreVersion] of corePins) {
        const pyVersion = pyPins.get(name);
        // only the INTERSECTION: pyproject floats some names the core
        // pins (its own choice, judged elsewhere) and pins some the
        // core floats (torchaudio, kept deliberately). A name BOTH
        // pin exactly is ONE pin — two versions is the cold-walk burn.
        if (pyVersion !== undefined && pyVersion !== coreVersion) {
          drift.push(`${name}: core ${coreVersion} vs pyproject ${pyVersion}`);
        }
      }
      assert.deepEqual(drift.sort(), [],
        "the uv project's exact pins drift from the core pin's own requirements.txt — every cold `uv sync --frozen` seats a venv the pinned engine cannot boot");
    });
});

describe("core-pin drift refuses loud (audit 005 E0, closing leg — the verify arm)", () => {
  // corePinStatus is the seam cmdVerify's check() consumes; the wall
  // drives REAL git repos in temp dirs — every failure class named,
  // never a green over drift. Red-proof (hands-on, 2026-10-12):
  // flipping the seam's equality (=== to !==) reds arms 1+2 below;
  // the live verify receipt: cmdVerify refused on the REAL drift
  // incident (clone at d3eaf6a serving 0.38.2 under pin 6b747c04 =
  // 0.38.0 — the manager self-update class E0 named).
  const execF = execFileSync;

  /** A real one-commit git repo; returns its HEAD sha. */
  const repoAt = (dir: string): string => {
    mkdirSync(dir, { recursive: true });
    execF("git", ["-C", dir, "init", "--quiet"]);
    execF("git", ["-C", dir, "config", "user.email", "t@t"]);
    execF("git", ["-C", dir, "config", "user.name", "t"]);
    writeFileSync(join(dir, "x.txt"), "x");
    execF("git", ["-C", dir, "add", "."]);
    execF("git", ["-C", dir, "commit", "--quiet", "-m", "x"]);
    return execF("git", ["-C", dir, "rev-parse", "HEAD"],
      { encoding: "utf8" }).trim();
  };

  it("agreeing clone+pin is ok (the green control — the arm never over-refuses)", () => {
    const root = mkdtempSync(join(tmpdir(), "pin-ok-"));
    try {
      const project = join(root, "proj");
      const runtimeDir = join(root, "rt");
      mkdirSync(project, { recursive: true });
      const head = repoAt(runtimeDir);
      writeFileSync(join(project, "core.pin"), "# pin\n" + head + "\n");
      const s = corePinStatus(project, runtimeDir);
      assert.equal(s.ok, true, "agreeing pair refused: " + s.message);
      assert.equal(s.head, head);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("drifted clone refuses, naming both shas (the 145-commits-ahead class)", () => {
    const root = mkdtempSync(join(tmpdir(), "pin-drift-"));
    try {
      const project = join(root, "proj");
      const runtimeDir = join(root, "rt");
      mkdirSync(project, { recursive: true });
      repoAt(runtimeDir);
      // a second commit moves HEAD past the pin
      writeFileSync(join(runtimeDir, "y.txt"), "y");
      execF("git", ["-C", runtimeDir, "add", "."]);
      execF("git", ["-C", runtimeDir, "commit", "--quiet", "-m", "y"]);
      const head = execF("git", ["-C", runtimeDir, "rev-parse", "HEAD"],
        { encoding: "utf8" }).trim();
      const pin = execF(
        "git", ["-C", runtimeDir, "rev-parse", "HEAD~1"],
        { encoding: "utf8" }).trim();
      writeFileSync(join(project, "core.pin"), pin + "\n");
      const s = corePinStatus(project, runtimeDir);
      assert.equal(s.ok, false, "drift verified healthy — E0's bug class relitigated");
      assert.match(s.message, /re-pin or re-sync/u,
        "the refusal names the two deliberate exits");
      assert.match(s.message, new RegExp(head.slice(0, 12), "u"),
        "the refusal names the clone's sha");
      assert.match(s.message, new RegExp(pin.slice(0, 12), "u"),
        "the refusal names the pin's sha");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("missing pin and missing clone each refuse with their own voice", () => {
    const root = mkdtempSync(join(tmpdir(), "pin-absent-"));
    try {
      const project = join(root, "proj");
      const runtimeDir = join(root, "rt");
      mkdirSync(project, { recursive: true });
      const noPin = corePinStatus(project, runtimeDir);
      assert.equal(noPin.ok, false);
      assert.match(noPin.message, /no core\.pin/u);
      const head = repoAt(runtimeDir);
      writeFileSync(join(project, "core.pin"), head + "\n");
      // a pin with NO clone: git rev-parse fails in an empty dir
      const empty = join(root, "empty");
      mkdirSync(empty);
      const noClone = corePinStatus(project, empty);
      assert.equal(noClone.ok, false);
      assert.match(noClone.message, /no git clone/u);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});

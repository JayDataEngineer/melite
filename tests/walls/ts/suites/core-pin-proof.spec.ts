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
});

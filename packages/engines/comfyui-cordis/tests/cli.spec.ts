// @melite/comfyui-cordis — the compose door (cli.ts) as a subprocess
// battery. The door is a process boundary: graph JSON on stdout ONLY,
// refusals LOUD on stderr with exit 1 — so the battery spawns it for
// real. An in-process import is safe: the entry guard (the standard
// ESM main-module check) runs main() only when process.argv[1]
// resolves to this module, and the import arm below pins that —
// requiring the module fires nothing. main() boots the card registry
// (composeCards + composeModPlane) before composing; the happy paths
// pin that boot.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

/** The entry-guard law: importing the CLI module executes nothing.
 *  cli.ts is an exports row the walls suite requires; a self-executing
 *  load would fire compose/exit under vitest. */
describe("cli import (the entry guard holds)", () => {
  it("imports clean — no main(), no exit", async () => {
    const before = process.exitCode;
    const mod = await import("../src/cli.ts");
    assert.ok(mod, "module namespace resolves");
    assert.equal(process.exitCode, before, "import must not touch the exit code");
  });
});


const CLI = "packages/engines/comfyui-cordis/src/cli.ts";
const FACTS = "packages/engines/comfyui-cordis/data/model-facts.json";

const run = (args: string[]): { status: number | null; out: string; err: string } => {
  const r = spawnSync("node", ["--experimental-strip-types", "--no-warnings", CLI, ...args], {
    encoding: "utf8",
    timeout: 240000,
    maxBuffer: 64 * 1024 * 1024,
  });
  return { status: r.status, out: r.stdout as string, err: r.stderr as string };
};

const base = ["compose", "--facts", FACTS];

describe("the compose door (process boundary)", () => {
  it("no command refuses with the usage voice (one clean stderr line)", () => {
    const r = run([]);
    assert.equal(r.status, 1);
    assert.match(r.err.trim(), /^compose-door: unknown command '\(none\)' — usage: compose/);
    assert.equal(r.err.trim().split("\n").length, 1, "ONE clean line, never a trace");
    assert.equal(r.out, "");
  }, 240000);

  it("compose without --card refuses", () => {
    const r = run(["compose", "--facts", FACTS]);
    assert.equal(r.status, 1);
    assert.match(r.err.trim(), /^compose-door: --card is required$/);
  }, 240000);

  it("compose without --facts refuses", () => {
    const r = run(["compose", "--card", "image-gen"]);
    assert.equal(r.status, 1);
    assert.match(r.err.trim(), /^compose-door: --facts is required/);
  }, 240000);

  it("a --params that is not JSON refuses (the JSON.parse arm)", () => {
    const r = run([...base, "--card", "image-gen", "--params", "{nope"]);
    assert.equal(r.status, 1);
    assert.match(r.err.trim(), /^compose-door: --params is not valid JSON: /);
  }, 240000);

  it("an odd argument pair refuses (the argv-shape arm)", () => {
    const r = run(["compose", "--card"]);
    assert.equal(r.status, 1);
    assert.match(r.err.trim(), /^compose-door: bad argument pair: --card$/);
  }, 240000);

  it("a model-ful card without --model refuses (the probe arm)", () => {
    const r = run([...base, "--card", "image-gen", "--params", "{}"]);
    assert.equal(r.status, 1);
    assert.match(r.err.trim(), /^compose-door: --model is required$/);
  }, 240000);

  it("an unknown card refuses through the door contract (code: message)", () => {
    const r = run([...base, "--card", "no-such-card", "--model", "krea-2", "--params", "{}"]);
    assert.equal(r.status, 1);
    assert.match(r.err.trim(), /^unknown-card: unknown card 'no-such-card'/);
    assert.equal(r.err.trim().split("\n").length, 1);
  }, 240000);

  it("the happy path emits graph JSON on stdout ONLY", () => {
    const r = run([...base, "--card", "image-gen", "--model", "krea-2", "--params", '{"prompt":"a red barn"}']);
    assert.equal(r.status, 1 - 1, `stderr was: ${r.err.slice(0, 400)}`);
    const graph = JSON.parse(r.out) as Record<string, { class_type: string }>;
    assert.equal(graph["UNETLoader.0"]?.class_type, "UNETLoader");
    assert.equal(r.err, "", "success writes NOTHING to stderr");
  }, 240000);

  it("the nested stanza unwraps (params.params IS the stanza, siblings merge over)", () => {
    const params = JSON.stringify({ params: { prompt: "a red barn" }, seed: 7 });
    const r = run([...base, "--card", "image-gen", "--model", "krea-2", "--params", params, "--run-id", "stanza_9"]);
    assert.equal(r.status, 0, `stderr was: ${r.err.slice(0, 400)}`);
    const graph = JSON.parse(r.out) as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const pos = Object.values(graph).find((n) => n.class_type === "CLIPTextEncode");
    assert.equal(pos?.inputs.text, "a red barn", "the stanza lifts");
    assert.ok(r.out.includes("stanza_9/"), "the kebab --run-id camelizes to the run prefix");
  }, 240000);

  it("an undeclared param refuses (admission is the declared surface)", () => {
    const r = run([...base, "--card", "image-gen", "--model", "krea-2", "--params", '{"prompt":"x","smuggled":1}']);
    assert.equal(r.status, 1);
    assert.match(r.err.trim(), /^compose-door: unknown param\(s\) on the image-gen card: smuggled/);
  }, 240000);

  it("a model-less card rides without --model (the requiresModel:false arm)", () => {
    const params = JSON.stringify({
      body_glb: "/m/b.glb", resolution: 512, framing: 2,
      focal_length: 35, samples: 16, transparent: "true",
    });
    const r = run([...base, "--card", "anny", "--params", params]);
    assert.equal(r.status, 0, `stderr was: ${r.err.slice(0, 400)}`);
    const graph = JSON.parse(r.out) as Record<string, { class_type: string }>;
    assert.ok(Object.values(graph).some((n) => n.class_type === "CompositeCharacter"), "the anny lane builds");
  }, 240000);
});

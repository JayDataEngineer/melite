import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dispatchManage } from "../src/managePlane.ts";
import type { ManageCtx, ManageEnvelope } from "../src/managePlane.ts";
import { activeRuns } from "../src/manageProbe.ts";

// manage-settle-stale.spec.ts — THE TTS NEW-2 WALL (2026-11-12):
// the free/restart doors refused on never-settled pre-rebuild
// claims ("57 active run(s) … stop them first" over an empty
// engine queue) with no lawful way to retire them. The settle_stale
// action retires exactly the claims that cannot be live — engine
// queue corroborates idle + each sidecar predates the last boot
// (or sits past the submit grace) — so the doors stop refusing on
// history. It never settles a live claim: a busy or unreachable
// engine refuses, and a fresh sidecar is skipped by the grace.

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

let root = "";
const ctx = (over: Partial<ManageCtx> = {}): ManageCtx => ({
  repoRoot: root,
  stateRoots: root === "" ? [] : [root],
  comfyUnit: "melite-comfyui.service",
  autoProvision: false,
  endpoint: () => ({ provision: "managed", url: "http://engine:8188" }),
  models: { allDecls: () => [] } as unknown as ManageCtx["models"],
  timeout: () => () => {},
  ...over,
});
const run = (doc: unknown, over: Partial<ManageCtx> = {}): Promise<[number, ManageEnvelope]> =>
  dispatchManage(doc, ctx(over));

const queueJson = (running: unknown[], pending: unknown[]): Response =>
  new Response(JSON.stringify({ queue_running: running, queue_pending: pending }), { status: 200 });

const plantSidecar = (name: string, status: string, mtimeMs: number): void => {
  const dir = join(root, "output", name);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "_flow.json");
  writeFileSync(file, JSON.stringify({ run_id: name, status, text: "words" }));
  const t = new Date(mtimeMs);
  utimesSync(file, t, t);
};

const readStatus = (name: string): string =>
  String((JSON.parse(readFileSync(join(root, "output", name, "_flow.json"), "utf8")) as Record<string, unknown>)["status"]);

describe("the settle_stale action (tts NEW-2: pre-rebuild claims retire by operator gesture, never by the guard looking away)", () => {
  it("engine busy: settle_stale refuses and the sidecar is untouched", async () => {
    root = mkdtempSync(join(tmpdir(), "settle-busy-"));
    try {
      plantSidecar("run-old", "running", Date.now() - 3_600_000);
      globalThis.fetch = (async () => queueJson([["1", 1]], [])) as unknown as typeof fetch;
      const [code, env] = await run({ action: "settle_stale" });
      assert.equal(code, 409);
      assert.match(env.detail, /engine is working/);
      assert.equal(readStatus("run-old"), "running", "a busy engine settles nothing");
    } finally {
      rmSync(root, { recursive: true, force: true });
      root = "";
    }
  });

  it("engine unreachable: settle_stale refuses fail-closed", async () => {
    root = mkdtempSync(join(tmpdir(), "settle-down-"));
    try {
      plantSidecar("run-old", "running", Date.now() - 3_600_000);
      globalThis.fetch = (async () => { throw new Error("fetch failed"); }) as unknown as typeof fetch;
      const [code, env] = await run({ action: "settle_stale" });
      assert.equal(code, 409);
      assert.match(env.detail, /no corroboration/);
      assert.equal(readStatus("run-old"), "running", "no corroboration settles nothing");
    } finally {
      rmSync(root, { recursive: true, force: true });
      root = "";
    }
  });

  it("engine idle: the old zombie settles to stopped and the census clears", async () => {
    root = mkdtempSync(join(tmpdir(), "settle-idle-"));
    try {
      plantSidecar("run-zombie", "running", Date.now() - 3_600_000);
      globalThis.fetch = (async () => queueJson([], [])) as unknown as typeof fetch;
      const [code, env] = await run({ action: "settle_stale" });
      assert.equal(code, 200);
      assert.deepEqual((env.data as Record<string, unknown>)["settled"], ["run-zombie"]);
      assert.equal(readStatus("run-zombie"), "stopped", "the row retires to the stop door's own word");
      assert.deepEqual(activeRuns([root]), [], "the guard's census clears with the row");
    } finally {
      rmSync(root, { recursive: true, force: true });
      root = "";
    }
  });

  it("engine idle, no boot receipt: a fresh sidecar is skipped by the submit grace", async () => {
    root = mkdtempSync(join(tmpdir(), "settle-fresh-"));
    try {
      plantSidecar("run-fresh", "running", Date.now() - 5_000);
      globalThis.fetch = (async () => queueJson([], [])) as unknown as typeof fetch;
      const [code, env] = await run({ action: "settle_stale" });
      assert.equal(code, 200);
      assert.deepEqual((env.data as Record<string, unknown>)["settled"], [], "a seconds-old claim never settles");
      assert.equal(readStatus("run-fresh"), "running", "the fresh row is untouched");
      assert.deepEqual(activeRuns([root]), ["run-fresh"], "the census still protects it");
    } finally {
      rmSync(root, { recursive: true, force: true });
      root = "";
    }
  });

  it("engine idle with a boot receipt: a pre-boot sidecar settles by the boot rule", async () => {
    root = mkdtempSync(join(tmpdir(), "settle-boot-"));
    try {
      const now = Date.now();
      plantSidecar("run-preboot", "queued", now - 3_600_000);
      mkdirSync(join(root, "data", "runtime", "comfyui"), { recursive: true });
      writeFileSync(
        join(root, "data", "runtime", "comfyui", ".estate-boot.json"),
        JSON.stringify({ boot_at: now - 1_800_000, source: "estate restart" }),
      );
      globalThis.fetch = (async () => queueJson([], [])) as unknown as typeof fetch;
      const [code, env] = await run({ action: "settle_stale" });
      assert.equal(code, 200);
      assert.deepEqual((env.data as Record<string, unknown>)["settled"], ["run-preboot"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
      root = "";
    }
  });

  it("the lifecycle refusal names the settle door (the operator learns the gesture from the refusal)", async () => {
    root = mkdtempSync(join(tmpdir(), "settle-voice-"));
    try {
      plantSidecar("run-old", "running", Date.now() - 3_600_000);
      globalThis.fetch = (async () => queueJson([], [])) as unknown as typeof fetch;
      const [, env] = await run({ action: "free" });
      assert.equal(env.ok, false);
      assert.match(env.detail, /settle_stale/, "the refusal voices the retire action");
    } finally {
      rmSync(root, { recursive: true, force: true });
      root = "";
    }
  });
});

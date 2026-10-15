// manage-remote.spec.ts — the manage Typert remote wall (STROKE K,
// 2026-09-10): the thin adapter over the manage seat, following the
// runs-remote recipe. Hermetic by construction: COMFYUI_ENDPOINT_CONFIG
// points at a tmp file whose engine url is a dead port — no wall ever
// depends on a live engine. Pins three facts:
//   1. the namespace + delegation — the adapter's act answers the
//      seat's envelope (the local disk-math action, engine-agnostic);
//   2. the refusal — a dead engine endpoint surfaces as the ONE
//      RemoteError (code manage/refused; the envelope's HTTP status
//      + action ride the details), never a silent ok;
//   3. the closed vocabulary — an unknown action refuses with
//      details.status 422, never a silent miss.
// NO comfyui seat on purpose — the wall proves the plane's behavior
// with the engine ABSENT (the honest degrade), mirroring runs-remote.
import "../../../helpers/boot-models.ts";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { onTestFinished, test } from "vitest";
import assert from "node:assert/strict";
import { Context, type Plugin } from '@deepseek-ai/cordis';
import { remoteErrorOf } from '@deepseek-ai/dsh-typert-protocol';
import timerPlugin from '@deepseek-ai/cordis-plugin-timer';
// The storage stack composed AT THE COMPOSITION SITE (the runs-remote
// recipe — no re-exporting wrapper package).
import draftsPlugin from '@melite/estate-drafts';
import Storage from '@deepseek-ai/dsh-storage';
import {
  apply as jsonApply, Config as JsonConfig, inject as jsonInject, name as jsonName,
} from '@deepseek-ai/dsh-storage-json';
import {
  apply as domainApply, Config as DomainConfig, inject as domainInject, name as domainName,
} from '@deepseek-ai/dsh-storage-domain';
import queuePlugin, { manageProvider } from "../../../../packages/harness/estate-queue/src/index.ts";
import { manageRemotePlugin } from '@melite/estate-manage';
import type { ManageRemoteService } from '@melite/estate-manage';
// The endpoint path resolution (the env override the wall boots
// under) — imported from ENGINE SOURCE (strip-types), not a stub.
import { endpointConfigPath } from "../../../../packages/engines/comfyui-cordis/src/comfyui.ts";

interface Booted {
  ctx: Context;
  adapter: ManageRemoteService;
  fiber: { dispose(): Promise<void> };
  root: string;
}

function doc(id: string): string {
  return JSON.stringify({
    draft_id: id,
    status: "draft",
    createdAt: 1700000000000,
    completedAt: null,
    intent: "test " + id,
    stages: [{ id: "s_0", inputs: [""], provenance: "agent" }],
  });
}

/** OWN the env this rig sets (the flake audit, 2026-10-15): three
 *  keys were written with no hook anywhere in the file, so a later
 *  spec in the same fork inherited a state root whose tree this rig
 *  had already removed — and the file's own restore wrote the literal
 *  string "undefined" under a -t filter. Capture at set time. */
function ownEnv(keys: readonly string[]): void {
  const previous = new Map(keys.map((k) => [k, process.env[k]] as const));
  onTestFinished(() => {
    for (const [k, v] of previous) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });
}

async function boot(): Promise<Booted> {
  const root = mkdtempSync(join(tmpdir(), "manage-remote-"));
  ownEnv(["COMFYUI_ENDPOINT_CONFIG"]);
  // The dead-endpoint truth: the manager rail rides the engine url
  // from the endpoint config — pinned to an unreachable port so the
  // refusal is deterministic (never a live-engine accident).
  const endpointPath = join(root, "dead_endpoint.json");
  writeFileSync(endpointPath, JSON.stringify({ url: "http://127.0.0.1:9", extra: "sibling", nested: { keep: true } }));
  process.env["COMFYUI_ENDPOINT_CONFIG"] = endpointPath;
  const stateRoot = join(root, "state");
  mkdirSync(join(stateRoot, "drafts"), { recursive: true });
  writeFileSync(join(stateRoot, "drafts", "d_ok.json"), doc("d_ok"));
  const ctx = new Context();
  // cross-copy plugin shapes ride the honest Plugin cast — never
  // poisons the ctx.plugin overload into a required Config.
  await ctx.plugin(timerPlugin as unknown as Plugin);
  // J12: the state root rides the queue config (the retired seam)
  const fiber = ctx.plugin(queuePlugin as unknown as Plugin, { stateRoot });
  await fiber;
  await ctx.plugin(Storage as unknown as Plugin);
  await ctx.plugin(
    { name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as unknown as Plugin,
    { root: join(stateRoot, "storage") },
  );
  await ctx.plugin(
    { name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as unknown as Plugin,
    { backend: "json" },
  );
  // J12: the storage root rides the plugin config (the retired seam)
  await ctx.plugin(draftsPlugin as unknown as Plugin, { storageRoot: join(stateRoot, "storage") });
  await ctx.plugin(manageProvider as unknown as Plugin);
  await ctx.plugin(manageRemotePlugin as unknown as Plugin);
  const booted = (ctx as unknown as { manageRemote: ManageRemoteService });
  return { ctx, adapter: booted.manageRemote, fiber, root };
}

test("the signal rides first: an aborted call rejects before any seat work", async () => {
  const { adapter, fiber } = await boot();
  const ac = new AbortController();
  ac.abort();
  // The @Remote adapter law: the signal is the final parameter and
  // the seat checks it before any work — an aborted call surfaces
  // the abort, never a phantom envelope.
  await assert.rejects(
    adapter.remoteExportAct({ action: "free" }, ac.signal),
    (e: unknown) => {
      assert.equal((e as Error).name, "AbortError");
      return true;
    },
  );
  await fiber.dispose();
});

test("a dead engine endpoint refuses as manage/refused 503 through the adapter", async () => {
  const { adapter, fiber } = await boot();
  const sig = new AbortController().signal;
  // EVERY handler probes the manager plane first; the boot pins the
  // endpoint at a dead port, so the honest answer is the refusal
  // envelope riding the ONE RemoteError — proving the delegation
  // (envelope + status) end-to-end without any engine.
  await assert.rejects(
    adapter.remoteExportAct({ action: "free" }, sig),
    (e: unknown) => {
      const err = remoteErrorOf(e);
      assert.ok(err, "the refusal must be a RemoteError");
      assert.equal(err.code, "manage/refused");
      assert.equal(err.details.action, "free");
      assert.equal(err.details.status, 503);
      assert.ok(err.message.includes("not reachable"), err.message);
      return true;
    },
  );
  await fiber.dispose();
});

test("status never lies about downness: a dead endpoint ANSWERS ok with reachable:false", async () => {
  const { adapter, fiber } = await boot();
  const sig = new AbortController().signal;
  // hStatus's truth (managePlane SSOT): an unreachable engine is
  // DATA, not an error — the envelope resolves ok with detail
  // "server not reachable" and the probe riding the data. The wall
  // pins this against the boot's dead port (never a live-engine
  // accident).
  const envelope = await adapter.remoteExportAct({ action: "status" }, sig);
  assert.equal(envelope.action, "status");
  assert.equal(envelope.ok, true);
  assert.equal(envelope.detail, "server not reachable");
  const data = envelope.data as { manager: { reachable?: boolean } };
  assert.equal(data.manager.reachable, false);
  await fiber.dispose();
});

test("an unknown action refuses loud at 422 (closed vocabulary, never a silent miss)", async () => {
  const { adapter, fiber } = await boot();
  const sig = new AbortController().signal;
  // The action vocabulary is closed (ACTIONS SSOT in managePlane):
  // a typo refuses at 422 — manage/refused carrying the status.
  await assert.rejects(
    adapter.remoteExportAct({ action: "definitely_not_an_action" }, sig),
    (e: unknown) => {
      const err = remoteErrorOf(e);
      assert.ok(err, "the refusal must be a RemoteError");
      assert.equal(err.code, "manage/refused");
      assert.equal(err.details.status, 422);
      return true;
    },
  );
  await fiber.dispose();
});

test("endpointConfigPath honors COMFYUI_ENDPOINT_CONFIG (the wall's own override resolves)", () => {
  // The resolver must return EXACTLY the override path (an override
  // that silently fell back to the packaged default would aim
  // endpoint_set writes at the live config). This arm OWNS its
  // override: it used to read a key a PREVIOUS test's boot() had
  // leaked into the fork, so it passed only by ordering (and failed
  // under -t the moment the leak was closed).
  const root = mkdtempSync(join(tmpdir(), "manage-remote-"));
  onTestFinished(() => rmSync(root, { recursive: true, force: true }));
  const endpointPath = join(root, "dead_endpoint.json");
  writeFileSync(endpointPath, JSON.stringify({ url: "http://127.0.0.1:9" }));
  ownEnv(["COMFYUI_ENDPOINT_CONFIG"]);
  process.env["COMFYUI_ENDPOINT_CONFIG"] = endpointPath;
  assert.equal(endpointConfigPath(), endpointPath);
  // the key was captured AFTER boot() wrote it, so "saved" was the
  // rig's own value, never the caller's — and the unconditional write
  // back put the literal string "undefined" under a -t filter. boot()
  // now owns the restore; this arm only has to put the key back for
  // the duration of the check.
  const saved = process.env["COMFYUI_ENDPOINT_CONFIG"];
  delete process.env["COMFYUI_ENDPOINT_CONFIG"];
  try {
    // D-L14 (the wall audit, 2026-09-28): `endsWith` accepted ANY
    // path with that filename — a resolver that had drifted to a
    // different directory's comfyui_endpoint.json passed. The F1
    // cure (2026-11-05) moved the default WRITE home: the repo's
    // untracked state file, exactly (the tracked package SEED at
    // packages/engines/comfyui-cordis/data/ is the read-only
    // fallback no door writes — machine state left the tracked
    // tree).
    assert.equal(
      endpointConfigPath(),
      join(process.cwd(), "data", "comfyui_endpoint.json"),
      "without the env var the untracked STATE home resolves — exactly (a same-named file elsewhere is not the default)",
    );
  } finally {
    if (saved === undefined) delete process.env["COMFYUI_ENDPOINT_CONFIG"];
    else process.env["COMFYUI_ENDPOINT_CONFIG"] = saved;
  }
});

test("endpoint_set refuses a non-url at 400 without probing or writing", async () => {
  const { adapter, fiber, root } = await boot();
  const sig = new AbortController().signal;
  // The validate-first law: a malformed url refuses BEFORE any
  // probe — the config file keeps the boot's dead-port url.
  await assert.rejects(
    adapter.remoteExportAct({ action: "endpoint_set", url: "not a url" }, sig),
    (e: unknown) => {
      const err = remoteErrorOf(e);
      assert.ok(err, "the refusal must be a RemoteError");
      assert.equal(err.code, "manage/refused");
      assert.equal(err.details.status, 400);
      return true;
    },
  );
  // D-L14: "writes only url" never checked that the SIBLING keys
  // survived — a writer that replaced the config wholesale (dropping
  // every sibling key) passed this arm. The fixture now carries
  // siblings, and a refused write must mutate NOTHING.
  const kept = JSON.parse(readFileSync(join(root, "dead_endpoint.json"), "utf8")) as Record<string, unknown>;
  assert.equal(kept["url"], "http://127.0.0.1:9", "the refused write left the url alone");
  assert.deepEqual(kept,
    { url: "http://127.0.0.1:9", extra: "sibling", nested: { keep: true } },
    "the refused write mutated NOTHING — the sibling keys survived byte-for-byte");
  await fiber.dispose();
});

test("endpoint_set refuses an unreachable url at 502 and leaves the config", async () => {
  const { adapter, fiber, root } = await boot();
  const sig = new AbortController().signal;
  // The probe runs first: nothing answers on port 9, so the dead
  // url is refused and the endpoint file is byte-unchanged.
  await assert.rejects(
    adapter.remoteExportAct({ action: "endpoint_set", url: "http://127.0.0.1:9" }, sig),
    (e: unknown) => {
      const err = remoteErrorOf(e);
      assert.ok(err, "the refusal must be a RemoteError");
      assert.equal(err.code, "manage/refused");
      assert.equal(err.details.status, 502);
      assert.ok(err.message.includes("endpoint is unchanged"), err.message);
      return true;
    },
  );
  const kept = JSON.parse(readFileSync(join(root, "dead_endpoint.json"), "utf8")) as { url: string };
  assert.equal(kept.url, "http://127.0.0.1:9");
  await fiber.dispose();
});

test("endpoint_set probes, writes only url, and answers the probe (the operator's server change)", async () => {
  const { createServer } = await import("node:http");
  const { adapter, fiber, root } = await boot();
  const sig = new AbortController().signal;
  // The stub engine: answers /system_stats like a real ComfyUI.
  const server = createServer((req, res) => {
    if (req.url === "/system_stats") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ system: { comfyui_version: "9.9.9-test" } }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  try {
    const envelope = await adapter.remoteExportAct(
      { action: "endpoint_set", url: "http://127.0.0.1:" + String(port) },
      sig,
    );
    assert.equal(envelope.ok, true);
    assert.ok(envelope.detail.includes("9.9.9-test"), envelope.detail);
    // EXTERNAL WORLD, not self-reporting: the endpoint FILE carries
    // the new url (and only the url changed — provision survives).
    const written = JSON.parse(readFileSync(join(root, "dead_endpoint.json"), "utf8")) as Record<string, unknown>;
    assert.equal(written["url"], "http://127.0.0.1:" + String(port));
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await fiber.dispose();
  }
});

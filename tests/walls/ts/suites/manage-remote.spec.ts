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
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "vitest";
import assert from "node:assert/strict";
import { Context } from '@deepseek-ai/cordis';
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

async function boot(): Promise<Booted> {
  const root = mkdtempSync(join(tmpdir(), "manage-remote-"));
  // The dead-endpoint truth: the manager rail rides the engine url
  // from the endpoint config — pinned to an unreachable port so the
  // refusal is deterministic (never a live-engine accident).
  const endpointPath = join(root, "dead_endpoint.json");
  writeFileSync(endpointPath, JSON.stringify({ url: "http://127.0.0.1:9" }));
  process.env["COMFYUI_ENDPOINT_CONFIG"] = endpointPath;
  const stateRoot = join(root, "state");
  mkdirSync(join(stateRoot, "drafts"), { recursive: true });
  writeFileSync(join(stateRoot, "drafts", "d_ok.json"), doc("d_ok"));
  process.env["MELITE_STATE_ROOT"] = stateRoot;
  process.env["MELITE_STORAGE_ROOT"] = "";
  const ctx = new Context();
  await ctx.plugin(timerPlugin as never);
  const fiber = ctx.plugin(queuePlugin as never, { repoRoot: root });
  await fiber;
  await ctx.plugin(Storage as never);
  await ctx.plugin(
    { name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as never,
    { root: join(stateRoot, "storage") },
  );
  await ctx.plugin(
    { name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as never,
    { backend: "json" },
  );
  await ctx.plugin(draftsPlugin as never);
  await ctx.plugin(manageProvider as never);
  await ctx.plugin(manageRemotePlugin as never);
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
  // The wall boots with COMFYUI_ENDPOINT_CONFIG pointed at its tmp
  // file — the resolver must return EXACTLY that path (an override
  // that silently fell back to the packaged default would aim
  // endpoint_set writes at the live config).
  assert.equal(endpointConfigPath(), process.env["COMFYUI_ENDPOINT_CONFIG"]);
  const saved = process.env["COMFYUI_ENDPOINT_CONFIG"];
  delete process.env["COMFYUI_ENDPOINT_CONFIG"];
  try {
    assert.ok(
      endpointConfigPath().endsWith("comfyui_endpoint.json"),
      "without the env var the packaged default resolves",
    );
  } finally {
    process.env["COMFYUI_ENDPOINT_CONFIG"] = saved;
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
  const kept = JSON.parse(readFileSync(join(root, "dead_endpoint.json"), "utf8")) as { url: string };
  assert.equal(kept.url, "http://127.0.0.1:9");
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

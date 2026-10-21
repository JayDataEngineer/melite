// manage-lora-fetch.spec.ts — THE LORA-FETCH VERB (the operator's
// 2026-11-09 burn, "Can you add this lora to krea 2" + a HuggingFace
// URL): the ONE download an operator actually does, served by the
// estate's own doors instead of the raw-bash archaeology the session
// fell to. Walls, per the canon:
//
//   1. THE VERB LANDS THROUGH THE PROVISIONING STACK — a stated URL
//      rides acquireExternal (kind model, relativePath loras/<family>,
//      the family subfolder the engine already serves) behind the
//      human's operator_confirmed gate; no SILENT remote fetch.
//   2. THE AMENDED LAW — download_model's loras-dir refusal stays but
//      its text names the supersession (the lora_fetch verb, operator
//      order 2026-11-09); the old "never by url" sentence is gone.
//   3. LAND → MEMO DROPPED → NEXT lora_list CONTAINS THE NAME — zero
//      restarts estate-side: the boot-time /object_info memo must not
//      outlive a landed file (the live arm: a real HTTP engine whose
//      combo answer gains the name only after the land).
//   4. THE RESTART CHAIN (the operator's design: the Manager reloads
//      ComfyUI) — the chained reboot rides the guarded restart door;
//      a refused/failed chain leaves the fetch ok:true and voices the
//      owed restart (restart_required + next_action), never a failed
//      fetch wearing a restart's refusal.
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dispatchManage } from "../src/managePlane.ts";
import type { ManageCtx } from "../src/managePlane.ts";

const tempRoots: string[] = [];
const tempRoot = (prefix: string): string => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempRoots.push(dir);
  return dir;
};
afterEach(() => {
  while (tempRoots.length > 0) {
    const dir = tempRoots.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

/** The recorded request a fake acquireExternal saw (the wall reads it
 *  to prove the door's spelling — kind model, the family subfolder,
 *  the filename law). */
interface Acquired {
  kind?: string;
  url?: string;
  relativePath?: string;
  filename?: string;
  sha256?: string;
}
type Land = (acquired: Acquired) => void;

/** A provisioning seat with the ONE member the door's seat-asks-first
 *  law reads (reconcile — provisioningOf's presence probe) plus the
 *  recording acquireExternal; the land hook stands in for the engine's
 *  own mtime-based folder scan (the combo answer flips after it). */
const recordingProvisioner = (land: Land): ManageCtx["provisioning"] =>
  ({
    reconcile: async (): Promise<never> => { throw new Error("unreached"); },
    acquireExternal: async (
      request: Acquired,
      _options: { operatorConfirmed: boolean },
      _signal?: AbortSignal,
    ): Promise<unknown> => {
      land(request);
      return {
        operationId: "op-lora-fetch-1",
        ref: { kind: "model", owner: "card", id: "external:" + String(request.url) },
        state: "active",
        outcome: "active",
        restartRequired: false,
        items: [
          {
            key: "op-lora-fetch-1",
            kind: "model",
            state: "active",
            outcome: "active",
            path: "/models/" + String(request.relativePath) + "/" + String(request.filename),
          },
        ],
      };
    },
  }) as unknown as ManageCtx["provisioning"];

const seatless: ManageCtx["provisioning"] = undefined as unknown as ManageCtx["provisioning"];

/** A manage ctx. `info` is the ctx.objectInfo seam (absent = the live
 *  arm — the process-global memo the invalidation must drop). */
const CTX = (over: Record<string, unknown> = {}): ManageCtx =>
  ({
    repoRoot: tempRoot("lora-fetch-ctx-"),
    endpoint: () => ({ provision: "managed", url: "http://engine.invalid:8188", model_base_path: "/models" }),
    models: { allDecls: () => [] } as unknown as ManageCtx["models"],
    provisioning: seatless,
    stateRoots: [tempRoot("lora-fetch-runs-")],
    timeout: (cb: () => void): (() => void) => {
      const t = setTimeout(cb, 0);
      return () => { clearTimeout(t); };
    },
    ...over,
  } as unknown as ManageCtx) as ManageCtx;

function run(doc: Record<string, unknown>, ctx: ManageCtx): Promise<[number, { ok: boolean; detail: string; action: string; state?: string; next_action?: string; restart_required?: boolean; data?: unknown }]> {
  return dispatchManage(doc, ctx) as unknown as Promise<
    [number, { ok: boolean; detail: string; action: string; state?: string; next_action?: string; restart_required?: boolean; data?: unknown }]
  >;
}

const FETCH = { action: "lora_fetch", url: "https://huggingface.co/Comfy-Org/Krea-2/resolve/main/loras/krea2_fetched.safetensors", families: ["krea-2"], operator_confirmed: true };

describe("the manage plane — lora_fetch (the operator's 2026-11-09 order)", () => {
  it("lands a stated URL through the provisioning stack into the family subfolder", async () => {
    const seen: Acquired[] = [];
    const ctx = CTX({ provisioning: recordingProvisioner((a) => seen.push(a)) });
    const [code, res] = await run({ ...FETCH, filename: "krea2_fetched.safetensors" }, ctx);
    assert.equal(code, 200);
    assert.equal(res.ok, true);
    // THE DOOR'S SPELLING: kind model, the family subfolder, the bare name
    assert.equal(seen.length, 1);
    assert.equal(seen[0]?.kind, "model");
    assert.equal(seen[0]?.url, FETCH.url);
    assert.equal(seen[0]?.relativePath, "loras/krea-2");
    assert.equal(seen[0]?.filename, "krea2_fetched.safetensors");
    // the answer names the combo identity the engine will serve
    const data = res.data as Record<string, unknown>;
    assert.equal(data["filename"], "krea-2/krea2_fetched.safetensors");
    assert.equal(data["family"], "krea-2");
    assert.equal(data["operation_id"], "op-lora-fetch-1");
  });

  it("derives the filename by the C5 law when the caller names none", async () => {
    const seen: Acquired[] = [];
    const ctx = CTX({ provisioning: recordingProvisioner((a) => seen.push(a)) });
    const [code] = await run({ ...FETCH, url: "https://huggingface.co/x/resolve/main/my_lora.safetensors?download=true" }, ctx);
    assert.equal(code, 200);
    assert.equal(seen[0]?.filename, "my_lora.safetensors");
  });

  it("carries a stated sha256 into the acquire (verify when the source states one)", async () => {
    const seen: Acquired[] = [];
    const ctx = CTX({ provisioning: recordingProvisioner((a) => seen.push(a)) });
    const [code] = await run({ ...FETCH, sha256: "abc123" }, ctx);
    assert.equal(code, 200);
    assert.equal(seen[0]?.sha256, "abc123");
  });

  it("refuses on its own merits before the human's flag: no url, not-one family, unsafe family, non-LoRA name", async () => {
    const seen: Acquired[] = [];
    const ctx = CTX({ provisioning: recordingProvisioner((a) => seen.push(a)) });
    const noUrl = await run({ action: "lora_fetch", families: ["krea-2"], operator_confirmed: true }, ctx);
    assert.equal(noUrl[0], 422);
    const noFamily = await run({ action: "lora_fetch", url: FETCH.url, operator_confirmed: true }, ctx);
    assert.equal(noFamily[0], 422);
    assert.match(noFamily[1].detail, /exactly one family/);
    const twoFamilies = await run({ action: "lora_fetch", url: FETCH.url, families: ["krea-2", "z-image"], operator_confirmed: true }, ctx);
    assert.equal(twoFamilies[0], 422);
    const unsafe = await run({ action: "lora_fetch", url: FETCH.url, families: ["../escape"], operator_confirmed: true }, ctx);
    assert.equal(unsafe[0], 422);
    const notLora = await run({ action: "lora_fetch", url: FETCH.url, families: ["krea-2"], filename: "notes.txt", operator_confirmed: true }, ctx);
    assert.equal(notLora[0], 422);
    assert.match(notLora[1].detail, /not a LoRA file|LoRA file/);
    // nothing was acquired on any refusal
    assert.equal(seen.length, 0);
  });

  it("asks the seat first: a seatless lane 503s before the confirm gate", async () => {
    // the request passes its own shape guards (one family) and dies
    // at the seat ask — never at the human's flag
    const ctx = CTX({});
    const [code, res] = await run({ action: "lora_fetch", url: FETCH.url, families: ["krea-2"] }, ctx);
    assert.equal(code, 503);
    assert.match(res.detail, /provisioning seat/);
  });

  it("demands the human's flag: no operator_confirmed, no landing (409, never self-asserted)", async () => {
    const seen: Acquired[] = [];
    const ctx = CTX({ provisioning: recordingProvisioner((a) => seen.push(a)) });
    const [code, res] = await run({ action: "lora_fetch", url: FETCH.url, families: ["krea-2"] }, ctx);
    assert.equal(code, 409);
    assert.match(res.detail, /operator_confirmed/);
    assert.equal(seen.length, 0);
  });

  it("THE AMENDMENT: download_model still refuses the loras dir, and the old never-by-url sentence is gone — the new law names lora_fetch", async () => {
    const ctx = CTX({});
    const [code, res] = await run(
      { action: "download_model", url: FETCH.url, relative_path: "loras/krea-2", operator_confirmed: true },
      ctx,
    );
    assert.equal(code, 422);
    assert.match(res.detail, /lora_fetch/);
    assert.doesNotMatch(res.detail, /never by url/);
  });

  it("THE MEMO WALL: land → memo dropped → the next lora_list contains the name (zero restarts estate-side)", async () => {
    // THE LIVE ARM (no ctx seam): the process-global /object_info memo
    // is the truth the invalidation must drop. The engine's combo
    // answer GAINS the fetched name only after the land (the
    // mtime-based folder scan stand-in) — if the verb left the memo
    // standing, lora_list would re-serve the pre-land doc and the name
    // would stay invisible.
    const comboV1 = ["krea-2/krea2_realism_lora.safetensors"];
    let landed = false;
    const combo = (): string[] => (landed ? [...comboV1, "krea-2/krea2_fetched.safetensors"] : [...comboV1]);
    const srv = createServer((req, res) => {
      if (req.method === "POST" && req.url === "/manager/reboot") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end("{}");
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ LoraLoaderModelOnly: { input: { required: { lora_name: [combo(), {}] } } } }));
    });
    await new Promise<void>((resolve) => srv.listen(0, "127.0.0.1", resolve));
    const addr = srv.address();
    const port = String(typeof addr === "object" && addr !== null ? addr.port : 0);
    const prevUrl = process.env["COMFYUI_URL"];
    process.env["COMFYUI_URL"] = "http://127.0.0.1:" + port;
    const rearmed: number[] = [];
    try {
      const ctx = CTX({
        provisioning: recordingProvisioner(() => { landed = true; }),
        rearmWeights: (): void => { rearmed.push(1); },
      });
      // warm the memo with the PRE-LAND doc
      const before = await run({ action: "lora_list" }, ctx);
      assert.equal(before[0], 200);
      assert.deepEqual(((before[1].data as Record<string, unknown>)["engine_loras"] as string[]), comboV1);
      // the land
      const [code, res] = await run({ ...FETCH, filename: "krea2_fetched.safetensors" }, ctx);
      assert.equal(code, 200);
      assert.equal(res.ok, true);
      assert.equal(rearmed.length, 1, "the weight memo rearm fires on landing");
      // THE NEXT lora_list re-asks and serves the new name — the
      // invalidation is the only path by which it can
      const after = await run({ action: "lora_list" }, ctx);
      assert.equal(after[0], 200);
      const names = ((after[1].data as Record<string, unknown>)["engine_loras"] as string[]);
      assert.ok(names.includes("krea-2/krea2_fetched.safetensors"), "the fetched name serves with ZERO estate restarts");
    } finally {
      srv.closeAllConnections();
      srv.close(() => undefined);
      if (prevUrl === undefined) delete process.env["COMFYUI_URL"];
      else process.env["COMFYUI_URL"] = prevUrl;
    }
  });

  it("THE RESTART CHAIN (voiced arm): a chain the guard refuses leaves the fetch ok and voices the owed restart", async () => {
    // THE GUARD IS THE SAFETY (the operator's own framing): the
    // chained reboot rides hRestart's LIFECYCLE_GUARDED door — an
    // active run in the state roots refuses the chain (409) and the
    // fold voices the owed restart. The landing still happened.
    const runsRoot = tempRoot("lora-fetch-runs-live-");
    mkdirSync(join(runsRoot, "output", "run-busy"), { recursive: true });
    writeFileSync(join(runsRoot, "output", "run-busy", "_flow.json"), JSON.stringify({ status: "running" }));
    const seen: Acquired[] = [];
    const ctx = CTX({
      provisioning: recordingProvisioner((a) => seen.push(a)),
      stateRoots: [runsRoot],
    });
    const [code, res] = await run({ ...FETCH, filename: "krea2_fetched.safetensors" }, ctx);
    assert.equal(code, 200);
    assert.equal(res.ok, true, "the fetch landed — a refused restart never wears the fetch's face");
    assert.equal(seen.length, 1, "the landing happened");
    assert.equal(res.restart_required, true);
    assert.equal(res.next_action, "restart");
    assert.match(res.detail, /restart/i);
  });

  it("THE RESTART CHAIN (issued arm): the chain rides the guarded restart door and reports the reboot", async () => {
    const srv: Server = createServer((req, res) => {
      if (req.method === "POST" && req.url === "/manager/reboot") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end("{}");
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ LoraLoaderModelOnly: { input: { required: { lora_name: [["krea-2/krea2_fetched.safetensors"], {}] } } } }));
    });
    await new Promise<void>((resolve) => srv.listen(0, "127.0.0.1", resolve));
    const addr = srv.address();
    const port = String(typeof addr === "object" && addr !== null ? addr.port : 0);
    const prevUrl = process.env["COMFYUI_URL"];
    process.env["COMFYUI_URL"] = "http://127.0.0.1:" + port;
    try {
      const seen: Acquired[] = [];
      const ctx = CTX({ provisioning: recordingProvisioner((a) => seen.push(a)) });
      const [code, res] = await run({ ...FETCH, filename: "krea2_fetched.safetensors" }, ctx);
      assert.equal(code, 200);
      assert.equal(seen.length, 1);
      assert.equal(res.restart_required, false);
      assert.match(res.detail, /restart issued/i);
    } finally {
      srv.closeAllConnections();
      srv.close(() => undefined);
      if (prevUrl === undefined) delete process.env["COMFYUI_URL"];
      else process.env["COMFYUI_URL"] = prevUrl;
    }
  });
});

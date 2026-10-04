/**
 * manage-lora-doors.spec.ts — THE LORA DOORS in the manage plane
 * (the operator's 2026-09-26 order: "custom LoRAs belong in the
 * ComfyUI Manager sidebar").
 *
 * The sidebar's door vocabulary is `ManageAction`, so the LoRA doors
 * are two entries in the plane's own table:
 *
 * - `lora_list` — the ENGINE's own fact (core's LoraLoaderModelOnly
 *   combo, read from /object_info: the only truth about what /prompt
 *   accepts) plus the user's own rows, with the rows the engine does
 *   NOT have named HERE rather than at run time;
 * - `lora_install` — a COPY of a LoRA the operator already has (never
 *   a fetch: "THERE SHOULD NOT BE A LORAS REMOTE / IT'S ALL BUILT IN"),
 *   answering with the restart it needs, because core enumerates
 *   folder_paths at import and a reboot is the only refresh primitive
 *   this repo owns.
 */
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

const fakeProvisioning = {
  ensure: async (): Promise<never> => { throw new Error("unreached"); },
  activate: async (): Promise<never> => { throw new Error("unreached"); },
  restart: async (): Promise<never> => { throw new Error("unreached"); },
  waitUntilReady: async (): Promise<never> => { throw new Error("unreached"); },
} as unknown as ManageCtx["provisioning"];

/** A manage ctx whose engine answers the given /object_info (or fails). */
const CTX = (over: Record<string, unknown> = {}, info: unknown = null, engineFails = false): ManageCtx =>
  ({
    repoRoot: tempRoot("lane-ctx-"),
    endpoint: () => ({ provision: "managed", url: "http://engine.invalid:8188", model_base_path: "/models" }),
    models: { allDecls: () => [] } as unknown as ManageCtx["models"],
    provisioning: fakeProvisioning,
    timeout: (cb: () => void): (() => void) => {
      const t = setTimeout(cb, 0);
      return () => { clearTimeout(t); };
    },
    ...over,
  } as unknown as ManageCtx) as ManageCtx & { __info?: unknown; __fails?: boolean };

/**
 * THE ENGINE ANSWER, through the plane's own seam (ManageCtx.objectInfo
 * — absent means the estate's `liveObjectInfo`). The walls read the
 * REAL `LoraLoaderModelOnly` declaration shape, so they prove the
 * reader against the engine's own contract, not against a mock of my
 * own fetching.
 */
function engineAnswer(names: string[] | null): () => Promise<unknown> {
  return async (): Promise<unknown> => {
    if (names === null) throw new Error("engine unreachable");
    // the estate's reader answers the WHOLE doc (one key per node) —
    // the seam mirrors that shape exactly
    return { LoraLoaderModelOnly: { input: { required: { lora_name: [names, {}] } } } };
  };
}

const OBJECT_INFO = ["h3/one.safetensors", "z-image/two.safetensors"];

function run(doc: Record<string, unknown>, ctx: ManageCtx): Promise<[number, { ok: boolean, detail: string, action: string, data?: unknown }]> {
  return dispatchManage(doc, ctx) as unknown as Promise<
    [number, { ok: boolean, detail: string, action: string, data?: unknown }]
  >;
}

describe("the manage plane — the LoRA doors (the Manager sidebar's own vocabulary)", () => {
  it("lora_list serves the engine's own names plus the user's rows", async () => {
    const ctx = CTX({ objectInfo: engineAnswer(OBJECT_INFO) });
    const rowsPath = join(tempRoot("lane-rows-"), "user-loras.json");
    writeFileSync(rowsPath, JSON.stringify([
      { id: "mine", filename: "z-image/two.safetensors", families: ["z-image"], label: "Mine" },
    ]), "utf8");
    const [code, res] = await run({ action: "lora_list" }, ctx);
    assert.equal(code, 200);
    assert.equal(res.ok, true);
    const data = res.data as Record<string, unknown>;
    assert.deepEqual(data["engine_loras"], OBJECT_INFO);
    assert.equal(data["install_dir"], "/models/loras");
    // the rows file is read from the declared path (absent here = the
    // door is opt-in, never an error)
    assert.equal(data["user_rows_present"], false);
    assert.equal(data["next_action_after_install"], "restart");
    void ctx; void rowsPath;
  });

  it("lora_list names the rows the ENGINE lacks, here and not at /prompt", async () => {
    const ctx = CTX({ objectInfo: engineAnswer(["h3/one.safetensors"]) });
    const rowsFile = join(tempRoot("lane-rows2-"), "u.json");
    writeFileSync(rowsFile, JSON.stringify([
      { id: "known", filename: "h3/one.safetensors", families: ["h3"] },
      { id: "ghost", filename: "mine/never-installed.safetensors", families: ["h3"] },
    ]), "utf8");
    const prev = process.env["MELITE_USER_LORAS"];
    process.env["MELITE_USER_LORAS"] = rowsFile;
    try {
      const [code, res] = await run({ action: "lora_list" }, ctx);
      assert.equal(code, 200);
      const data = res.data as Record<string, unknown>;
      assert.equal((data["user_rows"] as unknown[]).length, 2);
      const unboarded = data["unboarded"] as string[];
      assert.equal(unboarded.length, 1);
      assert.match(unboarded[0] as string, /ghost/);
      assert.match(unboarded[0] as string, /mine\/never-installed\.safetensors/);
    } finally {
      if (prev === undefined) delete process.env["MELITE_USER_LORAS"];
      else process.env["MELITE_USER_LORAS"] = prev;
    }
  });

  it("an unreachable engine proves nothing and refuses nothing (never a throw across the sidebar)", async () => {
    const ctx = CTX({ objectInfo: engineAnswer(null) });
    const rowsFile = join(tempRoot("lane-rows3-"), "u.json");
    writeFileSync(rowsFile, JSON.stringify([
      { id: "ghost", filename: "mine/never.safetensors", families: ["h3"] },
    ]), "utf8");
    const prev = process.env["MELITE_USER_LORAS"];
    process.env["MELITE_USER_LORAS"] = rowsFile;
    try {
      const [code, res] = await run({ action: "lora_list" }, ctx);
      assert.equal(code, 200);
      const data = res.data as Record<string, unknown>;
      assert.deepEqual(data["engine_loras"], []);
      assert.deepEqual(data["unboarded"], []);
    } finally {
      if (prev === undefined) delete process.env["MELITE_USER_LORAS"];
      else process.env["MELITE_USER_LORAS"] = prev;
    }
  });

  it("lora_install COPIES the operator's own file and names the restart it needs", async () => {
    const ctx = CTX({ objectInfo: engineAnswer(["h3/one.safetensors"]) }); // the new file is NOT in the combo yet
    const src = join(tempRoot("lane-src-"), "my_lora.safetensors");
    writeFileSync(src, Buffer.alloc(64, 7));
    const dir = join(tempRoot("lane-loras-"), "loras");
    const prev = process.env["MELITE_COMFYUI_LORAS_DIR"];
    process.env["MELITE_COMFYUI_LORAS_DIR"] = dir;
    try {
      const [code, res] = await run(
        { action: "lora_install", path: src, families: ["h3"] },
        ctx,
      );
      assert.equal(code, 200);
      const data = res.data as Record<string, unknown>;
      assert.equal(data["filename"], "my_lora.safetensors");
      assert.equal(data["bytes"], 64);
      assert.equal(data["in_combo_now"], false);
      assert.equal(data["restart_required"], true);
      assert.equal(data["next_action"], "restart");
      // the copy is really there, byte-identical (never a fetch)
      const landed = join(dir, "my_lora.safetensors");
      assert.equal(readFileSync(landed).length, 64);
      assert.deepEqual(readFileSync(landed), readFileSync(src));
      // and the row the operator adds next rides the answer
      const row = data["row_suggestion"] as Record<string, unknown>;
      assert.equal(row["filename"], "my_lora.safetensors");
      assert.deepEqual(row["families"], ["h3"]);
    } finally {
      if (prev === undefined) delete process.env["MELITE_COMFYUI_LORAS_DIR"];
      else process.env["MELITE_COMFYUI_LORAS_DIR"] = prev;
    }
  });

  // ── THE BYTES ARM (batch-7 closure, 2026-10-14 — O25j): the
  // civit-browser upload needs no path — the bytes land under the
  // filename the operator's browser chose, and the no-filename
  // state refuses before anything decodes.
  it("lora_install BYTES: a browser upload lands without a path (bytes first, the name named)", async () => {
    const ctx = CTX({ objectInfo: engineAnswer(["h3/one.safetensors"]) });
    const dir = join(tempRoot("lane-bytes-"), "loras");
    const prev = process.env["MELITE_COMFYUI_LORAS_DIR"];
    process.env["MELITE_COMFYUI_LORAS_DIR"] = dir;
    try {
      // bytes without a filename refuses in its own voice
      const [nf, nfres] = await run(
        { action: "lora_install", data: "data:application/octet-stream;base64,AAAA" },
        ctx,
      );
      assert.equal(nf, 422);
      assert.equal(nfres.ok, false);
      assert.match(nfres.detail, /requires filename/);
      // the upload lands, byte-identical, restart named
      const bytes = Buffer.alloc(32, 9);
      const [code, res] = await run(
        {
          action: "lora_install",
          filename: "uploaded.safetensors",
          data: "data:application/octet-stream;base64," + bytes.toString("base64"),
          families: ["h3"],
        },
        ctx,
      );
      assert.equal(code, 200);
      const data = res.data as Record<string, unknown>;
      assert.equal(data["filename"], "uploaded.safetensors");
      assert.equal(data["bytes"], 32);
      assert.equal(data["restart_required"], true);
      // the landed file is the upload, byte-identical (never a fetch)
      assert.deepEqual(readFileSync(join(dir, "uploaded.safetensors")), bytes);
    } finally {
      if (prev === undefined) delete process.env["MELITE_COMFYUI_LORAS_DIR"];
      else process.env["MELITE_COMFYUI_LORAS_DIR"] = prev;
    }
  });

  it("an undeclared loras dir names the same sentence from both doors", async () => {
    // the SHIPPED endpoint config carries no model_base_path (the
    // key is optional in both production shapes), so engineLorasDir
    // answering null is the normal managed-lane state, not a fault —
    // the doors must refuse in the registration voice, not crash
    const prev = process.env["MELITE_COMFYUI_LORAS_DIR"];
    delete process.env["MELITE_COMFYUI_LORAS_DIR"];
    try {
      const ctx = CTX({
        objectInfo: engineAnswer(OBJECT_INFO),
        endpoint: () => ({ provision: "managed", url: "http://engine.invalid:8188" }),
      });
      const src = join(tempRoot("lane-nodir-"), "my_lora.safetensors");
      writeFileSync(src, Buffer.alloc(64, 7));
      const [code, res] = await run(
        { action: "lora_install", path: src, families: ["h3"] },
        ctx,
      );
      assert.equal(code, 502);
      assert.equal(res.ok, false);
      assert.match(res.detail, /the loras install dir is undeclared/);
      const [lc, lres] = await run({ action: "lora_list" }, ctx);
      assert.equal(lc, 200);
      assert.equal(lres.ok, true);
      const data = lres.data as Record<string, unknown>;
      assert.match(String(data["install_dir"]), /the loras install dir is undeclared/);
    } finally {
      if (prev === undefined) delete process.env["MELITE_COMFYUI_LORAS_DIR"];
      else process.env["MELITE_COMFYUI_LORAS_DIR"] = prev;
    }
  });

  it("lora_install refuses loudly: no path, a missing file, a non-LoRA", async () => {
    const ctx = CTX({ objectInfo: engineAnswer(OBJECT_INFO) });
    const [noPath] = await run({ action: "lora_install" }, ctx);
    assert.equal(noPath, 422);
    const dir = join(tempRoot("lane-loras2-"), "loras");
    const prev = process.env["MELITE_COMFYUI_LORAS_DIR"];
    process.env["MELITE_COMFYUI_LORAS_DIR"] = dir;
    try {
      const [missing, res] = await run(
        { action: "lora_install", path: join(tempRoot("lane-none-"), "nope.safetensors") },
        ctx,
      );
      assert.equal(missing, 422);
      assert.equal(res.ok, false);
      assert.match(res.detail, /no such file/);
      const png = join(tempRoot("lane-png-"), "not.png");
      writeFileSync(png, "x");
      const [wrong, wres] = await run({ action: "lora_install", path: png }, ctx);
      assert.equal(wrong, 422);
      assert.match(wres.detail, /not a LoRA file/);
    } finally {
      if (prev === undefined) delete process.env["MELITE_COMFYUI_LORAS_DIR"];
      else process.env["MELITE_COMFYUI_LORAS_DIR"] = prev;
    }
  });
});

// THE BYTES/LIVE SEATS (the coverage queue's managePlane batch,
// 2026-10-16): the bytes door's own refusal, the visible-true voice,
// and the no-seam/no-endpoint live path — objectInfoDoc's live arm
// and invalidateLiveObjectInfo's no-key catch, driven with the
// endpoint config pointed at an EMPTY file so resolveEngineBaseUrl
// refuses (a spec never fetches the running engine).
describe("lora_install — the bytes/live seats", () => {
  it("bytes with a NON-LoRA filename refuses in the installer's own voice", async () => {
    const ctx = CTX({ objectInfo: engineAnswer([]) });
    const dir = join(tempRoot("lane-badext-"), "loras");
    const prev = process.env["MELITE_COMFYUI_LORAS_DIR"];
    process.env["MELITE_COMFYUI_LORAS_DIR"] = dir;
    try {
      const [code, res] = await run(
        {
          action: "lora_install",
          filename: "note.txt",
          data: "data:application/octet-stream;base64,QUFB",
        },
        ctx,
      );
      assert.equal(code, 422);
      assert.equal(res.ok, false);
      assert.match(res.detail, /note\.txt is not a LoRA file/);
    } finally {
      if (prev === undefined) delete process.env["MELITE_COMFYUI_LORAS_DIR"];
      else process.env["MELITE_COMFYUI_LORAS_DIR"] = prev;
    }
  });

  it("the engine's list ALREADY naming the file says so (no restart owed)", async () => {
    const ctx = CTX({ objectInfo: engineAnswer(["uploaded.safetensors"]) });
    const dir = join(tempRoot("lane-visible-"), "loras");
    const prev = process.env["MELITE_COMFYUI_LORAS_DIR"];
    process.env["MELITE_COMFYUI_LORAS_DIR"] = dir;
    try {
      const [code, res] = await run(
        {
          action: "lora_install",
          filename: "uploaded.safetensors",
          data: "data:application/octet-stream;base64,QUFB",
        },
        ctx,
      );
      assert.equal(code, 200);
      assert.match(res.detail, /uploaded\.safetensors/);
      assert.match(res.detail, /already in the engine's list/);
      const data = res.data as Record<string, unknown>;
      assert.equal(data["restart_required"], false);
    } finally {
      if (prev === undefined) delete process.env["MELITE_COMFYUI_LORAS_DIR"];
      else process.env["MELITE_COMFYUI_LORAS_DIR"] = prev;
    }
  });

  it("a ctx with NO objectInfo seam and NO endpoint answers not-visible, never fetching live", async () => {
    // the live arms evaluate resolveEngineBaseUrl and refuse: an
    // empty endpoint config means no URL was ever configured, so
    // objectInfoDoc catches to null and invalidate has no key to
    // drop — the install still answers in the restart voice
    const cfg = join(tempRoot("lane-noep-"), "endpoint.json");
    writeFileSync(cfg, "{}", "utf8");
    const prevCfg = process.env["COMFYUI_ENDPOINT_CONFIG"];
    const prevUrl = process.env["COMFYUI_URL"];
    process.env["COMFYUI_ENDPOINT_CONFIG"] = cfg;
    delete process.env["COMFYUI_URL"];
    const ctx = CTX(); // NO objectInfo seam — the live arm itself
    const dir = join(tempRoot("lane-noep-"), "loras");
    const prev = process.env["MELITE_COMFYUI_LORAS_DIR"];
    process.env["MELITE_COMFYUI_LORAS_DIR"] = dir;
    try {
      const [code, res] = await run(
        {
          action: "lora_install",
          filename: "uploaded.safetensors",
          data: "data:application/octet-stream;base64,QUFB",
        },
        ctx,
      );
      assert.equal(code, 200);
      assert.match(res.detail, /restart the engine to enter its list/);
      const data = res.data as Record<string, unknown>;
      assert.equal(data["restart_required"], true);
    } finally {
      if (prevCfg === undefined) delete process.env["COMFYUI_ENDPOINT_CONFIG"];
      else process.env["COMFYUI_ENDPOINT_CONFIG"] = prevCfg;
      if (prevUrl === undefined) delete process.env["COMFYUI_URL"];
      else process.env["COMFYUI_URL"] = prevUrl;
      if (prev === undefined) delete process.env["MELITE_COMFYUI_LORAS_DIR"];
      else process.env["MELITE_COMFYUI_LORAS_DIR"] = prev;
    }
  });
});

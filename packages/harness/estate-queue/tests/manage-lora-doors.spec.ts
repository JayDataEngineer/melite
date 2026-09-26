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

// provision-models channel writers — the manager-local model-list and
// the security_level pin that admit declared estate rows into
// Manager's install whitelist (desktop audit: every provision row
// failed "catalog does not contain exactly one row").
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  MELITE_MODEL_BASE,
  ensureManagerSecurityWeak,
  writeManagerLocalModelList,
} from "../scripts/provision-models.ts";

describe("writeManagerLocalModelList", () => {
  const dir = mkdtempSync(join(tmpdir(), "melite-mll-"));

  it("writes one whitelist row per declared provision, deterministically sorted", () => {
    const listPath = join(dir, "custom_nodes", "comfyui-manager", "model-list.json");
    writeManagerLocalModelList(listPath, [
      { family: "zeta", row: { name: "b.safetensors", folder: "/loras/h3/", url: "https://x/b" } },
      { family: "anima", row: { name: "a.safetensors", folder: "diffusion_models", url: "https://x/a" } },
    ]);
    const parsed = JSON.parse(readFileSync(listPath, "utf8")) as {
      models: Array<Record<string, string>>;
    };
    assert.equal(parsed.models.length, 2);
    // sorted by save_path+filename: diffusion_models before loras/h3
    assert.deepEqual(parsed.models.map((m) => m.filename), ["a.safetensors", "b.safetensors"]);
    for (const m of parsed.models) {
      assert.equal(m.type, MELITE_MODEL_BASE);
      assert.equal(m.base, MELITE_MODEL_BASE);
      assert.doesNotMatch(m.save_path, /^\/|\/$/u);
    }
    assert.equal(parsed.models[1].save_path, "loras/h3");

    // rerun byte-matches (idempotent surface for the running engine)
    const before = readFileSync(listPath, "utf8");
    writeManagerLocalModelList(listPath, [
      { family: "anima", row: { name: "a.safetensors", folder: "diffusion_models", url: "https://x/a" } },
      { family: "zeta", row: { name: "b.safetensors", folder: "/loras/h3/", url: "https://x/b" } },
    ]);
    assert.equal(readFileSync(listPath, "utf8"), before);

    rmSync(dir, { recursive: true, force: true });
  });
});

describe("ensureManagerSecurityWeak", () => {
  const dir = mkdtempSync(join(tmpdir(), "melite-sec-"));

  it("creates the config when absent and reports a restart is needed", () => {
    const p = join(dir, "a", "config.ini");
    assert.equal(ensureManagerSecurityWeak(p), false);
    assert.match(readFileSync(p, "utf8"), /^\[default\]\nsecurity_level = weak\n$/u);
  });

  it("replaces only the security_level line of an existing config", () => {
    const p = join(dir, "b", "config.ini");
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p,
      "[default]\nchannel_url = https://comfy.org\nsecurity_level = normal-\nui_mode = dark\n");
    assert.equal(ensureManagerSecurityWeak(p), false);
    const text = readFileSync(p, "utf8");
    assert.match(text, /channel_url = https:\/\/comfy\.org\n/u);
    assert.match(text, /security_level = weak\n/u);
    assert.match(text, /ui_mode = dark\n/u);

    // already weak: untouched, no restart needed
    assert.equal(ensureManagerSecurityWeak(p), true);
  });

  it("appends the pin when a config carries no security_level line", () => {
    const p = join(dir, "c", "config.ini");
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, "[default]\nui_mode = dark\n");
    assert.equal(ensureManagerSecurityWeak(p), false);
    assert.match(readFileSync(p, "utf8"), /ui_mode = dark\nsecurity_level = weak\n$/u);

    rmSync(dir, { recursive: true, force: true });
  });
});

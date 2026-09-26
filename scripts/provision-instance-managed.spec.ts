import { describe, it, onTestFinished, vi } from "vitest";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pinManagerConfig } from "../packages/engines/comfyui-cordis/scripts/provision-instance-managed.ts";

const CHANNEL_URL = "https://raw.githubusercontent.com/Comfy-Org/ComfyUI-Manager/main";
const PINNED_CONFIG = [
  "[default]",
  "security_level = normal-",
  "allow_git_url_install = true",
  "allow_pip_install = true",
  "channel_url = " + CHANNEL_URL,
  "",
].join("\n");

const tempRuntime = (): string => {
  const dir = mkdtempSync(join(tmpdir(), "manager-config-"));
  onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
};

const configFile = (runtime: string): string =>
  join(runtime, "user", "__manager", "config.ini");

describe("pinManagerConfig", () => {
  it("writes the Comfy-Org channel on a fresh install", () => {
    const runtime = tempRuntime();
    pinManagerConfig(runtime);
    assert.equal(readFileSync(configFile(runtime), "utf8"), PINNED_CONFIG);
  });

  it("warns on channel drift without rewriting a running config", () => {
    const runtime = tempRuntime();
    const file = configFile(runtime);
    const before = PINNED_CONFIG.replace(CHANNEL_URL, "https://example.invalid/manager");
    mkdirSync(join(runtime, "user", "__manager"), { recursive: true });
    writeFileSync(file, before, { flag: "wx" });
    const messages: string[] = [];
    const log = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      messages.push(args.map((arg) => String(arg)).join(" "));
    });
    try {
      pinManagerConfig(runtime);
      assert.equal(readFileSync(file, "utf8"), before);
      assert.ok(messages.some((message) => message.includes(
        "manager config drift: 'channel_url = " + CHANNEL_URL + "' missing"
      )));
    } finally {
      log.mockRestore();
    }
  });
});

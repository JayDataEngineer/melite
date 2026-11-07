import "../../../../tests/helpers/boot-models.ts";
import { afterEach, beforeEach, describe, test, vi } from "vitest";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, type PathLike } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context, type Plugin } from "@deepseek-ai/cordis";
import { loadExtensionsYaml } from "@melite/comfyui-cordis/provisioning-manifest";

// THE BOTH-ABSENT REFUSAL (extensionFactsPath's throw, 2026-11-16):
// the repo-anchored facts read falls back to the shipped package
// data (the install shape — provisioned-coverage.spec.ts's fallback
// arm) and BOTH ABSENT refuses loud, never a silent empty node-type
// map. The throw is unreachable from a checkout: packageRoot()
// anchors the package tree, whose data/model-facts.json exists by
// construction (no env pin, by the shipped-data law). The rig
// therefore lies to existsSync on EXACTLY the model-facts paths —
// the one probe the refusal branch owns — and leaves every other
// stat truthful. A flag gates the lie so the CONTROL arm proves the
// seam inert when the facts are honestly present.
const lieFactsAbsent = vi.hoisted(() => ({ active: false }));

vi.mock("node:fs", async (importOriginal) => {
  const fs = await importOriginal<typeof import("node:fs")>();
  return {
    ...fs,
    existsSync: (p: PathLike): boolean => {
      if (lieFactsAbsent.active && typeof p === "string" && p.endsWith("model-facts.json")) return false;
      return fs.existsSync(p);
    },
  };
});

import composition from "../src/provisioning.ts";

const ENV_KEYS = ["MELITE_REPO_ROOT", "MELITE_EXTENSION_MANIFEST", "COMFYUI_ENDPOINT_CONFIG", "INFERENCE_TEST_SANDBOX", "COMFYUI_URL"];
const contexts: Context[] = [];
const roots: string[] = [];
let saved: Record<string, string | undefined> = {};

describe.sequential("the extension facts read refuses loud when both anchors are absent", () => {
  beforeEach(() => {
    saved = {};
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(async () => {
    lieFactsAbsent.active = false;
    for (const ctx of contexts.splice(0)) await ctx.fiber.dispose();
    for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  /** The same scratch-repo shape the coverage rig mounts: a root
   *  whose cordis data dir carries the endpoint config, the shipped
   *  extension manifest (authored at nodes/ yaml, derived by the
   *  real loader), and NO model-facts.json — the both-absent shape
   *  once the existsSync lie hides the checkout's own shipped file. */
  function scratchRepo(): string {
    const root = mkdtempSync(join(tmpdir(), "web-facts-refusal-"));
    roots.push(root);
    const data = join(root, "packages", "engines", "comfyui-cordis", "data");
    mkdirSync(data, { recursive: true });
    writeFileSync(join(data, "comfyui_endpoint.json"), JSON.stringify({ url: "", provision: "managed" }));
    const nodes = join(root, "packages", "demo", "nodes");
    mkdirSync(nodes, { recursive: true });
    const yamlPath = join(nodes, "extensions.yaml");
    writeFileSync(yamlPath, "extensions:\n  - name: demo\n    url: https://example.invalid/demo.git\n    ref: 0a1b2c3d4e5f60718293a4b5c7e8f901234567\n    pip:\n      - numpy\n");
    writeFileSync(join(data, "extension-manifest.json"), JSON.stringify(loadExtensionsYaml(yamlPath)));
    return root;
  }

  /** The mount the coverage rig seats (its own shape, trimmed to
   *  this arm's need): the card registry answers an empty defs map —
   *  the composition's apply demands the service exist, and no card
   *  rides this refusal arm. */
  function mountComposition(): Context {
    const ctx = new Context();
    contexts.push(ctx);
    const original = ctx.get.bind(ctx);
    const cards = new Map();
    ctx.get = ((name: string, optional?: boolean) => {
      if (name === "cardRegistry") return { defsSync: () => cards };
      return original(name, optional);
    }) as typeof ctx.get;
    const plugin: Plugin.Object = composition;
    plugin.apply(ctx, {});
    return ctx;
  }

  test("the CONTROL arm: with the facts honestly readable the same mount plans clean (the seam is inert)", async () => {
    const root = scratchRepo();
    process.env["MELITE_REPO_ROOT"] = root;
    process.env["MELITE_EXTENSION_MANIFEST"] = join(root, "packages", "engines", "comfyui-cordis", "data", "extension-manifest.json");
    process.env["COMFYUI_ENDPOINT_CONFIG"] = join(root, "packages", "engines", "comfyui-cordis", "data", "comfyui_endpoint.json");
    const ctx = mountComposition();
    // the scratch repo carries no facts file, so the read honestly
    // resolves off the CHECKOUT's shipped data (the fallback arm's
    // own shape) — the plan lands, the lie never fired
    const plan = await ctx.provisioning.plan({ kind: "extension", id: "demo" });
    assert.equal(plan.items[0]?.provider, "git", "the honest mount plans the demo extension");
  });

  test("BOTH ANCHORS ABSENT refuses loud, naming both paths — never a silent empty node-type map", async () => {
    const root = scratchRepo();
    process.env["MELITE_REPO_ROOT"] = root;
    process.env["MELITE_EXTENSION_MANIFEST"] = join(root, "packages", "engines", "comfyui-cordis", "data", "extension-manifest.json");
    process.env["COMFYUI_ENDPOINT_CONFIG"] = join(root, "packages", "engines", "comfyui-cordis", "data", "comfyui_endpoint.json");
    const ctx = mountComposition();
    lieFactsAbsent.active = true;
    await assert.rejects(
      ctx.provisioning.plan({ kind: "extension", id: "demo" }),
      (err: unknown) => {
        const text = String((err as { message?: unknown }).message ?? err);
        assert.match(text, /REFUSED: no model facts readable/, "the refusal is loud and names its class");
        // both anchors named — the operator can act on the message alone
        assert.match(text, /model-facts\.json/, "the message carries the paths it probed");
        return true;
      },
    );
  });
});

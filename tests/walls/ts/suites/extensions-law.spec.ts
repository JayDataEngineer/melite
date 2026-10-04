// extensions-law.spec.ts — THE EXTENSIONS LAW'S CENSUS WALL (the
// operator's standing order; re-audit round 2's D1 confirmed no wall
// asserted it). Engine extensions install ONLY through
// ComfyUI-Manager's git-url door: the estate declares exactly one
// install port (ManagerPort), speaks exactly Manager's endpoint
// spellings, and carries no clone/symlink/copy seat of its own —
// the hand-rolled git-extension-provider was deleted (07438dbc)
// and nothing pins that it STAYS deleted. This wall does: a new
// port, a new endpoint, or a resurrected provider all fail here
// before any behavior test could bless them.
import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..", "..");
const PROV = join(ROOT, "packages", "estate", "provisioning", "src");

function srcFiles(): string[] {
  return readdirSync(PROV)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => join(PROV, f));
}

function read(rel: string): string {
  return readFileSync(join(PROV, rel), "utf8");
}

describe("THE EXTENSIONS LAW (Manager's git-url door is the only install seat)", () => {
  it("the provisioning tree declares exactly the five known ports — a sixth forces this wall's eyes", () => {
    const ports = [...read("ports.ts").matchAll(/export interface (\w+Port)\b/gu)].map((m) => m[1]!);
    expect(ports.sort()).toEqual([
      "DeclarationPort",
      "InspectorPort",
      "LifecyclePort",
      "ManagerPort",
      "OperationStorePort",
    ].sort());
  });

  it("ManagerPort's install members carry no clone/copy/symlink verb", () => {
    const text = read("ports.ts");
    const block = text.slice(
      text.indexOf("export interface ManagerPort"),
      text.indexOf("}", text.indexOf("export interface ManagerPort")),
    );
    expect(block).toMatch(/install\(/u);
    expect(block, "the port installs; nothing clones").not.toMatch(/clone|symlink|copyFile|cpSync/iu);
  });

  it("the extension install verb is Manager's /customnode/install/git_url endpoint, pinned by spelling", () => {
    const provider = read("manager-provider.ts");
    expect(provider).toContain('"/customnode/install/git_url"');
    // the census of EVERY Manager endpoint the tree posts to — pip
    // deps, the git-url door, the queue verbs. A new endpoint (a
    // resurrected clone seat would need one) fails this exact set.
    const posts = [...new Set(
      [...provider.matchAll(/\bclient\.post\("([^"]+)"/gu)].map((m) => m[1]!),
    )];
    expect(posts.sort()).toEqual([
      "/customnode/install/git_url",
      "/customnode/install/pip",
      "/manager/queue/install",
      "/manager/queue/install_model",
      "/manager/queue/start",
    ].sort());
  });

  it("no provisioning src spawns a process or links the tree — installs ride Manager HTTP only", () => {
    for (const abs of srcFiles()) {
      const text = readFileSync(abs, "utf8");
      expect(text, `${abs}: no child_process`).not.toMatch(/from\s+['"]node:child_process['"]/u);
      expect(text, `${abs}: no git library`).not.toMatch(/['"](simple-git|isomorphic-git|degit)['"]/u);
      expect(text, `${abs}: no spawn of a shell`).not.toMatch(/\bspawnSync?\(|\bexecFileSync?\(/u);
    }
  });

  it("the hand-rolled clone provider stays deleted (07438dbc)", () => {
    expect(existsSync(join(PROV, "git-extension-provider.ts"))).toBe(false);
    for (const abs of srcFiles()) {
      expect(readFileSync(abs, "utf8"), `${abs}: the provider is not re-referenced`)
        .not.toMatch(/git-extension-provider/u);
    }
  });
});

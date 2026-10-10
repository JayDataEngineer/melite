// provisioner-census.ts — the census reads the provisioner walls share:
// what the renderer DECLARES (the bin is the oracle, never a list
// retyped beside it) and which workspace packages carry their own
// browser face. ONE HOME PER FACT (the H3 composition audit, F1/F2,
// 2026-10-10): the render wall judges the composed patch and the boot
// wall judges the served graph, and the two planes must agree on which
// faces exist and which ones a base promises — a second copy of either
// read is how those planes drift apart, which is exactly how the
// timeline bar's studio row left the composition with every wall green.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

/** The bin's declared `webRows` list — the renderer's own oracle for
 *  the web plane (E-M9: parsed from the bin's source, never retyped). */
export function binWebRows(binSrc: string): string[] {
  const m = binSrc.match(/const webRows = \[([\s\S]*?)\]/);
  assert.ok(m !== null, "the bin declares its webRows list (the renderer's own oracle)");
  return [...(m[1] as string).matchAll(/'([^']+)'/g)].map((x) => x[1]!).sort();
}

/** The bin's declared bundle base for a profile — the bundles the
 *  renderer mounts before any patch layer applies. */
export function binProfileBase(binSrc: string, profile: string): string[] {
  const block = binSrc.match(new RegExp(`(?:^|\\n)\\s*(?:'${profile}'|${profile}): \\[([\\s\\S]*?)\\]`));
  assert.ok(block !== null, `the bin declares the ${profile} profile base`);
  return [...(block[1] as string).matchAll(/'([^']+)'/g)].map((x) => x[1]!).filter((b) => b.startsWith("@"));
}

/** Workspace packages under `<repo>/packages/` that declare a browser
 *  face AND own their existence row (`dsh.bundle.patch`): the profile's
 *  own bundle layer is the ONLY door that mounts their row (channel law
 *  2026-09-09), so such a package a base mounts carries its row itself,
 *  and one the base does not mount has no door at all. The vendored
 *  platform tier carries no melite faces and is not scanned. */
export function selfRegisteringWebFaces(repo: string): string[] {
  const manifests: string[] = [];
  const walk = (dir: string, depth: number): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === "node_modules") continue;
      const full: string = join(dir, entry.name);
      const manifest: string = join(full, "package.json");
      if (existsSync(manifest)) manifests.push(manifest);
      if (depth < 6) walk(full, depth + 1);
    }
  };
  walk(join(repo, "packages"), 0);
  const faces = new Set<string>();
  for (const manifest of manifests) {
    let doc: {
      name?: unknown;
      dsh?: { client?: { platform?: unknown }; bundle?: { patch?: unknown } };
    };
    try {
      doc = JSON.parse(readFileSync(manifest, "utf8")) as typeof doc;
    } catch {
      continue; // a fixture manifest (malformed on purpose) is not a workspace package
    }
    if (doc.dsh?.client?.platform !== "web") continue;
    if (typeof doc.dsh.bundle?.patch !== "string" || doc.dsh.bundle.patch === "") continue;
    if (typeof doc.name === "string") faces.add(doc.name);
  }
  return [...faces].sort();
}

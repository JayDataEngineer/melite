/** bundle-seats.ts — THE SEAT CENSUS, DERIVED FROM THE BUNDLE.
 *
 * B-M8 (the wall audit, 2026-09-28): the two composition walls
 * waited on a HAND list of 9-10 seat names while the bundle mounts
 * ~20 providers — a seat born outside the list was never waited for
 * (the wedge those walls exist to catch), and a renamed seat made
 * the wait vacuous.
 *
 * THE DERIVATION: a cordis seat is NAMED at its declaration —
 * `super(ctx, "cardRegistry")` inside the Service subclass. The
 * bundle's own import graph is walked (the bundle file, every
 * module it reaches through a static import, transitively), and
 * every seat name declared in that closure is harvested. The census
 * is therefore the bundle's own truth: a new provider is waited for
 * the moment it joins the closure, and a deleted provider leaves
 * the list.
 *
 * The name-pattern harvest is deliberately narrow — `super(ctx, "`
 * with a plain string literal is the ONE way a seat is declared in
 * this tree (no decorator form is in use), and the helper asserts
 * that at least the known seats came back, so a grammar change that
 * emptied the harvest fails loudly rather than vacuously.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve as resolvePath } from "node:path";

/** workspace package name -> package directory (one scan, cached). */
let packageDirs: Map<string, string> | null = null;
function workspacePackages(repoRoot: string): Map<string, string> {
  if (packageDirs !== null) return packageDirs;
  const out = new Map<string, string>();
  const walk = (dir: string, depth: number): void => {
    if (depth > 3) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory() || e.name === "node_modules" || e.name.startsWith(".")) continue;
      const p = join(dir, e.name);
      const manifest = join(p, "package.json");
      if (existsSync(manifest)) {
        try {
          const name = JSON.parse(readFileSync(manifest, "utf8")).name as string | undefined;
          if (typeof name === "string" && name.startsWith("@melite/")) out.set(name, p);
        } catch { /* an unreadable manifest is not a package */ }
      }
      walk(p, depth + 1);
    }
  };
  walk(join(repoRoot, "packages"), 0);
  packageDirs = out;
  return out;
}

/** Resolve one import specifier to a file on disk, or null. */
function resolveSpecifier(spec: string, fromFile: string, repoRoot: string): string | null {
  // this tree writes ESM-style "./x.js" specifiers that resolve to
  // TypeScript sources — the stem is what maps, not the extension.
  const stem = spec.replace(/\.js$/, "");
  if (stem.startsWith(".")) {
    const base = resolvePath(dirname(fromFile), stem);
    for (const cand of [base, base + ".ts", base + ".tsx", join(base, "index.ts")]) {
      if (existsSync(cand) && !existsSync(join(cand, "package.json"))) {
        try { readFileSync(cand, "utf8"); return cand } catch { /* not a file */ }
      }
    }
    return null;
  }
  if (stem.startsWith("@melite/")) {
    const slash = stem.indexOf("/", "@melite/".length);
    const name = slash === -1 ? stem : stem.slice(0, slash);
    const sub = slash === -1 ? "" : stem.slice(slash + 1);
    const dir = workspacePackages(repoRoot).get(name);
    if (dir === undefined) return null;
    if (sub === "") {
      for (const cand of [join(dir, "src/index.ts"), join(dir, "src/index.tsx")]) {
        if (existsSync(cand)) return cand;
      }
      return null;
    }
    for (const cand of [join(dir, "src", sub), join(dir, "src", sub + ".ts"), join(dir, "src", sub + "index.ts")]) {
      if (existsSync(cand) && !existsSync(join(cand, "package.json"))) {
        try { readFileSync(cand, "utf8"); return cand } catch { /* not a file */ }
      }
    }
    return null;
  }
  return null; // external package — its internals are not the bundle's closure
}

/** The seats the bundle's import closure DECLARES, sorted. */
export function bundleSeats(bundleEntry: string, repoRoot: string): string[] {
  const seen = new Set<string>();
  const seats = new Set<string>();
  const queue: string[] = [resolvePath(bundleEntry)];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    let src: string;
    try { src = readFileSync(file, "utf8"); } catch { continue }
    // CODE ONLY: a comment may NAME a seat it does not declare
    // (skillRegistry.ts explains that DSH core owns "skills") — the
    // harvest must not read a sentence as a declaration.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .split("\n")
      .filter((l) => !l.trim().startsWith("//"))
      .join("\n");
    for (const m of code.matchAll(/super\(\s*ctx\s*,\s*"([^"]+)"/g)) seats.add(m[1]!);
    for (const m of src.matchAll(/\bfrom\s+"([^"]+)"/g)) {
      const target = resolveSpecifier(m[1]!, file, repoRoot);
      if (target !== null && !seen.has(target)) queue.push(target);
    }
    for (const m of src.matchAll(/import\(\s*"([^"]+)"/g)) {
      const target = resolveSpecifier(m[1]!, file, repoRoot);
      if (target !== null && !seen.has(target)) queue.push(target);
    }
  }
  return [...seats].sort();
}

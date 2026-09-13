// enhanceRecipes.ts — THE PROMPT-ENHANCE RECIPE LOADER (the model's
// agent-facing interface, hour 24 stroke 10). The recipes are SSOT in
// the models tree — <models>/<genre>/<family>/agents/skills/
// prompt-enhance/SKILL.md — migrated verbatim from the old tree's
// config/editor/enhance_prompts.yaml (2026-08-16). This loader reads
// them and composes the served recipe string with the OLD composer's
// exact grammar:
//
//   role + "\n\n" + notes (each "- "-prefixed, "\n"-joined)
//        + "\n\n" + shared[base] + shared[base + "_json"]
//
// SHARED BLOCKS merge TREE-WIDE (one namespace): z-image owns the
// image-gen blocks (img_gen / img_gen_json), h3 owns the video ones
// (video_gen / video_h3_native) — every file's ``base:`` reference
// resolves against the merged map, exactly as the old loader's
// reserved map did. The byte referee for the composition is the old
// tree's served spec fixtures (spec_krea-2.json enhance_prompts.prompt)
// — pinned in the unit wall.
//
// The file grammar is CONSTRAINED (loader-enforced, loud on drift):
//   - optional frontmatter (--- ... ---), markdown comments (#)
//   - route-key entries:  key: [&anchor]  → role/notes/base block
//                         key: *alias     → anchor copy
//   - shared:             name: |  literal block scalars
//   - services:           reserved for other consumers — skipped here
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** One route-key entry as declared (pre-composition). */
interface RecipeRow {
  role: string;
  notes: string[];
  base: string;
}

const isDir = (p: string): boolean => {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
};

/** The declaration models tree root — the PACKAGE's own models/ dir
 *  (self-locating: src/models → package root → models; never the
 *  env-overridable repo root — that law serves the RUNTIME tree). */
function declarationModelsRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "models");
}

/** Unescape a YAML double-quoted scalar (the constrained subset the
 *  recipe files use: \" \\ \n — anything else rides verbatim). */
function unquote(v: string): string {
  return v
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

interface ParsedFile {
  routes: Map<string, RecipeRow>;
  shared: Map<string, string>;
}

/** Parse ONE SKILL.md (frontmatter stripped; comments skipped). */
function parseSkillFile(text: string, file: string): ParsedFile {
  const routes = new Map<string, RecipeRow>();
  const shared = new Map<string, string>();
  const anchors = new Map<string, RecipeRow>();
  // strip frontmatter
  let body = text;
  if (body.startsWith("---\n")) {
    const end = body.indexOf("\n---\n", 4);
    if (end !== -1) body = body.slice(end + 5);
  }
  const lines = body.split("\n");
  let i = 0;
  const n = () => lines[i] ?? "";
  while (i < lines.length) {
    const line = n();
    if (line.trim() === "" || line.trimStart().startsWith("#")) {
      i += 1;
      continue;
    }
    // top-level entries only (indent 0)
    const top = /^([A-Za-z0-9_.-]+):\s*(.*)$/.exec(line);
    if (top === null || (line.length - line.trimStart().length) > 0) {
      throw new Error(`enhance recipe ${file}:${i + 1}: unexpected line '${line.trim()}'`);
    }
    const [, key, rest] = top;
    if (key === "services") {
      // reserved map (form-level prompts, other consumers) — skip its
      // block: consume until the next top-level key
      i += 1;
      while (i < lines.length && !/^[A-Za-z0-9_.-]+:/.test(n())) i += 1;
      continue;
    }
    if (key === "shared") {
      // block-scalar map: name: |  → literal lines (indented)
      i += 1;
      while (i < lines.length) {
        const s = n();
        if (s.trim() === "" || s.trimStart().startsWith("#")) {
          i += 1;
          continue;
        }
        if (/^[A-Za-z0-9_.-]+:/.test(s)) break; // next top-level key
        const m = /^(\s+)([A-Za-z0-9_.-]+):\s*\|\s*$/.exec(s);
        if (m === null) {
          throw new Error(`enhance recipe ${file}:${i + 1}: shared block must be 'name: |' (got '${s.trim()}')`);
        }
        const name = m[2];
        i += 1;
        // the block's indent = the first non-empty line's own indent
        // (the key line's indent + any deeper); blank lines ride raw
        let indent = "";
        const block: string[] = [];
        while (i < lines.length) {
          const b = n();
          if (b === "") {
            block.push("");
            i += 1;
            continue;
          }
          if (indent === "") indent = b.slice(0, b.length - b.trimStart().length);
          if (!b.startsWith(indent)) break;
          block.push(b.slice(indent.length));
          i += 1;
        }
        // strip EDGE blanks only (internal blanks are the recipe's own)
        while (block.length > 0 && block[0] === "") block.shift();
        while (block.length > 0 && block[block.length - 1] === "") block.pop();
        shared.set(name, block.join("\n"));
      }
      continue;
    }
    // a route-key entry
    const anchor = /^&(\S+)\s*$/.exec(rest);
    const alias = /^\*(\S+)\s*$/.exec(rest);
    if (alias !== null) {
      const row = anchors.get(alias[1]);
      if (row === undefined) {
        throw new Error(`enhance recipe ${file}:${i + 1}: alias '*${alias[1]}' has no anchor`);
      }
      routes.set(key, row);
      i += 1;
      continue;
    }
    // parse the nested role/notes/base block
    i += 1;
    const row: RecipeRow = { role: "", notes: [], base: "" };
    while (i < lines.length) {
      const b = n();
      if (b.trim() === "" || b.trimStart().startsWith("#")) {
        i += 1;
        continue;
      }
      if (!b.startsWith("  ")) break; // next top-level key
      const field = /^ {2}([a-z]+):\s*(.*)$/.exec(b);
      if (field === null) {
        throw new Error(`enhance recipe ${file}:${i + 1}: unknown nested line '${b.trim()}'`);
      }
      const [, fk, fv] = field;
      if (fk === "role") {
        const q = /^"(.*)"\s*$/.exec(fv);
        if (q === null) throw new Error(`enhance recipe ${file}:${i + 1}: role must be double-quoted`);
        row.role = unquote(q[1]);
      } else if (fk === "base") {
        row.base = fv.trim();
      } else if (fk === "notes") {
        if (fv !== "") throw new Error(`enhance recipe ${file}:${i + 1}: notes must be a dash list`);
        i += 1;
        while (i < lines.length) {
          const nl = n();
          const item = /^ {4}- "(.*)"\s*$/.exec(nl);
          if (item === null) break;
          row.notes.push(unquote(item[1]));
          i += 1;
        }
        continue;
      } else {
        throw new Error(`enhance recipe ${file}:${i + 1}: unknown field '${fk}'`);
      }
      i += 1;
    }
    if (row.role === "") throw new Error(`enhance recipe ${file}: entry '${key}' has no role`);
    routes.set(key, row);
    if (anchor !== null) anchors.set(anchor[1], row);
  }
  return { routes, shared };
}

/** THE COMPOSED TABLE (module cache — the declaration tree is static
 *  per process): route key → served recipe string. */
export function enhanceRecipes(): Record<string, string> {
  const routes = new Map<string, RecipeRow>();
  const shared = new Map<string, string>();
  const root = declarationModelsRoot();
  if (isDir(root)) {
    for (const genre of readdirSync(root)) {
      const gdir = join(root, genre);
      if (!isDir(gdir)) continue;
      for (const fam of readdirSync(gdir)) {
        if (!isDir(join(gdir, fam))) continue; // files in genre dirs (nodes.yaml …)
        const skill = join(gdir, fam, "agents", "skills", "prompt-enhance", "SKILL.md");
        try {
          const parsed = parseSkillFile(readFileSync(skill, "utf8"), skill);
          for (const [k, v] of parsed.routes) routes.set(k, v);
          for (const [k, v] of parsed.shared) {
            if (shared.has(k) && shared.get(k) !== v) {
              throw new Error(`enhance recipe: shared block '${k}' declared twice with different bodies (${skill})`);
            }
            shared.set(k, v);
          }
        } catch (err: unknown) {
          if ((err as NodeJS.ErrnoException).code === "ENOENT") continue;
          throw err;
        }
      }
    }
  }
  // compose (second pass — shared blocks merge tree-wide first)
  const out: Record<string, string> = {};
  for (const [key, row] of routes) {
    let recipe = row.role + "\n\n" + row.notes.map((x) => "- " + x).join("\n");
    if (row.base !== "") {
      const base = shared.get(row.base);
      if (base !== undefined) recipe += "\n\n" + base;
      const json = shared.get(row.base + "_json");
      if (json !== undefined) recipe += "\n\n" + json;
    }
    out[key] = recipe + "\n"; // the old composer's final newline
  }
  return out;
}

/** The served recipe for one model: exact route key first, else the
 *  family head entry, else null (the caller's stub stands and the
 *  sweep falls to the generic recipe — the no-file law). */
export function enhanceRecipeFor(model: string, family: string): string | null {
  const table = enhanceRecipes();
  if (typeof table[model] === "string") return table[model];
  if (typeof table[family] === "string") return table[family];
  return null;
}

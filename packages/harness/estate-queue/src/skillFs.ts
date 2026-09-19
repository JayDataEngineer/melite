// skillFs.ts — the skill plane's fs walkers (extracted from
// skillPlane.ts, the god-file cut): directory/file probes, the
// dir-id alias bridge, and the one disclosure-root resolution.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Underscore card dirs bridge to their registry ids here
 *  (dead doors/toolProjection.ts:27-31, verbatim — a future dir
 *  rename deletes the row). */
export const DIR_ID_ALIASES: Readonly<Record<string, string>> = {
  img_to_mesh: "img-to-mesh",
  input_prep: "input-prep",
  mask_studio: "mask-studio",
};

/** Path.stem: strip the last-dot suffix; dotfiles keep theirs. */
export function stem(name: string): string {
  const i: number = name.lastIndexOf(".");
  if (i <= 0) return name;
  return name.slice(0, i);
}

/** Disclosure root (the REPO the doors read): MELITE_REPO_ROOT else
 *  file-anchored (the uploads-door pattern).
 *  Exported — the catalogs door anchors the same root (one root
 *  function, never duplicated). */
export function disclosureRoot(): string {
  const override: string = process.env["MELITE_REPO_ROOT"] ?? "";
  if (override !== "") return override;
  const here: string = dirname(fileURLToPath(import.meta.url));
  // 4 up from estate-queue/src/ (the REBUILD-16 re-home shallowed the
  // tree — the ported 5-up anchor read the parent of the repo until
  // the skills spec pinned it, 2026-09-12).
  return resolve(here, "..", "..", "..", "..");
}

// ---------------------------------------------------------------------------
// fs helpers (stdlib move-for-move)
// ---------------------------------------------------------------------------

export function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

export function isFile(p: string): boolean {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

/** Sorted subdir names, NO dot filter (the disclosure walks —
 *  _model_rows/_card_rows/_model_ids — never filter dots; only
 *  catalog._dirs_under does). D4 over non-ASCII. */
export function subdirs(parent: string): string[] {
  let names: string[];
  try {
    names = readdirSync(parent);
  } catch {
    /* v8 ignore next -- every caller isDir-guards (TOCTOU-only):
       the fallback never fires (2026-09-12) */
    return [];
  }
  return names
    .filter((n: string): boolean => isDir(join(parent, n)))
    .sort();
}

export function readText(p: string): string | null {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

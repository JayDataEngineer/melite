// skillFs.ts — the skill plane's fs walkers (extracted from
// skillPlane.ts, the god-file cut): directory/file probes, the
// dir-id alias bridge, and the one disclosure-root resolution.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { resolveRepoRoot } from "@melite/comfyui-cordis";
/** Underscore card dirs bridge to their registry ids here
 *  (dead doors/toolProjection.ts:27-31, verbatim — a future dir
 *  rename deletes the row). */
export const DIR_ID_ALIASES = {
    img_to_mesh: "img-to-mesh",
    input_prep: "input-prep",
    mask_studio: "mask-studio",
};
/** Path.stem: strip the last-dot suffix; dotfiles keep theirs. */
export function stem(name) {
    const i = name.lastIndexOf(".");
    if (i <= 0)
        return name;
    return name.slice(0, i);
}
/** Disclosure root (the REPO the doors read): the ONE root
 *  resolution, {@link resolveRepoRoot} in comfyui-cordis
 *  (MELITE_REPO_ROOT else file-anchored — design/repo-root-anchor-
 *  2026-10-18.md). This alias keeps the doors' vocabulary; the
 *  plugin-law N3 cure (2026-10-20) deleted the second copy — both
 *  packages sit at equal tree depth, so the shared anchor serves
 *  every plane.
 *  Exported — the catalogs door anchors the same root (one root
 *  function, never duplicated). */
export function disclosureRoot() {
    return resolveRepoRoot();
}
// ---------------------------------------------------------------------------
// fs helpers (stdlib move-for-move)
// ---------------------------------------------------------------------------
export function isDir(p) {
    try {
        return statSync(p).isDirectory();
    }
    catch {
        return false;
    }
}
export function isFile(p) {
    try {
        return statSync(p).isFile();
    }
    catch {
        return false;
    }
}
/** Sorted subdir names, NO dot filter (the disclosure walks —
 *  _model_rows/_card_rows/_model_ids — never filter dots; only
 *  catalog._dirs_under does). D4 over non-ASCII. */
export function subdirs(parent) {
    let names;
    try {
        names = readdirSync(parent);
    }
    catch {
        /* v8 ignore next -- every caller isDir-guards (TOCTOU-only):
           the fallback never fires (2026-09-12) */
        return [];
    }
    return names
        .filter((n) => isDir(join(parent, n)))
        .sort();
}
export function readText(p) {
    try {
        return readFileSync(p, "utf8");
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=skillFs.js.map
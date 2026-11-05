/**
 * VENDOR-ESTATE LOCATIONS (2026-11-01 — the vendor re-cure: COMFYUI
 * EXTENSION NEVER USE ENV VARIABLES; extended the same day to the UPSTREAM
 * packs — the upstream env cures).
 *
 * THE LAW: no pack under vendor/comfyui_extensions resolves a location or
 * behavior seat from process env. Model homes ride ComfyUI's folder machinery
 * (folder_paths categories seated by the endpoint statement's
 * extra_model_folders); offline/device/mode/debug switches ride NODE INPUTS.
 * A missing home refuses loud naming the DECL seat + folder category — never
 * a silent /mnt/data literal, never an env fallback.
 *
 * THE SWEEP (LAW 4 DEPTH — derived roster, never a hand list): every SHIPPED
 * *.py under ALL THIRTEEN packs at wall time — the six melite-* estate packs
 * AND the seven upstream packs (CameraReference3D, CrossViewWarp,
 * MiniMax-H3-MotionCache-FastVAE, MiniMaxH3-Context-Loop, MiniMaxH3Mod,
 * Minimax_h3_latent_Upscaler-Plus, minimax-h3-timeline-director). Dev
 * scripts, test suites, bytecode caches, pack-local _vendor shims, and
 * vendored third-party trees (the moss_sfx_impl upstream embed inside
 * melite-audio-nodes) are outside the sweep — see EXCLUDED. The upstream
 * SELFLIFT_* / TST-exact debug flags now ride optional node inputs threaded
 * through the engines (timing_sync / debug_dump / memory_log / exact_debug);
 * the test-only seats (COMFY_URL, COMFYUI_PATH) ride argv / the deploying
 * install root, not env.
 *
 * THE TWO ARMS (LAW 4 ACCURACY + ENFORCEMENT): every swept file is SEALED
 * (zero env access of ANY form + zero /mnt/data in code) except the roster,
 * which pins EXACTLY the owed exceptions, each by exact snippet + count (no
 * silent cures, no silent additions; the roster shrinks only by deliberate
 * edit). The rostered exceptions:
 *
 * 1. melite-kimodo-nodes/nodes_anny.py — the two transparent
 *    subprocess-inheritance bases (`dict(os.environ)` /
 *    `{**os.environ, ...}`): the child keeps the parent's environment; extras
 *    layered on top. That base reads no seat and configures nothing — every
 *    location/behavior seat in the pack is a node input. Honoring the parent
 *    (PYTHONPATH prepend, PYOPENGL_PLATFORM setdefault) requires reading it,
 *    and Python offers no seat-free read, so the base stays rostered.
 *
 * THE RETIRED SEAT (2026-11-01 deletion, operator ruling "Any prompt
 * optimizer in comfyui is superseeded by giving the agent a skill associated
 * with the work pattern" — cruft, deleted outright, no compat shim, no
 * deprecation window): ComfyUI-MiniMaxH3-Context-Loop/prompt_optimizer.py
 * left the pack whole — the server-side direct-API transport (its
 * H3_PROMPT_OPTIMIZER_ALLOWED_ORIGINS env seat was this roster's second
 * entry, the SSRF allow-list flagged for an operator-owned config plane),
 * the /prompt-optimize and project-assets/describe routes, the client
 * optimizer core/settings modules, the editor's Optimize lane, and the
 * Carousel's Generate-description lane. The ruling supersedes the queued
 * config-plane cure: the work pattern belongs to the agent's skill, not to
 * an in-engine optimizer, so there is nothing left to configure. The roster
 * returns to the anny subprocess pair only; the file is gone, so the seat
 * cannot return without reding the sealed arm.
 *
 * WHY NOT env(1) EVERYWHERE: blender_render.py's two overrides are
 * fully owned (BLENDER_USER_CONFIG + HOME = the run tmpdir), so it
 * execs through /usr/bin/env with a transparently inherited parent
 * and zero os.environ access.
 *
 * GRAMMAR NOTE (accuracy): `getattr(os, X)` is an env seat only when X names
 * an env API — "environ", "getenv", "putenv". Constant/function lookups
 * (getattr(os, "O_NOFOLLOW"), getattr(os, "startfile")) read the os module,
 * not the process environment, and must not red. The probe grammar from the
 * 2026-11-01 toggles still fires: quoted `__import__("os")`, alias
 * `.environ`, and `["environ"]` subscripting are all pinned.
 *
 * Run: npx vitest run tests/walls/ts/suites/vendor-estate-locations.spec.ts
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE: string = dirname(fileURLToPath(import.meta.url));
const REPO: string = join(HERE, "..", "..", "..", "..");
const PACKS: string = join(REPO, "vendor", "comfyui_extensions");

/** The swept estate: six melite-* packs + seven upstream packs. */
const ESTATE: readonly string[] = [
  "ComfyUI-CameraReference3D",
  "ComfyUI-CrossViewWarp",
  "ComfyUI-MiniMax-H3-MotionCache-FastVAE",
  "ComfyUI-MiniMaxH3-Context-Loop",
  "ComfyUI-MiniMaxH3Mod",
  "Comfyui_Minimax_h3_latent_Upscaler-Plus",
  "comfyui-minimax-h3-timeline-director",
  "melite-audio-nodes",
  "melite-autorig-nodes",
  "melite-kimodo-nodes",
  "melite-model-base",
  "melite-poser-nodes",
  "melite-utility-nodes",
];

/** Shipped code only: dev scripts, test suites, bytecode caches, the
 *  pack-local _vendor shims, and vendored third-party trees (the
 *  moss_sfx_impl upstream embed inside melite-audio-nodes) are not
 *  node seats. */
const EXCLUDED: readonly string[] = [
  "__pycache__",
  "_vendor",
  "tests",
  "tools",
  "moss_sfx_impl",
];

/** The ONLY env access left in the estate, pinned exact — see the header
 *  law for why each entry stays. Snippets, not line numbers, so plain edits
 *  above/below don't trip the wall; the count arm forbids silent cures AND
 *  silent additions. */
const ROSTER: Readonly<Record<string, readonly string[]>> = {
  "melite-kimodo-nodes/nodes_anny.py": [
    "env = dict(os.environ)",
    "env={**os.environ,",
  ],
};

/** ANY process-env access in code, PLAIN OR QUOTED/DYNAMIC: reads, writes,
 *  defaults, direct subscripting, `__import__("os")`, `getattr(os,
 *  "environ"/"getenv"/"putenv")` / `getattr(alias, "environ")`, and
 *  `["environ"]` subscripting on a module alias, plus `.environ` attribute
 *  access on ANY alias (`import os as _o` buys nothing — the attribute name
 *  is the seat). A quoted dodge is still a seat (the 2026-11-01 probe
 *  lesson: `__import__("os").environ` slipped the `os\.environ` literal;
 *  the `_o1.environ` alias-attribute form slipped it next).
 *  A seat read with an EMPTY default is NOT conformant here (that grammar
 *  belonged to the retired escape-hatch era) — the only lawful
 *  env-adjacent shapes left are the rostered exceptions, pinned
 *  exactly. */
const STRICT_ENV: RegExp =
  /os\.environ|os\.getenv|putenv|environ\[|\.environ\b|__import__\s*\(\s*["']os["']|getattr\s*\(\s*os\b\s*,\s*["'](environ|getenv|putenv)["']|getattr\s*\([^,)]*,\s*["']environ["']|["']environ["']\s*\]/;
const MNT: RegExp = /\/mnt\/data/;

/** Strip full-line comments and triple-quoted string blocks (module
 *  docstrings, prose). Trailing `#` comments are cut only when the
 *  marker sits outside any quote — a tiny scanner, no dependencies
 *  (this wall rides Windows CI where python3 may not exist). Returns
 *  the surviving code lines with their 1-based numbers. */
function codeLines(src: string): Array<{ n: number; text: string }> {
  const out: Array<{ n: number; text: string }> = [];
  let triple: string | null = null;
  const raw: string[] = src.split("\n");
  for (let i = 0; i < raw.length; i++) {
    let line: string = raw[i];
    if (triple !== null) {
      const end: number = line.indexOf(triple);
      if (end < 0) continue;
      line = line.slice(end + triple.length);
      triple = null;
      if (line.trim() === "") continue;
    }
    // cut triple-quoted blocks starting (and maybe ending) here
    for (;;) {
      const d: number = line.indexOf('"""');
      const s: number = line.indexOf("'''");
      let q: string | null = null;
      let at = -1;
      if (d >= 0 && (s < 0 || d < s)) { q = '"""'; at = d; }
      else if (s >= 0) { q = "'''"; at = s; }
      if (q === null) break;
      const close: number = line.indexOf(q, at + 3);
      if (close >= 0) {
        line = line.slice(0, at) + " " + line.slice(close + 3);
      } else {
        line = line.slice(0, at);
        triple = q;
        break;
      }
    }
    // cut a trailing # comment outside quotes
    let cut = -1;
    let quote: string | null = null;
    for (let c = 0; c < line.length; c++) {
      const ch: string = line[c];
      if (quote !== null) {
        if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === "#") {
        cut = c;
        break;
      }
    }
    if (cut >= 0) line = line.slice(0, cut);
    if (line.trim() === "") continue;
    out.push({ n: i + 1, text: line });
  }
  return out;
}

/** Every SHIPPED *.py under the estate packs, minus excluded trees. */
function sweptFiles(): string[] {
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir).sort()) {
      if (EXCLUDED.includes(name)) continue;
      const full: string = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".py")) found.push(full);
    }
  };
  for (const pack of ESTATE) walk(join(PACKS, pack));
  return found;
}

function hitsOf(file: string): string[] {
  const src: string = readFileSync(file, "utf8");
  const hits: string[] = [];
  for (const { n, text } of codeLines(src)) {
    if (STRICT_ENV.test(text) || MNT.test(text)) {
      hits.push(`${n}: ${text.trim()}`);
    }
  }
  return hits;
}

describe("vendor-estate locations (re-cure)", () => {
  it("the sweep is derived and non-empty — it must include the sealed and rostered files", () => {
    const swept: string[] = sweptFiles();
    expect(swept.length, "vendored estate python surface").toBeGreaterThan(0);
    const rel: string[] = swept.map((f) => f.slice(PACKS.length + 1));
    for (const r of Object.keys(ROSTER)) expect(rel, `sweep covers rostered ${r}`).toContain(r);
    for (const pack of ESTATE) {
      expect(rel.some((f) => f.startsWith(pack + "/")), `sweep covers estate pack ${pack}`).toBe(true);
    }
  });

  it("sealed estate files carry zero env access and zero store literals in code", () => {
    const bad: Record<string, string[]> = {};
    for (const f of sweptFiles()) {
      const rel: string = f.slice(PACKS.length + 1);
      if ((Object.keys(ROSTER) as string[]).includes(rel)) continue;
      const hits: string[] = hitsOf(f);
      if (hits.length > 0) bad[rel] = hits;
    }
    expect(bad, "sealed estate files must hold no env access and no /mnt/data in code").toEqual({});
  });

  it("the kimodo picker rides the folder seam, not a literal root", () => {
    const src: string = readFileSync(join(PACKS, "melite-utility-nodes", "nodes.py"), "utf8");
    expect(src, "KimodoModelDir registers the avatar folder key").toContain('folder_category="avatar"');
    const code: string = codeLines(src).map((l) => l.text).join("\n");
    expect(code, "no picker registration passes a literal default root").not.toContain('default_root="/');
  });

  it("the owed roster is exact — no new env access, no silent cures", () => {
    const swept: string[] = sweptFiles();
    const seen: Record<string, string[]> = {};
    for (const f of swept) {
      const rel: string = f.slice(PACKS.length + 1);
      if (!(Object.keys(ROSTER) as string[]).includes(rel)) continue;
      seen[rel] = hitsOf(f).map((h) => h.replace(/^\d+: /, ""));
    }
    expect(Object.keys(seen).sort(), "rostered files").toEqual(Object.keys(ROSTER).sort());
    for (const [file, snippets] of Object.entries(ROSTER)) {
      for (const snippet of snippets) {
        expect(seen[file] ?? [], `${file} still carries its rostered hit`).toContainEqual(
          expect.stringContaining(snippet.slice(0, 60)),
        );
      }
      expect(seen[file]?.length ?? 0, `${file} carries no NEW hits`).toBe(snippets.length);
    }
  });
});

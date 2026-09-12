// provision — the ONE provisioning orchestrator (TS port of tools/provision.py,
// deleted at the NO-ESTATE-PYTHON cut, 2026-09-08).
//
// Operator orders: PROVISIONING LAW (2026-09-03) + NO-ESTATE-PYTHON
// (2026-09-08) + NO-EXTERNAL-PYTHON (2026-09-10): the ONE vendor is
// ComfyUI-Manager, BUILT INTO the managed ComfyUI as a custom node
// (vendored at the pinned ref by `provision sync` — the auto-build)
// and served on ComfyUI's own port. Estate legs (git installs, model
// downloads, core/manager checkouts) are plain TS. No estate Python
// is written, imported, or executed by this tool; no external
// manager binary, MCP server, or comfy-cli is spawned.
//
// Instance provisioning — one interface, two modes:
//   byo (default)  the user's own ComfyUI, anywhere. VERIFIED, never installed.
//   managed        a lockfile-pinned ComfyUI under data/runtime/comfyui/
//                  with the built-in manager vendored into custom_nodes/.
// Declaration provisioning:
//   extensions     git clones (registry ids resolve through the
//                  vendored manager's own custom-node-list.json cache;
//                  url+ref clones directly); vendor packs symlinked
//                  from vendor/comfyui_extensions.
//   models         estate TS streaming downloads per declaration
//                  provision row (the engine's provisionsByFamily —
//                  DECL + card-owned rows), sha256-verified after.
//   all            extensions + models.
//
// Config is read TS-natively: inference.config.json at the repo root
// is the SSOT (model roots, engine url/port/dirs); the endpoint file
// (packages/engines/comfyui-cordis/data/comfyui_endpoint.json) overrides
// model_base_path / model_download_path only when SET. Present-but-
// empty endpoint keys die LOUD (QUEUE LANE LAW).
//
// Commands (nouns kept stable — the manage door's restart-refusal
// text names `provision boot-cmd`):
//   verify | paths | sync | boot-cmd [config]
//   extensions | models | all [--dry-run]
//   dsh | manage <action> [key=value ...] | commercial [--no-warmup]
//
// Usage:
//   node --experimental-strip-types packages/engines/comfyui-cordis/scripts/provision.ts <command>
//   ./setup.sh <command>   (the thin POSIX wrapper — same call)
// Erasable-syntax TS only: no enums, no namespaces.

import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync,
  realpathSync, readdirSync, renameSync, rmSync, statSync, symlinkSync,
  unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCardDefs, provisionsByFamily } from "../src/cardDefs.ts";

const HERE: string = dirname(fileURLToPath(import.meta.url));
const REPO: string = resolve(HERE, "..", "..", "..", "..");
// The engine package's own data/ (comfyui-cordis since the models-
// plane reversal, 91532243 — the old engines/comfyui anchor was a
// stale name that left every config-less CLI call fatal).
const DEFAULT_CONFIG: string = join(REPO, "packages", "engines",
  "comfyui-cordis", "data", "comfyui_endpoint.json");
const ROOT_CONFIG: string = join(REPO, "inference.config.json");
const RUNTIME: string = join(REPO, "data", "runtime", "comfyui");
const COMFY_PROJECT: string = join(REPO, "infra", "comfyui");

let DRY = false;
const FAILS: string[] = [];

// ── output helpers ──────────────────────────────────────────────

function info(msg: string): void {
  console.log("[provision] " + msg);
}

function warn(msg: string): void {
  console.log("[provision] WARN: " + msg);
}

function fail(msg: string): never {
  console.error("[provision] FATAL: " + msg);
  process.exit(1);
}

function die(msg: string): never {
  console.log("REFUSED: " + msg);
  process.exit(2);
}

function check(name: string, ok: boolean, note = ""): boolean {
  console.log("  " + (ok ? "ok  " : "FAIL") + " " + name +
    (note && !ok ? " — " + note : ""));
  if (!ok) FAILS.push(name);
  return ok;
}

// ── config (the root file is the SSOT; the endpoint overrides) ──

interface EndpointConfig {
  provision?: string;
  url?: string;
  port?: number;
  boot_cmd?: string;
  model_base_path?: string;
  model_download_path?: string;
  input_dir?: string;
  input_dir_container?: string;
  output_dir?: string;
  extra_model_folders?: Record<string, string>;
  [k: string]: unknown;
}

interface RootConfig {
  models?: { read_root?: string; download_root?: string };
  engines?: { comfyui?: Record<string, unknown> };
}

function loadRoot(): RootConfig {
  if (!existsSync(ROOT_CONFIG)) {
    die("no root config at inference.config.json — model storage is " +
      "configured from the project root (never guessed)");
  }
  return JSON.parse(readFileSync(ROOT_CONFIG, "utf8")) as RootConfig;
}

function loadConfig(path: string): EndpointConfig {
  const cfg = JSON.parse(readFileSync(path, "utf8")) as EndpointConfig;
  if (cfg.provision === undefined) cfg.provision = "byo";
  return cfg;
}

function rootStr(v: unknown): string {
  return String(v ?? "").trim();
}

function engineField(root: RootConfig, key: string,
    override: unknown): string {
  const ov = rootStr(override);
  if (ov) return ov;
  const eng = root.engines?.comfyui ?? {};
  return rootStr(eng[key]);
}

// the fixed folder set every ComfyUI install scans on a bound base
// (stock folder keys; order is the yaml's presentation order)
const FIXED_FOLDERS: readonly string[] = [
  "checkpoints", "clip", "clip_vision", "controlnet",
  "diffusion_models", "loras", "unet", "vae", "upscale_models",
  "background_removal",
];

interface BoundLayout {
  base_path: string;
  download_path: string;
  folders: Record<string, string>;
}

function boundModelFolders(cfg: EndpointConfig): BoundLayout {
  // THE ONE derivation: ROOT config + endpoint overrides
  // -> {folder: mount subdir}. Refuses an unconfigured root LOUD.
  for (const k of ["model_base_path", "model_download_path"] as const) {
    const raw = cfg[k];
    if (raw !== undefined && raw !== null && !String(raw).trim()) {
      die(k + " is EMPTY in the endpoint config — unset the key to " +
        "inherit the root config (inference.config.json), or name it " +
        "explicitly (never guessed)");
    }
  }
  const root = loadRoot();
  const base = rootStr(cfg.model_base_path) ||
    join(rootStr(root.models?.read_root), rootStr(root.engines?.comfyui?.base));
  const download = rootStr(cfg.model_download_path) ||
    rootStr(cfg.model_base_path) ||
    join(rootStr(root.models?.download_root),
      rootStr(root.engines?.comfyui?.base));
  if (!rootStr(root.models?.read_root)) {
    die("models.read_root is unset in inference.config.json — " +
      "configure model storage from the project root (never guessed)");
  }
  const folders: Record<string, string> = {};
  for (const f of FIXED_FOLDERS) folders[f] = f;
  // pack-declared categories — the endpoint config owns the mapping;
  // the orchestrator stays generic (no pack names in the core)
  for (const cat of Object.keys(cfg.extra_model_folders ?? {}).sort()) {
    const sub = String(cfg.extra_model_folders?.[cat] ?? "")
      .trim().replace(/^\/+|\/+$/g, "");
    if (cat.trim() && sub) folders[cat.trim()] = sub;
  }
  return { base_path: base, download_path: download, folders };
}

function engineUrl(cfg: EndpointConfig): string {
  const root = loadRoot();
  return engineField(root, "url", cfg.url);
}

function enginePort(cfg: EndpointConfig): number {
  const root = loadRoot();
  const raw = engineField(root, "port", cfg.port);
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) {
    die("engines.comfyui.port is not a number in inference.config.json " +
      "(endpoint override: " + JSON.stringify(cfg.port ?? null) + ")");
  }
  return n;
}


// ── strict nodes.yaml reader (the extension_lane manifest, TS-native) ──
//
// Supported subset (exactly what the estate's declarations use —
// surveyed 2026-09-08): `#` comments, `extensions:` (`[]`, null, or
// a `- name:` list), scalar keys (bare or single/double-quoted,
// single-line or `>-` folded), `pip:` nested string lists, booleans.
// Anything else is a LOUD refusal naming the file (the CLOSED-shape
// rule extension_lane's NodesDoc enforced — a manifest that cannot
// be parsed honestly must not half-install).

interface ExtRow {
  name: string;
  registry: string;
  version: string;
  url: string;
  ref: string;
  required: boolean;
  desc: string;
  pip: string[];
  _source?: string;
}

const EXT_KEYS: ReadonlySet<string> = new Set(
  ["name", "registry", "version", "url", "ref", "required", "desc", "pip"]);

function stripComment(line: string): string {
  // A `#` opens a comment only outside single/double quotes.
  let q: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q !== null) {
      if (c === q && line[i + 1] === q) { i++; continue; }
      if (c === q) q = null;
    } else if (c === "'" || c === '"') {
      q = c;
    } else if (c === "#") {
      return line.slice(0, i);
    }
  }
  return line;
}

function unquote(s: string, path: string, ln: number): string {
  const t = s.trim();
  if (t.length >= 2 && t.startsWith("'") && t.endsWith("'")) {
    return t.slice(1, -1).replace(/''/g, "'");
  }
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) {
    // YAML `\`+break inside double quotes is a line continuation
    // (folds to nothing); JSON knows no such escape — strip it first.
    return JSON.parse(t.replace(/\\\s+/g, "")) as string;
  }
  if (/[&*!|{[\]"']/.test(t.slice(0, 1)) && t !== "[]") {
    die(path + ":" + ln + ": unsupported YAML shape " +
      JSON.stringify(t) + " (the reader covers the declaration " +
      "subset only — restate or extend it deliberately)");
  }
  return t;
}

function loadExtensionsYaml(path: string): ExtRow[] {
  const raw = readFileSync(path, "utf8").split("\n");
  interface L { n: number; t: string }
  const lines: L[] = [];
  for (let i = 0; i < raw.length; i++) {
    const t = stripComment(raw[i]).replace(/\s+$/, "");
    if (!t.trim()) continue;
    lines.push({ n: i + 1, t });
  }
  const top = lines.find((l) => /^extensions:/.test(l.t));
  if (!top) {
    die(path + ": no top-level `extensions:` key (a typo'd key " +
      "merges NOTHING — refused, never silently empty)");
  }
  const rest = top.t.slice("extensions:".length).trim();
  // Declaration files use two indent styles (style A: `- name:` at
  // col 0 with keys at col 2; style B: `- name:` at col 2 with keys
  // at col 4). Both are accepted; mixing inside one ROW refuses.
  const rows: ExtRow[] = [];
  let cur: ExtRow | null = null;
  let rowInd = -1;
  let inPip = false;
  const push = (): void => {
    if (cur !== null) {
      if (!cur.name) die(path + ": extension with no name");
      rows.push(cur);
    }
    cur = null;
    rowInd = -1;
    inPip = false;
  };
  const bad = (l: L, why: string): never =>
    die(path + ":" + l.n + ": " + why + " " + JSON.stringify(l.t) +
      " (the reader covers the declaration subset only — restate " +
      "or extend it deliberately)");
  if (rest !== "") {
    if (rest !== "[]" && rest !== "null") bad(top, "unsupported shape");
    for (const l of lines) {
      if (l !== top && /^\S/.test(l.t)) bad(l, "keys beside `extensions:`");
    }
    return [];
  }
  // expand `>-`/`>` folded blocks (key line + deeper continuations)
  const flat: L[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    // implicit continuation: a deeper-indented non-list line
    // continues the previous `key: value` scalar (plain YAML).
    const ind = l.t.length - l.t.trimStart().length;
    const prev = flat.length > 0 ? flat[flat.length - 1] : null;
    if (prev !== null && ind > 0 &&
        ind > (prev.t.length - prev.t.trimStart().length) &&
        !l.t.trim().startsWith("-") &&
        /^ *\w+:\s*\S/.test(prev.t)) {
      prev.t += " " + l.t.trim();
      continue;
    }
    const m = /^( *)(\w+):\s*(>\-?|>)\s*$/.exec(l.t);
    if (m) {
      const base = m[1].length;
      const parts: string[] = [];
      while (i + 1 < lines.length) {
        const nx = lines[i + 1];
        const ind = nx.t.length - nx.t.trimStart().length;
        if (ind <= base) break;
        parts.push(nx.t.trim());
        i++;
      }
      flat.push({ n: l.n, t: m[1] + m[2] + ": " + parts.join(" ") });
      continue;
    }
    // single-quoted scalar continued on following lines
    let t = l.t;
    if ((t.match(/'/g) ?? []).length % 2 === 1) {
      let j = i;
      while (j + 1 < lines.length &&
          (t.match(/'/g) ?? []).length % 2 === 1) {
        j++;
        t += " " + lines[j].t.trim();
      }
      i = j;
      flat.push({ n: l.n, t });
      continue;
    }
    flat.push(l);
  }
  for (const l of flat) {
    if (l === top) continue;
    const ind = l.t.length - l.t.trimStart().length;
    const body = l.t.trim();
    const dash = /^- name:\s*(.*)$/.exec(body);
    if (dash && (ind === 0 || ind === 2)) {
      push();
      cur = { name: unquote(dash[1], path, l.n), registry: "",
        version: "", url: "", ref: "", required: true, desc: "", pip: [] };
      rowInd = ind;
      continue;
    }
    if (cur === null) bad(l, "content outside a `- name:` row");
    if (ind === 0) bad(l, "keys beside `extensions:` are refused");
    const pipItem = /^-(.*)$/.exec(body);
    // Style A nests pip items at row+2, style B at row+4 — both are
    // unambiguous (keys never start with `-`) once inside `pip:`.
    if (pipItem && (ind === rowInd + 2 || ind === rowInd + 4)) {
      if (!inPip) bad(l, "pip item outside a `pip:` list");
      (cur as ExtRow).pip.push(unquote(pipItem[1], path, l.n));
      continue;
    }
    const kv = /^(\w+):\s*(.*)$/.exec(body);
    if (kv && ind === rowInd + 2) {
      const c = cur as ExtRow;
      if (!EXT_KEYS.has(kv[1])) bad(l, "unknown key " + JSON.stringify(kv[1]));
      if (kv[1] === "pip") {
        if (kv[2].trim() !== "") bad(l, "inline `pip:` refused");
        inPip = true;
        continue;
      }
      inPip = false;
      const v = unquote(kv[2], path, l.n);
      if (kv[1] === "required") {
        if (v !== "true" && v !== "false") bad(l, "`required:` wants true/false");
        c.required = v === "true";
      } else {
        (c as unknown as Record<string, unknown>)[kv[1]] = v;
      }
      continue;
    }
    bad(l, "unsupported line");
  }
  push();
  return rows;
}

function pluginIdFor(rel: string): string {
  // owner id = the plugin path between packages/ and the first
  // models|nodes segment (extension_lane.find_nodes_yaml).
  const parts = rel.split("/");
  const at = parts.indexOf("packages");
  const tail = parts.slice(at + 1);
  const cut = tail.findIndex((p) => p === "models" || p === "nodes");
  if (at < 0 || cut < 0) {
    warn("Cannot determine plugin id from " + rel + ", skipping");
    return "";
  }
  return tail.slice(0, cut).join("/") || tail[0];
}

function findNodesYaml(repo: string): Array<[string, string]> {
  // extension_lane's four glob patterns, same semantics.
  const out: Array<[string, string]> = [];
  const walk = (dir: string): void => {
    let ents: Array<{ n: string; d: boolean }>;
    try {
      ents = readdirSync(dir, { withFileTypes: true })
        .map((e) => ({ n: e.name, d: e.isDirectory() }))
        .sort((a, b) => (a.n < b.n ? -1 : 1));
    } catch { return; }
    for (const e of ents) {
      if (e.n === "node_modules" || e.n === ".git" || e.n === ".venv") continue;
      const p = join(dir, e.n);
      if (e.d) { walk(p); continue; }
      if (e.n !== "extensions.yaml" && e.n !== "nodes.yaml") continue;
      const rel = p.slice(repo.length + 1);
      const seg = rel.split("/");
      const tail = seg.slice(seg.indexOf("packages") + 1);
      const isExt = tail.length >= 2 && tail[tail.length - 2] === "nodes" &&
        (tail[tail.length - 3] === "nodes" || e.n === "extensions.yaml");
      const isModel = tail.includes("models");
      if (!isExt && !isModel) continue;
      const id = pluginIdFor(rel);
      if (id) out.push([p, id]);
    }
  };
  walk(join(repo, "packages"));
  out.sort((a, b) => (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
  return out;
}

function mergeManifest(repo: string): ExtRow[] {
  // One extension per name; an IDENTICAL restatement merges
  // silently, a DIVERGENT pin refuses loud (extension_lane._merge_from).
  const merged: ExtRow[] = [];
  const seen = new Map<string, { pin: string; src: string }>();
  for (const [path, pluginId] of findNodesYaml(repo)) {
    const rel = path.slice(repo.length + 1);
    for (const ext of loadExtensionsYaml(path)) {
      const pin = JSON.stringify([ext.registry, ext.version, ext.url,
        ext.ref, ext.pip]);
      const prior = seen.get(ext.name);
      const src = pluginId + ":" + rel;
      if (prior) {
        if (prior.pin !== pin) {
          die("Divergent pins for extension '" + ext.name + "':\n" +
            "  " + prior.src + ": " + prior.pin + "\n" +
            "  " + src + ": " + pin);
        }
        continue;
      }
      seen.set(ext.name, { pin, src });
      ext._source = src;
      merged.push(ext);
    }
  }
  return merged;
}

// ── instance commands ───────────────────────────────────────────

function probe(url: string, path: string,
    timeoutMs = 5000): { status: number; text: string } {
  const u = new URL(url.replace(/\/$/, "") + path);
  // Synchronous probe via a one-shot child fetch (no estate code —
  // flag + URL only; node has no sync HTTP client).
  const r = spawnSync(process.execPath, ["-e",
    "fetch(process.argv[1]).then(async r=>{const t=await r.text();" +
    "process.stdout.write(r.status+'\\n'+t)})" +
    ".catch(e=>{console.error(String(e).slice(0,200));process.exit(1)})",
    u.toString()],
    { encoding: "utf8", timeout: timeoutMs + 2000, maxBuffer: 64 << 20 });
  if (r.status !== 0) {
    throw new Error((r.stderr || "fetch failed").trim().slice(0, 120));
  }
  const nl = (r.stdout ?? "").indexOf("\n");
  return { status: parseInt((r.stdout ?? "").slice(0, nl), 10),
    text: (r.stdout ?? "").slice(nl + 1) };
}

function cmdPaths(cfg: EndpointConfig): void {
  const bound = boundModelFolders(cfg);
  const base = bound.base_path;
  const folders = bound.folders;
  mkdirSync(join(RUNTIME, "custom_nodes"), { recursive: true });
  mkdirSync(join(RUNTIME, "user"), { recursive: true });
  const lines = [
    "# generated by provision paths — DO NOT hand-edit",
    "# (source of truth: inference.config.json at the repo root — " +
    "endpoint storage keys override when set)",
    "melite_weights:",
    "  base_path: " + base,
  ];
  for (const f of FIXED_FOLDERS) lines.push("  " + f + ": " + folders[f]);
  const extras = Object.keys(folders).filter((f) => !FIXED_FOLDERS.includes(f));
  if (extras.length > 0) {
    lines.push("  # pack-declared categories (extra_model_folders)");
    for (const f of extras) lines.push("  " + f + ": " + folders[f]);
  }
  writeFileSync(join(RUNTIME, "extra_model_paths.yaml"),
    lines.join("\n") + "\n");
  console.log("runtime layout + extra_model_paths.yaml → " + RUNTIME);
  layDownloadPointers(bound.download_path, folders);
  syncEndpointFromRoot(cfg);
}

function layDownloadPointers(downloadBase: string,
    folders: Record<string, string>): void {
  // Every category dir inside the runtime is a symlink onto the
  // CONFIGURED destination, so every writer (comfy-cli, pack
  // auto-download, core) lands exactly where the endpoint config
  // says. Self-healing: real content moves first, then the pointer
  // is laid.
  const modelsDir = join(RUNTIME, "models");
  mkdirSync(modelsDir, { recursive: true });
  for (const cat of Object.keys(folders).sort()) {
    const local = join(modelsDir, cat);
    const target = join(downloadBase, folders[cat]);
    try {
      if (realpathSync(local) === target) continue;
    } catch { /* not a correct pointer */ }
    try {
      const st = statSync(local, { throwIfNoEntry: false });
      if (st?.isSymbolicLink?.() ?? false) unlinkSync(local);
      else if (st?.isDirectory()) {
        mkdirSync(target, { recursive: true });
        for (const f of readdirSync(local)) {
          const dest = join(target, f);
          if (!existsSync(dest)) renameSync(join(local, f), dest);
        }
        rmSync(local, { recursive: true });
      }
    } catch { /* absent — lay below */ }
    mkdirSync(target, { recursive: true });
    if (!existsSync(local)) symlinkSync(target, local);
  }
  console.log("download pointers: " + Object.keys(folders).length +
    " categories → " + downloadBase + " (configured model_download_path)");
}

const ENDPOINT_DERIVED: readonly string[] = ["url", "model_base_path",
  "model_download_path", "input_dir", "input_dir_container", "output_dir",
  "boot_cmd"];

function syncEndpointFromRoot(cfg: EndpointConfig): void {
  // The endpoint's url, model_*, stream and boot_cmd keys are derived
  // from the root config (the endpoint file is a generated surface
  // for these fields). An explicit endpoint value still wins when
  // SET; unset inherits the root. boot_cmd's --port is rewritten
  // from the resolved port (the port-drift gap).
  const root = loadRoot();
  const url = engineField(root, "url", cfg.url);
  const port = enginePort(cfg);
  const bootRaw = engineField(root, "boot_cmd", cfg.boot_cmd);
  const boot = bootRaw.replace(/--port \d+/, "--port " + port);
  const paths = boundModelFolders(cfg);
  const derived: Record<string, string> = {
    model_base_path: paths.base_path,
    model_download_path: paths.download_path,
    url,
    input_dir: engineField(root, "input_dir", cfg.input_dir),
    input_dir_container: engineField(root, "input_dir_container",
      cfg.input_dir_container),
    output_dir: engineField(root, "output_dir", cfg.output_dir),
    boot_cmd: boot,
  };
  const changed: string[] = [];
  for (const [k, v] of Object.entries(derived)) {
    if (String((cfg as Record<string, unknown>)[k] ?? "").trim() !==
        v.trim()) {
      changed.push(k);
      (cfg as Record<string, unknown>)[k] = v;
    }
  }
  if (changed.length === 0) return;
  const onDisk = JSON.parse(readFileSync(DEFAULT_CONFIG, "utf8")) as
    Record<string, unknown>;
  for (const k of ENDPOINT_DERIVED) {
    if (k in derived) onDisk[k] = derived[k];
  }
  writeFileSync(DEFAULT_CONFIG, JSON.stringify(onDisk, null, 2) + "\n");
  console.log("endpoint derived from root: " + changed.join(", "));
}

function cmdSync(cfg: EndpointConfig): void {
  if (cfg.provision !== "managed") {
    die("provision=" + JSON.stringify(cfg.provision) + " — BYO " +
      "deployments never install a ComfyUI (the estate sits on top; " +
      "verify instead)");
  }
  const lock = join(COMFY_PROJECT, "uv.lock");
  if (!existsSync(lock)) {
    die("no uv.lock in infra/comfyui — run `uv lock` there first " +
      "(the lock is the pinned truth, tracked in git)");
  }
  const pinF = join(COMFY_PROJECT, "core.pin");
  if (!existsSync(pinF)) {
    die("no core.pin in infra/comfyui — the core source ref is " +
      "deployment truth, never a floating clone");
  }
  const pin = readFileSync(pinF, "utf8").split("\n")
    .map((l) => l.trim()).find((l) => l && !l.startsWith("#")) ?? "";
  cmdPaths(cfg);
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined) env[k] = v;
  }
  env.UV_PROJECT_ENVIRONMENT = join(RUNTIME, ".venv");
  const s = spawnSync("uv",
    ["sync", "--frozen", "--project", COMFY_PROJECT],
    { cwd: REPO, env, stdio: "inherit" });
  if (s.status !== 0) process.exit(s.status ?? 1);
  const coreUrl = "https://github.com/comfyanonymous/ComfyUI.git";
  if (existsSync(join(RUNTIME, "main.py"))) {
    const have = spawnSync("git", ["-C", RUNTIME, "rev-parse", "HEAD"],
      { encoding: "utf8" });
    if ((have.stdout ?? "").trim() === pin) {
      info("core already at pin " + pin.slice(0, 12));
      vendorManager();
      return;
    }
  }
  info("fetching core at pin " + pin.slice(0, 12) + " …");
  mkdirSync(RUNTIME, { recursive: true });
  const git = (args: string[]): void => {
    const r = spawnSync("git", args, { cwd: RUNTIME, stdio: "inherit" });
    if (r.status !== 0) fail("core checkout of pin " + pin + " failed");
  };
  if (!existsSync(join(RUNTIME, ".git"))) {
    git(["init", "--quiet"]);
    git(["remote", "add", "origin", coreUrl]);
  }
  git(["fetch", "--quiet", "--depth", "1", "origin", pin]);
  git(["checkout", "--quiet", "FETCH_HEAD"]);
  info("core checked out at " + pin.slice(0, 12) + " (workspace root: " +
    RUNTIME + ")");
  vendorManager();
}

// ── the built-in manager (auto-build; no external dependency) ──────

const MANAGER_PIN_F: string = join(COMFY_PROJECT, "manager.pin");

/** Pin text from infra/comfyui/manager.pin (comments stripped). */
function managerPin(): string {
  if (!existsSync(MANAGER_PIN_F)) {
    die("no manager.pin in infra/comfyui — the built-in ComfyUI-Manager " +
      "is vendored at a pinned ref (same law as core.pin)");
  }
  return readFileSync(MANAGER_PIN_F, "utf8").split("\n")
    .map((l) => l.trim()).find((l) => l && !l.startsWith("#")) ?? "";
}

/** THE AUTO-BUILD (the no-external-python stroke, 2026-09-10): the
 *  vendor ComfyUI-Manager rides ComfyUI's own port as a custom node
 *  — cloned at the pinned ref into custom_nodes/, its requirements
 *  installed into the serving venv, and its config pinned under
 *  user/__manager/ (security_level=normal-, both allow flags) so
 *  the loopback-listen engine admits installs. Users start the
 *  engine; the manager is already in it (the estate never spawns a
 *  separate manager process). */
function vendorManager(): void {
  const pin = managerPin();
  const mgrDir = join(RUNTIME, "custom_nodes", "comfyui-manager");
  const url = "https://github.com/Comfy-Org/ComfyUI-Manager.git";
  const gitm = (args: string[]): number => {
    const r = spawnSync("git", args, { cwd: RUNTIME, stdio: "inherit" });
    return r.status ?? 1;
  };
  if (existsSync(join(mgrDir, "__init__.py"))) {
    const have = spawnSync("git", ["-C", mgrDir, "rev-parse", "HEAD"],
      { encoding: "utf8" });
    if ((have.stdout ?? "").trim() === pin) {
      info("manager already vendored at pin " + pin.slice(0, 12));
    } else {
      info("moving manager to pin " + pin.slice(0, 12) + " …");
      gitm(["-C", mgrDir, "fetch", "--quiet", "--depth", "1", "origin", pin]);
      gitm(["-C", mgrDir, "checkout", "--quiet", "FETCH_HEAD"]);
    }
  } else {
    info("vendoring the built-in manager at pin " + pin.slice(0, 12) + " …");
    mkdirSync(join(RUNTIME, "custom_nodes"), { recursive: true });
    if (gitm(["clone", "--quiet", "--depth", "1", url, mgrDir]) !== 0) {
      gitm(["clone", "--quiet", url, mgrDir]);
    }
    gitm(["-C", mgrDir, "fetch", "--quiet", "--depth", "1", "origin", pin]);
    gitm(["-C", mgrDir, "checkout", "--quiet", "FETCH_HEAD"]);
  }
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined) env[k] = v;
  }
  env.UV_PROJECT_ENVIRONMENT = join(RUNTIME, ".venv");
  const r = spawnSync("uv",
    ["pip", "install", "--python", join(RUNTIME, ".venv", "bin", "python"),
      "-r", join(mgrDir, "requirements.txt")],
    { cwd: REPO, env, stdio: "inherit" });
  if (r.status !== 0) fail("manager requirements install failed");
  pinManagerConfig();
  info("built-in manager vendored (rides the engine port; config " +
    "pinned at user/__manager/config.ini)");
}

/** Write/verify the manager config pins. The vendor reads this file
 *  ONCE at ComfyUI startup — drift is warned, never silently
 *  rewritten (a running engine would not see the write). */
function pinManagerConfig(): void {
  const f = join(RUNTIME, "user", "__manager", "config.ini");
  const pins =
    "security_level = normal-\nallow_git_url_install = true\n" +
    "allow_pip_install = true\n";
  if (!existsSync(f)) {
    mkdirSync(dirname(f), { recursive: true });
    writeFileSync(f, "[default]\n" + pins +
      "channel_url = https://raw.githubusercontent.com/ltdrdata/ComfyUI-Manager/main\n");
    info("manager config pinned (" + f + ")");
    return;
  }
  const text = readFileSync(f, "utf8");
  for (const key of ["security_level = normal-",
    "allow_git_url_install = true", "allow_pip_install = true"]) {
    if (!text.includes(key)) {
      warn("manager config drift: '" + key +
        "' missing in " + f + " — fix deliberately (the running engine " +
        "read this file at startup)");
    }
  }
}

function cmdManifest(): void {
  // The extension_lane --format json equivalent: print the merged
  // manifest (declaration validation without touching the instance).
  const rows = mergeManifest(REPO);
  console.log(JSON.stringify(rows, null, 1));
}

function cmdBootCmd(cfg: EndpointConfig): void {
  if (cfg.provision === "managed") {
    const port = enginePort(cfg);
    console.log("# managed launch (cwd resolves custom_nodes; weights via " +
      "extra_model_paths; estate streams for input/output):");
    console.log("cd " + RUNTIME + " && " + join(RUNTIME, ".venv", "bin",
      "python") + " main.py \\\n" +
      "  --listen 127.0.0.1 --port " + port + " \\\n" +
      "  --extra-model-paths-config extra_model_paths.yaml \\\n" +
      "  --input-directory " + join(REPO, "data", "input") + " \\\n" +
      "  --output-directory " + join(REPO, "data", "temp") + " \\\n" +
      "  --user-directory user");
  } else {
    const boot = (cfg.boot_cmd ?? "").trim();
    if (!boot) {
      die("byo mode with no boot_cmd in the endpoint config — the " +
        "user's instance is theirs; we only point at it");
    }
    console.log("# byo launch (the user's own instance):");
    console.log(boot);
  }
}

async function cmdVerify(cfg: EndpointConfig): Promise<void> {
  console.log("config: comfyui_endpoint.json");
  check("provision mode declared",
    cfg.provision === "byo" || cfg.provision === "managed",
    JSON.stringify(cfg.provision));
  for (const k of ["model_base_path", "model_download_path"] as const) {
    const raw = cfg[k];
    check(k + " valid (unset → root config; never empty)",
      raw === undefined || raw === null || !!String(raw).trim(),
      JSON.stringify(raw));
  }
  try {
    const b = boundModelFolders(cfg);
    check("model roots resolve (root config + overrides)", true,
      "read=" + b.base_path + " download=" + b.download_path);
  } catch (e) {
    check("model roots resolve (root config + overrides)", false,
      String(e).slice(0, 120));
  }
  try {
    const url = engineUrl(cfg);
    check("url resolves (endpoint → root engines.comfyui.url)",
      !!url, JSON.stringify(url));
  } catch (e) {
    check("url resolves (endpoint → root engines.comfyui.url)", false,
      String(e).slice(0, 120));
  }
  if (cfg.provision === "managed") {
    check("managed lock present", existsSync(join(COMFY_PROJECT, "uv.lock")));
    const r = spawnSync("uv",
      ["lock", "--check", "--project", COMFY_PROJECT],
      { encoding: "utf8" });
    check("managed lock fresh (uv lock --check)", r.status === 0,
      ((r.stdout ?? "").trim().slice(0, 120)));
  }
  const url = (cfg.url ?? "").trim() || engineUrl(cfg);
  if (url) {
    try {
      const got = probe(url, "/system_stats");
      const body = JSON.parse(got.text) as {
        system?: { comfyui_version?: string } };
      const ver = body?.system?.comfyui_version ?? "?";
      check("instance live (/system_stats)", got.status === 200,
        got.text.slice(0, 80));
      console.log("       comfyui_version:", ver);
    } catch (e) {
      check("instance live (/system_stats)", false,
        String(e).slice(0, 120));
    }
    try {
      const got = probe(url, "/object_info", 20000);
      check("object_info served",
        got.status === 200 && got.text.length > 100,
        "status " + got.status);
    } catch (e) {
      check("object_info served", false, String(e).slice(0, 120));
    }
  }
  // project requirement: the ffmpeg binary on PATH (VHS_VideoCombine
  // + AudioConcat shell out to it; concat is extension-mediated).
  const ff = spawnSync("which", ["ffmpeg"], { encoding: "utf8" });
  const ffmpeg = (ff.stdout ?? "").trim();
  check("ffmpeg on PATH (project requirement for VHS / AudioConcat)",
    !!ffmpeg,
    ffmpeg || "install: apt install ffmpeg / brew install ffmpeg");
  // management plane: the BUILT-IN ComfyUI-Manager (vendored custom
  // node riding the engine port — no external Python anywhere).
  if (cfg.provision === "managed") {
    const mgrDir = join(RUNTIME, "custom_nodes", "comfyui-manager");
    const pin = managerPin();
    const have = existsSync(join(mgrDir, "__init__.py"))
      ? (spawnSync("git", ["-C", mgrDir, "rev-parse", "HEAD"],
          { encoding: "utf8" }).stdout ?? "").trim()
      : "";
    check("built-in manager vendored (custom_nodes/comfyui-manager)",
      have === pin,
      have === "" ? "run provision sync (the auto-build)" :
        "at " + have.slice(0, 12) + ", pin " + pin.slice(0, 12));
    check("manager config pinned (user/__manager/config.ini)",
      existsSync(join(RUNTIME, "user", "__manager", "config.ini")),
      "run provision sync");
    if (url) {
      try {
        const got = probe(url, "/manager/version");
        check("built-in manager live (/manager/version)",
          got.status === 200, got.text.slice(0, 60));
      } catch (e) {
        check("built-in manager live (/manager/version)", false,
          String(e).slice(0, 100));
      }
    }
  }
  console.log();
  if (FAILS.length > 0) {
    console.log("VERIFY REFUSED: " + FAILS.length + " failure(s): " +
      FAILS.join(", "));
    process.exit(1);
  }
  console.log("verify: healthy (compose-time requires gate enforces " +
    "extensions per the EXTENSION LAW — this probe does not duplicate it)");
}

// ── extensions via git (registry cache + url clones) + vendor symlinks ──

function linkInTree(name: string, workspace: string): string {
  const target = join(workspace, "custom_nodes", name);
  if (existsSync(join(target, "__init__.py"))) return "skipped";
  const src = join(REPO, "vendor", "comfyui_extensions", name);
  if (!existsSync(join(src, "__init__.py"))) {
    warn("  [" + name + "] vendor pack not checked out under " +
      "vendor/comfyui_extensions (git submodule update --init)");
    return "failed";
  }
  if (DRY) {
    console.log("[dry-run] link " + target + " <- " + src);
    return "installed";
  }
  mkdirSync(dirname(target), { recursive: true });
  try {
    symlinkSync(src, target);
    info("  [" + name + "] symlinked -> " + src);
    return "installed";
  } catch {
    cpSync(src, target, { recursive: true });
    warn("  [" + name + "] symlink unavailable — COPIED");
    return "installed";
  }
}

function sameWorld(workspace: string, duty: string): boolean {
  // Duties touching the workspace FILESYSTEM require it WRITABLE
  // from HERE — a container/remote workspace is provisioned from
  // INSIDE its world, never by guessing.
  const cn = join(workspace, "custom_nodes");
  try {
    mkdirSync(cn, { recursive: true });
    writeFileSync(join(cn, ".provision-write-test"), "x");
    unlinkSync(join(cn, ".provision-write-test"));
    return true;
  } catch {
    warn("  workspace " + workspace + " is not writable from here " +
      "(another world: container/remote) — " + duty + " is done from " +
      "inside that world (entrypoint) or by deployment binds; " +
      "refusing to guess");
    return false;
  }
}

function urlInstalled(url: string, workspace: string): boolean {
  // True if some custom_nodes clone's git remote IS this url (the
  // Manager renames install dirs; matching the remote is exact).
  const want = url.replace(/\/$/, "").toLowerCase()
    .replace(/\.git$/, "");
  let kids: string[] = [];
  try {
    kids = readdirSync(join(workspace, "custom_nodes")).sort();
  } catch { return false; }
  for (const k of kids) {
    const cfgF = join(workspace, "custom_nodes", k, ".git", "config");
    if (!existsSync(cfgF)) continue;
    const text = readFileSync(cfgF, "utf8");
    for (const m of text.matchAll(/url\s*=\s*(\S+)/g)) {
      if (m[1].replace(/\/$/, "").toLowerCase().replace(/\.git$/, "") ===
          want) return true;
    }
  }
  return false;
}

function runtimePython(workspace: string): string {
  const venv = process.env.VIRTUAL_ENV ?? "";
  if (venv && existsSync(join(venv, "bin", "python"))) {
    return join(venv, "bin", "python");
  }
  const cb = process.env.COMFY_BIN ?? "";
  if (cb) {
    const py = join(dirname(cb), "python");
    if (existsSync(py)) return py;
  }
  return join(workspace, "infra", "python", ".venv", "bin", "python");
}

function pipInstall(pkgs: string[], workspace: string): boolean {
  // Declared pins ride the SERVING runtime venv (nodes import them
  // at load); uv is the rail; satisfied pins are no-ops.
  const py = runtimePython(workspace);
  const r = spawnSync("uv",
    ["pip", "install", "--python", py, ...pkgs],
    { encoding: "utf8", timeout: 600000 });
  if (r.status === 0) return true;
  warn("  pip install failed (" + pkgs.join(" ") + "): " +
    ((r.stderr || r.stdout) ?? "").trim().slice(0, 200));
  return false;
}

/** The vendored manager's registry cache (custom-node-list.json,
 *  shipped inside the vendored custom node) — cnr id → reference
 *  git URL. This keeps registry declarations installable at
 *  provision time (engine down, manager not answering) with zero
 *  external Python: same map the manager itself consults. */
function registryUrl(reg: string): string {
  const f = join(RUNTIME, "custom_nodes", "comfyui-manager",
    "custom-node-list.json");
  if (!existsSync(f)) {
    return "";
  }
  try {
    const doc = JSON.parse(readFileSync(f, "utf8")) as {
      custom_nodes?: Array<{ id?: string; reference?: string }> };
    const w = reg.toLowerCase();
    const row = (doc.custom_nodes ?? []).find(
      (r) => String(r.id ?? "").toLowerCase() === w);
    return row?.reference ?? "";
  } catch {
    return "";
  }
}

/** Install one pack from git — the same mechanism the built-in
 *  manager uses for git installs, driven at provision time (engine
 *  down). Returns ok or the failure text. */
function gitCloneInstall(url: string, workspace: string,
    ref: string): { ok: boolean; error?: string } {
  const base = url.replace(/\/+$/, "").replace(/\.git$/, "")
    .split("/").pop() ?? "";
  if (!base) return { ok: false, error: "cannot derive a pack name from " + url };
  const dest = join(workspace, "custom_nodes", base);
  const git = (args: string[]): number =>
    spawnSync("git", args, { cwd: workspace, stdio: "pipe" }).status ?? 1;
  let r = git(["clone", "--quiet", "--depth", "1", url, dest]);
  if (r !== 0) r = git(["clone", "--quiet", url, dest]);
  if (r !== 0) return { ok: false, error: "git clone failed for " + url };
  if (ref) {
    git(["-C", dest, "fetch", "--quiet", "--depth", "1", "origin", ref]);
    if (git(["-C", dest, "checkout", "--quiet", "FETCH_HEAD"]) !== 0) {
      warn("  ref " + ref + " not fetchable — left on the default head");
    }
  }
  return { ok: true };
}

async function stepExtensions(): Promise<boolean> {
  const exts = mergeManifest(REPO);
  info(exts.length + " extensions declared");
  const cfg = loadConfig(DEFAULT_CONFIG);
  if (cfg.provision !== "managed") {
    die("provision=" + JSON.stringify(cfg.provision) + " — BYO " +
      "deployments own their custom_nodes; the estate never " +
      "installs into a user workspace");
  }
  const workspace = RUNTIME;
  const counts = { installed: 0, skipped: 0, failed: 0, blocked: 0 };
  let restart = false;
  {
    const vendorWorld = sameWorld(workspace, "vendor symlinking");
    for (const e of exts) {
      const name = (e.name ?? "").trim();
      const reg = (e.registry ?? "").trim();
      const url = (e.url ?? "").trim();
      if (!name) continue;
      if (e.pip.length > 0) {
        if (DRY) {
          console.log("[dry-run] pip install [" + name + "]: " +
            e.pip.join(", "));
        } else if (!pipInstall(e.pip, workspace)) {
          counts.failed += 1;
          continue;
        }
      }
      if (!reg && !url) {
        if (!vendorWorld) { counts.failed += 1; continue; }
        const st = linkInTree(name, workspace);
        counts[st as keyof typeof counts] += 1;
        continue;
      }
      if (url && !reg) {
        if (urlInstalled(url, workspace)) {
          counts.skipped += 1;
          info("  [" + name + "] already in custom_nodes — skipping");
          continue;
        }
        if (DRY) {
          console.log("[dry-run] install [" + name + "] from url " +
            JSON.stringify(url));
          counts.installed += 1;
          continue;
        }
        const rep = gitCloneInstall(url, workspace, e.ref);
        if (!rep.ok) {
          warn("  [" + name + "] failed: " +
            (rep.error ?? "").slice(0, 160));
          counts.failed += 1;
          continue;
        }
        counts.installed += 1;
        restart = true;
        continue;
      }
      // registry form: bare id (install_node refuses @pins; the
      // declared version stays the RECORDED expectation).
      if (existsSync(join(workspace, "custom_nodes", reg.toLowerCase()))) {
        counts.skipped += 1;
        info("  [" + name + "] already in custom_nodes — skipping");
        continue;
      }
      if (DRY) {
        console.log("[dry-run] install_node [" + name + "] registry id " +
          JSON.stringify(reg));
        counts.installed += 1;
        continue;
      }
      const gitUrl = registryUrl(reg);
      if (!gitUrl) {
        warn("  [" + name + "] registry id " + JSON.stringify(reg) +
          " not in the vendored registry cache — declare a url or " +
          "install at runtime (comfy_manage install_extension)");
        counts.failed += 1;
        continue;
      }
      const rep = gitCloneInstall(gitUrl, workspace, e.ref);
      if (!rep.ok) {
        warn("  [" + name + "] failed: " +
            (rep.error ?? "").slice(0, 160));
        counts.failed += 1;
        continue;
      }
      counts.installed += 1;
      restart = true;
      if (e.version) {
        info("  [" + name + "] installed (declaration records version " +
          e.version + " — the registry head moved; audit the drift " +
          "deliberately)");
      }
    }
  }
  info("extensions: " + counts.installed + " installed, " +
    counts.skipped + " skipped, " + counts.failed + " failed, " +
    counts.blocked + " blocked");
  if (restart) {
    info("restart required for new nodes (restart_comfyui is " +
      "operator-invoked: comfy restart, or the stop/boot doors)");
  }
  return counts.failed === 0 && counts.blocked === 0;
}

// ── models via the estate downloader + frozen catalog + sha256 gate ──

function sha256Of(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

interface ProvisionRow {
  name: string;
  folder: string;
  url: string;
  sha256: string;
}

async function catalogProvisions(): Promise<Array<{ family: string; row: ProvisionRow }>> {
  // The MODEL-side download places, TS-natively from the declaration
  // rows (the engine's provisionsByFamily — DECL provisions + card-
  // owned provisions; the model.py cell/provision walks died with
  // the py plane and the frozen catalog re-home died with the blob).
  const defs = await loadCardDefs();
  const byFamily = await provisionsByFamily(defs);
  const out: Array<{ family: string; row: ProvisionRow }> = [];
  for (const fam of Object.keys(byFamily).sort()) {
    for (const row of byFamily[fam]?.provisions ?? []) out.push({ family: fam, row });
  }
  return out;
}

async function fetchVerified(workspace: string,
    storeRoot: string, label: string, url: string, name: string,
    sub: string, want: string): Promise<string> {
  // One artifact through the ESTATE downloader (plain TS streaming
  // fetch into the workspace models tree — the comfy-mcp rail died
  // with the no-external-python stroke, 2026-09-10), then
  // sha256-verified. Returns ok | skipped | bad.
  const rel = sub ? "models/" + sub : "models";
  const dest = join(workspace, rel, name);
  const store = sub ? join(storeRoot, sub, name) : join(storeRoot, name);
  if (existsSync(store)) return "skipped";
  info("  [model] " + label + " -> " + rel + "/");
  if (DRY) {
    console.log("[dry-run] download " + url + " -> " + rel + "/" +
      name);
    return "skipped";
  }
  try {
    mkdirSync(dirname(dest), { recursive: true });
    const r = await fetch(url);
    if (!(r.status >= 200 && r.status < 300) || r.body === null) {
      warn("  [model] " + name + ": download refused: HTTP " + r.status);
      return "bad";
    }
    const tmp = dest + ".part";
    await pipeline(Readable.fromWeb(r.body as never),
      createWriteStream(tmp));
    renameSync(tmp, dest);
  } catch (exc) {
    warn("  [model] " + name + ": download raised: " +
      String(exc).slice(0, 160));
    return "bad";
  }
  let verifyAt = dest;
  // THE POINTER TEST: with download pointers laid (cmd paths), dest
  // resolves THROUGH the symlink onto the configured store — same
  // real file, nothing to move.
  if (existsSync(dest)) {
    try {
      if (realpathSync(dest) !== store) {
        mkdirSync(dirname(store), { recursive: true });
        renameSync(dest, store);
        verifyAt = store;
        info("  [model] " + name + ": moved to the weights store");
      }
    } catch (exc) {
      warn("  [model] " + name + ": move to store failed (" + exc +
        "); verifying in place");
    }
  }
  if (want) {
    const got = sha256Of(verifyAt).toLowerCase();
    if (got !== want) {
      try { unlinkSync(verifyAt); } catch { /* gone */ }
      warn("  [model] " + name + ": sha256 mismatch — deleted");
      return "bad";
    }
  }
  info("  [model] " + name + ": verified");
  return "ok";
}

async function stepModels(): Promise<boolean> {
  const cfg = loadConfig(DEFAULT_CONFIG);
  if (cfg.provision !== "managed") {
    die("provision=" + JSON.stringify(cfg.provision) + " — BYO " +
      "deployments own their model tree; the estate never " +
      "downloads into a user workspace");
  }
  {
    const workspace = RUNTIME;
    if (!sameWorld(workspace, "sha-verified model downloads")) return false;
    const bound = boundModelFolders(cfg);
    const storeRoot = bound.download_path;
    let ok = 0, bad = 0, skipped = 0;
    for (const { family, row } of await catalogProvisions()) {
      const url = String(row.url ?? "");
      const name = String(row.name ?? "").trim();
      const sub = String(row.folder ?? "").trim()
        .replace(/^\/+|\/+$/g, "");
      const want = String(row.sha256 ?? "").trim().toLowerCase();
      if (!url || !name) {
        warn("  [model] " + family + " provision " + JSON.stringify(name) +
          " has no url/name — refusing (declare the download place, " +
          "never guess it)");
        bad += 1;
        continue;
      }
      if (!want) {
        warn("  [model] " + family + " provision " + JSON.stringify(name) +
          " has no sha256 — refusing (unverifiable bytes never land)");
        bad += 1;
        continue;
      }
      const st = await fetchVerified(workspace, storeRoot,
        family + "/provision/" + name, url, name, sub, want);
      if (st === "ok") ok += 1;
      else if (st === "bad") bad += 1;
      else skipped += 1;
    }
    if (ok === 0 && skipped === 0 && bad === 0) {
      info("no frozen-catalog provisions declared");
      return true;
    }
    info("models: " + ok + " downloaded+verified, " + skipped +
      " present, " + bad + " failed");
    return bad === 0;
  }
}

// ── agent harness home (server mount) ────────────────────────────

const DSH_PROVISIONER: string = join(REPO, "packages", "harness",
  "provisioner");
const DSH_PROVISIONER_NAME = "@melite/harness-provisioner";
const DSH_HARNESS_HOME: string = join(REPO, "data", "runtime",
  "dsh-harness-home");
const DSH_PROFILE = "estate";
const DSH_PROFILE_BUNDLES: readonly string[] = ["@deepseek-ai/dsh-base",
  "@deepseek-ai/dsh-sdk-app", DSH_PROVISIONER_NAME];

function resolveDshLaunch(): string[] {
  // The bundled dsh runtime launcher. Deployment config, never
  // guessed: DSH_BIN names the binary, else `dsh` on PATH.
  const bin = (process.env.DSH_BIN ?? "").trim();
  if (bin && existsSync(bin)) return [bin];
  const w = spawnSync("which", ["dsh"], { encoding: "utf8" });
  const found = (w.stdout ?? "").trim().split("\n")[0]?.trim() ?? "";
  if (w.status === 0 && found) return [found];
  fail("no dsh runtime resolvable (DSH_BIN or `dsh` on PATH) — " +
    "the composition proof needs the bundled runtime");
}

function materializeProfile(home: string): string {
  // Render the estate profile into the harness home. Generated
  // state: absolute paths are legal HERE, never in the recipe.
  // Idempotent — reruns re-render everything they own.
  const prof = join(home, "profiles", DSH_PROFILE);
  mkdirSync(prof, { recursive: true });
  writeFileSync(join(home, ".gitignore"), "*\n");
  writeFileSync(join(prof, "package.json"), JSON.stringify({
    name: "dsh-profile-" + DSH_PROFILE,
    private: true,
    dependencies: { [DSH_PROVISIONER_NAME]: "link:" + DSH_PROVISIONER },
    dsh: { profile: { bundles: [...DSH_PROFILE_BUNDLES] } },
  }, null, 2) + "\n");
  writeFileSync(join(prof, "pnpm-workspace.yaml"),
    "packages:\n  - .\n\nnodeLinker: hoisted\nautoInstallPeers: false\n");
  writeFileSync(join(prof, "cordis.yml"),
    "# dsh profile root — an empty entry list. The tree is composed as\n" +
    "# patches: each bundle in package.json's dsh.profile.bundles, then\n" +
    "# cordis.patch.yml, then any --patch overlays. GENERATED by\n" +
    "# provision dsh — edit cordis.patch.yml, not this file.\n[]\n");
  writeFileSync(join(prof, "cordis.patch.yml"),
    "# estate server profile patch — GENERATED by provision dsh.\n" +
    "# The six web-surface rows are disabled: the SDK app has no\n" +
    "# webServer service (an enabled web row pends activation forever).\n" +
    "# No skill-filesystem row: the estate\n" +
    "# contributes nothing to the DSH skills surface; the bundle's\n" +
    "# host-row pin stands.\n" +
    "# INTERFACE LAW: the server mount is the HEADLESS agent —\n" +
    "# config-pinned run doors (melite_flow / run_status).\n" +
    "- id: infer-tools\n" +
    "  config:\n" +
    "    headless: true\n" +
    "- id: infer-tools-doors\n" +
    "  disabled: true\n" +
    "- id: infer-card-view-host\n" +
    "  disabled: true\n" +
    "- id: infer-card-view-client\n" +
    "  disabled: true\n" +
    "- id: infer-card-deck\n" +
    "  disabled: true\n" +
    "- id: infer-media\n" +
    "  disabled: true\n" +
    "- id: infer-gallery-host\n" +
    "  disabled: true\n");
  const r = spawnSync("pnpm", ["install"],
    { cwd: prof, encoding: "utf8", timeout: 300000 });
  if (r.status !== 0) {
    console.error((r.stdout ?? "").slice(-600));
    console.error((r.stderr ?? "").slice(-600));
    fail("pnpm install failed in " + prof + " — the provisioner rail " +
      "needs pnpm (`npm i -g pnpm` or `corepack enable`)");
  }
  return prof;
}

function cmdDsh(): void {
  const home = process.env.MELITE_DSH_HOME ?? DSH_HARNESS_HOME;
  const guiHome = join(process.env.HOME ?? "", ".dsh");
  if (resolve(home) === resolve(guiHome)) {
    die("harness home must differ from the GUI home (" + guiHome +
      ") — isolation is the mount's whole point");
  }
  if (!existsSync(join(DSH_PROVISIONER, "cordis.patch.yml"))) {
    fail("provisioner bundle missing: " + DSH_PROVISIONER +
      " (tracked in-repo)");
  }
  const prof = materializeProfile(home);
  info("profile 'estate' -> " + prof);
  info("  bundles: " + DSH_PROFILE_BUNDLES.join(", "));
  info("  provisioner installed via pnpm -> " +
    join(prof, "node_modules", DSH_PROVISIONER_NAME));
  const local = join(home, "cordis.patch.yml");
  if (!existsSync(local)) {
    mkdirSync(dirname(local), { recursive: true });
    writeFileSync(local,
      "# harness-home local patch (applies to every profile in this\n" +
      "# home). WRITTEN ONCE by provision dsh — yours to edit\n" +
      "# afterwards; reprovision never overwrites it. Provider/model\n" +
      "# overrides, MCP bridges, and machine endpoints belong here —\n" +
      "# NEVER in the shared bundle.\n[]\n");
    info("  local patch layer created (edit freely): " + local);
  }
  // composition proof through the bundled runtime
  const argv = [...resolveDshLaunch(), "--profile", DSH_PROFILE,
    "--dump-config"];
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined) env[k] = v;
  }
  env.DSH_HOME = home;
  const r = spawnSync(argv[0], argv.slice(1),
    { encoding: "utf8", env, cwd: REPO, timeout: 180000 });
  if (r.status !== 0) {
    console.error((r.stdout ?? "").slice(-800));
    console.error((r.stderr ?? "").slice(-800));
    fail("estate profile failed to compose (--dump-config rc=" +
      r.status + ")");
  }
  for (const needle of ["infer-tools", "dsh-sdk"]) {
    check("composed tree carries '" + needle + "'",
      (r.stdout ?? "").includes(needle));
  }
  info("composition verified via bundled-runtime --dump-config " +
    "(server mount ready; GUI home untouched)");
}

// ── manage: the manual door over the owning DSH's HTTP API ────────────

function cmdManage(argv: string[]): number {
  // usage: provision manage <action> [key=value ...] [positional…]
  // The manage SSOT lives lane-side (the /v1/manage door); this is
  // its manual CLI, speaking HTTP — never an in-process import.
  // The DSH host URL is deployment config (MELITE_DSH_URL or
  // --dsh); it is NEVER defaulted (the live PROD host is
  // never touched by accident).
  if (argv.length === 0 || argv[0] === "--help") {
    console.log("usage: provision manage <action> [key=value ...]");
    console.log("  provision manage status");
    console.log("  provision manage install-extension ComfyUI-KJNodes");
    console.log("  provision manage provision-model z-image");
    console.log("  provision manage logs tail=80");
    console.log("dsh host: MELITE_DSH_URL or --dsh <url> (required)");
    return 1;
  }
  const rest = [...argv];
  let gw = (process.env.MELITE_DSH_URL ?? "").trim();
  const gi = rest.indexOf("--dsh");
  if (gi >= 0) {
    gw = (rest[gi + 1] ?? "").trim();
    rest.splice(gi, 2);
  }
  if (!gw) {
    die("no DSH host URL — set MELITE_DSH_URL or pass " +
      "--dsh <url> (never defaulted; the live PROD host is " +
      "never touched by accident)");
  }
  const action = rest[0].replace(/_/g, "-").replace(/-/g, "_");
  const body: Record<string, unknown> = { action };
  const positional: Record<string, string> = {
    install_extension: "nodes", provision_model: "model",
    search_models: "query", switch_version: "version",
    install_extension_url: "url",
  };
  const plural = new Set(["install_extension"]);
  let tail = rest.slice(1);
  if (action in positional && tail.length > 0 && !tail[0].includes("=")) {
    body[positional[action]] = plural.has(action) ? [tail[0]] : tail[0];
    tail = [];
  }
  for (const kv of tail) {
    if (!kv.includes("=")) {
      console.log("REFUSED: cannot parse " + JSON.stringify(kv) +
        " (want key=value)");
      return 2;
    }
    const eq = kv.indexOf("=");
    const k = kv.slice(0, eq);
    const v = kv.slice(eq + 1);
    try {
      body[k] = JSON.parse(v) as unknown;
    } catch {
      body[k] = v;
    }
  }
  if (typeof body.nodes === "string") body.nodes = [body.nodes];
  if (body.wait === undefined) body.wait = true;
  const r = spawnSync(process.execPath, ["-e",
    "fetch(process.argv[1],{method:'POST',headers:{'content-type':" +
    "'application/json'},body:process.argv[2]})" +
    ".then(async r=>{const t=await r.text();console.log(r.status+'\n'+t)})" +
    ".catch(e=>{console.error(String(e).slice(0,200));process.exit(1)})",
    gw.replace(/\/$/, "") + "/v1/manage", JSON.stringify(body)],
    { encoding: "utf8", timeout: 320000 });
  if (r.status !== 0) {
    fail("manage POST failed: " + ((r.stderr ?? "").trim().slice(0, 200)));
  }
  const nl = (r.stdout ?? "").indexOf("\n");
  const code = parseInt((r.stdout ?? "").slice(0, nl), 10);
  let rep: { action?: string; detail?: string; data?: unknown; ok?: boolean };
  try {
    rep = JSON.parse((r.stdout ?? "").slice(nl + 1) || "{}") as typeof rep;
  } catch {
    fail("manage POST returned non-JSON: " +
      (r.stdout ?? "").slice(0, 200));
  }
  console.log("[" + code + "] " + rep.action + ": " + rep.detail);
  if (rep.data !== undefined && rep.data !== null) {
    console.log(JSON.stringify(rep.data, null, 2).slice(0, 4000));
  }
  return rep.ok ? 0 : 1;
}

// ── anny-commercial runtime ──────────────────────────────────────
// docs/design/commercial-estimator-chain.md — SAM 3D Body → MHR →
// SOMA → anny. Its OWN venv: torch cu130.

const SOMAX_REF = "d29dbe5a3f5a";     // NVlabs/SOMA-X, probed 2026-09-05
const S3DB_REF = "b5c765a0d89d";      // facebookresearch/sam-3d-body
const COM_DEPS: readonly string[] = [
  "pytorch-lightning", "pyrender", "opencv-python-headless", "yacs",
  "scikit-image", "einops", "timm", "dill", "pandas", "pyarrow", "rich",
  "hydra-core", "hydra-colorlog", "pyrootutils", "chump",
  "networkx==3.2.1", "roma", "joblib", "appdirs", "cython", "jsonlines",
  "loguru", "optree", "fvcore", "pycocotools", "xtcocotools",
  "tensorboard", "huggingface_hub", "braceexpand", "mhr", "warp-lang",
  "usd-core", "rtree", "anny==0.6.0", "setuptools==78.1.0",
];
const COM_NVIDIA_LIB = "lib/python3.11/site-packages/nvidia/cu13/lib";

interface SomaxPatch {
  rel: string;
  bad: string;
  good: string;
}

// The pinned SOMA-X friction patches (live-probed 2026-09-05),
// transcribed from the retired tools/provision.py _SOMAX_PATCHES.
// Each entry refuses on drift (expected text gone = upstream may
// have fixed it; re-pin SOMAX_REF and drop the entry) — never
// silently.
const SOMAX_PATCHES: readonly SomaxPatch[] = [
  {
    // 1. pose_inversion.py:1053 lazy `from .body import SOMALayer`
    //    (→ soma.fitting.body, does not exist); line 27's absolute
    //    form is correct. Upstream typo kills mhr2soma at runtime.
    rel: "soma/fitting/pose_inversion.py",
    bad: "            from .body import SOMALayer",
    good: "            from ..body import SOMALayer",
  },
  {
    // 2. conversion_utils.export_soma_npz: PoseInversion returns
    //    rotations in the PUBLIC rig space (78 joints incl. Root)
    //    but the export removes orients from the full internal rig
    //    (110) — hard crash. Poses are NOT consumed downstream
    //    (convert_identity_backend rebuilds the bind pose from the
    //    layer), so consistent public-space shapes are sufficient.
    rel: "tools/conversion_utils.py",
    bad: "    orient = soma._t_pose_orient.to(device=rotations.device, dtype=rotations.dtype)\n" +
      "    orient_parent_T = soma._t_pose_orient_parent_T.to(\n" +
      "        device=rotations.device, dtype=rotations.dtype\n" +
      "    )\n" +
      "    rel_rotations = remove_joint_orient_local(rotations, orient, orient_parent_T)",
    good: "    orient = soma._t_pose_orient.to(device=rotations.device, dtype=rotations.dtype)\n" +
      "    orient_parent_T = soma._t_pose_orient_parent_T.to(\n" +
      "        device=rotations.device, dtype=rotations.dtype\n" +
      "    )\n" +
      "    joint_names = list(soma.rig_data[\"joint_names\"])\n" +
      "    if (\n" +
      "        orient.shape[0] != rotations.shape[1]\n" +
      "        and hasattr(soma, \"public_joint_names\")\n" +
      "        and len(soma.public_joint_names) == rotations.shape[1]\n" +
      "    ):\n" +
      "        from soma.geometry.rig_utils import precompute_joint_orient\n" +
      "\n" +
      "        bind_pub = soma.public_bind_transforms_world().to(\n" +
      "            device=rotations.device, dtype=rotations.dtype)\n" +
      "        if bind_pub.dim() == 4:  # cached binds are batched (B,J,4,4)\n" +
      "            bind_pub = bind_pub[0]\n" +
      "        parents = soma.public_joint_parent_ids\n" +
      "        if torch.is_tensor(parents):\n" +
      "            parents = parents.to(device=rotations.device)\n" +
      "        orient, orient_parent_T = precompute_joint_orient(\n" +
      "            bind_pub, parents)\n" +
      "        joint_names = list(soma.public_joint_names)\n" +
      "    rel_rotations = remove_joint_orient_local(rotations, orient, orient_parent_T)",
  },
  {
    rel: "tools/conversion_utils.py",
    bad: "        poses_rotvec,\n" +
      "        save_transl,\n" +
      "        joint_names=list(soma.rig_data[\"joint_names\"]),",
    good: "        poses_rotvec,\n" +
      "        save_transl,\n" +
      "        joint_names=joint_names,",
  },
  {
    rel: "tools/conversion_utils.py",
    bad: "from soma.geometry.rig_utils import remove_joint_orient_local",
    good: "import torch\n\n" +
      "from soma.geometry.rig_utils import remove_joint_orient_local",
  },
  {
    // 3. mhr2soma main: warm the identity cache before the npz
    //    export (the render loop's own pattern) — the export's
    //    public-bind read needs it and the inversion leaves it cold.
    rel: "tools/mhr2soma.py",
    bad: "    # --- Save output ---\n" +
      "    if args.output_npz:\n" +
      "        extra_arrays = {\"bone_length_flexibles\": bone_length_flexibles}",
    good: "    # --- Save output ---\n" +
      "    if args.output_npz:\n" +
      "        soma.prepare_identity(\n" +
      "            all_ic, all_sp,\n" +
      "            kwargs={\"bone_length_flexibles\": all_bl})\n" +
      "        extra_arrays = {\"bone_length_flexibles\": bone_length_flexibles}",
  },
];

function sha16File(p: string): string {
  return createHash("sha256").update(readFileSync(p)).digest("hex")
    .slice(0, 16);
}

function patchSomax(checkout: string): void {
  // The pinned SOMA-X friction patches (live-probed 2026-09-05).
  // Each entry refuses on drift — never silently.
  for (const { rel, bad, good } of SOMAX_PATCHES) {
    const p = join(checkout, rel);
    const text = readFileSync(p, "utf8");
    if (!text.includes(bad)) {
      if (text.includes(good)) {
        info("[commercial] patch already present in " + rel + " — " +
          "upstream fixed it; drop the entry + re-pin");
        continue;
      }
      die("SOMA-X patch drift: expected text not found in " + rel +
        " — upstream moved; re-pin SOMAX_REF and rewrite the patches file");
    }
    writeFileSync(p, text.replace(bad, good));
    info("[commercial] patched SOMA-X " + rel);
  }
}

function cmdCommercial(warmup: boolean): void {
  // Materialize data/runtime/anny-commercial (venv + checkouts +
  // worker). Idempotent: a healthy runtime is left alone.
  const root = join(REPO, "data", "runtime", "anny-commercial");
  const venvPy = join(root, ".venv", "bin", "python");
  const marker = join(root, ".provisioned");
  const expected = [venvPy, join(root, "commercial_chain.py"),
    join(root, "SOMA-X", "tools", "mhr2soma.py"),
    join(root, "sam-3d-body", "notebook", "utils.py")];
  if (existsSync(marker) && expected.every((p) => existsSync(p))) {
    info("[commercial] runtime healthy at " + root + " — nothing to do");
    return;
  }
  if (readdirSync(root).length > 0 && !existsSync(marker)) {
    die(root + " exists but is not provisioned — remove it first " +
      "(a half-built runtime is never patched in place)");
  }
  const run = (cmd: string[], cwd?: string): void => {
    info("[commercial] " + cmd.slice(0, 6).join(" "));
    const r = spawnSync(cmd[0], cmd.slice(1),
      { cwd, encoding: "utf8", timeout: 1800000 });
    if (r.status !== 0) {
      die("provision step failed (" + cmd[0] + " …):\n" +
        (r.stdout ?? "").slice(-800) + "\n" + (r.stderr ?? "").slice(-1500));
    }
  };
  mkdirSync(root, { recursive: true });
  for (const [url, ref, name] of [
    ["https://github.com/NVlabs/SOMA-X.git", SOMAX_REF, "SOMA-X"],
    ["https://github.com/facebookresearch/sam-3d-body.git", S3DB_REF,
      "sam-3d-body"],
  ]) {
    run(["git", "clone", "-q", url, join(root, name)]);
    run(["git", "-C", join(root, name), "checkout", "-q", ref]);
  }
  patchSomax(join(root, "SOMA-X"));
  run(["uv", "venv", "-q", "--python", "3.11", join(root, ".venv")]);
  const uv = ["uv", "pip", "install", "--python", venvPy];
  run([...uv, "-q", "torch==2.10.0", "torchvision",
    "--index-url", "https://download.pytorch.org/whl/cu130"]);
  run([...uv, "-q", ...COM_DEPS]);
  run([...uv, "-q",
    "git+https://github.com/facebookresearch/detectron2.git@a1ce2f9",
    "--no-build-isolation", "--no-deps"]);
  run([...uv, "-q", "-e", join(root, "SOMA-X"),
    "git+https://github.com/microsoft/MoGe.git"]);
  copyFileSync(join(REPO, "flows", "anny-hmr-commercial", "worker.py"),
    join(root, "commercial_chain.py"));
  copyFileSync(join(REPO, "flows", "anny-params", "bake_params.py"),
    join(root, "bake_params.py"));
  if (warmup) {
    // The warmup runner is flows-lane Python (condemned with
    // S-flows) — it is orchestration-invoked here, never estate
    // code this tool owns. Until the flows lane lands its TS
    // warmup, --no-warmup provisions everything but the weight
    // cache (weights warm on first use).
    const nvidiaLib = join(root, ".venv", COM_NVIDIA_LIB);
    const env: Record<string, string> = {};
    for (const [k, v] of Object.entries(process.env)) {
      if (v !== undefined) env[k] = v;
    }
    env.LD_LIBRARY_PATH = nvidiaLib;
    info("[commercial] warmup (downloads S3DB + detector weights)");
    const r = spawnSync(venvPy, [join(root, "commercial_chain.py"),
      "--warmup"], { cwd: root, env, encoding: "utf8", timeout: 3600000 });
    if (r.status !== 0) {
      die("warmup failed (weights unreachable or model drift):\n" +
        (r.stdout ?? "").slice(-600) + "\n" + (r.stderr ?? "").slice(-1200));
    }
  } else {
    info("[commercial] warmup skipped (--no-warmup — weights warm " +
      "on first use)");
  }
  writeFileSync(marker,
    "SOMA-X@" + SOMAX_REF + " sam-3d-body@" + S3DB_REF +
    " torch=2.10.0+cu130\n" +
    "worker sha: " + sha16File(join(root, "commercial_chain.py")) + "\n" +
    "bake sha: " + sha16File(join(root, "bake_params.py")) + "\n" +
    "warmup: " + (warmup ? "done" : "pending") + "\n");
  info("[commercial] runtime provisioned at " + root);
  info("[commercial] node spawn env: LD_LIBRARY_PATH=" +
    join(root, ".venv", COM_NVIDIA_LIB));
}

// ── main ────────────────────────────────────────────────────────

function usage(): void {
  console.log("usage: provision <command> [args]");
  console.log("  paths|sync|boot-cmd|verify|manifest [config]");
  console.log("  extensions|models|all [--dry-run]");
  console.log("  dsh | manage <action> [key=value ...] | commercial [--no-warmup]");
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  if (!cmd || cmd === "--help" || cmd === "-h") {
    usage();
    return cmd ? 0 : 2;
  }
  if (cmd === "dsh") {
    cmdDsh();
    return 0;
  }
  if (cmd === "commercial") {
    cmdCommercial(!argv.includes("--no-warmup"));
    return 0;
  }
  if (cmd === "manage") {
    return cmdManage(argv.slice(1));
  }
  if (cmd === "paths" || cmd === "sync" || cmd === "boot-cmd" ||
      cmd === "verify" || cmd === "manifest") {
    if (cmd === "manifest") {
      cmdManifest();
      return 0;
    }
    const cfg = loadConfig(argv[1] ?? DEFAULT_CONFIG);
    if (cmd === "paths") cmdPaths(cfg);
    else if (cmd === "sync") cmdSync(cfg);
    else if (cmd === "boot-cmd") cmdBootCmd(cfg);
    else await cmdVerify(cfg);
    return 0;
  }
  if (cmd === "extensions" || cmd === "models" || cmd === "all") {
    DRY = argv.includes("--dry-run");
    let rc = 0;
    if (cmd === "all" || cmd === "extensions") {
      if (!await stepExtensions()) rc = 1;
    }
    if (cmd === "all" || cmd === "models") {
      if (!await stepModels()) rc = 1;
    }
    info("==========================================");
    info(rc === 0 ? "provision complete"
      : "provision FINISHED WITH FAILURES");
    return rc;
  }
  console.log("REFUSED: unknown command " + JSON.stringify(cmd));
  usage();
  return 2;
}

main().then(
  (rc) => process.exit(rc),
  (e) => {
    console.error("[provision] FATAL: " + String(e).slice(0, 500));
    process.exit(1);
  });

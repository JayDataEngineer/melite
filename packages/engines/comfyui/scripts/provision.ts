// provision — the ONE provisioning orchestrator (TS port of tools/provision.py,
// deleted at the NO-ESTATE-PYTHON cut, 2026-09-08).
//
// Operator orders: PROVISIONING LAW (2026-09-03) + NO-ESTATE-PYTHON
// (2026-09-08). The management plane is reached exclusively through
// APIs: ComfyUI HTTP (/system_stats, /object_info) and the comfy-mcp
// MCP server over stdio (JSON-RPC, minimal client below — a
// transport, never a reimplemented op). No estate Python is written,
// imported, or executed by this tool.
//
// Instance provisioning — one interface, two modes:
//   byo (default)  the user's own ComfyUI, anywhere. VERIFIED, never installed.
//   managed        a lockfile-pinned ComfyUI under data/runtime/comfyui/.
// Declaration provisioning:
//   extensions     comfy-mcp install_node for registry declarations;
//                  vendor packs symlinked from vendor/comfyui_extensions;
//                  url+ref declarations via the cm_cli engine binary.
//   models         comfy-mcp download_model per frozen-catalog provision
//                  row (packages/gateway/shell/data/discovery-catalog.json),
//                  polled to completion, sha256-verified after.
//   all            extensions + models.
//
// Config is read TS-natively: inference.config.json at the repo root
// is the SSOT (model roots, engine url/port/dirs); the endpoint file
// (packages/engines/comfyui/data/comfyui_endpoint.json) overrides
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
//   node --experimental-strip-types packages/engines/comfyui/scripts/provision.ts <command>
//   ./setup.sh <command>   (the thin POSIX wrapper — same call)
// Erasable-syntax TS only: no enums, no namespaces.

import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync,
  realpathSync, readdirSync, renameSync, rmSync, statSync, symlinkSync,
  unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE: string = dirname(fileURLToPath(import.meta.url));
const REPO: string = resolve(HERE, "..", "..", "..", "..");
const DEFAULT_CONFIG: string = join(REPO, "packages", "engines", "comfyui",
  "data", "comfyui_endpoint.json");
const ROOT_CONFIG: string = join(REPO, "inference.config.json");
const RUNTIME: string = join(REPO, "data", "runtime", "comfyui");
const COMFY_PROJECT: string = join(REPO, "infra", "comfyui");
const CATALOG: string = join(REPO, "packages", "gateway", "shell", "data",
  "discovery-catalog.json");

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

// ── minimal MCP stdio client (transport to comfy-mcp, the manager) ──

function resolveComfyMcpBin(): string {
  const env = (process.env.COMFY_MCP_BIN ?? "").trim();
  if (env && existsSync(env)) return env;
  const managed = join(RUNTIME, ".venv", "bin", "comfy-mcp");
  if (existsSync(managed)) return managed;
  const which = spawnSync("which", ["comfy-mcp"], { encoding: "utf8" });
  const found = (which.stdout ?? "").trim().split("\n")[0]?.trim() ?? "";
  if (which.status === 0 && found) return found;
  fail("comfy-mcp is not resolvable — the management plane carries it " +
    "(managed: provision sync; COMFY_MCP_BIN override; or comfy-mcp on PATH)");
}

interface McpEnv {
  bin: string;
  env: Record<string, string>;
}

function mcpEnv(workspace: string, localUrl: string): McpEnv {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined) env[k] = v;
  }
  const comfyBin = join(workspace, ".venv", "bin", "comfy");
  if (existsSync(comfyBin)) env.COMFY_BIN = comfyBin;
  env.COMFYUI_PATH = workspace;
  env.COMFY_LOCAL_URL = localUrl;
  return { bin: resolveComfyMcpBin(), env };
}

class McpClient {
  private proc: ReturnType<typeof spawn>;
  private stdin: NodeJS.WritableStream;
  private nextId = 1;
  private pending = new Map<number,
    { ok: (v: unknown) => void; bad: (e: Error) => void }>();
  private buf = "";

  constructor(bin: string, env: Record<string, string>) {
    this.proc = spawn(bin, [], { env, stdio: ["pipe", "pipe", "inherit"] });
    if (!this.proc.stdout || !this.proc.stdin) {
      throw new Error("cannot open stdio pipes to " + bin);
    }
    this.stdin = this.proc.stdin;
    this.proc.stdout.on("data", (d: Buffer) => this.onData(d.toString("utf8")));
  }

  private onData(chunk: string): void {
    this.buf += chunk;
    let nl: number;
    while ((nl = this.buf.indexOf("\n")) >= 0) {
      const line = this.buf.slice(0, nl).trim();
      this.buf = this.buf.slice(nl + 1);
      if (!line) continue;
      let msg: { id?: number; result?: unknown; error?: { message?: string } };
      try {
        msg = JSON.parse(line) as typeof msg;
      } catch { continue; }
      if (msg.id === undefined) continue;
      const p = this.pending.get(msg.id);
      if (!p) continue;
      this.pending.delete(msg.id);
      if (msg.error) p.bad(new Error(String(msg.error.message ?? "mcp error")));
      else p.ok(msg.result);
    }
  }

  call(method: string, params: unknown): Promise<unknown> {
    const id = this.nextId++;
    return new Promise((resolveP, rejectP) => {
      this.pending.set(id, { ok: resolveP, bad: rejectP });
      this.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method,
        params }) + "\n");
    });
  }

  notify(method: string, params: unknown): void {
    this.stdin.write(JSON.stringify({ jsonrpc: "2.0", method,
      params }) + "\n");
  }

  async open(): Promise<void> {
    await this.call("initialize", { protocolVersion: "2024-11-05",
      capabilities: {}, clientInfo: { name: "estate-provision", version: "1" } });
    this.notify("notifications/initialized", {});
  }

  async tool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const res = await this.call("tools/call",
      { name, arguments: args }) as {
        content?: Array<{ text?: string }>; isError?: boolean };
    if (res?.isError) {
      throw new Error("tool " + name + " isError: " +
        JSON.stringify(res.content ?? []).slice(0, 300));
    }
    const text = res?.content?.[0]?.text ?? "";
    try {
      return text ? JSON.parse(text) as unknown : {};
    } catch {
      return { text };
    }
  }

  close(): void {
    this.proc.kill();
  }
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

function managedRouting(): void {
  // managed mode: comfy-mcp spawns hit THIS runtime's comfy-cli and
  // workspace (COMFY_BIN + COMFYUI_PATH env routing).
  if (loadConfig(DEFAULT_CONFIG).provision !== "managed") return;
  const comfyBin = join(RUNTIME, ".venv", "bin", "comfy");
  if (!existsSync(comfyBin)) {
    fail("managed routing: " + comfyBin + " missing — run " +
      "`provision sync` first (the runtime venv carries the " +
      "instance's comfy-cli)");
  }
  process.env.COMFY_BIN = comfyBin;
  process.env.COMFYUI_PATH = RUNTIME;
  process.env.VIRTUAL_ENV = join(RUNTIME, ".venv");
  spawnSync(comfyBin, ["set-default", RUNTIME], { timeout: 90000 });
  info("managed routing: COMFY_BIN=" + comfyBin + " workspace=" +
    RUNTIME + " (set-default)");
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
  // management plane over MCP stdio. verify never mutates routing
  // (no set-default here — that is the declarations path's job).
  try {
    const ws = url || engineUrl(cfg);
    const me = mcpEnv(RUNTIME, ws);
    check("comfy-mcp resolvable (management plane)", true);
    const c = new McpClient(me.bin, me.env);
    try {
      await c.open();
      const tools = await c.call("tools/list", {}) as
        { tools?: Array<{ name?: string }> };
      const names = (tools.tools ?? []).map((t) => t.name);
      check("comfy-mcp answers (tools/list)",
        names.includes("server_info"));
      const rep = await c.tool("server_info", {}) as {
        workspace?: { path?: string } | string; running?: unknown };
      const wpath = typeof rep.workspace === "string"
        ? rep.workspace : rep.workspace?.path;
      check("comfy-cli routing answers (server_info)", true);
      console.log("       workspace:", wpath, "| running:", rep.running);
    } finally {
      c.close();
    }
  } catch (e) {
    check("comfy-mcp answers (management plane)", false,
      String(e).slice(0, 100));
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

// ── extensions via comfy-mcp (MCP stdio) + vendor symlinks ────────

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

async function workspaceFromServerInfo(c: McpClient): Promise<string> {
  const rep = await c.tool("server_info", {}) as {
    workspace?: { path?: string } | string };
  const ws = rep.workspace;
  const path = typeof ws === "string" ? ws : ws?.path;
  if (!path) {
    fail("comfy-cli reports no workspace — management routing is " +
      "deployment config (COMFY_BIN / comfy set-default); " +
      "provision cannot guess one");
  }
  return path;
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

function cmCliInstall(url: string, workspace: string): {
    installed?: boolean; restart_required?: boolean;
    failed?: boolean; error?: string; result?: string } {
  // cm_cli accepts git URLs (install_node wraps it but refuses
  // them) — the same engine comfy-cli uses, driven directly.
  const venv = process.env.VIRTUAL_ENV ?? "";
  const py = venv && existsSync(join(venv, "bin", "python"))
    ? join(venv, "bin", "python") : process.execPath;
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined) env[k] = v;
  }
  env.COMFYUI_PATH = workspace;
  const r = spawnSync(py, ["-m", "cm_cli", "install", url],
    { encoding: "utf8", cwd: workspace, env, timeout: 300000 });
  if (r.status === 0) {
    return { installed: true, restart_required: true,
      result: r.stdout ?? "" };
  }
  return { installed: false, failed: true,
    error: ((r.stderr || r.stdout) ?? "").slice(0, 500) };
}

async function stepExtensions(): Promise<boolean> {
  const exts = mergeManifest(REPO);
  info(exts.length + " extensions declared");
  const cfg = loadConfig(DEFAULT_CONFIG);
  const me = mcpEnv(RUNTIME, engineUrl(cfg));
  const c = new McpClient(me.bin, me.env);
  const counts = { installed: 0, skipped: 0, failed: 0, blocked: 0 };
  let restart = false;
  try {
    await c.open();
    const workspace = await workspaceFromServerInfo(c);
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
        let rep;
        try {
          rep = cmCliInstall(url, workspace);
        } catch (exc) {
          warn("  [" + name + "] cm_cli install raised: " +
            String(exc).slice(0, 160));
          counts.failed += 1;
          continue;
        }
        if (rep.failed) {
          warn("  [" + name + "] failed: " +
            (rep.error ?? "").slice(0, 160));
          counts.failed += 1;
          continue;
        }
        counts.installed += 1;
        if (rep.restart_required) restart = true;
        if (e.ref) {
          info("  [" + name + "] installed from url (declared ref " +
            e.ref + " — cm_cli may pull a different ref; audit the " +
            "drift deliberately)");
        }
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
      let rep: { failed?: unknown; unsupported?: unknown;
        restart_required?: boolean; error?: string };
      try {
        rep = await c.tool("install_node",
          { names: [reg], confirm_install: true }) as typeof rep;
      } catch (exc) {
        warn("  [" + name + "] install_node raised: " +
          String(exc).slice(0, 160));
        counts.failed += 1;
        continue;
      }
      if (rep.unsupported || rep.failed) {
        warn("  [" + name + "] install_node refused: " +
          String(rep.error ?? rep.failed).slice(0, 160));
        counts.failed += 1;
        continue;
      }
      counts.installed += 1;
      if (rep.restart_required) restart = true;
      if (e.version) {
        info("  [" + name + "] installed (declaration records version " +
          e.version + " — install_node installs latest; audit the " +
          "drift deliberately)");
      }
    }
  } finally {
    c.close();
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

// ── models via comfy-mcp + the frozen catalog + sha256 gate ──────

function sha256Of(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

interface ProvisionRow {
  name: string;
  folder: string;
  url: string;
  sha256: string;
}

function catalogProvisions(): Array<{ family: string; row: ProvisionRow }> {
  // The MODEL-side download places, TS-natively from the hand-owned
  // frozen catalog (packages/gateway/shell/data/discovery-catalog.json —
  // the model.py cell/provision walks died with the py plane; the
  // frozen rows are the surviving declaration surface).
  const doc = JSON.parse(readFileSync(CATALOG, "utf8")) as {
    provisions?: Record<string, ProvisionRow[]> };
  const out: Array<{ family: string; row: ProvisionRow }> = [];
  for (const fam of Object.keys(doc.provisions ?? {}).sort()) {
    for (const row of doc.provisions?.[fam] ?? []) out.push({ family: fam, row });
  }
  return out;
}

async function fetchVerified(c: McpClient, workspace: string,
    storeRoot: string, label: string, url: string, name: string,
    sub: string, want: string): Promise<string> {
  // One artifact through the comfy-mcp download_model rail
  // (relative_path models/<category>), polled to completion and
  // sha256-verified after. Returns ok | skipped | bad.
  const rel = sub ? "models/" + sub : "models";
  const dest = join(workspace, rel, name);
  const store = sub ? join(storeRoot, sub, name) : join(storeRoot, name);
  if (existsSync(store)) return "skipped";
  info("  [model] " + label + " -> " + rel + "/");
  if (DRY) {
    console.log("[dry-run] download_model " + url + " -> " + rel + "/" +
      name);
    return "skipped";
  }
  try {
    let rep = await c.tool("download_model",
      { url, relative_path: rel, filename: name, wait: true,
        timeout_seconds: 100.0 }) as {
          status?: string; timed_out?: boolean; download_id?: string };
    const deadline = Date.now() + 7200_000;
    while (rep?.timed_out && rep?.download_id && Date.now() < deadline) {
      rep = await c.tool("download",
        { action: "wait", download_id: rep.download_id,
          timeout_seconds: 3600.0 }) as typeof rep;
    }
    if (rep?.status !== "completed") {
      warn("  [model] " + name + ": download did not complete: " +
        JSON.stringify(rep).slice(0, 160));
      return "bad";
    }
  } catch (exc) {
    warn("  [model] " + name + ": download_model raised: " +
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
  const me = mcpEnv(RUNTIME, engineUrl(cfg));
  const c = new McpClient(me.bin, me.env);
  try {
    await c.open();
    const workspace = await workspaceFromServerInfo(c);
    if (!sameWorld(workspace, "sha-verified model downloads")) return false;
    const bound = boundModelFolders(cfg);
    const storeRoot = bound.download_path;
    let ok = 0, bad = 0, skipped = 0;
    for (const { family, row } of catalogProvisions()) {
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
      const st = await fetchVerified(c, workspace, storeRoot,
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
  } finally {
    c.close();
  }
}

// ── agent harness home (server mount) ────────────────────────────

const DSH_PROVISIONER: string = join(REPO, "packages", "harness",
  "provisioner");
const DSH_PROVISIONER_NAME = "@infer/dsh-provisioner";
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
    "# The five web-surface rows are disabled: the SDK app has no\n" +
    "# webServer service. No skill-filesystem row: the estate\n" +
    "# contributes nothing to the DSH skills surface; the bundle's\n" +
    "# host-row pin stands.\n" +
    "# INTERFACE LAW: the server mount is the HEADLESS agent —\n" +
    "# config-pinned run doors (card_run / flow_run / run_status).\n" +
    "- id: infer-tools\n" +
    "  config:\n" +
    "    headless: true\n" +
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

// ── manage: the manual door over the gateway HTTP API ────────────

function cmdManage(argv: string[]): number {
  // usage: provision manage <action> [key=value ...] [positional…]
  // The manage SSOT lives lane-side (the /v1/manage door); this is
  // its manual CLI, speaking HTTP — never an in-process import.
  // The gateway URL is deployment config (MELITE_GATEWAY_URL or
  // --gateway); it is NEVER defaulted (the live PROD gateway is
  // never touched by accident).
  if (argv.length === 0 || argv[0] === "--help") {
    console.log("usage: provision manage <action> [key=value ...]");
    console.log("  provision manage status");
    console.log("  provision manage install-extension ComfyUI-KJNodes");
    console.log("  provision manage provision-model z-image");
    console.log("  provision manage logs tail=80");
    console.log("gateway: MELITE_GATEWAY_URL or --gateway <url> (required)");
    return 1;
  }
  const rest = [...argv];
  let gw = (process.env.MELITE_GATEWAY_URL ?? "").trim();
  const gi = rest.indexOf("--gateway");
  if (gi >= 0) {
    gw = (rest[gi + 1] ?? "").trim();
    rest.splice(gi, 2);
  }
  if (!gw) {
    die("no gateway URL — set MELITE_GATEWAY_URL or pass " +
      "--gateway <url> (never defaulted; the live PROD gateway is " +
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
    managedRouting();
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

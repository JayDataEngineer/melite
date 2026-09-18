// provision-extensions-manifest — strict nodes.yaml reader and declaration-manifest merge.
// Split from scripts/provision.ts (pure move — no logic changes).

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { die, warn } from "./provision-shared.ts";

// ── strict nodes.yaml reader (the extension_lane manifest, TS-native) ──
//
// Supported subset (exactly what the estate's declarations use —
// surveyed 2026-09-08): `#` comments, `extensions:` (`[]`, null, or
// a `- name:` list), scalar keys (bare or single/double-quoted,
// single-line or `>-` folded), `pip:` nested string lists, booleans.
// Anything else is a LOUD refusal naming the file (the CLOSED-shape
// rule extension_lane's NodesDoc enforced — a manifest that cannot
// be parsed honestly must not half-install).

export interface ExtRow {
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

export const EXT_KEYS: ReadonlySet<string> = new Set(
  ["name", "registry", "version", "url", "ref", "required", "desc", "pip"]);

export function stripComment(line: string): string {
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

export function unquote(s: string, path: string, ln: number): string {
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

export function loadExtensionsYaml(path: string): ExtRow[] {
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

export function pluginIdFor(rel: string): string {
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

export function findNodesYaml(repo: string): Array<[string, string]> {
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

export function mergeManifest(repo: string): ExtRow[] {
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

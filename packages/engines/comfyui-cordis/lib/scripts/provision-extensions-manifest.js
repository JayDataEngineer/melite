// provision-extensions-manifest — strict nodes.yaml reader and declaration-manifest merge.
// Split from scripts/provision.ts (pure move — no logic changes).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { die, warn } from "./provision-shared.js";
import { packageRoot } from "../src/comfyui-config.js";
// The canonical row shape is name+url+ref(+required+desc+pip) — the
// GIT-row law (2026-10-26 drain): a `version:` field on a git row
// forked the pin identity and made the runtime provider refuse the
// row outright (canInstall: ref+version never combine — "the
// declared git ref cannot be combined with an unverified registry
// version"). Registry-arm version metadata never rides this
// manifest; a pack's release version lives in its desc. `version`
// is therefore not an EXT_KEY: a row carrying it refuses loud at
// parse (the CLOSED-shape rule).
export const EXT_KEYS = new Set(["name", "url", "ref", "required", "desc", "pip"]);
export function stripComment(line) {
    // A `#` opens a comment only outside single/double quotes.
    let q = null;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (q !== null) {
            if (c === q && line[i + 1] === q) {
                i++;
                continue;
            }
            if (c === q)
                q = null;
        }
        else if (c === "'" || c === '"') {
            q = c;
        }
        else if (c === "#") {
            return line.slice(0, i);
        }
    }
    return line;
}
export function unquote(s, path, ln) {
    const t = s.trim();
    if (t.length >= 2 && t.startsWith("'") && t.endsWith("'")) {
        return t.slice(1, -1).replace(/''/g, "'");
    }
    if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) {
        // YAML `\`+break inside double quotes is a line continuation
        // (folds to nothing); JSON knows no such escape — strip it first.
        return JSON.parse(t.replace(/\\\s+/g, ""));
    }
    if (/[&*!|{[\]"']/.test(t.slice(0, 1)) && t !== "[]") {
        die(path + ":" + ln + ": unsupported YAML shape " +
            JSON.stringify(t) + " (the reader covers the declaration " +
            "subset only — restate or extend it deliberately)");
    }
    return t;
}
export function loadExtensionsYaml(path) {
    const raw = readFileSync(path, "utf8").split("\n");
    const lines = [];
    for (let i = 0; i < raw.length; i++) {
        const t = stripComment(raw[i]).replace(/\s+$/, "");
        if (!t.trim())
            continue;
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
    const rows = [];
    let cur = null;
    let rowInd = -1;
    let inPip = false;
    const push = () => {
        if (cur !== null) {
            if (!cur.name)
                die(path + ": extension with no name");
            rows.push(cur);
        }
        cur = null;
        rowInd = -1;
        inPip = false;
    };
    const bad = (l, why) => die(path + ":" + l.n + ": " + why + " " + JSON.stringify(l.t) +
        " (the reader covers the declaration subset only — restate " +
        "or extend it deliberately)");
    if (rest !== "") {
        if (rest !== "[]" && rest !== "null")
            bad(top, "unsupported shape");
        for (const l of lines) {
            if (l !== top && /^\S/.test(l.t))
                bad(l, "keys beside `extensions:`");
        }
        return [];
    }
    // expand `>-`/`>` folded blocks (key line + deeper continuations)
    const flat = [];
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
            const parts = [];
            while (i + 1 < lines.length) {
                const nx = lines[i + 1];
                const ind = nx.t.length - nx.t.trimStart().length;
                if (ind <= base)
                    break;
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
        if (l === top)
            continue;
        const ind = l.t.length - l.t.trimStart().length;
        const body = l.t.trim();
        const dash = /^- name:\s*(.*)$/.exec(body);
        if (dash && (ind === 0 || ind === 2)) {
            push();
            cur = { name: unquote(dash[1], path, l.n),
                url: "", ref: "", required: true, desc: "", pip: [] };
            rowInd = ind;
            continue;
        }
        if (cur === null)
            bad(l, "content outside a `- name:` row");
        if (ind === 0)
            bad(l, "keys beside `extensions:` are refused");
        const pipItem = /^-(.*)$/.exec(body);
        // Style A nests pip items at row+2, style B at row+4 — both are
        // unambiguous (keys never start with `-`) once inside `pip:`.
        if (pipItem && (ind === rowInd + 2 || ind === rowInd + 4)) {
            if (!inPip)
                bad(l, "pip item outside a `pip:` list");
            cur.pip.push(unquote(pipItem[1], path, l.n));
            continue;
        }
        const kv = /^(\w+):\s*(.*)$/.exec(body);
        if (kv && ind === rowInd + 2) {
            const c = cur;
            if (!EXT_KEYS.has(kv[1]))
                bad(l, "unknown key " + JSON.stringify(kv[1]));
            if (kv[1] === "pip") {
                if (kv[2].trim() !== "")
                    bad(l, "inline `pip:` refused");
                inPip = true;
                continue;
            }
            inPip = false;
            const v = unquote(kv[2], path, l.n);
            if (kv[1] === "required") {
                if (v !== "true" && v !== "false")
                    bad(l, "`required:` wants true/false");
                c.required = v === "true";
            }
            else {
                c[kv[1]] = v;
            }
            continue;
        }
        bad(l, "unsupported line");
    }
    push();
    return rows;
}
export function pluginIdFor(rel) {
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
export function findNodesYaml(repo) {
    // extension_lane's four glob patterns, same semantics.
    const out = [];
    const walk = (dir) => {
        let ents;
        try {
            ents = readdirSync(dir, { withFileTypes: true })
                .map((e) => ({ n: e.name, d: e.isDirectory() }))
                .sort((a, b) => (a.n < b.n ? -1 : 1));
        }
        catch {
            return;
        }
        for (const e of ents) {
            if (e.n === "node_modules" || e.n === ".git" || e.n === ".venv")
                continue;
            const p = join(dir, e.n);
            if (e.d) {
                walk(p);
                continue;
            }
            if (e.n !== "extensions.yaml" && e.n !== "nodes.yaml")
                continue;
            const rel = p.slice(repo.length + 1);
            const seg = rel.split("/");
            const tail = seg.slice(seg.indexOf("packages") + 1);
            const isExt = tail.length >= 2 && tail[tail.length - 2] === "nodes" &&
                (tail[tail.length - 3] === "nodes" || e.n === "extensions.yaml");
            const isModel = tail.includes("models");
            if (!isExt && !isModel)
                continue;
            const id = pluginIdFor(rel);
            if (id)
                out.push([p, id]);
        }
    };
    walk(join(repo, "packages"));
    out.sort((a, b) => (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
    return out;
}
export function mergeManifest(repo) {
    // One extension per name; an IDENTICAL restatement merges
    // silently, a DIVERGENT pin refuses loud (extension_lane._merge_from).
    const merged = [];
    const seen = new Map();
    for (const [path, pluginId] of findNodesYaml(repo)) {
        const rel = path.slice(repo.length + 1);
        for (const ext of loadExtensionsYaml(path)) {
            const pin = JSON.stringify([ext.url,
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
// ── the SHIPPED extension manifest (the install-shape read) ─────
//
// mergeManifest walks `<repo>/packages` — a shape that exists only in
// a checkout. On an installed profile resolveRepoRoot() resolves to
// the profile dir, `<profile>/packages` is nothing, and the walk's
// readdir catch used to return SILENTLY EMPTY — every declared
// extension id refused "not declared" and no pack could ever install
// (audit 019 F1). The runtime read is therefore the COMMITTED,
// PUBLISHED data file (the model-facts.json pattern): derived by
// scripts/regen-extension-manifest.ts, shipped by the package's
// `files` (`data/**`), and read packageRoot-anchored — an install
// finds its own copy by construction. The walk stays ONLY in the
// regenerator and the dev CLI; the runtime read never falls back to
// it: an absent or unparseable data file REFUSES LOUD naming the
// path (the misconfiguration law), never serves zero silently.
/** The shipped manifest's read path: the MELITE_EXTENSION_MANIFEST
 *  override first (the COMFYUI_ENDPOINT_CONFIG idiom — the fixture
 *  seam and an operator's explicit re-point), else the package's
 *  shipped data file. Never a repo-root walk: the override and the
 *  package anchor both resolve on an installed profile.
 *  @returns absolute path to the manifest JSON. */
export function extensionManifestPath() {
    const override = process.env["MELITE_EXTENSION_MANIFEST"] ?? "";
    if (override !== "")
        return override;
    return join(packageRoot(), "data", "extension-manifest.json");
}
/** Validate one parsed manifest row — the ExtRow contract the
 *  declaration plane dereferences (`url`/`ref`/`pip` feed Manager's
 *  git-url door; `required` is a boolean, not "true").
 *  @param row the parsed value.
 *  @param at the row's index, for the refusal message.
 *  @param path the manifest path, for the refusal message.
 *  @returns the row, typed. */
function assertExtRow(row, at, path) {
    const bad = (why) => new Error("REFUSED: " + path + ": extension manifest row " + String(at) +
        " " + why + " — the shipped manifest is malformed; regenerate it " +
        "(pnpm --filter @melite/comfyui-cordis run regen:extension-manifest), never hand-edit");
    if (typeof row !== "object" || row === null)
        throw bad("is not an object");
    const r = row;
    for (const key of ["name", "url", "ref", "desc"]) {
        if (typeof r[key] !== "string")
            throw bad("carries " + key + ": " + JSON.stringify(r[key]) + " where a string is required");
    }
    if (typeof r["required"] !== "boolean")
        throw bad("carries required: " + JSON.stringify(r["required"]) + " where a boolean is required");
    if (!Array.isArray(r["pip"]) || r["pip"].some((p) => typeof p !== "string")) {
        throw bad("carries pip: " + JSON.stringify(r["pip"]) + " where a string list is required");
    }
    if (r["name"].trim() === "")
        throw bad("carries an empty name");
    if (r["_source"] !== undefined && typeof r["_source"] !== "string")
        throw bad("carries a non-string _source");
    return row;
}
/** Read the SHIPPED extension manifest — the declaration plane's one
 *  runtime source (declarationPort's install-shape read; the repo
 *  walk is the regenerator's source of truth, never a fallback).
 *  Absent or unparseable refuses LOUD naming the path: a silent
 *  empty manifest is the audit-019 F1 burn (every extension id
 *  refused on an installed profile), so this door refuses instead.
 *  @param path the manifest file to read; defaults to
 *  {@link extensionManifestPath}.
 *  @returns the merged extension rows, manifest order.
 *  @throws when the file is missing, unparseable, or a row is off
 *  the ExtRow contract. */
export function loadShippedExtensionManifest(path = extensionManifestPath()) {
    let raw;
    try {
        raw = readFileSync(path, "utf8");
    }
    catch (cause) {
        throw new Error("REFUSED: the shipped extension manifest is missing at " + path +
            " (" + (cause instanceof Error ? cause.message : String(cause)) + ")" +
            " — the declaration plane cannot serve any extension id on this" +
            " install. Restore the package data (npm artifact `data/**`) or" +
            " regenerate it (pnpm --filter @melite/comfyui-cordis run" +
            " regen:extension-manifest); refusing loud, never serving zero" +
            " extensions silently (audit 019 F1)");
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch (cause) {
        throw new Error("REFUSED: " + path + " is not parseable JSON (" +
            (cause instanceof Error ? cause.message : String(cause)) + ")" +
            " — regenerate the shipped manifest, never hand-edit it");
    }
    if (!Array.isArray(parsed)) {
        throw new Error("REFUSED: " + path + " holds " + JSON.stringify(parsed === null ? null : typeof parsed) +
            " where a row array is required — regenerate the shipped manifest");
    }
    return parsed.map((row, at) => assertExtRow(row, at, path));
}
//# sourceMappingURL=provision-extensions-manifest.js.map
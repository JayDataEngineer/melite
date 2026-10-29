// cold-clone-pack-import.spec.ts — THE COLD-CLONE PACK WALL (audit
// 019 C6, 2026-11-12). The law: every published pack imports from
// its OWN clone — a cold Manager install (git clone at the manifest
// ref, `pip install -r requirements.txt`, import) works with ZERO
// repo-layout crutches. The burn this cures: melite-kimodo-nodes
// carried a sys.path bootstrap probing `<repo>/vendor/kimodo`
// (through the custom_nodes symlink) and the retired `/opt/kimodo`
// image layout — dead weight on every cold clone, and a dev-box-only
// crutch that masked the missing pip door. The cure deleted the
// bootstrap (submodule 5fae743) and pip-declared melite-model-base
// at the vendored twin gitlink (kimodo 5fae743, poser 710b186).
//
// Judged ON THE CLONE, never the vendor checkout: every behavioral
// and text arm runs against `git archive HEAD` bytes extracted into
// a temp dir — exactly what a Manager install clones. A crutch that
// only resolves inside this repo cannot pass here by construction.
import { describe, it, expect } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const ROOT = join(import.meta.dirname, "..", "..", "..", "..");
const VENDOR = join(ROOT, "vendor", "comfyui_extensions");

/** Vendored extension submodules: dir → tracked gitlink SHA. */
function gitlinks(): Map<string, string> {
  const out = new Map<string, string>();
  const text = readFileSync(join(ROOT, ".gitmodules"), "utf8");
  for (const m of text.matchAll(/\[submodule "([^\]]+)"\]\n\tpath = (\S+)\n\turl = (\S+)/gu)) {
    if (!m[2]!.startsWith("vendor/comfyui_extensions/")) continue;
    out.set(m[2]!.split("/").pop()!, gitlinkSha(m[2]!));
  }
  return out;
}

function gitlinkSha(path: string): string {
  const stage = execFileSync("git", ["ls-files", "--stage", path], { cwd: ROOT, encoding: "utf8" });
  return /^160000 ([0-9a-f]{40}) /u.exec(stage.trim())?.[1] ?? "";
}

/** Extract a submodule's COMMITTED bytes into a fresh temp dir —
 *  the cold-clone: exactly what `git clone` at the manifest ref
 *  serves, never the working tree (a crutch committed nowhere is
 *  invisible here BY DESIGN; one committed is judged). */
function coldClone(repo: string): string {
  const dir = mkdtempSync(join(tmpdir(), `coldclone-${repo}-`));
  const archive = execFileSync("git", ["-C", join(VENDOR, repo), "archive", "HEAD"], {
    maxBuffer: 64 * 1024 * 1024,
  });
  execFileSync("tar", ["-x", "-C", dir], { input: archive });
  return dir;
}

function pyFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".py")) out.push(p);
    }
  };
  walk(dir);
  return out;
}

/**
 * THE SYS.PATH LITERAL LAW, AST-judged in python (the wall's own
 * judge, not a regex over bytes): for every `sys.path.insert/append`
 * call in a cloned .py file, the string constants feeding the target
 * expression — the call argument itself, plus every file-level
 * assignment or for-iterable of any NAME used as the argument (the
 * old bootstrap inserted `_p` bound from a `_CANDIDATES` list two
 * screens away; judging the call line alone would have blessed it) —
 * must stay pack-relative: no absolute path, no "vendor" or "kimodo"
 * (the repo-layout walk). A ".." literal is LEGAL — a pack may hop up
 * and back down INTO itself (the bundled-lib shape); the burn class
 * is the absolute path and the repo-sibling walk, both named. The
 * legal shape in this tree is the pack-local `_vendor` fallback dir.
 */
const AST_PROBE = `
import ast, json, sys

def collect(scope_nodes, module_consts):
    # name -> string constants assigned or iterated into it, within
    # ONE scope (a function's locals stay local — a 'candidate' in
    # another function must not leak its constants here), fixpointed
    # so chains resolve (the old bootstrap's sin was
    # 'for _p in _CANDIDATES' — the literals live on the LIST's
    # assignment, one Name hop from the insert call)
    raw = {}
    for stmt in scope_nodes:
        for n in ast.walk(stmt):
            if isinstance(n, ast.Assign):
                for t in n.targets:
                    if isinstance(t, ast.Name): raw.setdefault(t.id, []).append(n.value)
            elif isinstance(n, ast.For) and isinstance(n.target, ast.Name):
                raw.setdefault(n.target.id, []).append(n.iter)
    consts = {k: set() for k in raw}
    for _ in range(4):
        for name, values in raw.items():
            merged = set(consts.get(name, set()))
            for v in values:
                for n in ast.walk(v):
                    if isinstance(n, ast.Constant) and isinstance(n.value, str):
                        merged.add(n.value)
                    elif isinstance(n, ast.Name) and n.id in consts:
                        merged |= consts[n.id]
                    elif isinstance(n, ast.Name):
                        merged |= module_consts.get(n.id, set())
            consts[name] = merged
    return consts

violations = []
for path in sys.argv[1:]:
    tree = ast.parse(open(path, encoding="utf-8").read())
    sys_names = {"sys"}
    for n in ast.walk(tree):
        if isinstance(n, ast.Import):
            for a in n.names:
                # 'import sys as _sys' binds _sys to the sys module
                if a.name == "sys" and a.asname: sys_names.add(a.asname)
    module_consts = collect(tree.body, {})
    # every scope: the module itself, then each function/class body
    scopes = [tree.body]
    for n in ast.walk(tree):
        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)):
            scopes.append(n.body)
        elif isinstance(n, ast.ClassDef):
            scopes.append(n.body)
    for scope in scopes:
        consts = collect(scope, module_consts)
        for stmt in scope:
            # a scope judges only its OWN statements — never descend
            # into a nested function/class (each is judged as its own
            # scope, with its own locals; descending would re-judge
            # the inner insert against the outer scope's unioned
            # constants — the false-positive class this judge once had)
            if isinstance(stmt, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                continue
            for n in ast.walk(stmt):
                if (isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute)
                        and isinstance(n.func.value, ast.Attribute)
                        and n.func.value.attr == "path"
                        and isinstance(n.func.value.value, ast.Name)
                        and n.func.value.value.id in sys_names
                        and n.func.attr in ("insert", "append")):
                    feed = ast.Module(body=[ast.Expr(value=n.args[-1])], type_ignores=[])
                    seen = set()
                    for node in ast.walk(feed):
                        if isinstance(node, ast.Constant) and isinstance(node.value, str):
                            seen.add(node.value)
                        elif isinstance(node, ast.Name):
                            # local wins when the name is assigned in
                            # this scope; module constants apply only
                            # to true global reads (a same-named local
                            # elsewhere must not leak its constants)
                            if node.id in consts:
                                seen |= consts[node.id]
                            else:
                                seen |= module_consts.get(node.id, set())
                    bad = sorted(c for c in seen
                                 if c.startswith("/") or c == "vendor" or c == "kimodo")
                    if bad:
                        violations.append({"file": path, "call": n.func.attr, "literals": bad})
print(json.dumps(violations))
`;

describe("THE COLD-CLONE PACK WALL (every published pack imports from its own clone)", () => {
  it("no cloned pack .py mutates sys.path toward a repo-layout or absolute path (AST-judged on the clone)", () => {
    // ALL repos judged before ONE expect — a first-fail loop would
    // mask every later repo's violations behind the alphabet.
    const sins: string[] = [];
    for (const repo of [...gitlinks().keys()].sort()) {
      const clone = coldClone(repo);
      try {
        const files = pyFiles(clone);
        expect(files.length, `${repo}: the clone carries no .py files — the archive is empty`).toBeGreaterThan(0);
        const r = spawnSync("python3", ["-c", AST_PROBE, ...files], { encoding: "utf8" });
        expect(r.status, `${repo}: the AST judge itself died\n${r.stderr}`).toBe(0);
        const violations = JSON.parse(r.stdout) as Array<{ file: string; literals: string[] }>;
        for (const v of violations) {
          sins.push(`${repo} ${v.file.split("/").pop()}: ${v.literals.join(", ")}`);
        }
      } finally {
        rmSync(clone, { recursive: true, force: true });
      }
    }
    expect(sins, "sys.path mutations reaching outside the pack (absolute or the vendor walk) — a cold install never has that layout").toEqual([]);
  });

  it("melite-kimodo-nodes registers from a bare clone with kimodo UNRESOLVED — the never-raise law, zero path probing", () => {
    const clone = coldClone("melite-kimodo-nodes");
    try {
      // The dev box has kimodo pip-installed (the requirements leg
      // itself); the COLD state is simulated exactly — a meta-path
      // blocker refuses the one name, torch/numpy stay importable.
      const r = spawnSync("python3", ["-c", `
import importlib.abc, importlib.util, json, sys
class _BlockKimodo(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname == "kimodo" or fullname.startswith("kimodo."):
            raise ImportError("cold clone: kimodo is not installed")
        return None
sys.meta_path.insert(0, _BlockKimodo())
before = set(sys.path)
spec = importlib.util.spec_from_file_location(
    "melite_kimodo_nodes", ${JSON.stringify(clone)} + "/__init__.py",
    submodule_search_locations=[${JSON.stringify(clone)}])
mod = importlib.util.module_from_spec(spec)
sys.modules["melite_kimodo_nodes"] = mod
spec.loader.exec_module(mod)
print(json.dumps({
    "source": getattr(mod, "_KIMODO_SOURCE", "absent"),
    "gained": [p for p in sys.path if p not in before],
    "nodes": len(getattr(mod, "NODE_CLASS_MAPPINGS", {})),
}))
`], { encoding: "utf8" });
      expect(r.status, `the bare import raised (ComfyUI drops the whole pack on a raise — the register-anyway law):\n${r.stderr}`).toBe(0);
      const out = JSON.parse(r.stdout);
      expect(out.source).toBe(null); // unresolved kimodo is a breadcrumb, never a raise
      // The legal cold gain is the pack-local _vendor fallback dir (the
      // model_base spine) — the law is NOTHING OUTSIDE THE CLONE: the
      // old _CANDIDATES walk (/opt/kimodo, repo vendor/) is the sin.
      const outside = (out.gained as string[]).filter((p: string) => !p.startsWith(clone));
      expect(outside, "the unresolved path must probe NOTHING outside the pack — the old _CANDIDATES walk is the deleted sin").toEqual([]);
      expect(out.nodes).toBeGreaterThan(0);
    } finally {
      rmSync(clone, { recursive: true, force: true });
    }
  });

  it("melite-kimodo-nodes resolves kimodo from the pip leg alone (a stub on PYTHONPATH = the requirements.txt install)", () => {
    const clone = coldClone("melite-kimodo-nodes");
    const stubRoot = mkdtempSync(join(tmpdir(), "kimbodo-stub-"));
    try {
      mkdirSync(join(stubRoot, "kimodo"));
      writeFileSync(join(stubRoot, "kimodo", "__init__.py"), 'value = "pip-leg"\n');
      const r = spawnSync("python3", ["-c", `
import importlib.util, json, sys
before = set(sys.path)
spec = importlib.util.spec_from_file_location(
    "melite_kimodo_nodes", ${JSON.stringify(clone)} + "/__init__.py",
    submodule_search_locations=[${JSON.stringify(clone)}])
mod = importlib.util.module_from_spec(spec)
sys.modules["melite_kimodo_nodes"] = mod
spec.loader.exec_module(mod)
outside = [p for p in sys.path if p not in before and p != ${JSON.stringify(join(clone, "_vendor"))}]
print(json.dumps({
    "source": getattr(mod, "_KIMODO_SOURCE", "absent"),
    "gained_outside_clone": outside,
    "nodes": len(getattr(mod, "NODE_CLASS_MAPPINGS", {})),
}))
`], { encoding: "utf8", env: { ...process.env, PYTHONPATH: stubRoot } });
      expect(r.status, `the pip-leg import raised:\n${r.stderr}`).toBe(0);
      const out = JSON.parse(r.stdout);
      expect(out.source).toBe("installed");
      expect(out.gained_outside_clone, "only the pack-local _vendor fallback may join sys.path — nothing outside the clone").toEqual([]);
      expect(out.nodes).toBeGreaterThan(0);
    } finally {
      rmSync(clone, { recursive: true, force: true });
      rmSync(stubRoot, { recursive: true, force: true });
    }
  });

  it("every manifest row with a vendored twin pins EXACTLY the tracked gitlink (cold installs run the vendored bytes)", () => {
    const links = gitlinks();
    const manifest = JSON.parse(readFileSync(join(ROOT, "packages", "engines", "comfyui-cordis", "data", "extension-manifest.json"), "utf8")) as Array<{ name: string; ref?: string }>;
    const drift: string[] = [];
    for (const row of manifest) {
      const sha = links.get(row.name);
      if (sha === undefined) continue; // no vendored twin — Manager clones the remote at ref
      if (row.ref !== sha) drift.push(`${row.name}: manifest ref ${row.ref} != vendored gitlink ${sha}`);
    }
    expect(drift, "the manifest installs a DIFFERENT commit than the vendored tree runs — cold installs and dev boxes diverge").toEqual([]);
  });

  it("every pack that imports melite_model_base pip-declares it at the vendored twin's gitlink", () => {
    const twin = gitlinks().get("melite-model-base");
    expect(twin, "the melite-model-base submodule is gone — the consuming packs' pip legs pin a ghost").toBeTruthy();
    const leg = `melite-model-base @ git+https://github.com/JayDataEngineer/melite-model-base.git@${twin}`;
    const consumers: Array<[string, string[]]> = [
      ["melite-kimodo-nodes", ["nodes.py", "nodes_anny.py"]],
      ["melite-poser-nodes", ["sam_segment.py"]],
    ];
    for (const [repo, files] of consumers) {
      const importsIt = files.some((f) =>
        (readFileSync(join(VENDOR, repo, f), "utf8").match(/from melite_model_base|import melite_model_base/u) ?? []).length > 0);
      expect(importsIt, `${repo}: the consumer list is stale — none of ${files.join(", ")} imports melite_model_base anymore`).toBe(true);
      const reqs = readFileSync(join(VENDOR, repo, "requirements.txt"), "utf8");
      expect(reqs, `${repo}: imports melite_model_base but requirements.txt carries no pip leg at the vendored gitlink — a cold Manager install resolves it only through the _vendor crutch`).toContain(leg);
    }
  });
});

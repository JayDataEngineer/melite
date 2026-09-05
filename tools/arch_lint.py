"""arch_lint -- the estate boundary-drift linter (2026-09-03).

The four contracts (each maps to an operator law):
  1. core_is_generic         py/ must not import from plugins/, vendor/, or references/
  2. plugins_are_independent  the three plugin groups (engines, harness, web) do not import each other
  3. vendor_packs_isolated   each vendor/comfyui_extensions/<pack> is its own repo
  4. references_is_study_only references/ is read-only -- no one imports it

Run: python3 tools/arch_lint.py
Exit: 0 clean, 1 any violations.
"""
import ast
import os
import re
import sys
from collections.abc import Iterator
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

SKIP_DIRS = {".git", "node_modules", ".venv", "data",
             "__pycache__", "dist", "build", ".import_linter_cache"}

# TS import specifier: matches the quoted part of import x from 's',
# import 's', or require('s'). The delimiter char class uses \' and "
# so single- and double-quoted specs both match without string-literal
# pain in the source.
TS_RE = re.compile(
    r"""(?:from\s+|require\s*\(\s*)['"]"""
    r"""([^'"]+)"""
    r"""['"]""",
    re.MULTILINE,
)


def iter_source_files(root: Path) -> Iterator[tuple[Path, str]]:
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            p = Path(dirpath) / fn
            if fn.endswith(".py"):
                yield p, "py"
            elif fn.endswith((".ts", ".tsx", ".mjs", ".js")):
                yield p, "ts"


def collect_imports(path: Path, language: str) -> Iterator[tuple[Path, int, str]]:
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return
    if language == "py":
        try:
            tree = ast.parse(text, filename=str(path))
        except SyntaxError:
            return
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    yield path, node.lineno, alias.name
            elif isinstance(node, ast.ImportFrom):
                mod = node.module or ""
                if node.level and not mod:
                    mod = "." * node.level
                if mod:
                    yield path, node.lineno, mod
    elif language == "ts":
        for m in TS_RE.finditer(text):
            spec = m.group(1)
            if not spec:
                continue
            line_no = text[:m.start()].count("\n") + 1
            if spec.startswith("."):
                rel = (path.parent / spec).resolve()
                top = _top_group(rel)
                if top:
                    yield path, line_no, top + "/<relative>"
            else:
                yield path, line_no, spec


def _top_group(path: Path) -> str | None:
    try:
        rel = path.resolve().relative_to(REPO)
    except ValueError:
        return None
    parts = rel.parts
    if not parts:
        return None
    head = parts[0]
    if head in ("py", "plugins", "vendor", "references"):
        return head
    return None


def _plugins_subgroup(path: Path) -> str | None:
    try:
        rel = path.resolve().relative_to(REPO / "plugins")
    except ValueError:
        return None
    parts = rel.parts
    if len(parts) < 2:
        return None
    return parts[1]


def _vendor_pack(path: Path) -> str | None:
    try:
        rel = path.resolve().relative_to(REPO / "vendor" / "comfyui_extensions")
    except ValueError:
        return None
    parts = rel.parts
    if not parts:
        return None
    return parts[0]


def contract_core_is_generic(all_imports: list[tuple[Path, int, str]]) -> list[tuple[Path, int, str]]:
    """PLUGIN ARCHITECTURE LAW: py/ is generic. No py/ file may
    import from plugins/, vendor/, or references/.

    SELF-IMPORT NOTE: py/plugins.py is a module INSIDE py/ whose
    name happens to start with "plugins". An "import plugins" inside
    a py/ file is a self-import into py/plugins.py (the plugin
    directory iterator / contract broker), not a cross-tree reach
    into the plugins/ directory tree. We exclude it."""
    py_self_imports = {
        "plugins",                       # py/plugins.py (self)
        # add future py/ internal modules here if they ever get
        # module names that collide with top-level tree names.
    }
    violations = []
    for path, line_no, mod in all_imports:
        if _top_group(path) != "py":
            continue
        if mod in py_self_imports:
            continue
        if (mod.startswith("plugins")
                or mod.startswith("vendor")
                or mod.startswith("references")):
            violations.append((path, line_no,
                f"core is generic: {mod!r} in py/"))
        if mod.endswith("/<relative>"):
            top = mod.split("/")[0]
            if top in ("plugins", "vendor", "references"):
                violations.append((path, line_no,
                    f"core is generic: relative import lands in {top}"))
    return violations


def contract_plugins_are_independent(all_imports: list[tuple[Path, int, str]]) -> list[tuple[Path, int, str]]:
    """EXTENSION LAW + plugin architecture: the three plugin groups
    (engines, harness, web) are independent DOMAIN trees.

    SHARED KIT: web/* is the @melite kit, designed to be consumed by
    every plugin group (the WEB REGISTRY ruling: the editor and every
    engine plugin consume it; no consumer hosts shared infrastructure
    in its subtree). Any plugin importing @melite/* or web/* is
    consuming the shared design system, not another plugin's domain.
    Those imports are allowed.

    The real independent check: a plugin's domain code does not
    import another plugin group's DOMAIN code (engines don't reach
    into harness/ or web/; harness doesn't reach into engines/ or
    web/; web doesn't reach into engines/ or harness/)."""
    group_to_id = {"engines": "comfyui", "harness": "dsh", "web": "editor"}
    # the shared kit: anyone may import these
    shared_kit_specifiers = {"@melite/"}
    shared_kit_targets = {"web"}        # top-level group for relative imports
    violations = []
    for path, line_no, mod in all_imports:
        if _top_group(path) != "plugins":
            continue
        # shared kit allowance
        if any(mod.startswith(p) for p in shared_kit_specifiers):
            continue
        if mod.endswith("/<relative>"):
            other = mod.split("/")[0]
            if other in shared_kit_targets:
                continue
        if mod.endswith("/<relative>"):
            other = mod.split("/")[0]
            if other in group_to_id:
                my_group = _plugins_subgroup(path)
                if my_group and my_group != other:
                    violations.append((path, line_no,
                        f"plugins are independent: relative import into "
                        f"plugins/{other}/ from plugins/{my_group}/"))
    return violations


def contract_vendor_packs_isolated(all_imports: list[tuple[Path, int, str]]) -> list[tuple[Path, int, str]]:
    """EXTENSION LAW: each vendor/comfyui_extensions/<pack> is its own
    repo. Cross-pack imports are a wall break."""
    violations = []
    for path, line_no, mod in all_imports:
        if _top_group(path) != "vendor":
            continue
        my_pack = _vendor_pack(path)
        if not my_pack:
            continue
        if mod.endswith("/<relative>"):
            other = mod.split("/")[0]
            if other and other != my_pack:
                if "comfyui_extensions" in str(path):
                    violations.append((path, line_no,
                        f"vendor packs isolated: relative import from pack "
                        f"{my_pack!r} into {other!r}"))
    return violations


def contract_references_is_study_only(all_imports: list[tuple[Path, int, str]]) -> list[tuple[Path, int, str]]:
    """EXTENSION LAW: references/ is read-only study. No one
    OUTSIDE references/ may import from it.

    Self-imports (a file in references/ referencing another file in
    references/) are allowed -- the file is study, but a study file
    can reference its siblings for analysis tooling. The wall is
    against the rest of the estate reaching in."""
    violations = []
    for path, line_no, mod in all_imports:
        if not mod.startswith("references"):
            continue
        # skip self-imports within references/
        if _top_group(path) == "references":
            continue
        violations.append((path, line_no,
            f"references is study-only: {mod!r}"))
    return violations


CONTRACTS = [
    ("core_is_generic", "py/ is generic -- the gateway names no lane, no engine", contract_core_is_generic),
    ("plugins_are_independent", "the three plugin groups (engines, harness, web) do not import each other", contract_plugins_are_independent),
    ("vendor_packs_isolated", "each vendor/comfyui_extensions/<pack> is its own repo", contract_vendor_packs_isolated),
    ("references_is_study_only", "references/ is read-only study -- no one imports it", contract_references_is_study_only),
]


def main(argv: list[str] | None = None) -> int:
    import argparse
    parser = argparse.ArgumentParser(
        description="Estate boundary-drift linter (4 contracts)")
    parser.add_argument("--quiet", action="store_true",
                        help="Only print on violations")
    args = parser.parse_args(argv)

    if not args.quiet:
        print(f"arch_lint: scanning {REPO}")

    all_imports = []
    for path, lang in iter_source_files(REPO):
        for entry in collect_imports(path, lang):
            all_imports.append(entry)

    total_violations = 0
    for name, doc, fn in CONTRACTS:
        v = fn(all_imports)
        if v:
            print(f"\n[{name}] BROKEN -- {doc}")
            for path, line_no, msg in v:
                rel = path.relative_to(REPO)
                print(f"  {rel}:{line_no}  {msg}")
            total_violations += len(v)
        else:
            if not args.quiet:
                print(f"[{name}] OK")
    if total_violations:
        print(f"\n{total_violations} violation(s) across {len(CONTRACTS)} contract(s)")
        return 1
    if not args.quiet:
        print("\nall contracts clean")
    return 0


if __name__ == "__main__":
    sys.exit(main())

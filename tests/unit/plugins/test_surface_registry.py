"""Surface registry meta-test — the estate's plugin import + ABI closure.

Two drift classes nothing else pins (from the drift-playbook pass,
2026-09-04):

  S1  STALE SURFACE — IMPORT_SURFACES in test_plugin_isolation.py is
      a static list; a renamed/deleted py/ module leaves a ghost entry
      that still gets "imported" in a subprocess (which then fails, or
      worse, imports something else that shadows the name).

  S2  ORPHAN SURFACE — the inverse: a py/ module the GATEWAY imports
      that is NOT in IMPORT_SURFACES has no clean-import pin. Import-
      time side effects (network, filesystem, global mutation) would
      ship to production unwatched. The gateway's import graph is
      ast-walked (lazy function-level imports included — stdlib and
      site-packages excluded), so a new `import X` in py/gateway.py
      with no isolation pin fails here the same day.

  S3  CLOSED ABI — the plugin declaration surfaces the BROKER consumes
      are closed sets (py/plugins.py is the contract):

        * plugin.py      -> exactly `Plugin` (id/label/engines/... are
                            class-attribute ROWS, not code surface)
        * engine.py      -> ENGINE_TYPE (+ optional execute/stop/unload
                            per docs/plugins/abi.md — the gateway
                            hasattr/getattr-probes exactly these)
        * compose pkg    -> card_compose (+ optional execute/stop/
                            unload, + ValidationError re-export the
                            core's 4xx plumbing consumes)

      Any other PUBLIC top-level define is either a typo'd hook (the
      engine will never call it) or dead code — rename with a leading
      underscore or delete. Private helpers (_-prefixed) are free.

Plugin dirs come from the broker's ONE walk (iter_plugin_dirs_under) —
never a second copy of the traversal (PLUGIN ARCHITECTURE LAW).
"""

import ast
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "py"))
import plugins as plugin_broker  # noqa: E402  (py/plugins.py, the broker)

REPO = Path(__file__).resolve().parents[3]

# The isolation pin's list, read structurally (not imported — keep the
# subprocess suite self-contained; this pin fails loudly if the list
# moves or renames).
ISOLATION_FILE = REPO / "tests/unit/plugins/test_plugin_isolation.py"

# py/ modules the gateway may import WITHOUT an isolation pin:
# document each exemption with its reason or do not add it.
GATEWAY_IMPORT_EXEMPT: set[str] = set()

ENGINE_ABI = {"ENGINE_TYPE", "execute", "stop", "unload"}
# ENGINE_TRUTH_KEYS: each engine's run-truth keys, declared in its
# compose and consumed by the walls (test_python_cards.py reads the
# module attribute) — documented contract in py/melite_models/grammar.py.
# ValidationError: re-export the core's 4xx plumbing consumes.
COMPOSE_ABI = {"card_compose", "execute", "stop", "unload",
               "ValidationError", "ENGINE_TRUTH_KEYS"}
PLUGIN_ABI = {"Plugin"}


def _public_top_level(path: Path, allowed: set[str]) -> set[str]:
    """Public top-level names DEFINED by a python file — defs, classes,
    assignments — plus from-import re-exports of ABI names. Plain
    `import sys` / `from pathlib import Path` are import mechanics,
    not defines, and don't count (importing a name is not offering
    it). AST only, no import."""
    tree = ast.parse(path.read_text())
    names: set[str] = set()
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef,
                             ast.ClassDef)):
            names.add(node.name)
        elif isinstance(node, ast.Assign):
            names |= {t.id for t in node.targets
                      if isinstance(t, ast.Name)}
        elif isinstance(node, ast.AnnAssign) and isinstance(
                node.target, ast.Name):
            names.add(node.target.id)
        elif isinstance(node, ast.ImportFrom):
            for a in node.names:
                if (a.asname or a.name) in allowed:
                    names.add(a.asname or a.name)
    return {n for n in names if not n.startswith("_")}


def _isolation_surfaces() -> list[str]:
    tree = ast.parse(ISOLATION_FILE.read_text())
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(
            isinstance(t, ast.Name) and t.id == "IMPORT_SURFACES"
            for t in node.targets
        ):
            return list(ast.literal_eval(node.value))
    pytest.fail("IMPORT_SURFACES not found in " + str(ISOLATION_FILE))


def _gateway_local_imports() -> set[str]:
    """py/ sibling modules the gateway imports anywhere (ast-walk,
    lazy imports included)."""
    tree = ast.parse((REPO / "py/gateway.py").read_text())
    found: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            found |= {a.name.split(".")[0] for a in node.names}
        elif isinstance(node, ast.ImportFrom) and node.module:
            found.add(node.module.split(".")[0])
    py_mods = {p.stem for p in (REPO / "py").glob("*.py")}
    return found & py_mods


def _plugin_dirs() -> list[Path]:
    roots = [REPO / "plugins" / cat for cat in ("engines", "web")]
    out = []
    for root in roots:
        out.extend(plugin_broker.iter_plugin_dirs_under(root))
    return out


def test_s1_isolation_surfaces_exist_on_disk():
    """R-stale: every pinned import surface is a real py/ module."""
    missing = sorted(
        s for s in _isolation_surfaces()
        if not (REPO / "py" / (s + ".py")).is_file()
    )
    assert not missing, (
        "IMPORT_SURFACES entries with no py/<name>.py on disk (module "
        "renamed/deleted, pin is stale): %s" % missing
    )


def test_s2_gateway_imports_are_pinned():
    """R-orphan: every py/ module the gateway imports has a clean-import
    pin (or a documented exemption)."""
    pinned = set(_isolation_surfaces())
    uncovered = _gateway_local_imports() - pinned - GATEWAY_IMPORT_EXEMPT
    assert not uncovered, (
        "py/ modules imported by py/gateway.py with NO clean-import "
        "pin in test_plugin_isolation.py: %s — add them to "
        "IMPORT_SURFACES (or GATEWAY_IMPORT_EXEMPT with a reason)"
        % sorted(uncovered)
    )


def _abi_targets():
    """(label, path, allowed_set) for every plugin declaration file."""
    for pdir in _plugin_dirs():
        ppy = pdir / "plugin.py"
        if ppy.is_file():
            yield (ppy.relative_to(REPO).as_posix(), ppy, PLUGIN_ABI)
        compose_init = pdir / "compose" / "__init__.py"
        if compose_init.is_file():
            yield (compose_init.relative_to(REPO).as_posix(),
                   compose_init, COMPOSE_ABI)
        engines_root = pdir / "engines"
        if engines_root.is_dir():
            for edir in sorted(engines_root.iterdir()):
                if not edir.is_dir():
                    continue
                for fname, abi in (
                    ("engine.py", ENGINE_ABI),
                    ("compose.py", COMPOSE_ABI),
                ):
                    f = edir / fname
                    if f.is_file():
                        yield (f.relative_to(REPO).as_posix(), f, abi)


def test_s3_plugin_declaration_surfaces_are_closed():
    """R-ABI: public defines on broker-consumed files are exactly the
    ABI — typo'd hooks and dead code fail loudly instead of silently
    never being called."""
    offenders = []
    for label, path, allowed in _abi_targets():
        rogue = _public_top_level(path, allowed) - allowed
        if rogue:
            offenders.append("%s: %s" % (label, sorted(rogue)))
    assert not offenders, (
        "public defines outside the plugin ABI (docs/plugins/abi.md; "
        "rename with a leading _ or delete): %s" % offenders
    )


def test_s3_engine_declarations_name_their_type():
    """Every legacy engines/<dir>/engine.py declares ENGINE_TYPE —
    the broker's SSOT (dir-name fallback is the yaml-era relic)."""
    missing = []
    for pdir in _plugin_dirs():
        engines_root = pdir / "engines"
        if not engines_root.is_dir():
            continue
        for edir in sorted(engines_root.iterdir()):
            f = edir / "engine.py"
            if f.is_file() and "ENGINE_TYPE" not in _public_top_level(
                    f, ENGINE_ABI):
                missing.append(f.relative_to(REPO).as_posix())
    assert not missing, (
        "engine.py files without ENGINE_TYPE (broker falls back to "
        "dir-name — the SSOT rule says declare it): %s" % missing
    )

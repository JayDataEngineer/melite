"""PRIMITIVE-HYGIENE META-WALL — the extraction stroke's own regression pins.

Two gap classes this stroke paid for, pinned here so they cannot recur:

1. SHADOW PRIMITIVES (the 2026-09-05 extraction stroke) — RETIRED
   2026-09-07 with the python render plane (commit b324c480): the
   kit (compose/co_script/) and the comfyui lane files it scanned
   (action_cards/*/*/py/{compose,renderer,schema}.py) are deleted.
   The TS plane owns that surface now, walled by
   suites/test_cordis_compose.py — the shadow scan is retired, not
   forgotten.

2. LEAKED TEST DOUBLES (the 2026-09-05 "boom" leak) — LIVE, pinned
   below: test_gateway_strictness setattr'd a RAISING lambda onto
   lane_disclosure with no teardown — every later in-process caller
   inherited the failure (form_wire green isolated, red in suite).
   Bare setattr on an estate module is now a review event: EITHER
   use monkeypatch (auto-restored) OR carry a pinned allowlist
   entry naming the restore. The RUNTIME guard (tests/conftest.py
   _no_leaked_disclosure_doubles) catches an actual leak at the
   leaking test; this static pin catches the next unreviewed site.
"""

import ast
import os

import pytest

from _anchor import REPO  # tests/ + py/ inserts, owned by the shim


def _py_top_levels() -> set[str]:
    pydir = os.path.join(REPO, "py")
    return {f[:-3] for f in os.listdir(pydir) if f.endswith(".py")}


# (file, target-object, reason): bare-estate-setattr sites reviewed
# and carrying a PROVEN restore. A new site fails until it either
# converts to monkeypatch or lands here with its restore proof.
_SETATTR_ALLOWLIST = {
    # the LaneWireError doubles: setup lambdas plant them, the test
    # body restores the original in a finally (runtime guard
    # _no_leaked_disclosure_doubles proves no leak escapes).
    ("tests/unit/runtime/test_gateway_strictness.py", "ld",
     "raising doubles, finally-restored in-test"),
}


def _estate_aliases(tree: ast.Module) -> set[str]:
    """Local names bound to estate modules (py/ top-levels,
    plugins.*) by import statements in this file."""
    tops = _py_top_levels()
    aliases = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for a in node.names:
                top = (a.asname or a.name).split(".")[0]
                root = a.name.split(".")[0]
                if root in tops or root == "plugins":
                    aliases.add(top)
        elif isinstance(node, ast.ImportFrom):
            if (node.module or "").split(".")[0] in tops:
                for a in node.names:
                    aliases.add(a.asname or a.name)
    return aliases


def test_no_unreviewed_bare_setattr() -> None:
    """Bare setattr on an estate module needs a pinned allowlist
    entry (or, better, monkeypatch). Catches the next 'boom'. """
    offenders = []
    tests = os.path.join(REPO, "tests")
    for dirpath, _dirs, files in os.walk(tests):
        for name in sorted(files):
            if not name.endswith(".py"):
                continue
            path = os.path.join(dirpath, name)
            with open(path, encoding="utf-8",
                      errors="replace") as f:
                try:
                    tree = ast.parse(f.read(), path)
                except SyntaxError:
                    continue
            aliases = _estate_aliases(tree)
            if not aliases:
                continue
            rel = os.path.relpath(path, REPO)
            for node in ast.walk(tree):
                if not (isinstance(node, ast.Call)
                        and isinstance(node.func, ast.Name)
                        and node.func.id == "setattr"
                        and node.args
                        and isinstance(node.args[0], ast.Name)
                        and node.args[0].id in aliases):
                    continue
                key = (rel, node.args[0].id)
                if not any(k[0] == key[0] and k[1] == key[1]
                           for k in _SETATTR_ALLOWLIST):
                    offenders.append(
                        "%s:%d: bare setattr on estate module '%s' "
                        "— use monkeypatch, or pin an allowlist "
                        "entry with the restore proof"
                        % (rel, node.lineno, node.args[0].id))
    assert not offenders, "\n".join(offenders)

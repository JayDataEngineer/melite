"""Walls registry meta-test — no suite silently un-run (orphan detection).

The walls plane runs through THREE registries, and none of them is
discovery-based:

  * SUBPROCESS_WALLS in test_walls.py   — suites the orchestrator runs
  * KNOWN_DRIFT in test_walls.py        — suites expected red, cited
  * collect_ignore_glob in conftest.py  — script-style suites pytest
                                          must NOT import

A suite dropped into suites/ and forgotten by all three is invisible
to every runner — the drift nobody notices until it burns. This module
pins the registries against each other and against the disk:

  R1  orphan   — every collect-ignored suite (script world, pytest will
                 never import it) MUST be in SUBPROCESS_WALLS or
                 KNOWN_DRIFT, i.e. something runs it.
  R2  stale    — every SUBPROCESS_WALLS / KNOWN_DRIFT entry must exist
                 on disk (a deleted suite leaves a ghost entry).
  R3  booking  — a suite cannot be both expected-green (SUBPROCESS_WALLS)
                 and expected-red (KNOWN_DRIFT).
  R4  live     — every collect_ignore_glob pattern matches at least one
                 suite (a glob for a renamed file is dead bookkeeping).
  R5  style    — a collectible suite (not ignore-globbed) with top-level
                 executable calls would EXECUTE at pytest collection,
                 the exact sin the ignore list exists for; it must be
                 registered (ignore-globbed) or converted (guard its
                 calls). AST only — this file never imports a suite.

The registries are read by ast literal parse, never by import:
importing test_walls.py would double-register its parametrizations.
"""

import ast
from fnmatch import fnmatch
from pathlib import Path

WALLS = Path(__file__).resolve().parent
SUITES = WALLS / "suites"
REPO = WALLS.parent.parent


def _assign(tree, name):
    """Literal value of a top-level `name = ...` assignment, else None."""
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(
            isinstance(t, ast.Name) and t.id == name for t in node.targets
        ):
            return ast.literal_eval(node.value)
    return None


def _registries():
    walls_tree = ast.parse((WALLS / "test_walls.py").read_text())
    conftest_tree = ast.parse((WALLS / "conftest.py").read_text())
    subprocess_walls = _assign(walls_tree, "SUBPROCESS_WALLS") or []
    known_drift = _assign(walls_tree, "KNOWN_DRIFT") or {}
    ignore_globs = _assign(conftest_tree, "collect_ignore_glob") or []
    return (
        set(subprocess_walls),
        set(known_drift),
        set(ignore_globs),
    )


def _suite_files():
    """Every suite on disk, as suites-relative basenames."""
    return {p.name for p in SUITES.glob("test_*.py")}


def _ignored(name, ignore_globs):
    return any(fnmatch(name, pat.split("/")[-1]) for pat in ignore_globs)


def test_r1_every_ignored_suite_is_run_by_something():
    """R1: a suite pytest refuses to collect must have a runner."""
    subprocess_walls, known_drift, ignore_globs = _registries()
    run = subprocess_walls | known_drift
    orphans = sorted(
        name for name in _suite_files()
        if _ignored(name, ignore_globs)
        and ("tests/walls/suites/" + name) not in run
    )
    assert not orphans, (
        "suites collect-ignored by pytest but run by NOTHING (not in "
        "SUBPROCESS_WALLS, not in KNOWN_DRIFT): %s — add the runner or "
        "delete the suite" % orphans
    )


def test_r2_registry_entries_exist_on_disk():
    """R2: ghost entries — deleted suites still booked in a registry."""
    subprocess_walls, known_drift, _ = _registries()
    ghosts = sorted(
        p for p in (subprocess_walls | known_drift)
        if not (REPO / p).is_file()
    )
    assert not ghosts, (
        "registry entries pointing at nothing on disk (suite deleted/"
        "renamed without bookkeeping): %s" % ghosts
    )


def test_r3_no_suite_is_both_green_and_drift():
    """R3: SUBPROCESS_WALLS expects exit 0, KNOWN_DRIFT expects red —
    a suite in both is a contradiction the orchestrator resolves
    arbitrarily."""
    subprocess_walls, known_drift, _ = _registries()
    both = sorted(subprocess_walls & known_drift)
    assert not both, (
        "suites booked as expected-green AND expected-red: %s" % both
    )


def test_r4_every_ignore_glob_matches_a_suite():
    """R4: dead globs — bookkeeping for a file that no longer exists."""
    _, _, ignore_globs = _registries()
    dead = sorted(
        pat for pat in ignore_globs
        if not any(fnmatch(name, pat.split("/")[-1])
                   for name in _suite_files())
    )
    assert not dead, "collect_ignore_glob patterns matching nothing: %s" % dead


def test_r5_collectible_suites_do_not_execute_at_import():
    """R5: a suite NOT ignore-globbed will be imported by pytest at
    collection. Top-level executable calls (module-level check()/run()
    invocations outside any def or __main__ guard) mean a script-style
    suite that escaped the registry — pytest would run the whole wall
    once per collection. AST-only probe; the observed invariant across
    the plane: every converted/collectible suite has zero top-level
    calls, every script suite with calls is ignore-globbed."""
    _, _, ignore_globs = _registries()
    offenders = []
    for path in sorted(SUITES.glob("test_*.py")):
        if _ignored(path.name, ignore_globs):
            continue
        tree = ast.parse(path.read_text())
        calls = [
            n for n in tree.body
            if isinstance(n, ast.Expr) and isinstance(n.value, ast.Call)
        ]
        if calls:
            offenders.append(path.name)
    assert not offenders, (
        "collectible suites with top-level executable calls (they run "
        "at pytest collection — convert to asserts or add to "
        "collect_ignore_glob): %s" % offenders
    )

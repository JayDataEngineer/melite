"""test_dsh_tsc_wall.py - tsc --noEmit across every dsh TypeScript package.

Equivalent of the py gateway wall (test_py_gateway.py): one pytest
that walks every dsh package with a tsconfig.json and runs tsc
--noEmit, collecting failures. Catches the I-forgot-to-typecheck-
this-package class - a stale .js build or a type regression in
one plugin would otherwise pass a single-package CI gate.

Run: pytest tests/walls/suites/test_dsh_tsc_wall.py -v
"""
from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

from _anchor import REPO


def _tsc_packages() -> list[Path]:
    """Every dsh package with a tsconfig.json. Skips non-TS packages
    (provisioner is MJS-only, shared is build helpers, etc.) and
    skips examples/install-profile shells.
    """
    roots = [REPO / "plugins" / "harness" / "dsh", REPO / "plugins" / "web" / "dsh"]
    out = []
    for root in roots:
        if not root.exists():
            continue
        for pkg in sorted(p for p in root.iterdir() if p.is_dir()):
            tsc = pkg / "tsconfig.json"
            if tsc.exists():
                out.append(pkg)
    return out


@pytest.fixture(scope="module")
def tsc_results() -> dict[str, tuple[int, str]]:
    """Run tsc --noEmit in every dsh TS package.

    Returns {pkg_name: (returncode, stderr)}. A clean run has rc=0
    and an empty stderr.
    """
    out = {}
    for pkg in _tsc_packages():
        r = subprocess.run(
            ["pnpm", "exec", "tsc", "--noEmit", "-p", "tsconfig.json"],
            cwd=pkg, capture_output=True, text=True, timeout=180,
        )
        out[pkg.name] = (r.returncode, (r.stderr or r.stdout).strip()[:1500])
    return out


def test_every_dsh_typescript_package_typechecks_cleanly(
    tsc_results: dict[str, tuple[int, str]],
) -> None:
    """Every dsh TS package must pass tsc --noEmit.

    A failure here means: a type regression was introduced and the
    per-package tsc was not run before the commit. The build itself
    is unaffected (tsdown emits JS without type-checking by default
    in this repo) so the bug would not surface until the next full
    typecheck pass.
    """
    broken = {
        name: (rc, err) for name, (rc, err) in tsc_results.items()
        if rc != 0
    }
    msg = 'these dsh packages fail tsc --noEmit. Fix the type errors and re-run.'
    for name, (rc, err) in broken.items():
        msg = msg + chr(10) + '--- ' + name + ' (rc=' + str(rc) + ') ---' + chr(10) + err + chr(10)
    assert not broken, msg


def test_tsc_wall_covers_at_least_the_expected_packages(
    tsc_results: dict[str, tuple[int, str]],
) -> None:
    """The wall must cover the three documented dsh TS packages.

    Catches the this-package-gained-a-tsconfig-and-was-silently-
    excluded-from-the-wall class. If you add a new TS package, add
    it to this list in the same commit.
    """
    expected = {"melite-card-deck", "melite-card-view", "melite-tools",
                # 2026-09-06: media-plugin gained a tsconfig (a
                # dsh-family member with a built lib — F1 in the
                # freshness wall); discovery here caught it before
                # it could be silently excluded.
                "media-plugin"}
    actual = set(tsc_results.keys())
    missing = expected - actual
    extra = actual - expected
    assert not missing, (
        f"expected dsh TS packages NOT covered by the tsc wall: "
        f"{sorted(missing)}. Add the new tsconfig to the expected set "
        f"in this test in the same commit that adds the package."
    )
    assert not extra, (
        f"unexpected dsh TS packages in the tsc wall: {sorted(extra)}. "
        f"Either they are part of the dsh family (add to the expected "
        f"set) or they are out of scope (this wall covers the dsh "
        f"family only - move them to a sibling wall if they need one)."
    )

"""Architectural-contracts wall (boundary-drift linter).

The four operator-law contracts the linter enforces (PLUGIN
ARCHITECTURE, EXTENSION, C RETIREMENT) are NOT optional -- they
are how this estate stays clean across plugin and refactor churn.
This test invokes the linter as a subprocess and asserts the exit
code is zero: any violation becomes a CI red.

The linter itself is at tools/arch_lint.py. It does filesystem-text
scans (not Python import-graph -- the gateway discovers plugins by
globbing, not by import, so import-linter cannot see the boundary).
"""
import os
import subprocess
import sys


REPO = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))


def test_architectural_contracts_clean():
    # the linter is a stand-alone python script; run it from the repo
    # root so the relative path in its output is meaningful.
    proc = subprocess.run(
        [sys.executable, "tools/arch_lint.py"],
        cwd=REPO, capture_output=True, text=True, timeout=120,
    )
    stderr_tail = proc.stderr[-2000:] if len(proc.stderr) > 2000 else proc.stderr
    assert proc.returncode == 0, (
        "architectural contracts violated. Linter output:\n"
        + "--- stdout ---\n" + proc.stdout
        + "\n--- stderr (tail) ---\n" + stderr_tail
    )

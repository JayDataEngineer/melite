"""tests/walls conftest — the suites are SCRIPTS, not pytest modules.

tests/walls/suites/ holds the script-style wall suites: their check()
discipline, stdout and exit codes ARE the contract (see test_walls.py).
pytest must never import them during collection — several execute
their walls at import. collect_ignore keeps suites/ out of every
collection pass; the orchestrator (tests/walls/test_walls.py) runs
each suite as a subprocess and pins the exit code instead.
"""

collect_ignore = ["suites"]

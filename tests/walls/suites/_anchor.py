"""Script-world shim -> tests/_bootstrap.py (fixture audit, F6/F7).

Walls suites run as STANDALONE scripts — the walls contract is
check() + exit code, and no conftest hands a script a path. This
shim owns the script world's path inserts, once: the tests/ dir (to
import _bootstrap) and REPO/py (estate modules). Suites do
`from _anchor import REPO` (plus free_port / boot_scratch_gateway /
reap_gateway / HERE as needed) and never self-roll an anchor or a
python/ insert again.
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent            # tests/walls/suites/

sys.path.insert(0, str(HERE.parents[1]))          # tests/  -> _bootstrap
sys.path.insert(0, str(HERE.parents[2] / "python"))   # estate modules
# (2026-09-07) the fit/skin lane-lens inserts died with the python
# render plane (commit b324c480) — those python/ dirs no longer exist.

from _bootstrap import (  # noqa: E402
    REPO, boot_scratch_gateway, free_port, reap_gateway)

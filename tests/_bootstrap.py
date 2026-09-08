"""Shared test bootstrap — the ONE home for repo anchoring and
scratch-gateway mechanics (fixture audit 2026-09-04, F6/F7).

Importable from every pytest context: the root conftest
(tests/conftest.py) puts this directory on sys.path alongside python/.
The script-style walls suites reach it through the shim
tests/walls/suites/_anchor.py, which owns the script world's path
inserts. Nothing self-rolls a REPO anchor or a gateway boot again.
"""
import os
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]


def free_port() -> int:
    """A free localhost port (bind :0, read it back, release)."""
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


def _serving(port: int, path: str, timeout: float = 2.0) -> bool:
    """True once the port answers HTTP at all (any status) — a boot
    wait, not a contract check."""
    url = "http://127.0.0.1:%d%s" % (port, path)
    try:
        with urllib.request.urlopen(url, timeout=timeout) as r:
            r.read(1)
        return True
    except urllib.error.HTTPError:
        return True
    except Exception:
        return False


def boot_scratch_gateway(wait_path: str = "/v1/health", python: str | None = None,
                         tries: int = 150, sleep: float = 0.2,
                         env: dict[str, str] | None = None) -> tuple[int, subprocess.Popen[bytes]]:
    """Boot python/gateway.py on a scratch port; poll until wait_path
    serves. Returns (port, proc).

    CALLER OWNS REAPING — reap_gateway(proc). python defaults to
    sys.executable (the integration plane passes the repo venv
    python); env defaults to a copy of os.environ.

    2026-09-06 (single-writer lock seam): a scratch gateway ALWAYS
    boots with its OWN state root (MELITE_STATE_ROOT → a fresh tmp
    dir) unless the caller pinned one in env — the R2 one-writer
    lock refuses a second writer on the production root, and the
    hermetic suites must never contend with (or write into) the
    live estate's runs/ tree. Scratch roots die with the tmp parent.
    """
    port = free_port()
    boot_env = dict(env if env is not None else os.environ)
    if "MELITE_STATE_ROOT" not in boot_env:
        import tempfile
        root = Path(tempfile.mkdtemp(prefix="melite-scratch-"))
        boot_env["MELITE_STATE_ROOT"] = str(root)
    proc = subprocess.Popen(
        [python or sys.executable, str(REPO / "python" / "gateway.py"), str(port)],
        cwd=str(REPO), env=boot_env,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        start_new_session=True)
    for _ in range(tries):
        if _serving(port, wait_path):
            return port, proc
        time.sleep(sleep)
    reap_gateway(proc)
    raise RuntimeError(
        "scratch gateway did not boot on :%d (waited on %s)" % (port, wait_path))


def reap_gateway(proc: subprocess.Popen[bytes]) -> None:
    """The shutdown law on scratch gateways: SIGTERM, bounded wait,
    kill — a deliberate teardown manufactures zero zombies."""
    proc.terminate()
    try:
        proc.wait(timeout=15)
    except subprocess.TimeoutExpired:
        proc.kill()


def stamp_xdist_group(config: "pytest.Config",
                      items: "list[pytest.Item]", group: str,
                      root: Path) -> None:
    """Stamp every collected item with an xdist_group marker so
    `pytest -n auto --dist=loadgroup` co-schedules a suite onto one
    worker (tests/unit/conftest.py). The marker is inert without
    pytest-xdist; with it, the group is the stable scheduling key.
    (pytest imported lazily below; the annotations reference it as
    the conftest-only world this function serves.)"""
    import pytest as _pytest
    for item in items:
        item.add_marker(_pytest.mark.xdist_group(group))

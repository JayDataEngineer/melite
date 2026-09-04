"""Shared test bootstrap — the ONE home for repo anchoring and
scratch-gateway mechanics (fixture audit 2026-09-04, F6/F7).

Importable from every pytest context: the root conftest
(tests/conftest.py) puts this directory on sys.path alongside py/.
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


def free_port():
    """A free localhost port (bind :0, read it back, release)."""
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


def _serving(port, path, timeout=2.0):
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


def boot_scratch_gateway(wait_path="/v1/health", python=None, tries=150,
                         sleep=0.2, env=None):
    """Boot py/gateway.py on a scratch port; poll until wait_path
    serves. Returns (port, proc).

    CALLER OWNS REAPING — reap_gateway(proc). python defaults to
    sys.executable (the integration plane passes the repo venv
    python); env defaults to a copy of os.environ.
    """
    port = free_port()
    proc = subprocess.Popen(
        [python or sys.executable, str(REPO / "py" / "gateway.py"), str(port)],
        cwd=str(REPO), env=env if env is not None else dict(os.environ),
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        start_new_session=True)
    for _ in range(tries):
        if _serving(port, wait_path):
            return port, proc
        time.sleep(sleep)
    reap_gateway(proc)
    raise RuntimeError(
        "scratch gateway did not boot on :%d (waited on %s)" % (port, wait_path))


def reap_gateway(proc):
    """The shutdown law on scratch gateways: SIGTERM, bounded wait,
    kill — a deliberate teardown manufactures zero zombies."""
    proc.terminate()
    try:
        proc.wait(timeout=15)
    except subprocess.TimeoutExpired:
        proc.kill()

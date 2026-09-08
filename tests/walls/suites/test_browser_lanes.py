#!/usr/bin/env python3
"""test_browser_lanes.py — the estate ladder gates the TS browser lanes.

The browser e2e estate lives with the editor (TypeScript Playwright — ONE
runner, ONE selector language per surface; the python side owns the wire
contract, not the DOM). This wrapper makes the python gate ladder COVER the
browser lanes without duplicating them: it boots a THROWAWAY vite dev server
on an OS-assigned port, points Playwright's BASE_URL at it, and asserts the
two HARNESS lanes pass:

  * e2e/card-harness.spec.ts     — the card surface pinned in isolation
  * e2e/loading-bar.spec.ts      — the per-card progress bar doctrine

Everything the lanes need is hermetic EXCEPT the read-only model catalog
(the ServicePicker add-flow fetches /v1/model-catalog through the vite
proxy) — that is the SAME live-gateway contract as every tests/_live
suite: when the gateway is unreachable the lane SKIPS with an operator
hint, it does not go red. No inference door is ever touched (INFERENCE
LAW): the harness fixtures hydrate the store directly and artifacts ride
SVG data URLs.

Run: infra/python/.venv/bin/python -m unittest tests.test_browser_lanes
"""
import os
import signal
import socket
import subprocess
import time
import unittest
import urllib.request

from _anchor import REPO
EDITOR = os.path.join(REPO, "packages", "web", "editor")
LANES = (
    "e2e/card-harness.spec.ts",
    "e2e/loading-bar.spec.ts",
    "e2e/wire-misfires.spec.ts",
)
GATEWAY_CATALOG = os.environ.get(
    "TEST_GATEWAY_BASE", "http://127.0.0.1:33081"
).rstrip("/") + "/v1/model-catalog"
LANE_LOG_DIR = os.path.join(REPO, "data", "test-output", "browser-lanes")

_CHROMIUM_CANDIDATES = (
    os.path.expanduser(
        "~/.cache/ms-playwright/chromium-1234/chrome-linux64-editor/editor-chromium"
    ),
    os.path.expanduser("~/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome"),
)


def _chromium() -> str:
    return next((p for p in _CHROMIUM_CANDIDATES if os.path.isfile(p)), "")


def _gateway_up(timeout: float = 3.0) -> bool:
    try:
        with urllib.request.urlopen(GATEWAY_CATALOG, timeout=timeout) as res:
            return res.status == 200
    except Exception:
        return False


def _free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _http_up(url: str) -> bool:
    try:
        with urllib.request.urlopen(url, timeout=2.0) as res:
            return res.status < 500
    except Exception:
        return False


class BrowserLaneTests(unittest.TestCase):
    """The harness browser lanes, green or skipped — never silently absent."""

    vite_proc = None
    base_url = None

    @classmethod
    def setUpClass(cls) -> None:
        exe = _chromium()
        if not exe:
            raise unittest.SkipTest(
                "no bundled chromium at ~/.cache/ms-playwright/chromium-1234 — "
                "see playwright.local.config.ts CHROMIUM_PATH"
            )
        if not _gateway_up():
            raise unittest.SkipTest(
                f"gateway catalog unreachable at {GATEWAY_CATALOG} — the picker "
                "add-flow needs the read-only catalog (boot: see tests/README.md)"
            )
        os.makedirs(LANE_LOG_DIR, exist_ok=True)
        port = _free_port()
        cls.base_url = f"http://127.0.0.1:{port}"
        log = open(os.path.join(LANE_LOG_DIR, "vite.log"), "w", encoding="utf-8")
        # Own process group: teardown must take the whole vite tree (esbuild
        # children included) — a bare terminate() leaves orphans on the port.
        cls.vite_proc = subprocess.Popen(
            ["npx", "vite", "--port", str(port), "--strictPort"],
            cwd=EDITOR,
            stdout=log,
            stderr=subprocess.STDOUT,
            start_new_session=True,
        )
        deadline = time.monotonic() + 120
        while time.monotonic() < deadline:
            if cls.vite_proc.poll() is not None:
                raise AssertionError(
                    "vite dev server died during boot — see "
                    f"{os.path.relpath(os.path.join(LANE_LOG_DIR, 'vite.log'), REPO)}"
                )
            if _http_up(f"{cls.base_url}/editor/"):
                return
            time.sleep(1)
        raise AssertionError("vite dev server did not become ready within 120s")

    @classmethod
    def tearDownClass(cls) -> None:
        if cls.vite_proc is not None and cls.vite_proc.poll() is None:
            os.killpg(os.getpgid(cls.vite_proc.pid), signal.SIGTERM)
            try:
                cls.vite_proc.wait(timeout=15)
            except subprocess.TimeoutExpired:
                os.killpg(os.getpgid(cls.vite_proc.pid), signal.SIGKILL)
                cls.vite_proc.wait(timeout=10)

    def test_harness_lanes_green(self) -> None:
        env = dict(os.environ, BASE_URL=self.base_url)
        result = subprocess.run(
            [
                "npx", "playwright", "test",
                "--config=playwright.local.config.ts",
                "--reporter=line",
                "--workers=1",
                *LANES,
            ],
            cwd=EDITOR,
            env=env,
            capture_output=True,
            text=True,
            timeout=600,
        )
        tail = "\n".join((result.stdout + result.stderr).strip().splitlines()[-25:])
        self.assertEqual(
            result.returncode, 0,
            f"browser lanes failed (exit {result.returncode}):\n{tail}",
        )


if __name__ == "__main__":
    unittest.main()

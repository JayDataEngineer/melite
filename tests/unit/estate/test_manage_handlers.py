"""test_manage_handlers.py — unit tests for the browse + snapshot lane.

The cm_cli rail (`list_extensions`, `snapshot_list`, `snapshot_save`,
`snapshot_restore`) shells a subprocess per call — these tests pin the
PARSING and the GATE chain with a stubbed `_cm_cli`, so they run with
no gateway, no workspace, no network:

  rows admitted   — only well-formed rows become data (Manager
                    bookkeeping lines — FETCH/WARNING — never leak
                    into a reply)
  gates in order  — restore: required-arg (422-shape) BEFORE the
                    active-run guard (409) BEFORE the byo refusal
                    (409); byo refuses LOUDLY on every new read
  envelope shapes — every new handler answers the SSOT envelope
                    {action, ok, detail, data}

The live door (real cm_cli, real gateway) is pinned by
tests/routes/control/test_manage_route.py; the vocabulary by
tests/walls/suites/test_manage_parity.py.
"""
import subprocess
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace

# Handlers take the comfy-mcp server module; these tests stub the
# world short of it (refusal paths never reach the rail), so a bare
# stub module stands in — never None (a handler receiving None would
# be a lie about its door contract).
_SMS = ModuleType("sms-stub")

import pytest

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "py"))

import manage  # noqa: E402


# ── fixtures ────────────────────────────────────────────────

def _req(action: str, **kw: str | bool) -> manage.ManageRequest:
    return manage.ManageRequest(action=action, **kw)


def _proc(rc: int = 0, out: str = "", err: str = "") -> SimpleNamespace:
    return SimpleNamespace(returncode=rc, stdout=out, stderr=err)


def _managed(monkeypatch: pytest.MonkeyPatch) -> list[tuple[str, list[str], float]]:
    """Stub the world as the managed workspace; record cm_cli calls."""
    calls: list = []

    def fake_cm_cli(workspace: Path, args: list[str],
                    timeout: float) -> SimpleNamespace:
        calls.append((str(workspace), list(args), timeout))
        return _proc(0, "")

    monkeypatch.setattr(manage, "_cm_cli", fake_cm_cli)
    monkeypatch.setattr(manage, "_ensure_routing",
                        lambda: {"mode": "managed",
                                 "workspace": "/tmp/fake-ws"})
    monkeypatch.setattr(manage, "_active_runs", lambda: [])
    return calls


def _byo(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(manage, "_ensure_routing",
                        lambda: {"mode": "byo"})


# realistic cm_cli chatter: bookkeeping lines around the real rows
SIMPLE_SHOW = """[ComfyUI-Manager] Using GitPython backend
FETCH DATA from: /tmp/x/cache
ComfyUI-KJNodes@nightly
ComfyUI-MoGe@nightly
H3 Motion Context@nightly
WARNING:root:[ComfyUI-Manager] python -m pip not available. Falling back to uv.
a line with no version pin
rgthree-comfy@nightly
name-without-version@
@v1
"""

SNAPSHOT_LIST = """[ComfyUI-Manager] Using GitPython backend
FETCH DATA from: /tmp/x/cache
2026-09-06_10-17-22_snapshot.json
2026-09-06_10-18-43_snapshot.json
"""


# ── the row regexes: admission is exact ─────────────────────

@pytest.mark.parametrize("line", [
    "ComfyUI-KJNodes@nightly",
    "H3 Motion Context@nightly",   # names may contain spaces
    "rgthree-comfy@1.2.3",
])
def test_pack_row_admits_well_formed(line: str) -> None:
    assert manage._PACK_ROW.fullmatch(line)


@pytest.mark.parametrize("line", [
    "a line with no version pin",
    "name-without-version@",
    "@v1",
    "[ComfyUI-Manager] Using GitPython backend",
    "WARNING:root:[ComfyUI-Manager] pip note",
    "FETCH DATA from: /tmp/x",
    "",
])
def test_pack_row_refuses_noise(line: str) -> None:
    assert not manage._PACK_ROW.fullmatch(line)


def test_snap_row_admits_json_only() -> None:
    assert manage._SNAP_ROW.fullmatch("2026-09-06_10-17-22_snapshot.json")
    assert not manage._SNAP_ROW.fullmatch("FETCH DATA from: /tmp/x")
    assert not manage._SNAP_ROW.fullmatch("")


# ── list_extensions ─────────────────────────────────────────

def test_list_extensions_parses_rows(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list = []

    def fake_cm_cli(workspace: Path, args: list[str],
                    timeout: float) -> SimpleNamespace:
        calls.append((str(workspace), list(args), timeout))
        return _proc(0, SIMPLE_SHOW)

    monkeypatch.setattr(manage, "_cm_cli", fake_cm_cli)
    monkeypatch.setattr(manage, "_ensure_routing",
                        lambda: {"mode": "managed",
                                 "workspace": "/tmp/fake-ws"})
    code, rep = manage._h_list_extensions(_req("list_extensions"), _SMS)
    assert code == 200
    assert rep["ok"] is True
    assert rep["data"] == [
        "ComfyUI-KJNodes@nightly",
        "ComfyUI-MoGe@nightly",
        "H3 Motion Context@nightly",
        "rgthree-comfy@nightly",
    ]
    assert calls[0][1] == ["simple-show", "installed"]


def test_list_extensions_cm_cli_failure_is_500(
        monkeypatch: pytest.MonkeyPatch) -> None:
    _managed(monkeypatch)
    monkeypatch.setattr(manage, "_cm_cli",
                        lambda ws, args, timeout: _proc(1, "", "boom"))
    code, rep = manage._h_list_extensions(_req("list_extensions"), _SMS)
    assert code == 500
    assert rep["ok"] is False
    assert "boom" in str(rep["data"])


def test_list_extensions_timeout_is_504(
        monkeypatch: pytest.MonkeyPatch) -> None:
    _managed(monkeypatch)

    def slow(ws: Path, args: list[str], timeout: float) -> SimpleNamespace:
        raise subprocess.TimeoutExpired(cmd="cm_cli", timeout=timeout)

    monkeypatch.setattr(manage, "_cm_cli", slow)
    code, rep = manage._h_list_extensions(_req("list_extensions"), _SMS)
    assert code == 504


def test_list_extensions_byo_refuses_loudly(
        monkeypatch: pytest.MonkeyPatch) -> None:
    _byo(monkeypatch)
    code, rep = manage._h_list_extensions(_req("list_extensions"), _SMS)
    assert code == 409
    assert "byo" in str(rep["detail"])


# ── snapshot_list / snapshot_save ───────────────────────────

def test_snapshot_list_parses_rows(monkeypatch: pytest.MonkeyPatch) -> None:
    _managed(monkeypatch)
    monkeypatch.setattr(manage, "_cm_cli",
                        lambda ws, args, timeout: _proc(0, SNAPSHOT_LIST))
    code, rep = manage._h_snapshot_list(_req("snapshot_list"), _SMS)
    assert code == 200
    assert rep["data"] == [
        "2026-09-06_10-17-22_snapshot.json",
        "2026-09-06_10-18-43_snapshot.json",
    ]


def test_snapshot_list_byo_refuses_loudly(
        monkeypatch: pytest.MonkeyPatch) -> None:
    _byo(monkeypatch)
    code, rep = manage._h_snapshot_list(_req("snapshot_list"), _SMS)
    assert code == 409


def test_snapshot_save_reports_name(monkeypatch: pytest.MonkeyPatch) -> None:
    _managed(monkeypatch)
    out = "Current snapshot is saved as `2026-09-06_10-18-43_snapshot.json`"
    monkeypatch.setattr(manage, "_cm_cli",
                        lambda ws, args, timeout: _proc(0, out))
    code, rep = manage._h_snapshot_save(_req("snapshot_save"), _SMS)
    assert code == 200
    assert rep["data"]["snapshot"] == \
        "2026-09-06_10-18-43_snapshot.json"


def test_snapshot_save_without_marker_names_nothing(
        monkeypatch: pytest.MonkeyPatch) -> None:
    _managed(monkeypatch)
    monkeypatch.setattr(manage, "_cm_cli",
                        lambda ws, args, timeout: _proc(0, "saved ok"))
    code, rep = manage._h_snapshot_save(_req("snapshot_save"), _SMS)
    assert code == 200
    assert rep["data"]["snapshot"] == "?"


def test_snapshot_save_byo_refuses_loudly(
        monkeypatch: pytest.MonkeyPatch) -> None:
    _byo(monkeypatch)
    code, rep = manage._h_snapshot_save(_req("snapshot_save"), _SMS)
    assert code == 409


# ── snapshot_restore: the gate chain, in order ──────────────

def test_snapshot_restore_missing_arg_is_named() -> None:
    # _need raises BEFORE any guard or subprocess — dispatch maps it
    # to the 422 named refusal (pinned live in test_manage_route.py).
    with pytest.raises(ValueError, match="snapshot"):
        manage._h_snapshot_restore(_req("snapshot_restore"), _SMS)


def test_snapshot_restore_bows_to_active_runs(
        monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(manage, "_active_runs", lambda: ["run-abc123"])
    code, rep = manage._h_snapshot_restore(
        _req("snapshot_restore", snapshot="s.json"), _SMS)
    assert code == 409
    assert "run-abc123" in str(rep["detail"])
    assert rep["data"]["active_runs"] == ["run-abc123"]


def test_snapshot_restore_force_passes_guard(
        monkeypatch: pytest.MonkeyPatch) -> None:
    _managed(monkeypatch)
    monkeypatch.setattr(manage, "_active_runs", lambda: ["run-abc123"])
    monkeypatch.setattr(manage, "_cm_cli",
                        lambda ws, args, timeout: _proc(0, "restored"))
    code, rep = manage._h_snapshot_restore(
        _req("snapshot_restore", snapshot="s.json", force=True), _SMS)
    assert code == 200
    assert rep["data"]["restart_required"] is True


def test_snapshot_restore_byo_refuses_after_guards(
        monkeypatch: pytest.MonkeyPatch) -> None:
    _byo(monkeypatch)
    monkeypatch.setattr(manage, "_active_runs", lambda: [])
    code, rep = manage._h_snapshot_restore(
        _req("snapshot_restore", snapshot="s.json"), _SMS)
    assert code == 409
    assert "byo" in str(rep["detail"])


def test_snapshot_restore_cm_cli_failure_is_500(
        monkeypatch: pytest.MonkeyPatch) -> None:
    _managed(monkeypatch)
    monkeypatch.setattr(manage, "_cm_cli",
                        lambda ws, args, timeout: _proc(1, "", "nope"))
    code, rep = manage._h_snapshot_restore(
        _req("snapshot_restore", snapshot="s.json"), _SMS)
    assert code == 500
    assert "nope" in str(rep["data"])

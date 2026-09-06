"""test_range_media.py - the R2 range-request media wall
(2026-09-06). The asset door serves true 206 partial content:
browsers and <video> players scrub by Range, and a full-file 200
per seek stalls playback. Pinned, offline:

  1. _parse_range: bytes=a-b / bytes=a- / bytes=-suffix; malformed
     and multi-range specs -> None (the honest FULL fallback);
     unsatisfiable (lo >= size) -> None too.
  2. the DOOR: route() with a Range header returns 206 + a correct
     Content-Range + the inclusive slice; without Range the 200
     still announces Accept-Ranges.
  3. _Ctx.headers defaults {} (route callers without headers keep
     working).
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "py"))

import gateway as gw_mod  # noqa: E402

JsonValue = dict[str, "JsonValue"] | list["JsonValue"] | str | int | float | bool | None

PREFIX = gw_mod.ASSET_URL_PREFIX
BODY = b"0123456789"   # 10 bytes


@pytest.fixture()
def scratch(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    out = tmp_path / "output"
    run = out / "run-rr"
    run.mkdir(parents=True)
    (run / "clip.mp4").write_bytes(BODY)
    monkeypatch.setattr(gw_mod, "STATE_ROOT", tmp_path)
    monkeypatch.setattr(gw_mod, "OUT_ROOT", out)
    monkeypatch.setattr(gw_mod, "LEDGER_PATH", tmp_path / "_ledger.jsonl")


def test_parse_range_forms() -> None:
    assert gw_mod._parse_range("bytes=0-3", 10) == (0, 3)
    assert gw_mod._parse_range("bytes=4-", 10) == (4, 9)
    assert gw_mod._parse_range("bytes=-3", 10) == (7, 9)
    assert gw_mod._parse_range("bytes=8-99", 10) == (8, 9)   # clamp hi
    assert gw_mod._parse_range("Bytes=0-3", 10) == (0, 3)   # case
    for bad in ("", "bytes=", "bytes=3-1", "bytes=5-1", "bytes=a-b",
                "bytes=0-1,5-6", "bytes=10-", "chunks=0-3",
                "bytes=0", "bytes=--"):
        assert gw_mod._parse_range(bad, 10) is None, bad


def _fetch(target: str,
          headers: dict[str, str] | None) -> gw_mod.HandlerResult:
    gw = gw_mod.Gateway()
    return asyncio.run(gw_mod.route(gw, "GET", target, b"",
                                    headers=headers))


def test_door_serves_206_partial(scratch: None) -> None:
    status, payload = _fetch(PREFIX + "/run-rr/clip.mp4",
                             {"range": "bytes=2-5"})
    assert status == 206
    _, hdrs, raw = payload
    assert raw == BODY[2:6]
    assert hdrs["content-range"] == "bytes 2-5/10"
    assert hdrs["accept-ranges"] == "bytes"


def test_door_open_ended_and_suffix(scratch: None) -> None:
    status, payload = _fetch(PREFIX + "/run-rr/clip.mp4",
                             {"range": "bytes=6-"})
    assert status == 206 and payload[2] == BODY[6:]
    status, payload = _fetch(PREFIX + "/run-rr/clip.mp4",
                             {"range": "bytes=-4"})
    assert status == 206 and payload[2] == BODY[-4:]


def test_door_malformed_falls_back_full(scratch: None) -> None:
    status, payload = _fetch(PREFIX + "/run-rr/clip.mp4",
                             {"range": "bytes=x-y"})
    assert status == 200 and payload[2] == BODY
    assert payload[1]["accept-ranges"] == "bytes"


def test_door_without_header_announces_accept_ranges(
        scratch: None) -> None:
    status, payload = _fetch(PREFIX + "/run-rr/clip.mp4", None)
    assert status == 200 and payload[2] == BODY
    assert payload[1]["accept-ranges"] == "bytes"


def test_ctx_headers_default_empty() -> None:
    ctx = gw_mod._Ctx(gw_mod.Gateway(), "GET", "/x", "/x", {}, b"")
    assert ctx.headers == {}
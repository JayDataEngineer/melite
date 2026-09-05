"""CARD REQUIRES UNIT WALL — the extension-gate checker, hermetic.

The existing wall suite (tests/walls/suites/test_card_requires.py) is
script-style and pins the LIVE estate against a running ComfyUI
(listed in KNOWN_DRIFT — it needs the server's installed extension
set). That left the checker's own LOGIC — the three resolution
strategies and their fallthroughs — with no deterministic coverage:
a regression in check_card_requires would only surface as a flaky
live-server failure. This suite pins the logic with a canned
object_info (monkeypatched _fetch_object_info — no network, no
server, no GPU):

  S1  known mapping + expected nodes in object_info  → ok
  S2  known mapping + nodes absent + dir on disk    → ok (disk fallback)
  S3  known mapping + nodes absent + no disk        → refuse, named
  H   unknown name + substring heuristic hit        → ok
  H-  unknown name + no heuristic hit               → refuse
  -   unknown name + server unreachable             → ok (documented
      best-effort pass — local development is not blocked)
  -   KNOWN name + server unreachable               → refuse (the
      T7 no-false-positive law: a mapping we cannot verify is a
      missing extension, never an assumed one)
"""

import sys
from collections.abc import Callable
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "py"))

import card_requires  # noqa: E402


DOWN = None                    # _fetch_object_info failure sentinel

# The canned object_info: node-class name -> its (opaque, key-only)
# descriptor; None is the server-unreachable sentinel (DOWN).
ObjectInfo = dict[str, dict[str, str]]
SetObjectInfo = Callable[[ObjectInfo | None], None]


@pytest.fixture()
def object_info(monkeypatch: pytest.MonkeyPatch) -> SetObjectInfo:
    """Canned object_info: KJNodes' nodes present, everything else
    absent; DOWN means 'server unreachable'."""
    state = {"data": {
        "ImageSharpenKJ": {}, "ModelAttentionBackend": {},
        "SomeOtherNode": {},
    }}

    def fake(server_url: str, timeout: float=5.0) -> ObjectInfo | None:
        return state["data"]

    monkeypatch.setattr(card_requires, "_fetch_object_info", fake)

    def _set(data: ObjectInfo | None) -> None:
        state["data"] = data

    return _set


# ── the no-requires doors ──────────────────────────────────────────

def test_empty_requires_is_ok(object_info: SetObjectInfo) -> None:
    assert card_requires.check_card_requires([]) == (True, "")


def test_none_requires_is_ok(object_info: SetObjectInfo) -> None:
    assert card_requires.check_card_requires(None) == (True, "")


# ── S1: known mapping + nodes live ────────────────────────────────

def test_known_extension_with_live_nodes_ok(object_info: SetObjectInfo) -> None:
    ok, msg = card_requires.check_card_requires(["ComfyUI-KJNodes"])
    assert ok, msg


def test_known_extension_nodes_absent_refuses(object_info: SetObjectInfo) -> None:
    object_info({"SomeOtherNode": {}})          # KJ nodes gone
    ok, msg = card_requires.check_card_requires(["ComfyUI-KJNodes"])
    assert not ok
    assert "ComfyUI-KJNodes" in msg


# ── S2: the disk fallback ──────────────────────────────────────────

def test_disk_fallback_satisfies_known_extension(object_info: SetObjectInfo,
                                                 tmp_path: Path) -> None:
    object_info({})                             # no nodes live
    (tmp_path / "comfyui-kjnodes").mkdir()      # case-insensitive dir
    ok, msg = card_requires.check_card_requires(
        ["ComfyUI-KJNodes"], custom_nodes_dir=str(tmp_path))
    assert ok, msg


def test_disk_fallback_miss_still_refuses(object_info: SetObjectInfo, tmp_path: Path) -> None:
    object_info({})
    ok, msg = card_requires.check_card_requires(
        ["ComfyUI-KJNodes"], custom_nodes_dir=str(tmp_path / "none"))
    assert not ok
    assert "ComfyUI-KJNodes" in msg


# ── the unknown-name heuristic ─────────────────────────────────────

def test_unknown_name_heuristic_hit_ok(object_info: SetObjectInfo) -> None:
    # "somelogicpack" normalized == "somelogicpack" in SomeLogicPackNode
    object_info({"SomeLogicPackNode": {}})
    ok, msg = card_requires.check_card_requires(["some-logic-pack"])
    assert ok, msg


def test_unknown_name_heuristic_miss_refuses(object_info: SetObjectInfo) -> None:
    object_info({"SomeOtherNode": {}})
    ok, msg = card_requires.check_card_requires(["FakeExt12345"])
    assert not ok
    assert "FakeExt12345" in msg


# ── unreachable-server discipline ──────────────────────────────────

def test_unknown_name_unreachable_passes_best_effort(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(card_requires, "_fetch_object_info",
                        lambda *a, **k: DOWN)
    ok, _msg = card_requires.check_card_requires(["FakeExt12345"])
    assert ok            # documented: never block local dev on a
                         # mapping we don't even have


def test_known_name_unreachable_refuses(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """T7's no-false-positive law: a KNOWN mapping that cannot be
    verified against a live server is MISSING, never assumed."""
    monkeypatch.setattr(card_requires, "_fetch_object_info",
                        lambda *a, **k: DOWN)
    ok, msg = card_requires.check_card_requires(
        ["ComfyUI-KJNodes"], custom_nodes_dir=str(tmp_path / "none"))
    assert not ok
    assert "ComfyUI-KJNodes" in msg


# ── mixed lists name every miss ────────────────────────────────────

def test_mixed_real_and_fake_refuses_naming_the_fake(object_info: SetObjectInfo) -> None:
    ok, msg = card_requires.check_card_requires(
        ["ComfyUI-KJNodes", "FakeExt12345"])
    assert not ok
    assert "FakeExt12345" in msg
    assert "ComfyUI-KJNodes" not in msg   # the satisfied one is not
                                          # blamed


# ── the mapping table's own shape ──────────────────────────────────

def test_node_type_table_values_are_str_sets() -> None:
    for ext, nodes in card_requires.EXTENSION_NODE_TYPES.items():
        assert isinstance(ext, str) and ext
        assert isinstance(nodes, set) and nodes
        assert all(isinstance(n, str) and n for n in nodes)

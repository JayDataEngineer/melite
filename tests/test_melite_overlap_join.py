"""THE OVERLAP-JOIN DECODE SEAT (F61, the 2026-11-14 refine-seam
audit): a refine bag's consecutive windows re-render the same source
span, and the film tail resolves that duplication IN-GRAPH — the
vendored MeliteOverlapJoinVideos node crossfades the overlap (frames
AND soundtrack, one symmetric ramp) instead of the hard cut the
head-trim + concat path mounts. These walls drive the node DIRECTLY
on synthetic films encoded with the same PyAV seat SaveVideo rides,
so the blend itself is proven on every box with the stack. Where
av/torch are absent the seat skips LOUD — CI owns the stack
guarantee.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest

PACKAGE_ROOT = Path(__file__).resolve().parents[1] / "vendor" / "comfyui_extensions" / "melite-utility-nodes"

av = pytest.importorskip("av", reason="PyAV is the join node's decode seat (pip install av)")
torch = pytest.importorskip("torch", reason="the join blends as torch tensors")
np = pytest.importorskip("numpy", reason="the synthetic members encode from numpy planes")


def _load_nodes():
    spec = importlib.util.spec_from_file_location("_melite_utility_overlap_test", PACKAGE_ROOT / "nodes.py")
    assert spec is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules["_melite_utility_overlap_test"] = module
    spec.loader.exec_module(module)
    return module


def _write_film(path: Path, frames: int, fps: int, base: float):
    """One flat-colour member (grey `base`), silent track — the same
    container seat SaveVideo writes and the node decodes."""
    container = av.open(str(path), mode="w")
    stream = container.add_stream("libx264", rate=fps)
    stream.width, stream.height, stream.pix_fmt = 32, 32, "yuv420p"
    for _ in range(frames):
        plane = np.full((32, 32, 3), int(round(base * 255)), dtype=np.uint8)
        frame = av.VideoFrame.from_ndarray(plane, format="rgb24")
        for packet in stream.encode(frame):
            container.mux(packet)
    for packet in stream.encode():
        container.mux(packet)
    container.close()


@pytest.fixture()
def nodes():
    return _load_nodes()


@pytest.fixture()
def two_members(tmp_path, monkeypatch):
    """Two flat-grey members (0.2 / 0.8) in a stubbed output dir; the
    prefix grammar is the concat's own (counter-named writes)."""
    (tmp_path / "run_w0_00001_.mp4").unlink(missing_ok=True)
    _write_film(tmp_path / "run_w0_00001_.mp4", 24, 24, 0.2)
    _write_film(tmp_path / "run_w1_00001_.mp4", 24, 24, 0.8)
    import types
    stub = types.SimpleNamespace(get_output_directory=lambda: str(tmp_path))
    monkeypatch.setitem(sys.modules, "folder_paths", stub)
    yield "run_w0,run_w1"
    monkeypatch.delitem(sys.modules, "folder_paths", raising=False)


def test_the_count_law_assembled_minus_overlaps(nodes, two_members):
    images, audio, fps = nodes.MeliteOverlapJoinVideos().join(
        two_members, "11", "boundary-token")
    assert images.shape[0] == 24 + 24 - 11
    assert fps == 24.0


def test_the_ramp_law_walks_between_the_renders(nodes, two_members):
    images, _audio, _fps = nodes.MeliteOverlapJoinVideos().join(
        two_members, "11", "boundary-token")
    blended = images[24 - 11:24]
    # the symmetric ramp: begins as the left render, ends as the
    # right render, exact even mix at the middle frame (odd overlap)
    assert blended[0, 0, 0, 0].item() == pytest.approx(0.2, abs=0.02)
    assert blended[-1, 0, 0, 0].item() == pytest.approx(0.8, abs=0.02)
    assert blended[5, 0, 0, 0].item() == pytest.approx(0.5, abs=0.02)
    steps = blended[:, 0, 0, 0].tolist()
    assert all(b > a for a, b in zip(steps, steps[1:])), steps


def test_the_join_grammar_refuses_loud(nodes):
    # count mismatch, a zero overlap (the concat's seat), a non-integer
    for overlaps, voice in [
        ("22", "one overlap per join"),
        ("22,0", "plain concat"),
        ("22,x", "whole frame count"),
    ]:
        with pytest.raises(RuntimeError, match=voice):
            nodes._overlap_counts(overlaps, 3)
    with pytest.raises(RuntimeError, match="no join"):
        nodes._overlap_counts("", 1)


def test_an_overlap_eating_a_member_refuses_loud(nodes, two_members):
    with pytest.raises(RuntimeError, match="un-blended frame on both sides"):
        nodes.MeliteOverlapJoinVideos().join(two_members, "24", "boundary-token")


def test_the_boundary_token_is_required(nodes, two_members):
    with pytest.raises(RuntimeError, match="'after' is empty"):
        nodes.MeliteOverlapJoinVideos().join(two_members, "11", " ")

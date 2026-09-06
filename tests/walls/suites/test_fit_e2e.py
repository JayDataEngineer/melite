"""fit e2e wall (fit-card stroke 2a): real SOMAX body + real keeper props.

Reads the meld checkout (MELD_MODELS_DIR, skipped when absent so walls stay
green off-estate) and proves, on re-parsed OUTPUT bytes: the prop node is
grafted under the bone with Unity-findable naming, animations and skin
survive, measurements are anatomical, and the fit law generalizes across
body sizes (2x body -> 2x hat scale and seat). No GPU, no queue, no network.
"""

import json
import os
import sys

import numpy as np
import pytest
from pathlib import Path

from _anchor import REPO

sys.path.insert(0, os.path.join(str(REPO), 'tools'))

from fit_spec import AttachmentRow
from fit_prop import bind_worlds, build_glb, fit_file, parse_glb

# glTF documents are JSON (no future-import here — old-style alias).
JsonValue = dict[str, "JsonValue"] | list["JsonValue"] | str | int | float | bool | None

MODELS = os.environ.get(
    'MELD_MODELS_DIR',
    os.path.expanduser('~/Documents/programs/games/meld/unity/Assets/PhaseB/Resources/models'),
)
BODY = os.path.join(MODELS, 'base_human_pipeline.glb')
PROPS = {
    'keeper_hat': os.path.join(MODELS, 'keeper_hat.glb'),
    'keeper_sword': os.path.join(MODELS, 'keeper_sword.glb'),
    'keeper_trenchcoat': os.path.join(MODELS, 'keeper_trenchcoat.glb'),
}
HAT_ROW = {
    'Model': 'keeper_hat', 'Bone': 'mixamorig:Head', 'Rotation': [0, 180, 0],
    'FitRatio': 1, 'FitRefBone': 'mixamorig:HeadTop_End',
    'FitRefBone2': 'mixamorig:Neck', 'SeatRatio': 0.22,
}
SWORD_ROW = {
    'Model': 'keeper_sword', 'Bone': 'mixamorig:RightHand',
    'Align': 'grip', 'SheatheBone': 'mixamorig:RightUpLeg',
    'Motion': 'keeper_sword1h',
    'FingerBone': 'mixamorig:RightHandMiddle1',
    'ThumbBone': 'mixamorig:RightHandThumb1',
    'TargetWidth': 0.25,
}
COAT_ROW = {
    'Model': 'keeper_trenchcoat', 'Bone': 'mixamorig:Spine',
    'Position': [0, 0, 0], 'Rotation': [0, 0, 0],
}

need_models = pytest.mark.skipif(
    not (os.path.isfile(BODY) and all(os.path.isfile(p) for p in PROPS.values())),
    reason='meld checkout absent (set MELD_MODELS_DIR)',
)


def _parse(blob: bytes) -> tuple[dict[str, JsonValue], bytes, dict[str, int], dict[int, np.ndarray]]:
    gltf, bindata = parse_glb(blob)
    names, worlds = bind_worlds(gltf)
    return gltf, bindata, names, worlds


def _parent_of(gltf: dict[str, JsonValue], idx: int) -> int | None:
    for i, n in enumerate(gltf['nodes']):
        if idx in n.get('children', []):
            return i
    return None


@need_models
def test_hat_seats_on_the_head(tmp_path: Path) -> None:
    blob, record = fit_file(BODY, PROPS['keeper_hat'], AttachmentRow.from_manifest_row(HAT_ROW))
    gltf, _bin, names, worlds = _parse(blob)
    assert 'keeper_hat' in names
    hat_idx = names['keeper_hat']
    assert _parent_of(gltf, hat_idx) == names['mixamorig:Head']
    assert len(gltf['animations']) == 3
    assert len(gltf['skins'][0]['joints']) == 77
    m = record['measured']
    assert m['span_m'] == pytest.approx(0.299, abs=0.02)
    assert m['scale'] == pytest.approx(m['span_m'] / (m['prop_width_m'] / m['scale']), rel=1e-6)
    assert m['seat_drop_m'] == pytest.approx(m['span_m'] * 0.22, rel=1e-6)
    out = str(tmp_path / 'fitted_hat.glb')
    open(out, 'wb').write(blob)
    assert os.path.getsize(out) > 2000000


@need_models
def test_sword_grip_point_locks_to_the_hand(tmp_path: Path) -> None:
    row = AttachmentRow.from_manifest_row(SWORD_ROW)
    blob, record = fit_file(BODY, PROPS['keeper_sword'], row)
    gltf, _bin, names, worlds = _parse(blob)
    assert _parent_of(gltf, names['keeper_sword']) == names['mixamorig:RightHand']
    m = record['measured']
    assert m['prop_width_m'] == pytest.approx(0.25, rel=1e-6)
    assert m['longest_axis'] == 1
    bone_pos = worlds[names['mixamorig:RightHand']][:3, 3]
    finger_pos = worlds[names['mixamorig:RightHandMiddle1']][:3, 3]
    local = np.array(record['local_matrix'])
    hat_world_check = worlds[names['mixamorig:RightHand']] @ local
    grip_world = hat_world_check @ np.array([*m['grip_local'], 1.0])
    assert float(np.linalg.norm(grip_world[:3] - bone_pos)) < 1e-6
    long_col = hat_world_check[:3, m['longest_axis']]
    long_col = long_col / float(np.linalg.norm(long_col))
    want = finger_pos - bone_pos
    want = want / float(np.linalg.norm(want))
    assert abs(float(long_col @ want)) > 0.999


@need_models
def test_coat_sockets_identity_on_the_spine() -> None:
    blob, record = fit_file(BODY, PROPS['keeper_trenchcoat'], AttachmentRow.from_manifest_row(COAT_ROW))
    gltf, _bin, names, worlds = _parse(blob)
    assert _parent_of(gltf, names['keeper_trenchcoat']) == names['mixamorig:Spine']
    assert record['measured']['scale'] == pytest.approx(1.0)
    assert len(gltf['animations']) == 3


@need_models
def test_fit_generalizes_across_body_sizes(tmp_path: Path) -> None:
    body, body_bin = parse_glb(open(BODY, 'rb').read())
    roots = body.get('scenes', [{}])[0].get('nodes', [])
    for r in roots:
        n = body['nodes'][r]
        s = n.get('scale', [1.0, 1.0, 1.0])
        n['scale'] = [s[0] * 2.0, s[1] * 2.0, s[2] * 2.0]
    big_path = str(tmp_path / 'big_body.glb')
    open(big_path, 'wb').write(build_glb(body, body_bin))
    _b1, small = fit_file(BODY, PROPS['keeper_hat'], AttachmentRow.from_manifest_row(HAT_ROW))
    _b2, big = fit_file(big_path, PROPS['keeper_hat'], AttachmentRow.from_manifest_row(HAT_ROW))
    assert big['measured']['span_m'] == pytest.approx(2.0 * small['measured']['span_m'], rel=1e-6)
    assert big['measured']['scale'] == pytest.approx(2.0 * small['measured']['scale'], rel=1e-6)
    assert big['measured']['seat_drop_m'] == pytest.approx(2.0 * small['measured']['seat_drop_m'], rel=1e-6)


@need_models
def test_unknown_bone_is_loud(tmp_path: Path) -> None:
    row = AttachmentRow(model='keeper_hat', bone='mixamorig:Nose', mode='socket')
    with pytest.raises(ValueError, match='mixamorig:Nose'):
        fit_file(BODY, PROPS['keeper_hat'], row)

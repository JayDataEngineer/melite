"""fit parity wall (fit-card stroke 2b): the pack twin == the estate twin.

fit_surgery.py (melite-poser-nodes, runs on ComfyUI) is mechanically
derived from tools/fit_prop.py; this wall proves they agree bit-for-bit
on the real keeper props (measured values + local matrices) and refuse
the same rows. A drift between them is a failure, never a silent second
truth. Skips cleanly off-estate (MELD_MODELS_DIR).
"""

import importlib.util
import json
import os
import sys
from types import ModuleType

import pytest

from _anchor import REPO

sys.path.insert(0, os.path.join(str(REPO), 'tools'))

from fit_spec import AttachmentRow
from fit_prop import fit_file

_PACK = os.path.join(str(REPO), 'vendor', 'comfyui_extensions',
                     'melite-poser-nodes', 'fit_surgery.py')


def _pack() -> ModuleType:
    spec = importlib.util.spec_from_file_location('fit_surgery_pack', _PACK)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


MODELS = os.environ.get(
    'MELD_MODELS_DIR',
    os.path.expanduser('~/Documents/programs/games/meld/unity/Assets/PhaseB/Resources/models'),
)
BODY = os.path.join(MODELS, 'base_human_pipeline.glb')
CASES = {
    'keeper_hat': (
        os.path.join(MODELS, 'keeper_hat.glb'),
        {'Model': 'keeper_hat', 'Bone': 'mixamorig:Head', 'Rotation': [0, 180, 0],
         'FitRatio': 1, 'FitRefBone': 'mixamorig:HeadTop_End',
         'FitRefBone2': 'mixamorig:Neck', 'SeatRatio': 0.22},
    ),
    'keeper_sword': (
        os.path.join(MODELS, 'keeper_sword.glb'),
        {'Model': 'keeper_sword', 'Bone': 'mixamorig:RightHand',
         'Align': 'grip', 'SheatheBone': 'mixamorig:RightUpLeg',
         'Motion': 'keeper_sword1h', 'FingerBone': 'mixamorig:RightHandMiddle1',
         'ThumbBone': 'mixamorig:RightHandThumb1', 'TargetWidth': 0.25},
    ),
    'keeper_trenchcoat': (
        os.path.join(MODELS, 'keeper_trenchcoat.glb'),
        {'Model': 'keeper_trenchcoat', 'Bone': 'mixamorig:Spine',
         'Position': [0, 0, 0], 'Rotation': [0, 0, 0]},
    ),
}

need_models = pytest.mark.skipif(
    not (os.path.isfile(BODY) and all(os.path.isfile(p) for p, _r in CASES.values())),
    reason='meld checkout absent (set MELD_MODELS_DIR)',
)


@need_models
@pytest.mark.parametrize('case', sorted(CASES))
def test_twins_agree_bit_for_bit(case: str) -> None:
    prop_path, meld_row = CASES[case]
    pack = _pack()
    body_bytes = open(BODY, 'rb').read()
    prop_bytes = open(prop_path, 'rb').read()
    _blob, estate_record = fit_file(
        BODY, prop_path, AttachmentRow.from_manifest_row(meld_row))
    pack_blob, pack_record = pack.fit_prop_bytes(body_bytes, prop_bytes, meld_row)
    assert pack_record['model'] == case
    assert pack_record['measured'] == estate_record['measured']
    assert pack_record['local_matrix'] == estate_record['local_matrix']
    assert len(pack_blob) == len(_blob)


@need_models
def test_twins_refuse_the_same_rows() -> None:
    pack = _pack()
    body_bytes = open(BODY, 'rb').read()
    prop_bytes = open(CASES['keeper_hat'][0], 'rb').read()
    bad = [
        dict(CASES['keeper_hat'][1], Bone='mixamorig:Nose'),
        dict(CASES['keeper_sword'][1], Position=[0.1, 0, 0]),
        dict(CASES['keeper_trenchcoat'][1], FitRatio=1.0),
        {'Bone': 'mixamorig:Head'},
    ]
    for row in bad:
        try:
            AttachmentRow.from_manifest_row(row)
            estate_ok = True
        except Exception:
            estate_ok = False
        if estate_ok:
            try:
                fit_file(BODY, CASES['keeper_hat'][0],
                         AttachmentRow.from_manifest_row(row))
                estate_ok = True
            except ValueError:
                estate_ok = False
        try:
            pack.fit_prop_bytes(body_bytes, prop_bytes, row)
            pack_ok = True
        except ValueError:
            pack_ok = False
        assert estate_ok == pack_ok == False, 'row %r: estate=%s pack=%s' % (row, estate_ok, pack_ok)

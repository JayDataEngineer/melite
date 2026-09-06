"""fit card wall (fit-card stroke 2b): the queue-native door speaks the contract.

No GPU, no queue, no network: the card class shape, the schema gate,
the phase-1 validation door (real meld paths when the checkout is
present), and the phase-2 graph (FitProp + proof views, row_json == the
meld row Unity consumes). The compose-gate suite sweeps the arm shape
tree-wide; this wall pins fit meaning.
"""

import importlib.util
import json
import os
import sys
from collections.abc import Iterator
from types import ModuleType

import pytest

from _anchor import REPO

FIT_PY = os.path.join(REPO, 'plugins', 'engines', 'comfyui',
                      'action_cards', '3d', 'fit', 'py')
MODELS = os.environ.get(
    'MELD_MODELS_DIR',
    os.path.expanduser('~/Documents/programs/games/meld/unity/Assets/PhaseB/Resources/models'),
)
BODY = os.path.join(MODELS, 'base_human_pipeline.glb')
HAT = os.path.join(MODELS, 'keeper_hat.glb')

HAT_PARAMS = {
    'body_glb': BODY, 'prop_glb': HAT, 'bone': 'mixamorig:Head',
    'align': 'socket', 'position': '0,0,0', 'rotation': '0,180,0',
    'fit_ratio': 1.0, 'fit_ref_bone': 'mixamorig:HeadTop_End',
    'fit_ref_bone2': 'mixamorig:Neck', 'seat_ratio': 0.22,
}

need_models = pytest.mark.skipif(
    not (os.path.isfile(BODY) and os.path.isfile(HAT)),
    reason='meld checkout absent (set MELD_MODELS_DIR)',
)


@pytest.fixture(scope='module', autouse=True)
def _estate_paths() -> Iterator[None]:
    for p in (os.path.join(REPO, 'py'),
              os.path.join(REPO, 'plugins', 'engines', 'comfyui'),
              os.path.join(REPO, 'plugins', 'engines', 'comfyui', 'compose')):
        if p not in sys.path:
            sys.path.insert(0, p)
    yield


def _load(name: str, fname: str) -> ModuleType:
    spec = importlib.util.spec_from_file_location(
        name, os.path.join(FIT_PY, fname),
        submodule_search_locations=[FIT_PY])
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


def test_card_shape() -> None:
    from melite_cards import load_card_py
    cls = load_card_py(os.path.join(FIT_PY, 'card.py'), 'comfyui')
    assert cls.id == 'fit'
    assert cls.genre == '3d'
    assert cls.ability.get('default_family') == 'fit'
    assert [m.id for m in (cls.models or ())] == ['fit']
    assert 'melite-poser-nodes' in (cls.requires or ())
    fields = {f.name for f in getattr(cls, '_fields_', ())}
    assert {'body_glb', 'prop_glb', 'bone', 'align', 'fit_ratio',
            'fit_ref_bone', 'finger_bone', 'target_width'} <= fields


def test_tool_snapshot_in_sync() -> None:
    from melite_cards import load_card_py, tool_manifests
    cls = load_card_py(os.path.join(FIT_PY, 'card.py'), 'comfyui')
    snap = os.path.join(os.path.dirname(FIT_PY), 'tool.json')
    want = json.dumps(tool_manifests(cls), indent=2, ensure_ascii=False) + '\n'
    assert open(snap, encoding='utf-8').read() == want


def test_schema_gates() -> None:
    schema = _load('fit_card_schema_w', 'schema.py')
    doc = schema.parse_card({'params': dict(HAT_PARAMS)})
    meld = doc.meld_row('keeper_hat')
    assert meld['Model'] == 'keeper_hat'
    assert meld['Bone'] == 'mixamorig:Head'
    assert meld['Rotation'] == [0.0, 180.0, 0.0]
    assert meld['Align'] == ''
    assert meld['SeatOffsetY'] == 0.0
    with pytest.raises(Exception):
        schema.parse_card({'params': dict(HAT_PARAMS, align='weld' )})
    with pytest.raises(Exception):
        schema.parse_card({'params': dict(HAT_PARAMS, fit_ratio=-1.0)})
    with pytest.raises(Exception):
        schema.parse_card({'params': dict(HAT_PARAMS, position='0,0' )})
    with pytest.raises(Exception):
        schema.parse_card({'params': dict(HAT_PARAMS, weld_strength=9)})
    with pytest.raises(Exception):
        schema.FitParams.model_validate(dict(HAT_PARAMS, position='a,b,c'))


@need_models
def test_phase1_door() -> None:
    compose = _load('fit_card_compose_w', 'compose.py')
    rc, _yaml, extra, err = compose.compose({'params': dict(HAT_PARAMS)}, 'fit', '')
    assert rc == 0, err
    assert extra['inputs']['body_glb'] == BODY
    meld = extra['inputs']['attachment']
    assert meld['Model'] == 'keeper_hat'
    assert meld['FitRefBone2'] == 'mixamorig:Neck'
    rc, _y, _e, err = compose.compose({'params': dict(HAT_PARAMS, prop_glb='')}, 'fit', '')
    assert rc == -3 and 'prop_glb' in err
    rc, _y, _e, err = compose.compose({'params': dict(HAT_PARAMS, bone='')}, 'fit', '')
    assert rc == -3 and 'bone' in err
    swordish = dict(HAT_PARAMS, align='grip', finger_bone='mixamorig:RightHandMiddle1',
                      position='0.1,0,0', fit_ratio=0.0, fit_ref_bone='', fit_ref_bone2='')
    rc, _y, _e, err = compose.compose({'params': swordish}, 'fit', '')
    assert rc == -3 and 'grip' in err
    coatish = dict(HAT_PARAMS, align='socket', fit_ratio=0.0, fit_ref_bone='', fit_ref_bone2='',
                      finger_bone='mixamorig:RightHandMiddle1')
    rc, _y, _e, err = compose.compose({'params': coatish}, 'fit', '')
    assert rc == -3 and 'socket' in err
    refles = dict(HAT_PARAMS, fit_ratio=1.0, fit_ref_bone='', fit_ref_bone2='')
    rc, _y, _e, err = compose.compose({'params': refles}, 'fit', '')
    assert rc == -3 and 'fit_ref_bone' in err


@need_models
def test_phase2_graph_runs_the_meld_row() -> None:
    compose = _load('fit_card_compose_w2', 'compose.py')
    rc, skel, _extra, err = compose.compose({'params': dict(HAT_PARAMS)}, 'fit', 'run-probe')
    assert rc == 0, err
    text = json.dumps(skel, default=str)
    assert 'FitProp' in text, 'graph has no FitProp node'
    assert 'keeper_hat' in text
    assert text.count('SaveImage') >= 8
    assert 'RayRenderGLBViews' in text

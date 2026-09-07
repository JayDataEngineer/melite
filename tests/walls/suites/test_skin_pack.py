"""skin-pack wall (skin-card stroke 1, design docs/design/skin-card.md).

No GPU, no network: spec-row construction refusals, the 20-kind table
verbatim from meld 4.36, generator determinism + tiling, and the
Unity-consumable sidecar round-trip.
"""

import io
import json
import os
import sys

import numpy as np
import pytest
from pathlib import Path
from pydantic import ValidationError

from _anchor import REPO

sys.path.insert(0, os.path.join(str(REPO), 'tools'))

from skin_spec import KIND_TABLE, SKIN_SEED, SkinSpec, row_for, sidecar
from skin_pack import generate_detail_maps, main, write_pack

EXPECTED_KINDS = [
    'keeper', 'ash_nomad', 'villager_elder', 'villager',
    'caravan_trader', 'amf_warden', 'cherusci_scrivener', 'marrow_raider',
    'amalgam_horror', 'arena_factor', 'bone_crane', 'dune_hound',
    'emberwing', 'gloom_tortoise', 'husk_stalker', 'ironvein_construct',
    'meld_creature', 'moss_elk', 'ridge_lizard', 'sand_skimmer',
]


def test_kind_table_has_all_20_kinds() -> None:
    assert [r.kind for r in KIND_TABLE] == EXPECTED_KINDS


def test_kind_table_textures_match_meld_436() -> None:
    by_kind = {r.kind: r for r in KIND_TABLE}
    assert by_kind['keeper'].texture == 'young_caucasian_male'
    assert by_kind['keeper'].tint == (0.85, 0.70, 0.55)
    assert by_kind['villager'].texture == 'young_caucasian_female'
    assert by_kind['villager_elder'].texture == 'old_caucasian_male'
    for kind in EXPECTED_KINDS[8:]:
        assert by_kind[kind].category == 'creature'
        assert by_kind[kind].texture == 'flat_placeholder'


def test_bad_tint_refuses_at_construction() -> None:
    from skin_spec import KindSkinRow
    with pytest.raises(ValidationError):
        KindSkinRow(kind='x', tint=(1.5, 0.0, 0.0), texture='t')
    # lax-wire parity: bool coerces (True -> 1.0) like every estate row — range still binds
    assert KindSkinRow(kind='x', tint=(True, 0.0, 0.0), texture='t').tint == (1.0, 0.0, 0.0)


def test_bad_size_seed_uv_refuse() -> None:
    with pytest.raises(ValidationError):
        SkinSpec(kind='keeper', size=100)
    with pytest.raises(ValidationError):
        SkinSpec(kind='keeper', size=-512)
    # GATE S: -1 is the RANDOM sentinel (admitted at the row, minted
    # compose-side); below -1 refuses, and the generator refuses -1.
    assert SkinSpec(kind='keeper', seed=-1).seed == -1
    with pytest.raises(ValidationError):
        SkinSpec(kind='keeper', seed=-2)
    with pytest.raises(ValidationError):
        SkinSpec(kind='keeper', uv='makehuman')


def test_generator_refuses_the_sentinel() -> None:
    """-1 never mints inside deterministic bytes (compose-side mint)."""
    with pytest.raises(ValueError, match="-1"):
        generate_detail_maps(256, -1)


def test_row_for_unknown_names_the_kind() -> None:
    with pytest.raises(KeyError, match='nope'):
        row_for('nope')


def test_same_seed_gives_same_bytes() -> None:
    a1, n1 = generate_detail_maps(128, SKIN_SEED)
    a2, n2 = generate_detail_maps(128, SKIN_SEED)
    assert np.array_equal(a1, a2)
    assert np.array_equal(n1, n2)
    a3, _ = generate_detail_maps(128, SKIN_SEED + 1)
    assert not np.array_equal(a1, a3)


def test_maps_tile_across_the_seam() -> None:
    albedo, _ = generate_detail_maps(128, SKIN_SEED)
    f = albedo.astype(float)
    seam = np.abs(f[0] - f[-1]).mean() + np.abs(f[:, 0] - f[:, -1]).mean()
    interior = np.abs(np.diff(f, axis=0)).mean() + np.abs(np.diff(f, axis=1)).mean()
    assert seam <= 2 * interior


def test_write_pack_round_trips_controller_schema(tmp_path: Path) -> None:
    spec = SkinSpec(kind='keeper', size=256)
    paths = write_pack(str(tmp_path), spec)
    for key in ('albedo', 'normal', 'sidecar'):
        assert os.path.isfile(paths[key])
    from PIL import Image
    assert Image.open(paths['albedo']).size == (256, 256)
    assert Image.open(paths['normal']).size == (256, 256)
    body = json.load(open(paths['sidecar'], encoding='utf-8'))
    assert body == {
        'kind': 'keeper',
        'tint': [0.85, 0.70, 0.55],
        'texture': 'young_caucasian_male',
        'category': 'humanoid',
        'uv': 'somax',
        'size': 256,
        'seed': SKIN_SEED,
        # Meld 4.38 v1.3-v1.4 shader law (skin_spec port 2026-09-07):
        # bump OFF, matte, triplanar detail.
        'normal_strength': 0.0,
        'smoothness': 0.18,
        'metallic': 0.0,
        'triplanar_density': 3.0,
    }
    assert sidecar(spec, row_for('keeper')) == body


def test_cli_is_loud_on_bad_kind(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    assert main(['--kind', 'nope', '--out', str(tmp_path)]) == 2
    assert 'nope' in capsys.readouterr().err


def test_cli_writes_a_pack(tmp_path: Path) -> None:
    assert main(['--kind', 'villager', '--out', str(tmp_path), '--size', '256']) == 0
    assert os.path.isfile(os.path.join(str(tmp_path), 'villager.json'))

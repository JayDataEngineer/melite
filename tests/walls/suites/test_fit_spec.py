"""fit-spec wall (fit-card stroke 1, design docs/design/fit-card.md).

No GPU, no network: keeper.json 4-row pin (inline copies — walls never
reach into the meld checkout), manifest round-trip, loud-conflict
refusals, seat math, gate-stamp ownership.
"""

import pytest
from pydantic import ValidationError

from fit_spec import (
    AttachmentRow, FitMode, FitRequest, fit_width, seat_drop,
)

# keeper.json attachments, meld JSON keys, pinned verbatim (2026-09-06).
HAT = {
    'Model': 'keeper_hat', 'Bone': 'mixamorig:Head', 'Rotation': [0, 180, 0],
    'FitRatio': 1, 'FitRefBone': 'mixamorig:HeadTop_End',
    'FitRefBone2': 'mixamorig:Neck', 'SeatRatio': 0.22,
}
COAT = {
    'Model': 'keeper_trenchcoat', 'Bone': 'mixamorig:Spine',
    'Position': [0, 0, 0], 'Rotation': [0, 0, 0],
}
PANTS = {
    'Model': 'keeper_pants', 'Bone': 'mixamorig:Hips',
    'Position': [0, 0, 0], 'Rotation': [0, 0, 0],
}
SWORD = {
    'Model': 'keeper_sword', 'Bone': 'mixamorig:RightHand',
    'Align': 'grip', 'SheatheBone': 'mixamorig:RightUpLeg',
    'Motion': 'keeper_sword1h',
    'FingerBone': 'mixamorig:RightHandMiddle1',
    'ThumbBone': 'mixamorig:RightHandThumb1',
    'TargetWidth': 0.25,
}


def test_keeper_rows_derive_their_modes() -> None:
    assert AttachmentRow.from_manifest_row(HAT).mode is FitMode.fit
    assert AttachmentRow.from_manifest_row(COAT).mode is FitMode.socket
    assert AttachmentRow.from_manifest_row(PANTS).mode is FitMode.socket
    sword = AttachmentRow.from_manifest_row(SWORD)
    assert sword.mode is FitMode.grip
    assert sword.finger_bone == 'mixamorig:RightHandMiddle1'
    assert sword.target_width == 0.25


def test_hat_row_carries_the_fit_refs() -> None:
    hat = AttachmentRow.from_manifest_row(HAT)
    assert hat.fit_ref_bone == 'mixamorig:HeadTop_End'
    assert hat.fit_ref_bone2 == 'mixamorig:Neck'
    assert hat.fit_ratio == 1.0
    assert hat.seat_ratio == 0.22
    assert hat.is_authored()


def test_round_trip_is_verbatim() -> None:
    for raw in (HAT, COAT, PANTS, SWORD):
        row = AttachmentRow.from_manifest_row(raw)
        back = row.to_manifest_row()
        for key, value in raw.items():
            assert back[key] == value, (key, back[key], value)


def test_grip_plus_rotation_refuses_loudly() -> None:
    with pytest.raises(ValidationError, match='owns orientation'):
        AttachmentRow(model='s', bone='mixamorig:RightHand', mode=FitMode.grip,
                      finger_bone='mixamorig:RightHandMiddle1',
                      rotation=(0.0, 90.0, 0.0))


def test_fit_plus_target_width_refuses_loudly() -> None:
    with pytest.raises(ValidationError, match='owns width'):
        AttachmentRow(model='h', bone='mixamorig:Head', mode=FitMode.fit,
                      fit_ref_bone='mixamorig:HeadTop_End', fit_ratio=1.0,
                      target_width=0.25)


def test_fit_without_refs_refuses() -> None:
    with pytest.raises(ValidationError, match='fit_ref_bone'):
        AttachmentRow(model='h', bone='mixamorig:Head', mode=FitMode.fit,
                      fit_ratio=1.0)
    with pytest.raises(ValidationError, match='fit_ratio'):
        AttachmentRow(model='h', bone='mixamorig:Head', mode=FitMode.fit,
                      fit_ref_bone='mixamorig:HeadTop_End')


def test_grip_without_finger_refuses() -> None:
    with pytest.raises(ValidationError, match='finger_bone'):
        AttachmentRow(model='s', bone='mixamorig:RightHand', mode=FitMode.grip)


def test_socket_with_measure_knobs_refuses() -> None:
    with pytest.raises(ValidationError, match='never measure'):
        AttachmentRow(model='c', bone='mixamorig:Spine', fit_ratio=1.0)
    with pytest.raises(ValidationError, match='belong to mode=grip'):
        AttachmentRow(model='c', bone='mixamorig:Spine',
                      finger_bone='mixamorig:RightHandMiddle1')


def test_empty_names_and_bad_uv_refuse() -> None:
    with pytest.raises(ValidationError):
        AttachmentRow(model='', bone='mixamorig:Spine')
    with pytest.raises(ValidationError):
        AttachmentRow(model='c', bone='')
    row = AttachmentRow.from_manifest_row(COAT)
    with pytest.raises(ValidationError, match='bone-name stability'):
        FitRequest(body='b', prop='c', attachment=row, uv='makehuman')
    req = FitRequest(body='base_human', prop='keeper_hat', attachment=row)
    assert req.uv == 'somax'


def test_seat_math_measures_dont_guess() -> None:
    hat = AttachmentRow.from_manifest_row(HAT)
    assert seat_drop(0.25, hat) == pytest.approx(0.25 * 0.22)
    assert fit_width(0.25, hat) == pytest.approx(0.25)
    coat = AttachmentRow.from_manifest_row(COAT)
    with pytest.raises(ValueError, match='only fit measures'):
        fit_width(0.25, coat)
    with pytest.raises(ValueError, match='negative'):
        seat_drop(-1.0, hat)


def test_gate_stamp_is_the_only_writer() -> None:
    hat = AttachmentRow.from_manifest_row(HAT)
    cal = hat.stamped(0.013)
    assert cal.seat_offset_y == pytest.approx(0.013)
    assert not cal.is_authored()
    assert hat.is_authored()
    assert seat_drop(0.25, cal) == pytest.approx(0.25 * 0.22 + 0.013)

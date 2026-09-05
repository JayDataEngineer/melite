"""STRICT BODY WALL — the silent-drop class dies at the door.

(QUEUE LANE LAW, 2026-09-05) A start body MUST be {door: ...} plus
scalar run inputs. Body keys that the runner never reads are
pollution (they ride _request.json, lie in the tensor pool as inert
passengers, and teach callers the wrong shape). The C-era runner knob
names are explicitly refused — they survived a deprecation cycle as
silent drops; strict=True kills them at the door (py/gateway.py
_strict_body). The body-vocab is:

  - DOOR_KEYS  — the four door forms (yaml, flow, flow_inline, model).
                 yaml is the retired-spelling exclusion (loud 4xx).
  - the rest   — scalar run inputs (the model's params, open
                 vocabulary — the model class declares them).

This wall pins the retired-knob refusal + the C-era internal-key
refusal. Anything else that the runner doesn't read stays the run's
problem (not the gateway's); the model class is the door for
knob-shape validation.

The retired-knob list is the implementation's SSOT
(py/gateway.py:RETIRED_RUNNER_KNOBS); the wall imports it directly
so the test can't drift from the implementation. To ADD a knob to
the refusal set, edit the constant — the wall's parametrize grows
in lockstep.

No GPU, no network."""

from _anchor import REPO  # noqa: E402

import pytest  # noqa: E402

import gateway  # noqa: E402
from gateway import RETIRED_RUNNER_KNOBS  # noqa: E402  (SSOT, no second list)


# A. the retired runner knob set — every name the C runner read but
# the py runner does NOT. A body carrying any of these is a silent-drop
# attempt; the door must refuse loud (400, not 200 with a dropped key).
# The list is RETIRED_RUNNER_KNOBS (imported above from gateway, the SSOT).


@pytest.mark.parametrize("knob", RETIRED_RUNNER_KNOBS)
def test_retired_runner_knob_refused(knob):
    """The C-era runner knobs are silent-drop attempts. Loud 400."""
    body = {"flow": "audio-native-tts", knob: 2}
    with pytest.raises(gateway.ValidationError) as e:
        gateway.resolve_request(body)
    msg = str(e.value)
    assert knob in msg, (knob, msg)
    assert "silent-drop" in msg, msg


def test_multiple_retired_knobs_refused_at_once():
    body = {"flow": "audio-native-tts",
            "start_from": 2, "overrides": {"seed": 1}}
    with pytest.raises(gateway.ValidationError) as e:
        gateway.resolve_request(body)
    msg = str(e.value)
    assert "start_from" in msg and "overrides" in msg, msg


def test_retired_knobs_constant_is_nonempty_and_frozen():
    """The retired-knob set must be non-empty (a silent-drop attempt
    is the reason the wall exists) AND frozen (mutation at call time
    is the same class of drift we're guarding against)."""
    assert len(RETIRED_RUNNER_KNOBS) >= 1
    # frozenset refuses mutation loud
    with pytest.raises((AttributeError, TypeError)):
        # type: ignore[attr-defined]
        RETIRED_RUNNER_KNOBS.add("would-be-added")


# B. C-era internal naming (the "_" prefix) — the runner never read
# these; they leaked into the sidecar as pollution. Loud 400.
def test_internal_underscore_key_refused():
    body = {"flow": "audio-native-tts", "_internal": 1}
    with pytest.raises(gateway.ValidationError) as e:
        gateway.resolve_request(body)
    assert "_internal" in str(e.value)


# C. model params are OPEN vocabulary — they ride through initial_pool
# as scalar inputs. A body carrying a model param MUST pass.
def test_model_params_pass_through():
    """The model class declares its params; the body carries them as
    scalar inputs (open vocabulary). They ride initial_pool, NOT the
    door — strict does not constrain them."""
    body = {
        "flow": "audio-native-tts",
        "prompt": "a serene mountain stream",
        "negative_prompt": "harsh, distorted",
        "seed": 42,
    }
    graph = gateway.resolve_request(body)
    assert graph is not None


# D. the ambiguity check stays (multiple doors refused) — orthogonal
# to strict body keys, but adjacent (one door + nothing else).
def test_two_doors_still_refused():
    body = {"flow": "audio-native-tts", "model": "krea-2"}
    with pytest.raises(gateway.ValidationError) as e:
        gateway.resolve_request(body)
    assert "ambiguous" in str(e.value).lower()


# E. the retired-spelling door (yaml) still 400s — orthogonal to
# strict, but the door's own refusal shape.
def test_yaml_door_still_refused():
    body = {"yaml": "audio-native-tts"}
    with pytest.raises(gateway.ValidationError) as e:
        gateway.resolve_request(body)
    assert "no flow selected" in str(e.value).lower()


# F. the strict check happens BEFORE the door selection — a body with
# a retired knob AND no door is refused on the knob class first
# (so the door shape doesn't mask a silent-drop attempt).
def test_strict_before_door_selection():
    body = {"start_from": 2, "prompt": "x"}
    with pytest.raises(gateway.ValidationError) as e:
        gateway.resolve_request(body)
    assert "start_from" in str(e.value)


# G. happy path: door + scalar input + nested inputs (the model class's
# card_extra_inputs) — all ride through.
def test_full_happy_body_passes():
    body = {
        "flow": "audio-native-tts",
        "prompt": "wind chimes",
        "seed": 7,
    }
    graph = gateway.resolve_request(body)
    assert graph is not None

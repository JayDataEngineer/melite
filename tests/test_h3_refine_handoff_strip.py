"""THE F3-14 ENGINE CURE WALL (operator order, 2026-11-15): the
carried refine's engine death is cured at the handoff that burned.

The burn (2026-11-05, twice at the operator's press): a 2-window
carried refine died MID-BILL at MinimaxH3LatentUpscaler3DRefineHandoff
with ``ValueError: Drift-Control AV packed mask does not match its
audio stream``. The mechanism: the continuation installs Drift-Control
AV on the MODEL, seeding its mask state from the CARRIED WINDOW's
stream shapes; the refinement's second pass then samples the ENLARGED
learned latent through that same patched MODEL, ComfyUI expands the
packed denoise mask for the enlarged grid, and the state's
install-time split finds an audio tail that no longer matches
(drift_control_av.py — the state slices by prod(video_shape[1:]) and
demands the remainder equal prod(audio_shape) exactly).

The estate's compose door stood the carry down while the engine was
lethal (cards-h3-refine-carry-standdown). THIS wall judges the engine
cure that re-arms it: the refinement pass strips any foreign dynamic
denoise-mask patch on a CLONE before its guider samples — the patch's
apply-model wrapper only reads state its own mask function sets, so
with the function gone it degrades to a pass-through, and the
original MODEL keeps its patch for every other graph consumer.

The rig loads the vendored node module directly (the estate pytest
seat's self-loading idiom); if the vendored layout moves, these arms
red — the estate never arms a carry its engine cannot survive.
"""
from __future__ import annotations

import copy
import importlib.util
import math
import sys
import types
from pathlib import Path

import pytest

# THE CI SEAT LAW (the cold-clone wall's precedent): the estate's CI
# python interpreter carries no engine stack — torch's absence is not
# this wall's law (the law is the strip's seat and the burn's
# arithmetic). The live-rig arms skip LOUD naming the missing module;
# the source-law arm judges everywhere, torch or no torch.
TORCH_PRESENT = importlib.util.find_spec("torch") is not None
needs_torch = pytest.mark.skipif(
    not TORCH_PRESENT,
    reason="torch absent on this seat (CI) — the live-rig arms judge where the engine stack lives",
)
if TORCH_PRESENT:
    import torch

NODES_DIR = (
    Path(__file__).resolve().parents[1]
    / "vendor"
    / "comfyui_extensions"
    / "Comfyui_Minimax_h3_latent_Upscaler-Plus"
    / "nodes"
)
MODULE_PATH = NODES_DIR / "minimax_h3_refine.py"
PACKAGE = "h3_refine_strip_tests"

if PACKAGE not in sys.modules:
    _pkg = types.ModuleType(PACKAGE)
    _pkg.__path__ = [str(NODES_DIR)]
    sys.modules[PACKAGE] = _pkg
# LAZY LOAD: the vendored refinement imports torch at module scope
# (it is an engine node), so the module load itself waits for the
# arms that exec it — the source-law arm reads the file as TEXT and
# needs no interpreter stack at all.
_REFINE = None


def _refine():
    global _REFINE
    if _REFINE is None:
        _spec = importlib.util.spec_from_file_location(f"{PACKAGE}.refine", MODULE_PATH)
        assert _spec and _spec.loader
        module = importlib.util.module_from_spec(_spec)
        sys.modules[_spec.name] = module
        _spec.loader.exec_module(module)
        _REFINE = module
    return _REFINE

# The enlarged refinement grid (the handoff's learned latent) and the
# carried window's own grid — the two shapes whose mismatch is the burn.
REFINE_VIDEO = (1, 24, 3, 4, 6)
WINDOW_VIDEO = (1, 24, 3, 2, 3)
AUDIO = (1, 32, 2, 9)


class FakeNested:
    is_nested = True

    def __init__(self, members):
        self.members = list(members)

    def unbind(self):
        return tuple(self.members)

    def to(self, device):
        return FakeNested([member.to(device) for member in self.members])


class ForeignDriftControlState:
    """The Drift-Control AV mask-state split law, seeded for the
    smaller window latent it installed against — the F3-14 burn class
    in the engine's own voice."""

    def __init__(self, video_shape, audio_shape):
        self.video_elements = math.prod(video_shape[1:])
        self.audio_elements = math.prod(audio_shape)
        self.calls = 0

    def __call__(self, sigma, denoise_mask, extra_options=None):
        del sigma, extra_options
        self.calls += 1
        audio = denoise_mask[..., self.video_elements:]
        if int(audio.numel()) != self.audio_elements:
            raise ValueError(
                "Drift-Control AV packed mask does not match its audio stream"
            )
        return denoise_mask


class ForeignSelfLiftState:
    """The SECOND burn class (2026-11-16, Handoff.1, 21 nodes in): the
    Drift-Control apply-model wrapper calls its own mask split
    DIRECTLY on the self-lift pass — a path that never rides the
    popped denoise_mask_function. The upstream self-lift armed the
    state (selflift_base_mask + the enlarged video_shape), the shared
    state survived the model clone, and the SECOND window's handoff
    died with the same ValueError the first cure pinned. Mirrors
    drift_control_av.py's wrapper verbatim: _update_masks slices the
    packed mask at prod(video_shape[1:]) and demands the audio tail
    equal prod(audio_shape)."""

    WRAPPER_KEY = "minimax_h3_timeline_drift_control_av"
    APPLY_MODEL = "apply_model"


    def __init__(self, video_shape, audio_shape, enlarged_video_shape):
        self.video_shape = enlarged_video_shape
        self.audio_shape = audio_shape
        self.install_video_elements = math.prod(video_shape[1:])
        self.wrapper_calls = 0
        # configure_selflift_stage arms the packed base mask from the
        # INSTALL-time streams — sized for the window, never the
        # enlarged refinement grid.
        self.selflift_base_mask = torch.ones(
            (1, 1, self.install_video_elements + math.prod(audio_shape))
        )

    def apply_model_wrapper(self, executor, *args, **kwargs):
        self.wrapper_calls += 1
        if self.selflift_base_mask is not None:
            sigma = args[1] if len(args) > 1 else kwargs.get("t")
            # _update_masks, selflift branch: video is sliced by the
            # ENLARGED video_shape, the audio tail is whatever
            # remains — and the remainder no longer matches.
            video_elements = math.prod(self.video_shape[1:])
            audio = self.selflift_base_mask[..., video_elements:]
            if int(audio.numel()) != math.prod(self.audio_shape):
                raise ValueError(
                    "Drift-Control AV packed mask does not match its audio stream"
                )
        return executor(*args, **kwargs)


# The strip body's reference to the pack's module constant (one
# spelling law: the director pack's key literal appears exactly once).
_DRIFT_CONTROL_WRAPPER_KEY_REF = "_DRIFT_CONTROL_WRAPPER_KEY"


class FakeNoise:
    seed = 123

    def generate_noise(self, latent):
        video, audio = latent["samples"].unbind()
        return FakeNested([torch.ones_like(video), torch.ones_like(audio)])


class FakeModelPatcher:
    def __init__(self, model_options=None, wrappers=None):
        self.model_options = copy.deepcopy(model_options or {})
        # Mirror the engine's ModelPatcher wrapper store
        # (model_patcher.py:370, clone copies per-key at :477).
        self.wrappers = copy.deepcopy(wrappers or {})

    def clone(self):
        return FakeModelPatcher(self.model_options, self.wrappers)

    def add_wrapper_with_key(self, wrapper_type, key, wrapper):
        self.wrappers.setdefault(wrapper_type, {}).setdefault(key, []).append(wrapper)

    def remove_wrappers_with_key(self, wrapper_type, key):
        self.wrappers.get(wrapper_type, {}).pop(key, None)

    def get_wrappers(self, wrapper_type, key):
        return list(self.wrappers.get(wrapper_type, {}).get(key, []))


class FakeGuider:
    last = None

    def __init__(self, model):
        self.model = model
        self.model_patcher = model
        FakeGuider.last = self

    def inner_set_conds(self, conds):
        self.conds = conds

    def set_conds(self, positive, negative):
        self.conds = {"positive": positive}

    def set_cfg(self, cfg):
        self.cfg = float(cfg)

    def sample(self, noise, latent_image, sampler, sigmas, *, denoise_mask,
               callback, disable_pbar, seed):
        del sampler, denoise_mask, callback, disable_pbar, seed
        video, audio = latent_image.unbind()
        # Real ComfyUI invokes a dynamic denoise-mask function during
        # sampling with the packed mask expanded for the CURRENT
        # latent — mirror that seam so a foreign patch rides exactly
        # the way it does live.
        options = getattr(self.model, "model_options", None)
        fn = options.get("denoise_mask_function") if isinstance(options, dict) else None
        if callable(fn):
            packed = torch.ones(
                (int(video.shape[0]), 1,
                 math.prod(video.shape[1:]) + math.prod(audio.shape))
            )
            fn(sigmas[0] if getattr(sigmas, "ndim", 0) else sigmas, packed)
        # Real ComfyUI runs every APPLY_MODEL wrapper around the model
        # call each step (the executor chain) — the seat the second
        # burn class rides, independent of the mask function above.
        for wrapper in self.model.get_wrappers("apply_model",
                                               ForeignSelfLiftState.WRAPPER_KEY):
            wrapper(lambda *a, **kw: None, torch.zeros(1), t=sigmas[0])
        noise_video, noise_audio = noise.unbind()
        return FakeNested([video + noise_video, audio + noise_audio])


def install_fake_comfy(monkeypatch):
    comfy = types.ModuleType("comfy")
    comfy.samplers = types.ModuleType("comfy.samplers")
    comfy.samplers.CFGGuider = FakeGuider
    comfy.sample = types.ModuleType("comfy.sample")
    comfy.sample.fix_empty_latent_channels = lambda _model, latent, *_ratios: latent
    comfy.model_management = types.ModuleType("comfy.model_management")
    comfy.model_management.intermediate_device = lambda: torch.device("cpu")
    comfy.utils = types.ModuleType("comfy.utils")
    comfy.utils.PROGRESS_BAR_ENABLED = False
    latent_preview = types.ModuleType("latent_preview")
    latent_preview.prepare_callback = lambda *_args, **_kwargs: None
    monkeypatch.setitem(sys.modules, "comfy", comfy)
    monkeypatch.setitem(sys.modules, "comfy.samplers", comfy.samplers)
    monkeypatch.setitem(sys.modules, "comfy.sample", comfy.sample)
    monkeypatch.setitem(sys.modules, "comfy.model_management", comfy.model_management)
    monkeypatch.setitem(sys.modules, "comfy.utils", comfy.utils)
    monkeypatch.setitem(sys.modules, "latent_preview", latent_preview)


def make_joint():
    return {
        "samples": FakeNested([
            torch.full(REFINE_VIDEO, 2.0),
            torch.full(AUDIO, 5.0),
        ])
    }


@needs_torch
def test_the_burn_arithmetic_is_pinned_in_the_engines_own_voice():
    """THE CATCH-BEFORE-LIVE ARM, class half: a mask state seeded for
    the carried window's streams splits the ENLARGED refinement grid's
    packed mask and finds an audio tail that no longer matches — the
    exact ValueError that killed the operator's carried refine
    mid-bill. If the packed layout ever changes so this class dies,
    this arm is the seat that says so."""
    state = ForeignDriftControlState(WINDOW_VIDEO, AUDIO)
    packed = torch.ones(
        (1, 1, math.prod(REFINE_VIDEO[1:]) + math.prod(AUDIO))
    )
    with pytest.raises(
        ValueError,
        match="Drift-Control AV packed mask does not match its audio stream",
    ):
        state(torch.tensor(0.25), packed)
    assert state.calls == 1


def test_the_strip_lives_in_the_handoff_before_the_guider():
    """SOURCE LAW: the vendored refinement calls
    _strip_foreign_denoise_mask_patch before _make_guider — a cure
    that drifts to after the guider (or out of the pass entirely)
    stops defending the exact seam that burned."""
    src = MODULE_PATH.read_text()
    assert "def _strip_foreign_denoise_mask_patch(" in src, (
        "the strip helper vanished from the vendored refinement — "
        "the F3-14 burn class re-arms at the handoff"
    )
    strip_call = src.find("model = _strip_foreign_denoise_mask_patch(model)")
    guider_call = src.find("guider = _make_guider(model, positive, negative, cfg)")
    assert strip_call != -1 and guider_call != -1, (
        "the strip call and the guider build must both live in "
        "run_h3_refinement"
    )
    assert strip_call < guider_call, (
        "the strip must ride BEFORE the guider takes the model"
    )


def test_the_strip_is_complete_both_seats():
    """SOURCE LAW, the second burn (2026-11-16): popping the mask
    FUNCTION alone leaves the patch's apply-model wrapper live — and
    the wrapper splits its own packed mask on the self-lift path,
    with no ride through the popped function. The strip must remove
    the WRAPPER (keyed by the director pack's one spelling) and the
    shared state handle too, or the second window's handoff dies
    with the first burn's ValueError."""
    src = MODULE_PATH.read_text()
    start = src.find("def _strip_foreign_denoise_mask_patch(")
    end = src.find("\ndef ", start + 1)
    assert start != -1 and end != -1, "the strip helper vanished"
    body = src[start:end]
    assert 'pop("denoise_mask_function"' in body, (
        "the strip must drop the mask function seat"
    )
    assert 'remove("apply_model"' in body, (
        "the wrapper removal must key the APPLY_MODEL wrapper type "
        "(WrappersMP.APPLY_MODEL's own value, spelled literally)"
    )
    assert body.count(_DRIFT_CONTROL_WRAPPER_KEY_REF) >= 2, (
        "the strip body must key the removal and the state-handle pop "
        "by the drift-control wrapper key constant"
    )
    assert src.count(f'"{ForeignSelfLiftState.WRAPPER_KEY}"') == 1, (
        "the director pack's wrapper key is spelled exactly ONCE in "
        "the pack (the module constant) — never duplicated inline"
    )


@needs_torch
def test_the_strip_judged_live_at_the_pass_that_burned(monkeypatch):
    """THE CATCH-BEFORE-LIVE ARM, cure half: a MODEL carrying a
    foreign dynamic denoise-mask function enters the refinement, the
    pass strips it on a clone, the function NEVER fires against the
    enlarged grid, sampling completes, and the original MODEL keeps
    its patch for every other graph consumer."""
    install_fake_comfy(monkeypatch)
    refine = _refine()
    state = ForeignDriftControlState(WINDOW_VIDEO, AUDIO)
    model = FakeModelPatcher(model_options={"denoise_mask_function": state})

    out = refine.run_h3_refinement(
        make_joint(),
        model=model,
        positive=[[torch.ones(1), {}]],
        negative=None,
        noise=FakeNoise(),
        sampler=object(),
        sigmas=torch.tensor([0.25, 0.1, 0.0]),
        cfg=1.0,
        lock_audio=False,
    )

    video, audio = out["samples"].unbind()
    assert torch.all(video == 3.0), "sampling completed — the burn never fired"
    assert torch.all(audio == 6.0)
    assert state.calls == 0, (
        "the foreign function never fired against the enlarged grid"
    )
    guider_model = FakeGuider.last.model
    assert guider_model is not model, (
        "the pass samples a clone, never the shared graph object"
    )
    assert "denoise_mask_function" not in guider_model.model_options
    assert callable(model.model_options["denoise_mask_function"]), (
        "the ORIGINAL model keeps its patch for every other graph consumer"
    )


@needs_torch
def test_the_strip_is_identity_on_ordinary_models():
    """A MODEL with no dynamic denoise-mask patch rides untouched —
    the strip is a no-op for every ordinary refinement."""
    refine = _refine()
    clean = FakeModelPatcher()
    assert refine._strip_foreign_denoise_mask_patch(clean) is clean
    bare = object()
    assert refine._strip_foreign_denoise_mask_patch(bare) is bare


@needs_torch
def test_the_second_window_never_inherits_a_selflift_armed_wrapper(monkeypatch):
    """THE CATCH-BEFORE-LIVE ARM, second burn (2026-11-16, the live
    press at Handoff.1, 21 nodes executed first): the upstream
    self-lift armed the Drift-Control state, the wrapper (not the
    popped function) splits the packed mask on the ENLARGED grid, and
    the second window's handoff died with the first burn's
    ValueError. The strip must remove the wrapper seat on the clone —
    sampling completes, the original keeps its wrapper for every
    other graph consumer."""
    install_fake_comfy(monkeypatch)
    refine = _refine()
    state = ForeignSelfLiftState(WINDOW_VIDEO, AUDIO, REFINE_VIDEO)
    model = FakeModelPatcher()
    model.add_wrapper_with_key(
        ForeignSelfLiftState.APPLY_MODEL,
        ForeignSelfLiftState.WRAPPER_KEY,
        state.apply_model_wrapper,
    )

    out = refine.run_h3_refinement(
        make_joint(),
        model=model,
        positive=[[torch.ones(1), {}]],
        negative=None,
        noise=FakeNoise(),
        sampler=object(),
        sigmas=torch.tensor([0.25, 0.1, 0.0]),
        cfg=1.0,
        lock_audio=False,
    )

    video, audio = out["samples"].unbind()
    assert torch.all(video == 3.0), "sampling completed — the burn never fired"
    assert torch.all(audio == 6.0)
    assert state.wrapper_calls == 0, (
        "the self-lift-armed wrapper never fired against the enlarged grid"
    )
    guider_model = FakeGuider.last.model
    assert guider_model.get_wrappers(
        ForeignSelfLiftState.APPLY_MODEL, ForeignSelfLiftState.WRAPPER_KEY
    ) == [], "the clone carries no drift-control apply-model wrapper"
    assert len(model.get_wrappers(
        ForeignSelfLiftState.APPLY_MODEL, ForeignSelfLiftState.WRAPPER_KEY
    )) == 1, (
        "the ORIGINAL model keeps its wrapper for every other graph consumer"
    )

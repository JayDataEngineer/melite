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


class FakeNoise:
    seed = 123

    def generate_noise(self, latent):
        video, audio = latent["samples"].unbind()
        return FakeNested([torch.ones_like(video), torch.ones_like(audio)])


class FakeModelPatcher:
    def __init__(self, model_options=None):
        self.model_options = copy.deepcopy(model_options or {})

    def clone(self):
        return FakeModelPatcher(self.model_options)


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

from __future__ import annotations

import importlib.util
import sys
import types
from pathlib import Path
from types import SimpleNamespace

import torch


PACKAGE_ROOT = Path(__file__).resolve().parents[1] / "vendor" / "comfyui_extensions" / "melite-audio-nodes"
IMPL_ROOT = PACKAGE_ROOT / "engines" / "moss_sfx_impl"
if str(IMPL_ROOT) not in sys.path:
    sys.path.insert(0, str(IMPL_ROOT))


def _load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def _load_core(monkeypatch, engine_factory):
    package_name = "_melite_audio_nodes_test"
    package = types.ModuleType(package_name)
    package.__path__ = [str(PACKAGE_ROOT)]
    monkeypatch.setitem(sys.modules, package_name, package)
    engines_name = f"{package_name}.engines"
    engines = types.ModuleType(engines_name)
    engines.__path__ = [str(PACKAGE_ROOT / "engines")]
    monkeypatch.setitem(sys.modules, engines_name, engines)
    monkeypatch.setenv("AUDIOCPP_MODELS_DIR", str(PACKAGE_ROOT))
    core = _load_module(f"{package_name}.core", PACKAGE_ROOT / "core.py")
    monkeypatch.setitem(
        sys.modules,
        f"{engines_name}.moss_sfx_v2",
        SimpleNamespace(TorchSfxEngine=engine_factory),
    )
    return core


def _load_nodes(monkeypatch, managed_model):
    package_name = "_melite_audio_nodes_nodes_test"
    package = types.ModuleType(package_name)
    package.__path__ = [str(PACKAGE_ROOT)]
    monkeypatch.setitem(sys.modules, package_name, package)
    core = types.ModuleType(f"{package_name}.core")
    core.ManagedModel = managed_model
    core._AUDIOCPP_MODELS_DIR = str(PACKAGE_ROOT)
    monkeypatch.setitem(sys.modules, core.__name__, core)
    film_mix = types.ModuleType(f"{package_name}.film_mix")
    film_mix.MeliteFilmAudioMix = object
    monkeypatch.setitem(sys.modules, film_mix.__name__, film_mix)
    return _load_module(f"{package_name}.nodes", PACKAGE_ROOT / "nodes.py")


def test_load_node_forwards_phase_callback_to_managed_model(monkeypatch, tmp_path):
    callbacks = []

    class ManagedModel:
        def __init__(self, family, path, extras=None):
            self.family = family
            self.path = path
            self.extras = extras

        def load(self, on_progress=None):
            callbacks.append(on_progress)
            on_progress("loading text encoder")
            return True

    nodes = _load_nodes(monkeypatch, ManagedModel)
    events = []

    def run_with_progress(fn):
        return fn(events.append)

    monkeypatch.setattr(nodes, "_run_with_load_progress", run_with_progress)
    result = nodes.LoadAudiocoreModel().load(
        "moss_sfx_v2",
        str(tmp_path / "model"),
    )
    assert len(result) == 1
    assert callbacks[0].__self__ is events
    assert events == ["loading text encoder"]


def test_torch_engine_forwards_callback_and_omits_it_when_absent(monkeypatch, tmp_path):
    engine_module = _load_module(
        "_moss_sfx_engine_test",
        PACKAGE_ROOT / "engines" / "moss_sfx_v2.py",
    )
    calls = []

    class FakePipeline:
        @classmethod
        def from_pretrained(cls, path, **kwargs):
            calls.append((path, kwargs))
            callback = kwargs.get("on_progress")
            if callback is not None:
                callback("loading text encoder")
            return object()

    monkeypatch.setitem(
        sys.modules,
        "moss_soundeffect_v2",
        SimpleNamespace(MossSoundEffectPipeline=FakePipeline),
    )
    monkeypatch.setattr(
        engine_module.TorchSfxEngine,
        "_configure_compile_cache",
        lambda self: None,
    )

    events = []
    callback = events.append
    first = engine_module.TorchSfxEngine(str(tmp_path / "first"))
    assert first.load(on_progress=callback)
    assert calls[-1][1]["on_progress"] is callback
    assert events == ["loading text encoder"]
    assert first.load(on_progress=callback)
    assert events == ["loading text encoder"]

    second = engine_module.TorchSfxEngine(str(tmp_path / "second"))
    assert second.load()
    assert "on_progress" not in calls[-1][1]


def test_pipeline_loader_forwards_callback_and_omits_it_when_absent(monkeypatch, tmp_path):
    from moss_soundeffect_v2 import MossSoundEffectPipeline
    from moss_soundeffect_v2.diffsynth.pipelines import wan_audio

    calls = []

    def fake_from_pretrained(cls, model_dir, **kwargs):
        calls.append((model_dir, kwargs))
        return SimpleNamespace()

    monkeypatch.setattr(
        wan_audio.WanAudioPipeline,
        "from_pretrained",
        classmethod(fake_from_pretrained),
    )
    model_dir = tmp_path / "model"
    model_dir.mkdir()
    (model_dir / "model_index.json").write_text(
        '{"sample_rate": 48000, "max_inference_seconds": 30}',
        encoding="utf-8",
    )

    events = []
    callback = events.append
    assert MossSoundEffectPipeline.from_pretrained(
        str(model_dir),
        on_progress=callback,
        local_files_only=True,
    ) is not None
    assert calls[-1][1]["on_progress"] is callback

    assert MossSoundEffectPipeline.from_pretrained(
        str(model_dir),
        local_files_only=True,
    ) is not None
    assert "on_progress" not in calls[-1][1]


def test_wan_loader_reports_real_stage_order_and_stays_silent_without_callback(
    monkeypatch,
    tmp_path,
):
    from moss_soundeffect_v2.diffsynth.pipelines import wan_audio

    class FakeTextEncoder:
        dim = 4

        def __init__(self, path, torch_dtype):
            self.path = path
            self.torch_dtype = torch_dtype

        def to(self, device):
            self.device = device
            return self

    class FakePrompter:
        def __init__(self, tokenizer_path=None):
            self.tokenizer_path = tokenizer_path

        def fetch_models(self, text_encoder):
            self.text_encoder = text_encoder

    class FakeDAC:
        hop_length = 4

        @classmethod
        def load(cls, path):
            return cls()

    class FakeModel:
        def __init__(self, **kwargs):
            self.freqs = (torch.ones(1), torch.ones(1), torch.ones(1))
            self.freqs_cis_0 = self.freqs[0]
            self.freqs_cis_1 = self.freqs[1]
            self.freqs_cis_2 = self.freqs[2]

        def load_state_dict(self, state_dict):
            return SimpleNamespace(missing_keys=[], unexpected_keys=[])

        def to(self, *args, **kwargs):
            return self

    class FakePipeline(wan_audio.WanAudioPipeline):
        def __init__(self, **kwargs):
            self.device = kwargs["device"]
            self.torch_dtype = kwargs["torch_dtype"]
            self.hop_length = 4

        def to(self, *args, **kwargs):
            self.moved = True
            return self

    monkeypatch.setattr(wan_audio, "Qwen3TextEncoder", FakeTextEncoder)
    monkeypatch.setattr(wan_audio, "WanPrompter", FakePrompter)
    monkeypatch.setattr(wan_audio, "DAC", FakeDAC)
    monkeypatch.setattr(wan_audio, "WanAudioModel", FakeModel)
    monkeypatch.setattr(wan_audio, "load_file", lambda path: {})

    model_dir = tmp_path / "model"
    (model_dir / "scheduler").mkdir(parents=True)
    (model_dir / "transformer").mkdir()
    (model_dir / "text_encoder").mkdir()
    (model_dir / "tokenizer").mkdir()
    (model_dir / "vae").mkdir()
    (model_dir / "vae" / "vae_128d_48k.pth").write_bytes(b"")
    (model_dir / "model_index.json").write_text(
        '{"_class_name": "WanAudioPipeline", "dit_variant": "1.3B"}',
        encoding="utf-8",
    )
    (model_dir / "scheduler" / "scheduler_config.json").write_text(
        '{"shift": 5.0}',
        encoding="utf-8",
    )
    (model_dir / "transformer" / "config.json").write_text(
        '{"in_dim": 1, "out_dim": 1, "text_dim": 4, "freq_dim": 4, '
        '"eps": 1e-6, "patch_size": [1, 1, 1], '
        '"has_image_input": false, "dim": 4, "ffn_dim": 8, '
        '"num_heads": 1, "num_layers": 1}',
        encoding="utf-8",
    )

    events = []
    FakePipeline.from_pretrained(
        str(model_dir),
        device="cpu",
        torch_dtype=torch.float32,
        on_progress=events.append,
    )
    assert events == [
        "loading pipeline metadata",
        "loading text encoder",
        "loading tokenizer",
        "loading DAC VAE",
        "loading DiT weights",
        "assembling pipeline",
        "pipeline assembled",
    ]

    events.clear()
    FakePipeline.from_pretrained(
        str(model_dir),
        device="cpu",
        torch_dtype=torch.float32,
    )
    assert events == []


def test_managed_model_forwards_optional_callback_to_torch_loader(monkeypatch, tmp_path):
    calls = []

    class CallbackEngine:
        def __init__(self, path):
            self.path = path

        def load(self, **kwargs):
            calls.append(kwargs)
            kwargs.get("on_progress", lambda message: None)("loading text encoder")
            return True

    core = _load_core(monkeypatch, CallbackEngine)
    model_dir = tmp_path / "model"
    model_dir.mkdir()
    (model_dir / "model_index.json").write_text("{}", encoding="utf-8")

    model = core.ManagedModel("moss_sfx_v2", str(model_dir))
    events = []
    assert model.load(on_progress=events.append)
    assert calls[-1]["on_progress"].__self__ is events
    assert events == ["loading text encoder"]

    class NoCallbackEngine(CallbackEngine):
        def load(self):
            calls.append({})
            return True

    core.ManagedModel._active_model = None
    model._torch_engine = None
    no_callback_model = core.ManagedModel("moss_sfx_v2", str(model_dir))
    monkeypatch.setitem(
        sys.modules,
        f"{core.__name__.rsplit('.', 1)[0]}.engines.moss_sfx_v2",
        SimpleNamespace(TorchSfxEngine=NoCallbackEngine),
    )
    assert no_callback_model.load()
    assert calls[-1] == {}

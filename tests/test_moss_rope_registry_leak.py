"""THE MOSS ROPE REGISTRY LEAK (engine audit follow-up, 2026-11-15).

The burn, verbatim (engine log 2026-11-14 ~23:5x): the moss ambience
e2e arm reded ``RuntimeError: Failed to load moss_sfx_v2 ...`` with
the per-node cause ``'Qwen3Config' object has no attribute
'rope_theta'`` — AFTER the tts arms in the same run greened, and ONLY
in the engine process (a standalone ``from_pretrained`` of the same
checkpoint greens). The mechanism: qwen_tts's import re-seats
ROPE_INIT_FUNCTIONS' ``"default"`` with an initializer that reads
``config.rope_theta`` unconditionally; transformers 5.20's plain
``Qwen3Config`` keeps RoPE params in ``rope_parameters`` with no
top-level ``rope_theta``. Once any tts load has run in the
interpreter, MOSS's text-encoder load fires the poisoned entry.

The cure: moss_sfx_v2 loads its pipeline under the SAME tolerant
rope-registry patch the tts engines load under
(``_rope_registry_patched`` — absent restores to absent, present
restores to present, the patch never leaks past the load).

This wall pins both halves weight-free (the
test_audiocore_lane_combo extraction pattern — the pack's module
graph is never imported; the named functions are read out of the
pack source and run against stub registries):

  ARM 1 (the wrapper rides the load): moss_sfx_v2.py's pipeline
       load composes ``from_pretrained`` INSIDE the
       ``with _rope_registry_patched():`` block — toggle the wrapper
       out and this reds (the exact edit that would re-open the leak).

  ARM 2 (the tolerant entry seats and restores a POISONED registry):
       a ``default`` entry that reads rope_theta is live → the patch
       seats the tolerant one → on exit THE POISONED ENTRY IS BACK
       (present-restores-present — the tts loads after moss must see
       their own entry, not ours).

  ARM 3 (absent restores to absent): an empty registry stays empty
       after the patch exits (the D5 cold-boot law, mirrored here).

  ARM 4 (the tolerant math answers for a theta-less config): a stub
       config with ``rope_parameters`` and NO ``rope_theta`` yields
       inv_freq without raising — the fallback the crash burned on.
"""

import re
import sys
import tempfile
import types
import unittest
from pathlib import Path


PACK_ENGINES = (
    Path(__file__).resolve().parents[1]
    / "vendor"
    / "comfyui_extensions"
    / "melite-audio-nodes"
    / "engines"
)
QWEN_TTS = (PACK_ENGINES / "qwen3_tts.py").read_text(encoding="utf-8")
MOSS = (PACK_ENGINES / "moss_sfx_v2.py").read_text(encoding="utf-8")


def _fn(source: str, name: str):
    """Extract one top-level ``def name`` block by name (the
    per-name boundary pattern — a slice between two defs breaks the
    moment file order moves). Nested-scope needs (contextlib) are
    pre-seeded; the rope patch imports its registry lazily at call
    time so a stub module in sys.modules serves it."""
    m = re.search(
        rf"((?:^@[\w.]+\n+)??^def {name}\(.*?)(?=^def |^class |^@|\Z)",
        source,
        re.M | re.S,
    )
    assert m is not None, f"{name} not found in pack source"
    block = m.group(0)
    assert len(re.findall(rf"^def {name}\(", source, re.M)) == 1, (
        f"{name} must be declared exactly once (the shadowed-def class)"
    )
    # ONE namespace for every extraction: the patch body references
    # its sibling tolerant initializer by module name — separate
    # namespaces would NameError exactly there.
    ns = _PACK_NS
    exec(compile(block, f"<{name}>", "exec"), ns)  # noqa: S102 - the extraction pattern
    return ns[name]


def _shim_contextmanager(fn):
    """contextlib.contextmanager for the extracted generator (the
    stdlib object works; the shim keeps the exec namespace tiny)."""
    import contextlib

    return contextlib.contextmanager(fn)


# The one shared extraction namespace (the patch names its sibling).
_PACK_NS = {"contextlib": types.SimpleNamespace(contextmanager=_shim_contextmanager)}


def _stub_rope_registry(default_entry):
    """Install a fake ``transformers.modeling_rope_utils`` whose
    ROPE_INIT_FUNCTIONS dict carries `default_entry` (a sentinel or
    None for absent) — the patch's lazy import resolves here."""
    mod = types.ModuleType("transformers.modeling_rope_utils")
    registry = {} if default_entry is None else {"default": default_entry}
    mod.ROPE_INIT_FUNCTIONS = registry
    parent = types.ModuleType("transformers")
    parent.modeling_rope_utils = mod
    saved = (
        sys.modules.get("transformers"),
        sys.modules.get("transformers.modeling_rope_utils"),
    )
    sys.modules["transformers"] = parent
    sys.modules["transformers.modeling_rope_utils"] = mod
    return registry, saved


def _restore_modules(saved):
    for name, mod in zip(
        ("transformers", "transformers.modeling_rope_utils"), saved
    ):
        if mod is None:
            sys.modules.pop(name, None)
        else:
            sys.modules[name] = mod


def _stub_qwen_tts():
    """A qwen_tts whose _default_rope_parameters raises the exact
    AttributeError the tolerant fallback exists to survive (the
    upstream initializer reading a missing attr) — the except arm
    then runs the fallback math for real."""
    compat = types.ModuleType("qwen_tts._transformers_compat")

    def _crash(*_a, **_k):
        raise AttributeError("'Qwen3Config' object has no attribute 'rope_theta'")

    compat._default_rope_parameters = _crash
    qt = types.ModuleType("qwen_tts")
    qt._transformers_compat = compat
    saved = sys.modules.get("qwen_tts")
    sys.modules["qwen_tts"] = qt
    return saved


class MossRopeRegistryLeak(unittest.TestCase):
    def test_arm_1_the_wrapper_rides_the_load(self):
        """moss composes from_pretrained INSIDE the rope patch — the
        exact wrapper whose removal re-opens the leak."""
        self.assertIn(
            "from .qwen3_tts import _rope_registry_patched",
            MOSS,
            "moss_sfx_v2 must import the tolerant rope patch",
        )
        with_pat = re.search(
            r"with _rope_registry_patched\(\):\s*\n(\s+)self\.pipeline = MossSoundEffectPipeline\.from_pretrained",
            MOSS,
        )
        self.assertIsNotNone(
            with_pat,
            "MossSoundEffectPipeline.from_pretrained must compose inside "
            "'with _rope_registry_patched():' — the poisoned-registry crash "
            "returns the moment the wrapper leaves the load",
        )

    def test_arm_2_poisoned_entry_seats_and_restores(self):
        """A live rope_theta-reading 'default' (qwen_tts's seat) is
        replaced for the load and RESTORED after it."""
        tolerant = _fn(QWEN_TTS, "_tolerant_default_rope_parameters")
        patch_fn = _fn(QWEN_TTS, "_rope_registry_patched")
        poisoned = object()
        registry, saved = _stub_rope_registry(poisoned)
        try:
            patch = patch_fn()
            with patch:
                self.assertIs(
                    registry["default"], tolerant,
                    "inside the patch the tolerant initializer must seat",
                )
            self.assertIs(
                registry["default"], poisoned,
                "on exit the poisoned entry is RESTORED — tts loads after "
                "moss must see their own entry, never ours",
            )
        finally:
            _restore_modules(saved)

    def test_arm_3_absent_restores_to_absent(self):
        """An empty registry (the cold interpreter, D5) stays empty."""
        patch_fn = _fn(QWEN_TTS, "_rope_registry_patched")
        registry, saved = _stub_rope_registry(None)
        try:
            with patch_fn():
                self.assertIn("default", registry, "the tolerant entry seats")
            self.assertNotIn(
                "default", registry,
                "absent restores to absent (the D5 cold-boot law)",
            )
        finally:
            _restore_modules(saved)

    def test_arm_4_tolerant_math_answers_theta_less_config(self):
        """The fallback math serves a config with rope_parameters and
        NO rope_theta — the exact crash shape, answered."""
        tolerant = _fn(QWEN_TTS, "_tolerant_default_rope_parameters")
        saved_qt = _stub_qwen_tts()
        try:
            cfg = types.SimpleNamespace(
                rope_parameters={"rope_theta": 1000000},
                partial_rotary_factor=1.0,
                head_dim=None,
                hidden_size=2048,
                num_attention_heads=16,
            )
            inv_freq, attention_factor = tolerant(cfg)
            import torch

            self.assertEqual(attention_factor, 1.0)
            self.assertEqual(
                inv_freq.shape[0], 2048 // 16 // 2,
                "dim = head_dim * partial_rotary_factor / 2 (the transformers math)",
            )
            self.assertTrue(torch.isfinite(inv_freq).all())
        finally:
            if saved_qt is None:
                sys.modules.pop("qwen_tts", None)
            else:
                sys.modules["qwen_tts"] = saved_qt


if __name__ == "__main__":
    unittest.main()

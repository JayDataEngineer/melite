"""The finished design — the persisted lever draft (operator order,
2026-09-06, verbatim: "I want the design finished... I do not want
you to just do it halfway").

The ephemeral-draft era (hydrate-only bridge, seed lost on reopen,
Apply re-spelling localChanges→dropped morphs) ends here:

  sculpt (SculptDraft, the card schema row) is DECLARED (family
  signature serves it, the Run gate accepts it), AUTOSAVED by the
  bridge (debounced, echo-guarded, flushed on unmount), SEEDED by
  the estimate verb in the same save as the GLB, and POSTED
  VERBATIM by Apply (params.sculpt → params_json untouched — the
  wire spelling lives in ONE place, the silent-drop class dies).
"""

import os
import unittest

from _anchor import REPO

from melite_models import load_model_py

ANNY_MODEL_PY = os.path.join(
    REPO, "plugins", "engines", "comfyui", "models", "3d", "anny",
    "model.py")
ANNY_SHAPE = (
    REPO / "plugins/engines/comfyui/action_cards/3d/anny/ui/studio/shape.tsx"
)
ANNY_COMPONENT = (
    REPO
    / "plugins/engines/comfyui/action_cards/3d/anny/ui/studio/component.tsx"
)


def _anny_schema():
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "_anny_schema_sculpt",
        os.path.join(
            REPO,
            "plugins/engines/comfyui/action_cards/3d/anny/py/schema.py",
        ),
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class TestSculptDraftRow(unittest.TestCase):
    def test_authored_accepts_and_defaults_neutral(self):
        mod = _anny_schema()
        d = mod.SculptDraft()
        self.assertEqual(d.dialect, "authored")
        self.assertEqual(len(d.phenotype), 11)
        self.assertEqual(d.local_changes, {})

    def test_refusals_are_loud(self):
        from pydantic import ValidationError

        mod = _anny_schema()
        # bad dims
        with self.assertRaises(ValidationError):
            mod.SculptDraft(phenotype=[0.5] * 6)
        # out of range
        with self.assertRaises(ValidationError):
            mod.SculptDraft(phenotype=[2.0] + [0.5] * 10)
        with self.assertRaises(ValidationError):
            mod.SculptDraft(local_changes={"x": 5.0})
        # wrong dialect + extra keys (never silently tolerated)
        with self.assertRaises(ValidationError):
            mod.SculptDraft(dialect="estimated")
        with self.assertRaises(ValidationError):
            mod.SculptDraft(coeffs=[0.5] * 11)  # type: ignore[call-arg]

    def test_card_row_carries_sculpt_and_still_refuses_null_and_bag(self):
        from pydantic import ValidationError

        mod = _anny_schema()
        row = mod.AnnyParams(
            sculpt={"dialect": "authored",
                    "phenotype": [0.5] * 11,
                    "local_changes": {"upperarm-fat-incr": 0.2}})
        self.assertEqual(row.sculpt.local_changes["upperarm-fat-incr"], 0.2)
        # absent rides neutral
        self.assertEqual(mod.AnnyParams().sculpt.phenotype, (0.5,) * 11)
        # explicit null refuses (a stated value, and a wrong one)
        with self.assertRaises(ValidationError):
            mod.AnnyParams(sculpt=None)  # type: ignore[arg-type]
        # the legacy bag stays refused
        with self.assertRaises(ValidationError):
            mod.AnnyParams(coeffs=[0.5] * 11)  # type: ignore[call-arg]


class TestSculptDeclared(unittest.TestCase):
    def test_writes_declare_sculpt_and_still_refuse_the_bag(self):
        cls = load_model_py(ANNY_MODEL_PY, "comfyui")
        self.assertIn("sculpt", cls.studio.writes)
        for key in ("identityModel", "coeffs", "localChanges",
                    "customTargets"):
            self.assertNotIn(key, cls.studio.writes)


class TestBridgeAutosavesLegally(unittest.TestCase):
    """The write-back is back — declared this time. Pins the LEGAL
    shape (sculpt key only) and the bag's continued absence."""

    def setUp(self):
        self.shape = ANNY_SHAPE.read_text(encoding="utf-8")
        self.component = ANNY_COMPONENT.read_text(encoding="utf-8")

    def test_write_back_persists_sculpt_only(self):
        self.assertIn("sculpt: pending", self.shape)
        self.assertNotIn("coeffs: editing.coeffs", self.shape)

    def test_apply_posts_the_draft_verbatim(self):
        self.assertIn("JSON.stringify(draft)", self.shape)
        self.assertNotIn("localChanges: editing.localChanges", self.shape)

    def test_seed_persists_the_draft_with_the_glb(self):
        self.assertIn("sculpt: draft", self.component)


if __name__ == "__main__":
    unittest.main()

"""The one-card merge — anny IS the character card (operator order,
2026-09-06, verbatim: "ANNY card... is supposed to BE the body card...
wtf? Why would we have two seperate cards????").

The body card (3d/body, the ray-era Character Maker tenant #2) and the
anny studio were two surfaces for one dialect — authoring (sliders) on
one card, consuming (assembly + bake) on another. This stroke mounts the
Character Maker INTO the anny studio; the body card's retirement is
sequenced behind the in-flight pipe-carry stroke (its dir + goldens
collide) — these walls pin the mount, the seam, and the pending state.
"""

import os
import unittest
from pathlib import Path

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
BODY_CARD = REPO / "plugins/engines/comfyui/action_cards/3d/body"

# The ray Character bag — the exact keys the body card's bridge wrote.
CHARACTER_BAG = ("identityModel", "coeffs", "localChanges", "customTargets")


def _anny_params():
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "_anny_schema",
        os.path.join(
            REPO,
            "plugins/engines/comfyui/action_cards/3d/anny/py/schema.py",
        ),
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.AnnyParams


class TestCharacterBagRidesTheCard(unittest.TestCase):
    """The anny card SCHEMA carries the Character bag — the shape band
    persists what it sculpts with the draft (retirement-ready seam)."""

    def test_bag_fields_exist_with_null_defaults(self):
        P = _anny_params()
        row = P()
        for key in CHARACTER_BAG:
            self.assertIn(key, P.model_fields, f"AnnyParams lost {key}")
        self.assertEqual(row.identityModel, "anny")
        self.assertIsNone(row.coeffs)
        self.assertIsNone(row.localChanges)
        self.assertIsNone(row.customTargets)

    def test_bag_values_accepted(self):
        P = _anny_params()
        row = P(
            identityModel="anny",
            coeffs=[0.5] * 11,
            localChanges={"chest": 0.2},
            customTargets={"a": 1.0},
        )
        self.assertEqual(len(row.coeffs), 11)
        self.assertEqual(row.localChanges["chest"], 0.2)

    def test_turnaround_tolerates_the_bag(self):
        """A card carrying the bag still parses — the turnaround lane
        ignores the keys (body still comes from body_glb/base)."""
        P = _anny_params()
        row = P(
            body_glb="runs/x/out/body.glb",
            coeffs=[0.1] * 11,
            localChanges={"waist": -0.3},
            customTargets=None,
        )
        self.assertEqual(row.body_glb, "runs/x/out/body.glb")


class TestWritesDeclared(unittest.TestCase):
    """E1: the shape band's write-back must be inside studio.writes —
    onSave writes what the registry declares, nothing more."""

    def test_writes_carry_the_bag(self):
        cls = load_model_py(ANNY_MODEL_PY, "comfyui")
        writes = cls.studio.writes
        for key in CHARACTER_BAG:
            self.assertIn(key, writes, f"anny studio.writes lost {key}")
        # the original seam members survive the merge
        for key in ("body_glb", "source_image"):
            self.assertIn(key, writes)


class TestShapeBandSeam(unittest.TestCase):
    """The band MOUNTS the body card's own components — no second
    implementation — and bakes through the queue (INFERENCE LAW)."""

    def setUp(self):
        self.shape = ANNY_SHAPE.read_text(encoding="utf-8")

    def test_imports_the_body_cards_components(self):
        for piece in ("BodyShapePanel", "MeshPreviewCanvas", "bodyStudio"):
            self.assertIn(
                f"../../../body/ui/studio/{piece}",
                self.shape,
                f"shape.tsx stopped importing the body card's {piece} — "
                "a second implementation is the drift this merge bans",
            )

    def test_apply_bakes_through_the_queue_flow(self):
        self.assertIn(
            '"anny-params"',
            self.shape,
            "Apply must run the anny-params queue flow — never bake in-process",
        )
        self.assertIn(
            "/v1/flows/start",
            self.shape,
            "Apply must go through the queue door",
        )

    def test_authored_dialect_verbatim(self):
        self.assertRegex(
            self.shape,
            r'dialect:\s*"authored"',
            "the scratchpad bakes as the authored dialect",
        )
        # the neutral fallback: 11 dims of 0.5 (the estate neutral row)
        self.assertIn(
            "NEUTRAL_11",
            self.shape,
            "a null coeffs bag must fall back to the 11-dim neutral vector",
        )

    def test_component_mounts_the_band(self):
        component = ANNY_COMPONENT.read_text(encoding="utf-8")
        self.assertIn(
            "<AnnyShapeBand",
            component,
            "AnnyStudio no longer mounts the shape band",
        )


class TestBodyCardRetirementPending(unittest.TestCase):
    """The body card still EXISTS this stroke (sequenced retirement —
    its dir + goldens collide with the in-flight pipe-carry stroke).
    When the retirement lands, DELETE this test with the card; until
    then this pin documents the transitional two-card state."""

    def test_body_card_dir_still_present(self):
        self.assertTrue(
            BODY_CARD.is_dir(),
            "the body card was deleted — retire this wall WITH it "
            "(the retirement stroke owns both)",
        )
        # the mounted pieces must still resolve from the anny side
        for piece in (
            "ui/studio/BodyShapePanel.tsx",
            "ui/studio/MeshPreviewCanvas.tsx",
            "ui/studio/bodyStudio.ts",
        ):
            self.assertTrue(
                (BODY_CARD / piece).is_file(),
                f"the anny shape band's import target vanished: {piece}",
            )


if __name__ == "__main__":
    unittest.main()

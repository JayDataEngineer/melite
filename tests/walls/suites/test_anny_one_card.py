"""The one-card merge — anny IS the character card (operator order,
2026-09-06, verbatim: "ANNY card... is supposed to BE the body card...
wtf? Why would we have two seperate cards????").

The body card (3d/body, the ray-era Character Maker tenant #2) and the
anny studio were two surfaces for one dialect — authoring (sliders) on
one card, consuming (assembly + bake) on another. This stroke mounts the
Character Maker INTO the anny studio; the body card's retirement is
sequenced behind the in-flight pipe-carry stroke (its dir + goldens
collide) — these walls pin the mount, the seam, and the pending state.

NO LEGACY (operator order, 2026-09-06, verbatim: "NO LEGACY
CODEBASE.... YOU SNEAK! YOU KEPT IT ALL IN!"): the ray-era Character
bag (identityModel/coeffs/localChanges/customTargets) rode the merge
from the body card's bridge — nothing downstream ever read it, the
family signature never declared it, and every Shape-touched Run died
at the gate naming all four. REMOVED from the card schema, the model
writes, the studio caps defaults, and the bridge write-back (the
bridge scrubs stragglers off existing stages once). The body card's
own dir + tenant claim retire with the sequenced stroke, not here.
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
STUDIO_CAPS = (
    REPO / "web/slots/src/studioCapabilities.ts"
)

# The REMOVED ray Character bag — the exact keys the body card's
# bridge wrote. No wall may assert these exist anywhere on the anny
# wire again; the pins below assert ABSENCE.
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


class TestCharacterBagRemoved(unittest.TestCase):
    """NO LEGACY (2026-09-06): the ray Character bag is GONE from the
    card schema — the Run gate's verbatim refusal named all four, so
    absence here is the fix, pinned."""

    def test_bag_fields_absent(self):
        P = _anny_params()
        for key in CHARACTER_BAG:
            self.assertNotIn(key, P.model_fields,
                             f"legacy {key} crept back onto AnnyParams")

    def test_bag_values_refused_loud(self):
        """extra="forbid": a straggler carrying the bag refuses at
        parse — never silently tolerated."""
        from pydantic import ValidationError

        P = _anny_params()
        with self.assertRaises(ValidationError):
            P(coeffs=[0.5] * 11, localChanges={"chest": 0.2})

    def test_turnaround_row_parses_clean(self):
        P = _anny_params()
        row = P(body_glb="runs/x/out/body.glb")
        self.assertEqual(row.body_glb, "runs/x/out/body.glb")


class TestWritesDeclared(unittest.TestCase):
    """E1: onSave writes what the registry declares, nothing more —
    and the registry no longer declares the legacy bag."""

    def test_writes_refuse_the_bag(self):
        cls = load_model_py(ANNY_MODEL_PY, "comfyui")
        writes = cls.studio.writes
        for key in CHARACTER_BAG:
            self.assertNotIn(key, writes,
                             f"legacy {key} crept back into studio.writes")
        # the seam members survive the removal
        for key in ("body_glb", "source_image"):
            self.assertIn(key, writes)


class TestBridgeScrubsTheBag(unittest.TestCase):
    """The bridge is hydrate-only: no write-back of the bag, and a
    one-time scrub lifts stragglers off existing stages (their keys
    are unwritable AND unclearable otherwise — the schema forbids
    them, no control touches them). New stages seed no legacy."""

    def setUp(self):
        self.shape = ANNY_SHAPE.read_text(encoding="utf-8")

    def test_no_write_back_of_the_bag(self):
        self.assertNotIn(
            "coeffs: editing.coeffs",
            self.shape,
            "the scratchpad→params write-back is back — the Run "
            "gate refuses these keys",
        )

    def test_scrub_lifts_stragglers(self):
        self.assertIn(
            "scrubLegacyBag",
            self.shape,
            "the one-time legacy migration vanished — old stages "
            "stay refused forever",
        )
        for key in CHARACTER_BAG:
            self.assertIn(
                f'"{key}"',
                self.shape,
                f"LEGACY_BAG_KEYS lost {key} — the scrub must name "
                "the full removed bag",
            )

    def test_caps_defaults_seed_no_legacy(self):
        caps = STUDIO_CAPS.read_text(encoding="utf-8")
        for key in CHARACTER_BAG:
            self.assertNotIn(
                key,
                caps,
                f"new stages still seed legacy {key} via caps defaults",
            )


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


class TestRailLayout(unittest.TestCase):
    """The rail layout law (operator order, 2026-09-06, verbatim:
    "you have SHAPE and Turnaround AT THE SAME TIME! That is too
    many" + "NOT EVEN A SCROLL? ARE YOU CRAZT?" — typo preserved in
    the design record, not here). ONE concern per tab; THE TAB PANE
    owns the one scroll surface; the Shape panel may expand into a
    viewport drawer but never co-renders two instances."""

    @classmethod
    def setUpClass(cls):
        cls.component = ANNY_COMPONENT.read_text(encoding="utf-8")
        cls.shape = ANNY_SHAPE.read_text(encoding="utf-8")

    def test_the_rail_is_tabbed(self):
        # The strip is THE SHARED RailTabs component (operator order:
        # "Reusing components") — the anny rail mounts it with the
        # three big sections; Shape's sub-menus mount the same strip
        # dense. role=tablist/tab live in the shared file.
        shared = (
            REPO / "plugins/engines/comfyui/action_cards/3d/ui"
            "/railTabs.tsx"
        )
        self.assertTrue(shared.exists(), "the shared RailTabs strip vanished")
        strip = shared.read_text(encoding="utf-8")
        self.assertIn('role="tablist"', strip)
        self.assertIn("aria-selected={value === t.id}", strip)
        self.assertIn('role="tab"', strip)
        self.assertIn("dense", strip, "the nested sub-menu level")
        # the anny rail mounts the shared strip for the three sections
        self.assertIn("<RailTabs<RailTabId>", self.component)
        self.assertIn('{ id: "import", label: "Import" }', self.component,
                      "Import is the third big section (the presets + "
                      "MHR estimate order)")

    def test_both_levels_reuse_the_strip(self):
        # Shape's sub-menus (Phenotype/Body/Face) use the SAME strip,
        # dense, inside the body panel's kit Tabs (state stays the
        # Tabs' — TabsContent must live inside it).
        panel = (
            REPO / "plugins/engines/comfyui/action_cards/3d/body"
            "/ui/studio/BodyShapePanel.tsx"
        ).read_text(encoding="utf-8")
        self.assertIn('from "../../../ui/railTabs"', panel)
        self.assertRegex(panel, r"<RailTabs[\s\S]{0,120}dense", "the sub-menu level is dense")
        # the kit TabsList/TabsTrigger are GONE from the panel (one
        # strip shape, not two)
        self.assertNotIn("TabsList", panel)
        self.assertNotIn("TabsTrigger", panel)

    def test_import_holds_presets_and_the_mhr_estimate(self):
        # operator order: "It can be 'Import', and can also include
        # our button that will upload and use MHR to make an ANNY
        # estimation" — presets + AnnyHmrVerb live in the import pane;
        # the character pane carries ONLY the shape band.
        self.assertIn('{railTab === "import" &&', self.component)
        self.assertIn("Estimate from photo — SOMA-X commercial", self.component)
        self.assertRegex(
            self.component,
            r'\{railTab === "import" &&[\s\S]{0,600}<AnnyPresets',
            "presets moved to Import",
        )
        self.assertRegex(
            self.component,
            r'\{railTab === "import" &&[\s\S]{0,1600}<AnnyHmrVerb',
            "the estimate verb moved to Import",
        )
        self.assertRegex(
            self.component,
            r'\{railTab === "character" &&[\s\S]{0,600}<AnnyShapeBand',
            "the character pane is the shape band",
        )

    def test_the_pane_owns_the_scroll(self):
        self.assertRegex(
            self.component,
            r'role="tabpanel"[\s\S]{0,200}overflow-y-auto',
            "the tab pane must scroll — natural-height sections inside",
        )
        # the band itself is NATURAL height (no nested scroll box)
        self.assertNotIn(
            'flex min-h-0 flex-1 flex-col rounded-lg border border-sidebar-border/50 px-3 py-2',
            self.shape,
            "AnnyShapeBand must not carry its own flex-1 scroll — the "
            "tab pane owns the one scroll surface",
        )

    def test_shape_expands_into_the_drawer_not_a_second_panel(self):
        self.assertIn("{shapeExpanded && <AnnyShapeDrawer", self.component)
        self.assertIn("{!shapeExpanded && <AnnyShapeBand", self.component,
                      "ONE BodyShapePanel instance: the drawer replaces "
                          "the rail band while expanded")
        self.assertIn("w-80", self.shape, "the drawer is the wide surface")

    def test_the_bridge_survives_layout_moves(self):
        self.assertIn("useAnnyShapeBridge(props.stage, props.onSave)",
                      self.component,
                      "the bridge mounts ONCE at the studio level — it "
                      "must not unmount when the panel moves rail↔drawer")


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

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
    REPO, "packages", "engines", "comfyui", "models", "3d", "anny",
    "model.py")
ANNY_SHAPE = (
    REPO / "packages/engines/comfyui/action_cards/3d/anny/ui/studio/shape.tsx"
)
ANNY_COMPONENT = (
    REPO
    / "packages/engines/comfyui/action_cards/3d/anny/ui/studio/component.tsx"
)
BODY_CARD = REPO / "packages/engines/comfyui/action_cards/3d/body"
STUDIO_CAPS = (
    REPO / "web/slots/src/studioCapabilities.ts"
)

# The REMOVED ray Character bag — the exact keys the body card's
# bridge wrote. No wall may assert these exist anywhere on the anny
# wire again; the pins below assert ABSENCE.
CHARACTER_BAG = ("identityModel", "coeffs", "localChanges", "customTargets")


def _anny_params() -> type[object]:
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "_anny_schema",
        os.path.join(
            REPO,
            "packages/engines/comfyui/action_cards/3d/anny/py/schema.py",
        ),
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.AnnyParams


class TestCharacterBagRemoved(unittest.TestCase):
    """NO LEGACY (2026-09-06): the ray Character bag is GONE from the
    card schema — the Run gate's verbatim refusal named all four, so
    absence here is the fix, pinned."""

    def test_bag_fields_absent(self) -> None:
        P = _anny_params()
        for key in CHARACTER_BAG:
            self.assertNotIn(key, P.model_fields,
                             f"legacy {key} crept back onto AnnyParams")

    def test_bag_values_refused_loud(self) -> None:
        """extra="forbid": a straggler carrying the bag refuses at
        parse — never silently tolerated."""
        from pydantic import ValidationError

        P = _anny_params()
        with self.assertRaises(ValidationError):
            P(coeffs=[0.5] * 11, localChanges={"chest": 0.2})

    def test_turnaround_row_parses_clean(self) -> None:
        P = _anny_params()
        row = P(body_glb="runs/x/out/body.glb")
        self.assertEqual(row.body_glb, "runs/x/out/body.glb")


class TestWritesDeclared(unittest.TestCase):
    """E1: onSave writes what the registry declares, nothing more —
    and the registry no longer declares the legacy bag."""

    def test_writes_refuse_the_bag(self) -> None:
        cls = load_model_py(ANNY_MODEL_PY, "comfyui")
        writes = cls.studio.writes
        for key in CHARACTER_BAG:
            self.assertNotIn(key, writes,
                             f"legacy {key} crept back into studio.writes")
        # the seam members survive the removal
        for key in ("body_glb", "source_image"):
            self.assertIn(key, writes)


class TestBridgeScrubsTheBag(unittest.TestCase):
    """The bridge persists the DECLARED draft (sculpt — the finished
    design, 2026-09-06), never the bag: a one-time scrub lifts
    stragglers off existing stages (their keys are unwritable AND
    unclearable otherwise — the schema forbids them, no control
    touches them). New stages seed no legacy."""

    def setUp(self) -> None:
        self.shape = ANNY_SHAPE.read_text(encoding="utf-8")

    def test_no_write_back_of_the_bag(self) -> None:
        self.assertNotIn(
            "coeffs: editing.coeffs",
            self.shape,
            "the scratchpad→params write-back of the legacy bag is "
            "back — the Run gate refuses these keys (the declared "
            "sculpt draft is the legal successor, pinned in "
            "test_anny_sculpt.py)",
        )

    def test_scrub_lifts_stragglers(self) -> None:
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

    def test_caps_defaults_seed_no_legacy(self) -> None:
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

    def setUp(self) -> None:
        self.shape = ANNY_SHAPE.read_text(encoding="utf-8")

    def test_imports_the_body_cards_components(self) -> None:
        for piece in ("BodyShapePanel", "MeshPreviewCanvas", "bodyStudio"):
            self.assertIn(
                f"../../../body/ui/studio/{piece}",
                self.shape,
                f"shape.tsx stopped importing the body card's {piece} — "
                "a second implementation is the drift this merge bans",
            )

    def test_apply_bakes_through_the_queue_flow(self) -> None:
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

    def test_authored_dialect_verbatim(self) -> None:
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

    def test_component_mounts_the_band(self) -> None:
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
    def setUpClass(cls) -> None:
        cls.component = ANNY_COMPONENT.read_text(encoding="utf-8")
        cls.shape = ANNY_SHAPE.read_text(encoding="utf-8")

    def test_the_rail_is_tabbed(self) -> None:
        # The strip is THE SHARED RailTabs component (operator order:
        # "Reusing components") — the anny rail mounts it with the
        # three big sections; Shape's sub-menus mount the same strip
        # dense. role=tablist/tab live in the shared file.
        shared = (
            REPO / "packages/engines/comfyui/action_cards/3d/ui"
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

    def test_both_levels_reuse_the_strip(self) -> None:
        # Shape's sub-menus (Phenotype/Body/Face) use the SAME strip,
        # dense, inside the body panel's kit Tabs (state stays the
        # Tabs' — TabsContent must live inside it).
        panel = (
            REPO / "packages/engines/comfyui/action_cards/3d/body"
            "/ui/studio/BodyShapePanel.tsx"
        ).read_text(encoding="utf-8")
        self.assertIn('from "../../../ui/railTabs"', panel)
        self.assertRegex(panel, r"<RailTabs[\s\S]{0,120}dense", "the sub-menu level is dense")
        # the kit TabsList/TabsTrigger are GONE from the panel (one
        # strip shape, not two)
        self.assertNotIn("TabsList", panel)
        self.assertNotIn("TabsTrigger", panel)

    def test_import_holds_presets_and_the_mhr_estimate(self) -> None:
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

    def test_the_pane_owns_the_scroll(self) -> None:
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

    def test_shape_expands_into_the_drawer_not_a_second_panel(self) -> None:
        # 2026-09-07: the drawer rides a ViewportAnchor (edge-right)
        # over the figure — the gate stays shapeExpanded, ONE panel.
        self.assertRegex(
            self.component,
            r"\{shapeExpanded && \(\s*\n\s*<ViewportAnchor[^>]*>\s*\n"
            r"\s*<AnnyShapeDrawer",
        )
        self.assertIn("{!shapeExpanded && <AnnyShapeBand", self.component,
                      "ONE BodyShapePanel instance: the drawer replaces "
                          "the rail band while expanded")
        self.assertIn("w-80", self.shape, "the drawer is the wide surface")

    def test_the_bridge_survives_layout_moves(self) -> None:
        self.assertIn("useAnnyShapeBridge(props.stage, props.onSave)",
                      self.component,
                      "the bridge mounts ONCE at the studio level — it "
                      "must not unmount when the panel moves rail↔drawer")

    def test_the_assembly_truth_is_never_folded(self) -> None:        # 2026-09-06: the estimate result landed in a folded
        # <details> — a completed run read as "the mesh never
        # changed" with the body one click away. A result the
        # operator cannot see is a result that did not happen.
        self.assertNotRegex(
            self.component,
            r"<details[\s>]",
            "the assembly section folded again — the estimate "
            "result must be visible, never one click away",
        )
        # 2026-09-07 kit-era amendment: the raw <section aria-label=...>
        # wrapper became the kit RailSection, which DERIVES the
        # section's aria-label from its title prop (web/ui/src/
        # rail-section.tsx) — the accessible name is pinned through
        # the title on the anny-assembly-truth section.
        self.assertRegex(
            self.component,
            r'(?s)<RailSection\s*id="anny-assembly-truth"'
            r'.*?title="Assembly — ',
            "the always-open assembly section lost its label",
        )

    def test_one_mesh_no_second_scene(self) -> None:
        # 2026-09-06, verbatim: "Can you tell of an app that has two
        # meshes like this? Where there are two sources of truth you
        # guess between at all times?" then "DO IT. I WANT A REAL
        # APP, NOT SOME TOY APP YOU LIKE BECAUSE IT IS EASY." No real
        # character app (MetaHuman, MakeHuman, DAZ) shows two meshes:
        # params are the SSOT, ONE live mesh renders them, the baked
        # result is an export. The native anny figure IS the mesh;
        # the GLB is an artifact (slot chip + turnaround input).
        self.assertIn(
            'viewport="none"',
            self.component,
            "the anny card stopped passing viewport=\"none\" — the "
            "GLB Stage came back as a second scene to guess against",
        )
        self.assertNotIn(
            "<Stage ",
            self.component,
            "the anny card renders a GLB Stage directly — only the "
            "shared AssemblyStudio may, and anny opted out",
        )
        self.assertNotIn(
            "/v1/studios/3d/anny/base-body",
            self.component,
            "the base-body placeholder fetch came back — the native "
            "figure renders the neutral base; no preview GLB fetch",
        )

    def test_source_photo_pin_survives_reload(self) -> None:
        # 2026-09-06, verbatim: "We need to have an image preview
        # when the card is drilled out for ANNY and IMAGE->3d". The
        # photo is an estate path (data/input/<name>) no <img> can
        # load; the pin maps it through estateInputUrl (the input
        # preview door /v1/assets/inputs/<name>) so the opened card
        # shows what the body came from — the Meshy/Luma reference
        # pattern, over the one mesh.
        for needle, why in [
            ("ReferenceImageBadge", "the source-photo pin vanished — "
             "a drilled-out card shows no preview of its own input"),
            ("estateInputUrl", "the pin stopped mapping the estate "
             "path through the input preview door — the preview dies "
             "on reload"),
            ('label="Source photo"', "the pin lost its label"),
        ]:
            self.assertIn(needle, self.component, why)

    def test_the_apply_chip_warns_before_replacing_an_estimate(self) -> None:
        # 2026-09-06: the anny-params bake takes the lever recipe
        # ALONE (no body input) — Apply after Estimate destroys the
        # photo body. The chip must read the slot's body_origin and
        # say "Replace estimated body", never a bland "Apply".
        self.assertIn("replacesEstimate", self.component,
                      "the studio stopped telling the viewport the "
                      "slot holds an estimate")
        self.assertIn("Replace estimated body", self.shape,
                      "the Apply chip lost its replace warning")
        self.assertIn("replaced, not tweaked", self.shape,
                      "the replace title lost its plain-language "
                      "warning")


class TestBodyCardRetirementPending(unittest.TestCase):
    """The body card still EXISTS this stroke (sequenced retirement —
    its dir + goldens collide with the in-flight pipe-carry stroke).
    When the retirement lands, DELETE this test with the card; until
    then this pin documents the transitional two-card state."""

    def test_body_card_dir_still_present(self) -> None:
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

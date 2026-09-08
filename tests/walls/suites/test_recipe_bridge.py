"""Recipe bridge walls (2026-09-06, operator order "build the recipe
bridge" — which turned out to already exist: the commercial chain is
parametric end-to-end, photo → MHR params → SOMA npz → anny
identity_coeffs → GLB; the GLB is baked FROM the recipe, so seeding
it back is exact, not fitting).

Pins the three links no test runner can fake without the files:

  1. the engine node surfaces anny_preset.json on its ui (else the
     gateway harvest never downloads it and the run carries GLB
     only — the pre-bridge state);
  2. the TS ignore-list restates SOMA-X AnnySimplified.ignore_names
     verbatim (a drifted restatement seeds the wrong 139);
  3. the flow declares the recipe artifact (docstring honesty).
"""

import os
import re
import unittest

from _anchor import REPO

from melite_models import PRESET_PARAMS_FILENAME

VENDOR_NODES_PY = os.path.join(
    REPO, "vendor", "comfyui_extensions", "melite-kimodo-nodes",
    "nodes_anny.py")
SOMAX_IDENTITY_PY = os.path.join(
    REPO, "data", "runtime", "anny-commercial", "SOMA-X", "soma",
    "body", "identity_model.py")
SHAPE_TSX = os.path.join(
    REPO, "packages", "engines", "comfyui", "action_cards", "3d",
    "anny", "ui", "studio", "shape.tsx")
FLOW_PY = os.path.join(
    REPO, "flows", "anny-hmr-commercial", "flow.py")


def _src(path: str) -> str:
    with open(path, encoding="utf-8") as f:
        return f.read()


class TestNodeSurfacesTheRecipe(unittest.TestCase):
    def test_preset_json_rides_the_ui_surface(self) -> None:
        src = _src(VENDOR_NODES_PY)
        # the ONE shared filename (rung 6), on the harvested surface
        self.assertIn('"%s"' % PRESET_PARAMS_FILENAME, src)
        self.assertIn("three_model", src)
        self.assertIn("ui_files", src)


class TestIgnoreListMatchesSomax(unittest.TestCase):
    def test_literal_equals_source(self) -> None:
        def _labels(src: str) -> list[str]:
            m = re.search(
                r'ignore_names\s*=\s*\[([^\]]*)\]', src)
            self.assertIsNotNone(m, "ignore_names literal moved shape")
            assert m is not None
            return re.findall(r'"([^"]+)"', m.group(1))

        ts = _src(SHAPE_TSX)
        m = re.search(
            r'ESTIMATE_IGNORED_PARTS\s*=\s*\[([^\]]*)\]', ts)
        self.assertIsNotNone(m, "TS ignore list moved shape")
        assert m is not None
        mine = re.findall(r'"([^"]+)"', m.group(1))
        theirs = _labels(_src(SOMAX_IDENTITY_PY))
        self.assertEqual(mine, theirs,
                         "the TS restatement drifted from SOMA-X — "
                         "the seed would name the wrong 139")


class TestFlowDeclaresTheRecipe(unittest.TestCase):
    def test_docstring_names_the_harvest(self) -> None:
        self.assertIn(PRESET_PARAMS_FILENAME, _src(FLOW_PY))


if __name__ == "__main__":
    unittest.main()

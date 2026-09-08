"""Input ingestion vocabulary (2026-09-06 — the "Input cards don't
accept image files" incident, second half).

The canvas drop gate (FlowCanvas: familyAccepts("input")) reads the
served catalog — but the backend never served `accepts`, so the
frontend fell back to [] and EVERY canvas drop hard-failed with that
toast, image files included. The 2026-09-05 boarding fixed the engine
(same toast, first half); this stroke declares + serves the vocabulary.

Pins: the input family declares image+audio (the card's own copy —
"Image or audio (video is not boarded yet)"; the estate's video rail
is VHS, so video still toasts, correctly); unknown members refuse at
class construction; the served catalog carries the key.
"""

import os
import unittest

from _anchor import REPO

import catalog as _catalog
from melite_models import Model, ModelError, load_model_py

INPUT_MODEL_PY = os.path.join(
    REPO, "packages", "engines", "comfyui", "models", "image", "input",
    "model.py")


def _input_cls() -> type[Model]:
    return load_model_py(INPUT_MODEL_PY, "comfyui")


class TestInputDeclaresItsIngestion(unittest.TestCase):
    def test_image_and_audio(self) -> None:
        self.assertEqual(tuple(_input_cls().accepts), ("image", "audio"))

    def test_default_is_empty(self) -> None:
        self.assertEqual(tuple(Model.accepts), ())


class TestAcceptsRefusesUnknownAtConstruction(unittest.TestCase):
    def test_bogus_member_dies(self) -> None:
        from melite_models import Cell, Quant, Variant

        with self.assertRaises(ModelError) as ctx:
            class _Bad(Model):
                id = "bad-accepts-test"
                label = "b"
                genre = "image"
                form = "form_input"
                engine = "comfyui"
                accepts = ("image", "hologram")
                variants = (
                    Variant(id="base", cells=(Cell(quant=Quant.NATIVE),)),
                )

        self.assertIn("hologram", str(ctx.exception))


class TestCatalogServesAccepts(unittest.TestCase):
    def test_families_input_carries_the_key(self) -> None:
        served = _catalog.scan_catalog(str(REPO))
        fam = served["families"]["input"]
        self.assertEqual(fam["accepts"], ["image", "audio"])


if __name__ == "__main__":
    unittest.main()

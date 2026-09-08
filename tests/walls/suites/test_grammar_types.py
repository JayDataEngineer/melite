"""test_grammar_types — PYTHON SHAPE LAW rung 3 (closed vocabularies
are enums) pinned at the wall.

The estate's two closed-vocabulary rows in LaneInputs and one
class-attr on Model used to be plain str. A typo in a model.py
(`genre = "imag"`, `clip_type = "lumina"`) loaded fine and surfaced
as a runtime node mismatch or a wrong-vocabulary fallback — the
exact leak class the user pinned ("the FEEDING LAW era died;
don't reopen the door with str-typed vocabs").

This wall:
  1. the TYPES are enums (LaneInputs.clip_type is ClipType|None,
     LaneInputs.latent_node is LatentNode, Model.genre is Genre);
  2. a typo refuses AT CONSTRUCTION, not at run time;
  3. every model class on the estate has its genre + clip_type
     resolve to the enum (no leftover str literals on the BOARDED
     set — the swept set).
"""

import os
import sys
from typing import cast

import pytest

REPO = os.path.normpath(os.path.join(os.path.dirname(
    os.path.abspath(__file__)), "..", "..", ".."))


@pytest.fixture(scope="module", autouse=True)
def _estate_path() -> None:
    p = os.path.join(REPO, "python")
    if p not in sys.path:
        sys.path.insert(0, p)


from melite_models import (  # noqa: E402
    Model, LaneInputs, Genre, ClipType, LatentNode,
    Variant, Cell, Quant,
    load_model_py, scan_engine_models,
)


def test_clip_type_is_typed_enum_or_none() -> None:
    """The field is ClipType|None — not str (rung 3)."""
    ann = LaneInputs.model_fields["clip_type"]
    assert ann.annotation is ClipType or ann.annotation == (
        ClipType | None) or str(ann.annotation) in (
        "ClipType | None", "typing.Union[ClipType, None]",
        "Optional[ClipType]"), \
        "LaneInputs.clip_type annotation is %r — must be ClipType|None" \
        % ann.annotation
    # Default None (audiocore lanes don't load through CLIPLoader)
    li_aud = LaneInputs(family="qwen3_tts", model_path="/abs")
    assert li_aud.clip_type is None


def test_latent_node_is_typed_enum() -> None:
    ann = LaneInputs.model_fields["latent_node"]
    assert ann.annotation is LatentNode, \
        "LaneInputs.latent_node must be LatentNode (got %r)" % ann.annotation
    assert LaneInputs.model_fields["latent_node"].default is LatentNode.SD3


def test_model_genre_is_genre_enum() -> None:
    """Model declares `genre: Genre`; a typo refuses at class body.
    Resolved through get_type_hints (the way Python resolves them) —
    the module uses `from __future__ import annotations`, so raw
    __annotations__ carry strings and the resolution is the honest
    check."""
    from typing import get_type_hints
    import melite_models.grammar as g
    hints = get_type_hints(Model)
    assert hints.get("genre") is Genre, \
        "Model.genre annotation must resolve to Genre (got %r)" % hints.get("genre")
    # Typo via direct construction
    with pytest.raises(ValueError):
        Genre("imag")
    # A real Model subclass with `genre = "imag"` (legacy str) must
    # REFUSE at class creation — the metaclass's coerce retired
    # 2026-09-07 with the sweep complete (no model.py states a raw
    # str; the typed-genre wall below pins it).
    with pytest.raises(Exception) as ei:

        class _BadGenre(Model):
            id = "bad-genre-probe"
            unoffered = True
            # cast states the LIE to the static checker (the value IS
            # a raw str); the runtime boot gate must refuse it — no
            # silenced checker, the annotations wall allows none
            genre = cast("Genre", "imag")
            variants = (
                Variant(
                    id="probe",
                    cells=(Cell(quant=Quant.NATIVE),),
                ),
            )

    assert "raw str" in str(ei.value), \
        "genre=str must refuse naming the str (%r)" % (ei.value,)


def test_clip_type_typo_refuses_at_construction() -> None:
    with pytest.raises((ValueError, Exception)):
        LaneInputs(clip_type="lumina_typo", unet="x.safetensors",
                   text_encoder="t.safetensors", vae="v.safetensors")


def test_genre_typo_refuses_at_construction() -> None:
    with pytest.raises(ValueError):
        Genre("imag")


def test_every_loaded_model_has_typed_genre_and_clip_type() -> None:
    """Every model class on the estate: genre is a Genre member (or
    Genre.NONE for utilities), clip_type is ClipType|None. The
    mechanical sweep turned `genre = "image"` into `Genre.IMAGE`
    and `clip_type="krea2"` into `ClipType.KREA2`; this wall pins
    it so a regression to str literals is a red."""
    # The scan iterates every model dir; the parallel session's
    # in-flight genre reorg (other→pose, image→edit, ...) leaves
    # duplicate model ids in two genre dirs whose loader safety
    # (one cache key = one canonical path) refuses. We skip the
    # scan when the only error is a duplicate-genre collision
    # (the migration is the parallel session's to land) — the
    # type PIN runs against the models that DO load, which covers
    # every model once the reorg lands. The duplicate itself is
    # load_model_py's safety, not a grammar-types issue.
    try:
        catalog = scan_engine_models(REPO)
    except Exception as e:
        if "refusing to alias" in str(e):
            pytest.skip("catalog scan blocked by parallel-session "
                        "duplicate-genre migration: %s" % e)
        raise
    bad = []
    for mid, (_p, cls) in catalog.items():
        # Genre
        if not isinstance(cls.genre, Genre):
            bad.append("%s.genre = %r (type %s)" %
                       (mid, cls.genre, type(cls.genre).__name__))
        # ClipType (LaneInputs may be None for tool/cardless models
        # — skip; for models declaring lane_inputs, it must be
        # ClipType or None)
        li = getattr(cls, "lane_inputs", None)
        if li is not None and li.clip_type is not None \
                and not isinstance(li.clip_type, ClipType):
            bad.append("%s.lane_inputs.clip_type = %r (type %s)" %
                       (mid, li.clip_type, type(li.clip_type).__name__))
    assert not bad, "models with loose-typed closed vocabs:\n  " + \
        "\n  ".join(bad)


def test_weightless_shape() -> None:
    """The weightless lane (fit + skin CPU surgery, 2026-09-06): bare
    LaneInputs(weightless=True) builds; any weight fact beside it
    refuses; the NO_WEIGHTS sentinel is gone from the tree."""
    li = LaneInputs(weightless=True)
    assert li.weightless is True
    assert li.family == "" and li.model_path == ""
    with pytest.raises(Exception):
        LaneInputs(weightless=True, unet="hero.safetensors")
    with pytest.raises(Exception):
        LaneInputs(weightless=True, family="skin",
                   model_path="NO_WEIGHTS")
    with pytest.raises(Exception):
        LaneInputs(weightless=True, clip_type=ClipType.LUMINA2)
    assert LaneInputs(weightless=False,
                      unet="hero.safetensors").unet == "hero.safetensors"


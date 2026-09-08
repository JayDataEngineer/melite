"""Walls: VariantGroup.default — the declared LANDING variant.

Operator orders (verbatim):
- 2026-09-06: "you need to fix recpiece. THere should be default, and
  that is what we land on" — a fresh card LANDS on the declared
  default, never on nothing.
- 2026-09-06 (recipe audit): every card family ships the 'default'
  recipe — ALWAYS. The Recipe group is grammar-owned (RECIPE_GROUP in
  python/melite_models/grammar.py): it rides every family automatically
  with landing default='default'. A family declaring its own Recipe
  group, or its own variant id 'default', refuses at IMPORT.

Three gates:

1. CONSTRUCTION: the grammar refuses a family-owned 'default'
   variant id and a family-owned Recipe group (the krea-2
   realism-landing fossil died here).
2. UNIVERSAL: EVERY offered family carries Variant(id='default',
   group='Recipe') + the Recipe group landing on it.
3. WIRE: the served form-spec carries the Recipe group's default
   ('default') — what the editor's landing reads.
"""
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "python"))

from melite_models import Model, ModelError, Variant, VariantGroup  # noqa: E402


def test_family_owned_default_variant_refuses_at_construction() -> None:
    """The 'default' coordinate is grammar-owned — a family restating
    it (even identically) refuses at IMPORT, never forks at run time."""
    try:
        type("ProbeOwnDefault", (Model,), {
            "id": "probe-default",
            "form": "form_generate",
            "variants": (
                Variant(id="default", group="Recipe", defaults={}),
            ),
        })
    except ModelError as e:
        assert "owns" in str(e) or "canonical" in str(e) or \
            "DEFAULT_RECIPE" in str(e), str(e)
    else:
        raise AssertionError("family-owned 'default' sailed through")


def test_family_owned_recipe_group_refuses_at_construction() -> None:
    """The Recipe GROUP is grammar-owned too — a family declaring its
    own (the krea-2 default='realism' fossil) refuses at IMPORT."""
    try:
        type("ProbeOwnGroup", (Model,), {
            "id": "probe-group",
            "form": "form_generate",
            "variants": (
                Variant(id="std", label="Std", route="probe-group"),
            ),
            "variant_groups": (
                VariantGroup(id="Recipe", default="realism"),
            ),
        })
    except ModelError as e:
        assert "RECIPE_GROUP" in str(e), str(e)
    else:
        raise AssertionError("family-owned Recipe group sailed through")


def test_every_offered_family_ships_default_recipe() -> None:
    """UNIVERSAL: every offered family carries the canonical default
    recipe row + the Recipe group landing on it — appended last
    (resolve() owns variants[0])."""
    from melite_models import scan_engine_models

    checked = 0
    for _p, cls in scan_engine_models(str(REPO)).values():
        if getattr(cls, "unoffered", False):
            continue
        defaults = [v for v in (cls.variants or ())
                    if v.id == "default" and v.group == "Recipe"]
        assert defaults, (
            "family %s ships no 'default' recipe row" % cls.id)
        assert (cls.variants or ())[-1].id == "default", (
            "family %s: default recipe must ride LAST (variants[0] is "
            "the resolve fallback)" % cls.id)
        groups = [g for g in (cls.variant_groups or ())
                  if g.id == "Recipe"]
        assert groups and groups[0].default == "default", (
            "family %s: Recipe group must land on 'default'" % cls.id)
        checked += 1
    assert checked >= 1, "no offered families scanned"


def test_served_spec_carries_the_group_default() -> None:
    """The wire passthrough: /v1/form-spec's features.variant_groups
    row carries default='default' on every image-lane family — what
    the editor's landing reads."""
    import plugins  # noqa: F401  (scan registers families before the walk)
    from editor_forms import form_spec
    for mid in ("krea-2", "qwen-img-edit-2511", "z-image", "anima"):
        rc, spec = form_spec(str(REPO), mid)
        assert rc == 200, spec
        groups = spec["features"]["variant_groups"]
        assert groups["Recipe"].get("default") == "default", (
            "%s: %r" % (mid, groups["Recipe"]))
        ids = [v["id"] for v in spec["variants"]
               if v.get("group") == "Recipe"]
        assert ids and ids[0] == "default", (
            "%s: default recipe must serve FIRST in its group: %r"
            % (mid, ids))

"""The universal sidebar declaration wall (ledger row 3).

Operator order 2026-09-06: "THE SOURCE DECLARES WHAT THE END USERS
CAN DO, NOT THE OTHER WAY AROUND" — every ActionCard declares its
/v1/forms coordinates (sidebar_order / sidebar / default_service);
the table derives uniformly, zero per-card branches. ALL MUST: this
wall refuses a card missing the trio, a sidebar outside the closed
vocabulary, or a shared order. (default_service ∈ scan-covers is
walled with the derivation slice.)
"""

import glob
import importlib.util
import os
import sys

REPO = os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, os.path.join(REPO, "py"))
sys.path.insert(0, REPO)

from melite_cards import ActionCard  # noqa: E402

ROOTS = (
    "plugins/engines/comfyui/action_cards",
    "plugins/engines/cpp/audio-cpp/action_cards",
    # (the cpp/autoremesher root RETIRED 2026-09-07 with the lane —
    # the quad-remesh card moved comfyui-side, covered by the first
    # root; the lane holds vendor/ only now.)
    "plugins/engines/cpp/skintokens/action_cards",
    "plugins/engines/node/anycreature/action_cards",
)


def _load_cards() -> "dict[str, dict[str, object]]":
    cards = {}
    for root in ROOTS:
        for path in sorted(glob.glob(
                os.path.join(REPO, root, "*", "*", "py", "card.py"))):
            alias = "sbw_" + path.replace("/", "_")
            spec = importlib.util.spec_from_file_location(alias, path)
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            for name in dir(mod):
                obj = getattr(mod, name)
                if (isinstance(obj, type)
                        and issubclass(obj, ActionCard)
                        and obj is not ActionCard
                        and getattr(obj, "id", "")):
                    assert obj.id not in cards, \
                        "duplicate card id %r (%s, %s)" % (
                            obj.id, path, cards[obj.id][0])
                    cards[obj.id] = (path, obj)
    return cards


CARDS = _load_cards()


def test_every_card_declares_the_sidebar_trio() -> None:
    missing = sorted(
        cid for cid, (_, cls) in CARDS.items()
        if not isinstance(getattr(cls, "sidebar_order", None), int)
        or not getattr(cls, "sidebar", "")
        or not getattr(cls, "default_service", ""))
    assert not missing, \
        "cards missing the universal sidebar trio: %s" % missing


def test_sidebar_values_inside_the_closed_vocabulary() -> None:
    bad = sorted(
        cid for cid, (_, cls) in CARDS.items()
        if cls.sidebar not in ActionCard.SIDEBAR_SECTIONS)
    assert not bad, "sidebar outside SIDEBAR_SECTIONS: %s" % bad


def test_sidebar_orders_unique() -> None:
    seen = {}
    dupes = set()
    for cid, (_, cls) in CARDS.items():
        order = cls.sidebar_order
        if isinstance(order, int):
            if order in seen:
                dupes.add(order)
            seen[order] = cid
    assert not dupes, "shared sidebar_order values: %s" % sorted(dupes)


def test_base_owns_no_sidebar_default() -> None:
    # A base default would exempt cards silently (a special clause by
    # another name) — the trio has no default, hidden stays opt-out.
    assert ActionCard.sidebar_order is None
    assert ActionCard.sidebar == ""
    assert ActionCard.default_service == ""
    assert ActionCard.sidebar_hidden is False

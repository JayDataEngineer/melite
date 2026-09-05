"""Card-field validation wall: EVERY field declaration refuses LOUD.

The DSL gates (probed live, pinned below — a green pin is a refused
construction, never a served typo):
  - number shape: min>max, step<=0, numeric default outside [min,max]
  - options: VocabRef | list | JSON str only
  - unknown kwargs: frozen kw_only dataclass -> TypeError
  - field names: lowercase identifiers, bound once by _CardMeta
  - card shape: fields-without-id, illegal card id, models=+families=
    together, empty packs, phantom LorasMod flavors
  - notch vocabularies: layout/size (pinned in test_studio_slots.py)

The ONE open gate this wall ratchets (not closes): the field TYPE
string. TYPE_NAMES is an identity map with a raw fallback, so
Field(type='asd') CONSTRUCTS and the typo rides the wire to an
editor widget that never heard of it. The subclasses (Number,
Textarea, …) are closed by construction — a typo'd class name is a
NameError at import — so only explicit type='…' strings are walked,
and they must land in the closed set, with ONE recorded
dispensation: h3-timeline's live int/bool/float wire dialect (its
editor renders it today; unifying the wire is an editor-side
coordinated order, not a wall break). The dispensation is an
EQUALITY pin: a second card starting its own dialect fails, and the
day h3 flips to subclasses the entry must be deleted with it.
"""

import os
import re

import pytest

from _anchor import REPO

from melite_cards import (
    ActionCard,
    Field,
    Number,
    Textarea,
    ValidationError,
)


def _probe(fn):
    try:
        fn()
    except (ValidationError, TypeError) as e:
        return e
    raise AssertionError("NOT CAUGHT: %s" % fn)


def test_number_shape_refuses() -> None:
    e = _probe(lambda: Number(label="x", min=10, max=5))
    assert "min 10 > max 5" in str(e)
    e = _probe(lambda: Number(label="x", step=0))
    assert "must be > 0" in str(e)
    e = _probe(lambda: Number(label="x", min=0, max=10, default=99))
    assert "outside [0, 10]" in str(e)


def test_options_vocab_refuses() -> None:
    e = _probe(lambda: Textarea(label="x", options=12345))
    assert "options must be" in str(e)


def test_unknown_kwarg_refuses() -> None:
    _probe(lambda: Number(label="x", nonsense=1))


def test_field_name_and_card_shape_refuse() -> None:
    def bad_name():
        class _C(ActionCard):
            id = "ok"
            Body_Glb = Number(label="x")
    e = _probe(bad_name)
    assert "lowercase identifier" in str(e)

    def no_id():
        class _C(ActionCard):
            x = Number(label="x")
    e = _probe(no_id)
    assert "no card id" in str(e)

    def bad_id():
        class _C(ActionCard):
            id = "Has Space"
            x = Number(label="x")
    e = _probe(bad_id)
    assert "legal identifier" in str(e)


def test_untyped_field_refuses() -> None:
    e = _probe(lambda: Field(label="x"))
    assert "needs a type" in str(e)


_TYPE_RE = re.compile(r"Field\(\s*type\s*=\s*['\"]([^'\"]+)['\"]")
# The live dispensations: h3-timeline's int/bool/float wire dialect and
# image-edit's image_list multi-picker (parallel's in-flight rename
# work — not this stroke's to rewrite). Grandfathered (their editors
# render them), NOT a pattern — EQUALITY pinned below, so a third
# dialect fails and either card's flip to subclasses deletes its entry.
_TYPE_DISPENSATION = {"int", "bool", "float", "image_list"}
_DISPENSATED_CARDS = {
    os.path.join("video", "h3-timeline", "py", "card.py"),
    os.path.join("image", "image-edit", "py", "card.py"),
}


def test_explicit_type_strings_stay_in_vocabulary() -> None:
    from melite_cards.dsl import TYPE_NAMES
    closed = set(TYPE_NAMES)
    offenders: dict[str, list[str]] = {}
    dispensed_files: set[str] = set()
    base = os.path.join(REPO, "plugins", "engines")
    for engine in sorted(os.listdir(base)):
        cards = os.path.join(base, engine, "action_cards")
        if not os.path.isdir(cards):
            continue
        for genre in sorted(os.listdir(cards)):
            gd = os.path.join(cards, genre)
            if not os.path.isdir(gd):
                continue
            for card_dir in sorted(os.listdir(gd)):
                cp = os.path.join(gd, card_dir, "py", "card.py")
                if not os.path.isfile(cp):
                    continue
                rel = os.path.relpath(cp, cards)
                for t in _TYPE_RE.findall(open(cp, encoding="utf-8").read()):
                    if t in closed:
                        continue
                    if t in _TYPE_DISPENSATION:
                        dispensed_files.add(rel)
                        continue
                    offenders.setdefault(rel, []).append(t)
    assert not offenders, (
        "explicit Field(type=…) outside the closed vocabulary %s: %s "
        "— a typo'd type rides the wire to an editor widget that "
        "never heard of it; use a typed subclass"
        % (sorted(closed), offenders))
    assert dispensed_files == _DISPENSATED_CARDS, (
        "type dispensation scope changed: %s (want exactly %s) — a "
        "new dialect started (refused) or a card flipped to "
        "subclasses (delete its dispensation entry with it)"
        % (sorted(dispensed_files), sorted(_DISPENSATED_CARDS)))

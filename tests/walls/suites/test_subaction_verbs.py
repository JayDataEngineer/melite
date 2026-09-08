"""SubAction verb wall (anny-evolution §5 stroke 1: THE contract).

Verbs are behavior-bearing mods (SubActionMod): a family declares them
in Model.mods, the card mounts them, the studio renders them as chips
that post flow templates through the queue door. anny's estimate verb
is consumer #1, never the specification — this wall checks EVERY card:

  1. WRITES ⊆ CARD — a verb may hydrate only real card fields (a
     write outside the fields is a phantom hydration).
  2. WRITES ⊆ FAMILY — every declaring family's studio.writes must
     cover the verb's writes (attach E4-refuses otherwise — the
     studio-slots wall's law, extended to verbs).
  3. FLOWS EXIST — every runnable engine's flow template loads
     (flows/<name>/flow.py); a chip posting a missing template burns
     a serial-GPU queue slot on a 4xx.
  4. REQUIRES RESOLVES — verb extension ids name real in-tree packs
     (vendor/comfyui_extensions/<pack> — the static half of the
     compose-time requires gate; live object_info is the other half).
  5. KNOBS STAY HOME — the verb's own fields never appear in the
     card surface (zone-law rule 2: verbs own their knobs).
  6. TSX PARITY (interim renderer) — the anny studio's ANNY_VERBS
     rows name the PY declaration's verb id + every runnable flow
     (the chip speaks the declaration, never a hand-copied second
     truth); the no-silent-downgrade phrase rides both sides.

Plus the contract's own shape tests (bad verbs refuse at import —
no id/label/engines, all-refusal engines, flow+refusal together,
empty writes, non-tuple requires).

No GPU, no network — declarations + the flow loader are the wall.
"""

import os
import re
from collections.abc import Iterator
from typing import TYPE_CHECKING

import pytest

from _anchor import REPO

import flow as flow_mod
from melite_cards import (Number, SubActionMod, VerbEngine,
                          ValidationError)
from melite_cards.serialize import scan_engine_cards

if TYPE_CHECKING:
    from melite_cards import ActionCard

MODELS_ROOT = os.path.join(REPO, "packages", "engines", "comfyui",
                           "models")
VENDOR_PACKS = os.path.join(REPO, "vendor", "comfyui_extensions")
ANNY_TSX = os.path.join(
    REPO, "packages", "engines", "comfyui", "action_cards", "3d",
    "anny", "ui", "studio", "component.tsx")

_FAM_RE = re.compile(r"^    id\s*=\s*['\"]([^'\"]+)['\"]", re.M)
_WRITES_RE = re.compile(r"writes\s*=\s*\(([^)]*)\)")
_QUOTED_RE = re.compile(r"""['"]([^'"]+)['"]""")


def _family_writes() -> dict[str, set[str]]:
    """{family id: studio.writes} — parsed from each model.py (one
    family per file; the studio-slots wall's seam, read-only here)."""
    out = {}
    for dirpath, _dirs, files in os.walk(MODELS_ROOT):
        if "model.py" not in files:
            continue
        src = open(os.path.join(dirpath, "model.py"),
                   encoding="utf-8").read()
        m = _FAM_RE.search(src)
        if not m:
            continue
        writes = set()
        for block in _WRITES_RE.findall(src):
            writes.update(_QUOTED_RE.findall(block))
        out[m.group(1)] = writes
    return out


def _cards_with_verbs() -> Iterator[
        tuple[str, type["ActionCard"],
              tuple[tuple[type[SubActionMod], tuple[str, ...]], ...]]]:
    for cid, (_path, cls) in sorted(scan_engine_cards(REPO).items()):
        verbs = getattr(cls, "_verbs_", ())
        if verbs:
            yield cid, cls, verbs


def _vendor_packs() -> set[str]:
    return {e for e in os.listdir(VENDOR_PACKS)
            if os.path.isdir(os.path.join(VENDOR_PACKS, e))}


# ── 1+2. writes ⊆ card fields AND ⊆ declaring families ──────────────

def test_verb_writes_are_card_fields() -> None:
    seen = 0
    for cid, cls, verbs in _cards_with_verbs():
        fields = {f.name for f in cls._fields_}
        for vcls, _fams in verbs:
            seen += 1
            for w in vcls.writes:
                assert w in fields, (
                    "%s: verb %r writes %r — not a card field %s "
                    "(phantom hydration)" % (cid, vcls.id, w,
                                             sorted(fields)))
    assert seen > 0, "no mounted verbs found — the wall scans nothing"


def test_verb_writes_are_family_writes() -> None:
    fam_writes = _family_writes()
    for cid, cls, verbs in _cards_with_verbs():
        for vcls, fams in verbs:
            for fam in fams:
                assert fam in fam_writes, (
                    "%s: verb %r declares family %r with no model.py "
                    "— dangling mount" % (cid, vcls.id, fam))
                missing = set(vcls.writes) - fam_writes[fam]
                assert not missing, (
                    "%s: verb %r writes %s outside family %r "
                    "studio.writes %s (attach would E4-refuse)"
                    % (cid, vcls.id, sorted(missing), fam,
                       sorted(fam_writes[fam])))


# ── 3. runnable engines name loadable flow templates ────────────────

def test_verb_flows_exist() -> None:
    for _cid, _cls, verbs in _cards_with_verbs():
        for vcls, _fams in verbs:
            for e in vcls.engines:
                if e.flow is None:
                    continue
                flow_mod.load_flow(e.flow)  # raises on missing template


# ── 4. requires names in-tree packs ─────────────────────────────────

def test_verb_requires_resolve_in_tree() -> None:
    packs = _vendor_packs()
    for cid, _cls, verbs in _cards_with_verbs():
        for vcls, _fams in verbs:
            for req in vcls.requires:
                assert req in packs, (
                    "%s: verb %r requires %r — no pack at "
                    "vendor/comfyui_extensions/%s" % (cid, vcls.id,
                                                     req, req))


# ── 5. verb knobs never join the card surface ───────────────────────

def test_verb_knobs_stay_home() -> None:
    for cid, cls, verbs in _cards_with_verbs():
        surface = {f.name for f in cls._fields_}
        for vcls, _fams in verbs:
            knobs = {f.name for f in vcls._fields_}
            leak = knobs & surface
            assert not leak, (
                "%s: verb %r knobs %s leaked into the card surface "
                "(zone-law rule 2 — verbs own their knobs)"
                % (cid, vcls.id, sorted(leak)))


# ── 6. TSX interim-renderer parity (anny) ───────────────────────────

def _tsx() -> str:
    return open(ANNY_TSX, encoding="utf-8").read()


def test_tsx_names_the_declared_verbs_and_flows() -> None:
    from melite_cards import load_card_py
    cls = load_card_py(
        os.path.join(REPO, "packages", "engines", "comfyui",
                     "action_cards", "3d", "anny", "python", "card.py"))
    src = _tsx()
    assert cls._verbs_, "anny card mounts no verbs — nothing to par"
    for vcls, _fams in cls._verbs_:
        assert '"%s"' % vcls.id in src, (
            "TSX ANNY_VERBS names no %r — the chip drifted from the "
            "declaration" % vcls.id)
        for e in vcls.engines:
            if e.flow is None:
                continue
            assert '"%s"' % e.flow in src, (
                "TSX names no %r flow — the chip cannot post the "
                "declared %r engine" % (e.flow, e.id))


def test_estimate_verb_is_commercial_only() -> None:
    """ONE verb, ONE engine (operator order, 2026-09-06, verbatim:
    "I ONLY WANT HTE COMMERICAL FLOW. I DON't WANT A DROPDOWN
    DUDE"): the estimate verb declares exactly the commercial
    engine — no picker on the chip, no research lane, no dead
    refine. Both sides, same single id."""
    from melite_cards import load_card_py
    cls = load_card_py(
        os.path.join(REPO, "packages", "engines", "comfyui",
                     "action_cards", "3d", "anny", "python", "card.py"))
    verbs = {v.id: v for v, _ in cls._verbs_}
    (only,) = verbs["hmr-estimate"].engines
    assert only.id == "commercial", (
        "the estimate verb must be the sellable lane alone, not %r" % only.id)
    assert only.flow == "anny-hmr-commercial"
    src = _tsx()
    i = src.find("export const ANNY_VERBS")
    assert i >= 0, "ANNY_VERBS vanished from the TSX chip"
    j = src.find("engines: [", i)
    assert j >= 0, "the estimate verb lost its engines array"
    ids = re.findall(r"\{\s*id:\s*\"([^\"]+)\"", src[j:src.find("]", j) + 1])
    assert ids == ["commercial"], (
        "the TSX chip must declare commercial alone (no dropdown), "
        "got %r" % (ids,))


def test_no_dead_ends_no_silent_downgrade() -> None:
    """Every declared engine is runnable (a flow or a tenant-local
    verb); any refusal row still present carries the shared phrase.
    The anny estimate verb keeps neither — no dead buttons."""
    dead = []
    for cid, _cls, verbs in _cards_with_verbs():
        for vcls, _fams in verbs:
            for e in vcls.engines:
                if e.flow is None and not e.local:
                    if "never a silent downgrade" not in (e.refusal or ""):
                        dead.append("%s/%s/%s" % (cid, vcls.id, e.id))
    assert not dead, "refusal engines without the phrase: %r" % (dead,)


# ── contract shape: bad verbs refuse at import ──────────────────────

def test_verb_without_id_refuses() -> None:
    with pytest.raises(ValidationError):
        class _NoId(SubActionMod):
            label = "x"
            engines = (VerbEngine(id="a", flow="anny-hmr"),)
            writes = ("body_glb",)


def test_verb_without_runnable_engine_refuses() -> None:
    with pytest.raises(ValidationError):
        class _AllRefused(SubActionMod):
            id = "dead"
            label = "x"
            engines = (VerbEngine(id="a", flow=None,
                                  refusal="gone — never a silent downgrade"),)
            writes = ("body_glb",)


def test_engine_with_flow_and_refusal_refuses() -> None:
    with pytest.raises(ValidationError):
        VerbEngine(id="a", flow="anny-hmr", refusal="both")


def test_engine_without_either_refuses() -> None:
    with pytest.raises(ValidationError):
        VerbEngine(id="a")


def test_verb_with_empty_writes_refuses() -> None:
    with pytest.raises(ValidationError):
        class _NoWrites(SubActionMod):
            id = "v"
            label = "x"
            engines = (VerbEngine(id="a", flow="anny-hmr"),)
            writes = ()


def test_verb_knob_block_is_kept_not_surfaced() -> None:
    class _Knobby(SubActionMod):
        id = "v"
        label = "x"
        engines = (VerbEngine(id="a", flow="anny-hmr"),)
        writes = ("body_glb",)
        person_index = Number(label="Person", default=0, min=0, step=1)
    assert [f.name for f in _Knobby._fields_] == ["person_index"]

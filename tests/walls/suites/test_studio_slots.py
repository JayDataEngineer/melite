"""G-cluster wall: the STUDIO SLOT CONTRACT, both directions.

The tenant seam (operator order 2026-09-03, formalized in
cardStudios.ts): a family claims a studio with Studio(tenant=
'<genre>/<dir>'); the shell globs action_cards/<genre>/<dir>/ui/
studio/component.tsx and registers the tenant id '<genre>/<dir>'.

Two failure classes this wall refuses:
  1. PHANTOM TENANT — a family declares Studio(tenant=X) but no
     component.tsx lives at X's ui/studio (the studio tab renders
     an empty panel — a broken authoring surface).
  2. ORPHAN BODY — a component.tsx exists under some card's
     ui/studio but NO family claims that tenant (dead UI drift:
     a body the loader can never mount; it also silently shadows
     the default schema form for that card id if one ever lands).

The generic abstraction (2026-09-05: Trellis/Anny run the shared
AssemblyStudio, Kimodo CAN adopt it) adds two declaration parities:
  3. KIND⟺BODY — Studio(kind=assembly) ⟺ the tenant's component.tsx
     imports the generic (ui/studios/assembly — a relative import,
     like every sibling tenant's ../viewers).
     A bespoke body claiming assembly (or vice versa) renders the
     wrong surface with zero errors — refused here.
  4. SLOT TABLE — a generic tenant declares its slots ONCE, as a
     <NAME>_SLOTS: AssemblySlot[] const. Every key must be a real
     File/Image field of the owning card AND a declared studio.write
     of the claiming family (attach writes the param — E4 — so a
     slot outside writes is a silent no-op; a slot outside the card
     fields is a phantom square).
"""

import os
import re
from collections.abc import Iterator

import pytest

from _anchor import REPO
MODELS_ROOT = os.path.join(REPO, "packages", "engines", "comfyui", "models")
CARDS_ROOT = os.path.join(REPO, "packages", "engines")

# Studio(tenant='...') — single or double quotes, the declaration
# site. One nesting level tolerated between Studio( and tenant=
# (h3-timeline carries an explanatory comment inside the parens)
_TENANT_RE = re.compile(
    r"Studio\((?:[^()]|\([^()]*\))*?tenant\s*=\s*['\"]([^'\"]+)['\"]")

# the shell's derivation anchor: action_cards/<genre>/<card>/ui/studio/
# (repo-relative: <engine>.action_cards.<genre>.<card>.ui.studio)
_BODY_RE = re.compile(
    r"^[^.]+\.action_cards\.(?P<genre>[^.]+)\.(?P<card>[^.]+)"
    r"\.ui\.studio$")


def _claims() -> dict[str, list[str]]:
    """{tenant_id: [family ids]} — every Studio(tenant=) declaration."""
    out = {}
    for dirpath, _dirs, files in os.walk(MODELS_ROOT):
        if "model.py" not in files:
            continue
        path = os.path.join(dirpath, "model.py")
        src = open(path, encoding="utf-8").read()
        for m in _TENANT_RE.finditer(src):
            fam = os.path.basename(dirpath)
            out.setdefault(m.group(1), []).append(fam)
    return out


def _bodies() -> dict[str, str]:
    """{tenant_id: relpath} — every ui/studio/component.tsx on disk."""
    out = {}
    for dirpath, _dirs, files in os.walk(CARDS_ROOT):
        if "component.tsx" not in files or not dirpath.endswith(
                os.path.join("ui", "studio")):
            continue
        rel = os.path.relpath(dirpath, CARDS_ROOT).replace(os.sep, ".")
        m = _BODY_RE.match(rel)
        if m:
            out["%s/%s" % (m.group("genre"), m.group("card"))] = rel
    return out


@pytest.fixture(scope="module")
def tenant_claims() -> dict[str, list[str]]:
    return _claims()


@pytest.fixture(scope="module")
def tenant_bodies() -> dict[str, str]:
    return _bodies()


def test_every_claimed_tenant_has_body(tenant_claims: dict[str, list[str]], tenant_bodies: dict[str, str]) -> None:
    """Every claimed tenant has a component.tsx on disk."""
    for tenant in sorted(tenant_claims):
        assert tenant in tenant_bodies, (
            "claimed by %s; no action_cards/%s/ui/studio/component.tsx"
            % (", ".join(tenant_claims[tenant]), tenant))


def test_every_body_is_claimed(tenant_claims: dict[str, list[str]], tenant_bodies: dict[str, str]) -> None:
    """Every ui/studio/component.tsx is claimed by a family."""
    for tenant in sorted(tenant_bodies):
        assert tenant in tenant_claims, (
            "%s exists but no model.py declares Studio(tenant=%r)"
            % (tenant_bodies[tenant], tenant))


# ── the generic-abstraction parities (kind⟺body, slot table) ─────────
# The *_SLOTS const is the tenant's slot-table declaration:
#   export const ANNY_SLOTS: AssemblySlot[] = [
#     { key: "body_glb", ... },
#   ];
_GENERIC_IMPORT_FRAG = "studios/assembly"
_SLOTS_RE = re.compile(
    r"[A-Z][A-Z0-9_]*_SLOTS\s*:\s*AssemblySlot\[\]\s*=\s*\[(.*?)\]\s*;?",
    re.DOTALL)
_SLOT_KEY_RE = re.compile(r"""key\s*:\s*['"]([^'"]+)['"]""")
# ONE declaration way: the enum form. A raw kind='assembly' string
# constructs (pydantic coerces str enums) but is refused HERE — the
# wall reads source, and two spellings for one claim is drift.
_KIND_ASSEMBLY_RE = re.compile(r"kind\s*=\s*StudioKind\.ASSEMBLY")
_FIELD_RE = re.compile(r"^\s*(\w+)\s*=\s*(?:File|Image)\s*\(")
_WRITES_RE = re.compile(r"writes\s*=\s*\(([^)]*)\)")


def _body_src(tenant: str, tenant_bodies: dict[str, str]) -> str:
    rel = tenant_bodies[tenant]
    for eng in os.listdir(CARDS_ROOT):
        cand = os.path.join(CARDS_ROOT, eng, "action_cards",
                            *tenant.split("/"), "ui", "studio",
                            "component.tsx")
        if os.path.isfile(cand):
            return open(cand, encoding="utf-8").read()
    raise AssertionError("body vanished mid-wall: %s (%s)" % (tenant, rel))


def _family_model_src(family: str) -> str:
    for dirpath, _dirs, files in os.walk(MODELS_ROOT):
        if os.path.basename(dirpath) == family and "model.py" in files:
            return open(os.path.join(dirpath, "model.py"),
                        encoding="utf-8").read()
    raise AssertionError("claiming family has no model.py: %s" % family)


def _card_field_names(tenant: str) -> set[str]:
    genre, card = tenant.split("/")
    names = set()
    for eng in os.listdir(CARDS_ROOT):
        cand = os.path.join(CARDS_ROOT, eng, "action_cards", genre,
                            card, "py", "card.py")
        if not os.path.isfile(cand):
            continue
        for line in open(cand, encoding="utf-8"):
            m = _FIELD_RE.match(line)
            if m:
                names.add(m.group(1))
    return names


def _claimed_tenants(tenant_claims: dict[str, list[str]],
                       tenant_bodies: dict[str, str]) -> Iterator[tuple[str, str, list[str]]]:
    """Yield (tenant, body-src, claiming families) — the ONE loop shape
    every parity below walks (body presence is pinned above; fail there
    first). Bespoke bodies come through too; callers filter on the
    generic frag."""
    for tenant in sorted(tenant_claims):
        assert tenant in tenant_bodies
        yield tenant, _body_src(tenant, tenant_bodies), tenant_claims[tenant]


def test_bogus_notch_refuses() -> None:
    """layout='asd' dies AT CLASS DEFINITION — a typo'd notch is a
    card that silently renders the default chrome while its author
    believes they declared studio. The _CardMeta gate refuses BEFORE
    any card.py finishes importing (nothing serves, nothing drifts);
    the sibling size notch shares the gate."""
    from melite_cards import ActionCard, ValidationError
    with pytest.raises(ValidationError):
        class _BadLayout(ActionCard):  # noqa: F841
            id = "bad"
            layout = "asd"
    with pytest.raises(ValidationError):
        class _BadSize(ActionCard):  # noqa: F841
            id = "bad2"
            size = "asd"


def test_kind_matches_body(tenant_claims: dict[str, list[str]], tenant_bodies: dict[str, str]) -> None:
    """Studio(kind=assembly) ⟺ the tenant body imports the generic."""
    for tenant, src, families in _claimed_tenants(tenant_claims,
                                                  tenant_bodies):
        body_is_generic = _GENERIC_IMPORT_FRAG in src
        for family in families:
            model_src = _family_model_src(family)
            kind_is_assembly = bool(_KIND_ASSEMBLY_RE.search(model_src))
            assert kind_is_assembly == body_is_generic, (
                "%s claims tenant %s with kind=%s but the body %s the "
                "shared AssemblyStudio — the surface and the "
                "declaration disagree"
                % (family, tenant,
                   "assembly" if kind_is_assembly else "custom/bespoke",
                   "imports" if body_is_generic else "does NOT import"))


def test_generic_slot_tables(tenant_claims: dict[str, list[str]], tenant_bodies: dict[str, str]) -> None:
    """Every generic tenant's slot key is a real card File/Image field
    AND a declared studio.write of the claiming family."""
    for tenant, src, families in _claimed_tenants(tenant_claims,
                                                  tenant_bodies):
        if _GENERIC_IMPORT_FRAG not in src:
            continue  # bespoke bodies declare no slot table
        m = _SLOTS_RE.search(src)
        assert m, ("generic tenant %s declares no <NAME>_SLOTS: "
                   "AssemblySlot[] const — the slot table is the "
                   "declaration" % tenant)
        keys = _SLOT_KEY_RE.findall(m.group(1))
        assert keys, "generic tenant %s has an empty slot table" % tenant
        fields = _card_field_names(tenant)
        assert fields, "no card.py found for tenant %s" % tenant
        for family in families:
            model_src = _family_model_src(family)
            wm = _WRITES_RE.search(model_src)
            writes = set(re.findall(r"""['"]([^'"]+)['"]""",
                                    wm.group(1))) if wm else set()
            for key in keys:
                assert key in fields, (
                    "%s slot %r is no File/Image field of the %s card "
                    "(fields: %s) — a phantom square"
                    % (tenant, key, tenant, sorted(fields)))
                assert key in writes, (
                    "%s slot %r is no studio.write of family %s "
                    "(writes: %s) — attach would E4-refuse"
                    % (tenant, key, family, sorted(writes)))

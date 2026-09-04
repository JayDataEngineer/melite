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
"""

import os
import re

import pytest

from _anchor import REPO
MODELS_ROOT = os.path.join(REPO, "plugins", "engines", "comfyui", "models")
CARDS_ROOT = os.path.join(REPO, "plugins", "engines")

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


def _claims():
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


def _bodies():
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
def tenant_claims():
    return _claims()


@pytest.fixture(scope="module")
def tenant_bodies():
    return _bodies()


def test_every_claimed_tenant_has_body(tenant_claims, tenant_bodies):
    """Every claimed tenant has a component.tsx on disk."""
    for tenant in sorted(tenant_claims):
        assert tenant in tenant_bodies, (
            "claimed by %s; no action_cards/%s/ui/studio/component.tsx"
            % (", ".join(tenant_claims[tenant]), tenant))


def test_every_body_is_claimed(tenant_claims, tenant_bodies):
    """Every ui/studio/component.tsx is claimed by a family."""
    for tenant in sorted(tenant_bodies):
        assert tenant in tenant_claims, (
            "%s exists but no model.py declares Studio(tenant=%r)"
            % (tenant_bodies[tenant], tenant))

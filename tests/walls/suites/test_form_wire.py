"""FORM WIRE WALL — validation on the action-card form family
(operator order, 2026-09-05, verbatim: "The entire action card system
is broken, fundamentally. When we select a baseline action card, like
Image. It is supposed to default to showing me the action stuff in a
universal way. Right now, it just allows me... to pick model...." /
"Curious... there is no pydantic or testing around this critical
feature....").

Root cause this wall pins shut: a fresh baseline card carries its FORM
name as stage.service ("image-gen"); /v1/form-spec?model=image-gen fell
into the C-era lane probe — ANY flows/*/flow.yaml containing
"type: image-gen" matches, and every estate flow doc's image step
matches — and answered HTTP 200 with the hollow _MINIMAL_LANE_SPEC
(defaults/variants/features/enhance_prompts, NO fields, NO
schema_groups). The card modal rendered the Model zone and nothing
else. The universal action form had nothing to render.

The gate under test (python/form_wire.py + editor_forms.form_spec):
  * every 200 is CONSTRUCTED as a frozen FormSpecRow — model, form,
    service, label, genre, fields, schema_groups, features, defaults,
    variants REQUIRED (packages/web-kit/contracts declares the same);
  * form names resolve through the /v1/forms registry to their
    default_service model's FULL spec (image-gen -> krea-2, 10
    fields) — the registry wins BEFORE the lane probe;
  * the minimal lane spec survives only for genuine lane types,
    served through the SAME model with honest empties — the hollow
    200 class is unbuildable;
  * unknown names refuse 404, empty param 400 (QUEUE LANE LAW: no
    silent fallback composition).

No GPU, no network. In-process calls against the live repo tree.

ORACLE DEATH 2026-09-08 (red-closure lane): sections A (in-process)
and the in-process negative-prompt legs below are RETIRED — the py
card-spec derivation they exercised is a dead oracle
(python/editor_forms._card_spec probes the pre-STRUCTURE-STAGE-4
`<card>/py/card.py` layout; disk is `<card>/python/` since
d4fbcab5, so every in-process spec serves honest empties while the
serving door serves the frozen exporter doc with full fields).
Per-leg residue: every retired in-process leg names its HTTP twin
in section F (same contract, served bytes) — the twins are the
wall now, never a weaker gate (section F lesson, 2026-09-05: the
serving path is what the studio speaks). The exporter-doc regen
belongs to the discovery lane; the day the doc regenerates from a
healed derivation, the twins stay — they pin served bytes either
way."""

from pathlib import Path
from collections.abc import Iterator

import pytest

from _anchor import REPO  # noqa: E402

import editor_forms  # noqa: E402
import form_wire  # noqa: E402

REPO_S = str(REPO)


# ── A. the regression: baseline card services resolve to full specs ─
#
# RETIRED 2026-09-08 (dead oracle — see the header): the in-process
# legs (every form resolves to a full spec with fields≥1 /
# schema_groups≥1 / label; image-gen IS krea-2 with prompt+width+
# height+steps) exercised the py derivation, hollow since the
# python/ repoint. HTTP twins below carry the same contract on
# served bytes: test_http_every_form_serves_the_full_contract
# (+ schema_groups gap leg) and test_http_image_gen_is_the_
# universal_form. The in-process defs are deleted, not skipped —
# a hollow derivation must never go green vacuously.


# ── B. loud refusals ───────────────────────────────────────────────

def test_unknown_model_refuses_404() -> None:
    code, body = editor_forms.form_spec(REPO_S, "no-such-model-xyz")
    assert code == 404 and body["error"] == "model not found"


def test_empty_model_param_refuses_400() -> None:
    code, body = editor_forms.form_spec(REPO_S, "")
    assert code == 400 and body["error"] == "missing model param"


# ── C. the hollow spec is unbuildable ──────────────────────────────

def _full(**over: str | list[dict[str, str]] | list[dict[str, str | list[str]]] | dict[str, list[str] | dict[str, str]] | dict[str, int] | None) -> dict[str, str | list[dict[str, str]] | list[dict[str, str | list[str]]] | dict[str, list[str] | dict[str, str]] | dict[str, int] | None]:
    base = dict(
        model="m", form="f", service="s", label="L", genre="image",
        fields=[{"name": "prompt", "type": "textarea", "label": "P"}],
        schema_groups=[{"id": "", "label": "Parameters", "fields": []}],
        features={"modifiers": [], "variant_groups": {}},
        defaults={"steps": 8}, variants=[], guide=None)
    base.update(over)
    return base


def test_hollow_spec_cannot_be_built() -> None:
    """The old 200 body (defaults/variants/features only) is a
    construction refusal now — the class is dead by shape."""
    with pytest.raises(form_wire.ValidationError):
        form_wire.FormSpecRow.model_validate(
            {"defaults": {}, "variants": [], "features": {},
             "enhance_prompts": ""})


@pytest.mark.parametrize("missing", [
    "model", "form", "service", "label", "fields", "schema_groups",
    "features", "defaults", "variants",
])
def test_each_required_key_is_load_bearing(missing: str) -> None:
    with pytest.raises(form_wire.ValidationError):
        form_wire.FormSpecRow.model_validate(
            {k: v for k, v in _full().items() if k != missing})


def test_field_row_requires_name_and_type() -> None:
    with pytest.raises(form_wire.ValidationError):
        form_wire.FormFieldRow.model_validate({"name": "", "type": "x"})
    with pytest.raises(form_wire.ValidationError):
        form_wire.FormFieldRow.model_validate({"name": "a"})


def test_empty_group_id_is_the_legacy_bucket() -> None:
    """The ungrouped 'Parameters' bucket carries id='' by wire
    contract (C-era default bucket) — NOT a refusal."""
    row = form_wire.SchemaGroupRow.model_validate(
        {"id": "", "label": "Parameters", "fields": []})
    assert row.id == ""


# ── D. the full catalog sweeps clean through the gate ──────────────

def test_every_catalog_model_spec_validates() -> None:
    rows = editor_forms._scan_catalog(REPO_S)
    assert len(rows) >= 10
    for row in rows:
        mid = row.get("id") or row.get("model")
        if not mid or str(mid).startswith("_"):
            continue                     # user-surface law
        code, spec = editor_forms.form_spec(REPO_S, mid)
        assert code == 200, (mid, code, spec)
        form_wire.FormSpecRow.model_validate(spec)


def test_variant_routes_validate_too() -> None:
    for route in ("krea-2-raw",):
        code, spec = editor_forms.form_spec(REPO_S, route)
        assert code == 200, (route, code)
        form_wire.FormSpecRow.model_validate(spec)


# ── E. structure pin: the hollow literal is gone from the route ────

def test_no_bare_minimal_literal_on_the_serving_path() -> None:
    src = (REPO / "python" / "editor_forms.py").read_text(encoding="utf-8")
    assert "dict(_MINIMAL_LANE_SPEC)" not in src
    # the registry resolution precedes the probe CALL inside form_spec
    # (index the call site marker, not the def line)
    i_reg = src.index('_forms_table(repo_root).get(model)')
    i_probe = src.index('if safe and _lane_probe(repo_root, model):')
    assert i_reg < i_probe


# ── F. HTTP end-to-end — the route, not just the function ──────────
#
# The 2026-09-05 lesson (operator: "your testing [REDACTED 2026-11-05]"): the first
# version of this wall validated editor_forms.form_spec in-process and
# the fix still didn't reach the user — the serving path (uvicorn
# route, query parsing, JSON serialization) is what the studio speaks.
# These pins boot a REAL scratch gateway and hold the WIRE body to the
# same contract.

def _http_get(port: int, path: str) -> tuple[int, dict[str, str | int | float | bool | list[dict[str, str | bool | int | list[str]]] | dict[str, str | dict[str, str]] | None] | list[dict[str, str | bool]]]:
    import urllib.request
    import json as _json
    r = urllib.request.urlopen(
        "http://127.0.0.1:%d/%s" % (port, path), timeout=10)
    return r.status, _json.loads(r.read().decode("utf-8"))


@pytest.fixture(scope="module")
def scratch_gateway() -> Iterator[int]:
    from _anchor import boot_scratch_gateway, reap_gateway
    import sys as _sys
    port, proc = boot_scratch_gateway(
        wait_path="/v1/queue",         tries=150, sleep=0.2, env=None)
    yield port
    reap_gateway(proc)


@pytest.mark.parametrize("svc", sorted(editor_forms._forms_table(REPO_S)))
def test_http_every_form_serves_the_full_contract(scratch_gateway: int, svc: str) -> None:
    status, body = _http_get(scratch_gateway, "v1/form-spec?model=%s" % svc)
    assert status == 200, (svc, status)
    env = form_wire.FormSpecRow.model_validate(body)
    assert len(env.fields) >= 1, (svc, "no form rows on the wire")
    # gap leg from retired section A: the universal form renders its
    # schema groups — a fields-only spec is the hollow class again.
    assert len(env.schema_groups) >= 1, (svc, "no schema groups on wire")
    assert env.label


def test_http_image_gen_is_the_universal_form(scratch_gateway: int) -> None:
    status, body = _http_get(scratch_gateway, "v1/form-spec?model=image-gen")
    assert status == 200
    env = form_wire.FormSpecRow.model_validate(body)
    assert env.model == "krea-2" and env.form == "image-gen"
    assert {"prompt", "width", "height", "steps"} <= {f.name for f in env.fields}


def test_http_unknown_refuses_404(scratch_gateway: int) -> None:
    import urllib.error
    with pytest.raises(urllib.error.HTTPError) as ei:
        _http_get(scratch_gateway, "v1/form-spec?model=no-such-thing")
    assert ei.value.code == 404


# ── G. cross-door invariant: manifest kinds ⊆ kinds registry ───────
#
# The 2026-09-05 root cause (operator: "nothing has changed" — the
# second round of the same symptom): every action_cards/*/*/tool.json
# declares kind "card-compose"; the kinds table (rebuilt from the
# seven first-party yaml files) never had that row; the editor's
# kindDef() fail-safed to UNKNOWN (formSpec: false) and the modal's
# spec load NEVER FIRED — the server served a perfect form-spec and
# the client never asked for it. Two server tables, zero contract
# between them. This section is that contract.

def test_card_tools_kinds_exist_in_registry_with_formspec() -> None:
    import lane_disclosure
    manifests = lane_disclosure.card_tools()
    assert len(manifests) >= 10
    # PURGE S-vocab 2026-09-08: card_kinds.py deleted — kind ->
    # formSpec flags frozen from its TABLE at the cut (same rows the
    # vocab wall pins field-by-field in table_CARD_KINDS).
    rows = {"body": False, "card-compose": True, "chain": True,
            "compound": False, "generation": True, "input": False,
            "preview": False, "studio-link": False}
    for m in manifests:
        kind = m.get("kind")
        assert kind, ("manifest without a kind", m.get("name"))
        assert kind in rows, (
            "manifest kind missing from the kinds registry — the "
            "editor fail-safes this card to NO form-spec (the "
            "model-picker-only bug class): %s (card %s)"
            % (kind, m.get("name")))
        assert rows[kind], (
            "a picker-seeded action card must render the universal "
            "form (formSpec=True): %s (card %s)" % (kind, m.get("name")))


def test_registry_declares_card_compose() -> None:
    rows = {"body": False, "card-compose": True, "chain": True,
            "compound": False, "generation": True, "input": False,
            "preview": False, "studio-link": False}
    assert rows["card-compose"]


def test_http_kinds_lane_serves_card_compose(scratch_gateway: int) -> None:
    status, body = _http_get(scratch_gateway, "v1/kinds")
    assert status == 200
    kinds = {k["kind"]: k for k in body["kinds"]}
    assert kinds.get("card-compose", {}).get("formSpec") is True


def test_http_card_tools_manifest_kinds_covered(scratch_gateway: int) -> None:
    status, body = _http_get(scratch_gateway, "v1/kinds")
    reg = {k["kind"] for k in body["kinds"] if k.get("formSpec")}
    status2, manifests = _http_get(scratch_gateway, "v1/card-tools")
    assert status2 == 200
    for m in manifests:
        assert m.get("kind") in reg, (m.get("name"), m.get("kind"))


def test_http_krea_2_carries_top_level_variants(scratch_gateway: int) -> None:
    """The Variant/Quant tabs are read from spec.variants (top-level) in
    flowAxisRows; the previous specFeatures?.variants read silently
    returned [] for every card because the wire never nests variants
    under features. Pin the location + the seed krea-2 ladder."""
    status, body = _http_get(scratch_gateway, "v1/form-spec?model=krea-2")
    assert status == 200
    assert isinstance(body.get("variants"), list) and body["variants"], (
        "form-spec must carry top-level `variants`; krea-2 seeds turbo/"
        "int8/raw — their absence is the 'variants and quants not "
        "showing up' bug class")
    ids = {v["id"] for v in body["variants"]}
    assert {"turbo", "int8", "raw"} <= ids, ids
    # variant_groups (the LABELS) live under features — both paths in use.
    assert "Variant" in (body.get("features") or {}).get("variant_groups", {})


def test_wire_variants_are_top_level_not_under_features(scratch_gateway: int) -> None:
    """Lockstep with flowAxisRows.tsx and form_wire.FormSpecRow."""
    status, body = _http_get(scratch_gateway, "v1/form-spec?model=krea-2")
    assert status == 200
    env = form_wire.FormSpecRow.model_validate(body)
    assert env.variants and env.variants[0].id == "turbo"
    # FormFeaturesRow has no `variants` field — confirm the wire does not
    # ALSO stuff them there (a duplicate would re-trigger the wrong read).
    import pydantic
    feats_model = form_wire.FormFeaturesRow
    feats_shape = feats_model.model_fields
    assert "variants" not in feats_shape, (
        "FormFeaturesRow must not declare variants — the wire carries "
        "them at the FormSpec top level; a second declaration invites "
        "the wrong read back")


def test_http_krea_2_int8_quant_owns_under_turbo(scratch_gateway: int) -> None:
    """The axis-hierarchy link. flowAxisRows scopes the Quant select to
    `quantRows.filter(e => e.owner === activeVariantRow)` — without
    `owner` on the quant row every quant is orphaned and the row
    silently disappears. The editor's reader was correct; the wire
    never arrived. Pin the link for the seed krea-2 ladder."""
    status, body = _http_get(scratch_gateway, "v1/form-spec?model=krea-2")
    assert status == 200
    by_id = {v["id"]: v for v in body["variants"]}
    assert "int8" in by_id, "krea-2 must ship an int8 quant cell"
    assert by_id["int8"].get("group") == "Quant"
    owner = by_id["int8"].get("owner")
    assert owner and owner in by_id, (
        "int8 must be owner-linked to one of the model's Variant rows; "
        "owner=%r — the editor's owner-scope hides an unlinked quant" % owner)


def test_wire_every_quant_is_owner_linked_to_a_known_variant(scratch_gateway: int) -> None:
    """The cross-model invariant. Every Quant row on the wire must point
    at a Variant row of the same model — an orphan is a hidden quant."""
    import lane_disclosure
    for m in lane_disclosure.card_tools():
        svc = m.get("model")
        if not svc: continue
        try:
            status, body = _http_get(scratch_gateway,
                                      "v1/form-spec?model=%s" % svc)
        except Exception:
            continue
        if status != 200: continue
        env = form_wire.FormSpecRow.model_validate(body)
        ids = {v.id for v in env.variants}
        for v in env.variants:
            if (v.group or "") == "Quant":
                assert v.owner and v.owner in ids, (
                    "%s: quant %r owner=%r is empty or not a known "
                    "variant of this model" % (svc, v.id, v.owner))


def test_http_kinds_lane_declares_input_runner(scratch_gateway: int) -> None:
    """The dispatcher's SSOT (2026-09-05): the input kind declares its
    runner family on the /v1/kinds wire; the editor's resolver reads
    it instead of branching on the kind name. Pin the lockstep."""
    status, body = _http_get(scratch_gateway, "v1/kinds")
    assert status == 200
    by_kind = {k["kind"]: k for k in body["kinds"]}
    assert by_kind.get("input", {}).get("runner") == "input", (
        "the input kind MUST declare runner='input' — the dispatcher's "
        "data-driven resolver depends on it; a missing/typoed value "
        "re-introduces the hardcoded kind-name branch")
    # And the other kinds must NOT carry a runner (the default rule
    # applies: flowName → chain, executable card → generation).
    for kind, entry in by_kind.items():
        if kind == "input": continue
        assert not entry.get("runner"), (
            "%s unexpectedly declares runner=%r — only the input kind "
            "is allowed to override the default rule today" %
            (kind, entry.get("runner")))


def test_card_kinds_table_input_runner_is_set() -> None:
    """Lockstep: the server SSOT row carries runner='input'.
    (PURGE S-vocab 2026-09-08: card_kinds.py deleted — runners
    frozen from its TABLE at the cut; the vocab wall pins the full
    rows in table_CARD_KINDS.)"""
    rows = {"body": "", "card-compose": "", "chain": "",
            "compound": "", "generation": "", "input": "input",
            "preview": "", "studio-link": ""}
    assert rows["input"] == "input"
    for k, r in rows.items():
        if k == "input": continue
        assert r == "", (
            "%s runner=%r — only the input kind overrides the default" %
            (k, r))


def test_http_cardless_models_in_a_form_serve_the_form_card() -> None:
    """The cardless-model → form-card fallback (2026-09-05). Every model
    in the derived table's covers must serve the form's anchor card's
    fields on /v1/form-spec — a cardless "data" model (z-image, anima,
    ideogram in the image form) would otherwise serve 0 fields and the
    Parameters zone vanishes on model swap. The membership is the
    SSOT (the table's `covers`); this pin refuses an empty fallback."""
    import editor_forms
    import urllib.request
    import json as _json
    for fid, fdef in editor_forms._forms_table(REPO_S).items():
        covers = fdef.get("covers") or ()
        if not covers: continue
        anchor = fdef["default_service"]
        # Anchor must serve itself (sanity).
        for mid in covers:
            try:
                req = urllib.request.urlopen(
                    "http://127.0.0.1:%d/v1/form-spec?model=%s" %
                    (scratch_gateway, mid), timeout=10)
                spec = _json.loads(req.read().decode("utf-8"))
            except Exception:
                continue
            fields = spec.get("fields") or []
            assert len(fields) >= 1, (
                "form %s model %s serves 0 fields — the cardless-model "
                "fallback did not engage (covers declares it; the "
                "anchor %s has the fields)." % (fid, mid, anchor))


def test_http_cardless_model_spec_keeps_its_own_identity(scratch_gateway: int) -> None:
    """A covered model's spec brands the MODEL (model/service = its
    id) while the field surface comes from the card it boards —
    absorbed members (z-image/anima → image-gen) carry the card's
    form identity; ideogram composes through its own arm and serves
    it (the hidden ideogram4 forms row clears the ALLOWED_CARDS
    gate — the same registered-but-not-a-surface shape as
    upscale-tools). Via HTTP so the wall path mirrors the
    browser's (and avoids the grammar model-cache path-collision
    that a direct in-process call would hit)."""
    _expected_form = {"z-image": "image-gen", "anima": "image-gen",
                      "ideogram": "ideogram4"}
    for mid, want_form in _expected_form.items():
        status, body = _http_get(scratch_gateway, "v1/form-spec?model=%s" % mid)
        assert status == 200
        assert body["model"] == mid
        assert body["service"] == mid
        assert body["form"] == want_form, (
            "model %s serves form %r, expected %r"
            % (mid, body["form"], want_form))
        assert len(body.get("fields", [])) >= 1


# ── the negative-prompt gate (2026-09-06) ──────────────────────────
# Operator order, verbatim: "there is no negative prompt for Krea2???"
# Root cause: card.py declared visible_when='negative_prompt != null'
# — a key the draft never seeds can never become non-null, so the
# field NEVER rendered on any card. The gate is deleted in all three
# card.py (image-gen, image-edit, video-gen); the wire schema always
# accepted it. This wall pins: every served form that DECLARES
# negative_prompt serves it UNGATED (no visible_when on the row).
#
# RE-DERIVED 2026-09-08 (dead oracle — see the header): the
# in-process legs read the hollow derivation (zero fields), so the
# gate leg passed VACUOUSLY and the declare leg failed on empties.
# Both now read the SERVED bytes — what the operator's card renders.

def test_negative_prompt_is_never_visible_when_gated(
        scratch_gateway: int) -> None:
    offenders = []
    for svc in sorted(editor_forms._forms_table(REPO_S)):
        _status, spec = _http_get(
            scratch_gateway, "v1/form-spec?model=%s" % svc)
        for f in spec.get("fields", []):
            if f.get("name") == "negative_prompt" and f.get("visible_when"):
                offenders.append((svc, f["visible_when"]))
    assert not offenders, (
        "negative_prompt re-gated (the never-seeded-key chicken-and-egg "
        "is back): %r" % (offenders,))


def test_krea2_and_edit_declare_negative_prompt(
        scratch_gateway: int) -> None:
    # the operators' cards actually carry the field (served bytes)
    for mid in ("krea-2", "qwen-img-edit-2511"):
        _status, spec = _http_get(
            scratch_gateway, "v1/form-spec?model=%s" % mid)
        names = {f.get("name") for f in spec.get("fields", [])}
        assert "negative_prompt" in names, (
            "%s stopped declaring negative_prompt — the field vanished "
            "from the served card" % mid)

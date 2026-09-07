#!/usr/bin/env python3
"""Export the FULL discovery catalog JSON for the native TS gateway.

The discovery doors (GET /v1/model-catalog, /v1/model-catalog/*,
/v1/models/*/provisions/*, /v1/forms, /v1/kinds, /v1/form-spec,
/v1/loras, */v1/flows/families/param-schemas, /v1/schema,
/v1/flows/families/*/param-schema) serve repo-tree-derived reads the
old TS bridge computed by spawning python per request. This exporter
runs those SAME py functions at AUTHORING time and freezes their
answers as data; plugins/gateway/src/doors/discovery.ts serves the
frozen answers natively (the card-decls.json + model-facts.json
data-SSOT pattern: generators die with py; data stands).

    python3 tools/export_discovery_catalog.py \
        > plugins/gateway/data/discovery-catalog.json

Completeness (no reimplementation, no hardcoded lists):
  - form_specs: every key the form_spec() decision tree can serve
    non-404 for, each computed by CALLING form_spec() — catalog model
    ids (catalog.py scan) + editor_forms scan ids + engine-model ids +
    every variant route (_routes keys, the _route_owner source) +
    every forms-table name (the form-name redirect source) + every
    flows/ subdir (the lane-probe source). Any other string 404s on
    py too, so the TS door's flat lookup is complete by construction.
  - loras: every model.py unit id across the same walk model_loras()
    uses, each computed by CALLING model_loras() (first-match law
    included — the exporter keeps whatever the function returns).
  - provisions: the per-family DECLARATION rows (name/folder/url/
    sha256/size_bytes + engine) — the mount (endpoint file +
    model_paths read_root) resolves per request in TS, exactly as
    _provision_mount resolves per request in py (machine paths are
    never frozen into this file).
  - flows: the planes-door flow declarations (lanes/card-tools/
    bundle/skills/agent-boot flow arms, ex planes.ts probe mode
    'flows') — one row per scan_flow_ids() entry in scan order,
    loadable flows with tool property cells + skill_refs +
    has_skill_md, FlowError flows as id/load_error rows.

Wire fidelity: every section is the handler's own return object
(the parsed to_json payload, the (code, body) pairs, the envelope
dicts) serialized with ensure_ascii=False. The TS door re-serves
through parseJson/dumpsPy (number literals verbatim, ensure_ascii
escapes restored), so the bytes match the bridge chain
(json.loads -> runner json.dumps -> parseJson -> dumpsPy) exactly.
Key ORDER is the wire contract — no sort_keys anywhere here.

stdout is pure JSON. stderr carries the counts.
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "py"))


def collect_flows(repo: str) -> list:
    """Freeze the planes-door flow declarations (the probe shape in
    plugins/gateway/src/doors/planes.ts PROBE_SRC, mode 'flows').

    One row per scan_flow_ids() entry, in scan order: loadable flows
    carry id/description/stages/tool/skill_refs/has_skill_md;
    FlowError flows carry id/load_error (the lane splice skips them
    silently). Key ORDER mirrors the probe's json.dumps insertion
    order exactly (the TS door re-serves through parseJson/dumpsPy,
    so order is the wire contract). Importable so walls can stage
    hermetic fixture freezes with the identical shape.
    """
    import flow as _F

    _F.FLOWS_ROOT = Path(repo) / "flows"
    out: list = []
    for _name in _F.scan_flow_ids():
        try:
            _fl = _F.load_flow(_name)
        except _F.FlowError as _e:
            out.append({"id": _name, "load_error": str(_e)})
            continue
        _tool = None
        if _fl.tool is not None:
            _t = _fl.tool
            _props: dict = {}
            for _pn, _pp in _t.properties.items():
                _cell: dict = {"ptype": _pp.ptype.value,
                               "description": _pp.description or ""}
                if _pp.enum:
                    _cell["enum"] = list(_pp.enum)
                if _pp.default is not None:
                    _cell["default"] = _pp.default
                if _pp.minimum is not None:
                    _cell["minimum"] = _pp.minimum
                if _pp.maximum is not None:
                    _cell["maximum"] = _pp.maximum
                _props[_pn] = _cell
            _tool = {"name": _t.name, "version": _t.version,
                     "description": str(_t.description or ""),
                     "properties": _props,
                     "required": list(_t.required)}
        out.append({"id": _fl.id,
                    "description": str(_fl.description or ""),
                    "stages": [{"id": _s.id, "engine": _s.engine}
                               for _s in _fl.stages],
                    "tool": _tool,
                    "skill_refs": list(_fl.skill_refs or ()),
                    "has_skill_md": (Path(repo) / "flows" / _name
                                     / "SKILL.md").is_file()})
    return out


def _prov_dict(p) -> dict:
    return {
        "name": p.name,
        "folder": getattr(p, "folder", "") or "",
        "url": str(getattr(p, "url", "")),
        "sha256": getattr(p, "sha256", None),
        "size_bytes": getattr(p, "size_bytes", None),
    }


def main() -> None:
    repo = os.path.abspath(REPO)
    import catalog as _cat
    import editor_forms as _ef
    import editor_runs as _er
    import flow as _flow
    import gateway as _gw
    from melite_models import scan_engine_models

    # ── catalog (the served to_json object + the scan order) ──
    catalog = _cat.scan_catalog(repo)
    wire = json.loads(_cat.to_json(catalog))
    scan_order = [row["id"] for row in catalog["_scan_models"]]
    assert len(scan_order) == len(set(scan_order)), \
        "duplicate catalog ids — the TS first-match read needs the row list"
    assert list(wire["models"].keys()) == scan_order, \
        "models map order != scan order — inspect before freezing"

    # ── forms / kinds (served envelopes verbatim) ──
    forms = _ef.forms(repo)
    kinds = _ef.kinds(repo)

    # ── form_specs: the complete servable key space ──
    keys: list[str] = []
    seen: set[str] = set()

    def _add(key: str) -> None:
        if key and key not in seen:
            seen.add(key)
            keys.append(key)

    for mid in wire["models"]:
        _add(mid)
    for row in _ef._scan_catalog(repo):
        _add(row["id"])
    engine_models = scan_engine_models(repo)
    for mid in engine_models:
        _add(mid)
    for _path, cls in engine_models.values():
        for route in (getattr(cls, "_routes", None) or {}):
            _add(route)
    for fname in forms["forms"]:
        _add(fname)
    flows_dir = os.path.join(repo, "flows")
    try:
        for name in os.listdir(flows_dir):
            if os.path.isdir(os.path.join(flows_dir, name)):
                _add(name)
    except OSError:
        pass

    form_specs: dict[str, dict] = {}
    for key in keys:
        code, body = _ef.form_spec(repo, key)
        form_specs[key] = {"status": code, "body": body}

    # ── loras: every unit id model_loras() could answer for ──
    loras: dict[str, dict] = {}
    for mid in keys:
        body = _cat.model_loras(repo, mid)
        if body is not None:
            loras[mid] = body

    # ── family param schemas (the served map + the id order) ──
    family_ids = _er.catalog_family_ids(os.path.join(repo, "plugins"))
    family_schemas = _er.family_param_schemas(family_ids)

    # ── schema snapshot (served object verbatim) ──
    schema = _flow.schema_snapshot()

    # ── flow declarations (the planes-door splice: lanes/card-tools/
    # bundle/skills/agent-boot flow arms read these rows natively;
    # the request-time python probe is retired) ──
    flows = collect_flows(repo)

    # ── provisions declarations per family ──
    provisions: dict[str, dict] = {}
    for _path, cls in engine_models.values():
        fid = getattr(cls, "id", "")
        if not fid or fid in provisions:
            continue
        provisions[fid] = {
            "engine": getattr(cls, "engine", "") or "",
            "provisions": [_prov_dict(p)
                           for p in (getattr(cls, "provisions", None) or ())],
        }
    # Families the provision door resolves live (first cls.id match)
    # but the engine-model scan above keyed once: assert the door's
    # view matches this table exactly.
    for fid in provisions:
        assert _gw._family_by_id(fid) is not None, \
            "provisions family %r unresolvable by the door" % fid

    out = {
        "meta": {
            "generator": "tools/export_discovery_catalog.py",
            "note": "authoring-time freeze of the discovery doors; "
                    "TS serves this file natively (no runtime py). "
                    "Regenerate on any model/card/flow/lane change; "
                    "the discovery wall diffs regen vs this file.",
        },
        "catalog": wire,
        "scan_order": scan_order,
        "forms": forms,
        "kinds": kinds,
        "form_specs": form_specs,
        "loras": loras,
        "family_ids": family_ids,
        "family_schemas": family_schemas,
        "schema": schema,
        "flows": flows,
        "provisions": provisions,
    }
    text = json.dumps(out, indent=2, ensure_ascii=False, default=str)
    # The TS door strict-parses this file: no NaN/Infinity tokens ever.
    for tok in ("NaN", "Infinity", "-Infinity"):
        assert not re.search(r"(?<![A-Za-z0-9_\"])" + re.escape(tok)
                             + r"(?![A-Za-z0-9_\"])", text), \
            "non-finite token %s in export — parseJson would refuse" % tok
    json.loads(text)  # must round-trip through a strict parser
    sys.stdout.write(text + "\n")

    def _n(section: str, v) -> str:
        return "%s=%d" % (section, len(v))

    print("export_discovery_catalog: models=%d forms=%d kinds=%d "
          "spec_keys=%d loras=%d families=%d schema_flows=%d flows=%d "
          "prov_families=%d" % (
              len(wire["models"]), len(forms["forms"]),
              len(kinds["kinds"]), len(form_specs), len(loras),
              len(family_ids), len(schema.get("flows", {})),
              len(flows),
              len(provisions)),
          file=sys.stderr)


if __name__ == "__main__":
    main()

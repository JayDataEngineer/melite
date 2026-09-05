#!/usr/bin/env python3
"""LAYER AUDIT — bidirectional 1:1 enforcement between card_knobs.yaml
and the h3-timeline window templates.

Enforces BOTH directions:
  A. Every inject target in card_knobs.yaml must resolve to a real
     node.field (or node.group.field) path in EVERY template.
     Dotted targets walk left past dots up to 6 times while the node
     id does NOT exist as a template top-level key — node existence
     decides the node/field boundary (mirrors comfyui_plugin.c).
  B. Every structural inject target the compose writes must resolve
     in the template family where it's actually injected:
       - universal (seed, prompt, clip save, SLA switch) in ALL;
       - chain-only (latent load, song slice, layer switch, chain
         context, master audio) where the node exists (windows 2-4);
       - t4r media injects (LoadImage.N.image, LoadAudio.N.audio) —
         field must exist as a token in the t4r family;
       - t4r bundle LINK injects (PlagueKindBundleIn.0.input_K) —
         spliced keys the template does NOT carry: node presence is
         the resolution law (the inject applier ADDS the field).

History: the v7 template family (and its RayH3 tail machinery) was
deleted 2026-09-02 (node-migration move B) — window*_t4.json and
window*_t4r.json are the ONLY live families; --t4-only is gone.

Exit 0 = green (1:1). Nonzero with violation report on stderr = FAIL.

Usage:
    python3 tools/layer_audit.py                          # default paths
    python3 tools/layer_audit.py --map M --templates D    # custom paths
"""

import argparse
import json
import os
import re
import sys

import yaml  # PyYAML

# ---------------------------------------------------------------------------
# Paths (relative to this script when invoked without --map / --templates)
# ---------------------------------------------------------------------------
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)

DEFAULT_MAP = os.path.join(
    REPO, "plugins", "comfyui", "models", "video", "h3-timeline",
    "card_knobs.yaml",
)
DEFAULT_TEMPLATES_DIR = os.path.join(
    REPO, "plugins", "comfyui", "models", "video", "h3-timeline",
)

# The compose writes these structural injects on EVERY window. They are
# runtime-computed paths, not user-facing knobs — verified against the
# emit in h3_card.c (window1 + windows 2..4 inject maps).
UNIVERSAL_STRUCTURAL_INJECTS = {
    "RandomNoise.0.noise_seed",
    "MiniMaxH3ReferenceToVideo.0.prompt",
    "CtxSaveLatent.0.filename_prefix",
    "CtxSaveLatent.0.clip_index",
    "SLASwitch.0.switch",          # derived from h3_attention (Layer A)
}
# Chain-only (windows 2-4, both families): checked where the node exists.
CHAIN_STRUCTURAL_INJECTS = {
    "CtxLoadLatent.0.latent_path",
    "CtxLoadLatent.0.clip_index",
    "SongContext.0.clip_start_seconds",
    "LoadAudio.0.audio",           # staged master or the layer-off pin
    "LayerSwitch.0.switch",
    "GenChainCtx.0.context_length",
}
# t4r-only FIELD injects: the media placeholder tokens. The field must
# exist in the template (dangling slots ride the token unvalidated —
# ComfyUI only validates nodes reachable from outputs).
T4R_FIELD_INJECTS = {
    f"LoadImage.{n}.image" for n in range(9)     # bundle image slots 1-9
} | {
    f"LoadAudio.{n}.audio" for n in (1, 2, 3)    # bundle audio slots 16-18
}
# t4r-only LINK injects: PlagueKindBundleIn.0.input_K splices. The
# template carries the node with NO input_K fields — the inject ADDS
# them — so node presence is the resolution law.
T4R_LINK_INJECTS = {
    f"PlagueKindBundleIn.0.input_{k}"
    for k in list(range(1, 10)) + [16, 17, 18, 19] + [2]  # 1,2..9,16-19
}


# Template JSON shapes: a template maps node ids to node objects; a
# node carries its class inputs (possibly nested one level for
# group.field paths) plus scalar metadata.
_FieldValue = (
    str
    | int
    | float
    | bool
    | list[str]
    | dict[str, str | int | float | bool | list[str] | None]
    | None
)
_TemplateNode = dict[str, str | dict[str, _FieldValue] | list[str] | int | float | bool | None]
_Template = dict[str, _TemplateNode]


def load_knob_map(yaml_path: str) -> list[tuple[str, str, str]]:
    """Return list of (card_name, inject_target, kind) tuples."""
    with open(yaml_path) as f:
        data = yaml.safe_load(f)
    knobs = []
    for entry in data.get("map", []):
        card = entry["card"]
        inject = entry["inject"]
        kind = entry.get("kind", "s")
        knobs.append((card, inject, kind))
    return knobs


def load_templates(tpl_dir: str) -> dict[str, _Template]:
    """Load window*_t4.json + window*_t4r.json. Return {filename: json}."""
    templates = {}
    pattern = re.compile(r"^window\d+_t4r?\.json$")
    for fname in sorted(os.listdir(tpl_dir)):
        if pattern.match(fname):
            with open(os.path.join(tpl_dir, fname)) as f:
                templates[fname] = json.load(f)
    return templates


def resolve_node_field(inject_target: str, template: _Template) -> tuple[str, str] | None:
    """Resolve an inject target like "RandomNoise.0.noise_seed" or
    "ImageSharpenKJ.0.method.strength" against a template.

    Returns (node_id, field_path) or None if unresolvable.

    The algorithm mirrors the C plugin: start with last-dot split,
    then walk left past dots up to 6 times while the tentative node_id
    does NOT exist as a top-level key.
    """
    parts = inject_target.split(".")
    if len(parts) < 2:
        return None

    node_candidate = ".".join(parts[:-1])
    field_candidate = parts[-1]

    for _ in range(7):  # up to 6 walks left
        if node_candidate in template:
            return (node_candidate, field_candidate)
        dot_idx = node_candidate.rfind(".")
        if dot_idx < 0:
            break
        extra = node_candidate[dot_idx + 1:]
        node_candidate = node_candidate[:dot_idx]
        field_candidate = extra + "." + field_candidate

    return None


def resolve_field_in_node(node_obj: _TemplateNode, field_path: str) -> bool:
    """Check that field_path exists (possibly nested) in the node's inputs."""
    if "inputs" not in node_obj:
        return False
    inputs = node_obj["inputs"]
    current = inputs
    for seg in field_path.split("."):
        if not isinstance(current, dict) or seg not in current:
            return False
        current = current[seg]
    return True


def check_inject_resolves(inject_target: str, template: _Template) -> bool:
    """Target resolves AND the field exists in the node's inputs."""
    result = resolve_node_field(inject_target, template)
    if result is None:
        return False
    node_id, field_path = result
    return resolve_field_in_node(template[node_id], field_path)


def audit_direction_a(knob_map: list[tuple[str, str, str]], templates: dict[str, _Template]) -> list[tuple[str, str, list[str]]]:
    """Every knob-map inject target must resolve in EVERY template."""
    violations = []
    for card, inject, kind in knob_map:
        missing = []
        for tname, tdata in templates.items():
            if not check_inject_resolves(inject, tdata):
                missing.append(tname)
        if missing:
            violations.append((card, inject, missing))
    return violations


def audit_direction_b(templates: dict[str, _Template]) -> list[tuple[str, list[str]]]:
    """Structural injects resolve in the family where they're written."""
    violations = []

    t4r = {n: d for n, d in templates.items() if n.endswith("_t4r.json")}

    for inject in sorted(UNIVERSAL_STRUCTURAL_INJECTS):
        missing = [n for n, d in templates.items()
                   if not check_inject_resolves(inject, d)]
        if missing:
            violations.append((inject, missing))

    for inject in sorted(CHAIN_STRUCTURAL_INJECTS):
        missing = []
        for tname, tdata in templates.items():
            if resolve_node_field(inject, tdata) is None:
                continue          # node absent (window1) — not injected
            if not check_inject_resolves(inject, tdata):
                missing.append(tname)
        if missing:
            violations.append((inject, missing))

    for inject in sorted(T4R_FIELD_INJECTS):
        missing = [n for n, d in t4r.items()
                   if not check_inject_resolves(inject, d)]
        if missing:
            violations.append((inject, missing))

    for inject in sorted(T4R_LINK_INJECTS):
        missing = [n for n, d in t4r.items()
                   if "PlagueKindBundleIn.0" not in d]
        if missing:
            violations.append((inject, missing))

    return violations


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Bidirectional layer audit: card_knobs.yaml <-> templates 1:1"
    )
    parser.add_argument("--map", default=DEFAULT_MAP,
                        help="Path to card_knobs.yaml")
    parser.add_argument("--templates", default=DEFAULT_TEMPLATES_DIR,
                        help="Directory containing window*_t4*.json")
    args = parser.parse_args()

    if not os.path.isfile(args.map):
        print(f"layer_audit: knob map not found: {args.map}", file=sys.stderr)
        return 1
    if not os.path.isdir(args.templates):
        print(f"layer_audit: templates dir not found: {args.templates}",
              file=sys.stderr)
        return 1

    knob_map = load_knob_map(args.map)
    templates = load_templates(args.templates)
    if not templates:
        print("layer_audit: no window*_t4*.json templates found in "
              f"{args.templates}", file=sys.stderr)
        return 1

    a_violations = audit_direction_a(knob_map, templates)
    b_violations = audit_direction_b(templates)

    all_violations = []
    for card, inject, missing in a_violations:
        msg = (f"DIRECTION A FAIL: knob '{card}' inject target "
               f"'{inject}' does not resolve in: {', '.join(missing)}")
        all_violations.append(msg)
        print(msg, file=sys.stderr)
    for inject, missing in b_violations:
        msg = (f"DIRECTION B FAIL: structural inject target '{inject}' "
               f"does not resolve in: {', '.join(missing)}")
        all_violations.append(msg)
        print(msg, file=sys.stderr)

    if not all_violations:
        n_t4 = sum(1 for t in templates if t.endswith("_t4.json"))
        n_t4r = sum(1 for t in templates if t.endswith("_t4r.json"))
        print(f"LAYER AUDIT PASS: {len(knob_map)} knobs, "
              f"{n_t4} t4 + {n_t4r} t4r templates — 1:1 OK")
        return 0

    print(f"\nLAYER AUDIT FAIL: {len(a_violations)} direction-A violations, "
          f"{len(b_violations)} direction-B violations", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())

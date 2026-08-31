#!/usr/bin/env python3
"""LAYER AUDIT — bidirectional 1:1 enforcement between card_knobs.yaml
and the h3-timeline window templates.

Enforces BOTH directions:
  A. Every inject target in card_knobs.yaml must resolve to a real
     node.field (or node.group.field) path in EVERY template.
     Dotted targets walk left past dots up to 6 times while the node
     id does NOT exist as a template top-level key — node existence
     decides the node/field boundary (mirrors comfyui_plugin.c
     lines 714-751).

  B. Every structural inject target the compose writes (seed, prompt,
     tail_path) must resolve in the templates where it's actually
     injected. Universal targets (seed, prompt, save-tail) in ALL
     templates; chain-only targets (chain-tail_path) in templates
     that carry the chain node.

Exit 0 = green (1:1). Nonzero with violation report on stderr = FAIL.

Usage:
    python3 tools/layer_audit.py                          # default paths
    python3 tools/layer_audit.py --map M --templates D    # custom paths
    python3 tools/layer_audit.py --t4-only                # skip *_v7.json
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

# The compose writes these structural inject targets that are NOT card
# knobs — they are runtime-computed paths, not user-facing knobs.
# Verified from h3_card.c compose Phase 1 (lines 1081-1128).
#
# Note: RayH3ChainLatentAV.0.tail_path is ONLY injected for windows 2+
# (non-hard-cut chain windows). Window 1 templates don't have this node.
# It's checked separately as a "chain-only" structural inject.
STRUCTURAL_INJECTS = {
    "KSampler.0.seed",
    "MiniMaxH3ImageToVideo.0.prompt",
    "RayH3SaveLatentTail.0.path",
}
# Chain-only structural inject: only present in window2+ templates
CHAIN_STRUCTURAL_INJECTS = {
    "RayH3ChainLatentAV.0.tail_path",
}


def load_knob_map(yaml_path):
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


def load_templates(tpl_dir, t4_only=False):
    """Load window*_t4.json (and optionally *_v7.json) templates.
    Return {filename: parsed_json}."""
    templates = {}
    pattern_t4 = re.compile(r"^window\d+_t4\.json$")
    pattern_v7 = re.compile(r"^window\d+_v7\.json$")
    for fname in sorted(os.listdir(tpl_dir)):
        if pattern_t4.match(fname) or (not t4_only and pattern_v7.match(fname)):
            fpath = os.path.join(tpl_dir, fname)
            with open(fpath) as f:
                templates[fname] = json.load(f)
    return templates


def resolve_node_field(inject_target, template):
    """Resolve an inject target like "KSampler.0.steps" or
    "ImageSharpenKJ.0.method.strength" against a template.

    Returns (node_id, field_path) or None if unresolvable.

    The algorithm mirrors the C plugin (comfyui_plugin.c lines 714-751):
    start with last-dot split, then walk left past dots up to 6 times
    while the tentative node_id does NOT exist as a top-level key.
    """
    parts = inject_target.split(".")
    if len(parts) < 2:
        return None

    # Start: last-dot split
    node_candidate = ".".join(parts[:-1])
    field_candidate = parts[-1]

    for _ in range(7):  # up to 6 walks left
        if node_candidate in template:
            return (node_candidate, field_candidate)
        # Walk left: move one more segment from node to field
        dot_idx = node_candidate.rfind(".")
        if dot_idx < 0:
            break
        extra = node_candidate[dot_idx + 1 :]
        node_candidate = node_candidate[:dot_idx]
        field_candidate = extra + "." + field_candidate

    return None


def resolve_field_in_node(node_obj, field_path):
    """Check that field_path exists (possibly nested) in the node's inputs.
    For dotted fields like "method.strength", walk into nested dicts."""
    if "inputs" not in node_obj:
        return False
    inputs = node_obj["inputs"]
    segments = field_path.split(".")
    current = inputs
    for seg in segments:
        if not isinstance(current, dict) or seg not in current:
            return False
        current = current[seg]
    return True


def check_inject_resolves(inject_target, template):
    """Check that an inject target resolves in a template.
    Returns True if the target resolves and the field exists."""
    result = resolve_node_field(inject_target, template)
    if result is None:
        return False
    node_id, field_path = result
    node_obj = template[node_id]
    return resolve_field_in_node(node_obj, field_path)


def audit_direction_a(knob_map, templates):
    """Direction A: every inject target in the knob map must resolve in
    EVERY template. Returns list of (card, inject, missing_templates)
    violations."""
    violations = []
    for card, inject, kind in knob_map:
        missing = []
        for tname, tdata in templates.items():
            if not check_inject_resolves(inject, tdata):
                missing.append(tname)
        if missing:
            violations.append((card, inject, missing))
    return violations


def audit_direction_b(knob_map, templates):
    """Direction B: every structural inject target the compose writes
    must resolve in the templates where it's actually written.

    - Universal structural injects (seed, prompt, save-tail-path)
      must resolve in ALL templates.
    - Chain-only structural injects (chain-tail-path) must resolve
      in all templates that HAVE the chain node (window2+).

    Returns list of (inject, missing_templates) violations.
    """
    violations = []

    # Check universal structural injects — must resolve in ALL templates
    for inject in sorted(STRUCTURAL_INJECTS):
        missing = []
        for tname, tdata in templates.items():
            if not check_inject_resolves(inject, tdata):
                missing.append(tname)
        if missing:
            violations.append((inject, missing))

    # Check chain-only structural injects — must resolve in templates
    # that have the chain node, but NOT in window1 templates
    for inject in sorted(CHAIN_STRUCTURAL_INJECTS):
        missing = []
        for tname, tdata in templates.items():
            result = resolve_node_field(inject, tdata)
            if result is None:
                # Template doesn't have the chain node — expected for window1
                continue
            if not check_inject_resolves(inject, tdata):
                missing.append(tname)
        if missing:
            violations.append((inject, missing))

    return violations


def main():
    parser = argparse.ArgumentParser(
        description="Bidirectional layer audit: card_knobs.yaml <-> templates 1:1"
    )
    parser.add_argument(
        "--map",
        default=DEFAULT_MAP,
        help="Path to card_knobs.yaml (default: plugins/.../card_knobs.yaml)",
    )
    parser.add_argument(
        "--templates",
        default=DEFAULT_TEMPLATES_DIR,
        help="Directory containing window*_t4.json / window*_v7.json",
    )
    parser.add_argument(
        "--t4-only",
        action="store_true",
        help="Only check *_t4.json templates (skip *_v7.json)",
    )
    args = parser.parse_args()

    # Load
    try:
        knob_map = load_knob_map(args.map)
    except Exception as e:
        print(f"FATAL: cannot load knob map: {e}", file=sys.stderr)
        return 1

    try:
        templates = load_templates(args.templates, t4_only=args.t4_only)
    except Exception as e:
        print(f"FATAL: cannot load templates: {e}", file=sys.stderr)
        return 1

    if not templates:
        print("FATAL: no window templates found", file=sys.stderr)
        return 1

    all_violations = []

    # --- Direction A: knob inject targets must resolve in ALL templates ---
    a_violations = audit_direction_a(knob_map, templates)
    for card, inject, missing in a_violations:
        msg = (
            f"DIRECTION A FAIL: knob '{card}' inject target '{inject}' "
            f"does not resolve in: {', '.join(missing)}"
        )
        all_violations.append(msg)
        print(msg, file=sys.stderr)

    # --- Direction B: structural injects must resolve in ALL templates ---
    b_violations = audit_direction_b(knob_map, templates)
    for inject, missing in b_violations:
        msg = (
            f"DIRECTION B FAIL: structural inject target '{inject}' "
            f"does not resolve in: {', '.join(missing)}"
        )
        all_violations.append(msg)
        print(msg, file=sys.stderr)

    # --- Summary ---
    if not all_violations:
        t4_count = sum(1 for t in templates if t.endswith("_t4.json"))
        v7_count = sum(1 for t in templates if t.endswith("_v7.json"))
        parts = [f"{len(knob_map)} knobs"]
        if t4_count:
            parts.append(f"{t4_count} t4 templates")
        if v7_count:
            parts.append(f"{v7_count} v7 templates")
        print(f"LAYER AUDIT PASS: {', '.join(parts)} — 1:1 OK")
        return 0
    else:
        a_count = len(a_violations)
        b_count = len(b_violations)
        print(
            f"\nLAYER AUDIT FAIL: {a_count} direction-A violations, "
            f"{b_count} direction-B violations",
            file=sys.stderr,
        )
        return 1


if __name__ == "__main__":
    sys.exit(main())

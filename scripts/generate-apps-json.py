#!/usr/bin/env python3
"""
generate-apps-json.py — Regenerate static/apps.json from plugin.yaml manifests.

Scans plugins/*/plugin.yaml for webui: blocks and writes a consolidated
registry that the C gateway serves at GET /v1/apps.

Usage:
    python3 scripts/generate-apps-json.py [--output static/apps.json]

Each plugin.yaml may contain:

    webui:
      url: "http://127.0.0.1:18465"       # required — backend URL
      label: "ComfyUI Graph Editor"         # optional — defaults to plugin label
      description: "..."                     # optional — defaults to plugin description
      features: [websocket, sse]            # optional — empty list by default
      icon: "🎨"                            # optional — defaults to "⚡"

Re-run after adding/changing any plugin.yaml webui: block:
    python3 scripts/generate-apps-json.py
"""

import argparse
import json
import os
import sys

# ── Minimal YAML-ish parser for plugin.yaml ──────────────────────
# Only handles the flat structure we need; not a full YAML parser.

def parse_webui_block(text: str, plugin_id: str, plugin_label: str, plugin_desc: str) -> dict | None:
    """Extract the webui: block from plugin.yaml text. Returns None if absent."""
    lines = text.split("\n")
    in_webui = False
    webui_indent = -1
    block: dict[str, str | list] = {}
    features: list[str] = []

    for line in lines:
        stripped = line.lstrip()
        indent = len(line) - len(stripped)

        # Detect "webui:" top-level key
        if stripped.startswith("webui:") and indent == 0:
            in_webui = True
            webui_indent = indent
            # Handle inline value (webui: "foo") — we don't expect this
            continue

        if in_webui:
            # End of webui block: next top-level key or EOF
            if indent <= webui_indent and stripped and not stripped.startswith("#"):
                break

            # Parse "key: value" pairs
            if ":" in stripped:
                key, _, val = stripped.partition(":")
                key = key.strip()
                val = val.strip()

                if key == "features":
                    # Parse inline list: [websocket, sse]
                    features = [f.strip().strip('"').strip("'")
                                for f in val.strip("[]").split(",")
                                if f.strip()]
                elif val:
                    block[key] = val.strip('"').strip("'")

    if "url" not in block:
        return None

    return {
        "id": plugin_id,
        "label": block.get("label", plugin_label),
        "description": block.get("description", plugin_desc),
        "url": block["url"],
        "icon": block.get("icon", "⚡"),
        "features": features,
    }


def parse_plugin_yaml(path: str) -> tuple[str, str, str]:
    """Read a plugin.yaml and extract id, label, description."""
    text = open(path).read()
    plugin_id = ""
    plugin_label = ""
    plugin_desc = ""

    for line in text.split("\n"):
        stripped = line.strip()
        if stripped.startswith("id:") and not plugin_id:
            plugin_id = stripped.split(":", 1)[1].strip().strip('"').strip("'")
        elif stripped.startswith("label:") and not plugin_label:
            plugin_label = stripped.split(":", 1)[1].strip().strip('"').strip("'")
        elif stripped.startswith("description:") and not plugin_desc:
            plugin_desc = stripped.split(":", 1)[1].strip().strip('"').strip("'")

    return plugin_id, plugin_label, plugin_desc, text


def main():
    parser = argparse.ArgumentParser(description="Generate apps.json from plugin manifests")
    parser.add_argument("--output", "-o", default="static/apps.json",
                        help="Output path (default: static/apps.json)")
    parser.add_argument("--plugins-dir", "-d", default="plugins",
                        help="Plugins directory (default: plugins)")
    args = parser.parse_args()

    apps: list[dict] = []
    plugins_dir = args.plugins_dir

    if not os.path.isdir(plugins_dir):
        print(f"Error: {plugins_dir}/ not found", file=sys.stderr)
        sys.exit(1)

    for entry in sorted(os.listdir(plugins_dir)):
        yaml_path = os.path.join(plugins_dir, entry, "plugin.yaml")
        if not os.path.isfile(yaml_path):
            continue

        plugin_id, plugin_label, plugin_desc, text = parse_plugin_yaml(yaml_path)
        webui = parse_webui_block(text, plugin_id, plugin_label, plugin_desc)
        if webui:
            apps.append(webui)

    output = {"apps": apps}
    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)

    with open(args.output, "w") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"Wrote {len(apps)} app(s) to {args.output}")
    for a in apps:
        print(f"  {a['icon']}  {a['label']:20s} {a['url']}")


if __name__ == "__main__":
    main()

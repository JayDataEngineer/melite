"""manifest.py — anyCreature kernel manifest (PORT 2, 2026-09-06).

The estate-boundary DATA for the forge kernel: the node
interpreter as $bin (argv[0] — the PROCESS binary), the vendored
cli.js + spec file + vendor-root cwd as caller-resolved lane
paths ($cli/$spec/$cli_dir — the shim resolves them via the
card renderer, the generic engine only expands them).

Binary search order mirrors the renderer's resolve_node (BYO env
→ PATH → ~/.local/bin/node); the argv reproduces build_argv
EXACTLY (node cli spec out — wall-pinned parity). The spec FILE
write stays shim-side (what goes IN the creature document is
card I/O truth); the manifest only names the lanes.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

_PLUGIN_ROOT = Path(__file__).resolve().parent
_REPO = _PLUGIN_ROOT.parents[3]
_PY = str(_REPO / "py")
if _PY not in sys.path:
    sys.path.insert(0, _PY)

from kernel_manifest import (ExecMode, KernelManifest, Mount,  # noqa: E402
                             SubprocessExec)

FORGE_MANIFEST = KernelManifest(
    id="anycreature",
    version="1",
    card="forge",
    engine="anycreature",
    exec=ExecMode.SUBPROCESS,
    subprocess=SubprocessExec(
        bin_env="ANYCREATURE_NODE",
        bin_path_names=("node",),
        bin_candidates=(
            os.path.expanduser("~/.local/bin/node"),
        ),
        argv=(
            "$bin",
            "$cli",
            "$spec",
            "$out/creature.glb",
        ),
        cwd="$cli_dir",   # the vendor root (relative asset reads)
        output_channel="glb",
        output_file="creature.glb",
        timeout_s=300.0,
    ),
    mount=Mount.BOTH,   # stage today; graph via the bridge extension
    artifacts=(),        # no weights — declared, not omitted
)

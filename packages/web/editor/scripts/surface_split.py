#!/usr/bin/env python3
"""Phase 5 of the Core/Surfaces restructure: organize the editor by surface.

Moves web/editor/src/components/workspaces/{parts,*.tsx} and stores/ into
web/editor/src/surfaces/<surface>/, then rewrites every import in the tree
(both @/stores/X aliases and relative specifiers) to the new locations.

Surfaces: director, canvas, pose, body, assets, generate, shared.

Import rewriting is TWO-PHASE on purpose:
  1. collect_rewrites() runs BEFORE any git mv — every spec resolves against
     the OLD layout, which still exists on disk.
  2. apply_rewrites() runs AFTER the mv — the plan maps old → new locations,
     so the filesystem state at apply time doesn't matter.

Rewriting rules (per import spec in a src file):
  - target file is being moved      → spec points at the target's NEW location
  - importer is moving + target is  → re-anchor the relative path from the
    NOT moving                        importer's NEW directory (depth changes:
                                      ws/ 1→2, parts/<sub>/ 3→2, pose-studio 3→4)
  - alias (@/...) to a non-moved    → untouched (root-based, move-invariant)

Usage:
    python scripts/surface_split.py --dry-run   # print the move plan + rewrites
    python scripts/surface_split.py             # execute (git mv + rewrite)
"""
import os
import re
import subprocess
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent / "src"
PARTS = SRC / "components" / "workspaces" / "parts"
WS = SRC / "components" / "workspaces"
STORES = SRC / "stores"
SURFACES = SRC / "surfaces"
DRY = "--dry-run" in sys.argv

# ─── file → surface map ─────────────────────────────────────────────────────
# Keyed by path relative to parts/ ("" for top-level parts files), stores/, ws/.
PARTS_TOP = {
    # director
    "AnimateTab.tsx": "director", "DirectorBanner.tsx": "director",
    "DirectorNlePanel.tsx": "director", "DirectorVideoForm.tsx": "director",
    "CaptionTrack.tsx": "director", "ProgramMonitor.tsx": "director",
    "TimelineRuler.tsx": "director", "XfadeInput.tsx": "director",
    "AudioMixerPanel.tsx": "director", "LipSyncButton.tsx": "director",
    "StoryboardEmptyState.tsx": "director", "RetakeMotionPanel.tsx": "director",
    # canvas
    "InpaintCanvas.tsx": "canvas", "InpaintToolbar.tsx": "canvas",
    "IdeogramCanvasEditor.tsx": "canvas", "CanvasContextMenu.tsx": "canvas",
    "CanvasProgressBar.tsx": "canvas", "BranchesPanel.tsx": "canvas",
    "HistoryPanel.tsx": "canvas", "LayerPanel.tsx": "canvas",
    "PathsPanel.tsx": "canvas", "PathOverlay.tsx": "canvas",
    "SelectionOverlay.tsx": "canvas", "SelectionXformOverlay.tsx": "canvas",
    "TextPopover.tsx": "canvas", "BrushPresetsPopover.tsx": "canvas",
    "ColorPickerPopover.tsx": "canvas", "PressureCurvePopover.tsx": "canvas",
    "GridOverlay.tsx": "canvas", "RulersOverlay.tsx": "canvas",
    "NavigatorPanel.tsx": "canvas", "OnboardingCoach.tsx": "canvas",
    "PromptStrip.tsx": "canvas", "ControlNetPreviewOverlay.tsx": "canvas",
    "IpAdapterOverlay.tsx": "canvas", "ConsistencyAnchorSlot.tsx": "canvas",
    "EmptyStateOverlay.tsx": "canvas", "SamStatusOverlay.tsx": "canvas",
    "StagingOverlay.tsx": "canvas", "ShareModal.tsx": "canvas",
    "ToolDock.tsx": "canvas", "ToolOptionsBar.tsx": "canvas",
    "GeneratePopover.tsx": "canvas", "GenerationModal.tsx": "canvas",
    # pose
    "TextToPoseTab.tsx": "pose", "PoseStudioDialog.tsx": "pose",
    "PoseEditMode.tsx": "pose", "PoseViewer3D.tsx": "pose",
    "LoadBodyDialog.tsx": "pose", "PoseExportDialog.tsx": "pose",
    "ApplyAdjacentButton.tsx": "pose", "ApplyToSelectedButton.tsx": "pose",
    "ReferenceFacesPicker.tsx": "pose", "AnimatedGLBViewer.tsx": "pose",
    # body
    "BodyStudioTab.tsx": "body", "BodyShapePanel.tsx": "body",
    "BodyShapeDialog.tsx": "body", "MeshPreviewCanvas.tsx": "body",
    # assets
    "AssetsTab.tsx": "assets", "AssetMedia.tsx": "assets",
    "AssetPreviewDialog.tsx": "assets", "ModelDownloadDialog.tsx": "assets",
    "VoiceCreatorPanel.tsx": "assets", "VoicesSection.tsx": "assets",
    "ImageGuides.tsx": "assets", "MeshViewer.tsx": "assets",
    # generate
    "GenerateFormBody.tsx": "generate", "ModelVariantPicker.tsx": "generate",
    "VariantPicker.tsx": "generate", "ModifiersModal.tsx": "generate",
    "IconTip.tsx": "generate", "PromptAutocomplete.tsx": "generate",
    "PromptHistoryDropdown.tsx": "generate",
    "assets-form-helpers.tsx": "generate", "mediaResult.ts": "generate",
    # shared
    "CopilotActions.tsx": "shared", "CopilotInteractions.tsx": "shared",
    "ServicesSidebar.tsx": "shared", "GpuStatus.tsx": "shared",
    "JobsButton.tsx": "shared", "EnhanceKeysDialog.tsx": "shared",
    "StatusFlowRibbon.tsx": "shared", "RuntimeConfigPanel.tsx": "shared",
    "MultiAngleGLBViewer.tsx": "shared",
}
PARTS_DIRS = {
    "director": "director", "generate": "generate", "generate/shared": "generate",
    "inspector": "canvas", "schema": "generate", "pose-studio": "pose",
}
WS_TOP = {
    "AppSidebar.tsx": "shared", "CopilotTab.tsx": "shared",
    "DirectorStudio.tsx": "director", "InpaintStudioTab.tsx": "canvas",
    "FlowViewerTab.tsx": "shared", "WorkspaceLayout.tsx": "shared",
}
STORES_MAP = {
    "assets.ts": "assets", "bodyStudio.ts": "body",
    "directorStore.ts": "director", "timeline.ts": "director",
    "workflow.ts": "director", "inpaint.ts": "canvas",
    "inpaintHelpers.ts": "canvas", "inpaintTypes.ts": "canvas",
    "poseSceneStore.ts": "pose", "poseLibrary.ts": "pose",
    "enhancement.ts": "shared", "flowViewer.ts": "shared",
    "copilotBridge.ts": "shared", "toast.ts": "shared",
    "presets.ts": "generate", "prompt-history.ts": "generate",
}

# ─── build old→new map ──────────────────────────────────────────────────────
moves = {}  # abs old path -> abs new path

def add_moves(base: Path, mapping: dict[str, str]) -> None:
    for rel, surface in mapping.items():
        old = (base / rel).resolve()
        if not old.exists():
            print(f"!! MAP ENTRY MISSING: {old}")
            sys.exit(1)
        new = (SURFACES / surface / Path(rel).name).resolve()
        moves[old] = new

add_moves(PARTS, PARTS_TOP)
add_moves(STORES, STORES_MAP)
add_moves(WS, WS_TOP)
for subdir, surface in PARTS_DIRS.items():
    for p in sorted((PARTS / subdir).rglob("*")):
        if p.is_file() and p.suffix in (".ts", ".tsx"):
            if subdir == "pose-studio":
                # keep the full tree (hooks/, index, etc.) under surfaces/pose/pose-studio/
                new = (SURFACES / "pose" / "pose-studio" / p.relative_to(PARTS / "pose-studio")).resolve()
            else:
                # flatten: parts/director/X.tsx and parts/generate/shared/X.tsx → surfaces/<s>/X.tsx
                new = (SURFACES / surface / p.name).resolve()
            moves[p.resolve()] = new

# collision check
by_name = {}
for old, new in moves.items():
    key = new.as_posix()
    if key in by_name:
        print(f"!! COLLISION: {by_name[key]} and {old} both → {new}")
        sys.exit(1)
    by_name[key] = old

# ─── import rewriter ────────────────────────────────────────────────────────
def resolve_old(base_dir: Path, spec: str) -> Path | None:
    """Resolve an import spec against the PRE-move layout (disk lookup)."""
    if spec.startswith("@"):
        if spec.startswith("@/stores/"):
            cand = SRC / "stores" / spec[len("@/stores/"):]
        elif spec.startswith("@/components/workspaces/parts/"):
            cand = PARTS / spec[len("@/components/workspaces/parts/"):]
        elif spec.startswith("@/components/workspaces/"):
            cand = WS / spec[len("@/components/workspaces/"):]
        else:
            return None
        return _resolve_file(cand)
    return None

def _resolve_file(cand: Path) -> Path | None:
    for ext in ("", ".ts", ".tsx", ".js", ".jsx"):
        c = Path(str(cand) + ext)
        if c.is_file():
            return c.resolve()
    for ext in (".ts", ".tsx", ".js", ".jsx"):
        c = cand / ("index" + ext)
        if c.is_file():
            return c.resolve()
    return None

def rel_spec(from_dir: Path, to_abs: Path) -> str:
    s = os.path.relpath(to_abs, from_dir).replace(os.sep, "/")
    for ext in (".tsx", ".ts", ".jsx", ".js"):
        if s.endswith(ext):
            s = s[: -len(ext)]
            break
    # os.path.relpath yields bare names for same-directory targets — TS
    # needs the explicit "./" or it treats them as package specifiers
    if not s.startswith((".", "/")):
        s = "./" + s
    return s

# vi.mock("...") module paths must be rewritten alongside imports — they
# resolve to the same files and vitest fails when they drift
pat = re.compile(r"""((?:from|import|vi\.(?:mock|importActual|importMock))\s*\(?\s*['"])([^'"]+)(['"])""")

def collect_rewrites() -> list[tuple[Path, str, Path]]:
    """Resolve every import spec against the CURRENT (old) layout.

    Returns a list of (old_file_abs, spec, target_abs) where target_abs is the
    file's location AFTER the move (== old location if the target doesn't move).
    Runs BEFORE any git mv — the old layout must still be on disk.
    """
    plan = []
    for p in sorted(SRC.rglob("*.ts*")):
        if "node_modules" in p.parts:
            continue
        abs_p = p.resolve()
        moving = abs_p in moves
        for line in p.read_text().split("\n"):
            for m in pat.finditer(line):
                spec = m.group(2)
                if spec.startswith("."):
                    # disk lookup first (old layout still exists pre-move) —
                    # moves dict keys carry extensions, specs may not
                    resolved = _resolve_file(abs_p.parent / spec)
                    if resolved and resolved in moves:
                        plan.append((abs_p, spec, moves[resolved]))
                    elif moving:
                        # pure path math fallback — keeps non-code targets
                        # (images, css) and unresolvable specs re-anchored
                        # correctly when the importer's depth changes
                        # (ws/ 1→2, parts/<sub>/ 3→2, pose-studio 3→4)
                        old_tgt = (abs_p.parent / spec).resolve()
                        plan.append((abs_p, spec, old_tgt))
                elif spec.startswith("@"):
                    tgt = resolve_old(abs_p.parent, spec)
                    if tgt and tgt in moves:
                        plan.append((abs_p, spec, moves[tgt]))
    return plan

def apply_rewrites(plan: list[tuple[Path, str, Path]]) -> tuple[int, int]:
    """Apply the precomputed plan to the post-move tree. No disk resolution —
    every target_abs is already the final location."""
    by_file = {}
    for old_file, spec, tgt in plan:
        by_file.setdefault(old_file, {})[spec] = tgt
    n_files = 0
    n_rewrites = 0
    for old_file, sub in by_file.items():
        new_file = moves.get(old_file, old_file)
        new_dir = new_file.parent
        new_specs = {spec: rel_spec(new_dir, tgt) for spec, tgt in sub.items()}
        text = new_file.read_text()
        def repl(m: re.Match[str]) -> str:
            nonlocal n_rewrites
            s = m.group(2)
            if s in new_specs and new_specs[s] != s:
                n_rewrites += 1
                return m.group(1) + new_specs[s] + m.group(3)
            return m.group(0)
        out = pat.sub(repl, text)
        if out != text:
            new_file.write_text(out)
            n_files += 1
    return n_files, n_rewrites

# leftover references report — must run against the POST-move tree
def report_leftover() -> list[tuple[Path, str]]:
    leftover = []
    for p in sorted(SRC.rglob("*.ts*")):
        if "node_modules" in p.parts:
            continue
        text = p.read_text()
        for m in re.finditer(
            r"""['"]((?:\.\.?/)*(?:parts|stores|workspaces|components/workspaces(?:/parts)?)/[A-Za-z0-9/_.-]+)['"]""",
            text,
        ):
            leftover.append((p, m.group(1)))
        for m in re.finditer(
            r"""['"](@/stores|@/components/workspaces)/[A-Za-z0-9/_.-]+['"]""",
            text,
        ):
            leftover.append((p, m.group(0)))
    return sorted(set(leftover))

def main() -> None:
    if DRY:
        print(f"=== {len(moves)} files to move ===")
        for old, new in sorted(moves.items(), key=lambda kv: kv[1].as_posix()):
            print(f"  {old.relative_to(SRC)} → {new.relative_to(SRC)}")
        plan = collect_rewrites()
        print(f"=== {len(plan)} import rewrites ===")
        by_file = {}
        for old_file, spec, tgt in plan:
            by_file.setdefault(old_file, []).append((spec, tgt))
        for old_file, entries in sorted(by_file.items()):
            new_file = moves.get(old_file, old_file)
            new_dir = new_file.parent
            shown = [f"{spec} → {rel_spec(new_dir, tgt)}" for spec, tgt in entries if rel_spec(new_dir, tgt) != spec]
            if shown:
                print(f"  {new_file.relative_to(SRC)}")
                for s in shown:
                    print(f"      {s}")
        return

    plan = collect_rewrites()          # phase A: resolve against OLD layout
    SURFACES.mkdir(exist_ok=True)
    for old, new in sorted(moves.items(), key=lambda kv: kv[1].as_posix()):
        new.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(["git", "mv", str(old), str(new)], check=True)
    print(f"moved {len(moves)} files")
    n_files, n_rewrites = apply_rewrites(plan)   # phase C: apply against NEW layout
    print(f"rewrote {n_rewrites} imports in {n_files} files")

    leftover = report_leftover()
    if leftover:
        print(f"!!! {len(leftover)} leftover references (need manual attention):")
        for p, s in leftover[:30]:
            print(f"  {p.relative_to(SRC)}: {s}")
        sys.exit(1)
    print("✓ no leftover parts/stores/workspaces references")

if __name__ == "__main__":
    main()

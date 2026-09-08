#!/usr/bin/env python3
"""Phase 6 of the Core/Surfaces restructure: decompose surfaces/canvas/inpaint.ts.

Splits the 4,583-line zustand store into a barrel + 7 concern slices:

    inpaint.ts            barrel: InpaintState intersection, create() with slice
                            spreads, re-exports (export * + helper block), utils
    inpaintLayers.ts      layer CRUD, per-layer masks, groups/clips, project IO
    inpaintBrush.ts       tool/brush params, presets, quick mask, snap-to-grid,
                            rulers/guides, mirror, pressure curve, live preview
    inpaintPaths.ts       pen-tool vector paths
    inpaintTools.ts       selection + transform-selection + cursor/wand,
                            text placement, clone stamp, healing brush, patch
    inpaintGeneration.ts  submit, gen UI, global prompt, controlnets/IP-adapters,
                            lanpaint, model presets, gen controls, bbox
    inpaintHistory.ts     unified doc history, branches, undo/redo, prompt
                            history, autosave/dirty
    inpaintViewport.ts    mode, auto-expand, SAM, zoom/pan

Pure refactor: every interface field, default, and action moves verbatim; the
public export surface of inpaint.ts is unchanged (plus `InpaintState` becomes
an exported intersection type). The script self-verifies completeness: every
parsed interface field and create-body key must land in exactly one slice.

Usage:
    python scripts/inpaint_split.py --dry-run   # report plan + completeness
    python scripts/inpaint_split.py             # write the 8 files
"""
import re
import sys
from pathlib import Path

CANVAS = Path(__file__).resolve().parent.parent / "src" / "surfaces" / "canvas"
FILE = CANVAS / "inpaint.ts"
DRY = "--dry-run" in sys.argv
SRC = None  # original file lines, set in main()

# ─── slice metadata ─────────────────────────────────────────────────────────
# name → (file, interface, defaults factory, actions factory, doc)
SLICES = [
    ("layers", "inpaintLayers.ts", "LayersSlice",
     "Layer system slice — layer CRUD, per-layer masks, groups/clips, project IO."),
    ("brush", "inpaintBrush.ts", "BrushSlice",
     "Brush/tool slice — tool state, brush params, presets, quick mask, snap-to-grid, "
     "rulers/guides, mirror, pressure curve, live preview."),
    ("paths", "inpaintPaths.ts", "PathsSlice",
     "Pen-tool vector path slice — anchors, handles, boolean ops, stroke rasterization."),
    ("tools", "inpaintTools.ts", "ToolsSlice",
     "Selection + region-tools slice — transform selection, lasso/wand/bucket/shapes, "
     "text placement, clone stamp, healing brush, patch."),
    ("generation", "inpaintGeneration.ts", "GenerationSlice",
     "Generation slice — submit, gen UI, global prompt, controlnets/IP-adapters, "
     "lanpaint, model presets, gen controls, bbox."),
    ("history", "inpaintHistory.ts", "HistorySlice",
     "History slice — unified doc history, version branches, undo/redo, prompt history, "
     "autosave/dirty."),
    ("viewport", "inpaintViewport.ts", "ViewportSlice",
     "Viewport slice — mode, auto-expand, SAM point-click, zoom/pan."),
]

# name → slice, split into data names (state fields) and action names
DATA = {
    "layers": ["layers", "activeLayerId", "selectedLayerIds", "baseImage",
               "maskStrokes", "undoneStrokes", "maskDataUrl", "groups", "clips"],
    "brush": ["tool", "brushSize", "brushColor", "toolOpacity", "brushHardness",
              "brushFlow", "recentColors", "brushPresets", "quickMask",
              "snapToGrid", "snapGridSize", "rulersVisible", "guidesVisible",
              "guides", "mirrorMode", "mirrorAxisX", "mirrorAxisY",
              "pressureCurve", "livePreviewLayerId", "livePreviewDataUrl"],
    "paths": ["paths", "activePathId", "selectedAnchorIds", "selectedPathIds",
              "pathDrawInProgress"],
    "tools": ["transformSelectionMode", "selectionFeather", "selectionAntiAlias",
              "wandTolerance", "wandContiguous", "cursorPos"],
    "generation": ["submitting", "drawId", "progress", "error", "lastResult",
                   "genModalOpen", "genPopoverOpen", "shareModalOpen",
                   "genModalMode", "generateTarget", "globalPositive",
                   "globalNegative", "genModelOverride", "controlNets",
                   "ipAdapters", "enhancing", "lanpaintEnabled",
                   "lanpaintNumSteps", "lanpaintStepSize", "lanpaintLambda",
                   "lanpaintBeta", "lanpaintFriction", "lanpaintPromptMode",
                   "bbox", "genSteps", "genCfg", "genSampler", "genScheduler",
                   "genDenoise", "inferenceScale", "compositedResult",
                   "stagedResult", "batchSize", "loras", "presetRegistry",
                   "presetLoading", "activePresetId", "presetDownloadStatuses"],
    "history": ["past", "future", "pastSnapshots", "futureSnapshots",
                "branches", "activeBranchId", "lastSavedAt", "dirty",
                "promptHistory"],
    "viewport": ["mode", "sourceEmpty", "expandTop", "expandRight",
                 "expandBottom", "expandLeft", "viewTransform", "autoExpand",
                 "samPoints", "rasterMaskDataUrl", "autoDetectMode", "samLoading"],
}
ACTIONS = {
    "layers": ["addLayer", "deleteLayer", "clearLayerPaint", "duplicateLayer",
               "renameLayer", "setLayerVisibility", "setLayerLocked",
               "setLayerOpacity", "setLayerBlendMode", "setLayerDataUrl",
               "setLayerMask", "toggleLayerMask", "clearLayerMask",
               "useSelectionAsLayerMask", "setLayerGenConfig", "reorderLayer",
               "setActiveLayer", "setSelectedLayerIds", "deleteSelectedLayers",
               "setLayers", "flattenVisibleLayers", "setLayerColorLabel",
               "addGroup", "renameGroup", "setLayerGroup", "toggleGroupCollapsed",
               "setGroupVisibility", "deleteGroup", "setClip", "isLayerClipped",
               "applyRasterMaskToMaskLayer", "layerViaCopy", "layerViaCut",
               "serializeProject", "loadProjectData", "transformLayer",
               "resizeCanvas", "growCanvas", "ensureCanvasContainsBBox",
               "commitMaskPaint", "loadBaseImage", "createBlankCanvas"],
    "brush": ["setTool", "setBrushSize", "setBrushColor", "setActiveMaskTint",
              "setToolOpacity", "setBrushHardness", "setBrushFlow",
              "saveBrushPreset", "applyBrushPreset", "deleteBrushPreset",
              "pushRecentColor", "setQuickMask", "paintQuickMask",
              "setSnapToGrid", "setSnapGridSize", "toggleRulers", "toggleGuides",
              "addGuide", "moveGuide", "removeGuide", "clearGuides",
              "snapToGuidesX", "snapToGuidesY", "setMirrorMode", "setMirrorAxisX",
              "setMirrorAxisY", "setPressureCurve", "setLivePreview",
              "clearLivePreview"],
    "paths": ["startPathDraw", "appendPathAnchor", "updateDrawingAnchorHandle",
              "closePathDraw", "finishPathDraw", "cancelPathDraw",
              "setActivePath", "renamePath", "togglePathVisibility",
              "togglePathLocked", "deletePath", "duplicatePath",
              "updatePathAnchor", "updatePathHandle", "setAnchorType",
              "insertPathAnchorOnSegment", "deletePathAnchor",
              "setSelectedAnchorIds", "moveSelectedAnchors",
              "deleteSelectedAnchors", "setSelectedPathIds", "pathBooleanOp",
              "updatePathProps", "pathToSelection", "pathToMask", "strokePath"],
    "tools": ["transformSelection", "selectionBbox", "enterTransformSelectionMode",
              "exitTransformSelectionMode", "colorRangeSelect", "setCursorPos",
              "setSelectionFeather", "setSelectionAntiAlias", "setWandTolerance",
              "setWandContiguous", "magicWandSelect", "paintBucketFill",
              "drawShape", "drawGradient", "applyCrop", "cloneSource",
              "setCloneSource", "cloneStroke", "healStroke", "patchPreview",
              "setPatchPreview", "applyPatch",
              # not declared in the original interface — added (see EXTRA_SIGS)
              "setSelectionRect", "placeText", "refineEdge", "setSelectionLasso",
              "invertSelection", "selectAll", "deselect"],
    "generation": ["setGenModalOpen", "setGenModalMode", "setShareModalOpen",
                   "setGenPopoverOpen", "setGenerateTarget", "setGlobalPositive",
                   "setGlobalNegative", "setGenModelOverride", "setControlNets",
                   "addControlNet", "removeControlNet", "updateControlNet",
                   "setIpAdapters", "addIpAdapter", "removeIpAdapter",
                   "updateIpAdapter", "setLanpaintEnabled",
                   "setLanpaintNumSteps", "setLanpaintStepSize",
                   "setLanpaintLambda", "setLanpaintBeta", "setLanpaintFriction",
                   "setLanpaintPromptMode", "enhancePrompt", "setBBox",
                   "resizeBBox", "setGenSteps", "setGenCfg", "setGenSampler",
                   "setGenScheduler", "setGenDenoise", "setInferenceScale",
                   "loadPresets", "setActivePreset", "downloadPresetAssets",
                   "pollPresetDownloadStatus", "submit", "cancelSubmit",
                   "acceptStaged", "cancelStaged", "cycleStaged", "setBatchSize",
                   "setLoras", "setCompositedResult", "dismissError"],
    "history": ["pushHistory", "createBranch", "switchToBranch", "deleteBranch",
                "renameBranch", "undo", "redo", "canUndo", "canRedo",
                "pushPromptHistory", "setAutosaveStatus", "markDirty"],
    "viewport": ["setMode", "setExpandAmount", "resetExpand", "setZoom", "panBy",
                 "rotateViewBy", "resetViewRotation", "fitView", "setAutoExpand",
                 "addStroke", "undoStroke", "redoStroke", "clearMask",
                 "setMaskDataUrl", "setSamPoint", "clearSamPoints",
                 "confirmSamSelection", "clearRasterMask", "setAutoDetectMode",
                 "autoDetectSelection"],
}

# interface signatures for actions the original create() defined but the
# interface never declared — added to the slice interface so the type is honest
EXTRA_SIGS = {
    "setSelectionRect": "setSelectionRect: (x: number, y: number, w: number, h: number, opts?: any) => void",
    # any[] not unknown[]: the original create body accessed p.x/p.y on these
    # points with implicit any — typing them unknown surfaces new errors
    "setSelectionLasso": "setSelectionLasso: (points: any[], opts?: any) => void",
    "selectAll": "selectAll: () => void",
    "invertSelection": "invertSelection: () => Promise<void>",
    "deselect": "deselect: () => void",
    "placeText": "placeText: (opts: any) => Promise<void>",
    "refineEdge": "refineEdge: (stroke: MaskStroke, mode: 'soften' | 'harden') => Promise<void>",
}

NAME_TO_SLICE = {}
for sl, _f, _i, _d in SLICES:
    for n in DATA[sl] + ACTIONS[sl]:
        NAME_TO_SLICE[n] = sl

# ─── parsing ────────────────────────────────────────────────────────────────
# One parsed import member: (spec, alias, is_type); one import statement:
# (whole_is_type, source, members). A member span is (name, start, end)
# over the source lines (0-indexed, end-exclusive).
ImportMembers = list[tuple[str, str, bool]]
ImportEntry = tuple[bool, str, ImportMembers]
MemberSpan = tuple[str, int, int]

def strip_strings(s: str) -> str:
    s = re.sub(r"`(?:[^`\\]|\\.)*`", "``", s)
    s = re.sub(r'"(?:[^"\\]|\\.)*"', '""', s)
    s = re.sub(r"'(?:[^'\\]|\\.)*'", "''", s)
    # comments too — a stray `{`/`}` inside `//` or `/* */` must not count
    s = re.sub(r"//[^\n]*", "", s)
    s = re.sub(r"/\*.*?\*/", "", s, flags=re.S)
    return s

def brace_delta(s: str) -> int:
    s = strip_strings(s)
    # BRACES ONLY — object-literal nesting depth. `[`/`]` must not count:
    # index expressions, regex literals, and template artifacts carry
    # unbalanced brackets (inpaint.ts has one unpaired `]`, net −1), which
    # silently drops the depth for every later line and loses whole slices.
    return s.count("{") - s.count("}")

def leading_comment_extent(lines: list[str], start: int) -> int:
    """Extend `start` upward over blank + comment lines (inclusive)."""
    i = start
    while i > 0:
        t = lines[i - 1].strip()
        if t == "" or t.startswith("//") or t.startswith("*") or t.startswith("/*"):
            i -= 1
        else:
            break
    return i

def parse_members(lines: list[str], i: int) -> list[MemberSpan]:
    """Parse top-level `name: ...` members with spans. Returns [(name, start, end)]."""
    members = []
    depth = 0
    cur = None
    key_re = re.compile(r"^  ([A-Za-z_$][\w$]*)\s*:")
    while i < len(lines):
        d = brace_delta(lines[i])
        if depth >= 1:
            m = key_re.match(lines[i])
            if m and depth == 1 and cur is not None:
                members.append((cur[0], cur[1], i))
            if m and depth == 1:
                cur = (m.group(1), i, None)
        depth += d
        if depth <= 0 and cur is not None:
            cur = (cur[0], cur[1], i)
            members.append(cur)
            break
        i += 1
    return members

def parse_imports(lines: list[str]) -> list[ImportEntry]:
    """Parse import statements into [(kind, source, [(spec, alias, is_type)])]."""
    text = "\n".join(lines)
    imports = []
    for m in re.finditer(
        r"import\s+(type\s+)?\{([^}]*)\}\s+from\s+['\"]([^'\"]+)['\"]", text, re.S
    ):
        whole_is_type = bool(m.group(1))
        source = m.group(3)
        members = []
        for part in m.group(2).split(","):
            part = part.strip()
            if not part:
                continue
            tm = re.match(r"^(type\s+)?([\w$]+)(?:\s+as\s+([\w$]+))?$", part)
            if not tm:
                raise SystemExit(f"!! unparseable import member: {part!r}")
            members.append((tm.group(2), tm.group(3) or tm.group(2), bool(tm.group(1))))
        imports.append((whole_is_type, source, members))
    return imports

def slice_chunk_text(sl: str) -> str:
    """All text of a slice (interface fields + create keys) joined, for import scan."""
    text = []
    for _n, s, e in MEMBERS[sl]:
        text.extend(SRC[s:e])
    for _n, s, e in CREATE_KEYS[sl]:
        text.extend(SRC[s:e])
    return "\n".join(text)

# ─── emission ───────────────────────────────────────────────────────────────
def pick_type(iface: str, names: list[str]) -> str:
    """Pick<Iface, 'a' | 'b' | ...> — ~10 names per line.

    REQUIRED members, not Partial: the barrel create-literal spreads
    {sl}Defaults / {sl}Actions into the full InpaintState intersection, and
    optional members are not assignable to required ones (TS2322). Pick with
    the exact name set keeps missing-member detection — adding a member to the
    interface without implementing it still fails tsc.
    """
    parts = [f"Pick<{iface},"]
    chunks = [names[i:i + 10] for i in range(0, len(names), 10)]
    for ci, chunk in enumerate(chunks):
        # intermediate chunks continue with a trailing `|`; the LAST chunk
        # must end bare — `Pick<A, 'a' | 'b',>` is TS1009 (trailing comma in
        # a type-argument list)
        tail = " |" if ci < len(chunks) - 1 else ""
        parts.append("  " + " | ".join(f"'{n}'" for n in chunk) + tail)
    parts.append(">")
    return "\n".join(parts)

def emit_slice(sl: str, file_name: str, iface: str, doc: str, imports: list[ImportEntry]) -> list[str]:
    lines = [
        "// " + doc,
        "//",
        "// Carved from inpaint.ts by scripts/inpaint_split.py (Phase 6 restructure).",
        "// All state lives in the inpaint store — this module provides one slice of it.",
        "",
        "import type { InpaintState } from './inpaint'",
        "",
        # `set`/`get` are the create-callback parameters — zustand's StoreApi
        # has setState/getState, NOT set/get. StateCreator's first parameter
        # IS StoreApi<T>['setState'] (overloaded: partial-or-updater with
        # replace?: false, full state with replace: true), so indexing the
        # store's api type matches what create() passes exactly.
        "import type { StoreApi } from 'zustand'",
        "",
    ]
    # distribute imports: member used in this slice's text → import it
    chunk = slice_chunk_text(sl)
    used = set(re.findall(r"\b(\w+)\b", chunk))
    for whole_is_type, source, members in imports:
        sub = [mm for mm in members if mm[1] in used]
        if not sub:
            continue
        parts = []
        for spec, alias, is_type in sub:
            # whole-is-type imports cover every member — never double-mark
            tok = ("" if whole_is_type else ("type " if is_type else "")) + spec
            if alias != spec:
                tok += " as " + alias
            parts.append(tok)
        kind = "type " if whole_is_type else ""
        lines.append(f"import {kind}{{ {', '.join(parts)} }} from '{source}'")
    # barrel utilities (randomSeed / newStrokeId / probeProjectDimensions live
    # in inpaint.ts's utilities tail) — cross-import what this slice calls.
    # Circular (inpaint.ts also imports this slice) but safe: the utilities are
    # referenced only when actions run, after the module graph is evaluated.
    tail_used = used & {"randomSeed", "newStrokeId", "probeProjectDimensions"}
    if tail_used:
        lines.append(f"import {{ {', '.join(sorted(tail_used))} }} from './inpaint'")
    lines += ["", f"export interface {iface} {{"]
    seen = set()
    for name, s, e in MEMBERS[sl]:
        if name in INTERFACE_NAMES:
            if name in seen:
                print(f"  ! duplicate interface field {name} — keeping first")
                continue
            seen.add(name)
            lines.extend(SRC[s:e])
    for name in ACTIONS[sl]:
        if name in EXTRA_SIGS and name not in seen:
            lines.append("  " + EXTRA_SIGS[name])
    lines += ["}", ""]
    defaults = [k for k in CREATE_KEYS[sl] if k[0] in DATA[sl]]
    lines += [f"export const {sl}Defaults: {pick_type(iface, [k[0] for k in defaults])} = {{"]
    for _n, s, e in defaults:
        lines.extend(SRC[s:e])
    lines += ["}", ""]
    actions = [k for k in CREATE_KEYS[sl] if k[0] in ACTIONS[sl]]
    lines += [
        f"export const {sl}Actions = (",
        # set/get are the create-callback parameters — index the store API type
        # exactly as zustand's StateCreator does (setState/getState, NOT
        # set/get), so the barrel's create() callback types match 1:1.
        "  set: StoreApi<InpaintState>['setState'],",
        "  get: StoreApi<InpaintState>['getState'],",
        f"): {pick_type(iface, [k[0] for k in actions])} => ({{",
    ]
    for _n, s, e in actions:
        lines.extend(SRC[s:e])
    lines += ["})", ""]
    return lines

def assign_comment_ownership(members: list[MemberSpan]) -> None:
    """Spans have exclusive ends; a comment block above a key belongs to THAT
    key, not the previous member. Each member's end is pulled back to the next
    member's comment-extended start so no line is emitted twice or lost."""
    for i in range(len(members) - 1):
        nxt_start = members[i + 1][1]
        if nxt_start < members[i][2]:
            members[i] = (members[i][0], members[i][1], nxt_start)

def main() -> None:
    global MEMBERS, INTERFACE_NAMES, CREATE_KEYS, SRC
    SRC = FILE.read_text().split("\n")
    src = SRC
    imports = parse_imports(src[:62])

    # interface fields
    iface_start = next(i for i, l in enumerate(src) if re.match(r"interface\s+InpaintState\s*\{", l))
    fields = parse_members(src, iface_start)
    INTERFACE_NAMES = {f[0] for f in fields}
    # create-body keys
    create_start = next(i for i, l in enumerate(src) if "create<InpaintState>" in l)
    # find the object literal after ((set, get) => (
    for i in range(create_start, create_start + 5):
        if "=> (" in src[i]:
            create_start = i
            break
    keys = parse_members(src, create_start)

    # extend starts up over each member's own leading comment/blank lines,
    # then give the comments to the member they precede (exclusive ends)
    fields = [(n, leading_comment_extent(src, s), e) for n, s, e in fields]
    keys = [(n, leading_comment_extent(src, s), e) for n, s, e in keys]
    assign_comment_ownership(fields)
    assign_comment_ownership(keys)

    # assign to slices
    MEMBERS = {sl: [] for sl, *_ in SLICES}
    CREATE_KEYS = {sl: [] for sl, *_ in SLICES}
    missing = []
    for name, s, e in fields:
        sl = NAME_TO_SLICE.get(name)
        if not sl:
            missing.append(f"interface {name} L{s + 1}")
        else:
            MEMBERS[sl].append((name, s, e))
    for name, s, e in keys:
        sl = NAME_TO_SLICE.get(name)
        if not sl:
            missing.append(f"create {name} L{s + 1}")
        else:
            CREATE_KEYS[sl].append((name, s, e))

    if missing:
        print(f"!!! {len(missing)} unmapped members (add to DATA/ACTIONS in the script):")
        for m in missing:
            print("  " + m)
        sys.exit(1)
    # extras in the dict that exist in neither file region
    parsed = set(INTERFACE_NAMES) | {k[0] for k in keys}
    for name, sl in sorted(NAME_TO_SLICE.items()):
        if name not in parsed:
            print(f"  ! dict entry {name} → {sl} not found in file (stale)")
    # completeness report
    total_f = total_k = 0
    print(f"=== {FILE.name} decomposition plan ===")
    for sl, file_name, iface, doc in SLICES:
        n_f, n_d, n_a = len(MEMBERS[sl]), len([k for k in CREATE_KEYS[sl] if k[0] in DATA[sl]]), len([k for k in CREATE_KEYS[sl] if k[0] in ACTIONS[sl]])
        span = sum(e - s + 1 for _n, s, e in MEMBERS[sl] + CREATE_KEYS[sl])
        print(f"  {file_name:22s} {n_f:3d} interface fields, {n_d:3d} defaults, {n_a:3d} actions ({span} lines)")
        total_f += n_f; total_k += n_d + n_a
    print(f"  totals: {total_f} fields / {total_k} create keys")

    # hard set-equality: every interface field + declared extra must have a
    # create-body key, and vice versa. A parse bug (or an interface member
    # with no implementation) must fail loudly, not silently emit a
    # truncated slice.
    actual = {k[0] for k in keys}
    expected = set(INTERFACE_NAMES) | set(EXTRA_SIGS)
    if actual != expected:
        print(f"!!! create keys ≠ interface fields + extras ({len(actual)} vs {len(expected)})")
        for n in sorted(expected - actual):
            print(f"  in interface/extras but NOT in create body: {n}")
        for n in sorted(actual - expected):
            print(f"  in create body but NOT in interface/extras: {n}")
        sys.exit(1)

    if DRY:
        return

    barrel = [
        "// Inpaint store barrel — state shape + slice composition for the UniCanvas",
        "// inpaint editor. The store is built by spreading seven concern slices:",
        "// layers, brush, paths, tools, generation, history, viewport (each",
        "// inpaint<Slice>.ts owns its interface, defaults, and actions).",
        "//",
        "// Decomposed from the original 4,583-line single file by",
        "// scripts/inpaint_split.py (Phase 6 restructure) — pure refactor.",
        "",
        "import { create } from 'zustand'",
        "",
    ]
    for sl, file_name, iface, _d in SLICES:
        barrel.append(f"import type {{ {iface} }} from './{file_name[:-3]}'")
    # value imports for the spread composition — the type-only imports above
    # do NOT bring in the defaults/actions factories
    for sl, file_name, iface, _d in SLICES:
        barrel.append(f"import {{ {sl}Defaults, {sl}Actions }} from './{file_name[:-3]}'")
    barrel += [
        "",
        "export type InpaintState = " + " & ".join(f"{i}" for _sl, _f, i, _d in SLICES),
        "",
        "export const useInpaintStore = create<InpaintState>((set, get) => ({",
    ]
    for sl, _f, _i, _d in SLICES:
        barrel.append(f"  ...{sl}Defaults,")
        barrel.append(f"  ...{sl}Actions(set, get),")
    barrel += [
        "}))",
        "",
        "export * from './inpaintTypes'",
        "export { evalBezier, anchorOffset, selectVisibleRasterLayers, shouldRenderOutpaintBase, defaultBBox } from './inpaintHelpers'",
        "",
    ]
    # utilities (verbatim from the tail)
    tail_start = next(i for i, l in enumerate(src) if l.startswith("// ─── Utilities"))
    barrel.append("\n".join(src[tail_start:]))
    barrel.append("")

    # key by FILE NAME (not slice id) so the `.ts` extension is preserved
    out = {**{f: emit_slice(sl, f, i, d, imports) for sl, f, i, d in SLICES},
           "inpaint.ts": barrel}
    # barrel import scan: which helper/type members does the barrel still use?
    # (exclude the re-export lines — their members are already handled there)
    barrel_text = "\n".join(l for l in barrel if not l.startswith(("export {", "export *")))
    used = set(re.findall(r"\b(\w+)\b", barrel_text))
    extra_imports = []
    for whole_is_type, source, members in imports:
        if source == "zustand":
            continue
        sub = [mm for mm in members if mm[1] in used]
        if not sub:
            continue
        parts = []
        for spec, alias, is_type in sub:
            # whole-is-type imports cover every member — never double-mark
            tok = ("" if whole_is_type else ("type " if is_type else "")) + spec
            if alias != spec:
                tok += " as " + alias
            parts.append(tok)
        kind = "type " if whole_is_type else ""
        extra_imports.append(f"import {kind}{{ {', '.join(parts)} }} from '{source}'")
    # insert right before the InpaintState declaration (after all slice imports)
    idx = next(i for i, l in enumerate(barrel) if l.startswith("export type InpaintState"))
    barrel[idx:idx] = extra_imports
    if extra_imports:
        barrel.insert(idx + len(extra_imports), "")

    for file_name, content in out.items():
        dest = CANVAS / file_name
        dest.write_text("\n".join(content))
        print(f"wrote {dest.relative_to(Path.cwd())} ({len(content)} lines)")

if __name__ == "__main__":
    main()

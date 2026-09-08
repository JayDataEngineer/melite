"""test_shell_seams — ROW 5 stroke 1 / THE SHELL (2026-09-07).

The studio body is ONE estate primitive with three declared seams
(RAIL / CENTER / BOTTOM) and shell-owned chrome — extracted from
AssemblyStudio, which rode it unchanged (anny + trellis tenants,
same DOM, same tests). This wall refuses the drift shapes (pure
tree walk + module parse, no node needed):

  1. THE SHELL EXISTS, GENRE-BLIND — packages/web-kit/ui/src/studioShell.tsx
     (the @melite/ui home, above the genre ui/ packages per the
     PRIMITIVE HOME LAW) imports NO genre module: no 3d, no video,
     no mask, no timeline, no viewers/Stage. A genre import in the
     shell is card knowledge leaking into the chrome — the C-
     ancestry shape at UI scale (four bespoke shells drifting).
  2. THE SEAM CONTRACT IS TYPED AND MINIMAL — the props interface
     declares exactly rail + center + bottom + errors; rail and
     center are REQUIRED (a studio without a rail or a center is
     not a studio); no card/lane/flow vocabulary may appear.
  3. THE CHROME IS OWNED ONCE — the loud error line's DEFINITION
     lives in the shell and nowhere else in a tenant tree (a
     re-export for adoption compatibility is legal; a second
     definition is a drift copy).
  4. THE GENRE TENANTS RIDE IT — the assembly body (the extraction
     source, both 3d tenants) renders <StudioShell with the rail=
     and center= seams; the bespoke pre-shell shape (StudioRail +
     hand-rolled column div in the same file) refuses.

Design record: docs/design/studio-shell.md §2 + §2.5 + §4 + §7 strokes 1-6.
"""
import os
import re

REPO = os.path.normpath(os.path.join(os.path.dirname(
    os.path.abspath(__file__)), "..", "..", ".."))

SHELL = os.path.join(REPO, "packages", "web-kit", "ui", "src", "studioShell.tsx")
ASSEMBLY = os.path.join(
    REPO, "packages", "engines", "comfyui", "action_cards",
    "3d", "ui", "studios", "assembly.tsx")

# genre vocabulary the shell must never name (module-level import
# scan; comments are not scanned — an import is a dependency, not
# prose)
_GENRE_MODULE_RE = re.compile(
    r"""^\s*import\b[^;]*?\bfrom\b\s*['"][^'"]*("""
    r"viewers|Stage3D|timeline|mask|paint|canvas|video|motion"
    r")", re.MULTILINE | re.IGNORECASE)

_IMPORT_RE = re.compile(r"""^\s*import\b[^;]*?from\b\s*['"]([^'"]+)['"]""",
                        re.MULTILINE)


def test_the_shell_exists_at_the_genre_neutral_home() -> None:
    assert os.path.isfile(SHELL), \
        "packages/web-kit/ui/src/studioShell.tsx — THE SHELL lives in @melite/ui " \
        "(above the genre ui/ packages; PRIMITIVE HOME LAW)"
    src = open(SHELL, encoding="utf-8").read()
    for needed in ("StudioShell", "StudioShellErrorLine",
                   "StudioShellProps"):
        assert needed in src, "the shell module names %s" % needed


def test_the_shell_is_genre_blind() -> None:
    src = open(SHELL, encoding="utf-8").read()
    hits = _GENRE_MODULE_RE.findall(src)
    assert not hits, \
        "the shell imports genre vocabulary (%s) — card knowledge " \
        "in the chrome; the tenant declares, the shell renders" % hits
    # the only workspace imports allowed: the rail portal + contracts
    for mod in _IMPORT_RE.findall(src):
        if mod.startswith("."):
            continue
        assert mod in ("react", "lucide-react", "@melite/slots"), \
            "shell imports %r — the seam stays layout-only; a new " \
            "dependency is a deliberate contract change" % mod


def test_the_seam_contract_is_typed_and_minimal() -> None:
    src = open(SHELL, encoding="utf-8").read()
    m = re.search(r"export interface StudioShellProps \{(.*?)\n\}",
                  src, re.DOTALL)
    assert m, "StudioShellProps is exported (the typed seam contract)"
    body = m.group(1)
    # optionality: rail + center REQUIRED; bottom + errors optional
    for seam in ("rail", "center"):
        line = [l for l in body.splitlines()
                if re.search(r"\b%s\??\s*:" % seam, l)]
        assert line, "the %s seam is declared" % seam
        assert not line[0].strip().startswith("%s?" % seam), \
            "the %s seam is REQUIRED (a studio without it is not a " \
            "studio)" % seam
    for opt in ("bottom?", "errors?"):
        assert opt in body, "the %s seam is optional" % opt[:-1]
    # no card/lane/flow vocabulary rides the seam contract
    for banned in ("CardStage", "onSave", "model", "flow", "lane"):
        assert banned not in body, \
            "the seam contract names %r — the shell owns no card " \
            "state (E1); tenants pass content, not card rows" % banned


def test_the_chrome_is_owned_once() -> None:
    # the error line's DEFINITION: exactly the shell module
    definer = re.compile(r"function\s+StudioShellErrorLine\s*\(")
    assert definer.search(open(SHELL, encoding="utf-8").read()), \
        "the shell defines StudioShellErrorLine (shell-owned chrome)"
    # a tenant tree may RE-EXPORT it (adoption compat) but never
    # define a second copy under any name the shell also exports
    roots = [os.path.join(REPO, "packages", "engines")]
    for root in roots:
        for dirpath, _dirs, files in os.walk(root):
            if "node_modules" in dirpath:
                continue
            for f in files:
                if not f.endswith((".ts", ".tsx")):
                    continue
                p = os.path.join(dirpath, f)
                if os.path.samefile(p, SHELL):
                    continue
                src = open(p, encoding="utf-8").read()
                hit = re.search(
                    r"function\s+(\w*ErrorLine\w*)\s*\(", src)
                if hit:
                    assert "StudioShellErrorLine" not in src or \
                        "export {" in src.split(hit.group(0))[0][-200:], \
                        "%s defines an error-line component (%s) — " \
                        "chrome drift; ride the shell's" % (
                            os.path.relpath(p, REPO), hit.group(1))


# ── the chrome stroke (2026-09-07): every big-view tenant rides ──────
# THE SHELL + the shared chrome kit — the hand-rolled twins die.
# Design record: docs/design/studio-chrome.md.

MOTION_STUDIO = os.path.join(
    REPO, "packages", "engines", "comfyui", "action_cards",
    "motion", "motion-studio", "ui", "studio", "component.tsx")
H3_STUDIO = os.path.join(
    REPO, "packages", "engines", "comfyui", "action_cards",
    "video", "h3-timeline", "ui", "studio", "component.tsx")
H3_STRIP = os.path.join(
    REPO, "packages", "engines", "comfyui", "action_cards",
    "video", "h3-timeline", "ui", "studio", "StudioStripPane.tsx")
H3_PREVIEW = os.path.join(
    REPO, "packages", "engines", "comfyui", "action_cards",
    "video", "h3-timeline", "ui", "studio", "StudioPreview.tsx")
ANNY_STUDIO = os.path.join(
    REPO, "packages", "engines", "comfyui", "action_cards",
    "3d", "anny", "ui", "studio", "component.tsx")
ANNY_SHAPE = os.path.join(
    REPO, "packages", "engines", "comfyui", "action_cards",
    "3d", "anny", "ui", "studio", "shape.tsx")
TIMELINE_BAR = os.path.join(
    REPO, "packages", "web-kit", "timeline", "timeline", "MotionTimelineBar.tsx")


def test_the_motion_tenant_rides_the_shell() -> None:
    src = open(MOTION_STUDIO, encoding="utf-8").read()
    assert "<StudioShell" in src, \
        "MotionCardEditor renders StudioShell (the chrome stroke: " \
        "the motion studio rides the declared seams, not the " \
        "hand-rolled column)"
    for seam in ("rail={", "center={", "bottom="):
        assert seam in src, \
            "the motion body declares the %s seam" % seam[:-1]
    assert "<StudioRail" not in src, \
        "MotionCardEditor hand-rolls the rail portal — the shell " \
        "owns the portal"
    assert "<ViewportFrame" in src, \
        "the motion stage rides ViewportFrame (drop handlers ride " \
        "the div props)"
    assert "<PaneShell" in src and "<PaneHeader" in src, \
        "the motion bar rides the shared strip kit (PaneShell + " \
        "PaneHeader)"


def test_the_h3_tenant_rides_the_shell() -> None:
    src = open(H3_STUDIO, encoding="utf-8").read()
    assert "<StudioShell" in src, \
        "VideoTimelineStudio renders StudioShell (the chrome " \
        "stroke: the H3 studio rides the declared seams)"
    for seam in ("rail={", "center={", "bottom="):
        assert seam in src, \
            "the h3 body declares the %s seam" % seam[:-1]
    assert "<StudioRail" not in src, \
        "VideoTimelineStudio hand-rolls the rail portal — the " \
        "shell owns the portal"


def test_the_temporal_tenants_share_the_strip_kit() -> None:
    # the two timeline-bearing cards (motion + h3) share ONE strip
    # chrome: PaneShell (the box) + PaneHeader (the header row),
    # with dialect overrides through className — never a second
    # hand-rolled box
    strip = open(H3_STRIP, encoding="utf-8").read()
    assert "<PaneShell" in strip and "<PaneHeader" in strip, \
        "StudioStripPane rides the shared strip kit"
    motion = open(MOTION_STUDIO, encoding="utf-8").read()
    assert "<PaneShell" in motion, \
        "the motion bar rides the same PaneShell (one box dialect " \
        "per tenant through className, not a fork)"
    # the BAR itself carries the styling seam (the shadcn rule):
    # className + theme props on the shared component
    bar = open(TIMELINE_BAR, encoding="utf-8").read()
    assert "className?: string" in bar, \
        "MotionTimelineBar takes className — a shared component " \
        "is styleable like every other primitive"
    assert "theme?: MotionTimelineBarTheme" in bar, \
        "MotionTimelineBar takes a theme palette override"
    assert "style?: CSSProperties" in bar, \
        "MotionTimelineBar forwards style"


def test_the_h3_preview_rides_the_pane_kit() -> None:
    src = open(H3_PREVIEW, encoding="utf-8").read()
    assert 'variant="preview"' in src, \
        "StudioPreview rides the preview PaneHeader"
    assert "<EmptyState" in src, \
        "StudioPreview rides EmptyState for the no-render block"


def test_the_anny_leftovers_ride_the_kit() -> None:
    src = open(ANNY_STUDIO, encoding="utf-8").read()
    assert "<ViewportFrame" in src, \
        "the anny figure rides ViewportFrame (min-h-440 through " \
        "className)"
    shape = open(ANNY_SHAPE, encoding="utf-8").read()
    assert "<RailSection" in shape, \
        "AnnyShapeBand rides RailSection"


def test_the_dead_h3_twins_stay_dead() -> None:
    # the aspirational slot decomposition (TimelinePreview /
    # TimelineFooter / timelineContext / timelineSlots) never
    # compiled and never mounted — deleted 2026-09-07. ONE preview
    # pane, ONE strip pane (the Studio* pair)
    studio_dir = os.path.dirname(H3_STUDIO)
    for gone in ("TimelinePreview.tsx", "TimelineFooter.tsx",
                 "timelineContext.ts", "timelineSlots.ts"):
        assert not os.path.exists(os.path.join(studio_dir, gone)), \
            "%s is a dead twin — deleted 2026-09-07; do not " \
            "resurrect" % gone
    # the element-slot seam it registered into died with it: the
    # slots package carries no unclaimed studio element slots
    seams = os.path.join(REPO, "packages", "web-kit", "slots", "src",
                         "cardElementSeams.ts")
    src = open(seams, encoding="utf-8").read()
    assert "export const cardStudioPreviewSlot" not in src, \
        "the studio preview element slot is dead chrome — the " \
        "shell center seam owns the preview"
    assert "export const cardStudioStripSlot" not in src, \
        "the studio strip element slot is dead chrome — the shell " \
        "bottom seam owns the strip"

# ANCHOR seam constants (plugin-layout stroke, 2026-09-07)
ANCHOR = os.path.join(REPO, "packages", "web-kit", "ui", "src",
    "viewport-anchor.tsx")
# promoted to the kit 2026-09-07 (the pattern-violations audit's
# promotion rule: two consumers, pure content) —
# packages/web-kit/ui/src/reference-image-badge.tsx, exported from @melite/ui
REFERENCE_BADGE = os.path.join(
    REPO, "packages", "web-kit", "ui", "src", "reference-image-badge.tsx")
ASSEMBLY_STUDIO = os.path.join(
    REPO, "packages", "engines", "comfyui", "action_cards",
    "3d", "ui", "studios", "assembly.tsx")


def test_the_anchor_seam_is_closed_and_geometry_only() -> None:
    # ViewportAnchor — the floating-content seam (pins, drawers,
    # notices, washes, bars). Since the map stroke the dock union
    # lives ONCE in python/ui_map.py (see test_ui_map_parity.py — the
    # written-once wall); this leg pins the tsx side: the anchor
    # imports the generated face and carries GEOMETRY only — z
    # rides className (the drawer z-10, a wash z-20, a pill z-30
    # are tenant stacking stories).
    src = open(ANCHOR, encoding="utf-8").read()
    assert 'from "./uiMap.generated"' in src, \
        "the anchor rides the generated map face — no hand-spelled union"
    assert '"z-"' not in src, \
        "no z in the anchor base — stacking rides className"
    assert 'data-slot="viewport-anchor"' in src, \
        "the anchor is a shadcn-rule primitive (data-slot + cn)"


def test_the_anny_window_specials_ride_anchor_seams() -> None:
    # THE named example (operator order 2026-09-07: "notice how
    # ANNY does very special stuff over the window"): everything
    # floating over the anny window DECLARES its dock; the leaves
    # are pure content.
    comp = open(ANNY_STUDIO, encoding="utf-8").read()
    assert 'dock="top-right"' in comp, \
        "the source pin declares its dock"
    assert 'dock="edge-right"' in comp, \
        "the shape drawer declares its dock"
    shape = open(ANNY_SHAPE, encoding="utf-8").read()
    assert 'dock="top-right"' in shape, \
        "the floating apply verb declares its dock"
    assert 'dock="bottom"' in shape, \
        "the notice strip declares its dock"
    # the leaves carry look, never geometry
    badge = open(REFERENCE_BADGE, encoding="utf-8").read()
    assert 'absolute right-2' not in badge, \
        "ReferenceImageBadge self-positions — flip it to pure " \
        "content and dock it with ViewportAnchor"
    assert 'data-slot="reference-image-badge"' in badge, \
        "the promoted badge follows the shadcn rules (data-slot)"
    assert 'absolute inset-y-0' not in shape, \
        "AnnyShapeDrawer self-positions — pure panel, the caller docks"
    # the assembly badge site rides the same anchor
    asm = open(ASSEMBLY_STUDIO, encoding="utf-8").read()
    assert 'dock="top-right"' in asm, \
        "assembly docks the shared source pin the same way"

def test_the_assembly_tenants_ride_the_shell() -> None:
    src = open(ASSEMBLY, encoding="utf-8").read()
    assert "<StudioShell" in src, \
        "AssemblyStudio renders StudioShell (the extraction source " \
        "rides it — anny + trellis unchanged)"
    for seam in ("rail={", "center="):
        assert seam in src, "the assembly body declares the %s seam" \
            % seam[:-1]
    # the bespoke pre-shell shape died: no direct StudioRail render
    # in the tenant body (the shell owns the rail portal now)
    assert "<StudioRail>" not in src, \
        "AssemblyStudio hand-rolls the rail portal — the shell owns " \
        "the rail/center/bottom layout (the pre-shell shape)"


# ── stroke 3 (2026-09-07): the CENTER seam is swappable ──────────────────
# PaintCanvas2D is the 2D viewport primitive (Stage3D's counterpart);
# mask studio rides THE SHELL with it in the center — proving the
# seam hosts a second viewport genre without the shell learning it.

PAINT = os.path.join(
    REPO, "packages", "engines", "comfyui", "action_cards",
    "image", "ui", "PaintCanvas2D.tsx")
MASK_STUDIO = os.path.join(
    REPO, "packages", "engines", "comfyui", "action_cards",
    "image", "mask_studio", "ui", "studio", "component.tsx")
MASK_CANVAS = os.path.join(
    REPO, "packages", "engines", "comfyui", "action_cards",
    "image", "mask_studio", "ui", "studio", "StudioCanvas.tsx")

# mask vocabulary the viewport primitive must never name (the card
# declares producers; the primitive renders canvas)
_PAINT_BANNED = ("mask", "detect", "prep", "bbox", "instance",
                 "sam3", "yolo", "segm", "person", "recipe")


def test_paint_canvas2d_exists_at_the_genre_home() -> None:
    assert os.path.isfile(PAINT), \
        "image/ui/PaintCanvas2D.tsx — the 2D viewport primitive at " \
        "the image genre home (Stage3D symmetry: 3d/ui/viewers). " \
        "ONE consumer today (mask); the move-up trigger is the " \
        "second genre consumer (PRIMITIVE HOME LAW, §6)"
    src = open(PAINT, encoding="utf-8").read()
    # CODE, not prose: provenance comments may name where the
    # primitive came from; the vocabulary ban is about identifiers,
    # props, and JSX (what the contract IS)
    code = re.sub(r"/\*.*?\*/", "", src, flags=re.DOTALL)
    code = re.sub(r"^\s*//.*$", "", code, flags=re.MULTILINE)
    low = code.lower()
    for word in _PAINT_BANNED:
        assert word not in low, \
            "PaintCanvas2D names %r — mask vocabulary in the " \
            "viewport primitive; the card declares, primitives " \
            "render" % word


def test_the_mask_studio_rides_the_shell() -> None:
    src = open(MASK_STUDIO, encoding="utf-8").read()
    assert "<StudioShell" in src, \
        "MaskStudioEditor renders StudioShell (stroke 3: the second " \
        "genre rides THE SHELL — center seam proven swappable)"
    for seam in ("rail={", "center=", "bottom="):
        assert seam in src, "the mask body declares the %s seam" \
            % seam[:-1]
    assert "<StudioRail" not in src, \
        "MaskStudioEditor hand-rolls the rail portal — the shell " \
        "owns the portal since stroke 1"


def test_the_mask_canvas_composes_the_primitive() -> None:
    src = open(MASK_CANVAS, encoding="utf-8").read()
    assert "<PaintCanvas2D" in src, \
        "StudioCanvas composes PaintCanvas2D (the wrapper/canvas/" \
        "transform/triage live in the primitive)"
    assert "<canvas" not in src, \
        "StudioCanvas hand-rolls the canvas element — the viewport " \
        "primitive owns it (no second canvas implementation)"
    assert "role=\"status\"" not in src, \
        "StudioCanvas duplicates the loading skeleton — the " \
        "primitive owns the decode state"


# ── stroke 4 (2026-09-07): typed shell tables — compile teeth
# mirrored by a tree walk ─────────────────────────────────────────
#
# ViewportKind/BarKind are CLOSED unions in @melite/ui
# (shellDeclaration.ts) — TS refuses a bad kind at build. This wall
# pins the two things a compiler cannot see: every cardStudios-glob
# tenant DECLARES a table (no undeclared bespoke bodies), and the
# declared kinds are members of the unions as they exist in the tree
# (a tenant kind drifting outside the parsed union = a stale table
# riding renamed vocabulary).

SHELL_DECL = os.path.join(
    REPO, "packages", "web-kit", "ui", "src", "shellDeclaration.ts")

# the cardStudios tenant glob (packages/web/editor/src/surfaces/flow/
# cardStudios.ts PLUGIN_TENANT_LOADERS): every studio body claim
TENANT_GLOB = os.path.join(
    REPO, "packages", "engines", "*", "action_cards", "*", "*",
    "ui", "studio", "component.tsx")


# the unions live in the generated face of python/ui_map.py since the
# map stroke — the helpers read the MAP (the SSOT), so this suite
# and test_ui_map_parity.py agree by construction
UI_MAP_GENERATED = os.path.join(
    REPO, "packages", "web-kit", "ui", "src", "uiMap.generated.ts")


def _union_members(src: str, name: str) -> set[str]:
    m = re.search(r"export type %s\s*=\s*([^\n]+)" % name, src)
    assert m, "%s union exists in uiMap.generated.ts" % name
    return set(re.findall(r'"([a-z0-9_-]+)"', m.group(1)))


def _tenant_files() -> list[str]:
    out: list[str] = []
    import glob as _glob
    for f in _glob.glob(TENANT_GLOB):
        if "node_modules" in f:
            continue
        out.append(f)
    assert out, "the cardStudios glob shape found tenants"
    return out


# THE TENANT RIDE LAW (pattern-violations audit, 2026-09-07)
# Every studio tenant either RIDES StudioShell (rail=/center=/
# bottom= as props — the shell owns the rail portal) or carries a
# RECORDED exemption. A tenant rendering <StudioRail> JSX is the
# pre-shell hand-rolled shape (the drift class the chrome stroke
# killed) — the exemption dict is the only legal survivor, and
# every entry names its design record.
TENANT_RIDE_EXEMPT = {
    # img_to_mesh rides VIA AssemblyStudio (the trellis-via-
    # assembly pattern — the delegation the source scan cannot
    # see; its shellDeclaration documents the same table).
    os.path.join("3d", "img_to_mesh", "ui", "studio",
                  "component.tsx"):
        "rides via AssemblyStudio (studio-plugin-layout.md)",
    # (2026-09-07, the gaps-closing stroke: canvas-ideogen reshaped
    # onto the shell — rail = params + toolbar + tabs, center = the
    # canvas; body migrated the same day. Only delegations remain.)
}


def test_every_tenant_rides_the_shell_or_is_exempt() -> None:
    ride, exempt = [], []
    for f in _tenant_files():
        rel = os.path.relpath(f, REPO)
        rel = rel.replace(
            os.path.join("packages", "engines", "comfyui",
                         "action_cards") + os.sep, "")
        src = open(f, encoding="utf-8").read()
        if "<StudioShell" in src:
            ride.append(rel)
        else:
            exempt.append(rel)
    # everyone riding needs no exemption; everyone not riding MUST
    # be in the recorded dict
    for rel in exempt:
        assert rel in TENANT_RIDE_EXEMPT, (
            "%s neither rides StudioShell nor carries a recorded "
            "exemption — migrate it (rail=/center=/bottom= props; "
            "the shell owns the portal) or record why" % rel
        )
    assert ride, "at least one tenant rides the shell"


def test_no_tenant_hand_rolls_the_rail_portal() -> None:
    # the shell owns the StudioRail portal; a tenant rendering the
    # JSX is the pre-shell shape (only the recorded exemptions
    # survive, and they are dying)
    for f in _tenant_files():
        rel = os.path.relpath(f, REPO)
        rel = rel.replace(
            os.path.join("packages", "engines", "comfyui",
                         "action_cards") + os.sep, "")
        src = open(f, encoding="utf-8").read()
        if "<StudioRail" in src:
            assert rel in TENANT_RIDE_EXEMPT, (
                "%s hand-rolls the rail portal — the shell owns "
                "it (ride StudioShell with rail={...})" % rel
            )

def test_every_tenant_declares_a_shell_table_within_the_unions() -> None:
    map_src = open(UI_MAP_GENERATED, encoding="utf-8").read()
    viewports = _union_members(map_src, "ViewportKind")
    bars = _union_members(map_src, "BarKind")
    assert {"stage3d", "paint2d", "native"} <= viewports
    assert {"recipe", "timeline"} <= bars
    for f in _tenant_files():
        rel = os.path.relpath(f, REPO)
        src = open(f, encoding="utf-8").read()
        assert "defineShellDeclaration" in src, \
            "%s declares its shell ride through the typed " \
            "construction door (no bespoke undeclared body)" % rel
        m = re.search(
            r"export const shellDeclaration = defineShellDeclaration\("
            r"[\s\S]*?\)", src)
        assert m, "%s exports shellDeclaration (the seam table)" % rel
        table = m.group(0)
        kinds = re.findall(r'kind:\s*"([a-z0-9_]+)"', table)
        assert kinds, "%s: the table declares at least a center kind" % rel
        for k in kinds:
            assert k in viewports | bars, \
                "%s declares kind %r outside the closed unions " \
                "(ViewportKind %s / BarKind %s)" % (
                    rel, k, sorted(viewports), sorted(bars))
        # the center seam is required data (a studio without a center
        # is not a studio)
        assert "center:" in table, \
            "%s: center seam row missing from the table" % rel


def test_union_members_name_real_primitives_only() -> None:
    # no speculative kinds: every ViewportKind/BarKind member maps to
    # a primitive that EXISTS — stage3d→3d/ui/viewers Stage,
    # paint2d→image/ui PaintCanvas2D, recipe→OutputStrip,
    # timeline→@melite-plugin/timeline. (native names the tenant's
    # own viewport riding the seam directly.)
    assert os.path.isfile(os.path.join(
        REPO, "packages", "engines", "comfyui", "action_cards",
        "3d", "ui", "viewers", "Stage.tsx"))
    assert os.path.isfile(os.path.join(
        REPO, "packages", "engines", "comfyui", "action_cards",
        "image", "ui", "PaintCanvas2D.tsx"))
    assert os.path.isfile(os.path.join(
        REPO, "packages", "engines", "comfyui", "action_cards",
        "image", "mask_studio", "ui", "studio", "OutputStrip.tsx"))
    assert os.path.isdir(os.path.join(REPO, "packages", "web-kit", "timeline"))


# ── stroke 5 (2026-09-07): ONE verb UX across every card ──────────────
#
# Every in-card action is the same shape: the CHIP (icon → spinner,
# phase label) + the NOTE line under it (feedback in place, §5.4 —
# never a toast). VerbChip (@melite/ui) is the bones; tenants map
# their phases and notes. This wall refuses the hand-rolled copies.

VERB_CHIP = os.path.join(REPO, "packages", "web-kit", "ui", "src", "verbChip.tsx")
VERB_RIDERS = [
    os.path.join(REPO, "packages", "engines", "comfyui",
                 "action_cards", "3d", "anny", "ui", "studio",
                 "component.tsx"),
    os.path.join(REPO, "packages", "engines", "comfyui",
                 "action_cards", "image", "mask_studio", "ui",
                 "studio", "Sam3PromptBox.tsx"),
]


def test_verbchip_exists_genre_blind() -> None:
    assert os.path.isfile(VERB_CHIP), \
        "packages/web-kit/ui/src/verbChip.tsx — VerbChip (@melite/ui), the one " \
        "verb UX primitive (§4)"
    src = open(VERB_CHIP, encoding="utf-8").read()
    code = re.sub(r"/\*.*?\*/", "", src, flags=re.DOTALL)
    code = re.sub(r"^\s*//.*$", "", code, flags=re.MULTILINE)
    low = code.lower()
    for word in ("card", "flow", "mask", "anny", "sam3", "queue"):
        assert word not in low, \
            "VerbChip names %r — card vocabulary in the verb " \
            "primitive; the tenant maps phases, the chip renders " \
            "bones" % word


def test_the_verb_gestures_ride_the_shared_chip() -> None:
    for f in VERB_RIDERS:
        rel = os.path.relpath(f, REPO)
        src = open(f, encoding="utf-8").read()
        assert "<VerbChip" in src, \
            "%s renders VerbChip (one verb UX — §4)" % rel
        # the hand-rolled chip bones died with the primitive: no
        # brand-chip class combo, and (in the chip-only rider) no
        # spinner-swap left — anny's five gestures all ride the
        # chip; Sam3PromptBox keeps ONE status glyph in its box
        # header (the ride-along indicator, not a verb chip)
        assert "border-brand/40 bg-brand/10" not in src, \
            "%s hand-rolls the chip chrome — VerbChip owns the " \
            "actions-zone shape" % rel
        if rel.endswith("anny/ui/studio/component.tsx"):
            assert "Loader2" not in src, \
                "%s hand-rolls the spinner swap — VerbChip owns " \
                "the in-flight icon" % rel


# ── stroke 6 (2026-09-07): the OVERLAY seam on the viewport
# primitives — typed rows, closed kind/dock unions, renderer-owned
# positioning ──────────────────────────────────────────────────────

VIEWPORT_OVERLAYS = os.path.join(
    REPO, "packages", "web-kit", "ui", "src", "viewportOverlays.tsx")


def test_overlay_unions_closed_and_renderer_genre_blind() -> None:
    src = open(VIEWPORT_OVERLAYS, encoding="utf-8").read()
    # the unions live in the generated face of python/ui_map.py since
    # the map stroke; the renderer re-exports them (and the
    # written-once wall refuses any second spelling)
    map_src = open(UI_MAP_GENERATED, encoding="utf-8").read()
    assert 'from "./uiMap.generated"' in src, \
        "the renderer rides the generated map face"
    for name, members in (
        ("OverlayKind", {"toggle", "segmented", "status"}),
        ("OverlayDock", {"tl", "tr", "bl", "br"}),
    ):
        m = re.search(r"export type %s\s*=\s*([^\n]+)" % name, map_src)
        assert m, "%s closed union exists" % name
        got = set(re.findall(r'"([a-z0-9_]+)"', m.group(1)))
        assert got == members, "%s members: %s" % (name, sorted(got))
    code = re.sub(r"/\*.*?\*/", "", src, flags=re.DOTALL)
    code = re.sub(r"^\s*//.*$", "", code, flags=re.MULTILINE)
    low = code.lower()
    for word in ("card", "mask", "detect", "anny", "flow", "sam3"):
        assert word not in low, \
            "viewportOverlays names %r — card vocabulary in the " \
            "seam renderer; the card declares rows, the renderer " \
            "owns chrome" % word


def test_both_viewport_primitives_carry_the_seam() -> None:
    for f, marker in (
        (PAINT, "overlays?: readonly ViewportOverlay[]"),
        (os.path.join(REPO, "packages", "engines", "comfyui",
                      "action_cards", "3d", "ui", "viewers",
                      "Stage.tsx"),
         "overlays?: readonly ViewportOverlay[]"),
    ):
        src = open(f, encoding="utf-8").read()
        assert marker in src, \
            "%s declares the overlays seam (§2.5 — the viewport " \
            "primitive owns the positioned wrapper)" % os.path.relpath(f, REPO)
        assert "<ViewportOverlays" in src, \
            "%s renders ViewportOverlays" % os.path.relpath(f, REPO)


def test_the_first_overlay_gesture_rides_the_seam() -> None:
    src = open(MASK_CANVAS, encoding="utf-8").read()
    assert 'kind: "status"' in src, \
        "StudioCanvas declares its detecting pill as a status row " \
        "(the seam's first consumer)"
    # the hand-rolled absolute DOM died with the seam: no docked
    # status pill chrome left in the tenant
    assert "absolute left-2 top-2" not in src, \
        "StudioCanvas hand-rolls a tl-docked pill — declare it as " \
        "an overlay row; the renderer owns the dock"

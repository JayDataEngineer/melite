"""test_card_pattern_wall.py — THE CARD PATTERN wall (anti-drift).

Operator order, 2026-10-02: "Can some sort of testing for this? For
the file structure and basics? So we don't drift again?"

Provenance: the cpp engines' first pass spoke a 5-arg card_compose
with yaml-text returns while the bus speaks
`card_compose(body, model, run_id, graph)` — every submission died
at the compose bridge and the gate suite stayed GREEN because it
tested the arms directly, never the bus. This wall pins the PATTERN
estate-wide so a card that drifts cannot land:

LAW 1 (file structure) — every card dir under any plugin's
    action_cards/<genre>/<card>/ that declares py/card.py owns the
    full pattern set: py/__init__.py, py/compose.py, py/renderer.py
    (schema.py is optional — cards with a document gate). The arm
    lives IN THE CARD PACKAGE, never in the plugin's compose/.
LAW 2 (bus arity) — every card_compose the bus can load speaks
    exactly (body, model, run_id, graph). The arity break dies here.
LAW 3 (the bus drive) — every engine's compose door is REACHABLE
    through the exact gateway hop (plugins.compose): an empty body
    must yield a clean refusal (ValidationError, rc≠0, naming the
    missing required param) or a clean return — never TypeError /
    AttributeError / ImportError (arity, import, reachability).
LAW 4 (identity gates) — every serving card (api=True) declares an
    ability dict with a default_family (the capability-tile gate).
LAW 5 (no fossils) — card.yaml and card_knobs.yaml are EXTINCT
    tree-wide: identity lives on the ActionCard class, knob rows on
    the model class (card_knobs tuples).
LAW 6 (category law) — a depth-2 dir under plugins/engines/ without
    plugin markers is a CATEGORY CONTAINER: every child carries
    markers (the shared walk's assumption, pinned).
LAW 7 (boundary law) — plugin trees import NO sibling plugin (by
    package alias) and NO gateway core (the bus is the only door).
    The AST import scan (import-linter's job, wall-shaped).
LAW 8 (clean-import law) — every compose module and card package
    imports CLEAN in an isolated subprocess (side-effect drift: no
    network, no GPU, no crash on import — their subprocess pattern).
LAW 9 (manifest law) — every plugin.py declares the Plugin class
    with the structural manifest: id/engines/genres (manifest drift,
    pydantic-at-load's shape pinned statically).
LAW 10 (vendor registration law) — every gitlink under plugins/ has
    a .gitmodules section at its CURRENT path, and every .gitmodules
    path under plugins/ is a live gitlink (both directions: moving a
    vendored plugin orphans the pin — the audio-cpp move class).
LAW 11 (engine ABI law) — every execute door is
    async def execute(node, run_dir, inputs, stop_event, report=None);
    every unload door (ENGINE TRANSITION ABI) is async. AST-pinned.
LAW 12 (argv SSOT law) — under the cpp category, CLI flag literals
    ('"--...') appear ONLY in renderer.py files (PYTHON SHAPE rung 8:
    the render truth has one home).
"""

import glob
import inspect
import os
import sys
import unittest
from collections.abc import Iterator

from _anchor import REPO

import plugins
import flow_graph

_ENG_ROOT = os.path.join(REPO, "plugins", "engines")


def _iter_card_dirs() -> Iterator[tuple[str, str, str]]:
    """Yield (plugin, genre, card_dir) for every dir under any
    plugin's action_cards/<genre>/<card>/ that declares py/card.py —
    depth-2 plugins AND depth-3 category children (cpp)."""
    for plugin in sorted(os.listdir(_ENG_ROOT)):
        proot = os.path.join(_ENG_ROOT, plugin)
        if not os.path.isdir(proot) or plugin.startswith("."):
            continue
        plugin_dirs = [(plugin, proot)]
        has_marker = any(
            os.path.exists(os.path.join(proot, m))
            for m in ("plugin.py", "plugin.yaml", "engines"))
        if not has_marker:
            # category container (cpp) — children are the plugins
            for child in sorted(os.listdir(proot)):
                c = os.path.join(proot, child)
                if os.path.isdir(c) and not child.startswith("."):
                    plugin_dirs.append((child, c))
        for pname, pdir in plugin_dirs:
            aroot = os.path.join(pdir, "action_cards")
            if not os.path.isdir(aroot):
                continue
            for genre in sorted(os.listdir(aroot)):
                gdir = os.path.join(aroot, genre)
                if not os.path.isdir(gdir) or genre.startswith("."):
                    continue
                for card in sorted(os.listdir(gdir)):
                    cdir = os.path.join(gdir, card)
                    if os.path.isdir(cdir) and os.path.isfile(
                            os.path.join(cdir, "py", "card.py")):
                        yield pname, genre, cdir


def _iter_all_compose_files() -> Iterator[str]:
    """Yield every compose module path the tree ships (compose/
    packages AND legacy engines/*/compose.py), depth-2 plugins and
    depth-3 category children alike."""
    for plugin in sorted(os.listdir(_ENG_ROOT)):
        proot = os.path.join(_ENG_ROOT, plugin)
        if not os.path.isdir(proot) or plugin.startswith("."):
            continue
        plugin_dirs = [proot]
        has_marker = any(
            os.path.exists(os.path.join(proot, m))
            for m in ("plugin.py", "plugin.yaml", "engines"))
        if not has_marker:
            # category container (cpp) — children are the plugins
            for child in sorted(os.listdir(proot)):
                c = os.path.join(proot, child)
                if os.path.isdir(c) and not child.startswith("."):
                    plugin_dirs.append(c)
        for pdir in plugin_dirs:
            pkg = os.path.join(pdir, "compose", "__init__.py")
            if os.path.isfile(pkg):
                yield pkg
            for engine in sorted(os.listdir(
                    os.path.join(pdir, "engines"))) \
                    if os.path.isdir(os.path.join(pdir, "engines")) \
                    else []:
                cfile = os.path.join(pdir, "engines", engine,
                                     "compose.py")
                if os.path.isfile(cfile):
                    yield cfile


def _seed_graph(engine: str) -> flow_graph.Skeleton:
    row = flow_graph.NodeRow(
        node_id="seed", node_type=engine, input_from=(),
        params={"workflow": {"seed": True}})
    return flow_graph.Skeleton(name="seed", engine_type=engine,
                                   nodes=(row,))


class TestLaw1FileStructure(unittest.TestCase):
    """Every card owns the pattern set; the arm is never rootless."""

    def test_every_card_owns_the_pattern_files(self) -> None:
        cards = list(_iter_card_dirs())
        # the estate carries real cards — a zero means the walk broke
        self.assertGreater(len(cards), 8,
                           "the card walk found too few cards — "
                           "suspicious")
        for plugin, genre, cdir in cards:
            for fname in ("__init__.py", "card.py", "compose.py",
                          "renderer.py"):
                path = os.path.join(cdir, "py", fname)
                self.assertTrue(
                    os.path.isfile(path),
                    "%s/%s/%s: py/%s missing (THE CARD PATTERN — "
                    "golden base h3-timeline)" % (
                        plugin, genre, os.path.basename(cdir), fname))

    def test_action_cards_are_genre_grouped(self) -> None:
        """action_cards' direct children are GENRES (card dirs sit
        exactly one level below) — the walk's shape, pinned."""
        for plugin in sorted(os.listdir(_ENG_ROOT)):
            aroot = os.path.join(_ENG_ROOT, plugin, "action_cards")
            if not os.path.isdir(aroot):
                continue
            for entry in sorted(os.listdir(aroot)):
                e = os.path.join(aroot, entry)
                if not os.path.isdir(e) or entry.startswith("."):
                    continue
                # a genre dir contains card dirs, never a card.py of
                # its own (that would be an ungrouped card)
                self.assertFalse(
                    os.path.isfile(os.path.join(e, "py", "card.py"))
                    or os.path.isfile(os.path.join(e, "card.py")),
                    "%s/action_cards/%s looks like an UNGROUPED card — "
                    "cards sit at action_cards/<genre>/<card>/"
                    % (plugin, entry))


class TestLaw2BusArity(unittest.TestCase):
    """card_compose speaks exactly (body, model, run_id, graph)."""

    def test_every_compose_module_speaks_the_bus_contract(self) -> None:
        import ast
        checked = 0
        for path in _iter_all_compose_files():
            with open(path, encoding="utf-8") as f:
                tree = ast.parse(f.read())
            for node in ast.walk(tree):
                if (isinstance(node, ast.FunctionDef)
                        and node.name == "card_compose"):
                    args = [a.arg for a in node.args.args]
                    self.assertEqual(
                        args, ["body", "model", "run_id", "graph"],
                        "%s: card_compose arity drift — the bus calls "
                        "(body, model, run_id, graph)" % path)
                    checked += 1
        self.assertGreaterEqual(checked, 5,
                                "found too few card_compose doors — "
                                "the walk broke")


class TestLaw3BusDrive(unittest.TestCase):
    """Every engine's compose door is reachable through the exact
    gateway hop; an empty body refuses CLEANLY (never a crash)."""

    def test_phase1_empty_body_clean_for_every_engine(self) -> None:
        engines = plugins.scan_engines()
        compose_engines = []
        for etype in sorted(engines):
            mod = plugins.load_compose(etype)
            if mod is None or not hasattr(mod, "card_compose"):
                continue
            compose_engines.append(etype)
            try:
                g, extra = plugins.compose(
                    {"params": {}}, _default_model(etype), "",
                    _seed_graph(etype), [etype])
                # a clean return is a pass (a card with no required
                # fields) — the graph must stand as a FlowGraph
                self.assertIsInstance(
                    g, flow_graph.FlowGraph,
                    "%s: bus returned a broken graph" % etype)
            except plugins.ValidationError:
                pass   # the clean refusal — naming the missing param
            except (TypeError, AttributeError, ImportError,
                    ModuleNotFoundError) as e:
                self.fail(
                    "%s: the compose door is BROKEN (the exact "
                    "gateway hop): %s: %s" % (
                        etype, type(e).__name__, e))
        self.assertGreaterEqual(
            len(compose_engines), 5,
            "too few compose doors reached — the bus walk broke "
            "(found %s)" % compose_engines)


def _default_model(engine_type: str) -> str:
    """A model name the dispatcher accepts: the plugin's first model
    row id (the class's card attribute names the card)."""
    engines = plugins.scan_engines()
    ref = engines.get(engine_type)
    if ref is None:
        return engine_type
    models_dir = ref.plugin_root / "models"
    for mpy in sorted(models_dir.glob("*/*/model.py")) \
            if models_dir.is_dir() else []:
        try:
            from melite_models import load_model_py
            cls = load_model_py(str(mpy), engine_type)
            return cls.id
        except Exception:
            continue
    return engine_type


class TestLaw4IdentityGates(unittest.TestCase):
    """Every serving card declares an ability with a family route."""

    def test_serving_cards_declare_ability(self) -> None:
        import catalog
        d = catalog.scan_catalog(REPO)
        cards = d.get("cards", [])
        self.assertGreater(len(cards), 8)
        for row in cards:
            # a serving card boards models — families derives from
            # models= at class build; a card with no families can
            # never serve a capability tile
            self.assertTrue(
                row.get("families"),
                "card %r serves (api=True) but boards no models — "
                "no family route, no capability tile"
                % row.get("id"))


class TestLaw5NoFossils(unittest.TestCase):
    """card.yaml and card_knobs.yaml are extinct tree-wide."""

    def test_no_card_yaml(self) -> None:
        hits = []
        for root, _dirs, files in os.walk(os.path.join(REPO, "plugins")):
            if "__pycache__" in root or "vendor" in root \
                    or "node_modules" in root:
                continue
            for f in files:
                if f == "card.yaml":
                    hits.append(os.path.join(root, f))
        self.assertEqual(hits, [],
                         "card.yaml is EXTINCT — identity lives on the "
                         "ActionCard class (two SSOTs is zero SSOTs)")

    def test_no_card_knobs_yaml(self) -> None:
        hits = []
        for root, _dirs, files in os.walk(os.path.join(REPO, "plugins")):
            if "__pycache__" in root or "vendor" in root \
                    or "node_modules" in root:
                continue
            for f in files:
                if f == "card_knobs.yaml":
                    hits.append(os.path.join(root, f))
        self.assertEqual(hits, [],
                         "card_knobs.yaml is EXTINCT — knob rows live "
                         "on the model class (card_knobs tuples)")


class TestLaw6CategoryLaw(unittest.TestCase):
    """A markerless depth-2 dir under plugins/engines/ is a category
    container: EVERY child carries plugin markers (the shared walk's
    assumption — a stray markerless child would vanish silently)."""

    def test_markerless_dirs_are_pure_categories(self) -> None:
        for entry in sorted(os.listdir(_ENG_ROOT)):
            e = os.path.join(_ENG_ROOT, entry)
            if not os.path.isdir(e) or entry.startswith("."):
                continue
            has_marker = any(
                os.path.exists(os.path.join(e, m))
                for m in ("plugin.py", "plugin.yaml", "engines"))
            if has_marker:
                continue
            # category container: every child must be a plugin
            children = [c for c in sorted(os.listdir(e))
                        if not c.startswith(".")
                        and os.path.isdir(os.path.join(e, c))]
            self.assertTrue(children,
                            "%s is markerless AND empty — delete it" % e)
            for child in children:
                c = os.path.join(e, child)
                child_marker = any(
                    os.path.exists(os.path.join(c, m))
                    for m in ("plugin.py", "plugin.yaml", "engines"))
                self.assertTrue(
                    child_marker,
                    "%s sits in category %s with NO plugin markers — "
                    "the discovery walk will never find it"
                    % (child, entry))


class TestLaw7BoundaryLaw(unittest.TestCase):
    """Plugin trees import no sibling plugin (by package alias) and
    no gateway core. The AST import scan — import-linter's job,
    wall-shaped (PLUGIN ARCHITECTURE LAW: the bus is the only door
    between a plugin and the gateway)."""

    def _py_files(self) -> Iterator[tuple[str, str]]:
        for plugin in sorted(os.listdir(_ENG_ROOT)):
            proot = os.path.join(_ENG_ROOT, plugin)
            if not os.path.isdir(proot) or plugin.startswith("."):
                continue
            for root, dirs, files in os.walk(proot):
                dirs[:] = [d for d in dirs if d not in (
                    "__pycache__", "vendor", "node_modules", "ui")]
                for f in files:
                    if f.endswith(".py"):
                        yield plugin, os.path.join(root, f)

    def _alias_map(self) -> dict[str, set[str]]:
        """plugin → set of package aliases its trees declare."""
        import re
        pat = re.compile(r'_PKG_ALIAS\s*=\s*["\']([\w.]+)["\']')
        out = {}
        for plugin, path in self._py_files():
            with open(path, encoding="utf-8") as f:
                for m in pat.finditer(f.read()):
                    out.setdefault(plugin, set()).add(m.group(1))
        return out

    def test_no_sibling_plugin_imports(self) -> None:
        import ast
        aliases = self._alias_map()
        offenders = []
        for plugin, path in self._py_files():
            foreign = set()
            for other, alias_set in aliases.items():
                if other != plugin:
                    foreign |= alias_set
            with open(path, encoding="utf-8") as f:
                try:
                    tree = ast.parse(f.read())
                except SyntaxError:
                    offenders.append("%s: unparseable" % path)
                    continue
            for node in ast.walk(tree):
                names = []
                if isinstance(node, ast.Import):
                    names = [a.name for a in node.names]
                elif isinstance(node, ast.ImportFrom) and node.module:
                    names = [node.module]
                for name in names:
                    root = name.split(".")[0]
                    if root in foreign:
                        offenders.append(
                            "%s imports %r — a SIBLING plugin's package "
                            "(%s tree)" % (path, name, root))
        self.assertEqual(offenders, [])

    def test_no_gateway_imports_in_plugin_trees(self) -> None:
        import ast
        offenders = []
        for plugin, path in self._py_files():
            with open(path, encoding="utf-8") as f:
                try:
                    tree = ast.parse(f.read())
                except SyntaxError:
                    offenders.append("%s: unparseable" % path)
                    continue
            for node in ast.walk(tree):
                if isinstance(node, ast.Import) and any(
                        a.name == "gateway" for a in node.names):
                    offenders.append(
                        "%s imports gateway — plugins reach the core "
                        "through the BUS (plugins.compose), never by "
                        "import" % path)
                if isinstance(node, ast.ImportFrom) \
                        and node.module == "gateway":
                    offenders.append(
                        "%s imports from gateway — plugins reach the "
                        "core through the BUS, never by import" % path)
        self.assertEqual(offenders, [])


class TestLaw8CleanImport(unittest.TestCase):
    """Every compose module and card package imports CLEAN in an
    isolated subprocess — side-effect drift (their subprocess
    isolation pattern): no crash, no stderr noise, exit 0."""

    TIMEOUT = 60

    def _import_targets(self) -> list[tuple[str, str, bool]]:
        """(label, path, is_package) for every door the bus loads."""
        targets = []
        for path in _iter_all_compose_files():
            targets.append((path.replace(_ENG_ROOT + os.sep, ""),
                            path, True))
        for plugin, genre, cdir in _iter_card_dirs():
            init = os.path.join(cdir, "py", "__init__.py")
            targets.append(("%s/%s/py" % (plugin,
                                          os.path.basename(cdir)),
                            init, True))
        return targets

    def test_every_door_imports_clean_in_isolation(self) -> None:
        import subprocess
        # the REAL loader recipe for compose packages (whatever
        # machinery ref.load uses — the probe must not reinvent it)
        loader_snippet = (
            "import plugins\n"
            "for etype in sorted(plugins.scan_engines()):\n"
            "    plugins.load_compose(etype)\n")
        # the card packages: file probe (they are comment-light
        # __init__ packages; the dispatcher recipe loads the rest)
        card_snippet = (
            "import importlib.util, sys, os\n"
            "path = sys.argv[1]\n"
            "spec = importlib.util.spec_from_file_location("
            "'wall_probe', path, submodule_search_locations=["
            "os.path.dirname(path)])\n"
            "mod = importlib.util.module_from_spec(spec)\n"
            "sys.modules['wall_probe'] = mod\n"
            "spec.loader.exec_module(mod)\n")
        env = dict(os.environ)
        env["PYTHONPATH"] = os.path.join(REPO, "py")
        failures = []
        res = subprocess.run(
            [sys.executable, "-c", loader_snippet],
            capture_output=True, text=True, cwd=REPO, env=env,
            timeout=self.TIMEOUT)
        if res.returncode != 0 or res.stderr.strip():
            failures.append(
                "compose loaders: DIRTY (rc=%d) %s"
                % (res.returncode,
                   res.stderr.strip().splitlines()[-1][:160]
                   if res.stderr.strip() else ""))
        for label, path, _pkg in self._import_targets():
            if "compose" in os.path.relpath(path, _ENG_ROOT).split(os.sep):
                continue   # covered by the loader probe above
            res = subprocess.run(
                [sys.executable, "-c", card_snippet, path],
                capture_output=True, text=True, cwd=REPO, env=env,
                timeout=self.TIMEOUT)
            if res.returncode != 0 or res.stderr.strip():
                failures.append(
                    "%s: import is DIRTY (rc=%d) %s"
                    % (label, res.returncode,
                       res.stderr.strip().splitlines()[-1][:160]
                       if res.stderr.strip() else ""))
        self.assertEqual(failures, [])


class TestLaw9ManifestLaw(unittest.TestCase):
    """Every plugin.py declares the structural manifest: a Plugin
    class with id (non-empty str), engines (non-empty tuple of str),
    genres (tuple of str), webui (dict) — manifest drift pinned
    statically (the loader reads these attrs; a drifted shape serves
    nothing)."""

    def test_every_plugin_py_declares_the_manifest(self) -> None:
        import ast
        checked = 0
        for plugin in sorted(os.listdir(_ENG_ROOT)):
            proot = os.path.join(_ENG_ROOT, plugin)
            if not os.path.isdir(proot) or plugin.startswith("."):
                continue
            # direct plugin + category children
            candidates = [proot]
            for entry in sorted(os.listdir(proot)):
                c = os.path.join(proot, entry)
                if os.path.isdir(c) and not entry.startswith("."):
                    candidates.append(c)
            for cdir in candidates:
                ppy = os.path.join(cdir, "plugin.py")
                if not os.path.isfile(ppy):
                    continue
                with open(ppy, encoding="utf-8") as f:
                    tree = ast.parse(f.read())
                cls = None
                for node in tree.body:
                    if isinstance(node, ast.ClassDef) \
                            and node.name == "Plugin":
                        cls = node
                self.assertIsNotNone(
                    cls, "%s: no Plugin class" % ppy)
                attrs = {}
                for node in cls.body:
                    if isinstance(node, ast.Assign) and isinstance(
                            node.targets[0], ast.Name):
                        try:
                            attrs[node.targets[0].id] = ast.literal_eval(
                                node.value)
                        except (ValueError, SyntaxError):
                            attrs[node.targets[0].id] = None
                self.assertTrue(
                    isinstance(attrs.get("id"), str)
                    and attrs["id"],
                    "%s: Plugin.id must be a non-empty str" % ppy)
                self.assertTrue(
                    isinstance(attrs.get("engines"), tuple)
                    and attrs["engines"]
                    and all(isinstance(e, str) for e in
                            attrs["engines"]),
                    "%s: Plugin.engines must be a non-empty tuple of "
                    "str" % ppy)
                self.assertTrue(
                    isinstance(attrs.get("genres"), tuple)
                    and all(isinstance(g, str) for g in
                            attrs["genres"]),
                    "%s: Plugin.genres must be a tuple of str" % ppy)
                checked += 1
        self.assertGreaterEqual(
            checked, 5, "found too few plugin.py manifests — the "
            "walk broke")


class TestLaw10VendorRegistration(unittest.TestCase):
    """Every gitlink under plugins/ is registered in .gitmodules at
    its CURRENT path, and every .gitmodules path under plugins/ is a
    live gitlink. A plugin move that orphans a pin (the audio-cpp
    move class) barks here — VENDOR LAW: submodule per engine,
    registered where it sits."""

    def _gitlinks(self) -> set[str]:
        import subprocess
        res = subprocess.run(
            ["git", "ls-files", "-s", "plugins/"],
            capture_output=True, text=True, cwd=REPO)
        self.assertEqual(res.returncode, 0, "git ls-files failed")
        return {parts[3] for parts in
                (line.split() for line in res.stdout.splitlines())
                if parts and parts[0] == "160000"}

    def _module_paths(self) -> set[str]:
        import configparser
        # strict=False: git itself tolerates duplicate keys in
        # .gitmodules (last wins) — the wall parses like git parses
        cp = configparser.ConfigParser(strict=False)
        cp.read(os.path.join(REPO, ".gitmodules"))
        return {cp.get(s, "path") for s in cp.sections()
                if cp.has_option(s, "path")}

    def test_gitlinks_and_gitmodules_agree(self) -> None:
        gitlinks = self._gitlinks()
        declared = self._module_paths()
        self.assertTrue(gitlinks, "no submodules under plugins/ — "
                        "the vendor law ships pins; the walk broke")
        unregistered = {g for g in gitlinks
                        if g not in declared}
        self.assertEqual(
            sorted(unregistered), [],
            "gitlink(s) with NO .gitmodules section — a moved or "
            "hand-added vendor pin the clone cannot materialize: %s"
            % sorted(unregistered))
        orphaned = {d for d in declared
                    if d.startswith("plugins/") and d not in gitlinks}
        self.assertEqual(
            sorted(orphaned), [],
            ".gitmodules section(s) pointing at NO live gitlink — "
            "the plugin moved and the pin stayed behind: %s"
            % sorted(orphaned))


class TestLaw11EngineABI(unittest.TestCase):
    """Every execute door speaks the engine ABI: async, first four
    positional params (node, run_dir, inputs, stop_event), report
    optional. Every unload door (ENGINE TRANSITION ABI — boundary
    unloads await it) is async. AST-pinned across the estate."""

    def _abi_files(self) -> Iterator[str]:
        for plugin in sorted(os.listdir(_ENG_ROOT)):
            proot = os.path.join(_ENG_ROOT, plugin)
            if not os.path.isdir(proot) or plugin.startswith("."):
                continue
            for root, dirs, files in os.walk(proot):
                dirs[:] = [d for d in dirs if d not in (
                    "__pycache__", "vendor", "node_modules", "ui")]
                for f in files:
                    if f.endswith(".py"):
                        yield os.path.join(root, f)

    def test_execute_and_unload_speak_the_abi(self) -> None:
        import ast
        offenders = []
        seen_execute = 0
        seen_unload = 0
        for path in self._abi_files():
            with open(path, encoding="utf-8") as f:
                try:
                    tree = ast.parse(f.read())
                except SyntaxError:
                    continue
            for node in ast.walk(tree):
                if not isinstance(node, (ast.FunctionDef,
                                         ast.AsyncFunctionDef)):
                    continue
                if node.name == "execute":
                    seen_execute += 1
                    args = [a.arg for a in node.args.args]
                    if not isinstance(node, ast.AsyncFunctionDef):
                        offenders.append(
                            "%s:%d execute is NOT async — the gateway "
                            "awaits it" % (path, node.lineno))
                    if args[:4] != ["node", "run_dir", "inputs",
                                    "stop_event"]:
                        offenders.append(
                            "%s:%d execute arity drift — expected "
                            "(node, run_dir, inputs, stop_event, "
                            "report=None), got %s"
                            % (path, node.lineno, args))
                elif node.name == "unload":
                    seen_unload += 1
                    if not isinstance(node, ast.AsyncFunctionDef):
                        offenders.append(
                            "%s:%d unload is NOT async — the engine "
                            "boundary awaits it" % (path, node.lineno))
        self.assertEqual(offenders, [])
        self.assertGreaterEqual(seen_execute, 4,
                                "too few execute doors — the walk broke")
        self.assertGreaterEqual(seen_unload, 1,
                                "no unload door found — the ENGINE "
                                "TRANSITION ABI vanished?")


class TestLaw12ArgvSSOT(unittest.TestCase):
    """Under the cpp category, CLI flag literals live ONLY in
    renderer.py files — PYTHON SHAPE rung 8: the render truth has
    one home. An execute that hand-builds argv beside the renderer
    is two SSOTs, which is zero SSOTs.

    2026-09-06 (kernel-manifest stroke, landed): manifest.py argv
    rows are the DECLARED reproduction of the renderer truth —
    pinned byte-identical by tests/unit/runtime/test_kernel_manifest*
    (parity wall, design record docs/design/kernel-manifest.md).
    A manifest.py that declares a KernelManifest is the argv home
    for its kernel, not a rogue second SSOT; anything else carrying
    flag literals outside renderer.py still refuses."""

    def test_flag_literals_only_in_renderers(self) -> None:
        import ast
        offenders = []
        cpp_root = os.path.join(_ENG_ROOT, "cpp")
        scanned = 0
        for root, dirs, files in os.walk(cpp_root):
            dirs[:] = [d for d in dirs if d not in (
                "__pycache__", "vendor", "node_modules", "ui")]
            for f in files:
                if not f.endswith(".py"):
                    continue
                path = os.path.join(root, f)
                with open(path, encoding="utf-8") as fh:
                    src = fh.read()
                if os.path.basename(path) == "manifest.py" \
                        and "KernelManifest(" in src:
                    # the declared kernel-argv home (see class doc);
                    # its parity with renderer.build_argv is pinned
                    # by the kernel-manifest walls
                    continue
                scanned += 1
                try:
                    tree = ast.parse(src)
                except SyntaxError:
                    continue
                for node in ast.walk(tree):
                    if isinstance(node, ast.Constant) \
                            and isinstance(node.value, str) \
                            and node.value.startswith("--"):
                        base = os.path.basename(path)
                        if base != "renderer.py":
                            offenders.append(
                                "%s:%d CLI flag %r outside renderer.py "
                                "— argv truth has ONE home (rung 8)"
                                % (path, node.lineno, node.value))
        self.assertGreater(scanned, 20,
                           "too few cpp files scanned — walk broke")
        self.assertEqual(offenders, [])


class TestRenderRoadUniformity(unittest.TestCase):
    """M3 (pattern-uniformity audit remainder): every comfyui card
    renderer rides the SAME co_script rail (render_kit kit import +
    renderers.register) — no arm invents its own emission path; the
    two-level plugin arms (cpp/*, node/*) speak the ONE compose
    contract `compose(body, model, run_id) -> (rc, graph, extra,
    error)` for their own engines. Contract-uniform, not drift."""

    def test_every_comfyui_renderer_rides_the_rail(self) -> None:
        base = os.path.join(REPO, "plugins", "engines", "comfyui",
                            "action_cards")
        checked = 0
        for genre in sorted(os.listdir(base)):
            gdir = os.path.join(base, genre)
            if not os.path.isdir(gdir):
                continue
            for card in sorted(os.listdir(gdir)):
                r = os.path.join(gdir, card, "py", "renderer.py")
                if not os.path.isfile(r):
                    continue
                with open(r, encoding="utf-8") as f:
                    src = f.read()
                self.assertIn(
                    "from co_script.render_kit import", src,
                    "%s/%s: renderer does not ride the co_script "
                    "render_kit rail (M3: one emission road, "
                    "h3-timeline's n-window lane included — its "
                    "frames ride the rail too, see "
                    "docs/cards/n-window-law.md)" % (genre, card))
                self.assertIn(
                    "co_script.renderers", src,
                    "%s/%s: renderer never registers on the "
                    "co_script rail" % (genre, card))
                checked += 1
        self.assertGreaterEqual(checked, 18,
                                "renderer walk broke (found %d)" % checked)

    def test_two_level_arms_speak_the_compose_contract(self) -> None:
        import ast
        arms = []
        # two shapes: engines/<plugin>/action_cards (comfyui — owned
        # by the bus-contract leg above) and engines/<family>/<plugin>/
        # action_cards (the cpp/* + node/* two-level arms)
        cands = sorted(
            glob.glob(os.path.join(REPO, "plugins", "engines", "*",
                                   "*", "action_cards", "*", "*", "py",
                                   "compose.py")))
        for cpy in cands:
            parts = cpy.split(os.sep)
            engine = parts[parts.index("engines") + 2]  # <family>/<plugin>
            with open(cpy, encoding="utf-8") as f:
                tree = ast.parse(f.read())
            fn = next(
                (n for n in ast.walk(tree)
                 if isinstance(n, ast.FunctionDef)
                 and n.name == "compose"), None)
            self.assertIsNotNone(
                fn, "%s: two-level arm has no compose door" % cpy)
            self.assertEqual(
                [a.arg for a in fn.args.args],
                ["body", "model", "run_id"],
                "%s: compose arity drift — the contract is "
                "(body, model, run_id) -> (rc, graph, extra, "
                "error)" % cpy)
            arms.append(engine)
        self.assertGreaterEqual(len(arms), 4,
                                "two-level arm walk broke (found %s)"
                                % arms)


class TestDefaultsBlanket(unittest.TestCase):
    """The defaults blanket (operator order, 2026-09-07: every card
    carries defaults): every VALUE-shaped field (Number, Slider,
    Seed, Boolean, Select, Textarea, Text) either requires its value
    (required=True) or states an explicit default — no silent
    None-limbo. Slot-shaped fields (File/Image/Audio/Video/Mask/
    Loras/ControlNet) are EXEMPT: empty slot is their semantic (the
    optional-slots law, default=[] on the family contract)."""

    SLOT_FIELDS = {"File", "Image", "Audio", "Video", "Mask",
                   "Loras", "ControlNet", "ImageList"}

    def test_value_fields_never_limbo(self) -> None:
        import ast
        from melite_cards.dsl import ActionCard as _AC
        base = os.path.join(REPO, "py", "melite_cards", "dsl.py")
        with open(base, encoding="utf-8") as f:
            tree = ast.parse(f.read())
        field_ctors = {
            n.name for n in ast.walk(tree)
            if isinstance(n, ast.ClassDef) and n.name in {
                "Number", "Slider", "Seed", "Boolean", "Select",
                "Textarea", "Text"}}
        self.assertTrue(field_ctors, "dsl field walk broke")
        offenders = []
        cards = 0
        cbase = os.path.join(REPO, "plugins", "engines")
        # both shapes: engines/<plugin>/action_cards and
        # engines/<family>/<plugin>/action_cards
        card_pys = sorted(set(
            glob.glob(os.path.join(cbase, "*", "action_cards", "*",
                                   "*", "py", "card.py")))
            | set(glob.glob(os.path.join(cbase, "*", "*", "action_cards",
                                         "*", "*", "py", "card.py"))))
        for cpy in card_pys:
            cards += 1
            with open(cpy, encoding="utf-8") as f:
                tree = ast.parse(f.read())
            for node in ast.walk(tree):
                if not (isinstance(node, ast.Call)
                        and isinstance(node.func, ast.Name)
                        and node.func.id in field_ctors):
                    continue
                kw = {k.arg: k.value for k in node.keywords}
                req = kw.get("required")
                dflt = kw.get("default")
                explicit_req = (req is not None
                                and getattr(req, "value", False) is True)
                explicit_dflt = dflt is not None
                if not (explicit_req or explicit_dflt):
                    offenders.append(
                        "%s:%d %s field (no required, no default)"
                        % (cpy, node.lineno, node.func.id))
        self.assertGreaterEqual(cards, 20, "card walk broke")
        self.assertEqual(offenders, [])


if __name__ == "__main__":
    unittest.main()

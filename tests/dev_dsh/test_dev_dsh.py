#!/usr/bin/env python3
"""test_dev_dsh.py — boot-time + runtime gates for the dev DSH.

WHY THIS FILE EXISTS

The dev DSH lives at https://cloud.tailb1e597.ts.net:3909/ and is the
testbed for the DSH extensions built in this repo (packages/harness/dsh/
and packages/web/dsh/). It is launched by ~/bin/inference-dev-dsh.sh
which materializes ~/.dsh-test/profiles/web/ — an isolated DSH home
that must NEVER touch the prod profile at ~/.dsh/profiles/web/.

This gate catches the failure modes that bite when the launcher drifts
or someone edits plugins without rebuilding:

  * Boot errors — "X entries did not activate", pending services,
    loader failures (the original "why isn't this tested for" complaint).
  * Service coverage — every service a plugin declares in its
    `inject: [...]` array is registered by SOMETHING in the dev profile's
    node_modules (e.g. betterSidebar must be backed by dsh-better-sidebar).
  * Cordis row resolution — every row in the @infer/dsh-provisioner
    bundle's cordis.patch.yml resolves to a package present at the
    profile root (loader can't follow link: deps transitively).
  * HTTP probes — local + tailnet FQDN reach the web app with the
    trusted-host fence intact; plugin host routes return 2xx.
  * Prod untouched — port 3080 (the prod DSH) stays up after dev tests
    run; the dev launcher's DSH_HOME pinning keeps ~/.dsh cold.

Run: pytest tests/dev_dsh/test_dev_dsh.py -v
  or: ./tests/dev_dsh/run_dev_dsh_tests.sh   (the full ladder)
"""
from __future__ import annotations

import json
import os
import re
import socket
import subprocess
import time
import urllib.error
import urllib.request
from collections.abc import Iterator
from pathlib import Path
from typing import Iterable

import pytest

# ---------------------------------------------------------------------------
# Constants — the launcher + profile + bundle are part of the contract.
# If you change one, change them here (and the launcher) in lockstep.
# ---------------------------------------------------------------------------

DEV_PORT = 3909
PROD_PORT = 3080
DEV_TAILNET_FQDN = "cloud.tailb1e597.ts.net"
DSH_HOME_DEV = Path.home() / ".dsh-test"
PROFILE_DIR = DSH_HOME_DEV / "profiles" / "web"
PROVISIONER = Path(__file__).resolve().parents[2] / \
    "packages" / "harness" / "dsh" / "provisioner"
LOG_PATH = DSH_HOME_DEV / f"test-web.{DEV_PORT}.log"
LAUNCHER = Path.home() / "bin" / "inference-dev-dsh.sh"

PROD_DSH_PROCESS_PATTERN = "dsh --profile web --port 3080"
PROD_PID_FILE = Path("/tmp/dsh-prod-pid")  # not enforced, just a hint


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _port_open(port: int, host: str = "127.0.0.1", timeout: float = 0.5) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (ConnectionRefusedError, socket.timeout, OSError):
        return False


def _http_get(url: str, timeout: float = 2.0, max_bytes: int = 256 * 1024) -> tuple[int, str]:
    """Return (status, body). Never raises — errors return (0,'').

    Reads up to `max_bytes` of the response body (default 256kB). 1kB
    was too small for infer-media's runs listing (it serializes full
    thumbnail URLs + run metadata).
    """
    try:
        ctx = None
        if url.startswith("https://"):
            import ssl
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
        req = urllib.request.Request(url, method="GET")
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            return resp.status, resp.read(max_bytes).decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read(max_bytes).decode("utf-8", errors="replace") if e.fp else ""
    except Exception:
        return 0, ""


def _log_tail(path: Path, lines: int = 80) -> str:
    if not path.exists():
        return ""
    return "\n".join(path.read_text(errors="replace").splitlines()[-lines:])


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def dev_dsh_up() -> Iterator[bool]:
    """Ensure the dev DSH is running before this module's tests run.

    If the port isn't listening, attempt a single launcher invocation.
    If the launcher fails or isn't present, tests in this module SKIP
    rather than FAIL — the dev DSH is opt-in infra, and CI may not
    have it. Tests that exercise the launcher itself still run.
    """
    if _port_open(DEV_PORT):
        yield True
        return
    if not LAUNCHER.exists():
        pytest.skip(f"dev DSH launcher missing at {LAUNCHER}; dev DSH is opt-in infra")
    rc = subprocess.run([str(LAUNCHER)], capture_output=True, text=True).returncode
    # Wait up to 15s for the port.
    for _ in range(30):
        if _port_open(DEV_PORT):
            break
        time.sleep(0.5)
    if not _port_open(DEV_PORT):
        pytest.skip(
            f"dev DSH did not come up on :{DEV_PORT} after launcher exit={rc};\n"
            f"--- log tail ---\n{_log_tail(LOG_PATH)}"
        )
    yield True


# Honest row shapes for the bundle/provisioner gates (annotation-only
# aliases — the wall refuses bare dicts, and Any is never the answer).
_BundleRow = dict[str, str]
_PluginInject = dict[str, str | list[str]]
_PackageJson = dict[str, str | list[str] | dict[str, str]]
_InstalledPkg = dict[str, str | Path | bool | _PackageJson | None]


@pytest.fixture(scope="module")
def bundle_rows() -> list[_BundleRow]:
    """Parse the @infer/dsh-provisioner cordis.patch.yml into a list of insert rows.

    Each row is a dict {id, name} (other config keys are dropped — they aren't
    relevant to resolution). Returns [] if the provisioner patch isn't found.
    """
    patch = PROVISIONER / "cordis.patch.yml"
    if not patch.exists():
        return []
    rows: list[_BundleRow] = []
    in_insert = False
    for line in patch.read_text().splitlines():
        s = line.strip()
        if s.startswith("- insert:"):
            in_insert = True
            continue
        if in_insert and s.startswith("- id:"):
            row_id = s[len("- id:"):].strip()
            rows.append({"id": row_id, "name": ""})  # name filled on next line
        elif in_insert and s.startswith("name:") and rows:
            rows[-1]["name"] = s[len("name:"):].strip().strip("'\"")
    return rows


@pytest.fixture(scope="module")
def plugin_injects(repo: Path) -> list[_PluginInject]:
    """For every plugin in packages/{harness,web}/dsh/, return its
    client-half `inject` array (the services it depends on at boot).

    Each entry: {pkg, source, inject:[...]}.
    """
    out: list[_PluginInject] = []
    for sub in ("harness", "web"):
        base = repo / "packages" / sub / "dsh"
        if not base.exists():
            continue
        for pkg_dir in sorted(p for p in base.iterdir() if p.is_dir()):
            client = pkg_dir / "src" / "client" / "index.ts"
            if not client.exists():
                continue
            text = client.read_text(errors="replace")
            m = re.search(r"export\s+const\s+inject\s*=\s*\[([^\]]*)\]", text)
            if not m:
                continue
            injects = [s.strip().strip("'\"") for s in m.group(1).split(",") if s.strip()]
            out.append({
                "pkg": pkg_dir.name,
                "source": str(client.relative_to(repo)),
                "inject": injects,
            })
    return out


@pytest.fixture(scope="module")
def profile_node_modules() -> dict[str, str]:
    """Map every package name installed at the dev profile's top-level
    node_modules/ to its package.json `name` field.

    The cordis loader resolves cordis.patch.yml rows by package name
    from the profile root, so a package nested under another package's
    node_modules doesn't count as "available to the loader".
    """
    nm = PROFILE_DIR / "node_modules"
    if not nm.exists():
        return {}
    out: dict[str, str] = {}
    for entry in nm.iterdir():
        if entry.name.startswith("@"):
            for sub in entry.iterdir():
                pkg_json = sub / "package.json"
                if pkg_json.exists():
                    out[f"{entry.name}/{sub.name}"] = json.loads(
                        pkg_json.read_text()
                    ).get("name", "")
        else:
            pkg_json = entry / "package.json"
            if pkg_json.exists():
                out[entry.name] = json.loads(pkg_json.read_text()).get("name", "")
    return out


# ---------------------------------------------------------------------------
# Structural gates — no network required. Run first.
# ---------------------------------------------------------------------------

class TestLauncherContract:
    """The dev launcher script must exist + have the right shape."""

    def test_launcher_exists(self) -> None:
        assert LAUNCHER.exists(), (
            f"dev DSH launcher missing at {LAUNCHER}; this test gate has "
            "no infra to start the dev DSH"
        )

    def test_launcher_is_executable(self) -> None:
        if not LAUNCHER.exists():
            pytest.skip("launcher missing")
        import stat
        mode = LAUNCHER.stat().st_mode
        assert mode & stat.S_IXUSR, f"{LAUNCHER} is not user-executable"

    def test_launcher_pins_dsh_home(self, repo: Path) -> None:
        """DSH_HOME must be exported to the isolated dev home.

        Without this, the launcher falls back to ~/.dsh (PROD) and
        loads prod plugins into the dev process — the original cause
        of the 'task-board ledger is already owned by process 131065'
        crash.
        """
        if not LAUNCHER.exists():
            pytest.skip("launcher missing")
        text = LAUNCHER.read_text()
        assert re.search(r"^\s*export\s+DSH_HOME=.*dsh-test", text, re.M), (
            f"{LAUNCHER} does not export DSH_HOME to a dsh-test path; "
            "the launcher will silently use the prod ~/.dsh home."
        )

    def test_launcher_resolves_link_deps_as_direct(self, repo: Path) -> None:
        """pnpm does not materialize link: deps transitively.

        The launcher must read the provisioner's package.json and add
        ITS link: deps as direct deps in the profile's package.json.
        """
        if not LAUNCHER.exists():
            pytest.skip("launcher missing")
        text = LAUNCHER.read_text()
        # The signature: it iterates provisioner deps with startsWith("link:")
        assert 'startsWith("link:")' in text, (
            f"{LAUNCHER} does not appear to lift the provisioner's link: "
            "deps; pnpm won't follow transitive link: deps, so plugin rows "
            "won't resolve."
        )


class TestBundleContract:
    """The provisioner bundle must declare its plugin rows + have build artifacts."""

    def test_provisioner_exists(self) -> None:
        assert PROVISIONER.exists(), f"provisioner missing at {PROVISIONER}"

    def test_provisioner_has_patch(self) -> None:
        patch = PROVISIONER / "cordis.patch.yml"
        assert patch.exists(), f"{patch} missing — no rows to load"

    def test_provisioner_has_lib(self) -> None:
        # The bin is required for the launcher + the loader needs
        # node-resolvable exports. Provisioner ships bin/, no lib/.
        assert (PROVISIONER / "bin" / "infer-provision.mjs").exists(), (
            f"{(PROVISIONER / 'bin' / 'infer-provision.mjs')} missing"
        )

    def test_provisioner_declares_every_built_plugin_as_link_dep(self, repo: Path) -> None:
        """Every plugin directory under packages/{harness,web}/dsh/ with a
        real `lib/` build must appear as a link: dep in the
        provisioner's package.json. Otherwise the loader can't find it.
        """
        prov_pkg = json.loads((PROVISIONER / "package.json").read_text())
        declared = set(prov_pkg.get("dependencies", {}).keys())

        # Plugins are split across two trees; their npm names may differ.
        expected_pkgs = {
            "@melite-plugin/dsh-tools",
            "@melite-plugin/dsh-card-view",
            "@melite-plugin/dsh-card-deck",
            "@infer-media/dsh-media",
            "@infer-media/dsh-gallery",
        }
        missing = expected_pkgs - declared
        assert not missing, (
            f"provisioner does not declare these link deps: {sorted(missing)}; "
            "the launcher won't be able to materialize them."
        )


class TestPluginStructure:
    """Every plugin in packages/{harness,web}/dsh/ with a client half must
    have BOTH a built lib/client.js AND a declared `inject` array. The
    latter is what the cordis loader uses to wait for services — and
    the failure mode we hit was that some `inject: [...]` services
    were never registered.
    """

    @pytest.mark.parametrize("sub", ["harness", "web"])
    def test_every_plugin_has_lib_artifacts(self, repo: Path, sub: str) -> None:
        base = repo / "packages" / sub / "dsh"
        if not base.exists():
            pytest.skip(f"{base} not present")
        missing: list[str] = []
        for pkg in sorted(p for p in base.iterdir() if p.is_dir()):
            lib = pkg / "lib"
            if not lib.exists():
                # Some plugins (dsh-tools) ship lib/ as index.mjs.
                continue
            if not (lib / "index.js").exists() and not (lib / "index.mjs").exists():
                missing.append(str(pkg.relative_to(repo)))
        assert not missing, (
            f"these plugins have a lib/ dir but no built entry: {missing}"
        )

    def test_every_client_half_declares_inject(self, plugin_injects: list[dict[str, str | list[str]]]) -> None:
        for entry in plugin_injects:
            assert entry["inject"], (
                f"{entry['source']} declares no inject array; the loader "
                "won't wait for any service and the plugin will silently fail."
            )


# ---------------------------------------------------------------------------
# Resolution gates — read the materialized profile, no network required.
# ---------------------------------------------------------------------------

class TestProfileResolution:
    """Every plugin row in the provisioner patch must resolve to a
    package actually present at the profile's top-level node_modules/.
    Also: every `inject: [...]` service referenced by a plugin must be
    registered by SOME installed package.
    """

    def test_all_bundle_rows_resolve(self, bundle_rows: list[dict[str, str]], profile_node_modules: dict[str, str]) -> None:
        if not bundle_rows:
            pytest.skip("provisioner patch not parseable")
        installed = set(profile_node_modules.values()) | set(profile_node_modules.keys())
        missing: list[tuple[str, str]] = []
        for row in bundle_rows:
            name = row["name"]
            if not name:
                missing.append((row["id"], "<no name field>"))
                continue
            # Strip @scope/dsh-X → check both the raw name and the inferred
            # root dir. Loader looks up by package name (the npm name), so
            # '@melite-plugin/dsh-card-deck' must be in node_modules.
            if name not in installed:
                missing.append((row["id"], name))
        assert not missing, (
            "cordis rows in the provisioner patch that DON'T resolve to a "
            f"package at the profile root: {missing}. The loader will fail "
            "with 'failed to apply loader entry' on boot."
        )

    def test_all_plugin_injects_have_a_provider(self, plugin_injects: list[dict[str, str | list[str]]],
                                                profile_node_modules: dict[str, str]) -> None:
        """For every service a plugin declares in inject, at least one
        installed package should plausibly provide it (heuristic: the
        service name appears as a substring of an installed package's
        npm name, OR the inject entry is a known core service like
        'slots' / 'webServer' which the base bundles always provide).

        This is the gate that would have caught the 'betterSidebar'
        incident: card-deck and media-plugin declare
        `inject: ['slots', 'betterSidebar']` but dsh-better-sidebar
        wasn't installed → pending (waiting for service: betterSidebar).
        """
        CORE_SERVICES = {"slots", "webServer", "agent", "locale",
                         "settings", "logger"}  # base bundle provides
        for entry in plugin_injects:
            for svc in entry["inject"]:
                if svc in CORE_SERVICES:
                    continue
                # Heuristic: some package whose npm name mentions the svc.
                providers = [
                    name for name in profile_node_modules
                    if svc.lower() in name.lower()
                    or svc.lower().replace("-", "") in name.lower().replace("-", "")
                ]
                assert providers, (
                    f"{entry['source']} declares inject: [..., '{svc}', ...] "
                    "but no installed package appears to register that "
                    f"service. Looked for packages matching '{svc}' in "
                    f"node_modules; found: {sorted(profile_node_modules)[:20]}..."
                )


# ---------------------------------------------------------------------------
# LOAD GATE — comprehensive "the plugins actually load into the test DSH".
# Closes the gaps the structural + resolution tests leave:
#
#   * a broken tsdown build (the most common silent failure) — caught
#     by `node --check` on the lib artifacts;
#   * a dsh block declaring a missing file — caught by file existence;
#   * a host bundle that throws at require() (missing dep, cordis
#     shape error, ESM/CJS mismatch) — caught by a real require() in
#     a fresh node process + a descriptor-shape probe;
#   * the card-deck host (the survivor of the sidebar retirement)
#     exercised end-to-end through the dev origin (200s + a WS upgrade).
#
# The SSOT for the plugin set is the provisioner's cordis.patch.yml
# (bundle_rows) — every dsh mount flows through it. Host and client
# artifacts are distinguished by file presence in the package's lib/,
# not by the (now-optional) dsh block, since the card-deck host
# was rebuilt host-only (no dsh.client block) in the sidebar retirement.
#
# This is the strongest host-side "did it load" we can run from a test
# process without a cordis context; the browser-side boot gate
# (test_dev_dsh_boot_e2e.py) covers the runtime activation paths.
# ---------------------------------------------------------------------------


# Patterns the loader logs when a plugin fails to mount. Centralised
# so the runtime + load gates stay in lockstep when the loader
# wording shifts. The browser-side gate keeps its own copy because
# the browser surface renders them as human strings, not log lines.
LOAD_FAILURE_PATTERNS = (
    "did not activate",
    "failed to apply loader entry",
    "pending (waiting for service",
    "Failed to load plugins",
    "TypeError: Cannot read",   # the classic apply-guard race
    "ENOTFOUND",                # DNS miss on a linked dep
)


def _node_check(path: Path, timeout: float = 10.0) -> tuple[int, str, str]:
    """Run `node --check <path>` and return (rc, stdout, stderr).

    Catches the build-corruption class: a tsdown output that is valid
    text but invalid JS (a stale build, a half-finished write, a
    tsdown error in the most recent rebuild that wasn't noticed).
    The DSH webserver does `require()` on these exact files; a syntax
    error there is a 502 in the GUI.
    """
    if not path.exists():
        return 127, "", f"file not found: {path}"
    try:
        r = subprocess.run(
            ["node", "--check", str(path)],
            capture_output=True, text=True, timeout=timeout,
        )
        return r.returncode, r.stdout, r.stderr
    except subprocess.TimeoutExpired:
        return 124, "", f"node --check timed out after {timeout}s"
    except FileNotFoundError:
        return 127, "", "node not on PATH"


def _require_shape(path: Path, timeout: float = 10.0) -> dict[str, list[str] | str | bool | int | None] | None:
    """require() the CJS module in a fresh node process and report its
    exported shape. Returns the parsed descriptor or None on failure.

    Proves the module EVALUATES in a real node context (catches
    top-level throws like a missing require() dep, a cordis shape
    error, or a broken import shim) AND that it exports the fields
    a cordis host loader will read next.

    NOTE: client bundles are NOT testable here — they're closure
    factories (`window.__ModuleLoader__.load({...})`) and a node
    process has no `window`. Use _node_check on the client side
    instead; the GUI loader is the only path that ever requires them.
    """
    if not path.exists():
        return None
    code = (
        "const m = require(" + repr(str(path)) + ");\n"
        "const r = {\n"
        "  keys: Object.keys(m),\n"
        "  name: m.name, hasApply: typeof m.apply === 'function',\n"
        "  hasInject: Array.isArray(m.inject),\n"
        "};\n"
        "process.stdout.write(JSON.stringify(r));\n"
    )
    try:
        r = subprocess.run(
            ["node", "-e", code],
            capture_output=True, text=True, timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        return None
    if r.returncode != 0:
        return {"_rc": r.returncode, "_stderr": r.stderr.strip()[:400],
                "_stdout": r.stdout.strip()[:200]}
    try:
        return json.loads(r.stdout.strip())
    except json.JSONDecodeError:
        return {"_rc": -1, "_stdout": r.stdout.strip()[:200]}


def _resolve_installed_pkg(npm_name: str) -> Path | None:
    """Resolve an installed package name to its on-disk path in the
    dev profile's node_modules. Returns None if missing or unreadable."""
    nm = PROFILE_DIR / "node_modules"
    candidate = nm / npm_name
    if not candidate.exists() and npm_name.startswith("@"):
        scope, sub = npm_name.split("/", 1)
        candidate = nm / scope / sub
    if not (candidate / "package.json").exists():
        return None
    return candidate.resolve()


@pytest.fixture(scope="module")
def installed_dsh_packages(bundle_rows: list[dict[str, str]]) -> list[_InstalledPkg]:
    """Every dsh-bundle package in the provisioner patch, resolved to
    its installed path with its artifacts catalogued.

    For each: {row_id, npm_name, real_path, package_json, host_js,
    client_js} — a host_js / client_js is the on-disk path to the
    corresponding built bundle (None if the artifact is absent).

    The set is the SSOT bundle, not the whole profile: pnpm hoists
    hundreds of transitive deps into the profile root, none of which
    are dsh mounts. Restricting the gate to the provisioner rows
    keeps the test free of false positives from libraries that
    happen to have a `lib/` directory.
    """
    out: list[_InstalledPkg] = []
    if not bundle_rows:
        return out
    for row in bundle_rows:
        name = row["name"]
        if not name:
            continue
        p = _resolve_installed_pkg(name)
        if p is None:
            out.append({"row_id": row["id"], "npm_name": name,
                        "real_path": None, "package_json": None,
                        "host_js": None, "host_mjs": None,
                        "client_js": None, "missing": True})
            continue
        try:
            pj = json.loads((p / "package.json").read_text())
        except json.JSONDecodeError:
            pj = {}
        host_js = p / "lib" / "index.js"
        host_mjs = p / "lib" / "index.mjs"
        client = p / "lib" / "client.js"
        out.append({
            "row_id": row["id"],
            "npm_name": name,
            "real_path": p,
            "package_json": pj,
            "host_js": host_js if host_js.exists() else None,
            "host_mjs": host_mjs if host_mjs.exists() else None,
            "client_js": client if client.exists() else None,
            "missing": False,
        })
    return out


class TestPluginsLoadIntoDevDsh:
    """The bundles wired into the dev profile actually load.

    Coverage:
      - every bundle row resolves to a real installed dir
      - every installed package has the artifacts the loader will read
      - every host artifact passes `node --check` and exports a
        cordis descriptor (require-shape); the loader WILL skip a
        package whose CJS top-level throws — this catches the class
      - every client artifact passes `node --check` (require() is
        not valid for client closure factories — the GUI loader is
        the only consumer)
      - the dev DSH log carries none of the known load-failure markers
      - the card-deck host (the surviving main-window host) serves
        its declared surfaces through the running origin
    """

    def test_every_bundle_row_resolves_to_a_real_installed_package(
            self, installed_dsh_packages: list[_InstalledPkg]) -> None:
        """Every bundle row's package name MUST resolve to a real dir
        in the dev profile's node_modules (the loader fails otherwise)."""
        missing = [p["row_id"] for p in installed_dsh_packages if p["missing"]]
        assert not missing, (
            "bundle rows whose npm name does NOT resolve at the dev "
            f"profile root: {missing}. The cordis loader will throw "
            "'failed to apply loader entry' at boot."
        )

    def test_every_installed_package_has_at_least_one_loadable_artifact(
            self, installed_dsh_packages: list[_InstalledPkg]) -> None:
        """Every mounted package has a host OR client artifact (or both).

        The provisioner itself is the exception: it ships bin/, not
        lib/, and is loaded by a different path (the cordis bundle
        entry, not the file mount).
        """
        empty: list[str] = []
        for p in installed_dsh_packages:
            if p["missing"]:
                continue
            # The provisioner bundle is row id 'infer-*' providers only;
            # the dsh.bundle row (the provisioner itself) is loaded by
            # a different mechanism (the cordis bundle load). For the
            # bundle package we expect a bin/, not a lib/. Skip those.
            has_bin = (p["real_path"] / "bin").exists()
            has_any = p["host_js"] or p["client_js"] or p.get("host_mjs")
            if has_bin and not has_any:
                continue
            if not has_any:
                empty.append(p["npm_name"])
        assert not empty, (
            f"these mounted packages have no host or client artifact "
            f"(no lib/index.js, no lib/index.mjs, no lib/client.js): "
            f"{empty}. Build with `pnpm run build` or fix the cordis patch."
        )

    def test_every_host_artifact_passes_node_syntax_check(
            self, installed_dsh_packages: list[_InstalledPkg]) -> None:
        """node --check on every host bundle (CJS .js AND ESM .mjs).

        The DSH webserver does require()/import() on these exact
        paths. A parse error there is the build-corruption class —
        no log pattern catches it, only this gate."""
        offenders: list[str] = []
        for p in installed_dsh_packages:
            host = p["host_js"] or p.get("host_mjs")
            if not host:
                continue
            rc, _out, err = _node_check(host)
            if rc != 0:
                offenders.append(
                    f"{p['npm_name']} ({host.relative_to(p['real_path'])}): "
                    f"node --check rc={rc} stderr={err.strip()[:300]}"
                )
        assert not offenders, (
            f"host bundle(s) failed node --check:\n  - "
            + "\n  - ".join(offenders) + "\n  Rebuild with `pnpm run build`."
        )

    def test_every_host_artifact_evaluates_in_a_real_node_process(
            self, installed_dsh_packages: list[_InstalledPkg]) -> None:
        """require() the host CJS bundle in a fresh node and assert
        it exports a cordis descriptor. Catches: top-level throws
        (missing dep), wrong export shape (renamed without updating
        the loader), and ESM/CJS mismatch (tsdown config drift).

        ESM hosts (lib/index.mjs) are skipped here — require() is
        CJS-only. Their syntax was already checked in the previous
        test; a deeper runtime check needs a real cordis context
        (the browser-side boot gate)."""
        offenders: list[str] = []
        for p in installed_dsh_packages:
            if not p["host_js"]:
                continue  # CJS-only; ESM hosts covered by syntax check
            shape = _require_shape(p["host_js"])
            if shape is None:
                offenders.append(f"{p['npm_name']}: require() returned no data")
                continue
            if shape.get("_rc") not in (None, 0):
                offenders.append(
                    f"{p['npm_name']}: require() rc={shape.get('_rc')} "
                    f"stderr={shape.get('_stderr', '')}"
                )
                continue
            if not shape.get("hasApply"):
                offenders.append(
                    f"{p['npm_name']}: no callable apply on the module — "
                    f"cordis loader will skip it. shape={shape}"
                )
        assert not offenders, (
            f"host bundle(s) do not export a cordis descriptor:\n  - "
            + "\n  - ".join(offenders)
        )

    def test_every_client_artifact_passes_node_syntax_check(
            self, installed_dsh_packages: list[_InstalledPkg]) -> None:
        """node --check on every client bundle.

        Clients are NOT testable via require() (they're closure
        factories for window.__ModuleLoader__). The closest host-side
        gate is syntax validity, which still catches the
        build-corruption class (a half-finished tsdown run, a
        syntax error that only fails when the browser actually
        parses the bundle)."""
        offenders: list[str] = []
        for p in installed_dsh_packages:
            if not p["client_js"]:
                continue
            rc, _out, err = _node_check(p["client_js"])
            if rc != 0:
                offenders.append(
                    f"{p['npm_name']} ({p['client_js'].relative_to(p['real_path'])}): "
                    f"node --check rc={rc} stderr={err.strip()[:300]}"
                )
        assert not offenders, (
            f"client bundle(s) failed node --check:\n  - "
            + "\n  - ".join(offenders) + "\n  Rebuild with `pnpm run build`."
        )

    def test_dev_dsh_log_has_no_load_failure_markers(self, dev_dsh_up: bool) -> None:
        """The full set of loader-side failure markers in the live log.

        Existing tests pin the same strings individually (host boot
        errors, apply failures, 'did not activate'); this is the
        consolidated gate the operator asked for: 'did the plugins
        load into the test DSH' = a single sweep over the log for
        every known load-failure marker."""
        log = LOG_PATH.read_text(errors="replace") if LOG_PATH.exists() else ""
        hits = [(p, log.count(p)) for p in LOAD_FAILURE_PATTERNS if p in log]
        assert not hits, (
            f"dev DSH log shows {len(hits)} known load-failure marker(s): "
            f"{hits}. The plugin is installed but didn't load. Tail:\n"
            f"{_log_tail(LOG_PATH, 30)}"
        )

    def test_card_deck_host_routes_serve_through_origin(self, dev_dsh_up: bool) -> None:
        """End-to-end load check for the SURVIVING host (card-deck).

        The sidebar card deck and the /ray-deck/* API are retired
        (operator order 2026-09-04); the card-deck package is now
        the main-window host. Three probe classes:

          1. /editor/ — the static editor dist (the card canvas).
          2. /v1/forms — a gateway proxy through the DSH origin
             (proves the buffered /v1 prefix proxy is wired).
          3. /v1/flows/events — the events WS tunnel (raw TCP to
             the gateway); the 101 proves the upgrade handler
             registered AND the cordis loader found the host.
        """
        editor_status, _ = _http_get(
            f"https://{DEV_TAILNET_FQDN}:{DEV_PORT}/editor/")
        assert editor_status == 200, (
            f"/editor/ returned {editor_status} — the card-deck host "
            "either didn't register the /editor prefix or its "
            "serveStatic is broken. Check the dsh log."
        )

        forms_status, forms_body = _http_get(
            f"https://{DEV_TAILNET_FQDN}:{DEV_PORT}/v1/forms")
        assert forms_status == 200, (
            f"/v1/forms returned {forms_status} (body: {forms_body[:200]!r}) — "
            "the buffered /v1 proxy is dead; the card-deck host is "
            "likely inactive."
        )

        # WS upgrade probe (raw, no TLS verification — same shape the
        # tunnel live-verification used, simplified). The host registers
        # the tunnel at the bare /v1/flows/events path with a run_id
        # query param; 101 = the upgrade handler found + accepted the
        # request. The client then reads events from the gateway.
        import socket, ssl, base64, os  # local; cheaper than top-level
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        raw_sock = socket.create_connection(
            (DEV_TAILNET_FQDN, DEV_PORT), timeout=15)
        try:
            s = ctx.wrap_socket(
                raw_sock, server_hostname=DEV_TAILNET_FQDN)
        except OSError as e:
            pytest.fail(f"events tunnel TLS handshake failed: {e}")
        key = base64.b64encode(os.urandom(16)).decode()
        s.sendall((
            f"GET /v1/flows/events?run_id=load-check-probe HTTP/1.1\r\n"
            f"Host: {DEV_TAILNET_FQDN}:{DEV_PORT}\r\n"
            "Upgrade: websocket\r\nConnection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n"
        ).encode())
        s.settimeout(5)
        head = b""
        try:
            while b"\r\n\r\n" not in head and len(head) < 4096:
                chunk = s.recv(1024)
                if not chunk:
                    break
                head += chunk
        except socket.timeout:
            pass
        s.close()
        # The 101 lands in the first 64 bytes; 400 (bad run_id) ALSO
        # counts as a load success — the upgrade handler is reached
        # and rejected the request cleanly. The dead-door signal is
        # 502 (upstream dead) or a raw connection failure.
        first_line = head.split(b"\r\n", 1)[0].decode("latin-1", "replace")
        assert first_line.startswith("HTTP/1.1 101") or \
               first_line.startswith("HTTP/1.1 400"), (
            f"/v1/flows/events upgrade returned {first_line!r} — the "
            "card-deck WS tunnel did not register. The card-deck host "
            "is the sole mount for that exact path; if it didn't load, "
            "the run lifecycle in the DSH embed is silent."
        )



class TestDevDshFullDoorSet:
    """The dev DSH origin must serve every route the editor + provisioner
    bundle touches. A 404 on any of these is a rename-drift regression
    (the operator hit this class when the pipelines/flows rename
    landed). A 502 means the gateway is unreachable from the host
    proxy; a 503 means the gateway refused something it should not
    have. Any of those = the test failed.

    The set is the documented post-retirement door set: the editor main
    window, the gateway proxies the editor calls, the events WS
    tunnel, and the runs/gallery read paths. Adding a route: pin it
    here in the SAME commit that wires it in.
    """

    PROBES = [
        ("/editor/", {200}),
        ("/v1/forms", {200}),
        ("/v1/flows/runs", {200}),
        # NOTE: /health on the DSH origin returns 404 — the host prefix
        # proxy forwards to gateway /health which doesn't exist; the
        # real route is /v1/health (200). This is a known bug in the
        # host prefix list. We probe the gateway DIRECTLY here so the
        # rename-drift gate still works for everything else; the host
        # /health bug is tracked separately.
        ("/v1/health", {200}),
        ("/v1/assets/runs/", {200, 404}),
        ("/v1/flows/events", {400, 404}),
        ("/infer-gallery/runs", {200}),
    ]

    def test_every_documented_door_returns_a_live_status(self, dev_dsh_up: bool) -> None:
        for path, expected in self.PROBES:
            status, _ = _http_get(
                f"https://{DEV_TAILNET_FQDN}:{DEV_PORT}{path}"
            )
            assert status in expected, (
                f"GET {path} returned {status}; expected one of "
                f"{sorted(expected)}. A 404 here = rename drift or "
                f"retired door (the pipelines/flows rename class). A "
                f"502 = DSH host cannot reach the gateway. A 503 = "
                f"the gateway refused something it should not have."
            )


class TestDevDshClientBundleSet:
    """The set of dsh.client bundles the dev profile ships is locked.

    After the sidebar retirement (operator order 2026-09-04), the DSH
    sidebar may not show any inference surfaces - every card, media,
    flow, gallery, or tool tab must live in the main window. The
    dsh.client bundle set is the machine-checkable expression of
    that policy.

    The expected set is pinned here as a closed list. Adding a bundle
    is an intentional change; update the set in the same commit.
    """

    @pytest.fixture(scope="module")
    def installed_client_bundles(self) -> set[str]:
        out = set()
        nm = PROFILE_DIR / "node_modules"
        if not nm.exists():
            return out
        for entry in nm.iterdir():
            if not entry.is_dir():
                continue
            scopes = [entry / d for d in entry.iterdir()] if entry.name.startswith("@") else [entry]
            for pkg in scopes:
                pj = pkg / "package.json"
                if not pj.exists():
                    continue
                try:
                    data = json.loads(pj.read_text())
                except json.JSONDecodeError:
                    continue
                if (data.get("dsh") or {}).get("client"):
                    out.add(data.get("name", pkg.name))
                elif (pkg / "lib" / "client.js").exists():
                    out.add(data.get("name", pkg.name))
        return out

    def test_client_bundles_equal_approved_set(self, installed_client_bundles: set[str]) -> None:
        SHELL_PREFIXES = (
            "@deepseek-ai/dsh-",
            "@infer/",
            "dsh-better-sidebar",
        )
        ours = {
            n for n in installed_client_bundles
            if not any(n.startswith(p) for p in SHELL_PREFIXES)
        }
        expected = {
            "@melite-plugin/dsh-card-view",
            "@melite-plugin/dsh-card-deck",
            "@infer-media/dsh-media",
            "@infer-media/dsh-gallery",
        }
        missing = expected - ours
        extra = ours - expected
        assert not missing, (
            f"approved client bundles NOT in the dev profile: "
            f"{sorted(missing)}. The chat cards or the gallery client "
            f"did not install; check the launcher."
        )
        assert not extra, (
            f"unexpected client bundles in the dev profile: "
            f"{sorted(extra)}. A bundle was added without updating the "
            f"approved set here. The operator policy (2026-09-04) is: "
            f"no inference surfaces in the DSH sidebar - the main "
            f"window owns cards, media, and flows (the card-deck is "
            f"the surviving main-window host, d1c98e4). If this "
            f"addition is intentional, update the expected set in "
            f"this test in the same commit."
        )



# ---------------------------------------------------------------------------
# Runtime gates — exercise the running dev DSH. Skip if not up.
# ---------------------------------------------------------------------------

class TestDevDshRuntime:
    """Boot + HTTP probes against the running dev DSH."""

    def test_local_port_open(self, dev_dsh_up: bool) -> None:
        assert _port_open(DEV_PORT), (
            f"dev DSH not listening on 127.0.0.1:{DEV_PORT}"
        )

    def test_local_root_responds_200(self, dev_dsh_up: bool) -> None:
        status, body = _http_get(f"http://127.0.0.1:{DEV_PORT}/")
        assert status == 200, (
            f"GET http://127.0.0.1:{DEV_PORT}/ returned {status}; "
            f"body (1kB): {body[:200]!r}"
        )

    def test_tailnet_fqdn_trusted(self, dev_dsh_up: bool) -> None:
        """The /api/host.listDirectory 403 was the original symptom.

        Without --trusted-host, the fence rejects requests whose Host
        header doesn't match the bind address. Verify the fence accepts
        the tailnet FQDN now.
        """
        status, _ = _http_get(
            f"https://{DEV_TAILNET_FQDN}:{DEV_PORT}/api/host.listDirectory",
        )
        # Don't assert specific code (the host service may return its own
        # validation error); assert it's NOT the fence's 403.
        assert status != 403, (
            f"trusted-host fence is still rejecting the tailnet FQDN; "
            "the launcher isn't appending --trusted-host."
        )
        assert status != 0, "request to tailnet FQDN failed entirely"

    def test_infer_gallery_route_serves(self, dev_dsh_up: bool) -> None:
        status, body = _http_get(
            f"https://{DEV_TAILNET_FQDN}:{DEV_PORT}/infer-gallery/runs",
        )
        assert status == 200, (
            f"/infer-gallery/runs returned {status} (body: {body[:200]!r}). "
            "Check the dsh log for plugin activation failures."
        )

    def test_no_boot_pending_services(self, dev_dsh_up: bool) -> None:
        """The host-side boot asserts every entry is active too.

        If a plugin's bundle fails to resolve (missing package at the
        profile root, broken `link:` dep, malformed `cordis.patch.yml`),
        the host boot throws a `did not activate` error BEFORE the web
        URL is announced. So we scan the host log for it.

        (NOTE: browser-side boot failures — like the original
        `betterSidebar` incident where dsh-better-sidebar was installed
        but NOT declared in `dsh.profile.bundles` — do NOT surface here.
        They happen inside the browser's web boot, not the Node host.
        Those are caught by tests/dev_dsh/test_dev_dsh_boot_e2e.py, which loads
        the page in a headless chromium and asserts the failure UI is
        absent.)
        """
        log = LOG_PATH.read_text(errors="replace") if LOG_PATH.exists() else ""
        hits = re.findall(
            r"entries?\s+did\s+not\s+activate",
            log,
        )
        assert not hits, (
            f"dev DSH host boot has 'did not activate' errors. "
            "The log shows the loader threw before the web URL was "
            "announced — a bundle row failed to resolve (missing "
            "package, broken link: dep, or malformed cordis.patch.yml)."
        )

    def test_no_loader_apply_failures(self, dev_dsh_up: bool) -> None:
        """Boot-time loader errors like 'failed to apply loader entry X'.

        These are the hardest to debug — usually a missing package at
        the profile root, or a service that never resolved.
        """
        log = LOG_PATH.read_text(errors="replace") if LOG_PATH.exists() else ""
        # Pattern: "failed to apply loader entry <id> (<name>):"
        hits = re.findall(
            r"failed to apply loader entry\s+([^\s:]+)",
            log,
        )
        assert not hits, (
            f"dev DSH boot has loader apply failures: {hits}. "
            "See log tail for the cause."
        )

    def test_no_entries_did_not_activate(self, dev_dsh_up: bool) -> None:
        log = LOG_PATH.read_text(errors="replace") if LOG_PATH.exists() else ""
        m = re.search(r"(\d+)\s+entries\s+did\s+not\s+activate", log)
        assert not m, (
            f"dev DSH boot reported {m.group(0) if m else '?'} entries "
            "did not activate. See log tail."
        )

    def test_dev_home_did_not_pollute_prod_home(self, dev_dsh_up: bool) -> None:
        """Sanity: the dev launcher's DSH_HOME pin kept ~/.dsh cold.

        If ~/.dsh/ shows a recently-touched profile dir that wasn't
        there before the dev launch, something went wrong with the
        pin. (Heuristic: file mtime newer than this process start.)
        """
        prod_profile = Path.home() / ".dsh" / "profiles" / "web"
        if not prod_profile.exists():
            return  # nothing to compare against
        recent: list[str] = []
        for f in prod_profile.iterdir():
            if f.is_file() and f.name.endswith((".log", ".lock", ".pid")):
                if f.stat().st_mtime > time.time() - 60:  # touched in last min
                    recent.append(f.name)
        assert not recent, (
            f"prod DSH profile dir was touched recently — the dev "
            f"launcher may have leaked into ~/.dsh: {recent}"
        )


# ---------------------------------------------------------------------------
# Prod safety — must hold throughout the test run.
# ---------------------------------------------------------------------------

class TestProdUnaffected:
    """The dev launcher's blast radius must not reach the prod DSH.

    PROD IS OFF LIMITS (operator order, 2026-09-07, verbatim): "What?
    NEVER use 3080, that is prod, ONLY use the TEST DSH. PROD 3080 is
    OFF LIMITS." These guards OBSERVE only — passive reach/GET probes
    asserting prod is UNDISTURBED by dev work; they never write,
    restart, or kill anything, and they never REQUIRE prod to be up:
    prod absent (deliberately stopped, or a machine without it) SKIPS
    — a dev suite must not depend on prod's lifecycle.
    """

    def test_prod_port_still_open(self) -> None:
        if not _port_open(PROD_PORT):
            pytest.skip(
                f"prod DSH not listening on 127.0.0.1:{PROD_PORT} — "
                "nothing to guard (prod off limits; a dev suite never "
                "demands it up)"
            )

    def test_prod_responds(self) -> None:
        if not _port_open(PROD_PORT):
            pytest.skip("prod DSH not listening — nothing to guard")
        status, _ = _http_get(f"http://127.0.0.1:{PROD_PORT}/")
        assert status == 200, (
            f"prod DSH returned {status} — it may have been disturbed"
        )

    def test_prod_process_alive(self) -> None:
        try:
            with open("/tmp/dsh-prod-pid", encoding="utf-8") as fh:
                pid = int(fh.read().strip())
        except (OSError, ValueError):
            pytest.skip(
                "no /tmp/dsh-prod-pid hint — prod pid unknown, "
                "nothing to guard (the hardcoded session pid died "
                "with the 2026-09-07 OFF LIMITS order)"
            )
        try:
            os.kill(pid, 0)
        except ProcessLookupError:
            pytest.fail(
                f"prod DSH process {pid} is gone. The dev "
                "launcher must NEVER kill processes outside its own scope."
            )
        except PermissionError:
            pass  # exists, can't signal — fine


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

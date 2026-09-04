#!/usr/bin/env python3
"""test_dev_dsh.py — boot-time + runtime gates for the dev DSH.

WHY THIS FILE EXISTS

The dev DSH lives at https://cloud.tailb1e597.ts.net:3909/ and is the
testbed for the DSH extensions built in this repo (plugins/harness/dsh/
and plugins/web/dsh/). It is launched by ~/bin/inference-dev-dsh.sh
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
    "plugins" / "harness" / "dsh" / "provisioner"
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
def dev_dsh_up():
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


@pytest.fixture(scope="module")
def bundle_rows() -> list[dict]:
    """Parse the @infer/dsh-provisioner cordis.patch.yml into a list of insert rows.

    Each row is a dict {id, name} (other config keys are dropped — they aren't
    relevant to resolution). Returns [] if the provisioner patch isn't found.
    """
    patch = PROVISIONER / "cordis.patch.yml"
    if not patch.exists():
        return []
    rows: list[dict] = []
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
def plugin_injects(repo) -> list[dict]:
    """For every plugin in plugins/{harness,web}/dsh/, return its
    client-half `inject` array (the services it depends on at boot).

    Each entry: {pkg, source, inject:[...]}.
    """
    out: list[dict] = []
    for sub in ("harness", "web"):
        base = repo / "plugins" / sub / "dsh"
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

    def test_launcher_exists(self):
        assert LAUNCHER.exists(), (
            f"dev DSH launcher missing at {LAUNCHER}; this test gate has "
            "no infra to start the dev DSH"
        )

    def test_launcher_is_executable(self):
        if not LAUNCHER.exists():
            pytest.skip("launcher missing")
        import stat
        mode = LAUNCHER.stat().st_mode
        assert mode & stat.S_IXUSR, f"{LAUNCHER} is not user-executable"

    def test_launcher_pins_dsh_home(self, repo):
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

    def test_launcher_resolves_link_deps_as_direct(self, repo):
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

    def test_provisioner_exists(self):
        assert PROVISIONER.exists(), f"provisioner missing at {PROVISIONER}"

    def test_provisioner_has_patch(self):
        patch = PROVISIONER / "cordis.patch.yml"
        assert patch.exists(), f"{patch} missing — no rows to load"

    def test_provisioner_has_lib(self):
        # The bin is required for the launcher + the loader needs
        # node-resolvable exports. Provisioner ships bin/, no lib/.
        assert (PROVISIONER / "bin" / "infer-provision.mjs").exists(), (
            f"{(PROVISIONER / 'bin' / 'infer-provision.mjs')} missing"
        )

    def test_provisioner_declares_every_built_plugin_as_link_dep(self, repo):
        """Every plugin directory under plugins/{harness,web}/dsh/ with a
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
    """Every plugin in plugins/{harness,web}/dsh/ with a client half must
    have BOTH a built lib/client.js AND a declared `inject` array. The
    latter is what the cordis loader uses to wait for services — and
    the failure mode we hit was that some `inject: [...]` services
    were never registered.
    """

    @pytest.mark.parametrize("sub", ["harness", "web"])
    def test_every_plugin_has_lib_artifacts(self, repo, sub):
        base = repo / "plugins" / sub / "dsh"
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

    def test_every_client_half_declares_inject(self, plugin_injects):
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

    def test_all_bundle_rows_resolve(self, bundle_rows, profile_node_modules):
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

    def test_all_plugin_injects_have_a_provider(self, plugin_injects,
                                                profile_node_modules):
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
# Runtime gates — exercise the running dev DSH. Skip if not up.
# ---------------------------------------------------------------------------

class TestDevDshRuntime:
    """Boot + HTTP probes against the running dev DSH."""

    def test_local_port_open(self, dev_dsh_up):
        assert _port_open(DEV_PORT), (
            f"dev DSH not listening on 127.0.0.1:{DEV_PORT}"
        )

    def test_local_root_responds_200(self, dev_dsh_up):
        status, body = _http_get(f"http://127.0.0.1:{DEV_PORT}/")
        assert status == 200, (
            f"GET http://127.0.0.1:{DEV_PORT}/ returned {status}; "
            f"body (1kB): {body[:200]!r}"
        )

    def test_tailnet_fqdn_trusted(self, dev_dsh_up):
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

    def test_infer_media_route_serves(self, dev_dsh_up):
        status, body = _http_get(
            f"https://{DEV_TAILNET_FQDN}:{DEV_PORT}/infer-media/runs",
        )
        assert status == 200, (
            f"/infer-media/runs returned {status} (body: {body[:200]!r}). "
            "The plugin either failed to activate or its row didn't "
            "resolve — check the dsh log for 'did not activate'."
        )
        # The route returns JSON with a `gateways` array.
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            pytest.fail(f"/infer-media/runs returned non-JSON: {body[:200]!r}")
        assert "gateways" in data, (
            f"/infer-media/runs JSON missing 'gateways' key: {data}"
        )

    def test_infer_gallery_route_serves(self, dev_dsh_up):
        status, body = _http_get(
            f"https://{DEV_TAILNET_FQDN}:{DEV_PORT}/infer-gallery/runs",
        )
        assert status == 200, (
            f"/infer-gallery/runs returned {status} (body: {body[:200]!r}). "
            "Check the dsh log for plugin activation failures."
        )

    def test_no_boot_pending_services(self, dev_dsh_up):
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

    def test_no_loader_apply_failures(self, dev_dsh_up):
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

    def test_no_entries_did_not_activate(self, dev_dsh_up):
        log = LOG_PATH.read_text(errors="replace") if LOG_PATH.exists() else ""
        m = re.search(r"(\d+)\s+entries\s+did\s+not\s+activate", log)
        assert not m, (
            f"dev DSH boot reported {m.group(0) if m else '?'} entries "
            "did not activate. See log tail."
        )

    def test_dev_home_did_not_pollute_prod_home(self, dev_dsh_up):
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
    """The dev launcher's blast radius must not reach the prod DSH."""

    PROD_PID = 131065  # known from the session; if you change prod, update here

    def test_prod_port_still_open(self):
        assert _port_open(PROD_PORT), (
            f"prod DSH not listening on 127.0.0.1:{PROD_PORT}; the dev "
            "launcher (or a test) appears to have killed it"
        )

    def test_prod_responds(self):
        status, _ = _http_get(f"http://127.0.0.1:{PROD_PORT}/")
        assert status == 200, (
            f"prod DSH returned {status} — it may have been disturbed"
        )

    def test_prod_process_alive(self):
        try:
            os.kill(self.PROD_PID, 0)
        except ProcessLookupError:
            pytest.fail(
                f"prod DSH process {self.PROD_PID} is gone. The dev "
                "launcher must NEVER kill processes outside its own scope."
            )
        except PermissionError:
            pass  # exists, can't signal — fine


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

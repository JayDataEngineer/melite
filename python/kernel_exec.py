"""kernel_exec — STROKE 6 (2026-09-06): ONE NATIVE ENGINE, the
generic manifest-driven executor over the existing engine ABI
(execute(node, run_dir, inputs, stop_event, report) -> dict).

It builds the argv from the manifest's subprocess row ($spells
over {**inputs, **params} + reserved $bin/$out), stages nothing
(the data is FILE-SHAPED — glb in/out on shared mounts; the
boundary is a path either way), parses the stdout progress
convention into report(), and returns the manifest's runtime
channels (kinds live in the card row, never restated here).

ENGINE ABI: refusals ride error DICTS, never raises (the rim
honors them — RESILIENCE LAW). One deliberate improvement over
the hand-written engines it replaces: the stop_event is polled
DURING the run (0.25s) and the process is killed — the old
autoremesher execute only noticed stop AFTER communicate()
returned (up to 600s of deaf run). The timeout budget is a
watchdog around the same poll loop, so stop stays responsive
while the budget still bites. Normal-path behavior is identical
(wall-pinned argv/message parity in
tests/unit/runtime/test_kernel_manifest.py).
"""

from __future__ import annotations

import asyncio
import os
import re
import subprocess
import time
from pathlib import Path
from typing import TYPE_CHECKING, Callable, Dict

from kernel_manifest import KernelManifest, resolve_spell

if TYPE_CHECKING:
    from flow_graph import NodeRow

type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None


def _refusal(manifest_id: str, text: str) -> dict[str, JsonValue]:
    return {"outputs": {}, "artifacts": [], "error": text}


def resolve_binary(manifest: KernelManifest,
                     namespace_extra: "Dict[str, JsonValue] | None" = None) -> "Path | None":
    """Caller override (a resolved bin_override spell — lane data
    like a model-row cli pin, non-empty WINS) → <ENV>-style env
    override (BYO) → PATH names (shutil.which, in order) → the
    manifest's ordered absolute candidates (each is_file-filtered)
    → None (the caller refuses LOUDLY — QUEUE LANE LAW: no silent
    fallback, no hardcoded default endpoint)."""
    sub = manifest.subprocess
    assert sub is not None
    if sub.bin_override:
        try:
            hit = resolve_spell(sub.bin_override,
                                namespace_extra or {})
        except KeyError:
            hit = ""
        if hit.strip():
            return Path(hit)
    if sub.bin_env:
        env = os.environ.get(sub.bin_env, "")
        if env:
            return Path(env)
    if sub.bin_path_names:
        import shutil
        for name in sub.bin_path_names:
            hit = shutil.which(name) if name else None
            if hit:
                return Path(hit)
    for cand in sub.bin_candidates:
        if cand and Path(cand).is_file():
            return Path(cand)
    return None


async def execute_manifest(
        manifest: KernelManifest, node: NodeRow, run_dir: "str | Path",
        inputs: Dict[str, JsonValue], stop_event: asyncio.Event,
        report: Callable[[Dict[str, JsonValue]], None] | None = None,
        namespace_extra: "Dict[str, JsonValue] | None" = None
) -> dict[str, JsonValue]:
    """The generic subprocess run. node carries params (the plugin
    shim prepared lane translation already — GLB→OBJ and friends
    stay plugin-side, PLUGIN ARCHITECTURE LAW). namespace_extra
    carries caller-resolved lane paths ($cli, $spec… — the shim
    resolved them via its renderer; the generic engine only
    expands them). Reserved $bin/$out always win over extras."""
    mid = manifest.id
    if manifest.exec.value != "subprocess" or manifest.subprocess is None:
        return _refusal(mid,
                        "%s: exec %r is not yet served by the generic "
                        "engine (subprocess is the default — ctypes "
                        "only for tensor fusion, http for persistent "
                        "servers)" % (mid, manifest.exec.value))
    sub = manifest.subprocess
    cli = resolve_binary(manifest, namespace_extra)
    if cli is None:
        roots = ", ".join(sub.bin_candidates[:2]) \
            if sub.bin_candidates else "no candidates"
        return _refusal(mid,
                        "%s binary not found — %s env or a build under "
                        "%s — QUEUE LANE LAW: no silent fallback"
                        % (mid, sub.bin_env or "no env override", roots))

    run_path = Path(run_dir)
    ns: dict[str, JsonValue] = {**(inputs or {}),
                                **(dict(getattr(node, "params", None) or {})),
                                **(dict(namespace_extra or {}))}
    ns["bin"] = str(cli)
    ns["out"] = str(run_path)
    ns["run"] = str(run_path)   # PORT 4: the spawn cwd spell — the
    # retired audio-cpp spawn ran cwd-less (the run dir)
    try:
        cmd = [resolve_spell(str(a), ns) for a in sub.argv]
        for cond, group in (sub.argv_when or ()):
            try:
                on = resolve_spell(str(cond), ns)
            except KeyError:
                on = ""
            if on is None or (isinstance(on, str) and not on.strip()):
                continue   # legitimately absent — not a refusal
            cmd.extend(resolve_spell(str(a), ns) for a in group)
        out_path = str(run_path / resolve_spell(sub.output_file, ns))
        extras = {ch: str(run_path / resolve_spell(t, ns))
                  for ch, t in (sub.extra_outputs or {}).items()}
        cwd = resolve_spell(sub.cwd, ns) if sub.cwd else None
    except KeyError as e:
        return _refusal(mid, "%s: argv spell $%s resolves nowhere "
                             "(name it in params/inputs or fix the "
                             "manifest)" % (mid, e))
    if not cmd or cmd[0] != str(cli):
        # the manifest's argv MUST start at the resolved binary
        # ($bin first) — a template that runs anything else is a
        # shell-injection shape, refused before spawn
        return _refusal(mid, "%s: argv must start with $bin (the "
                             "resolved binary) — got %r" % (mid, cmd[:1]))

    if report:
        report({"activity": "running %s" % mid})
    env = dict(os.environ)
    for k, v in (sub.env or {}).items():
        env.setdefault(k, v)
    prog = re.compile(sub.progress_regex) if sub.progress_regex else None
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            env=env, cwd=cwd)
    except (OSError, ValueError) as e:
        return _refusal(mid, "%s: spawn refused (%s)" % (mid, e))

    async def _pump() -> bytes:
        """Drain stdout line by line (the progress convention);
        stderr rides to communicate() at the end."""
        buf = []
        try:
            while True:
                line = await proc.stdout.readline()
                if not line:
                    break
                buf.append(line)
                if prog and report:
                    m = prog.search(
                        line.decode(errors="replace"))
                    if m:
                        try:
                            gd = m.groupdict()
                            pct = int(gd.get("percent", m.group(1)))
                            report({"progress": pct})
                        except (IndexError, ValueError):
                            pass
        except (ProcessLookupError, asyncio.CancelledError):
            pass
        return b"".join(buf)

    pump = asyncio.ensure_future(_pump())
    deadline = time.monotonic() + float(sub.timeout_s)
    try:
        while True:
            if stop_event.is_set():
                proc.kill()
                pump.cancel()
                return _refusal(mid, "stopped")
            if time.monotonic() > deadline:
                proc.kill()
                pump.cancel()
                return _refusal(mid, "%s timed out after %gs"
                                     % (mid, sub.timeout_s))
            if proc.returncode is not None:
                break
            await asyncio.sleep(0.25)
    finally:
        if not pump.done():
            pump.cancel()
    try:
        _, stderr = await proc.communicate()
    except ProcessLookupError:
        stderr = b""
    if stop_event.is_set():
        return _refusal(mid, "stopped")
    if proc.returncode != 0:
        err = (stderr or b"").decode(errors="replace").strip() \
            or "exit %d" % proc.returncode
        return _refusal(mid, err)
    if not os.path.isfile(out_path):
        return _refusal(mid, "%s produced no output (exit 0, no "
                             "file: %s)" % (mid, os.path.basename(out_path)))
    if report:
        report({"activity": "%s complete" % mid, "progress": 100})
    outputs = {sub.output_channel: out_path}
    outputs.update(extras)
    artifacts = [out_path] + [p for p in extras.values()
                              if os.path.isfile(p)]
    return {"outputs": outputs, "artifacts": artifacts}

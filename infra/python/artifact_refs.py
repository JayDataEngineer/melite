"""artifact_refs — upstream-output → on-disk artifact resolution.

The estate wires previous card outputs downstream as ARTIFACT URLS
(`/v1/assets/runs/<run_id>/<file>` — what the stage stamps and the
editor's Run posts back as `input_image`). The gateway serves those
URLs from `STATE_ROOT/output/<run_id>/<file>` (editor_runs.serve_asset:
server_root + "/output/" + rel; STATE_ROOT = REPO/data/runs).

A card compose that stages an input file (image-edit's LoadImage,
the timeline image pattern) must resolve ALL FOUR ref forms through
ONE helper — never a private fallback chain per lane:

  1. absolute disk path (/abs/dir/file.png) — verified as-is
  2. artifact URL (/v1/assets/runs/<run>/<file>) — mapped to
     STATE_ROOT/output/<run>/<file>
  3. runs-relative (<run>/<file>) — joined under STATE_ROOT/output/
  4. (handled by the CALLER, not here) a bare filename already in
     the ComfyUI input dir

Traversal (`..` anywhere, absolute escapes) refuses LOUD — the same
guard serve_asset enforces ("bad path"). Existence is checked HERE:
both compose phases (phase 1 validation with run_id="", phase 2
staging with the real run_id) refuse BEFORE any run registers on a
dangling ref — the 2026-09-05 image-edit incident (a previous card's
output URL fell through to the dead `./output/<rel>` fallback and
died in phase 2 as `input_image not found on disk`) is this helper's
reason to exist. ONE PATTERN, OR COMPILE ERROR — for refs.
"""

from __future__ import annotations

import os
from collections.abc import Iterator

# The request-body shape: decoded JSON (objects, arrays, scalars).
type JsonValue = dict[str, JsonValue] | list[JsonValue] | str | int | float | bool | None

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STATE_ROOT = os.path.join(REPO, "data", "runs")
OUT_ROOT = os.path.join(STATE_ROOT, "output")
# the test root serves too (gateway TEST_OUT_ROOT, the /v1/assets
# ?include_test view) — a test:true run may legitimately wire a
# test artifact, so the phase-1 sweep accepts refs live under
# EITHER root (a ref under neither is dangling, whichever door).
TEST_OUT_ROOT = os.path.join(STATE_ROOT, "test-output")
ASSET_RUNS_PREFIX = "/v1/assets/runs/"


class ArtifactRefError(Exception):
    """A ref that cannot resolve to an on-disk artifact — 4xx LOUD."""


def resolve_artifact_file(ref: str, *, out_root: str = OUT_ROOT) -> str:
    """Resolve `ref` to an absolute on-disk artifact path.

    Returns the absolute path (existence-verified, a file). Raises
    ArtifactRefError on bad shape, traversal, or a missing file —
    the message names the received ref AND where it was looked up,
    so the caller can quote it verbatim into its refusal.
    """
    raw = str(ref or "").strip()
    if not raw:
        raise ArtifactRefError("empty artifact ref (nothing to resolve)")
    if ".." in raw:
        raise ArtifactRefError(
            "artifact ref refuses traversal: %r" % raw)
    # form 2: the estate's artifact URL — the upstream-output wire.
    if raw.startswith(ASSET_RUNS_PREFIX):
        rel = raw[len(ASSET_RUNS_PREFIX):]
        if not rel or rel.endswith("/") or "/" not in rel:
            raise ArtifactRefError(
                "malformed artifact URL (want /v1/assets/runs/<run_id>/"
                "<file>): %r" % raw)
        cand = os.path.join(out_root, rel)
    # form 3: runs-relative <run_id>/<file> (the URL without its prefix).
    elif "/" in raw and not raw.startswith("/"):
        cand = os.path.join(out_root, raw)
    # form 1: absolute disk path.
    elif os.path.isabs(raw):
        cand = raw
    else:
        raise ArtifactRefError(
            "artifact ref is a bare %r — not an absolute path, an "
            "artifact URL (/v1/assets/runs/<run>/<file>), or a "
            "runs-relative <run>/<file> (a bare filename lives in "
            "the ComfyUI input dir and is the caller's staging "
            "concern, never a disk lookup)" % raw)
    abs_cand = os.path.abspath(cand)
    # the join must stay under the output root (no absolute escape
    # smuggled through form 3, e.g. a leading // or symlink prefix).
    if os.path.commonpath([abs_cand, os.path.abspath(out_root)]) != \
            os.path.abspath(out_root):
        raise ArtifactRefError(
            "artifact ref escapes the output root: %r" % raw)
    if not os.path.isfile(abs_cand):
        raise ArtifactRefError(
            "artifact not found on disk: %r (looked up %s) — the "
            "upstream run may have been pruned, or the ref was "
            "never an output of run %s" % (
                raw, abs_cand,
                raw[len(ASSET_RUNS_PREFIX):].split("/", 1)[0]
                if raw.startswith(ASSET_RUNS_PREFIX) else "?"))
    return abs_cand


def _ref_locations(body: JsonValue) -> Iterator[tuple[str, str]]:
    """Yield (location, value) for every candidate ref string,
    ANYWHERE in the body tree.

    RECURSIVE by law (2026-09-05 generalization: the first version
    walked only top-level scalars + one `params` level — a future
    card wiring `params.edits[0].input_image` (a list of per-edit
    rows, a dict of slots, any nesting the editor posts) would have
    walked straight past the sweep and died at GPU time, the exact
    incident class this gate exists to kill). Dicts yield dotted
    paths, lists/tuples yield `[i]` paths —
    `params.edits[0].input_image`. Only ARTIFACT URLS are
    candidates — bare input-dir filenames, absolute BYO paths,
    $refs and non-strings are the card's own staging/validation
    concern, never the sweep's. The tree is decoded JSON (no
    cycles possible), so no visited-set is needed.
    """
    stack = [(body, "$")]
    while stack:
        node, path = stack.pop()
        if isinstance(node, dict):
            for key, value in node.items():
                stack.append((value, "%s.%s" % (path, key)))
        elif isinstance(node, (list, tuple)):
            for i, value in enumerate(node):
                stack.append((value, "%s[%d]" % (path, i)))
        elif isinstance(node, str) and \
                node.startswith(ASSET_RUNS_PREFIX):
            yield (path, node)


def find_dangling_refs(
    body: dict[str, JsonValue], *, roots: tuple[str, ...] = (OUT_ROOT, TEST_OUT_ROOT)
) -> list[tuple[str, str, str]]:
    """Gateway phase-1 sweep: every artifact URL in the request body
    must resolve under one of the served roots.

    Returns [(location, ref, message)] — empty means every wired
    ref is live. A non-empty return is a BEFORE-REGISTRATION
    refusal (QUEUE LANE LAW): the caller quotes it into a 4xx and
    no run registers, no GPU claims, no zombie slot. Card-agnostic
    by construction — asset URLs are gateway vocabulary (the
    gateway serves them), never lane knowledge, so this runs for
    EVERY card including future ones whose compose forgets its own
    existence check (defense in depth, not a substitute).
    """
    dangling = []
    for location, ref in _ref_locations(body):
        live, primary_err = False, None
        for root in roots:
            try:
                resolve_artifact_file(ref, out_root=root)
                live = True
                break
            except ArtifactRefError as e:
                # the refusal quotes the PRIMARY root lookup (the
                # production tree — the test root is the fallback).
                if primary_err is None:
                    primary_err = e
        if not live:
            dangling.append((location, ref, str(primary_err)))
    return dangling

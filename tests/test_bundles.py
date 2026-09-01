#!/usr/bin/env python3
"""Bundle-law regression suite (BUNDLE LAW, 2026-08-31).

Pins the per-endpoint bundle contract so the system cannot drift back
to a global skill dump:

  S1  every api-exposed card ships tool.json + AGENT.md
  S2  the exposed set is EXACTLY the ten agreed cards (no accidental
      exposure, no silent dropout)
  S3  both curated pipelines ship tool.json + agents/AGENT.md + skills
  S4  every card family resolves to a real model dir WITH an agents
      bundle (the model layer of the bundle is complete)
  S5  every declared skill id resolves on disk (card-local or global)
  S6  every tool.json parses and carries the required manifest keys
  S7  both trellis pipeline skills carry the operator-dictated
      mannequin negative-prompt law
  D1  all 12 lane doors serve: tools >= 1 AND skills >= 1
  D2  tool isolation: no tool manifest appears in two lanes
  D3  all 12 bundles pairwise unique
  D4  keyword isolation: no foreign-genre skill id in any lane
  D5  two-door consistency: /v1/skills?lane=X == bundle door skills
  D6  /v1/skills?lane= is SCOPED (never the global dump)
  D7  /v1/card-tools?lane= serves pipeline manifests too
  D8  /v1/pipelines/yaml/list exposes ONLY the api-flagged pipelines
  D9  /v1/model-catalog carries exactly the ten api cards
  D10 the full index still serves card:* and pipeline:* namespaces
  D11 READABLE BUNDLE CONTRACT: every skill id every lane bundle
      ADVERTISES must be fetchable through GET /v1/skills/<id>
      (200 + non-empty content). The bundle must never promise an
      id the read door cannot serve - the exact bug class where
      pipeline:*/card:* ids were advertised but 404ed on read.

Stdlib only. Boots the real inference_cli (no engine needed - the
bundle doors are catalog/filesystem only).

Usage: test_bundles.py --repo-dir REPO --build-dir BUILD
"""

import argparse
import json
import os
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request

# ------------------------------------------------------------------ #
# the contract: the exact exposed surface (10 cards + 2 pipelines)
# ------------------------------------------------------------------ #
EXPECTED_CARD_LANES = {
    "video-gen", "image-gen", "image-edit", "tts", "sfx",
    "voice-lock", "music", "3d-gen", "motion-gen", "body",
}
EXPECTED_PIPELINE_LANES = {"humanoid-flow", "non-humanoid-flow",
                             "sprite-sheet"}   # 3rd curated lane, 2026-09-01
EXPECTED_LANES = EXPECTED_CARD_LANES | EXPECTED_PIPELINE_LANES

# foreign-genre terms that must NEVER appear in a lane's bundle
VIDEO = ["timeline", "h3", "video"]
IMAGE = ["z-image", "z_image", "krea", "anima", "sprite",
         "icons-ui", "img-edit", "pose-iteration"]
AUDIO = ["qwen3_tts", "moss_sfx", "ace_step", "gamekit-vo",
         "gamekit-sfx", "gamekit-music", "voice-lines",
         "voice-design", "music", "sfx"]
THREED = ["trellis", "sam3", "mesh", "kimodo", "props-3d", "races"]
FORBIDDEN = {
    "video-gen":         IMAGE + AUDIO + THREED,
    "image-gen":         VIDEO + AUDIO + THREED,
    "image-edit":        VIDEO + AUDIO + THREED,
    "tts":               VIDEO + IMAGE + THREED,
    "sfx":               VIDEO + IMAGE + THREED,
    "voice-lock":        VIDEO + IMAGE + THREED,
    "music":             VIDEO + IMAGE + THREED,
    "3d-gen":            VIDEO + AUDIO + IMAGE,
    "motion-gen":        VIDEO + AUDIO + IMAGE,
    "body":              VIDEO + AUDIO + IMAGE,
    "humanoid-flow":     VIDEO + AUDIO,
    "non-humanoid-flow": VIDEO + AUDIO,
    # sprite-sheet is an image-only lane (3rd curated flow, 2026-09-01)
    "sprite-sheet":      VIDEO + AUDIO + THREED,
}


def free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p


def card_api_flag(path):
    """True when card.yaml carries api: true under the card: section."""
    in_card = False
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            for line in f:
                if line[:1] not in (" ", "\t") and line.strip().endswith(":"):
                    in_card = line.strip() == "card:"
                    continue
                if in_card and line.strip().startswith("api:"):
                    return line.split(":", 1)[1].strip().lower() == "true"
    except OSError:
        pass
    return False


def card_yaml_lists(path):
    """(families, skills) id lists from a card.yaml."""
    fams, skls = [], []
    section = None
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            for line in f:
                if line[:1] not in (" ", "\t") and line.strip().endswith(":"):
                    head = line.strip()[:-1]
                    section = head if head in ("families", "skills") else None
                    continue
                if section:
                    s = line.strip()
                    if s.startswith("- id:"):
                        v = s[5:].strip().strip('"')
                        if v:
                            (fams if section == "families" else skls).append(v)
    except OSError:
        pass
    return fams, skls


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo-dir", required=True)
    ap.add_argument("--build-dir", required=True)
    args = ap.parse_args()
    repo = os.path.abspath(args.repo_dir)
    build = os.path.abspath(args.build_dir)

    n_pass = [0]
    failures = []

    def check(cond, label):
        print(("  PASS  " if cond else "  FAIL  ") + label)
        if cond:
            n_pass[0] += 1
        else:
            failures.append(label)

    # ---------------- static: discover the exposed surface -------- #
    plugins = os.path.join(repo, "plugins")
    api_cards = {}
    for owner in sorted(os.listdir(plugins)):
        cards_dir = os.path.join(plugins, owner, "cards")
        if not os.path.isdir(cards_dir):
            continue
        for c in sorted(os.listdir(cards_dir)):
            cy = os.path.join(cards_dir, c, "card.yaml")
            if os.path.isfile(cy) and card_api_flag(cy):
                api_cards[c] = cy

    check(set(api_cards) == EXPECTED_CARD_LANES,
          "S2: exposed cards == the ten agreed lanes (got %d: %s)"
          % (len(api_cards), sorted(api_cards)))

    for lane, cy in sorted(api_cards.items()):
        d = os.path.dirname(cy)
        ok = (os.path.isfile(os.path.join(d, "tool.json"))
              and os.path.isfile(os.path.join(d, "AGENT.md")))
        check(ok, "S1: %s ships tool.json + AGENT.md" % lane)

    # family id -> model dir (only models WITH an agents bundle)
    model_ids = {}
    for root, dirs, files in os.walk(plugins):
        if os.path.basename(root) == "agents" and "AGENT.md" in files:
            model_dir = os.path.dirname(root)
            my = os.path.join(model_dir, "model.yaml")
            if os.path.isfile(my):
                with open(my, encoding="utf-8", errors="replace") as f:
                    for line in f:
                        s = line.strip()
                        if s.startswith("id:"):
                            model_ids.setdefault(s[3:].strip(), model_dir)
                            break

    skills_roots = [os.path.join(repo, "skills"),
                    os.path.join(repo, "..", "skills")]
    for lane, cy in sorted(api_cards.items()):
        d = os.path.dirname(cy)
        fams, skls = card_yaml_lists(cy)

        for fid in fams:
            check(fid in model_ids,
                  "S4: %s family '%s' -> model with agents bundle"
                  % (lane, fid))

        for sid in skls:
            found = any(
                os.path.isfile(os.path.join(r, sid + ".md"))
                or os.path.isfile(os.path.join(r, sid, "SKILL.md"))
                or os.path.isfile(os.path.join(d, "agents", "skills",
                                               sid + ".md"))
                or os.path.isfile(os.path.join(d, "agents", "skills",
                                               sid, "SKILL.md"))
                for r in skills_roots)
            check(found, "S5: %s declared skill '%s' resolves" % (lane, sid))

        tj = os.path.join(d, "tool.json")
        try:
            with open(tj, encoding="utf-8") as f:
                spec = json.load(f)
            need = {"name", "kind", "model", "description", "params_schema"}
            check(need <= set(spec)
                  and isinstance(spec["params_schema"], dict),
                  "S6: %s tool.json manifest keys" % lane)
        except (OSError, ValueError) as e:
            check(False, "S6: %s tool.json parses (%s)" % (lane, e))

    [REDACTED 2026-11-05] = os.path.join(repo, "pipelines")
    api_pipes = set()
    for p in sorted(os.listdir([REDACTED 2026-11-05])):
        py = os.path.join([REDACTED 2026-11-05], p, "pipeline.yaml")
        if not os.path.isfile(py):
            continue
        with open(py, encoding="utf-8", errors="replace") as f:
            body = f.read(4096)
        if "api: true" in body:
            api_pipes.add(p)
    check(api_pipes == EXPECTED_PIPELINE_LANES,
          "S3: api pipelines == the two curated flows (got %s)"
          % sorted(api_pipes))
    for p in sorted(EXPECTED_PIPELINE_LANES):
        d = os.path.join([REDACTED 2026-11-05], p)
        check(os.path.isfile(os.path.join(d, "tool.json"))
              and os.path.isfile(os.path.join(d, "agents", "AGENT.md"))
              and os.path.isdir(os.path.join(d, "agents", "skills")),
              "S3: pipeline %s ships tool.json + agents bundle + skills" % p)

    # S7: the operator-dictated mannequin law rides both trellis flows
    for p, sk_name in (("humanoid-flow", "humanoid-pipeline"),
                       ("non-humanoid-flow", "prop-pipeline")):
        sp = os.path.join(repo, "pipelines", p, "agents", "skills",
                          sk_name, "SKILL.md")
        try:
            with open(sp, encoding="utf-8") as f:
                body = f.read().lower()
            check("mannequin" in body and "negative prompt" in body,
                  "S7: %s carries the mannequin negative-prompt law" % p)
        except OSError:
            check(False, "S7: %s skill file present" % p)

    # ---------------- dynamic: boot the gateway ------------------- #
    binpath = os.path.join(build, "inference_cli")
    if not os.path.isfile(binpath):
        print("SKIP: inference_cli not built")
        return 0
    port = free_port()
    # (leak gate) sandbox env: never the real ComfyUI.
    cfg = "/tmp/bundles_endpoint_%d.json" % port
    with open(cfg, "w") as f:
        json.dump({"url": "http://127.0.0.1:9"}, f)
    genv = dict(os.environ)
    genv["COMFYUI_ENDPOINT_CONFIG"] = cfg
    genv["INFERENCE_TEST_SANDBOX"] = "1"
    srv = subprocess.Popen(
        [binpath, "serve", "--port", str(port), "--plugin-dir", build,
         "--catalog-dir", repo],
        cwd=build, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        env=genv)

    base = "http://127.0.0.1:%d" % port

    def get(path, tries=50):
        last = None
        for _ in range(tries):
            try:
                with urllib.request.urlopen(base + path, timeout=5) as r:
                    return json.loads(r.read().decode("utf-8"))
            except urllib.error.HTTPError as e:
                return json.loads(e.read().decode("utf-8", "replace"))
            except Exception as e:
                last = e
                time.sleep(0.2)
        raise last

    try:
        get("/v1/health")

        bundles = {}
        for lane in sorted(EXPECTED_LANES):
            d = get("/v1/cards/%s/bundle" % lane)
            tools = [t["name"] for t in d.get("tools", [])]
            skills = [s["id"] for s in d.get("skills", [])]
            bundles[lane] = (tools, skills)
            check(bool(tools) and bool(skills),
                  "D1: %s serves tools=%d skills=%d"
                  % (lane, len(tools), len(skills)))
            bad = sorted(t for t in FORBIDDEN[lane]
                         if any(t in s for s in skills))
            check(not bad,
                  "D4: %s free of foreign terms%s"
                  % (lane, (" " + str(bad)) if bad else ""))

        leaks = []
        seen = {}
        for lane, (tools, _) in bundles.items():
            for t in tools:
                if t in seen and seen[t] != lane:
                    leaks.append((t, seen[t], lane))
                seen.setdefault(t, lane)
        check(not leaks, "D2: zero cross-lane tool leaks %s" % (leaks or ""))

        lanes = sorted(EXPECTED_LANES)
        dupes = [(a, b) for i, a in enumerate(lanes)
                 for b in lanes[i + 1:] if bundles[a] == bundles[b]]
        check(not dupes, "D3: all bundles pairwise unique %s" % (dupes or ""))

        for lane in sorted(EXPECTED_LANES):
            sk = get("/v1/skills?lane=%s" % lane)
            ids = {s["id"] for s in sk.get("skills", [])}
            check(ids == set(bundles[lane][1]),
                  "D5: skills door == bundle door for %s" % lane)

        # D11: every advertised skill id READABLE through the skill
        # door. The bundle doors advertise ids; the read door must
        # serve them. Catches namespace gaps (pipeline:*/card:* 404s)
        # and dash/underscore probe misses in one sweep.
        unreadable = []
        for lane in sorted(EXPECTED_LANES):
            for sid in bundles[lane][1]:
                d = get("/v1/skills/%s" % sid)
                content = d.get("content", "")
                if not content or len(content) < 50 or "error" in d:
                    unreadable.append((lane, sid))
        check(not unreadable,
              "D11: all %d advertised skill ids readable through the "
              "skill door%s"
              % (sum(len(b[1]) for b in bundles.values()),
                 (" " + str(unreadable[:4])) if unreadable else ""))

        full = get("/v1/skills")
        n_full = len(full.get("skills", []))
        n_lane = len(get("/v1/skills?lane=tts").get("skills", []))
        check(n_lane < n_full / 2,
              "D6: ?lane=tts scoped (%d << full %d)" % (n_lane, n_full))

        t1 = get("/v1/card-tools?lane=humanoid-flow")
        t2 = get("/v1/card-tools?lane=motion-gen")
        check([t["name"] for t in t1] == ["humanoid_flow"],
              "D7: card-tools serves the pipeline manifest")
        check([t["name"] for t in t2] == ["motion_card"],
              "D7: card-tools lane filter exact for motion-gen")

        yl = get("/v1/pipelines/yaml/list")
        names = {p["name"] for p in yl.get("pipelines", [])}
        check(names == EXPECTED_PIPELINE_LANES,
              "D8: yaml list == the curated flows (got %s)" % sorted(names))

        cat = get("/v1/model-catalog")
        cat_cards = {c["id"] for c in cat.get("cards", [])}
        check(cat_cards == EXPECTED_CARD_LANES,
              "D9: catalog cards == the ten lanes (got %s)"
              % sorted(cat_cards))

        ids = [s["id"] for s in full.get("skills", [])]
        check(any(i.startswith("card:") for i in ids)
              and any(i.startswith("pipeline:") for i in ids),
              "D10: full index has card:* and pipeline:* rows")
    finally:
        srv.terminate()
        try:
            srv.wait(timeout=5)
        except subprocess.TimeoutExpired:
            srv.kill()

    print()
    print("%d checks, %d failures" % (n_pass[0], len(failures)))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())

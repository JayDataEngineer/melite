#!/usr/bin/env python3
"""Agent bundle-chain regression suite (BUNDLE LAW round 2, 2026-08-31).

The agent door's prompt must carry the FULL chain — lane bundle + the
model the lane's tool names + the model's declared base family. The
hole: h3-prompt-writing / prompt-enhance / advanced-usage sat on the
base h3 model while video agents composed prompts blind.

Dry-fire law: this suite exercises the REAL bundle assembly through
the dry_run door — no dsh spawn, no LLM call, no GPU. It burns
nothing and finishes in seconds.

  C1  every lane dry-fires (200 + inventory)
  C2  every lane skill on disk appears under [lane] provenance
  C3  the tool's model dir resolves: MODEL CARD + model skills appear
  C4  family.base (when declared) resolves: MODEL CARD + base skills
  C5  no BUNDLE WARNING ever (a model the tool names must exist)
  C6  USER REQUEST lands LAST (the request is the actionable tail)
  C7  mirror dedupe: byte-identical skill content appears once
  C8  provenance is explicit: no untagged '# SKILL:' headers

Stdlib only. Boots the real inference_cli (catalog/filesystem only).

Usage: test_agent_bundle_chain.py --repo-dir REPO --build-dir BUILD
"""

import argparse
import json
import os
import re
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request

FAIL = 0
PASS = 0


def check(ok, label):
    global FAIL, PASS
    if ok:
        PASS += 1
        print("  ok   %s" % label)
    else:
        FAIL += 1
        print("  FAIL %s" % label)


def free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p


def find_model_dir(repo, model):
    """plugins/<plugin>/models/<genre>/<model> — mirror of the C walker."""
    plugins = os.path.join(repo, "plugins")
    if not os.path.isdir(plugins):
        return None
    for plug in sorted(os.listdir(plugins)):
        models = os.path.join(plugins, plug, "models")
        if not os.path.isdir(models):
            continue
        for genre in sorted(os.listdir(models)):
            cand = os.path.join(models, genre, model)
            # a model dir carries model.yaml — fragments (nodes.yaml-only
            # shadows) are not models; mirrors the C walker's rule
            if os.path.isfile(os.path.join(cand, "model.yaml")):
                return cand
    return None


def unit_inventory(root):
    """(agent_md_present, [skill names]) for one bundle unit dir."""
    agent_md = None
    for rel in ("AGENT.md", "agents/AGENT.md"):
        p = os.path.join(root, rel)
        if os.path.isfile(p):
            agent_md = p
            break
    skills = []
    for tier in ("agents", "agents/skills"):
        d = os.path.join(root, tier)
        if not os.path.isdir(d):
            continue
        for name in sorted(os.listdir(d)):
            if os.path.isfile(os.path.join(d, name, "SKILL.md")):
                skills.append(name)
    return agent_md, sorted(set(skills))


def model_base(model_dir):
    """family.base: <id> scrape — mirror of the C scraper."""
    p = os.path.join(model_dir, "model.yaml")
    if not os.path.isfile(p):
        return None
    in_family = False
    try:
        with open(p, encoding="utf-8") as f:
            for line in f:
                if line[0] not in " \t#\n\0":
                    in_family = line.startswith("family:")
                    continue
                if not in_family:
                    continue
                m = re.search(r"base:\s*[\"']?([^\s\"']+)", line)
                if m:
                    return m.group(1)
    except OSError:
        return None
    return None


def main():
    global FAIL
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo-dir", required=True)
    ap.add_argument("--build-dir", required=True)
    args = ap.parse_args()
    repo = os.path.abspath(args.repo_dir)
    build = os.path.abspath(args.build_dir)

    lanes = []
    cards_root = os.path.join(repo, "plugins")
    for plug in sorted(os.listdir(cards_root)):
        cdir = os.path.join(cards_root, plug, "cards")
        if not os.path.isdir(cdir):
            continue
        for lane in sorted(os.listdir(cdir)):
            if os.path.isfile(os.path.join(cdir, lane, "tool.json")):
                lanes.append((lane, os.path.join(cdir, lane)))
    print("lanes with card tools: %d" % len(lanes))

    binpath = os.path.join(build, "inference_cli")
    if not os.path.isfile(binpath):
        print("SKIP: inference_cli not built")
        return 0

    port = free_port()
    srv = subprocess.Popen(
        [binpath, "serve", "--port", str(port), "--plugin-dir", build,
         "--catalog-dir", repo],
        cwd=build, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    base = "http://127.0.0.1:%d" % port

    def req(path, body=None, tries=50):
        last = None
        for _ in range(tries):
            try:
                data = json.dumps(body).encode() if body is not None else None
                r = urllib.request.Request(
                    base + path, data=data,
                    headers={"content-type": "application/json"},
                    method="POST" if data else "GET")
                with urllib.request.urlopen(r, timeout=5) as resp:
                    return resp.status, json.loads(resp.read().decode())
            except urllib.error.HTTPError as e:
                return e.code, json.loads(e.read().decode("utf-8", "replace"))
            except Exception as e:  # server still booting
                last = e
                time.sleep(0.2)
        raise last

    try:
        req("/v1/health")

        for lane, ldir in lanes:
            print("lane %s" % lane)
            # ---- expected chain, from disk ---- #
            _, lane_skills = unit_inventory(ldir)
            tool = json.load(open(os.path.join(ldir, "tool.json"), encoding="utf-8"))
            model = tool.get("model", "")
            mdir = find_model_dir(repo, model) if model else None
            m_agent, m_skills = unit_inventory(mdir) if mdir else (None, [])
            basefam = model_base(mdir) if mdir else None
            bdir = find_model_dir(repo, basefam) if basefam else None
            b_agent, b_skills = unit_inventory(bdir) if bdir else (None, [])

            # ---- C1: dry fire ---- #
            st, d = req("/v1/cards/%s/agent" % lane,
                        {"prompt": "bundle chain audit", "dry_run": True})
            check(st == 200 and "bundle" in d,
                  "C1: dry_run 200 + inventory (%s)" % st)
            if "bundle" not in d:
                continue
            inv = d["bundle"]

            def has(hdr):
                return any(h.startswith(hdr) for h in inv)

            # ---- C2: lane skills ---- #
            for s in lane_skills:
                check(has("# SKILL [lane]: %s" % s),
                      "C2: lane skill '%s' rides the prompt" % s)

            # ---- C3: model unit ---- #
            if mdir:
                check(has("# MODEL CARD [model:%s]" % model),
                      "C3: model card doc [%s]" % model)
                for s in m_skills:
                    check(has("# SKILL [model:%s]: %s" % (model, s)),
                          "C3: model skill '%s'" % s)
            else:
                check(model == "" or not model,
                      "C3: tool model '%s' resolves on disk" % model)

            # ---- C4: base unit ---- #
            if basefam:
                check(bdir is not None,
                      "C4: family.base '%s' resolves on disk" % basefam)
                if bdir:
                    check(has("# MODEL CARD [model:%s]" % basefam),
                          "C4: base card doc [%s]" % basefam)
                    for s in b_skills:
                        check(has("# SKILL [model:%s]: %s" % (basefam, s)),
                              "C4: base skill '%s'" % s)

            # ---- C5: no warnings ---- #
            check(not any("WARNING" in h for h in inv),
                  "C5: zero BUNDLE WARNINGs")

            # ---- C6 + C7 + C8: audit file content ---- #
            af = os.path.join(build, d["file"])
            if os.path.isfile(af):
                body = open(af, encoding="utf-8").read()
                tail = body[body.rfind("# USER REQUEST"):]
                check(tail.strip().endswith("bundle chain audit"),
                      "C6: USER REQUEST is last + carries the ask")
                check("# SKILL:" not in body,
                      "C8: every skill carries provenance")
                # C7: byte-identical mirrors appear once — count blocks
                blocks = re.split(r"^# SKILL \[[^\]]+\]: (\S+)$",
                                  body, flags=re.M)
                names = blocks[1::2]
                dupes = [n for n in set(names) if names.count(n) > 1]
                # same name twice is legal ONLY if contents differ
                for n in dupes:
                    chunks = re.split(
                        r"^# SKILL \[[^\]]+\]: %s$\n" % re.escape(n),
                        body, flags=re.M)[1:]
                    chunks = [re.split(r"^# ", c, flags=re.M)[0] for c in chunks]
                    check(len(set(chunks)) == len(chunks),
                          "C7: mirrored '%s' differs (no true dupe)" % n)
            else:
                check(False, "C6: audit file exists")
    finally:
        srv.terminate()
        try:
            srv.wait(timeout=5)
        except Exception:
            srv.kill()

    print("\n%d passed, %d failed" % (PASS, FAIL))
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())

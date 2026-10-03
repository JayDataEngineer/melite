#!/usr/bin/env python3
"""One agent turn through the estate SERVER mount.

Materialize the harness home first (recipe -> generated state):

    uv run python tools/provision.py dsh

Then, with a credential in the environment:

    DEEPSEEK_API_KEY=... uv run python \
        packages/harness/dsh/examples/server_turn.py \
        "Summarize the queue laws in AGENTS.md"

cwd defaults to the repo: the agent reads the estate laws
(instruction discovery). No skill surface rides the mount — the
estate's tools are the provisioner bundle
(dev_docs/deployment/dsh-profiles.md).
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from deepseek_harness import DeepSeekHarness

# repo/packages/harness/dsh/examples/server_turn.py -> repo root
REPO = Path(__file__).resolve().parents[4]
HOME = Path(os.environ.get("MELITE_DSH_HOME",
                           REPO / "data" / "runtime" / "dsh-harness-home"))


def main() -> None:
    parser = argparse.ArgumentParser(description="One estate server-mount turn")
    parser.add_argument("prompt", help="Task for the agent")
    parser.add_argument("--session-id")
    parser.add_argument("--provider",
                        default=os.environ.get("DSH_PROVIDER", "deepseek-official"))
    parser.add_argument("--model",
                        default=os.environ.get("DSH_MODEL", "deepseek-v4-flash"))
    parser.add_argument("--cwd", default=str(REPO),
                        help="agent workspace (default: the repo)")
    parser.add_argument("--max-tokens", type=int, default=8192)
    args = parser.parse_args()

    if not (HOME / "profiles" / "estate").is_dir():
        # LANE LAW (li-bu class, the audit's F-12): the profile must
        # come from the LIVING provision doors — tools/provision.py is
        # gone. Repo-side the provisioner renders+installs it:
        #   node packages/harness/provisioner/bin/infer-provision.mjs all
        # and a lane boots only through the sibling provisioner:
        #   ~/Documents/programs/active/dsh-provision/apply.sh launch --lane X
        sys.exit("harness home missing the estate profile — install it "
                  "with packages/harness/provisioner/bin/infer-provision.mjs "
                  "(lanes boot only through dsh-provision apply.sh launch)")

    with DeepSeekHarness(
        provider=args.provider,
        model=args.model,
        max_tokens=args.max_tokens,
        cwd=args.cwd,
        dsh_home=str(HOME),
        profile="estate",
    ) as harness:
        result = harness.run(args.prompt, session_id=args.session_id)

    print(result.final_response)
    print("\n[session %s | finish: %s]" % (result.session_id, result.finish_reason),
          file=sys.stderr)


if __name__ == "__main__":
    main()

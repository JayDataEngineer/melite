#!/usr/bin/env bash
# commission-supervisor.sh -- the transient-vs-quota law (§25's
# design question, answered; receipt: attempt034, 2026-09-24 — the
# maker died on turn TWO to "429 rate_limit_exceeded ... Please
# retry after a brief wait", a TRANSIENT gate, with the whole boot
# wasted and no transcript row).
#
# THE LAW the classifier owns: a rate-limit body that names QUOTA
# (usage limit | quota | RESOURCE_EXHAUSTED | GoUsageLimit | a
# reset window) is a WALL — stop per the STOP LAW, exit 75, token
# (never burn past it). A rate-limit body WITHOUT quota language
# (rate_limit_exceeded | overloaded | 429 alone) is a MOMENT — the
# message itself sanctions "retry after a brief wait", so the
# supervisor relaunches the commission with backoff, capped. Every
# other death passes through loud, no token, no relaunch (the
# queue-lane no-silent-absorbs law).
#
# The relaunch inherits its state the §28 way: the transcript IS
# the durable loop state (the maker re-reads brief + transcript);
# a death before the first transcript row just re-runs the brief.
#
# Usage: commission-supervisor.sh <launch-prompt-file> [out-prefix]
#   <launch-prompt-file>  a file holding the COMPLETE converged
#                         launch prompt (the runbook's laws ride in
#                         the prompt, not the brief — never bare).
#   [out-prefix]          attempt logs land at <prefix>-attempt<k>.log
# Knobs (tests stub the binary + zero the backoff):
#   SUPERVISOR_DSH_BIN       (default /home/user/.local/bin/dsh)
#   SUPERVISOR_PROFILE       (default melite-headless)
#   SUPERVISOR_STATE_ROOT    (default the repo root)
#   SUPERVISOR_MAX_ATTEMPTS  (default 3)
#   SUPERVISOR_BACKOFF_S     (default 60)
# Exit: 0 commission exited 0; 75 rate-wall (token written); any
#   other code is the commission's own, passed through loud.
set -uo pipefail

PROMPT_FILE="${1:?usage: commission-supervisor.sh <launch-prompt-file> [out-prefix]}"
OUT_PREFIX="${2:-/tmp/commission}"
DSH_BIN="${SUPERVISOR_DSH_BIN:-/home/user/.local/bin/dsh}"
PROFILE="${SUPERVISOR_PROFILE:-melite-headless}"
STATE_ROOT="${SUPERVISOR_STATE_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
MAX_ATTEMPTS="${SUPERVISOR_MAX_ATTEMPTS:-3}"
BACKOFF_S="${SUPERVISOR_BACKOFF_S:-60}"
export PATH="$HOME/.local/share/mise/installs/node/24.21.0/bin:$PATH"

TOKEN="${OUT_PREFIX}-resume.token.md"

quota_wall() {
  # A rate limit that names a PLAN/QUOTA window — the wall, never
  # retried here (the STOP LAW owns it). Order matters: quota words
  # are checked BEFORE the transient pattern; a body carrying both
  # is a wall (the dead-key receipt: "429 Go usage limit exceeded").
  grep -qiE 'usage[ _-]?limit|quota|resource_exhausted|GoUsageLimit' "$1"
}

boot_flake() {
  # THE STRUCTURAL LAW (035 attempts 7, 10, 11 — 2026-09-24): the
  # flake's WORDING varies ("not available on my callable tool
  # surface", "does not expose the required read or bash tools",
  # "don't have a file-reading or shell tool") — phrasing-greps
  # whiffed on attempt 11. The INVARIANT: a lawful commission
  # ALWAYS writes its transcript (the brief's own contract); a
  # flaked boot never mints runs and never writes it. Exit 0 with
  # the done-marker ABSENT = boot flake, relaunch. (The legacy
  # door-absence greps stay as a belt for marker-less callers.)
  if [ -n "${SUPERVISOR_DONE_MARKER:-}" ]; then
    [ ! -f "${SUPERVISOR_DONE_MARKER}" ]
    return $?
  fi
  grep -qiE 'not available on my callable tool surface|cannot make an absent tool available|does not expose the required|file-reading or shell tool' "$1"
}

transient_gate() {
  # A rate limit with no quota language — the moment. The message
  # itself sanctions the retry ("Please retry after a brief wait").
  grep -qiE 'rate[ _-]?limit|overloaded|429' "$1"
}

write_token() {
  # kind reset-token brief attempts last-words resume — §25's shape.
  local kind="$1" log="$2"
  {
    echo "# resume token -- ${kind} rate wall (do NOT edit by hand)"
    echo
    echo "- brief prompt: ${PROMPT_FILE}"
    echo "- last attempt log: ${log}"
    echo "- attempts made: ${ATTEMPT}"
    echo
    echo '## last maker words (the attempt log tail)'
    tail -20 "$log"
    echo
    echo '## resume'
    echo 'Re-invoke the supervisor with the same prompt file once the window'
    echo 'passes; the maker re-reads brief + transcript (§28 — the transcript'
    echo 'IS the durable loop state) and continues instead of restarting.'
  } >"$TOKEN"
  echo "commission-supervisor: ${kind} rate wall after ${ATTEMPT} attempt(s) -- token at ${TOKEN}" >&2
}

ATTEMPT=0
while :; do
  ATTEMPT=$((ATTEMPT + 1))
  LOG="${OUT_PREFIX}-attempt${ATTEMPT}.log"
  MELITE_HEADLESS=1 MELITE_STATE_ROOT="${STATE_ROOT}" \
    node "${DSH_BIN}" --profile "${PROFILE}" "$(cat "${PROMPT_FILE}")" \
    >"${LOG}" 2>&1
  CODE=$?

  if [ "$CODE" -eq 0 ]; then
    # THE BOOT-FLAKE GATE (035 attempts 7+10, 2026-09-24): a maker
    # that booted WITHOUT its file doors exits 0 with a blocked
    # report ("not available on my callable tool surface") — a
    # clean exit masking an infra moment, not a commission verdict.
    # Same class as a transient rate gate: relaunch, capped.
    if boot_flake "${LOG}"; then
      if [ "$ATTEMPT" -ge "$MAX_ATTEMPTS" ]; then
        echo "commission-supervisor: boot flake capped at ${ATTEMPT} attempt(s) -- passing the last log through" >&2
        exit 0
      fi
      echo "commission-supervisor: boot flake (attempt ${ATTEMPT}) -- relaunching in ${BACKOFF_S}s" >&2
      sleep "${BACKOFF_S}"
      continue
    fi
    exit 0
  fi

  if quota_wall "${LOG}"; then
    write_token quota "${LOG}"
    exit 75
  fi

  if transient_gate "${LOG}"; then
    if [ "$ATTEMPT" -ge "$MAX_ATTEMPTS" ]; then
      write_token transient-capped "${LOG}"
      exit 75
    fi
    echo "commission-supervisor: transient rate gate (attempt ${ATTEMPT}, exit ${CODE}) -- relaunching in ${BACKOFF_S}s" >&2
    sleep "${BACKOFF_S}"
    continue
  fi

  # Any other death: the commission's own code, loud, no token.
  exit "$CODE"
done

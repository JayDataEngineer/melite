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
#   SUPERVISOR_DSH_BIN       (default: first dsh on PATH, run via node)
#   SUPERVISOR_PROFILE       (default headless)
#   SUPERVISOR_DSH_PATCH     optional --patch overlay path, passed to
#                             the launcher before the prompt (machine-
#                             local provider rows compose with the
#                             repo-rendered estate rows — apply.sh's
#                             own call-time overlay shape; empty = off)
#   SUPERVISOR_STATE_ROOT    (default the repo root)
#   SUPERVISOR_MAX_ATTEMPTS  (default 3)
#   SUPERVISOR_BACKOFF_S     (default 60)
#   SUPERVISOR_LOCK_WAIT_S   (default 1800) the pre-launch turn-wait
#                             on the queue lock (two makers, one
#                             queue: the second WAITS, never demotes)
#   SUPERVISOR_DONE_MARKER   exact transcript path (the legacy law)
#   SUPERVISOR_DONE_GLOB     transcript glob (the collision-law
#                             names): a file matching it whose mtime
#                             is NEWER than this supervisor's boot
#                             counts as the done marker — the maker
#                             mints transcript-<slug>-<HHMM>.md at
#                             FINISH time, so a caller-predicted
#                             exact path never matches (the 2026-09-26
#                             mismatchint: two successful commissions
#                             read as boot flakes and burned duplicate
#                             attempts)
# Exit: 0 commission exited 0; 75 rate-wall (token written); any
#   other code is the commission's own, passed through loud.
set -uo pipefail

PROMPT_FILE="${1:?usage: commission-supervisor.sh <launch-prompt-file> [out-prefix]}"
OUT_PREFIX="${2:-/tmp/commission}"
DSH_BIN="${SUPERVISOR_DSH_BIN:-$(command -v dsh 2>/dev/null || echo dsh)}"
PROFILE="${SUPERVISOR_PROFILE:-headless}"
PATCH_ARGS=()
[ -n "${SUPERVISOR_DSH_PATCH:-}" ] && PATCH_ARGS+=(--patch "${SUPERVISOR_DSH_PATCH}")
STATE_ROOT="${SUPERVISOR_STATE_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
LOCK_WAIT_S="${SUPERVISOR_LOCK_WAIT_S:-1800}"
# THE GLOB LAW'S CLOCK ZERO: any transcript minted from NOW on is
# THIS supervisor's — an older same-pattern file never satisfies it.
BOOT_TS="$(date +%s)"
# §23 CROSS-ROOTS (the media-tab catch, 2026-09-24): the maker mints
# under STATE_ROOT/output while the user's 3088 GUI estate serves
# data/runs/output — two trees, ONE manifest. Without this env the
# maker's run doors (status/list/view) answer unknown-run for the
# user-lane's runs, and (the operator's catch) the GUI's media tab
# never lists the maker's films. Own root always leads; extras name
# the user's tree explicitly (roots are named, never inferred).
export MELITE_STATE_ROOTS="${SUPERVISOR_STATE_ROOTS:-${STATE_ROOT}/data/runs}"
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

marker_present() {
  # the exact path (legacy) — a plain -f
  if [ -n "${SUPERVISOR_DONE_MARKER:-}" ] && [ -f "${SUPERVISOR_DONE_MARKER}" ]; then
    return 0
  fi
  # the glob (collision-law names): any file matching the pattern
  # whose mtime is at or after BOOT_TS — the supervisor's own mint,
  # not a sibling session's older transcript in the shared namespace
  if [ -n "${SUPERVISOR_DONE_GLOB:-}" ]; then
    local f mt
    for f in ${SUPERVISOR_DONE_GLOB}; do
      [ -f "$f" ] || continue
      mt="$(stat -c %Y "$f" 2>/dev/null || echo 0)"
      if [ "${mt:-0}" -ge "${BOOT_TS}" ]; then return 0; fi
    done
  fi
  return 1
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
  if [ -n "${SUPERVISOR_DONE_MARKER:-}" ] || [ -n "${SUPERVISOR_DONE_GLOB:-}" ]; then
    if marker_present; then return 1; fi
    return 0
  fi
  grep -qiE 'not available on my callable tool surface|cannot make an absent tool available|does not expose the required|can.t access the (required|requested)|cannot access the (required|requested)|unable to access the (required|requested)|file-reading or shell tool' "$1"
}

lock_holder_alive() {
  # the maker lane's queue lock: STATE_ROOT/gateway.lock holds the
  # owning pid (queueLock.acquireLock). A live holder (kill -0
  # answers, EPERM included) means a sibling maker OWNS the queue —
  # the queue is the serializer, the lock is the turn signal.
  local lock="$1" pid
  [ -f "$lock" ] || return 1
  pid="$(cat "$lock" 2>/dev/null | tr -d '[:space:]')"
  case "$pid" in ''|*[!0-9]*) return 1 ;; esac
  kill -0 "$pid" 2>/dev/null
}

wait_for_queue_lock() {
  # TWO MAKERS, ONE QUEUE (the operator's law, 2026-09-26: "two
  # makers shouldn't be a problem with the queue system" — and with
  # the turn-wait they are not): a second supervisor over the same
  # state root does NOT race its maker into a seatless boot (the
  # demotion chain: QueueService throws on the live-pid lock →
  # RunsRuntimeService's hard inject on "queue" is unsatisfied →
  # the runs seat never mounts → every runs-family call answers
  # the chat-lane voice — receipts: transcripts 0014/0015/0025,
  # 2026-09-26). It WAITS its turn at the lock, then launches into
  # a fully-seated lane. Bound: LOCK_WAIT_S; on expiry it launches
  # anyway and the maker's own loud refusal (never a silent demote)
  # rides the transient gate's relaunch.
  local lock="${STATE_ROOT}/gateway.lock" waited=0
  while [ "${LOCK_WAIT_S}" -gt 0 ] && lock_holder_alive "$lock"; do
    if [ "$waited" -eq 0 ]; then
      echo "commission-supervisor: queue lock held by a live sibling maker — waiting our turn (bound ${LOCK_WAIT_S}s)" >&2
    elif [ $((waited % 30)) -eq 0 ]; then
      echo "commission-supervisor: still waiting on the queue lock (${waited}s / ${LOCK_WAIT_S}s)" >&2
    fi
    sleep 5
    waited=$((waited + 5))
    if [ "$waited" -ge "$LOCK_WAIT_S" ]; then
      echo "commission-supervisor: lock wait expired after ${waited}s — launching; the maker's own boot gate refuses loud if the sibling still holds it" >&2
      return 0
    fi
  done
  return 0
}

transient_gate() {
  # A rate limit with no quota language — the moment. The message
  # itself sanctions the retry ("Please retry after a brief wait").
  # THE EMPTY-RESPONSE ARM (035 attempt-13, 2026-09-24):
  # PI_AI_ERROR: Provider returned an empty response — a provider
  # moment, no quota language, retryable.
  # THE LOCK-EXPIRY ARM (2026-09-26): the estate queue's own loud
  # refusal ("estate-queue: gateway.lock held by live pid" /
  # "[gateway] REFUSING TO START") is a TURN problem, not a
  # commission death — relaunch under the same bounded policy.
  grep -qiE 'rate[ _-]?limit|overloaded|429|provider returned an empty response|gateway\.lock held by live pid|REFUSING TO START' "$1"
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
  # THE TURN-WAIT: never launch a maker into a lock its sibling owns
  wait_for_queue_lock
  MELITE_HEADLESS=1 MELITE_STATE_ROOT="${STATE_ROOT}" \
    node "${DSH_BIN}" --profile "${PROFILE}" ${PATCH_ARGS[@]+"${PATCH_ARGS[@]}"} "$(cat "${PROMPT_FILE}")" \
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

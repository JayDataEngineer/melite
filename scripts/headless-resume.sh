#!/usr/bin/env bash
# headless-resume.sh -- the quota-stop wrapper (roadmap section 25).
#
# A headless maker commission that dies on LLM quota must STOP with
# a resume token, never a silent residue: the brief, the transcript
# tails, and the exact re-invocation that resumes it. The maker
# resumes from brief + transcript (the transcript IS the durable
# loop state -- the headless app owns no mid-loop snapshot), so the
# token records WHERE the next commission picks up, not a snapshot.
#
# Usage: headless-resume.sh <brief-file> [out-prefix] [timeout-s]
#   out-prefix defaults to /tmp/chat; timeout-s defaults to 540.
# Exit: 0 the commission exited 0; 75 quota-death (EX_TEMPFAIL --
#   the token at <out-prefix>-resume.token.md says when to retry);
#   any other code is the commission's own (loud, no token).
#
# Knobs (tests stub the binary; operators inherit the recipe):
#   HEADLESS_DSH_BIN  the dsh binary (default: the recipe path)
#   HEADLESS_PROFILE  the headless profile (default: headless)
set -uo pipefail

BRIEF="${1:?usage: headless-resume.sh <brief-file> [out-prefix] [timeout-s]}"
OUT="${2:-/tmp/chat}"
TIMEOUT_S="${3:-540}"
DSH_BIN="${HEADLESS_DSH_BIN:-/home/user/.local/bin/dsh}"
PROFILE="${HEADLESS_PROFILE:-headless}"
export PATH="$HOME/.local/share/mise/installs/node/24.21.0/bin:$PATH"

OUT_TXT="${OUT}-out.txt"
OUT_ERR="${OUT}-err.txt"
TOKEN="${OUT}-resume.token.md"

timeout "$TIMEOUT_S" node "$DSH_BIN" --profile "$PROFILE" "$(cat "$BRIEF")" >"$OUT_TXT" 2>"$OUT_ERR"
CODE=$?

# THE CLASSIFIER (the only logic -- everything else is the recipe):
# quota-death speaks 429/quota/RESOURCE_EXHAUSTED/rate-limit on the
# transcript stderr (the loop own voice, attempt006 receipt).
if grep -qiE '429|quota|resource_exhausted|rate.limit|overloaded' "$OUT_ERR"; then
  RESET_LINE="$(grep -oiE 'reset[^"]{0,80}' "$OUT_ERR" | head -1)"
  CALLS="$(grep -c tool "$OUT_ERR" || true)"
  {
    echo '# resume token -- quota death (do NOT edit by hand)'
    echo
    echo "- brief: $BRIEF"
    echo "- stdout: $OUT_TXT (maker last words are the tail)"
    echo "- stderr: $OUT_ERR (the transcript -- $CALLS tool-call lines)"
    echo "- exit: $CODE"
    echo "- reset: ${RESET_LINE:-unknown -- retry after the usual window}"
    echo
    echo '## last stdout words'
    tail -20 "$OUT_TXT"
    echo
    echo '## resume'
    echo 'Re-invoke this same script with the same brief once the reset passes;'
    echo 'point the next brief at this token + the transcript above so the new'
    echo 'maker continues the loop instead of restarting it.'
  } >"$TOKEN"
  echo "headless-resume: quota death (exit $CODE) -- token at $TOKEN" >&2
  exit 75
fi

exit "$CODE"

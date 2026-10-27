#!/usr/bin/env node
// push-set-sentry.mjs — THE PUSH-SET SENTRY (audit 018 C3b): lefthook
// 2.x SKIPS every pre-push job when the push carries an EMPTY push
// set (tag-only pushes print "no matching push files", probe-verified
// 2026-10-27 — and `skip: false` does NOT exempt: D2 proved the
// empty-set skip takes skipless jobs too). The skip is SAFE — a push
// whose set is empty carries zero new commits, so no unjudged code
// can ride it (the hook-config wall proves the lemma) — but it must
// never be SILENT. This job is the hook's last line on every shape
// where a set EXISTS: it derives the push set from git itself and
// PRINTS it (count + basis + tip), so the hook summary names what
// the scoped gates just judged. On the empty set it stands down WITH
// the other jobs — its summary line prints the same "(skip)", and
// the wall (not this script) is the seat that proves that shape
// carries nothing new.
//
// THE DERIVED SET (no hand template, no shell pipes): upstream..HEAD
// on a tracking branch (the shape lefthook itself resolves); HEAD
// --not --remotes on detached HEAD / no upstream / unresolvable
// upstream. Empty means the push truly carries nothing new; non-empty
// means the scoped gates judged that many commits this seat.
import { execFileSync } from "node:child_process";

function sh(bin, args, opts = {}) {
  return execFileSync(bin, args, { encoding: "utf8", ...opts }).trim();
}

function upstreamRef() {
  try {
    return sh("git", ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
  } catch {
    return null;
  }
}

function currentBranch() {
  try {
    const b = sh("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
    return b === "HEAD" ? null : b;
  } catch {
    return null;
  }
}

function pushSet() {
  const branch = currentBranch();
  const u = branch === null ? null : upstreamRef();
  if (u !== null) {
    try {
      const out = sh("git", ["rev-list", "--no-merges", `${u}..HEAD`, "--"]);
      return { commits: out === "" ? [] : out.split("\n"), basis: `upstream ${u}..HEAD` };
    } catch {
      // fall through to the remotes basis below
    }
  }
  try {
    const out = sh("git", ["rev-list", "--no-merges", "HEAD", "--not", "--remotes", "--"]);
    return { commits: out === "" ? [] : out.split("\n"), basis: "HEAD --not --remotes" };
  } catch {
    return { commits: [], basis: "unresolvable" };
  }
}

const { commits, basis } = pushSet();
if (commits.length === 0) {
  console.log(`push-set-sentry: push set is EMPTY (basis ${basis}) — the tag-only push law: nothing new rides, every push_files-scoped gate stood down; this sentry ran with skip:false so the silence is LOUD.`);
} else {
  console.log(`push-set-sentry: push set holds ${commits.length} commit(s) (basis ${basis}) — the push_files-scoped gates judged this set above; skipping them was lefthook's law on shapes with no matching files, NOT a commit here. Tip: ${commits[0]}`);
}

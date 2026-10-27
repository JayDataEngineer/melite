// THE INSTALL CONTRACT (audit 019 C2, operator order 2026-10-27: "SH
// scripts are out — no sh bullshit allowed"): the consumer install
// path is the dsh CLI over published assets — npm installs the CLI,
// the plugin verb resolves the profile, the rehearsal proves the
// sequence. The shell installer that duplicated that sequence
// consumer-side (scripts/install-from-release.sh) is killed, not
// merely unfavored: a second install door is a second thing to rot.
//
// THE WALL: the retired script stays gone (a resurrection reds), and
// the two consumer-facing documents teach exactly the npm/dsh door —
// the README and docs/guide/install.md name the CLI install and
// reference no shell installer. Docs are read from the tree the docs
// projector reads; the projected copies under website/ are build
// artifacts of these sources, not a second home.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REPO = join(import.meta.dirname, "..", "..", "..", "..");
const RETIRED = join(REPO, "scripts", "install-from-release.sh");
const README = readFileSync(join(REPO, "README.md"), "utf8");
const INSTALL_DOC = readFileSync(join(REPO, "docs", "guide", "install.md"), "utf8");

describe("the install contract (audit 019 C2: one door, the npm/dsh one)", () => {
  it("the retired shell installer stays gone (a resurrection reds)", () => {
    assert.equal(existsSync(RETIRED), false,
      "scripts/install-from-release.sh exists again — the second install " +
      "door is back; the consumer path is the dsh CLI, not a shell script " +
      "duplicating the rehearsal sequence (operator order 2026-10-27)");
  });

  it("both consumer documents teach the dsh CLI door", () => {
    for (const [name, text] of [["README.md", README], ["docs/guide/install.md", INSTALL_DOC]]) {
      assert.match(text, /npm install -g @deepseek-ai\/dsh/,
        `${name}: the npm install of the dsh CLI is the stated door`);
    }
  });

  it("no consumer document references a shell installer", () => {
    for (const [name, text] of [["README.md", README], ["docs/guide/install.md", INSTALL_DOC]]) {
      assert.doesNotMatch(text, /install-from-release|\.sh\b/,
        `${name}: references a shell installer — the sh door is killed, ` +
        "docs must not resurrect it in prose");
    }
  });
});

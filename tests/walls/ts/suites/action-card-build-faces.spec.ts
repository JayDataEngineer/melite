// action-card-build-faces.spec.ts — THE BUILD-FACE CENSUS (F6,
// nativity audit 2026-11-05). The motion action card shipped two
// build faces where one was a byte-identical twin
// (tsconfig.build-viewers.json ≡ tsconfig.build.json): a second
// `tsc -p` pass that compiled the same program with the same
// settings — cost without information, and a rotted setting edits
// one face while the other silently keeps the stale truth. The
// census judges the live tree: no action card carries a byte-twin
// build face, the retired face name is gone, and every build script
// references faces that exist.
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const CARDS = join(import.meta.dirname, "..", "..", "..", "..", "packages", "engines", "comfyui", "src", "action_cards");

/** Every directory under the action cards that carries build faces. */
function faceDirs(): string[] {
  const dirs: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, name.name);
      if (name.isDirectory()) walk(p);
      else if (name.isFile() && name.name.startsWith("tsconfig.build")) dirs.push(dir);
    }
  };
  walk(CARDS);
  return dirs;
}

describe("the action cards' build faces are single (F6)", () => {
  it("no directory carries two byte-identical build faces (the twin class)", () => {
    const offenders: string[] = [];
    for (const dir of new Set(faceDirs())) {
      const faces = readdirSync(dir).filter((n) => n.startsWith("tsconfig.build") && n.endsWith(".json"));
      for (let i = 0; i < faces.length; i++) {
        for (let j = i + 1; j < faces.length; j++) {
          const a = readFileSync(join(dir, faces[i]!), "utf8");
          const b = readFileSync(join(dir, faces[j]!), "utf8");
          if (a === b) offenders.push(`${dir}: ${faces[i]} ≡ ${faces[j]} (byte-twin — one face must die)`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the retired viewers face is gone — by name, from every card", () => {
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, name.name);
        if (name.isDirectory()) walk(p);
        else if (name.name.includes("build-viewers")) offenders.push(p);
      }
    };
    walk(CARDS);
    expect(offenders,
      "tsconfig.build-viewers.json was the byte-twin twin face (F6) — it must not return under that or any alias")
      .toEqual([]);
  });

  it("every build script runs only faces that exist", () => {
    // the script face: `tsc -p tsconfig.build-viewers.json &&` on a
    // deleted face is the rot the census exists to prevent — the
    // reference and the file must agree in BOTH directions.
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, name.name);
        if (name.isDirectory()) walk(p);
        else if (name.name === "package.json") {
          const pkg = JSON.parse(readFileSync(p, "utf8")) as { scripts?: Record<string, string> };
          const dirFiles = new Set(readdirSync(dir));
          for (const [script, cmd] of Object.entries(pkg.scripts ?? {})) {
            for (const m of cmd.matchAll(/tsc -p (tsconfig[\w.-]*\.json)/gu)) {
              if (!dirFiles.has(m[1]!)) offenders.push(`${p}: "${script}" runs ${m[1]} — no such face`);
            }
          }
        }
      }
    };
    walk(CARDS);
    expect(offenders).toEqual([]);
  });
});

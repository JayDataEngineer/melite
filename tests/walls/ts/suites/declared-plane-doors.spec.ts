// declared-plane-doors.spec.ts — OPTIONS RIDE ENUM ROWS ONLY.
//
// Break 1b's shape (2026-10-12): a ParamSpec row typed `string`
// carrying live `options` is DEAD SURFACE on the write plane —
// validateWriteRowsAgainstActions dispatches on `type` alone, so
// the string/image_list branch judged the value's type and never
// looked at the options. Whether it refused or ignored was never
// verified. The verified truth (probe 2026-10-12): it IGNORED the
// row — a string default passed while its options judged nothing,
// misleading every reader into a dropdown that never fires.
//
// THE LAW this wall holds: a NON-enum row carrying options REFUSES
// LOUD at the declared-plane door (packages/engines/comfyui-cordis/
// src/models/validate.ts — the dead-surface refusal). Options are
// the enum branch's to judge; every other shape carrying them is a
// declaration error, never a silent dropdown.
//
// WHAT THIS WALL ASSERTS:
// (1) a string row with options refuses, refusal text pinned
//     byte-exact (the door's own voice);
// (2) the same refusal fires for number, boolean, and image_list
//     rows carrying options (the law is per-shape, not per-string);
// (3) the lawful door still passes: optionless string/number rows
//     and enum rows WITH options judge values as before (the
//     refusal must not eat the legal surface);
// (4) the ESTATE SWEEP: every live family DECL's every action row
//     is walked (visited == the registry's own id count, derived
//     both sides — no literal to drift) and no non-enum row
//     carries options — a newly authored dead row reds naming
//     family + action + row.

import { describe, it } from "vitest";
import assert from "node:assert/strict";
import "../../../helpers/boot-models.ts";
import { registryIds, registryModel } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import {
  validateWriteRowsAgainstActions,
  type DeclaredSurface,
} from "../../../../packages/engines/comfyui-cordis/src/models/validate.ts";

const deadString: readonly DeclaredSurface[] = [{
  id: "probe",
  params: [{ name: "source", type: "string", options: ["a", "b"] }],
}];

const REFUSAL_RE =
  /probe defaults: 'source' declares string but carries options \[a, b\] — options ride enum rows only/;

describe("the declared-plane door refuses dead-surface options", () => {
  it("a string row carrying options refuses, in the door's own voice", () => {
    assert.throws(
      () => validateWriteRowsAgainstActions("probe", [{ where: "defaults", values: { source: "a" } }], deadString),
      REFUSAL_RE,
    );
  });

  it("number, boolean, and image_list rows carrying options refuse too", () => {
    const shapes = ["number", "boolean", "image_list"] as const;
    for (const type of shapes) {
      const surface: readonly DeclaredSurface[] = [{
        id: "probe",
        params: [{ name: "knob", type, options: ["x"] }],
      }];
      const value = type === "number" ? 1 : type === "boolean" ? true : ["x"];
      assert.throws(
        () => validateWriteRowsAgainstActions("probe", [{ where: "defaults", values: { knob: value } }], surface),
        new RegExp(`probe defaults: 'knob' declares ${type} but carries options \\[x\\] — options ride enum rows only`),
        `type ${type}`,
      );
    }
  });

  it("the lawful surface still passes (the refusal eats nothing legal)", () => {
    const surface: readonly DeclaredSurface[] = [{
      id: "probe",
      params: [
        { name: "prompt", type: "string" },
        { name: "steps", type: "number", bounds: [1, 10] },
        { name: "sampler", type: "enum", options: ["euler", "heun"] },
        { name: "refs", type: "image_list" },
        { name: "flag", type: "boolean" },
      ],
    }];
    const checked = validateWriteRowsAgainstActions("probe", [{
      where: "defaults",
      values: { prompt: "x", steps: 4, sampler: "heun", refs: ["a.png"], flag: false },
    }], surface);
    assert.deepEqual(checked, ["defaults:prompt", "defaults:steps", "defaults:sampler", "defaults:refs", "defaults:flag"]);
  });

  it("no live family declares a non-enum row carrying options", () => {
    const ids = registryIds();
    const offenders: string[] = [];
    let rows = 0;
    for (const id of ids) {
      const decl = registryModel(id) as unknown as {
        actions?: ReadonlyArray<{ id?: string; params?: ReadonlyArray<{ name?: string; type?: string; options?: readonly unknown[] }> }>;
      };
      for (const action of decl.actions ?? []) {
        for (const row of action.params ?? []) {
          rows += 1;
          if (row.type !== "enum" && (row.options?.length ?? 0) > 0) {
            offenders.push(`${id}/${action.id ?? "?"} row '${row.name ?? "?"}' declares ${row.type} with options`);
          }
        }
      }
    }
    assert.ok(rows > 0, "the sweep walked no action rows — the registry walk is broken, not clean");
    assert.deepEqual(offenders, [], "non-enum rows carrying dead options");
  });
});

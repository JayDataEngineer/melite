import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { benchResultDefects, type BenchReport } from "@melite/contracts";
import {
  parseValidateRigOutput,
  validateRigReport,
  ValidateRigOutputError,
} from "../src/validateRigReport.ts";
import { validateRigReport as seamValidateRigReport } from "@melite/3d-rig/validate-rig-report";

const stats = {
  mesh_verts: 1200,
  bone_count: 42,
  frame_range: [0, 30],
  rest_bbox: { min: [-1, -0.2, 0], max: [1, 0.2, 2] },
  rest_size: { W: 2, D: 0.4, H: 2 },
  frame0_max_displacement: 0.12,
  frame0_note: null,
  weight_contamination_pct: 0,
  rest_head_depth: 0.2,
  max_height: 2,
  min_height: 1.9,
  passed: 3,
  critical_count: 4,
  warning_count: 5,
  violations: "source-stat",
};

function assertReportContract(report: BenchReport): void {
  assert.deepEqual(benchResultDefects({ run_id: "rig", reports: { validate: report } }), []);
}

function assertMalformed(value: unknown, path: string): void {
  assert.throws(
    () => parseValidateRigOutput(value),
    (error: unknown) => {
      assert.ok(error instanceof ValidateRigOutputError);
      assert.equal(error.path, path);
      return true;
    },
  );
}

describe("validate_rig output adapter", () => {
  it("maps a passing tuple to a pass report", () => {
    const report = validateRigReport([true, [], stats]);
    assert.deepEqual(report, {
      kind: "report",
      status: "pass",
      title: "Rig validation",
      chips: [],
      rows: {
        passed: true,
        critical_count: 0,
        warning_count: 0,
        violations: "[]",
        mesh_verts: 1200,
        bone_count: 42,
        frame_range: "[0,30]",
        rest_bbox: '{"min":[-1,-0.2,0],"max":[1,0.2,2]}',
        rest_size: '{"W":2,"D":0.4,"H":2}',
        frame0_max_displacement: 0.12,
        frame0_note: "null",
        weight_contamination_pct: 0,
        rest_head_depth: 0.2,
        max_height: 2,
        min_height: 1.9,
        stat_passed: 3,
        stat_critical_count: 4,
        stat_warning_count: 5,
        stat_violations: "source-stat",
      },
    });
    assertReportContract(report);
    assert.equal(seamValidateRigReport, validateRigReport);
  });

  it("maps warnings to a warn report", () => {
    const report = validateRigReport([
      true,
      [["WARNING", "F12: Vertex displaced 0.610m"]],
      { mesh_verts: 1200 },
    ]);
    assert.equal(report.status, "warn");
    assert.deepEqual(report.chips, ["WARNING 1"]);
    assert.equal(report.rows?.warning_count, 1);
    assert.equal(report.rows?.violations, '[["WARNING","F12: Vertex displaced 0.610m"]]');
    assertReportContract(report);
  });

  it("maps critical violations to a fail report", () => {
    const report = validateRigReport([
      false,
      [["CRITICAL", "No mesh object found"], ["WARNING", "F1: check pose"]],
      { mesh_verts: 0 },
    ]);
    assert.equal(report.status, "fail");
    assert.deepEqual(report.chips, ["CRITICAL 1", "WARNING 1"]);
    assert.equal(report.rows?.critical_count, 1);
    assert.equal(report.rows?.warning_count, 1);
    assertReportContract(report);
  });

  it("keeps a contradictory passing flag failed", () => {
    const report = validateRigReport([true, [["CRITICAL", "contradiction"]], {}]);
    assert.equal(report.status, "fail");
    assert.deepEqual(report.chips, ["CRITICAL 1"]);
  });

  it("accepts the equivalent named machine output", () => {
    assert.deepEqual(
      parseValidateRigOutput({ passed: true, violations: [], stats: { mesh_verts: 12 } }),
      { passed: true, violations: [], stats: { mesh_verts: 12 } },
    );
  });

  it("rejects a non-tuple, non-object value", () => {
    assertMalformed(null, "$");
    assertMalformed("passed", "$");
  });

  it("rejects a tuple with the wrong arity", () => {
    assertMalformed([true, []], "$");
    assertMalformed([true, [], {}, "extra"], "$");
  });

  it("rejects an invalid passed value", () => {
    assertMalformed(["true", [], {}], "$.passed");
  });

  it("rejects malformed violations", () => {
    assertMalformed([true, {}, {}], "$.violations");
    assertMalformed([true, [["INFO", "x"]], {}], "$.violations[0][0]");
    assertMalformed([true, [["WARNING", ""]], {}], "$.violations[0][1]");
    assertMalformed([true, [["WARNING", 3]], {}], "$.violations[0][1]");
    assertMalformed([true, [["WARNING"]], {}], "$.violations[0]");
    const sparse = new Array(1);
    assertMalformed([true, sparse, {}], "$.violations[0]");
  });

  it("rejects malformed stats", () => {
    assertMalformed([true, [], []], "$.stats");
    assertMalformed([true, [], { value: undefined }], "$.stats.value");
    assertMalformed([true, [], { value: Number.NaN }], "$.stats.value");
    assertMalformed([true, [], { value: new Date() }], "$.stats.value");
  });

  it("rejects cyclic stats", () => {
    const statsValue: Record<string, unknown> = {};
    statsValue.self = statsValue;
    assertMalformed([true, [], statsValue], "$.stats.self");
  });

  it("rejects malformed named output", () => {
    assertMalformed({ passed: true, violations: [] }, "$");
    assertMalformed({ passed: true, violations: [], stats: {}, extra: true }, "$");
    assertMalformed(new Date(), "$");
  });
});

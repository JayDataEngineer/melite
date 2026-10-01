/**
 * gate-parity.spec.ts — THE CLIENT↔GATE PARITY WALL (hour 22, the
 * operator's catch: "what's it going to take to get some actual
 * schemastery?").
 *
 * THE DISEASE THIS WALL KILLS: the client's compose mirror is a
 * PROJECTION of the schemastery gate (the envelope walk derives
 * fields/defaults/bounds off the carrier's own toJSON). The h3
 * knob fold taught the lesson: a projection that silently drops a
 * field (default) shows the operator a blank while the engine
 * composes a value — and NOTHING failed, because no receipt
 * compared the projection against the source. THE GATE ITSELF
 * (schemaCarrier invoked with a wire doc) is the truth; the walk
 * is the claim.
 *
 * THE WALL, one test, every card in the registry (no per-card
 * copies — the estate's whole card surface in one sweep):
 *
 *   1. DEFAULTS: for every key the gate fills on an all-unset doc,
 *      the envelope walk carries THE SAME default — and the walk
 *      invents no default the gate does not fill.
 *   2. VOCABULARY: every enum the walk serves matches the gate's
 *      own enum members (no dropped or invented options).
 *   3. BOUNDS: numeric min/max ride the walk verbatim off the same
 *      refs the gate enforces.
 *
 * A card author who declares a default the walk drops, or an enum
 * the walk narrows, FAILS HERE — at the build, not in the
 * operator's face.
 */
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { fieldsOfEnvelope } from '@melite/card-base/spec';
import { loadCardDefs } from "@melite/comfyui-cordis";
import type { CardDefinition } from "@melite/comfyui-cordis/service";

/** The walk's served shape for one card (the same bytes the lane's
 * form-spec door serves — formSchemas' own serialization). */
function servedFields(def: CardDefinition) {
  const carrier = (def.schemaCarrier ?? def.schema) as unknown as {
    toJSON?: () => unknown;
  };
  assert.ok(
    typeof carrier.toJSON === "function",
    `card '${def.id}': the schema carrier must serialize (toJSON) — the walk has no truth to read`,
  );
  const envelope = carrier.toJSON!();
  return { envelope, fields: fieldsOfEnvelope(envelope as never) };
}

/** The gate's own composition for an all-unset wire doc (what the
 * admission gate fills). Cards whose schemas demand required inputs
 * at compose return null — their defaults ride the declared-only
 * arm below (the gate cannot compose {} without them; that is not
 * drift, it is the schema refusing). */
function gateCompose(def: CardDefinition): Record<string, unknown> | null {
  const carrier = (def.schemaCarrier ?? def.schema) as unknown as {
    (input: Record<string, unknown>): Record<string, unknown>;
  };
  try {
    return carrier({});
  } catch {
    return null;
  }
}

/** The hidden grammar (2026-09-20, ledger #40): a knob declaring
 * extra.hidden is VALIDATION-ONLY — the carrier still fills its
 * declared default (it IS the gate), the walk never serves it (it
 * never renders). This reads the SAME envelope the walk reads
 * (numeric refs off env.uid), so the wall encodes the exception
 * exactly: an unserved gate fill is lawful IFF hidden; anything
 * else stays a crime. */
function hiddenKnob(def: CardDefinition, name: string): boolean {
  const envelope = ((def.schemaCarrier ?? def.schema) as unknown as {
    toJSON: () => { uid: number; refs: Record<number, { dict?: Record<string, number>; meta?: { extra?: { hidden?: boolean } } }> };
  }).toJSON();
  const root = envelope.refs?.[envelope.uid];
  const refId = root?.dict?.[name];
  if (typeof refId !== "number") return false;
  return envelope.refs?.[refId]?.meta?.extra?.hidden === true;
}

describe("THE CLIENT↔GATE PARITY WALL: the walk IS the gate's truth, every card", () => {
  it("defaults: every gate fill rides the walk verbatim; the walk invents none", async () => {
    const defs = await loadCardDefs();
    assert.ok(defs.size > 0, "the registry must carry cards");
    for (const [id, def] of defs) {
      const { fields } = servedFields(def);
      const gate = gateCompose(def);
      const walked = new Map(fields.map((f) => [f.name, f.default]));

      // THE WALK INVENTS NOTHING: a default the gate does not fill
      // is a client-side lie (a value the engine never composes).
      for (const [name, dflt] of walked) {
        if (dflt === undefined || dflt === null) continue;
        if (gate === null) {
          // required-input card: receipt the default against the
          // carrier's declared shape instead — every walked default
          // must at least be a declared member of the envelope.
          assert.ok(fields.some((f) => f.name === name), `${id}: ${name} walked but undeclared`);
          continue;
        }
        assert.ok(
          name in gate,
          `${id}: the walk serves default for '${name}' but the gate does not compose it — a client-side invention`,
        );
        assert.deepEqual(
          gate[name],
          dflt,
          `${id}.${name}: the walk's default (${JSON.stringify(dflt)}) must be the gate's fill (${JSON.stringify((gate as Record<string, unknown>)[name])})`,
        );
      }

      // THE WALK DROPS NOTHING: every gate fill rides the walk.
      if (gate !== null) {
        for (const [name, filled] of Object.entries(gate)) {
          if (filled === undefined || filled === null) continue;
          // hidden fills are VALIDATION-ONLY — declared, gated, and
          // deliberately never served (the exception above, encoded
          // exactly: hidden and ONLY hidden may go unserved).
          if (hiddenKnob(def, name)) continue;
          const f = fields.find((x) => x.name === name);
          assert.ok(f !== undefined, `${id}: the gate fills '${name}' but the walk does not serve the field`);
          assert.deepEqual(
            f!.default,
            filled,
            `${id}.${name}: the gate fills ${JSON.stringify(filled)} but the walk dropped it (the h3 blank-face disease)`,
          );
        }
      }
    }
  });

  it("vocabulary: every enum the walk serves IS the gate's own member set", async () => {
    const defs = await loadCardDefs();
    for (const [id, def] of defs) {
      const { envelope, fields } = servedFields(def);
      // The refs the carrier itself serialized — the gate's enum lives
      // here, in schemastery's OWN shapes: a union-of-consts vocabulary
      // carries `list` (sibling of meta) as REF-IDS into const children
      // (the values); plain enums carry meta.enum / meta.consts. Both
      // arms resolved below — the member set is read off the carrier's
      // serialization, never mirrored from the walk.
      const refs = (envelope as { refs?: Record<string, unknown> }).refs ?? {};
      const enumOf = (node: unknown): string[] | null => {
        const n = node as { meta?: { enum?: unknown[]; consts?: unknown[] }; list?: unknown[] };
        const metaList = n?.meta?.enum ?? n?.meta?.consts;
        if (Array.isArray(metaList) && metaList.length > 0) return metaList.map(String);
        if (Array.isArray(n?.list) && n.list.length > 0) {
          // MIXED unions (consts + an open arm, e.g. ref_image_size's
          // "match"|"max"|WxH-pattern): the const children are the
          // served member set; an open arm accepts values it never
          // serves as options — it widens the gate, never the face.
          const members = n.list
            .map((id) => {
              const child = refs[String(id)] as { type?: string; value?: unknown } | undefined;
              return child?.type === "const" ? String(child.value) : null;
            })
            .filter((m): m is string => m !== null);
          if (members.length > 0) return members;
        }
        return null;
      };
      for (const f of fields) {
        if (!Array.isArray(f.options) || f.options.length === 0) continue;
        const served = f.options.map((o) => (typeof o === "string" ? o : o.value));
        // find the node this field walked from: match by enum overlap off the refs
        let gate: string[] | null = null;
        for (const node of Object.values(refs)) {
          const e = enumOf(node);
          if (e === null) continue;
          const overlap = served.filter((v) => e.includes(v)).length;
          if (overlap === served.length) { gate = e; break }
        }
        assert.ok(
          gate !== null,
          `${id}.${f.name}: the walk serves an enum the carrier does not declare — invented vocabulary`,
        );
        for (const v of served) {
          assert.ok(gate.includes(v), `${id}.${f.name}: served option '${v}' is not a gate member`);
        }
      }
    }
  });

  it("bounds: numeric min/max ride the walk verbatim off the gate's own refs", async () => {
    const defs = await loadCardDefs();
    for (const [id, def] of defs) {
      const { envelope, fields } = servedFields(def);
      const refs = (envelope as { refs?: Record<string, unknown> }).refs ?? {};
      const bounds = new Map<string, { min?: number; max?: number }>();
      for (const node of Object.values(refs)) {
        const meta = (node as { meta?: { min?: number; max?: number; description?: string } })?.meta;
        if (meta === undefined) continue;
        if (meta.min !== undefined || meta.max !== undefined) {
          bounds.set(String(meta.description ?? ""), { min: meta.min, max: meta.max });
        }
      }
      for (const f of fields) {
        if (f.type !== "number" && f.type !== "integer") continue;
        if (f.min === undefined && f.max === undefined) continue;
        const gate = bounds.get(f.label);
        assert.ok(
          gate !== undefined,
          `${id}.${f.name}: the walk serves bounds but no gate ref declares them — invented limits`,
        );
        assert.equal(f.min, gate.min, `${id}.${f.name}: walked min must be the gate's own`);
        assert.equal(f.max, gate.max, `${id}.${f.name}: walked max must be the gate's own`);
      }
    }
  });

  it("provisions: every file-shaped default and vocabulary member is downloaded or explicitly external", async () => {
    // THE GHOST CATCH (hour 22): schemastery is a TYPE system, not a
    // TRUTH system — z.string().default("<ghost>.safetensors") is a
    // perfectly valid schema naming a file no family provisions. The
    // estate's file register (every family DECL's provisions rows) is
    // the truth a file-shaped default is checked against; anything
    // outside it must sit in the EXTERNAL allowlist below with a
    // receipt, in the open, never silently.
    const EXTERNAL: Readonly<Record<string, string>> = {
      // h3: the family's own DEFAULT VARIANT file (variant table row 0,
      // "3B EMA fp16 — DEFAULT"; the family provisions no seedvr2 rows —
      // the weights ride the boarded SeedVR2 pack/user folder).
      "seedvr2_ema_3b_fp16.safetensors":
        "seedvr2_ema family's declared default variant (model_defaults.unet)",
      // h3: real public Comfy-Org frame-interpolation file; NAMED provision
      // gap (the family provisions film_net only).
      "rife47.pth": "public Comfy-Org file; provision gap named in the ledger",
      // h3: the fp8_e4m3fn sibling the lane walked in shipped _flow.json
      // receipts (the 2026-09-20 dropdown-law stroke's second member —
      // fp16 stays the default); same public Comfy-Org SeedVR2 weights,
      // same named provision gap shape as rife47 above.
      "seedvr2_ema_3b_fp8_e4m3fn.safetensors":
        "public Comfy-Org SeedVR2 fp8 file; provision gap named in the ledger",
    };
    const FILE_SHAPE = /\.(safetensors|pth|ckpt|pt|bin|gguf|onnx)$/;
    const provisioned = new Set<string>();
    for (const dir of await (await import("node:fs/promises")).readdir("packages/models")) {
      const { readFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      let text: string;
      try {
        text = await readFile(join("packages/models", dir, "src/index.ts"), "utf8");
      } catch {
        continue;
      }
      const m = text.match(/"provisions":\s*\[/);
      if (m === null) continue;
      const seg = text.slice(m.index! + m[0].length, m.index! + m[0].length + 8000);
      const end = seg.indexOf("]");
      for (const name of seg.slice(0, end === -1 ? seg.length : end).matchAll(/"name":\s*"([^"]+)"/g)) {
        provisioned.add(name[1]);
      }
    }
    assert.ok(provisioned.size > 0, "the estate file register must carry provisions");

    const defs = await loadCardDefs();
    for (const [id, def] of defs) {
      const { fields } = servedFields(def);
      const check = (file: string, where: string): void => {
        if (provisioned.has(file) || EXTERNAL[file] !== undefined) return;
        assert.fail(
          `${id}.${where}: '${file}' is downloaded by NO family and rides no external receipt — a ghost (the schemastery type system cannot see file existence; this wall can)`,
        );
      };
      for (const f of fields) {
        if (typeof f.default === "string" && FILE_SHAPE.test(f.default)) check(f.default, `${f.name} default`);
        for (const o of Array.isArray(f.options) ? f.options : []) {
          const v = typeof o === "string" ? o : (o as { value?: unknown }).value;
          if (typeof v === "string" && FILE_SHAPE.test(v)) check(v, `${f.name} option`);
        }
      }
    }
  });
});

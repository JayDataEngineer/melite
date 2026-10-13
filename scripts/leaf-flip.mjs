// leaf-flip.mjs — one-shot consumer flip for the leaf/model tier.
//
// Maps every façade or moved-surface import onto its owner:
//   cordis main  → kit/admission (gatedResolve), kit/errors
//                  (ComposeRefusal), kit/params-emit
//                  (DeclaredModifierKind), kit/fields (riders)
//   cordis/service → kit/card-definition, ComfyUIServiceFace via
//                  kit/service-faces
//   cordis/models-service → ModelsServiceFace via kit/service-faces
//   cordis/model-contract → kit/model-contract
// Re-runnable: every rewrite is a no-op once applied.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const DIRS = ["packages/3d", "packages/audio", "packages/image", "packages/motion", "packages/video", "packages/models"];
const KIT = "@melite/comfyui-card-kit";
const MAIN_OWNER = { gatedResolve: `${KIT}/admission`, ComposeRefusal: `${KIT}/errors`, DeclaredModifierKind: `${KIT}/params-emit`, QVOICE_RIDERS: `${KIT}/fields`, QVOICE_SAVE_RIDERS: `${KIT}/fields`, LORAS_RIDERS: `${KIT}/fields`, LANPAINT_RIDERS: `${KIT}/fields`, MASK_RIDERS: `${KIT}/fields` };
const CARDDEF = new Set(["CardDefinition", "CardFlowOutputBinding", "ComposeEstate"]);
const CONTRACT = new Set(["ModelDecl", "ProvisionRow", "ModelError", "SAFE_ID_RE", "DeclaredCellRow", "DeclaredVariantRow", "CellArtifact", "SourceRow", "EngineFacts", "ModelRow", "ParamRequiresRow", "ModelDeclWire", "FamilyIdentity"]);
const FACE = new Set(["ComfyUIService", "ModelsService"]);

const files = execFileSync("git", ["ls-files", ...DIRS.map((d) => `${d}/**/*.ts`)], { encoding: "utf8" }).split("\n").filter(Boolean);
let changed = 0;
for (const rel of files) {
  let src = readFileSync(rel, "utf8");
  const before = src;
  // import { A, B } from 'mod'  (type and value forms, multiline)
  src = src.replace(/import\s+(type\s+)?\{([^}]*)\}\s+from\s+['"]@melite\/comfyui-cordis(\/[a-z-]+)?['"];?/g, (full, typeMark, names, sub) => {
    const specs = names.split(",").map((s) => s.trim()).filter(Boolean).map((s) => {
      const m = s.match(/^(type\s+)?(\w+)(\s+as\s+\w+)?$/);
      return { type: Boolean(m?.[1]), name: m?.[2] ?? s, alias: m?.[3] ?? "" };
    });
    const byModule = new Map();
    for (const spec of specs) {
      let target;
      let outName = spec.name;
      if (sub === "/service") {
        if (CARDDEF.has(spec.name)) target = `${KIT}/card-definition`;
        else if (spec.name === "ComposeRefusal") target = `${KIT}/errors`;
        else if (FACE.has(spec.name)) { target = `${KIT}/service-faces`; outName = spec.name === "ComfyUIService" ? "ComfyUIServiceFace" : "ModelsServiceFace"; }
        else target = `${KIT}/card-definition`;
      } else if (sub === "/models-service") {
        target = `${KIT}/service-faces`; outName = spec.name === "ModelsService" ? "ModelsServiceFace" : spec.name;
      } else if (sub === "/model-contract") {
        target = `${KIT}/model-contract`;
      } else if (MAIN_OWNER[spec.name]) {
        target = MAIN_OWNER[spec.name];
      } else {
        byModule.set(full, full); // unknown main import: leave the statement verbatim
        continue;
      }
      const emit = `${spec.type || target !== `${KIT}/service-faces` && target !== `${KIT}/card-definition` ? "import type " : "import "}{ ${outName}${spec.alias} } from '${target}'`;
      byModule.set(emit, emit);
    }
    return [...byModule.keys()].join(";\n");
  });
  // bare activation for files that read ctx.comfyui / ctx.models but no longer import any face
  const usesCtx = /\bctx\.(comfyui|models)\b/.test(src);
  const hasFace = src.includes(`${KIT}/service-faces`);
  if (usesCtx && !hasFace) {
    src = `import type {} from '${KIT}/service-faces'\n` + src;
  }
  if (src !== before) {
    writeFileSync(rel, src);
    changed++;
    console.log("flipped", rel);
  }
}
console.log(changed, "files rewritten");

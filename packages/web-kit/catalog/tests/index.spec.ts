// index.spec.ts — the @melite/catalog barrel re-exports every surface.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import * as catalog from "../src/index.ts";

describe("catalog barrel", () => {
  it("re-exports the transport, contracts, protocol, and helpers", () => {
    for (const key of [
      // api.ts (mine)
      "apiFetch", "apiJson", "externalUrl", "getBackendState", "onBackendState",
      // catalogContractStore.ts (mine)
      "useCatalogContractStore",
      // enhance.ts (mine)
      "enhancePrompt", "agentEnhance", "fetchEnhanceRoutes", "isEmbedded",
      "parsePickerAria", "readPickerModel", "resolvePickerRoute",
      // familyParamContract.ts (mine)
      "loadFamilySchemas", "getFamilySchema", "isFamilySchemaCachePopulated",
      "coerceParamsToSchema", "validateParamsAgainstSchema",
      "validateModifierEntries", "assertParamsMatchFamilySchema",
      // FlowProtocol.ts (mine)
      "describeErrorBody", "collectStageUrls", "sanitizeRevivedResult",
      "collectNamedArtifacts", "pollFlowRun", "runCompiledGeneration",
      "assertNoParamDrops", "setRequiredEmptyResolver",
    ]) {
      assert.equal(typeof (catalog as Record<string, unknown>)[key], "function", key);
    }
  });
});

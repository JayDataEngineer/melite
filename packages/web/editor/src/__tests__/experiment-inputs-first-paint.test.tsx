
import { describe, it, expect, vi } from "vitest"
import { render } from "@testing-library/react"
import { TooltipProvider } from "@radix-ui/react-tooltip"
import { primeCatalog } from "@melite/catalog"
import { useSpecContractStore } from "../surfaces/shared/specContractStore"
import { CardDetailInline } from "../surfaces/flow/CardDetailModal"
import type { CardStage } from "@melite/contracts"
import { formSpecStub } from "../../tests/fixtures/formSpecStub"

vi.mock("../rpc/editorClient", () => ({
  editorClient: { getFormSpec: vi.fn(async () => ({ features: {} })) },
}))

const CATALOG = {
  models: {
    "qwen-img-edit-2511": {
      family: "qwen-img-edit-2511", form: "form_edit", label: "Qwen Edit",
      input_slots: ["image1"], prompt_in_form: true,
    },
  },
  families: { "qwen-img-edit-2511": { label: "Qwen Edit", genre: "image" } },
  input_vocabulary: {
    slots: ["input_image", "image1", "image2", "image3"],
    form_slots: { form_edit: ["image1", "image2", "image3"] },
    model_slots: { "qwen-img-edit-2511": ["image1"] },
  },
}

describe("EXPERIMENT: Inputs zone at first paint", () => {
  it("renders the slot square synchronously when catalog+spec are settled", () => {
    primeCatalog(CATALOG as any)
    useSpecContractStore.setState({
      records: { "qwen-img-edit-2511": { spec: formSpecStub(), state: "loaded", violations: [], error: null } },
    })
    const stage: CardStage = {
      id: "s1", title: "Edit", kind: "generation",
      service: "qwen-img-edit-2511",
      params: { prompt: "", image1: null },
      inputs: [], inputIndices: [], result: null, status: "pending", meta: {},
    }
    const { container } = render(
      <TooltipProvider>
        <CardDetailInline stage={stage} upstreams={[stage]} running={false}
          actions={{ onEditSave: () => {} }} />
      </TooltipProvider>,
    )
    console.log("SLOT GRID PRESENT:", container.querySelector("[data-slot-grid]") !== null)
    console.log("SLOT SQUARES:", container.querySelectorAll("[data-slot-grid] .group").length)
    console.log("INPUTS LABEL:", container.textContent?.includes("Inputs"))
    expect(container.querySelector("[data-slot-grid]")).toBeTruthy()
  })
})

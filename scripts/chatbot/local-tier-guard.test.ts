import { describe, expect, it } from "vitest"

import { hasOllamaModel } from "./local-tier-guard"

describe("local-tier-guard", () => {
  it("matches Ollama models by name or model field", () => {
    expect(
      hasOllamaModel(
        [
          { name: "nomic-embed-text:latest" },
          { model: "hf.co/mmnga/cyberagent-DeepSeek-R1-Distill-Qwen-14B-Japanese-gguf:Q4_K_M" },
        ],
        "hf.co/mmnga/cyberagent-DeepSeek-R1-Distill-Qwen-14B-Japanese-gguf:Q4_K_M",
      ),
    ).toBe(true)
  })

  it("does not match unrelated model entries", () => {
    expect(hasOllamaModel([{ name: "other-model" }, null, "plain-model" ], "missing-model")).toBe(false)
  })
})

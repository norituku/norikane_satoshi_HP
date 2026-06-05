// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest"
import {
  supportsHtmlInCanvas,
  supportsLiquidDomProfileProof,
  supportsLiquidDomWebGpu,
} from "@/components/hp/liquid-glass/capability"

const originalGpuQueue = (globalThis as { GPUQueue?: unknown }).GPUQueue

function setNavigatorGpu(value: unknown) {
  Object.defineProperty(navigator, "gpu", {
    configurable: true,
    value,
  })
}

function setGpuQueueWithElementCopy() {
  class TestGpuQueue {}
  Object.defineProperty(TestGpuQueue.prototype, "copyElementImageToTexture", {
    configurable: true,
    value: vi.fn(),
  })
  Object.defineProperty(globalThis, "GPUQueue", {
    configurable: true,
    value: TestGpuQueue,
  })
}

function mockCanvasSupport({
  layoutSubtree,
  drawElementImage,
}: {
  layoutSubtree: boolean
  drawElementImage: boolean
}) {
  const createElement = document.createElement.bind(document)

  return vi.spyOn(document, "createElement").mockImplementation((tagName, options) => {
    const element = createElement(tagName, options)

    if (tagName.toLowerCase() !== "canvas") {
      return element
    }

    if (layoutSubtree) {
      Object.defineProperty(element, "layoutSubtree", {
        configurable: true,
        value: false,
      })
    }

    Object.defineProperty(element, "getContext", {
      configurable: true,
      value: () => (drawElementImage ? { drawElementImage: vi.fn() } : {}),
    })

    return element
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  Object.defineProperty(navigator, "gpu", {
    configurable: true,
    value: undefined,
  })
  Object.defineProperty(globalThis, "GPUQueue", {
    configurable: true,
    value: originalGpuQueue,
  })
})

describe("liquid-dom capability gate", () => {
  it("returns false when WebGPU is unavailable", () => {
    setNavigatorGpu(undefined)

    expect(supportsLiquidDomWebGpu()).toBe(false)
    expect(supportsLiquidDomProfileProof()).toBe(false)
  })

  it("returns false when HTML-in-Canvas is unavailable", () => {
    setNavigatorGpu({})
    mockCanvasSupport({ layoutSubtree: false, drawElementImage: false })

    expect(supportsHtmlInCanvas()).toBe(false)
    expect(supportsLiquidDomProfileProof()).toBe(false)
  })

  it("requires WebGPU and HTML-in-Canvas support", () => {
    setNavigatorGpu({})
    mockCanvasSupport({ layoutSubtree: true, drawElementImage: true })

    expect(supportsLiquidDomWebGpu()).toBe(true)
    expect(supportsHtmlInCanvas()).toBe(true)
    expect(supportsLiquidDomProfileProof()).toBe(true)
  })

  it("accepts the WebGPU element-copy path behind the same layoutSubtree gate", () => {
    setNavigatorGpu({})
    setGpuQueueWithElementCopy()
    mockCanvasSupport({ layoutSubtree: true, drawElementImage: false })

    expect(supportsHtmlInCanvas()).toBe(true)
    expect(supportsLiquidDomProfileProof()).toBe(true)
  })
})

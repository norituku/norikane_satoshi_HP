type NavigatorWithWebGpu = Navigator & {
  gpu?: unknown
}

type CanvasWithHtmlInCanvas = HTMLCanvasElement & {
  layoutSubtree?: boolean
}

type Canvas2DWithElementDraw = CanvasRenderingContext2D & {
  drawElement?: unknown
  drawElementImage?: unknown
}

type GpuQueueConstructor = {
  prototype?: Record<string, unknown>
}

function hasCallable(target: unknown, key: string) {
  return (
    typeof target === "object" &&
    target !== null &&
    typeof (target as Record<string, unknown>)[key] === "function"
  )
}

export function supportsLiquidDomWebGpu() {
  if (typeof navigator === "undefined") {
    return false
  }

  return Boolean((navigator as NavigatorWithWebGpu).gpu)
}

export function supportsHtmlInCanvas() {
  if (typeof document === "undefined") {
    return false
  }

  const canvas = document.createElement("canvas") as CanvasWithHtmlInCanvas
  const context = canvas.getContext("2d") as Canvas2DWithElementDraw | null
  const gpuQueue = (globalThis as { GPUQueue?: GpuQueueConstructor }).GPUQueue

  const supportsLayoutSubtree = "layoutSubtree" in canvas
  const supportsCanvasDraw =
    hasCallable(context, "drawElementImage") || hasCallable(context, "drawElement")
  const supportsWebGpuElementCopy = hasCallable(
    gpuQueue?.prototype,
    "copyElementImageToTexture",
  )

  return supportsLayoutSubtree && (supportsCanvasDraw || supportsWebGpuElementCopy)
}

export function supportsLiquidDomProfileProof() {
  return supportsLiquidDomWebGpu() && supportsHtmlInCanvas()
}

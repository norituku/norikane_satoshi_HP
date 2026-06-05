"use client"

import { useEffect, useState } from "react"
import { supportsLiquidDomProfileProof } from "@/components/hp/liquid-glass/capability"

type LiquidDomReactModule = typeof import("@liquid-dom/react")

export function ProfileLiquidDomProof() {
  const [liquidDom, setLiquidDom] = useState<LiquidDomReactModule | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!supportsLiquidDomProfileProof()) {
      return
    }

    void import("@liquid-dom/react")
      .then((module) => {
        if (!cancelled) {
          setLiquidDom(module)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLiquidDom(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (!liquidDom) {
    return null
  }

  const { Frame, Glass, GlassContainer, Html, LiquidCanvas } = liquidDom

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute right-6 top-6 z-[1] hidden h-28 w-40 md:block"
      data-hp-liquid-dom-proof="true"
    >
      <LiquidCanvas
        className="h-full w-full"
        canvasClassName="h-full w-full"
        frameloop="demand"
        maxDpr={1.5}
        proposal={{ width: 160, height: 112 }}
        onError={() => setLiquidDom(null)}
      >
        <GlassContainer blur={12} spacing={18}>
          <Frame width={128} height={72}>
            <Glass cornerRadius={20}>
              <Html sizing="fill">
                <div className="h-full w-full rounded-[20px] border border-white/60 bg-white/30" />
              </Html>
            </Glass>
          </Frame>
        </GlassContainer>
      </LiquidCanvas>
    </div>
  )
}

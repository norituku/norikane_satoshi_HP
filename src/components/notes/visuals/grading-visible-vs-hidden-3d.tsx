"use client"

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"

const MAGENTA_RIM = new THREE.Color(0.7529, 0.2902, 0.5569)
const NAVY_RIM = new THREE.Color(0.1647, 0.3098, 0.5608)
const TEAL_FLOOR = new THREE.Color(0.1804, 0.549, 0.5176)
const AMBER_KEY = new THREE.Color(0.7843, 0.5725, 0.2275)

const LEFT_DISTORT_AMP = 0.13
const LEFT_DISTORT_PERIOD_SEC = 10.0
const LEFT_DISTORT_FREQ = (2.0 * Math.PI) / LEFT_DISTORT_PERIOD_SEC
const LEFT_ROTATION_Y_RAD_PER_SEC = 0.12
const LEFT_WOBBLE_AMP = 0.14

const RIGHT_BAND_PERIOD_SEC = 7.0
const RIGHT_BAND_FREQ = (2.0 * Math.PI) / RIGHT_BAND_PERIOD_SEC
const RIGHT_BAND_AMPLITUDE = 0.5
const RIGHT_ROTATION_Y_RAD_PER_SEC = 0.08

const VERTEX_SHADER = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uIsLeft;
  uniform float uDistortAmp;
  uniform float uDistortFreq;
  uniform float uBandY;

  varying vec3 vColor;
  varying float vLight;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;

  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  void main() {
    vec3 pos = position;

    if (uIsLeft > 0.5) {
      float w1 = sin(pos.y * 4.6 + uTime * uDistortFreq);
      float w2 = sin(pos.y * 2.3 + uTime * uDistortFreq * 0.6 + 1.2);
      float t = atan(pos.z, pos.x);
      float w3 = sin(t * 3.0 + uTime * uDistortFreq * 0.5);
      float displ = (w1 * 0.5 + w2 * 0.35 + w3 * 0.25);
      pos.xz *= 1.0 + displ * uDistortAmp;
      pos.y *= 1.0 + sin(t * 2.0 + uTime * uDistortFreq * 0.4) * uDistortAmp * 0.18;
    }

    float hue = atan(position.z, position.x) / 6.2831853 + 0.5;

    float yNorm = position.y;
    float satLeft = smoothstep(1.0, 0.05, abs(yNorm) * 0.85);
    float yDist = abs(yNorm - uBandY);
    float satRight = smoothstep(0.6, 0.0, yDist);
    float saturation = mix(satRight, satLeft, uIsLeft);

    float value = mix(0.45, 0.95, yNorm * 0.5 + 0.5);

    vColor = hsv2rgb(vec3(hue, saturation, value));

    vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
    vec3 worldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
    vec3 lightDir = normalize(vec3(0.55, 0.85, 0.5));
    vLight = 0.42 + 0.58 * max(dot(worldNormal, lightDir), 0.0);
    vWorldNormal = worldNormal;
    vViewDir = normalize(cameraPosition - worldPos);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  varying vec3 vColor;
  varying float vLight;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;

  uniform vec3 uRimTint;
  uniform vec3 uFloorTint;

  void main() {
    float rim = 1.0 - max(dot(vWorldNormal, vViewDir), 0.0);
    rim = pow(rim, 2.4);

    vec3 base = vColor * vLight;
    vec3 floorTint = mix(uFloorTint, vec3(1.0), 0.55);
    vec3 lit = mix(base * floorTint, base, vLight);
    vec3 finalColor = lit + uRimTint * rim * 0.32;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

type NodeKind = "left" | "right"

type ColorBundle = {
  geometry: THREE.CylinderGeometry
  material: THREE.ShaderMaterial
}

function buildBundle(kind: NodeKind): ColorBundle {
  const geometry = new THREE.CylinderGeometry(1.0, 1.0, 2.0, 96, 28, false)
  const isLeft = kind === "left" ? 1.0 : 0.0
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    uniforms: {
      uTime: { value: 0 },
      uIsLeft: { value: isLeft },
      uDistortAmp: { value: kind === "left" ? LEFT_DISTORT_AMP : 0 },
      uDistortFreq: { value: kind === "left" ? LEFT_DISTORT_FREQ : 0 },
      uBandY: { value: 0 },
      uRimTint: {
        value: (kind === "left" ? MAGENTA_RIM : NAVY_RIM).clone(),
      },
      uFloorTint: {
        value: (kind === "left" ? TEAL_FLOOR : AMBER_KEY).clone(),
      },
    },
    transparent: false,
    depthWrite: true,
    side: THREE.DoubleSide,
  })
  return { geometry, material }
}

function ColorSolid({
  kind,
  reducedMotion,
}: {
  kind: NodeKind
  reducedMotion: boolean
}) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const startTimeRef = useRef<number | null>(null)
  const invalidate = useThree((s) => s.invalidate)

  const bundle = useMemo(() => buildBundle(kind), [kind])

  useEffect(() => {
    return () => {
      bundle.geometry.dispose()
      bundle.material.dispose()
    }
  }, [bundle])

  useEffect(() => {
    if (reducedMotion) {
      const u = bundle.material.uniforms
      u.uTime.value = 0
      u.uBandY.value = 0
      if (groupRef.current) {
        groupRef.current.rotation.set(0, 0, 0)
      }
      invalidate()
    } else {
      startTimeRef.current = null
    }
  }, [reducedMotion, bundle, invalidate])

  useFrame((state, dt) => {
    if (reducedMotion) return
    if (!groupRef.current) return

    if (startTimeRef.current === null) startTimeRef.current = state.clock.elapsedTime
    const t = state.clock.elapsedTime - startTimeRef.current

    if (kind === "left") {
      groupRef.current.rotation.y += dt * LEFT_ROTATION_Y_RAD_PER_SEC
      groupRef.current.rotation.x = LEFT_WOBBLE_AMP * Math.sin(t * 0.45)
      groupRef.current.rotation.z = LEFT_WOBBLE_AMP * 0.85 * Math.cos(t * 0.38)
      bundle.material.uniforms.uTime.value = t
    } else {
      groupRef.current.rotation.y += dt * RIGHT_ROTATION_Y_RAD_PER_SEC
      bundle.material.uniforms.uTime.value = t
      bundle.material.uniforms.uBandY.value =
        RIGHT_BAND_AMPLITUDE * Math.sin(t * RIGHT_BAND_FREQ)
    }
  })

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        geometry={bundle.geometry}
        material={bundle.material}
      />
    </group>
  )
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === "undefined") return
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])
  return reduced
}

function NodeCanvas({
  kind,
  reducedMotion,
}: {
  kind: NodeKind
  reducedMotion: boolean
}) {
  return (
    <Canvas
      camera={{ position: [2.4, 1.2, 2.8], fov: 38 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      dpr={[1, 1.8]}
      style={{ background: "transparent" }}
      frameloop={reducedMotion ? "demand" : "always"}
    >
      <ColorSolid kind={kind} reducedMotion={reducedMotion} />
    </Canvas>
  )
}

export default function GradingVisibleVsHidden3D() {
  const reducedMotion = useReducedMotion()

  return (
    <div className="absolute inset-0 flex">
      <div className="relative" style={{ width: "50%", height: "100%" }}>
        <NodeCanvas kind="left" reducedMotion={reducedMotion} />
      </div>
      <div className="relative" style={{ width: "50%", height: "100%" }}>
        <NodeCanvas kind="right" reducedMotion={reducedMotion} />
      </div>
    </div>
  )
}

import * as THREE from 'three'

/* ------------------------------------------------------------------
   窗外飘雪：单次 draw call 的粒子系统，循环下落 + 横向摆动。
   生成时避开小屋占地范围，免得雪花从屋顶里穿出来。
------------------------------------------------------------------ */

const CABIN_KEEPOUT = { x: 4.2, zBack: -3.9, zFront: 3.9 }

export function createSnow(count = 2600) {
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const speeds = new Float32Array(count)
  const phases = new Float32Array(count)
  const baseX = new Float32Array(count)
  const baseZ = new Float32Array(count)

  function randomOutsideCabin() {
    let x = 0
    let z = 0
    let guard = 0
    do {
      const r = Math.sqrt(Math.random()) * 19 + 0.9
      const a = Math.random() * Math.PI * 2
      x = Math.cos(a) * r
      z = Math.sin(a) * r
      guard++
    } while (guard < 12 && Math.abs(x) < CABIN_KEEPOUT.x && z > CABIN_KEEPOUT.zBack && z < CABIN_KEEPOUT.zFront)
    return [x, z]
  }

  for (let i = 0; i < count; i++) {
    const [x, z] = randomOutsideCabin()
    baseX[i] = x
    baseZ[i] = z
    positions[i * 3] = x
    positions[i * 3 + 1] = Math.random() * 17
    positions[i * 3 + 2] = z
    sizes[i] = 0.035 + Math.random() * 0.07
    speeds[i] = 0.45 + Math.random() * 1.15
    phases[i] = Math.random() * Math.PI * 2
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uColor: { value: new THREE.Color(0xdfefff) },
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      uniform float uPixelRatio;
      varying float vFade;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        // 太远的雪花淡出，避免远处糊成一片
        vFade = 1.0 - smoothstep(22.0, 42.0, -mv.z);
        gl_PointSize = min(aSize * uPixelRatio * (230.0 / -mv.z), 9.0 * uPixelRatio);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vFade;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.04, d);
        gl_FragColor = vec4(uColor, a * 0.65 * vFade);
      }
    `,
  })

  const points = new THREE.Points(geo, mat)
  points.frustumCulled = false
  points.renderOrder = 2

  function update(dt, elapsed) {
    for (let i = 0; i < count; i++) {
      const iy = i * 3 + 1
      positions[iy] -= speeds[i] * dt

      if (positions[iy] < -0.2) {
        positions[iy] = 16 + Math.random() * 2.5
        const [x, z] = randomOutsideCabin()
        baseX[i] = x
        baseZ[i] = z
      }

      // 左右轻微摆动，让雪看起来不是直线掉落
      positions[i * 3] = baseX[i] + Math.sin(elapsed * 0.7 + phases[i]) * 0.42
      positions[i * 3 + 2] = baseZ[i] + Math.cos(elapsed * 0.52 + phases[i]) * 0.3
    }
    geo.attributes.position.needsUpdate = true
  }

  function setPixelRatio(pr) {
    mat.uniforms.uPixelRatio.value = pr
  }

  return { points, update, setPixelRatio }
}

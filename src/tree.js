import * as THREE from 'three'
import { createGift, createStocking } from './decorations.js'

/* ------------------------------------------------------------------
   室内圣诞树：分层锥体 + 螺旋灯带 + 球饰 + 袜子 + 顶星 + 树下礼物
   树的坐标挂在房间中央偏后，正面门窗刚好能看到它。
------------------------------------------------------------------ */

const TREE = { height: 2.75, radius: 1.18, turns: 8 }

const radiusAt = (y) => TREE.radius * (1 - y / TREE.height) * 1.03

function buildGarland({ count, turns, offset = 0, sizeMin, sizeMax, color, yStart = 0.3, yEnd = TREE.height - 0.36 }) {
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const phases = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    const y = yStart + t * (yEnd - yStart)
    const angle = t * Math.PI * 2 * turns + offset
    const r = radiusAt(y) * 1.04
    positions[i * 3] = Math.cos(angle) * r
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = Math.sin(angle) * r
    sizes[i] = THREE.MathUtils.lerp(sizeMin, sizeMax, Math.random())
    phases[i] = Math.random()
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uColor: { value: new THREE.Color(color) },
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aPhase;
      uniform float uTime;
      uniform float uPixelRatio;
      varying float vTwinkle;
      void main() {
        float tw = 0.5 + 0.5 * sin(uTime * 2.0 + aPhase * 6.2831);
        vTwinkle = 0.3 + 0.7 * tw;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPixelRatio * (260.0 / -mv.z) * (0.8 + 0.4 * tw);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vTwinkle;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.02, d);
        a *= a;
        gl_FragColor = vec4(uColor * (0.75 + vTwinkle), a * (0.35 + 0.65 * vTwinkle));
      }
    `,
  })

  const points = new THREE.Points(geo, mat)
  points.frustumCulled = false
  return { points, mat }
}

function makeStarShape(outer, inner, spikes) {
  const shape = new THREE.Shape()
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)
  }
  shape.closePath()
  return shape
}

export function createTree(glowTex) {
  const group = new THREE.Group()
  group.name = 'christmas-tree'
  group.position.set(0, 0.06, -0.95)

  /* ------------------------------ 树干 ------------------------------ */
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.18, 0.5, 10),
    new THREE.MeshStandardMaterial({ color: 0x2c1c12, roughness: 0.95 }),
  )
  trunk.position.y = 0.22
  trunk.castShadow = true
  group.add(trunk)

  /* --------------------------- 分层树冠 --------------------------- */
  const tiers = [
    { y: 0.12, r: 1.18, h: 1.35, c: 0x0d3a2a },
    { y: 0.7, r: 0.95, h: 1.15, c: 0x114632 },
    { y: 1.3, r: 0.7, h: 1.0, c: 0x0c3325 },
    { y: 1.85, r: 0.46, h: 0.9, c: 0x114632 },
  ]
  for (const { y, r, h, c } of tiers) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(r, h, 32, 1),
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.88, metalness: 0.04 }),
    )
    cone.position.y = y + h / 2
    cone.castShadow = true
    cone.receiveShadow = true
    group.add(cone)
  }

  /* --------------------------- 螺旋彩灯 --------------------------- */
  const garlands = [
    buildGarland({ count: 900, turns: 8, offset: 0, sizeMin: 0.08, sizeMax: 0.17, color: 0xffe0a8 }),
    buildGarland({ count: 360, turns: 7.4, offset: Math.PI * 0.6, sizeMin: 0.06, sizeMax: 0.13, color: 0x9fd4ff }),
    buildGarland({ count: 190, turns: 6.2, offset: 1.3, sizeMin: 0.05, sizeMax: 0.11, color: 0xff9ec4 }),
  ]
  garlands.forEach(({ points }) => group.add(points))

  /* ----------------------------- 球饰 ----------------------------- */
  const ornamentColors = [0xff5f5f, 0xffd166, 0x7ee0ff, 0xff8fd1, 0xb9ff9c, 0xffffff]
  const ornamentCount = 88
  const ornaments = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.055, 10, 10),
    new THREE.MeshStandardMaterial({ roughness: 0.28, metalness: 0.55 }),
    ornamentCount,
  )
  const dummy = new THREE.Object3D()
  const tint = new THREE.Color()
  for (let i = 0; i < ornamentCount; i++) {
    const y = 0.34 + Math.random() * (TREE.height - 0.75)
    const angle = Math.random() * Math.PI * 2
    const r = radiusAt(y) * 1.0
    dummy.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r)
    dummy.scale.setScalar(0.75 + Math.random() * 0.7)
    dummy.updateMatrix()
    ornaments.setMatrixAt(i, dummy.matrix)
    tint.setHex(ornamentColors[(Math.random() * ornamentColors.length) | 0])
    ornaments.setColorAt(i, tint)
  }
  ornaments.instanceMatrix.needsUpdate = true
  ornaments.castShadow = true
  group.add(ornaments)

  /* --------------------------- 挂在上面的小星星 --------------------------- */
  const starOrnamentMat = new THREE.MeshStandardMaterial({
    color: 0xffd98a,
    emissive: 0xffbf4d,
    emissiveIntensity: 3.2,
    metalness: 0.55,
    roughness: 0.3,
  })
  const starOrnamentGeo = new THREE.ExtrudeGeometry(makeStarShape(0.3, 0.125, 5), {
    depth: 0.05,
    bevelEnabled: false,
    curveSegments: 2,
  })
  starOrnamentGeo.center()

  const starSpots = [
    { y: 1.16, a: 0.5 },
    { y: 1.62, a: 1.0 },
    { y: 2.02, a: 0.35 },
    { y: 1.42, a: 2.3 },
    { y: 1.88, a: 3.4 },
  ]
  for (const { y, a } of starSpots) {
    const starOrnament = new THREE.Mesh(starOrnamentGeo, starOrnamentMat)
    const r = radiusAt(y) * 1.06
    starOrnament.position.set(Math.cos(a) * r, y, Math.sin(a) * r)
    starOrnament.scale.setScalar(0.36)
    starOrnament.rotation.y = Math.PI / 2 - a
    starOrnament.rotation.z = 0.12
    group.add(starOrnament)
  }

  /* ----------------------------- 袜子 ----------------------------- */
  const stockingSpots = [
    { y: 0.82, a: 0.45, c: 0xb63a3a },
    { y: 1.08, a: 2.3, c: 0x2f6b4f },
    { y: 1.36, a: 4.1, c: 0xe8e0ca },
    { y: 1.02, a: 5.5, c: 0x9b3b5c },
    { y: 1.62, a: 1.2, c: 0xb63a3a },
    { y: 1.58, a: 3.5, c: 0x2b4a7a },
    { y: 1.95, a: 5.1, c: 0x2f6b4f },
  ]
  for (const { y, a, c } of stockingSpots) {
    const sock = createStocking(c)
    const r = radiusAt(y) * 1.05
    sock.position.set(Math.cos(a) * r, y, Math.sin(a) * r)
    sock.rotation.y = Math.PI / 2 - a
    sock.rotation.z = 0.16
    group.add(sock)
  }

  /* ------------------------------ 顶星 ------------------------------ */
  const starGeo = new THREE.ExtrudeGeometry(makeStarShape(0.3, 0.125, 5), {
    depth: 0.06,
    bevelEnabled: true,
    bevelSize: 0.018,
    bevelThickness: 0.018,
    bevelSegments: 2,
    curveSegments: 2,
  })
  starGeo.center()

  const star = new THREE.Mesh(
    starGeo,
    new THREE.MeshStandardMaterial({
      color: 0xffd98a,
      emissive: 0xffa62b,
      emissiveIntensity: 2.6,
      metalness: 0.8,
      roughness: 0.2,
    }),
  )
  star.position.set(0, TREE.height + 0.05, 0)
  group.add(star)

  const starHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xffc061,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.85,
    }),
  )
  starHalo.scale.setScalar(1.9)
  starHalo.position.copy(star.position)
  group.add(starHalo)

  const starLight = new THREE.PointLight(0xffbd6a, 4.5, 5, 2)
  starLight.position.copy(star.position)
  group.add(starLight)

  /* --------------------------- 树下礼物盒 --------------------------- */
  const giftLayout = [
    { x: 0.78, z: 0.55, s: 0.46, c: 0xa62f3a, r: 0.3 },
    { x: -0.88, z: 0.62, s: 0.36, c: 0x245a45, r: -0.6 },
    { x: 0.18, z: 1.06, s: 0.52, c: 0x2b3f78, r: 1.1 },
    { x: -0.42, z: -0.42, s: 0.3, c: 0x7a5a2e, r: -0.3 },
    { x: 1.16, z: -0.12, s: 0.3, c: 0x5f3a66, r: 0.8 },
    { x: -1.24, z: 0.08, s: 0.42, c: 0x8a6326, r: -0.9 },
    { x: 1.34, z: 0.74, s: 0.26, c: 0x2f6f72, r: 0.2 },
    { x: 0.04, z: -0.95, s: 0.34, c: 0x9b3b5c, r: 1.6 },
  ]
  for (const { x, z, s, c, r } of giftLayout) {
    const gift = createGift(s, c)
    gift.position.set(x, 0, z)
    gift.rotation.y = r
    group.add(gift)
  }

  /* --------------------------- 室内的浮尘 --------------------------- */
  const dust = (() => {
    const count = 180
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const y = Math.random() * 2.9
      const a = Math.random() * Math.PI * 2
      const r = radiusAt(y) + 0.15 + Math.random() * 1.4
      positions[i * 3] = Math.cos(a) * r
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = Math.sin(a) * r
      sizes[i] = 0.04 + Math.random() * 0.07
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
        uColor: { value: new THREE.Color(0xffcf96) },
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */ `
        attribute float aSize;
        uniform float uPixelRatio;
        uniform float uTime;
        varying float vA;
        void main() {
          vec3 p = position;
          p.y += sin(uTime * 0.6 + p.x * 2.0) * 0.1;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vA = 0.3 + 0.3 * sin(uTime * 1.3 + p.y * 3.0);
          gl_PointSize = aSize * uPixelRatio * (230.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          gl_FragColor = vec4(uColor, smoothstep(0.5, 0.0, d) * vA);
        }
      `,
    })

    const points = new THREE.Points(geo, mat)
    points.frustumCulled = false
    group.add(points)
    return { points, mat }
  })()

  /* ------------------------------ 动画 ------------------------------ */
  function update(_dt, elapsed) {
    garlands.forEach(({ mat }, i) => {
      mat.uniforms.uTime.value = elapsed + i * 1.7
    })
    dust.mat.uniforms.uTime.value = elapsed

    star.rotation.y = elapsed * 0.6
    star.position.y = TREE.height + 0.05 + Math.sin(elapsed * 1.1) * 0.035
    starHalo.position.y = star.position.y
    const pulse = 0.85 + Math.sin(elapsed * 1.6) * 0.12
    starHalo.material.opacity = pulse * 0.9
    starHalo.scale.setScalar(1.9 + Math.sin(elapsed * 1.6) * 0.18)
    starLight.intensity = 4.2 + Math.sin(elapsed * 1.6) * 0.8
  }

  function setPixelRatio(pr) {
    garlands.forEach(({ mat }) => (mat.uniforms.uPixelRatio.value = pr))
    dust.mat.uniforms.uPixelRatio.value = pr
  }

  return { group, update, setPixelRatio, star }
}

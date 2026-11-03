import * as THREE from 'three'

/* ------------------------------------------------------------------
   低模装饰物：礼物盒、袜子、背景雪松
   全部用基础几何体拼装，不依赖外部模型或贴图。
------------------------------------------------------------------ */

export const GIFT_COLORS = [0xa62f3a, 0x245a45, 0x2b3f78, 0x7a5a2e, 0x5f3a66, 0x2f6f72, 0x9b3b5c, 0x8a6326]

export function createGift(size = 0.45, color = 0xa62f3a, ribbonColor = 0xf1d39b) {
  const group = new THREE.Group()
  const height = size * 0.78

  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.18 })
  const ribbonMat = new THREE.MeshStandardMaterial({
    color: ribbonColor,
    roughness: 0.32,
    metalness: 0.62,
    emissive: ribbonColor,
    emissiveIntensity: 0.12,
  })

  const body = new THREE.Mesh(new THREE.BoxGeometry(size, height, size), bodyMat)
  body.position.y = height / 2
  group.add(body)

  // 十字丝带
  const ribbonA = new THREE.Mesh(new THREE.BoxGeometry(size * 0.15, height + 0.005, size * 1.015), ribbonMat)
  ribbonA.position.y = height / 2
  group.add(ribbonA)

  const ribbonB = new THREE.Mesh(new THREE.BoxGeometry(size * 1.015, height + 0.005, size * 0.15), ribbonMat)
  ribbonB.position.y = height / 2
  group.add(ribbonB)

  // 顶上的蝴蝶结
  const bow = new THREE.Group()
  bow.position.y = height
  const loopGeo = new THREE.TorusGeometry(size * 0.1, size * 0.032, 5, 10)
  for (const dir of [-1, 1]) {
    const loop = new THREE.Mesh(loopGeo, ribbonMat)
    loop.position.x = dir * size * 0.095
    loop.rotation.z = dir * 0.85
    loop.scale.set(1, 0.72, 1)
    bow.add(loop)
  }
  const knot = new THREE.Mesh(new THREE.SphereGeometry(size * 0.052, 8, 8), ribbonMat)
  bow.add(knot)
  group.add(bow)

  group.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true
      obj.receiveShadow = true
    }
  })
  return group
}

export function createStocking(color = 0xb63a3a, cuffColor = 0xf7ead6) {
  const group = new THREE.Group()

  const felt = new THREE.MeshStandardMaterial({ color, roughness: 0.92 })
  const cuffMat = new THREE.MeshStandardMaterial({ color: cuffColor, roughness: 0.95 })

  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.24, 0.05), felt)
  leg.position.y = 0.02
  group.add(leg)

  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.11, 0.055), felt)
  foot.position.set(0.035, -0.145, 0)
  group.add(foot)

  const toe = new THREE.Mesh(new THREE.SphereGeometry(0.058, 8, 6), felt)
  toe.position.set(0.135, -0.145, 0)
  toe.scale.set(1, 0.9, 0.75)
  group.add(toe)

  const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.06, 0.065), cuffMat)
  cuff.position.y = 0.15
  group.add(cuff)

  // 挂绳
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.008, 4, 12), cuffMat)
  loop.position.y = 0.195
  group.add(loop)

  group.scale.setScalar(0.85)
  group.traverse((obj) => {
    if (obj.isMesh) obj.castShadow = true
  })
  return group
}

/** 背景里的雪松，三层绿色锥体 + 白色雪帽 */
export function createSnowPine(scale = 1) {
  const group = new THREE.Group()

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.13, 0.8, 7),
    new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 0.95 }),
  )
  trunk.position.y = 0.4
  trunk.castShadow = true
  group.add(trunk)

  const green = new THREE.MeshStandardMaterial({ color: 0x0c3024, roughness: 0.9 })
  const snow = new THREE.MeshStandardMaterial({ color: 0xd9e6f5, roughness: 0.95 })

  const tiers = [
    { y: 0.35, r: 0.9, h: 1.5 },
    { y: 1.0, r: 0.72, h: 1.35 },
    { y: 1.62, r: 0.52, h: 1.2 },
  ]
  for (const { y, r, h } of tiers) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 9), green)
    cone.position.y = y + h / 2
    cone.castShadow = true
    group.add(cone)

    // 每层顶部落一层薄雪
    const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.62, h * 0.45, 9), snow)
    cap.position.y = y + h * 0.58
    cap.castShadow = true
    group.add(cap)
  }

  group.scale.setScalar(scale)
  return group
}

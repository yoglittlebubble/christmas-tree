import * as THREE from 'three'

/* ------------------------------------------------------------------
   雪地环境：轻微起伏的雪面 + 屋边雪堆 + 夜空星点
------------------------------------------------------------------ */

export function createGround() {
  const group = new THREE.Group()
  group.name = 'snow-ground'

  const geo = new THREE.PlaneGeometry(100, 100, 110, 110)
  const pos = geo.attributes.position

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = -pos.getY(i) // 平面旋转前 Y 对应世界 -Z，仅用于取噪声
    let h =
      Math.sin(x * 0.42) * Math.cos(z * 0.37) * 0.045 +
      Math.sin(x * 0.13 + z * 0.21) * 0.075

    // 小屋占地范围内压平，避免起伏穿出室内地板
    const dx = Math.max(Math.abs(x) - 4.2, 0)
    const dz = Math.max(Math.abs(z) - 3.8, 0)
    const damp = THREE.MathUtils.clamp(Math.min(dx, dz) / 2.2, 0, 1)
    pos.setZ(i, h * damp)
  }
  geo.computeVertexNormals()

  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color: 0xc1d1e3,
      roughness: 0.96,
      metalness: 0.0,
    }),
  )
  mesh.rotation.x = -Math.PI / 2
  mesh.receiveShadow = true
  group.add(mesh)

  /* ------------------------------ 屋边雪堆 ------------------------------ */
  const driftMat = new THREE.MeshStandardMaterial({ color: 0xe2ecf8, roughness: 0.95 })
  const driftGeo = new THREE.SphereGeometry(1, 18, 12)
  const drifts = [
    { x: 4.7, z: 2.3, sx: 1.9, sy: 0.42, sz: 1.3, r: 0.3 },
    { x: -4.8, z: 1.4, sx: 1.6, sy: 0.36, sz: 1.1, r: -0.5 },
    { x: 4.2, z: -2.6, sx: 2.0, sy: 0.4, sz: 1.2, r: 1.2 },
    { x: -4.1, z: -2.9, sx: 2.1, sy: 0.45, sz: 1.4, r: -0.9 },
    { x: 6.1, z: -0.4, sx: 1.3, sy: 0.32, sz: 0.9, r: 0.6 },
    { x: -6.2, z: -1.2, sx: 1.4, sy: 0.3, sz: 1.0, r: 0.2 },
    { x: 0.4, z: 5.7, sx: 2.2, sy: 0.32, sz: 1.1, r: -0.3 },
  ]
  for (const { x, z, sx, sy, sz, r } of drifts) {
    const drift = new THREE.Mesh(driftGeo, driftMat)
    drift.position.set(x, sy * 0.28, z)
    drift.scale.set(sx, sy, sz)
    drift.rotation.y = r
    drift.castShadow = true
    drift.receiveShadow = true
    group.add(drift)
  }

  /* ------------------------------ 夜空星点 ------------------------------ */
  const starCount = 420
  const starPositions = new Float32Array(starCount * 3)
  for (let i = 0; i < starCount; i++) {
    const a = Math.random() * Math.PI * 2
    const y = 0.08 + Math.random() * 0.9
    const r = Math.sqrt(1 - y * y) * 60
    starPositions[i * 3] = Math.cos(a) * r
    starPositions[i * 3 + 1] = y * 60
    starPositions[i * 3 + 2] = Math.sin(a) * r
  }
  const starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
  const starMat = new THREE.PointsMaterial({
    color: 0xcfe0ff,
    size: 0.22,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    fog: false,
  })
  group.add(new THREE.Points(starGeo, starMat))

  return group
}

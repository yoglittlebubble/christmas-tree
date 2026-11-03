import * as THREE from 'three'
import { createGift } from './decorations.js'

/* ------------------------------------------------------------------
   雪地小屋：原木墙体 + 人字屋顶 + 暖光门窗
   朝 +Z 的正面开两扇窗和一扇门，方便从屋外看到室内的圣诞树。
------------------------------------------------------------------ */

export const CABIN = {
  width: 7.2,
  depth: 6.2,
  wallHeight: 3.1,
  peakHeight: 4.5,
  frontZ: 3.1,
  door: { width: 1.7, height: 2.72 },
  windows: [
    { x: -2.2, width: 1.65, height: 1.55, sill: 0.95 },
    { x: 2.2, width: 1.65, height: 1.55, sill: 0.95 },
  ],
}

const W = CABIN.width
const D = CABIN.depth
const WALL_H = CABIN.wallHeight
const PEAK_H = CABIN.peakHeight
const FRONT_Z = CABIN.frontZ

function standard(color, roughness = 0.8, metalness = 0.05, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra })
}

export function createCabin(glowTex) {
  const group = new THREE.Group()
  group.name = 'cabin'

  const spillMats = []
  const glowMats = []
  const emissiveMats = []

  const wood = standard(0x5c3c27, 0.88)
  const woodDark = standard(0x3d2719, 0.92)
  const woodLight = standard(0x8b5f3d, 0.72)
  const snowMat = standard(0xe3edf9, 0.94)
  const stone = standard(0x4c4741, 0.9)

  const cast = (mesh) => {
    mesh.castShadow = true
    mesh.receiveShadow = true
    return mesh
  }

  /* --------------------------- 室内地面与地毯 --------------------------- */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.3, D - 0.3), standard(0x593925, 0.9))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = 0.05
  floor.receiveShadow = true
  group.add(floor)

  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.65, 40), standard(0x6a2530, 1))
  rug.rotation.x = -Math.PI / 2
  rug.position.set(0, 0.066, -0.95)
  rug.receiveShadow = true
  group.add(rug)

  /* ----------------------------- 原木墙体 ----------------------------- */
  // 后墙：圆木沿 X 轴叠放
  const backLogGeo = new THREE.CylinderGeometry(0.17, 0.17, W - 0.08, 7)
  // 左右墙：圆木沿 Z 轴叠放
  const sideLogGeo = new THREE.CylinderGeometry(0.17, 0.17, D - 0.08, 7)

  for (let i = 0; i < 9; i++) {
    const y = 0.17 + i * 0.33
    const logMat = i % 3 === 2 ? woodDark : wood

    const back = cast(new THREE.Mesh(backLogGeo, logMat))
    back.position.set(0, y, -FRONT_Z)
    back.rotation.z = Math.PI / 2
    group.add(back)

    for (const sx of [-1, 1]) {
      const side = cast(new THREE.Mesh(sideLogGeo, logMat))
      side.position.set((sx * W) / 2, y, 0)
      side.rotation.x = Math.PI / 2
      group.add(side)
    }
  }

  // 四角立柱，把原木墙收边
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = cast(new THREE.Mesh(new THREE.BoxGeometry(0.32, WALL_H, 0.32), woodDark))
      post.position.set((sx * W) / 2, WALL_H / 2, (sz * D) / 2)
      group.add(post)
    }
  }

  /* ----------------------------- 正面墙体 ----------------------------- */
  const wallBox = (w, h, x, y) => {
    const mesh = cast(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.28), wood))
    mesh.position.set(x, y, FRONT_Z)
    group.add(mesh)
  }

  const winL = CABIN.windows[0]
  const winR = CABIN.windows[1]
  const doorHalf = CABIN.door.width / 2

  // 两端及门窗之间的整高墙段
  wallBox(0.575, WALL_H, -3.3125, WALL_H / 2)
  wallBox(0.525, WALL_H, -1.1125, WALL_H / 2)
  wallBox(0.525, WALL_H, 1.1125, WALL_H / 2)
  wallBox(0.575, WALL_H, 3.3125, WALL_H / 2)

  // 两扇窗的上、下墙段
  for (const win of CABIN.windows) {
    const winBottom = win.sill
    const winTop = win.sill + win.height
    wallBox(win.width, winBottom, win.x, winBottom / 2)
    wallBox(win.width, WALL_H - winTop, win.x, (winTop + WALL_H) / 2)
  }

  // 门上方留一道横向气窗，刚好能看到树顶的星星
  const transomY = CABIN.door.height
  const transomH = WALL_H - transomY

  /* ------------------------------ 门窗框 ------------------------------ */
  for (const win of CABIN.windows) {
    const { x: cx, width: w, height: h, sill } = win
    const frameZ = FRONT_Z + 0.16

    for (const sy of [sill, sill + h]) {
      const bar = cast(new THREE.Mesh(new THREE.BoxGeometry(w + 0.18, 0.1, 0.18), woodLight))
      bar.position.set(cx, sy, frameZ)
      group.add(bar)
    }
    for (const sx of [-1, 1]) {
      const bar = cast(new THREE.Mesh(new THREE.BoxGeometry(0.1, h, 0.18), woodLight))
      bar.position.set(cx + (sx * w) / 2, sill + h / 2, frameZ)
      group.add(bar)
    }

    // 十字窗棂
    const mullionV = cast(new THREE.Mesh(new THREE.BoxGeometry(0.055, h, 0.1), woodDark))
    mullionV.position.set(cx, sill + h / 2, frameZ + 0.02)
    group.add(mullionV)

    const mullionH = cast(new THREE.Mesh(new THREE.BoxGeometry(w, 0.055, 0.1), woodDark))
    mullionH.position.set(cx, sill + h * 0.52, frameZ + 0.02)
    group.add(mullionH)

    // 窗台 + 台上薄雪
    const sillBoard = cast(new THREE.Mesh(new THREE.BoxGeometry(w + 0.36, 0.1, 0.34), woodLight))
    sillBoard.position.set(cx, sill - 0.02, FRONT_Z + 0.24)
    group.add(sillBoard)

    const sillSnow = cast(new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.055, 0.26), snowMat))
    sillSnow.position.set(cx, sill + 0.05, FRONT_Z + 0.27)
    group.add(sillSnow)
  }

  // 门框、门上气窗框
  const doorFrameZ = FRONT_Z + 0.1
  const lintel = cast(new THREE.Mesh(new THREE.BoxGeometry(CABIN.door.width + 0.26, 0.12, 0.2), woodLight))
  lintel.position.set(0, transomY, doorFrameZ)
  group.add(lintel)

  for (const sx of [-1, 1]) {
    const jamb = cast(new THREE.Mesh(new THREE.BoxGeometry(0.12, CABIN.door.height + 0.1, 0.2), woodLight))
    jamb.position.set((sx * (CABIN.door.width + 0.12)) / 2, CABIN.door.height / 2, doorFrameZ)
    group.add(jamb)
  }

  const transomTop = cast(new THREE.Mesh(new THREE.BoxGeometry(CABIN.door.width + 0.26, 0.09, 0.2), woodLight))
  transomTop.position.set(0, WALL_H - 0.03, doorFrameZ)
  group.add(transomTop)

  const transomBar = cast(new THREE.Mesh(new THREE.BoxGeometry(0.06, transomH, 0.12), woodDark))
  transomBar.position.set(0, transomY + transomH / 2, doorFrameZ)
  group.add(transomBar)

  // 门口保持通透，靠门框、台阶和小灯说明这是入口

  // 门口台阶，上面也铺一层雪
  const step = cast(new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.18, 1.0), woodDark))
  step.position.set(0, 0.09, FRONT_Z + 0.62)
  group.add(step)

  const stepSnow = cast(new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.06, 1.0), snowMat))
  stepSnow.position.set(0, 0.21, FRONT_Z + 0.62)
  group.add(stepSnow)

  const doormat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.018, 0.5), standard(0x5c1f28, 1))
  doormat.position.set(0, 0.25, FRONT_Z + 0.78)
  doormat.receiveShadow = true
  group.add(doormat)

  /* ------------------------------ 山墙 ------------------------------ */
  const gableShape = new THREE.Shape()
  gableShape.moveTo(-W / 2, WALL_H)
  gableShape.lineTo(W / 2, WALL_H)
  gableShape.lineTo(0, PEAK_H)
  gableShape.closePath()

  const gableGeo = new THREE.ShapeGeometry(gableShape)
  for (const sz of [-1, 1]) {
    const gable = new THREE.Mesh(
      gableGeo,
      standard(0x4b3020, 0.9, 0.05, { side: THREE.DoubleSide }),
    )
    gable.position.z = (sz * D) / 2
    gable.castShadow = true
    gable.receiveShadow = true
    group.add(gable)
  }

  // 山墙上的圆形小窗，透出黄色灯光
  const roundMat = standard(0x2b1a10, 0.5, 0.1, {
    emissive: 0xffb055,
    emissiveIntensity: 1.5,
  })
  roundMat.userData.baseEmissive = 1.5
  emissiveMats.push(roundMat)

  const roundWindow = new THREE.Mesh(new THREE.CircleGeometry(0.4, 32), roundMat)
  roundWindow.position.set(0, 3.74, FRONT_Z + 0.012)
  group.add(roundWindow)

  const roundFrame = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.055, 8, 32), woodLight)
  roundFrame.position.set(0, 3.74, FRONT_Z + 0.03)
  roundFrame.castShadow = true
  group.add(roundFrame)

  for (const [w, h, x, y] of [
    [0.045, 0.78, 0, 3.74],
    [0.78, 0.045, 0, 3.74],
  ]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.04), woodDark)
    bar.position.set(x, y, FRONT_Z + 0.05)
    group.add(bar)
  }

  /* ------------------------------ 屋顶 ------------------------------ */
  const eaveX = W / 2 + 0.35
  const eaveY = 3.15
  const slopeRise = PEAK_H - eaveY
  const roofAngle = Math.atan2(slopeRise, eaveX)
  const panelLength = Math.hypot(eaveX, slopeRise) + 0.12
  const roofDepth = D + 0.9

  for (const side of [-1, 1]) {
    const panel = cast(new THREE.Mesh(new THREE.BoxGeometry(panelLength, 0.16, roofDepth), woodDark))
    panel.position.set((side * eaveX) / 2, (eaveY + PEAK_H) / 2, 0)
    panel.rotation.z = -side * roofAngle
    group.add(panel)

    // 屋面积雪：沿屋面法线抬高一点
    const snowPanel = cast(new THREE.Mesh(new THREE.BoxGeometry(panelLength + 0.08, 0.14, roofDepth + 0.08), snowMat))
    const nx = side * Math.sin(roofAngle)
    const ny = Math.cos(roofAngle)
    snowPanel.position.set(panel.position.x + nx * 0.15, panel.position.y + ny * 0.15, 0)
    snowPanel.rotation.z = -side * roofAngle
    group.add(snowPanel)
  }

  // 屋脊雪线
  const ridgeSnow = cast(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, roofDepth + 0.1), snowMat))
  ridgeSnow.position.set(0, PEAK_H + 0.16, 0)
  group.add(ridgeSnow)

  /* ----------------------------- 烟囱 ----------------------------- */
  const chimney = cast(new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.6, 0.62), stone))
  chimney.position.set(2.15, 4.35, -1.35)
  group.add(chimney)

  const chimneySnow = cast(new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.12, 0.72), snowMat))
  chimneySnow.position.set(2.15, 5.21, -1.35)
  group.add(chimneySnow)

  /* ----------------------------- 门边小灯 ----------------------------- */
  const lanternFrame = cast(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.32, 0.22), woodDark))
  lanternFrame.position.set(1.11, 2.16, FRONT_Z + 0.28)
  group.add(lanternFrame)

  const lanternMat = standard(0x1d120b, 0.4, 0.1, { emissive: 0xffb45f, emissiveIntensity: 2.2 })
  lanternMat.userData.baseEmissive = 2.2
  emissiveMats.push(lanternMat)

  const lanternCore = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.2, 0.13), lanternMat)
  lanternCore.position.set(1.11, 2.16, FRONT_Z + 0.3)
  group.add(lanternCore)

  /* --------------------------- 窗口暖光与地面光斑 --------------------------- */
  const makeGlowSprite = (x, y, z, sx, sy, opacity) => {
    const mat = new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xffb45f,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    mat.userData.baseOpacity = opacity
    glowMats.push(mat)

    const sprite = new THREE.Sprite(mat)
    sprite.position.set(x, y, z)
    sprite.scale.set(sx, sy, 1)
    group.add(sprite)
  }

  for (const win of CABIN.windows) {
    makeGlowSprite(win.x, win.sill + win.height / 2, FRONT_Z + 0.55, 2.8, 2.3, 0.09)
  }
  makeGlowSprite(0, 1.5, FRONT_Z + 0.7, 3.2, 3.4, 0.1)
  makeGlowSprite(1.11, 2.16, FRONT_Z + 0.48, 0.9, 0.9, 0.32)

  // 落到雪地上的黄色光斑
  const spill = (w, d, x, z, opacity) => {
    const mat = new THREE.MeshBasicMaterial({
      map: glowTex,
      color: 0xffb45f,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    mat.userData.baseOpacity = opacity
    spillMats.push(mat)

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat)
    plane.rotation.x = -Math.PI / 2
    plane.position.set(x, 0.04, z)
    group.add(plane)
  }

  spill(7.4, 5.2, 0, 4.9, 0.3)
  spill(4.4, 3.6, winL.x, 4.5, 0.18)
  spill(4.4, 3.6, winR.x, 4.5, 0.18)

  /* --------------------------- 屋外雪地上的礼物 --------------------------- */
  const outsideGifts = [
    { x: 1.18, z: 3.82, y: 0.24, s: 0.32, c: 0x245a45, r: 0.4 },
    { x: -1.26, z: 3.9, y: 0.24, s: 0.36, c: 0xa62f3a, r: -0.5 },
    { x: 2.05, z: 4.55, y: 0, s: 0.44, c: 0x2b3f78, r: 0.9 },
    { x: -2.25, z: 4.7, y: 0, s: 0.38, c: 0x8a6326, r: -0.2 },
  ]
  for (const { x, z, y, s, c, r } of outsideGifts) {
    const gift = createGift(s, c)
    gift.position.set(x, y, z)
    gift.rotation.y = r
    group.add(gift)
  }

  /* ------------------------------ 屋檐积雪 ------------------------------ */
  for (const side of [-1, 1]) {
    const icicle = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.5, 6), snowMat)
    icicle.position.set(side * 3.55, 2.9, FRONT_Z + 0.2)
    icicle.rotation.x = Math.PI
    group.add(icicle)
  }

  return { group, spillMats, glowMats, emissiveMats }
}

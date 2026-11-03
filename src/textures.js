import * as THREE from 'three'

/**
 * 用 Canvas 生成柔和的径向渐变贴图。
 * 光斑、窗口暖雾、星星光晕共用这一张，避免加载外部图片。
 */
export function radialTexture(size = 128, stops = [[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  stops.forEach(([offset, color]) => g.addColorStop(offset, color))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function createGlowTexture() {
  return radialTexture(128, [
    [0, 'rgba(255,255,255,1)'],
    [0.22, 'rgba(255,255,255,0.62)'],
    [0.55, 'rgba(255,255,255,0.18)'],
    [1, 'rgba(255,255,255,0)'],
  ])
}

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

import { createGlowTexture } from './textures.js'
import { createGround } from './terrain.js'
import { createCabin } from './cabin.js'
import { createTree } from './tree.js'
import { createSnow } from './snow.js'
import { createLighting } from './lighting.js'
import { createSnowPine } from './decorations.js'
import './style.css'

/* ==================================================================
   1. 场景初始化：渲染器 / 相机 / 轨道控制 / 夜空 / 后期
================================================================== */

const canvas = document.querySelector('#scene')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.0
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap

const scene = new THREE.Scene()
scene.fog = new THREE.FogExp2(0x070b16, 0.017)

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 150)
camera.position.set(2.2, 2.7, 11.3)

const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, 1.65, 0.1)
controls.enableDamping = true
controls.dampingFactor = 0.055
controls.autoRotate = true
controls.autoRotateSpeed = 0.35
controls.minDistance = 8.5
controls.maxDistance = 26
controls.minPolarAngle = 0.65
controls.maxPolarAngle = Math.PI * 0.482 // 接近地平线即止，相机不会钻到雪地下面
controls.enablePan = false

/* 只有金属和彩灯需要一点点环境反射，整体保持夜景 */
const pmrem = new THREE.PMREMGenerator(renderer)
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
scene.environmentIntensity = 0.1

/* 夜空渐变 */
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(72, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color(0x0b1733) },
      uBottom: { value: new THREE.Color(0x02040a) },
    },
    vertexShader: /* glsl */ `
      varying float vH;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vH = normalize(wp.xyz).y;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop;
      uniform vec3 uBottom;
      varying float vH;
      void main() {
        float t = smoothstep(-0.15, 0.85, vH);
        gl_FragColor = vec4(mix(uBottom, uTop, t), 1.0);
      }
    `,
  }),
)
scene.add(sky)

const glowTex = createGlowTexture()

/* ==================================================================
   2. 场景内容：雪地 / 小屋 / 圣诞树 / 雪松 / 飘雪 / 灯光
================================================================== */

const ground = createGround()
scene.add(ground)

const cabin = createCabin(glowTex)
scene.add(cabin.group)

const tree = createTree(glowTex)
scene.add(tree.group)

// 小屋周围的背景雪松，增加纵深
const pineLayout = [
  [-9.5, -5.5, 1.7],
  [-7.2, 3.2, 1.25],
  [9.2, -6.5, 1.9],
  [11.5, 2.4, 1.45],
  [-13.5, 2.8, 1.6],
  [7.5, -11, 2.1],
  [14, -9, 1.8],
  [-15, -8.5, 1.9],
  [3.5, -13, 1.6],
]
for (const [x, z, s] of pineLayout) {
  const pine = createSnowPine(s)
  pine.position.set(x, 0, z)
  pine.rotation.y = Math.random() * Math.PI * 2
  scene.add(pine)
}

const snow = createSnow(2600)
scene.add(snow.points)

const lighting = createLighting(scene, cabin)
lighting.setLevel(0.82)

/* ==================================================================
   3. 后期：泛光让窗口和星星的暖光更柔
================================================================== */

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.48, 0.5, 0.58)
composer.addPass(bloom)
composer.addPass(new OutputPass())

/* ==================================================================
   4. 交互：飘雪开关 / 室内灯光开关 / 亮度条 / 自动旋转
================================================================== */

const state = { snow: true, lights: true, rotate: true, level: 0.82 }
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

if (reduceMotion) {
  state.rotate = false
  controls.autoRotate = false
  const rotateBtn = document.querySelector('[data-key="rotate"]')
  rotateBtn.classList.remove('is-on')
  rotateBtn.setAttribute('aria-pressed', 'false')
}

document.querySelectorAll('.toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.key
    state[key] = !state[key]
    btn.classList.toggle('is-on', state[key])
    btn.setAttribute('aria-pressed', String(state[key]))

    if (key === 'snow') snow.points.visible = state[key]
    if (key === 'lights') lighting.setOn(state[key])
    if (key === 'rotate') controls.autoRotate = state[key]
  })
})

const brightness = document.querySelector('#brightness')
const brightnessValue = document.querySelector('#brightness-value')

function applyBrightness(value) {
  const v = Number(value)
  state.level = v / 100
  lighting.setLevel(state.level)
  brightnessValue.textContent = `${v}%`
  brightness.style.setProperty('--value', `${v}%`)
}

brightness.addEventListener('input', () => applyBrightness(brightness.value))
applyBrightness(brightness.value)

/* ==================================================================
   5. 尺寸自适应 + 渲染循环
================================================================== */

function onResize() {
  const w = window.innerWidth
  const h = window.innerHeight
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
  composer.setSize(w, h)
  bloom.setSize(w, h)

  const pr = renderer.getPixelRatio()
  snow.setPixelRatio(pr)
  tree.setPixelRatio(pr)
}
window.addEventListener('resize', onResize)

const timer = new THREE.Timer()
timer.connect(document)
let elapsed = 0

function tick() {
  timer.update()
  const dt = Math.min(timer.getDelta(), 0.05)
  elapsed += dt

  tree.update(dt, elapsed)
  if (state.snow) snow.update(dt, elapsed)

  controls.update()
  composer.render()

  requestAnimationFrame(tick)
}

/* 首帧后再揭开遮罩，避免白闪 */
requestAnimationFrame(() => {
  tick()
  requestAnimationFrame(() => document.querySelector('#curtain').classList.add('is-hidden'))
})

// 开发环境暴露一份场景引用，方便在控制台调试镜头与灯光
if (import.meta.env.DEV) {
  window.__scene = { camera, controls, state, lighting, snow }
}

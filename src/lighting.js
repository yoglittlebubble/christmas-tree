import * as THREE from 'three'

/* ------------------------------------------------------------------
   灯光：室外冷蓝月光 + 室内暖黄点光 + 窗外/门口暖光溢出
   室内灯光由开关与亮度条控制，室外雪地始终保持偏冷的暗调。
------------------------------------------------------------------ */

export function createLighting(scene, cabin) {
  /* --------------------------- 室外夜色 --------------------------- */
  scene.add(new THREE.AmbientLight(0x273c60, 0.55))

  // 月光，室外唯一投射阴影的光源
  const moon = new THREE.DirectionalLight(0xa8c4ff, 0.85)
  moon.position.set(-9, 13, 7)
  moon.castShadow = true
  moon.shadow.mapSize.set(1024, 1024)
  moon.shadow.camera.left = -15
  moon.shadow.camera.right = 15
  moon.shadow.camera.top = 15
  moon.shadow.camera.bottom = -15
  moon.shadow.camera.near = 1
  moon.shadow.camera.far = 40
  moon.shadow.bias = -0.0008
  moon.shadow.normalBias = 0.02
  scene.add(moon)

  // 背光，把雪松和小屋的轮廓从夜空里托出来
  const rim = new THREE.PointLight(0x5d86d8, 7, 30, 2)
  rim.position.set(8, 6, -8)
  scene.add(rim)

  /* --------------------------- 室内暖光 --------------------------- */
  const roomLights = []

  const addRoomLight = (color, intensity, distance, x, y, z) => {
    const light = new THREE.PointLight(color, intensity, distance, 2)
    light.position.set(x, y, z)
    light.userData.baseIntensity = intensity
    roomLights.push(light)
    scene.add(light)
    return light
  }

  addRoomLight(0xffb45f, 38, 13, 0, 2.3, 0.1) // 主灯，下面单独开启阴影
  addRoomLight(0xffa955, 10, 8, 0, 1.35, 2.3) // 门口
  addRoomLight(0xff9c46, 6, 5, 0, 0.55, 0.2) // 地面反射，照亮礼物
  addRoomLight(0xffa955, 6, 7, -2.2, 1.7, 3.6) // 左窗外溢光
  addRoomLight(0xffa955, 6, 7, 2.2, 1.7, 3.6) // 右窗外溢光

  // 主灯投影：把暖光关在屋里，只从门窗口漏出去，外面雪地保持冷暗
  const mainLight = roomLights[0]
  mainLight.castShadow = true
  mainLight.shadow.mapSize.set(1024, 1024)
  mainLight.shadow.camera.near = 0.1
  mainLight.shadow.camera.far = 14
  mainLight.shadow.bias = -0.001
  mainLight.shadow.normalBias = 0.03

  /* --------------------------- 亮度控制 --------------------------- */
  let on = true
  let level = 0.82

  const apply = () => {
    const k = on ? level : 0

    roomLights.forEach((light) => {
      light.intensity = light.userData.baseIntensity * k
    })

    cabin.spillMats.forEach((mat) => {
      mat.opacity = mat.userData.baseOpacity * k
    })

    cabin.glowMats.forEach((mat) => {
      mat.opacity = mat.userData.baseOpacity * k
    })

    cabin.emissiveMats.forEach((mat) => {
      mat.emissiveIntensity = mat.userData.baseEmissive * (0.03 + 0.97 * k)
    })
  }

  apply()

  return {
    setOn(value) {
      on = value
      apply()
    },
    setLevel(value) {
      level = THREE.MathUtils.clamp(value, 0, 1)
      apply()
    },
  }
}

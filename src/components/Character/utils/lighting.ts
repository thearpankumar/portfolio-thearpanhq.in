import * as THREE from "three";
import { gsap } from "gsap";
import { loadHdr } from "../../utils/hdr";

const ENV_SATURATION = 0.3;

const setLighting = (scene: THREE.Scene) => {
  const directionalLight = new THREE.DirectionalLight(0xffb3ab, 0);
  directionalLight.intensity = 0;
  directionalLight.position.set(-0.47, -0.32, -1);
  scene.add(directionalLight);

  const pointLight = new THREE.PointLight(0xff9c9c, 0, 100, 3);
  pointLight.position.set(3, 12, 4);
  scene.add(pointLight);

  // The map is pink, which flooded the whole model. Mostly desaturated, it
  // fills the model with neutral light and leaves the colour to the rim light.
  // Off until turnOnLights() fades it in, whether the map arrives before or after.
  scene.environmentIntensity = 0;
  scene.environmentRotation.set(5.76, 85.85, 1);
  const environment = loadHdr("/models/char_enviorment.hdr", {
    saturation: ENV_SATURATION,
  })
    .then((texture) => {
      scene.environment = texture;
    })
    .catch((err) => console.warn("[Character] environment map failed", err));

  function setPointLight(
    screenLight: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>
  ) {
    if (screenLight.material.opacity > 0.9) {
      pointLight.intensity = screenLight.material.emissiveIntensity * 20;
    } else {
      pointLight.intensity = 0;
    }
  }
  const duration = 2;
  const ease = "power2.inOut";
  function turnOnLights() {
    gsap.to(scene, {
      environmentIntensity: 0.64,
      duration: duration,
      ease: ease,
    });
    gsap.to(directionalLight, {
      intensity: 1,
      duration: duration,
      ease: ease,
    });
    gsap.to(".character-rim", {
      y: "55%",
      opacity: 1,
      delay: 0.2,
      duration: 2,
    });
  }

  /** settles once the environment map is in place (or has failed) */
  return { setPointLight, turnOnLights, environment };
};

export default setLighting;

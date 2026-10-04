import * as THREE from "three";
import { GLTF, GLTFLoader, MeshoptDecoder } from "three-stdlib";
import { setCharTimeline } from "../../utils/GsapScroll";
import { decryptFile } from "./decrypt";

const setCharacter = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  // true once the owning effect has been cleaned up (StrictMode remount, unmount)
  isStale: () => boolean = () => false,
  // the scene's environment map: the materials' shaders depend on it, so they
  // are compiled once it is in place rather than again on the first frame
  environment: Promise<unknown> = Promise.resolve()
) => {
  const loader = new GLTFLoader();
  // the model's geometry is Meshopt-compressed (see scripts/build-model.mjs)
  loader.setMeshoptDecoder(MeshoptDecoder());

  const loadCharacter = async (): Promise<GLTF | null> => {
    let blobUrl: string;
    try {
      const encryptedBlob = await decryptFile(
        "/models/character.enc",
        "Character3D#@"
      );
      blobUrl = URL.createObjectURL(new Blob([encryptedBlob]));
    } catch (err) {
      console.error(err);
      throw err;
    }

    return new Promise<GLTF | null>((resolve, reject) => {
      let character: THREE.Object3D;
      loader.load(
        blobUrl,
        async (gltf) => {
          character = gltf.scene;
          if (isStale()) {
            resolve(null);
            return;
          }
          await environment;
          if (isStale()) {
            resolve(null);
            return;
          }
          await renderer.compileAsync(character, camera, scene);
          if (isStale()) {
            resolve(null);
            return;
          }
          character.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              child.castShadow = true;
              child.receiveShadow = true;
              mesh.frustumCulled = true;
            }
          });
          resolve(gltf);
          setCharTimeline(character, camera);
          character!.getObjectByName("footR")!.position.y = 3.36;
          character!.getObjectByName("footL")!.position.y = 3.36;
        },
        undefined,
        (error) => {
          console.error("Error loading GLTF model:", error);
          reject(error);
        }
      );
    });
  };

  return { loadCharacter };
};

export default setCharacter;

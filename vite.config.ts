import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Two chunks are deliberately larger than Vite's 500 kB default: `three`
    // (~680 kB, needed by the character scene) and the lazy tech-stack chunk
    // (~830 kB raw / ~250 kB gzip, mostly the physics worker that
    // @react-three/cannon embeds as one string). Raise this if either grows.
    chunkSizeWarningLimit: 900,
  },
  optimizeDeps: {
    // Only scan the app entry (references/ holds unrelated demo projects)
    entries: ["index.html"],
  },
});

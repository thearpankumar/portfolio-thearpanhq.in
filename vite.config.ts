import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Only scan the app entry (references/ holds unrelated demo projects)
    entries: ["index.html"],
  },
});

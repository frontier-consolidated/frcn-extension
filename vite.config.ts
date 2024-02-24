import { resolve } from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/guide/build.html#library-mode
export default defineConfig(({ mode }) => {
  if (mode === "background") {
    return {
      build: {
        outDir: "out/bundle",
        emptyOutDir: false,
        lib: {
          formats: ["iife"],
          entry: resolve(__dirname, "./src/background/index.ts"),
          name: "FRCN Extension Background"
        },
        rollupOptions: {
          output: {
            entryFileNames: "background.global.js",
            extend: true
          }
        }
      }
    }
  }

  return {
    build: {
      outDir: "out/bundle",
      lib: {
        formats: ["iife"],
        entry: resolve(__dirname, "./src/integration/index.ts"),
        name: "FRCN Extension"
      },
      rollupOptions: {
        output: {
          entryFileNames: "integration.global.js",
          extend: true
        }
      }
    }
  }
});
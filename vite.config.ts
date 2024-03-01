import { resolve } from 'path';
import { defineConfig } from 'vite';

import manifests from "./plugins/manifests-transformer";

// https://vitejs.dev/guide/build.html#library-mode
export default defineConfig(({ mode }) => {
  if (mode === "background") {
    return {
      build: {
        outDir: "build/bundle",
        emptyOutDir: false,
        minify: true,
        lib: {
          formats: ["iife"],
          entry: resolve(__dirname, "./src/background.ts"),
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
    plugins: [manifests({
      configDir: resolve(__dirname, "./src/config")
    })],
    define: {
      APP_VERSION: JSON.stringify(process.env.npm_package_version)
    },
    build: {
      outDir: "build/bundle",
      minify: true,
      lib: {
        formats: ["iife"],
        entry: resolve(__dirname, "./src/integration.ts"),
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
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import netlify from "@netlify/vite-plugin-tanstack-start";
import viteTsConfigPaths from "vite-tsconfig-paths";

import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

const basePlugins = [
  tanstackStart(),
  netlify(),
  TanStackRouterVite({
    autoCodeSplitting: true,
    appDirectory: 'src',
  }),
  viteReact(),
  tailwindcss(),
  viteTsConfigPaths({
    projects: ['./tsconfig.json'],
  }),
];

// Add Sentry plugin only if auth token is available
if (process.env.SENTRY_AUTH_TOKEN) {
  basePlugins.push(
    sentryVitePlugin({
      org: "org-name",
      project: "project-name",
      authToken: process.env.SENTRY_AUTH_TOKEN,
    })
  );
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: basePlugins,
  build: {
    // Only generate source maps if Sentry is enabled
    sourcemap: !!process.env.SENTRY_AUTH_TOKEN,
  },
});

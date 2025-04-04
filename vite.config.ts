import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if we're running on Replit
const isReplit = !!process.env.REPL_ID;
const replitId = process.env.REPL_ID;

// Get the Replit domain from the REPLIT_SLUG environment variable
const replitSlug = process.env.REPLIT_SLUG || replitId;
// Use the Replit domain pattern to ensure we have the correct URL format
const replitDomain = process.env.REPL_SLUG
  ? `${replitSlug}.${process.env.REPL_OWNER}.repl.co`
  : undefined;

// For newer Replit environments, use the Replit_HOST if available
// This is the most reliable way to get the correct hostname
const replitHost = process.env.REPLIT_HOST;

// Determine the base URL based on available information
// Prioritize REPLIT_HOST as it's the most accurate
const replitBaseUrl = isReplit
  ? replitHost || replitDomain || `${replitId}.id.repl.co`
  : undefined;

// Log the environment for debugging
console.log("Environment config:", {
  isReplit,
  replitId,
  replitSlug,
  replitHost,
  replitDomain,
  replitBaseUrl,
  nodeEnv: process.env.NODE_ENV,
});

export default defineConfig({
  // Add specific configuration that helps in diagnostics
  define: {
    __IS_REPLIT__: JSON.stringify(isReplit),
    __REPLIT_ID__: JSON.stringify(replitId),
    __REPLIT_BASE_URL__: JSON.stringify(replitBaseUrl),
  },
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    // Listen on all network interfaces
    host: true,
    // Use PORT from environment or fallback to 3000
    port: process.env.PORT || 3000,
    // Allow Replit to assign a different port if needed
    strictPort: false,

    // Disable HMR completely for Replit environment to avoid WebSocket errors
    hmr: false,

    // Optimize file watching for the Replit container environment
    watch: {
      usePolling: true,
      interval: 1000,
    },

    // Optimize middleware for WebSocket proxying in Replit
    middlewareMode: false,

    // Ensure CORS is properly configured
    cors: {
      origin: "*",
      methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
      credentials: true,
    },
  },
});

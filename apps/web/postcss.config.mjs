import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDirectory = path.dirname(fileURLToPath(import.meta.url));
const windowsOxideBinaryPath = path.resolve(
  configDirectory,
  "../../node_modules/.pnpm/@tailwindcss+oxide-win32-x64-msvc@4.1.18/node_modules/@tailwindcss/oxide-win32-x64-msvc/tailwindcss-oxide.win32-x64-msvc.node"
);

if (
  process.platform === "win32" &&
  process.arch === "x64" &&
  !process.env.NAPI_RS_NATIVE_LIBRARY_PATH &&
  existsSync(windowsOxideBinaryPath)
) {
  process.env.NAPI_RS_NATIVE_LIBRARY_PATH = windowsOxideBinaryPath;
}

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {},
    // Production optimizations - simplified for compatibility
    ...(process.env.NODE_ENV === "production" && {
      cssnano: {
        preset: [
          "default",
          {
            discardComments: { removeAll: true },
            normalizeWhitespace: true,
            minifySelectors: true,
            colormin: true,
            discardDuplicates: true,
            discardEmpty: true,
            mergeLonghand: true,
            mergeRules: true,
            normalizeUrl: true,
            uniqueSelectors: true,
          },
        ],
      },
    }),
  },
};

export default config;

import { build } from "esbuild";

const workingDirectory = process.cwd();

await build({
  absWorkingDir: workingDirectory,
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  sourcemap: true,
  target: "node20"
});

await build({
  absWorkingDir: workingDirectory,
  entryPoints: ["web/src/main.ts"],
  outdir: "web/dist",
  entryNames: "widget",
  bundle: true,
  format: "esm",
  platform: "browser",
  loader: {
    ".css": "css"
  },
  sourcemap: true,
  target: "es2022"
});

import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "node:fs/promises";

// Server deps bundled into the output to cut cold-start file reads.
const allowlist = ["drizzle-orm", "drizzle-zod", "express", "nanoid", "zod", "zod-validation-error", "dotenv"];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));


  console.log("building server...");
  await esbuild({
    entryPoints: ["server/index.ts"], platform: "node", target: "node20", bundle: true, format: "cjs",
    outfile: "dist/index.cjs", minify: true, logLevel: "info",
    define: { "process.env.NODE_ENV": '"production"' },
    external: externals,
  });
}

buildAll().catch((err) => { console.error(err); process.exit(1); });

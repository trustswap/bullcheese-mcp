// Bundles the two server entry points into bundle/ for the published package.
// The workspace packages (core, policy, signer) are inlined; everything listed
// in this package's dependencies stays an external npm dependency.
import { copyFileSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

rmSync(join(root, "bundle"), { recursive: true, force: true });
await build({
  entryPoints: { stdio: join(root, "src/bin/stdio.ts"), http: join(root, "src/bin/http.ts") },
  outdir: join(root, "bundle"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  external: Object.keys(pkg.dependencies ?? {}).flatMap((name) => [name, `${name}/*`]),
  logLevel: "info",
});

// npm only packs a LICENSE that sits next to package.json.
copyFileSync(join(root, "../../LICENSE"), join(root, "LICENSE"));

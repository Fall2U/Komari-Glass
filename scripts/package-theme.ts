/**
 * Package Komari theme zip after Next.js static export.
 *
 * theme.zip
 * ├── komari-theme.json
 * ├── preview.png
 * └── dist/
 */
import { createWriteStream, existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
// @ts-expect-error archiver has no bundled types in some versions
import archiver from "archiver";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = resolve(root, "dist");
const themeJsonPath = resolve(root, "komari-theme.json");
const previewPath = resolve(root, "preview.png");

function getCommitHash(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "local";
  }
}

function getVersion(): string {
  const manifest = JSON.parse(readFileSync(themeJsonPath, "utf-8")) as {
    version?: string;
  };
  return manifest.version || "0.0.0";
}

async function main() {
  if (!existsSync(distDir)) {
    console.error("[package] dist/ not found. Run `bun run build:only` first.");
    process.exit(1);
  }
  if (!existsSync(themeJsonPath)) {
    console.error("[package] komari-theme.json not found.");
    process.exit(1);
  }

  // Next.js writes index.html into dist/ — ensure required placeholders exist
  const indexPath = resolve(distDir, "index.html");
  if (!existsSync(indexPath)) {
    console.error("[package] dist/index.html not found.");
    process.exit(1);
  }

  const version = getVersion();
  const hash = getCommitHash();
  const zipName = `komari-theme-glass-v${version}-${hash}.zip`;
  const outputPath = resolve(root, zipName);

  await new Promise<void>((resolvePromise, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      const mb = (archive.pointer() / 1024 / 1024).toFixed(2);
      console.log(`[package] Created ${zipName} (${mb} MB)`);
      resolvePromise();
    });
    archive.on("error", reject);

    archive.pipe(output);
    archive.file(themeJsonPath, { name: "komari-theme.json" });
    if (existsSync(previewPath)) {
      archive.file(previewPath, { name: "preview.png" });
    } else {
      console.warn("[package] preview.png missing — zip will omit preview.");
    }
    archive.directory(distDir, "dist");
    void archive.finalize();
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

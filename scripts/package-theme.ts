/**
 * Package Komari theme zip after Next.js static export.
 *
 * release/theme.zip
 * ├── komari-theme.json
 * ├── preview.png
 * └── dist/
 *     ├── preview.png
 *     └── ...
 */
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
// @ts-expect-error archiver 8 does not bundle TypeScript declarations.
import { ZipArchive } from "archiver";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = resolve(root, "dist");
const releaseDir = resolve(root, "release");
const themeJsonPath = resolve(root, "komari-theme.json");
const previewPath = resolve(root, "public", "preview.png");

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

function validateThemeFiles(indexPath: string) {
  const html = readFileSync(indexPath, "utf-8");
  const requiredHtml = [
    "<title>Komari Monitor</title>",
    "A simple server monitor tool.",
    "</head>",
    "</body>",
  ];
  for (const marker of requiredHtml) {
    if (!html.includes(marker)) {
      throw new Error(`[package] dist/index.html is missing required marker: ${marker}`);
    }
  }

  const manifest = JSON.parse(readFileSync(themeJsonPath, "utf-8")) as {
    name?: string;
    short?: string;
  };
  if (!manifest.name?.trim()) {
    throw new Error("[package] komari-theme.json requires a name.");
  }
  if (
    !manifest.short?.match(/^[A-Za-z0-9_-]+$/) ||
    manifest.short.toLowerCase() === "default"
  ) {
    throw new Error("[package] komari-theme.json has an invalid short name.");
  }
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
  validateThemeFiles(indexPath);

  const version = getVersion();
  const hash = getCommitHash();
  const zipName = `komari-theme-glass-v${version}-${hash}.zip`;
  mkdirSync(releaseDir, { recursive: true });
  const outputPath = resolve(releaseDir, zipName);

  await new Promise<void>((resolvePromise, reject) => {
    const output = createWriteStream(outputPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });

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
      if (!existsSync(resolve(distDir, "preview.png"))) {
        archive.file(previewPath, { name: "dist/preview.png" });
      }
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

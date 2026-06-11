import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DIRECTIONS } from "../src/directions/index.mjs";
import { STATIC_THEMES } from "../src/static-themes.mjs";
import { buildPreviewWorkbench } from "../src/preview-workbench.mjs";
import { buildPreviewSemanticTokens, buildPreviewTokenColors } from "../src/preview-tokens.mjs";
import { mergeThemeJson } from "./merge-theme-customizations.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const themesDir = path.join(root, "themes");
const packageJsonPath = path.join(root, "package.json");

/**
 * @param {import('../src/directions/types.mjs').DirectionSpec} direction
 */
function buildThemeJson(direction) {
  return {
    $schema: "vscode://schemas/color-theme",
    name: direction.label,
    type: "dark",
    semanticHighlighting: true,
    colors: buildPreviewWorkbench(direction),
    tokenColors: buildPreviewTokenColors(direction),
    semanticTokenColors: buildPreviewSemanticTokens(direction),
  };
}

async function main() {
  await mkdir(themesDir, { recursive: true });

  const expectedFiles = new Set([
    ...DIRECTIONS.map((d) => d.filename),
    ...STATIC_THEMES.map((t) => t.filename),
  ]);
  const existing = await readdir(themesDir);
  for (const file of existing) {
    if (file.endsWith(".json") && file !== "manifest.json" && !expectedFiles.has(file)) {
      await rm(path.join(themesDir, file));
    }
  }

  for (const direction of DIRECTIONS) {
    const outPath = path.join(themesDir, direction.filename);
    const generated = buildThemeJson(direction);
    let previous = null;
    try {
      previous = JSON.parse(await readFile(outPath, "utf8"));
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code !== "ENOENT") {
        throw error;
      }
    }
    const themeJson = previous ? mergeThemeJson(generated, previous) : generated;
    await writeFile(outPath, `${JSON.stringify(themeJson, null, 2)}\n`, "utf8");
  }

  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  packageJson.contributes = packageJson.contributes ?? {};
  packageJson.contributes.themes = [
    ...DIRECTIONS.map((direction) => ({
      label: direction.label,
      uiTheme: "vs-dark",
      path: `./themes/${direction.filename}`,
    })),
    ...STATIC_THEMES.map((theme) => ({
      label: theme.label,
      uiTheme: theme.uiTheme,
      path: `./themes/${theme.filename}`,
    })),
  ];

  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");

  console.log(`Generated ${DIRECTIONS.length} NexQL theme(s).`);
}

await main();

#!/usr/bin/env node
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { STATIC_THEMES } from "../src/static-themes.mjs";
import { parseThemeSummary } from "../src/site/parse-theme-summary.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE_DIR = join(ROOT, "site");
const THEMES_DIR = join(ROOT, "themes");
const ASSETS_OUT = join(SITE_DIR, "assets");
const SITE_THEMES_DIR = join(SITE_DIR, "themes");

mkdirSync(ASSETS_OUT, { recursive: true });

// Remove legacy copied themes from site/ (no longer used).
rmSync(SITE_THEMES_DIR, { recursive: true, force: true });

const manifest = STATIC_THEMES.map((spec) => ({
  label: spec.label,
  filename: spec.filename,
  uiTheme: spec.uiTheme,
}));

writeFileSync(join(THEMES_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

for (const spec of STATIC_THEMES) {
  const themeJson = JSON.parse(readFileSync(join(THEMES_DIR, spec.filename), "utf8"));
  parseThemeSummary(themeJson, spec);
}

cpSync(join(ROOT, "nexql-theme-logo.png"), join(ASSETS_OUT, "logo.png"));
cpSync(join(ROOT, "src/site/parse-theme-summary.mjs"), join(SITE_DIR, "js/parse-theme-summary.mjs"));

console.log(`site build: manifest → themes/manifest.json (${manifest.length} themes, served from repo root)`);

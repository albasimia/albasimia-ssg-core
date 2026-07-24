import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as sass from "sass";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = resolve(projectRoot, "package-dist");
const layoutOutput = resolve(outputRoot, "layouts", "BaseLayout.astro");
const stylesOutput = resolve(outputRoot, "styles");

rmSync(resolve(outputRoot, "layouts"), { recursive: true, force: true });
rmSync(stylesOutput, { recursive: true, force: true });
mkdirSync(dirname(layoutOutput), { recursive: true });
mkdirSync(stylesOutput, { recursive: true });

const layoutSource = readFileSync(
  resolve(projectRoot, "src", "layouts", "BaseLayout.astro"),
  "utf8",
).replace('import "../styles/global.scss";', 'import "../styles/global.css";');

writeFileSync(layoutOutput, layoutSource);
writeFileSync(
  resolve(stylesOutput, "theme.css"),
  sass.compile(resolve(projectRoot, "src", "styles", "_theme.scss")).css,
);
writeFileSync(
  resolve(stylesOutput, "global.css"),
  sass.compile(resolve(projectRoot, "src", "styles", "global.scss")).css,
);

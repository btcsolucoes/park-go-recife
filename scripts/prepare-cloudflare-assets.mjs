import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const distDir = resolve("dist");

mkdirSync(distDir, { recursive: true });
writeFileSync(resolve(distDir, ".assetsignore"), "_worker.js\n");

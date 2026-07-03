import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const distDir = path.join(root, "dist");

const validation = spawnSync(process.execPath, [path.join(root, "scripts", "validate-puzzles.mjs")], {
  cwd: root,
  stdio: "inherit"
});

if (validation.status !== 0) {
  process.exit(validation.status ?? 1);
}

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });
fs.cpSync(publicDir, distDir, { recursive: true });

console.log(`Built static site into ${path.relative(root, distDir)}.`);

import { rmSync, cpSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validate } from "./validate.js";
import { generate } from "./generate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");

// 1. Clean dist
console.log("🧹 Cleaning dist/...");
rmSync(dist, { recursive: true, force: true });

// 2. Validate source data
console.log("\n🔍 Validating source data...");
validate();

// 3. Generate API endpoint files
console.log("\n📦 Generating API files...");
generate();

// 4. Copy images
console.log("\n🖼️  Copying images...");
cpSync(join(root, "images", "games"), join(dist, "images", "games"), {
  recursive: true,
});
cpSync(join(root, "images", "oracles"), join(dist, "images", "oracles"), {
  recursive: true,
});
console.log("  → images/games/");
console.log("  → images/oracles/");

console.log("\n🚀 Build complete! Output in dist/");

#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { XMLParser } from "fast-xml-parser";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const gamesJsonPath = join(root, "data", "games.json");
const imagesDir = join(root, "images", "games");

// Load .env file if present
const envPath = join(root, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
}

const VALID_LANGUAGES = ["en", "es", "de", "x"];
const VALID_SIZES = ["xs", "s", "m", "l"];

// ── CLI ─────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const ids = [];
  let language = "en";
  let size = "m";
  let token = process.env.BGG_API_TOKEN || "";
  let update = false;

  for (const arg of argv.slice(2)) {
    if (arg.startsWith("--language=")) {
      language = arg.split("=")[1];
    } else if (arg.startsWith("--size=")) {
      size = arg.split("=")[1];
    } else if (arg.startsWith("--token=")) {
      token = arg.split("=")[1];
    } else if (arg === "--update") {
      update = true;
    } else if (/^\d+$/.test(arg)) {
      ids.push(parseInt(arg, 10));
    }
  }

  if (ids.length === 0) {
    console.error(
      "Usage: node scripts/import-bgg.js <bggId1> [bggId2 ...] [--token=TOKEN] [--language=en] [--size=m] [--update]",
    );
    console.error("\nOptions:");
    console.error(
      "  --token=TOKEN    BGG API Bearer token (or set BGG_API_TOKEN env var)",
    );
    console.error(
      `  --language=CODE  Language (${VALID_LANGUAGES.join(", ")}) [default: en]`,
    );
    console.error(
      `  --size=SIZE      Box size (${VALID_SIZES.join(", ")}) [default: m]`,
    );
    console.error(
      "  --update         Update existing games instead of skipping them",
    );
    console.error(
      "\nGet your token at: https://boardgamegeek.com/applications",
    );
    process.exit(1);
  }

  if (!token) {
    console.error(
      "❌ BGG API token required. Pass --token=TOKEN or set BGG_API_TOKEN env var.",
    );
    console.error(
      "   Register a free app at: https://boardgamegeek.com/applications",
    );
    process.exit(1);
  }

  if (!VALID_LANGUAGES.includes(language)) {
    console.error(
      `Invalid language "${language}". Must be one of: ${VALID_LANGUAGES.join(", ")}`,
    );
    process.exit(1);
  }

  if (!VALID_SIZES.includes(size)) {
    console.error(
      `Invalid size "${size}". Must be one of: ${VALID_SIZES.join(", ")}`,
    );
    process.exit(1);
  }

  return { ids, language, size, token, update };
}

// ── BGG API ─────────────────────────────────────────────────────────────

async function fetchBggData(ids, token) {
  const url = `https://boardgamegeek.com/xmlapi2/thing?id=${ids.join(",")}&stats=1`;
  console.log(`\n🌐 Fetching from BGG API (${ids.length} game(s))...`);

  let retries = 0;
  while (retries < 5) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.status === 200) return res.text();
    if (res.status === 202) {
      retries++;
      console.log(`  ⏳ BGG is preparing data, retry ${retries}/5 in 3s...`);
      await new Promise((r) => setTimeout(r, 3000));
      continue;
    }
    throw new Error(`BGG API returned status ${res.status}`);
  }
  throw new Error("BGG API did not return data after 5 retries");
}

function parseBggXml(xml) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    isArray: (_name) => ["item", "link", "name"].includes(_name),
  });
  const parsed = parser.parse(xml);
  return parsed.items?.item || [];
}

// ── Mapping ─────────────────────────────────────────────────────────────

function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function attrValue(field) {
  if (field && typeof field === "object" && "@_value" in field)
    return field["@_value"];
  return field;
}

function mapBggItem(item, language, size) {
  const names = Array.isArray(item.name) ? item.name : [item.name];
  const primary = names.find((n) => n["@_type"] === "primary");
  const name = primary ? primary["@_value"] : attrValue(names[0]);

  const links = item.link || [];
  const categories = links
    .filter((l) => l["@_type"] === "boardgamecategory")
    .map((l) => l["@_value"]);
  const mechanisms = links
    .filter((l) => l["@_type"] === "boardgamemechanic")
    .map((l) => l["@_value"]);
  const publishers = links
    .filter((l) => l["@_type"] === "boardgamepublisher")
    .map((l) => l["@_value"]);

  const stats = item.statistics?.ratings || {};
  const average = parseFloat(attrValue(stats.average)) || 0;
  const weight = parseFloat(attrValue(stats.averageweight)) || 0;

  const minP = parseInt(attrValue(item.minplayers)) || 1;
  const maxP = parseInt(attrValue(item.maxplayers)) || minP;
  const players = minP === maxP ? [minP] : [minP, maxP];

  return {
    name,
    editor: publishers[0] || "Unknown",
    year: parseInt(attrValue(item.yearpublished)) || 0,
    types:
      [...new Set([...categories, ...mechanisms])].length > 0
        ? [...new Set([...categories, ...mechanisms])].sort((a, b) => a.localeCompare(b))
        : ["Uncategorized"],
    language,
    players,
    time: parseInt(attrValue(item.playingtime)) || 0,
    complexity: Math.round(weight * 100) / 100,
    rate: Math.round(average * 10) / 10,
    image: slugify(name),
    isPlayed: false,
    age: parseInt(attrValue(item.minage)) || 0,
    bggReference: parseInt(item["@_id"]) || 0,
    size,
  };
}

// ── Image download ──────────────────────────────────────────────────────

async function downloadImage(imageUrl, slug) {
  if (!imageUrl) {
    console.log(`  ⚠️  No image URL for "${slug}", skipping download`);
    return;
  }

  const res = await fetch(imageUrl);
  if (!res.ok) {
    console.log(`  ⚠️  Failed to download image for "${slug}" (${res.status})`);
    return;
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const outPath = join(imagesDir, `${slug}.webp`);
  await sharp(buffer).webp({ quality: 80 }).toFile(outPath);
  console.log(`  🖼️  saved ${slug}.webp`);
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  const { ids, language, size, token, update } = parseArgs(process.argv);

  const gamesFile = JSON.parse(readFileSync(gamesJsonPath, "utf-8"));
  const existingBggMap = new Map(
    gamesFile.games.map((g, i) => [g.bggReference, i]),
  );

  const idsToFetch = ids.filter((id) => {
    if (existingBggMap.has(id) && !update) {
      console.log(
        `⏭️  BGG #${id} already in database, skipping (use --update to refresh)`,
      );
      return false;
    }
    return true;
  });

  if (idsToFetch.length === 0) {
    console.log("No games to import or update.");
    return;
  }

  const xml = await fetchBggData(idsToFetch, token);
  const items = parseBggXml(xml);

  if (items.length === 0) {
    console.error("❌ No games found for the given BGG IDs.");
    process.exit(1);
  }

  console.log(`\n📦 Processing ${items.length} game(s)...\n`);

  let added = 0;
  let updated = 0;
  const usedSlugs = new Set(gamesFile.games.map((g) => g.image));

  for (const item of items) {
    const bggId = parseInt(item["@_id"]) || 0;
    const existingIndex = existingBggMap.get(bggId);

    if (existingIndex !== undefined) {
      // Update: merge BGG data but preserve manually set fields
      const existing = gamesFile.games[existingIndex];
      const fresh = mapBggItem(item, existing.language, existing.size);
      fresh.name = existing.name;
      fresh.editor = existing.editor;
      fresh.image = existing.image;
      fresh.isPlayed = existing.isPlayed;
      gamesFile.games[existingIndex] = fresh;
      console.log(`  🔄 ${fresh.name} (${fresh.year}) → updated`);
      updated++;
    } else {
      // New game
      const game = mapBggItem(item, language, size);
      if (usedSlugs.has(game.image)) {
        game.image = `${game.image}-${game.bggReference}`;
      }
      usedSlugs.add(game.image);
      console.log(`  ✅ ${game.name} (${game.year}) → ${game.image}`);
      await downloadImage(item.image || null, game.image);
      gamesFile.games.push(game);
      added++;
    }
  }

  writeFileSync(gamesJsonPath, JSON.stringify(gamesFile, null, 2) + "\n");

  const parts = [];
  if (added) parts.push(`${added} added`);
  if (updated) parts.push(`${updated} updated`);
  console.log(`\n🎉 ${parts.join(", ")}. Total: ${gamesFile.games.length}`);
  console.log(
    "   Run 'npm run validate' to check, then 'npm run build' to rebuild.\n",
  );
}

main().catch((err) => {
  console.error("❌ Import failed:", err.message);
  process.exit(1);
});

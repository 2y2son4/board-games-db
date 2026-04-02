import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");

function loadJson(relativePath) {
  return JSON.parse(readFileSync(join(root, relativePath), "utf-8"));
}

function writeJson(relativePath, data) {
  const fullPath = join(dist, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, JSON.stringify(data));
  console.log(`  → ${relativePath}`);
}

function extractGamesMeta(games) {
  const types = new Set();
  const editors = new Set();
  const languages = new Set();
  const sizes = new Set();

  let yearMin = Infinity,
    yearMax = -Infinity;
  let playerMin = Infinity,
    playerMax = -Infinity;
  let complexityMin = Infinity,
    complexityMax = -Infinity;
  let rateMin = Infinity,
    rateMax = -Infinity;
  let timeMin = Infinity,
    timeMax = -Infinity;

  for (const game of games) {
    game.types.forEach((t) => types.add(t));
    editors.add(game.editor);
    languages.add(game.language);
    sizes.add(game.size);

    yearMin = Math.min(yearMin, game.year);
    yearMax = Math.max(yearMax, game.year);
    playerMin = Math.min(playerMin, game.players[0]);
    playerMax = Math.max(playerMax, game.players[game.players.length - 1]);
    complexityMin = Math.min(complexityMin, game.complexity);
    complexityMax = Math.max(complexityMax, game.complexity);
    rateMin = Math.min(rateMin, game.rate);
    rateMax = Math.max(rateMax, game.rate);
    timeMin = Math.min(timeMin, game.time);
    timeMax = Math.max(timeMax, game.time);
  }

  return {
    totalCount: games.length,
    types: [...types].sort(),
    editors: [...editors].sort(),
    languages: [...languages].sort(),
    sizes: [...sizes].sort(),
    yearRange: [yearMin, yearMax],
    playerRange: [playerMin, playerMax],
    complexityRange: [complexityMin, complexityMax],
    rateRange: [rateMin, rateMax],
    timeRange: [timeMin, timeMax],
  };
}

function extractOraclesMeta(oracles) {
  const artists = new Set();
  const languages = new Set();

  for (const oracle of oracles) {
    artists.add(oracle.artist);
    languages.add(oracle.language);
  }

  return {
    totalCount: oracles.length,
    artists: [...artists].sort(),
    languages: [...languages].sort(),
  };
}

export function generate() {
  const gamesData = loadJson("data/games.json");
  const oraclesData = loadJson("data/oracles.json");

  console.log("Generating API endpoints...");

  // Full collections
  writeJson("v1/games.json", gamesData);
  writeJson("v1/oracles.json", oraclesData);

  // Metadata
  const gamesMeta = extractGamesMeta(gamesData.games);
  const oraclesMeta = extractOraclesMeta(oraclesData.oracles);
  writeJson("v1/meta/games.json", gamesMeta);
  writeJson("v1/meta/oracles.json", oraclesMeta);

  // Status
  writeJson("v1/status.json", {
    version: "v1",
    gamesCount: gamesData.games.length,
    oraclesCount: oraclesData.oracles.length,
    lastUpdated: new Date().toISOString(),
  });

  console.log(
    `\n✅ Generated API: ${gamesData.games.length} games, ${oraclesData.oracles.length} oracles.`,
  );
}

// Run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generate();
}

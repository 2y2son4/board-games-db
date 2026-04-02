import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

function loadJson(relativePath) {
  return JSON.parse(readFileSync(join(root, relativePath), "utf-8"));
}

export function validate({ exitOnError = true } = {}) {
  const gameSchema = loadJson("schemas/game.schema.json");
  const oracleSchema = loadJson("schemas/oracle.schema.json");
  const gamesData = loadJson("data/games.json");
  const oraclesData = loadJson("data/oracles.json");

  const errors = [];

  // Validate games
  const validateGame = ajv.compile(gameSchema);
  for (const [i, game] of gamesData.games.entries()) {
    if (!validateGame(game)) {
      for (const err of validateGame.errors) {
        errors.push({
          collection: "games",
          index: i,
          name: game.name,
          path: err.instancePath || "/",
          message: err.message,
        });
      }
    }
  }

  // Validate oracles
  const validateOracle = ajv.compile(oracleSchema);
  for (const [i, oracle] of oraclesData.oracles.entries()) {
    if (!validateOracle(oracle)) {
      for (const err of validateOracle.errors) {
        errors.push({
          collection: "oracles",
          index: i,
          name: oracle.name,
          path: err.instancePath || "/",
          message: err.message,
        });
      }
    }
  }

  if (errors.length > 0) {
    for (const e of errors) {
      console.error(
        `\n❌ ${e.collection}[${e.index}] "${e.name}":\n   ${e.path} ${e.message}`,
      );
    }
    console.error("\nValidation failed.");
    if (exitOnError) process.exit(1);
    return {
      valid: false,
      errors,
      gamesCount: gamesData.games.length,
      oraclesCount: oraclesData.oracles.length,
    };
  }

  console.log(
    `✅ Validated ${gamesData.games.length} games and ${oraclesData.oracles.length} oracles.`,
  );
  return {
    valid: true,
    errors: [],
    gamesCount: gamesData.games.length,
    oraclesCount: oraclesData.oracles.length,
  };
}

// Run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  validate();
}

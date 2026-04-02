import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadJson(rel) {
  return JSON.parse(readFileSync(join(root, rel), "utf-8"));
}

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

describe("Game schema validation", () => {
  const schema = loadJson("schemas/game.schema.json");
  const validateGame = ajv.compile(schema);
  const { games } = loadJson("data/games.json");

  it("should load a non-empty games array", () => {
    expect(Array.isArray(games)).toBe(true);
    expect(games.length).toBeGreaterThan(0);
  });

  it("every game should pass schema validation", () => {
    const failures = [];
    for (const [i, game] of games.entries()) {
      if (!validateGame(game)) {
        failures.push({
          index: i,
          name: game.name,
          errors: validateGame.errors.map(
            (e) => `${e.instancePath} ${e.message}`,
          ),
        });
      }
    }
    expect(failures).toEqual([]);
  });

  it("every game should have required fields with correct types", () => {
    for (const game of games) {
      expect(typeof game.name).toBe("string");
      expect(typeof game.editor).toBe("string");
      expect(typeof game.year).toBe("number");
      expect(Array.isArray(game.types)).toBe(true);
      expect(["en", "es", "de", "x"]).toContain(game.language);
      expect(Array.isArray(game.players)).toBe(true);
      expect(game.players.length).toBeGreaterThanOrEqual(1);
      expect(game.players.length).toBeLessThanOrEqual(2);
      expect(typeof game.time).toBe("number");
      expect(typeof game.complexity).toBe("number");
      expect(typeof game.rate).toBe("number");
      expect(typeof game.image).toBe("string");
      expect(typeof game.isPlayed).toBe("boolean");
      expect(typeof game.age).toBe("number");
      expect(typeof game.bggReference).toBe("number");
      expect(["xs", "s", "m", "l"]).toContain(game.size);
    }
  });

  it("should reject a game missing required fields", () => {
    const invalid = { name: "Test" };
    expect(validateGame(invalid)).toBe(false);
  });

  it("should reject a game with invalid language", () => {
    const invalid = {
      name: "Test",
      editor: "Ed",
      year: 2020,
      types: ["Party"],
      language: "fr",
      players: [2, 4],
      time: 30,
      complexity: 1.5,
      rate: 7,
      image: "test",
      isPlayed: true,
      age: 10,
      bggReference: 12345,
      size: "s",
    };
    expect(validateGame(invalid)).toBe(false);
  });

  it("should reject a game with extra properties", () => {
    const invalid = {
      name: "Test",
      editor: "Ed",
      year: 2020,
      types: ["Party"],
      language: "en",
      players: [2, 4],
      time: 30,
      complexity: 1.5,
      rate: 7,
      image: "test",
      isPlayed: true,
      age: 10,
      bggReference: 12345,
      size: "s",
      extraField: true,
    };
    expect(validateGame(invalid)).toBe(false);
  });
});

describe("Oracle schema validation", () => {
  const schema = loadJson("schemas/oracle.schema.json");
  const validateOracle = ajv.compile(schema);
  const { oracles } = loadJson("data/oracles.json");

  it("should load a non-empty oracles array", () => {
    expect(Array.isArray(oracles)).toBe(true);
    expect(oracles.length).toBeGreaterThan(0);
  });

  it("every oracle should pass schema validation", () => {
    const failures = [];
    for (const [i, oracle] of oracles.entries()) {
      if (!validateOracle(oracle)) {
        failures.push({
          index: i,
          name: oracle.name,
          errors: validateOracle.errors.map(
            (e) => `${e.instancePath} ${e.message}`,
          ),
        });
      }
    }
    expect(failures).toEqual([]);
  });

  it("every oracle should have required fields with correct types", () => {
    for (const oracle of oracles) {
      expect(typeof oracle.name).toBe("string");
      expect(typeof oracle.artist).toBe("string");
      expect(["en", "es", "de", "x"]).toContain(oracle.language);
      expect(Array.isArray(oracle.description)).toBe(true);
      expect(oracle.description.length).toBeGreaterThan(0);
      expect(typeof oracle.web).toBe("string");
    }
  });

  it("should reject an oracle missing required fields", () => {
    const invalid = { name: "Test" };
    expect(validateOracle(invalid)).toBe(false);
  });
});

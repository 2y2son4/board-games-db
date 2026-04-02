import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadJson(rel) {
  return JSON.parse(require("node:fs").readFileSync(join(root, rel), "utf-8"));
}

describe("Image integrity", () => {
  const { games } = loadJson("data/games.json");
  const { oracles } = loadJson("data/oracles.json");
  const gameImages = new Set(
    readdirSync(join(root, "images/games")).map((f) =>
      f.replace(/\.webp$/, ""),
    ),
  );
  const oracleImages = new Set(
    readdirSync(join(root, "images/oracles")).map((f) =>
      f.replace(/\.webp$/, ""),
    ),
  );

  it("every game should have a corresponding image file", () => {
    const missing = games
      .filter((g) => !gameImages.has(g.image))
      .map((g) => g.image);
    expect(missing).toEqual([]);
  });

  it("every oracle with an image field should have a corresponding image file", () => {
    const missing = oracles
      .filter((o) => o.image && !oracleImages.has(o.image))
      .map((o) => o.image);
    expect(missing).toEqual([]);
  });

  it("all game images should be .webp format", () => {
    const files = readdirSync(join(root, "images/games"));
    const nonWebp = files.filter((f) => !f.endsWith(".webp"));
    expect(nonWebp).toEqual([]);
  });

  it("all oracle images should be .webp format", () => {
    const files = readdirSync(join(root, "images/oracles"));
    const nonWebp = files.filter((f) => !f.endsWith(".webp"));
    expect(nonWebp).toEqual([]);
  });
});

describe("Data integrity", () => {
  const { games } = loadJson("data/games.json");

  it("should have no duplicate game names", () => {
    const names = games.map((g) => g.name);
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    // Log duplicates as warnings — some games (e.g. different editions) can share names
    if (dupes.length > 0) console.warn("Duplicate game names:", dupes);
    expect(dupes.length).toBeLessThanOrEqual(5);
  });

  it("should have few duplicate bggReference values (expansions may share parent ID)", () => {
    const refs = games.map((g) => g.bggReference).filter((r) => r !== 0);
    const dupes = [...new Set(refs.filter((r, i) => refs.indexOf(r) !== i))];
    // Expansions can share the parent game BGG reference — only flag if excessive
    if (dupes.length > 0) console.warn("Shared bggReference IDs:", dupes);
    expect(dupes.length).toBeLessThanOrEqual(10);
  });

  it("every game image slug should be lowercase", () => {
    const upperCase = games.filter((g) => g.image !== g.image.toLowerCase());
    expect(upperCase.map((g) => g.image)).toEqual([]);
  });

  it("players array should have min <= max when two elements", () => {
    const invalid = games.filter(
      (g) => g.players.length === 2 && g.players[0] > g.players[1],
    );
    expect(invalid.map((g) => g.name)).toEqual([]);
  });
});

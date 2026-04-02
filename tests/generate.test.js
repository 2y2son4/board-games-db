import { describe, it, expect, beforeAll } from "vitest";
import { rmSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generate } from "../scripts/generate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");

function loadDist(rel) {
  return JSON.parse(readFileSync(join(dist, rel), "utf-8"));
}

describe("Generate script", () => {
  beforeAll(() => {
    rmSync(dist, { recursive: true, force: true });
    generate();
  });

  it("should create v1/games.json", () => {
    expect(existsSync(join(dist, "v1/games.json"))).toBe(true);
    const data = loadDist("v1/games.json");
    expect(Array.isArray(data.games)).toBe(true);
    expect(data.games.length).toBeGreaterThan(0);
  });

  it("should create v1/oracles.json", () => {
    expect(existsSync(join(dist, "v1/oracles.json"))).toBe(true);
    const data = loadDist("v1/oracles.json");
    expect(Array.isArray(data.oracles)).toBe(true);
    expect(data.oracles.length).toBeGreaterThan(0);
  });

  it("should create v1/status.json with correct counts", () => {
    const status = loadDist("v1/status.json");
    const games = loadDist("v1/games.json");
    const oracles = loadDist("v1/oracles.json");

    expect(status.version).toBe("v1");
    expect(status.gamesCount).toBe(games.games.length);
    expect(status.oraclesCount).toBe(oracles.oracles.length);
    expect(typeof status.lastUpdated).toBe("string");
    expect(() => new Date(status.lastUpdated)).not.toThrow();
  });

  it("should create v1/meta/games.json with metadata", () => {
    const meta = loadDist("v1/meta/games.json");

    expect(meta.totalCount).toBeGreaterThan(0);
    expect(Array.isArray(meta.types)).toBe(true);
    expect(meta.types.length).toBeGreaterThan(0);
    expect(Array.isArray(meta.editors)).toBe(true);
    expect(meta.editors.length).toBeGreaterThan(0);
    expect(Array.isArray(meta.languages)).toBe(true);
    expect(Array.isArray(meta.sizes)).toBe(true);

    // Ranges should be [min, max] arrays
    for (const key of [
      "yearRange",
      "playerRange",
      "complexityRange",
      "rateRange",
      "timeRange",
    ]) {
      expect(Array.isArray(meta[key])).toBe(true);
      expect(meta[key]).toHaveLength(2);
      expect(meta[key][0]).toBeLessThanOrEqual(meta[key][1]);
    }
  });

  it("should create v1/meta/oracles.json with metadata", () => {
    const meta = loadDist("v1/meta/oracles.json");

    expect(meta.totalCount).toBeGreaterThan(0);
    expect(Array.isArray(meta.artists)).toBe(true);
    expect(meta.artists.length).toBeGreaterThan(0);
    expect(Array.isArray(meta.languages)).toBe(true);
  });

  it("games metadata types should be sorted alphabetically", () => {
    const meta = loadDist("v1/meta/games.json");
    const sorted = [...meta.types].sort();
    expect(meta.types).toEqual(sorted);
  });

  it("games metadata editors should be sorted alphabetically", () => {
    const meta = loadDist("v1/meta/games.json");
    const sorted = [...meta.editors].sort();
    expect(meta.editors).toEqual(sorted);
  });

  it("oracles metadata artists should be sorted alphabetically", () => {
    const meta = loadDist("v1/meta/oracles.json");
    const sorted = [...meta.artists].sort();
    expect(meta.artists).toEqual(sorted);
  });

  it("status counts should match source data", () => {
    const srcGames = JSON.parse(
      readFileSync(join(root, "data/games.json"), "utf-8"),
    );
    const srcOracles = JSON.parse(
      readFileSync(join(root, "data/oracles.json"), "utf-8"),
    );
    const status = loadDist("v1/status.json");

    expect(status.gamesCount).toBe(srcGames.games.length);
    expect(status.oraclesCount).toBe(srcOracles.oracles.length);
  });
});

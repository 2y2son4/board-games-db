# Board Games DB

Static JSON API for a board games and oracle decks collection, hosted on GitHub Pages.

---

- [Endpoints](#endpoints)
- [Data models](#data-models)
- [Development](#development)
- [Updating the database](#updating-the-database)
- [Frontend integration guide](#frontend-integration-guide)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security](#security)
- [Project tree](#project-tree)

---

## Endpoints

Base URL: `https://2y2son4.github.io/board-games-db`

| Endpoint                          | Description                                        |
| --------------------------------- | -------------------------------------------------- |
| `GET /v1/games.json`              | Full games collection                              |
| `GET /v1/oracles.json`            | Full oracles collection                            |
| `GET /v1/meta/games.json`         | Games metadata (types, editors, languages, ranges) |
| `GET /v1/meta/oracles.json`       | Oracles metadata (artists, languages)              |
| `GET /v1/status.json`             | API version, counts, last updated timestamp        |
| `GET /images/games/{slug}.webp`   | Game cover image                                   |
| `GET /images/oracles/{slug}.webp` | Oracle deck image                                  |

All responses are plain JSON. No authentication, query parameters, or headers required — GitHub Pages serves static files with `Access-Control-Allow-Origin: *`.

---

## Data models

### GameCard

| Field          | Type                          | Description                              |
| -------------- | ----------------------------- | ---------------------------------------- |
| `name`         | `string`                      | Game title                               |
| `editor`       | `string`                      | Publisher                                |
| `year`         | `integer`                     | Year published (1900–2100)               |
| `types`        | `string[]`                    | Categories/mechanics (≥1)                |
| `language`     | `"en" \| "es" \| "de" \| "x"` | Language (`x` = language-independent)    |
| `players`      | `integer[]`                   | Player count — `[min, max]` or `[exact]` |
| `time`         | `number`                      | Playing time in minutes                  |
| `complexity`   | `number`                      | Complexity rating (0–5, 0 = unrated)     |
| `rate`         | `number`                      | User rating (0–10, 0 = unrated)          |
| `image`        | `string`                      | Image slug (no extension)                |
| `isPlayed`     | `boolean`                     | Whether the owner has played it          |
| `age`          | `integer`                     | Minimum recommended age                  |
| `bggReference` | `integer`                     | BoardGameGeek ID (0 = none)              |
| `size`         | `"xs" \| "s" \| "m" \| "l"`   | Box size category                        |

### OracleCard

| Field         | Type                          | Description                         |
| ------------- | ----------------------------- | ----------------------------------- |
| `name`        | `string`                      | Deck name                           |
| `artist`      | `string`                      | Creator/artist                      |
| `language`    | `"en" \| "es" \| "de" \| "x"` | Language                            |
| `image`       | `string` (optional)           | Image slug (no extension)           |
| `description` | `string[]`                    | Description paragraphs (≥1)         |
| `web`         | `string`                      | Official website URL (may be empty) |

### Metadata (`/v1/meta/games.json`)

```jsonc
{
  "totalCount": 352,
  "types": ["Abstract strategy", "Action", ...],   // sorted unique values
  "editors": ["2 tomatoes games", "AEG", ...],     // sorted unique values
  "languages": ["de", "en", "es", "x"],
  "sizes": ["l", "m", "s", "xs"],
  "yearRange": [1988, 2025],         // [min, max]
  "playerRange": [1, 99],
  "complexityRange": [0, 4],
  "rateRange": [0, 8.7],
  "timeRange": [0, 540]
}
```

---

## Development

```bash
npm install               # Install dependencies
npm run build             # Full pipeline: validate → generate → copy images → dist/
npm run validate          # Validate source data against JSON schemas
npm run generate          # Generate API files only (no validation/image copy)
npm test                  # Run all tests
npm run test:watch        # Run tests in watch mode
npm run serve             # Serve dist/ locally on http://localhost:3000
```

---

## Updating the database

### Adding a new game

1. **Add the entry** to `data/games.json` inside the `"games"` array:

   ```json
   {
     "name": "New Game Name",
     "editor": "Publisher Name",
     "year": 2025,
     "types": ["Party", "Cards"],
     "language": "en",
     "players": [2, 6],
     "time": 30,
     "complexity": 1.5,
     "rate": 7.2,
     "image": "new-game-name",
     "isPlayed": false,
     "age": 10,
     "bggReference": 123456,
     "size": "s"
   }
   ```

2. **Add the image** as `images/games/new-game-name.webp` (must match the `image` slug).

3. **Validate and build**:

   ```bash
   npm run validate    # Check the new entry passes schema
   npm run build       # Rebuild dist/
   ```

4. **Commit and push** to `master` — GitHub Actions deploys automatically.

### Adding a new oracle

Same workflow, but edit `data/oracles.json` and place the image in `images/oracles/`.

### Editing an existing entry

Edit the entry directly in `data/games.json` or `data/oracles.json`, then run `npm run build`.

### Removing a game or oracle

Delete the entry from the JSON file. Optionally remove the image from `images/`. Then rebuild.

### Terminal quick-reference

```bash
# Validate without building
npm run validate

# Build and serve locally to check the output
npm run build && npm run serve

# Run a quick sanity check on the served API
curl http://localhost:3000/v1/status.json
```

### Contributing

1. Fork the repo.
2. Create a feature branch: `git checkout -b add-new-game`.
3. Add/edit entries in `data/` and images in `images/`.
4. Run `npm run build && npm test` — both must pass.
5. Open a PR to `master`.

Validation runs on every build. The CI workflow will also run the build on push, so broken data won't deploy.

---

## Frontend integration guide

This API is designed for the **board-games-showcase** Angular app. The FE fetches the full collections and handles all filtering client-side.

### Base URL

```
https://2y2son4.github.io/board-games-db
```

### Fetching data

```typescript
// In your Angular HttpService:
private readonly apiBase = 'https://2y2son4.github.io/board-games-db';

getGames(): Observable<{ games: GameCard[] }> {
  return this.http.get<{ games: GameCard[] }>(`${this.apiBase}/v1/games.json`);
}

getOracles(): Observable<{ oracles: OracleCard[] }> {
  return this.http.get<{ oracles: OracleCard[] }>(`${this.apiBase}/v1/oracles.json`);
}

getGamesMeta(): Observable<GamesMeta> {
  return this.http.get<GamesMeta>(`${this.apiBase}/v1/meta/games.json`);
}
```

### Images

Build the image URL from the `image` slug:

```typescript
getGameImageUrl(slug: string): string {
  return `${this.apiBase}/images/games/${slug}.webp`;
}

getOracleImageUrl(slug: string): string {
  return `${this.apiBase}/images/oracles/${slug}.webp`;
}
```

In templates:

```html
<img
  [src]="apiBase + '/images/games/' + game.image + '.webp'"
  [alt]="game.name"
/>
```

### Filtering (client-side)

There are **no query parameters** — the API serves static JSON. All filtering, sorting, and searching is done in the frontend after fetching the full collection. This works well because the dataset is small (~350 games, ~200–400 KB JSON).

Use the **metadata endpoint** (`/v1/meta/games.json`) to populate filter dropdowns dynamically:

```typescript
// Populate filter UI from metadata
this.httpService.getGamesMeta().subscribe((meta) => {
  this.availableTypes = meta.types; // string[]
  this.availableEditors = meta.editors; // string[]
  this.availableLanguages = meta.languages; // string[]
  this.availableSizes = meta.sizes; // string[]
  this.yearRange = meta.yearRange; // [min, max]
  this.playerRange = meta.playerRange; // [min, max]
  this.complexityRange = meta.complexityRange;
  this.rateRange = meta.rateRange;
  this.timeRange = meta.timeRange;
});
```

### Environment configuration

Create `environment.ts` to switch between local development and production:

```typescript
// environment.ts
export const environment = {
  apiBase: "http://localhost:3000", // npm run serve
};

// environment.prod.ts
export const environment = {
  apiBase: "https://2y2son4.github.io/board-games-db",
};
```

### CORS

GitHub Pages sets `Access-Control-Allow-Origin: *` by default. No proxy or special headers needed.

### Caching

GitHub Pages caches files with short TTLs (typically 10 min). For cache-busting on the FE, fetch `/v1/status.json` first and compare `lastUpdated` to decide if you need fresh data, or simply rely on normal browser caching.

---

## Testing

```bash
npm test              # Run all tests once
npm run test:watch    # Watch mode for development
```

### Test suites

| File                      | What it tests                                                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `tests/validate.test.js`  | Schema validation — every game and oracle passes its schema; invalid entries are rejected                                          |
| `tests/generate.test.js`  | Build output — all endpoint files exist with correct structure, counts match source data, metadata is sorted                       |
| `tests/integrity.test.js` | Data integrity — every game/oracle has a matching image, all images are `.webp`, no unexpected duplicates, player ranges are valid |

Tests run against the actual `data/` and `images/` directories, so they catch real problems like missing images or schema violations.

---

## Deployment

Pushes to `master` automatically build and deploy to GitHub Pages via GitHub Actions.

**Setup (one-time):**

1. Push the repo to GitHub.
2. Go to **Settings → Pages → Source** and select **GitHub Actions**.
3. The workflow at `.github/workflows/deploy.yml` handles everything.

**What the workflow does:**

1. Checks out the repo
2. Installs dependencies (`npm ci`)
3. Runs `npm run build` (validate → generate → copy images)
4. Uploads `dist/` as a GitHub Pages artifact
5. Deploys to `https://2y2son4.github.io/board-games-db`

---

## Security

This is a **read-only, public, static file API** serving a personal board game collection. The threat model is minimal, but the following measures are in place:

### What's protected

| Concern                    | Mitigation                                                                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Data integrity**         | JSON Schema validation runs on every build. Invalid data fails the build and won't deploy. Tests verify structure, types, and image references. |
| **No secrets in the repo** | The data is intentionally public (game names, ratings, images). No API keys, tokens, passwords, or PII are stored.                              |
| **No server-side code**    | GitHub Pages serves static files only. No server to exploit, no database to inject into, no authentication to bypass.                           |
| **Supply chain**           | Minimal dependencies: `ajv` (JSON validation) and `vitest` (tests only, dev). No runtime server dependencies.                                   |
| **Deployment**             | GitHub Actions uses `id-token: write` permission scoped only to Pages deployment. The `GITHUB_TOKEN` is not exposed to the build.               |
| **Input validation**       | The `additionalProperties: false` setting on schemas prevents unexpected fields from entering the dataset.                                      |
| **Branch protection**      | Recommended: enable branch protection on `main` so only reviewed PRs can modify the data.                                                       |

### What this API does NOT protect

- **Rate limiting**: GitHub Pages has its own soft limits (~100 GB/month bandwidth). Not a concern for a personal project.
- **Authentication**: The API is public by design. If access control is ever needed, move to a private repo with GitHub Pages access restrictions or add a proxy.
- **Image content**: Images are added manually by the repo owner. No user-uploaded content.

### Recommendations for production use

If this API is ever used beyond a personal collection:

1. Enable **branch protection** on `main` (require PR reviews).
2. Add a CI step to run `npm test` on PRs before merge.
3. Pin dependency versions in `package-lock.json` (already done via `npm ci`).
4. Periodically run `npm audit` to check for dependency vulnerabilities.

---

## Project tree

┣ 📂.github
┃ ┗ 📂workflows
┃ ┗ 📜deploy.yml
┣ 📂data
┃ ┣ 📜games.json
┃ ┗ 📜oracles.json
┣ 📂dist
┃ ┗ 📂v1
┃ ┣ 📂meta
┃ ┃ ┣ 📜games.json
┃ ┃ ┗ 📜oracles.json
┃ ┣ 📜games.json
┃ ┣ 📜oracles.json
┃ ┗ 📜status.json
┣ 📂images
┃ ┣ 📂games
┃ ┗ 📂oracles
┣ 📂schemas
┃ ┣ 📜game.schema.json
┃ ┗ 📜oracle.schema.json
┣ 📂scripts
┃ ┣ 📜build.js
┃ ┣ 📜generate.js
┃ ┗ 📜validate.js
┣ 📂tests
┃ ┣ 📜generate.test.js
┃ ┣ 📜integrity.test.js
┃ ┗ 📜validate.test.js
┣ 📜.gitignore
┣ 📜package.json
┗ 📜README.md

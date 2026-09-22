# AI Recipe App

Family kitchen inventory and recipe app: **100% offline on your home network**. Phone (Expo) scans barcodes; a **Windows PC** runs FastAPI, SQLite, and **Ollama** for local recipe generation and text import.

## Goals

- **Fast recipe generation** from what you have on hand (primary daily flow).
- **Import recipes** by pasting text (no URL scraping yet).
- **Barcode scan** to add inventory and shopping-list items (local product DB, no GPU).
- **Manual inventory entry** with **count, weight, or volume** amounts.
- **Save recipes** (favorites and optional auto-save on generate/import).
- **No cloud** for inference at runtime (optional local Open Food Facts import; optional live OFF name lookup when scanning).

There is **no fridge/pantry image recognition** — onboarding is barcodes + manual entry.

## Architecture

```text
Phone (Expo / React Native)          Home PC (Windows)
  - Barcode camera (offline decode)     - FastAPI :8000
  - Manual add / edit inventory         - SQLite (inventory, products, lists, recipes)
  - Recipe generate, import & saved     - Ollama text model (GPU: RTX 5060 Ti 8 GB)
        |                                        |
        +-------- Wi-Fi LAN (HTTP) --------------+
```

| Layer | Choice | Notes |
|--------|--------|--------|
| Mobile | Expo (`apps/mobile/`) | Pantry, recipes, shopping, settings, barcode scan |
| Backend | Python FastAPI | `server/` |
| Database | SQLite | File: `server/data/app.db` (gitignored) |
| Recipes | Ollama text model | Default: `mistral:7b`, keep warm for speed |
| Barcodes | Local `products` table | OFF import + family entries; `manual_name` until then |

## Quantities

Each inventory or shopping item uses:

- **`quantity_kind`**: `count` | `weight` | `volume`
- **`quantity`**: number (e.g. `2`, `500`, `1.5`)
- **`unit`**: must match the kind (see `GET /meta/quantity-units`)

Examples:

| Kind | quantity | unit |
|------|----------|------|
| count | 6 | `each` |
| weight | 454 | `g` |
| volume | 2 | `l` |

If you send `quantity` without `unit`, the API defaults to `each`, `g`, or `ml` for the kind.

## Repository layout

```text
ai-recipe-app/
  README.md
  server/
    app/
    data/
    requirements.txt
    .env.example
  apps/
    mobile/
```

## Run locally

### Prerequisites

| Tool | Required for | Install |
|------|----------------|---------|
| **Python 3.11+** | API server | [python.org](https://www.python.org/downloads/) — check **Add to PATH** |
| **Ollama** | Generate / import recipes | [ollama.com](https://ollama.com) — inventory, barcodes, shopping work without it |
| **Node.js 22 LTS** | Mobile app | [nodejs.org](https://nodejs.org/) |

### Start the API (Windows)

From the repo root:

```powershell
cd server
.\run.ps1
```

`run.ps1` creates a venv, installs dependencies, copies `.env.example` → `.env` if needed, and starts Uvicorn on port **8000**.

**Manual equivalent:**

```powershell
cd server
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Leave this terminal open while testing. You should see Uvicorn listening on `http://127.0.0.1:8000`.

### Verify it works

1. Open **http://127.0.0.1:8000/docs** (Swagger UI).
2. Run **GET `/health`** — expect `"status": "ok"`. `"ollama": true` if Ollama is running.
3. Run **GET `/meta/quantity-units`** — unit lists for forms.
4. Run **POST `/inventory`** with a sample body:

   ```json
   {
     "name": "Eggs",
     "quantity": 12,
     "quantity_kind": "count",
     "unit": "each",
     "location": "fridge"
   }
   ```

5. Run **GET `/inventory`** — your item should appear.

**PowerShell one-liners** (server must be running):

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
Invoke-RestMethod http://127.0.0.1:8000/inventory
```

### Ollama on Windows (recipe generation & import)

Recipe **generate** and **paste import** need Ollama. Inventory, barcodes, and shopping lists do not.

1. **Install** from [ollama.com](https://ollama.com) and start the Ollama app (tray icon). The API listens on **http://127.0.0.1:11434** by default.
2. **Pull the text model** (match `OLLAMA_TEXT_MODEL` in `server/.env`, default `mistral:7b`):

   ```powershell
   ollama pull mistral:7b
   ```

3. **Point the FastAPI server at Ollama** via `server/.env` (copied from `.env.example`):

   | Variable | Purpose |
   |----------|---------|
   | `OLLAMA_HOST` | Base URL for the Ollama HTTP API (this app reads this). |
   | `OLLAMA_TEXT_MODEL` | Model name for generate and import. |

   These are **app settings**, not Ollama’s own environment variables.

4. **Keep the model loaded (optional, faster repeat requests)** — set Ollama’s **`OLLAMA_KEEP_ALIVE`** (Ollama process env, not `server/.env`). Example:

   ```powershell
   setx OLLAMA_KEEP_ALIVE "30m"
   ```

   Restart the Ollama app so it picks up the variable.

5. **Verify**: **GET `/health`** should show `"ollama": true`.

   Generate: **POST `/recipes/generate`** with `{ "use_all": true, "count": 2 }`.

   Import: **POST `/recipes/import`** with `{ "text": "…" }` or `{ "url": "https://…" }` (exactly one).

   Optional `persist` / `persist_generated` saves recipes on the server (non-favorite unless `favorite: true` on import). Default: `DEFAULT_PERSIST_GENERATED_RECIPES` in `.env`.

### Mobile app

Expo client in `apps/mobile/` — connect to the PC API on the same Wi‑Fi (**Settings → Home server**, port **8000**).

```powershell
cd apps/mobile
npm install
npm start
```

Or start the API + Expo together like a desktop program (see **Home stack launcher** below).

Details: [apps/mobile/README.md](apps/mobile/README.md).

### Where data is stored

Inventory and other records live in SQLite:

```text
server/data/app.db
```

Created on first startup. Browse via **GET `/inventory`**, [DB Browser for SQLite](https://sqlitebrowser.org/), or the `sqlite3` CLI. The file is gitignored.

### Phone / other devices on your Wi‑Fi

Use your PC’s LAN IP instead of `127.0.0.1`, e.g. `http://192.168.1.50:8000/docs`.

- `run.ps1` binds **`0.0.0.0`** so LAN clients can reach the API.
- Allow inbound **TCP 8000** on **Private** networks in Windows Firewall.

### Home stack launcher (Windows)

Starts the API (and Expo Go) from one shortcut and opens a status page with the **dedicated Tailscale URL** QR.

```powershell
# One-time: Desktop shortcut “AI Recipe”
powershell -ExecutionPolicy Bypass -File scripts\install-home-stack-shortcut.ps1

# Or run directly
powershell -ExecutionPolicy Bypass -File scripts\start-home-stack.ps1

# Stop API + Metro (leaves Ollama running)
powershell -ExecutionPolicy Bypass -File scripts\stop-home-stack.ps1
```

The status page shows:

- **QR B / dedicated URL** — paste into the iPhone **Settings → Home server** (MagicDNS, see below).
- **Expo Go** — scan the QR in the Metro terminal (**QR A**) to open the app UI on the same Wi‑Fi.

API-only (no Expo): `powershell -ExecutionPolicy Bypass -File scripts\start-home-stack.ps1 -SkipExpo`

### Off-LAN with Tailscale (dedicated URL)

Do **not** point `zero-tech.org` at this API. A public hostname would expose an unauthenticated kitchen API. Tailscale **MagicDNS** gives a stable name that only devices on your tailnet can resolve.

1. Install [Tailscale](https://tailscale.com/download) on this Windows PC and on each iPhone (each person uses their own login; invite them to the same tailnet).
2. In the [Tailscale admin console](https://login.tailscale.com/admin/dns) enable **MagicDNS**.
3. Sign in on the PC. Confirm `tailscale status` shows this machine and a name like `kitchen-pc.tailxxxxx.ts.net`.
4. Start the home stack. Use this in the app Settings (same URL at home and away):

   `http://<machine>.<tailnet>.ts.net:8000`

   The launcher prints this name and shows a QR for it. iOS is allowed to use HTTP on `*.ts.net` (see `apps/mobile/app.json`).
5. On each iPhone: open the **Tailscale** app, stay connected, then open **Expo Go** / the recipe app and **Test connection**.
6. Keep the PC **awake** while you want the kitchen API available.

**Optional HTTPS** (no `:8000` in the URL), after the API is listening:

```powershell
tailscale serve --bg 8000
```

Then Settings can use `https://<machine>.<tailnet>.ts.net`. Requires **HTTPS Certificates** enabled in the Tailscale admin DNS page. Only tailnet devices can open it (this is not a public website).

**Expo Go away from home** still needs Metro on the PC and is unreliable over Tailscale. For grocery-store use, keep the API + Tailscale URL and later install a TestFlight build so you do not need Metro.

### Troubleshooting

| Problem | What to try |
|---------|----------------|
| `Python was not found` | Install from python.org (not the Store stub); reopen the terminal |
| Port already in use | `uvicorn app.main:app --reload --port 8001` |
| `POST /recipes/generate` or `/import` returns 502 | Start Ollama; run `ollama pull mistral:7b` |
| Validation error on `unit` | Use **GET `/meta/quantity-units`** — e.g. `volume` + `l`, not `each` |
| `git push` hangs | Wait for Git Credential Manager / browser login; first HTTPS push can take 1–2 minutes |

## API overview

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness + Ollama reachability |
| GET | `/meta/quantity-units` | Units per kind (for UI dropdowns) |
| GET/POST/PATCH/DELETE | `/inventory` | Pantry stock (manual or from barcode) |
| POST | `/products` | Register a barcode product in the family catalog |
| POST | `/scan/barcode` | UPC lookup + add to inventory or shopping list |
| POST | `/recipes/generate` | AI recipes from inventory (optional auto-save) |
| POST | `/recipes/search` | AI recipe ideas from a text query (ignores pantry) |
| POST | `/recipes/import` | Parse pasted text or fetch a recipe URL, then Ollama (optional save) |
| GET/POST/DELETE | `/recipes/saved` | Store and browse family recipes |
| GET/POST/PATCH/DELETE | `/meal-plan` | Week plan entries (saved recipe + date + meal slot) |
| GET/POST | `/shopping/lists` | Shopping trips and line items |
| POST | `/shopping/from-recipe` | Missing recipe lines → list (skips pantry) |
| POST | `/shopping/from-meal-plan` | Same for all meals in a date range (multi-recipe) |

## Usage flow

1. **Stock the pantry** — scan barcodes or add items manually with the right kind/unit.
2. **Cook** — generate from pantry, paste-import a recipe, star favorites.
3. **Plan** — assign saved recipes to days on the **Plan** tab; **Shop this week** fills a list.
4. **Shop** — build lists, open list view to check off items, scan in the store.

## Barcode catalog

Packaged goods are resolved from the local **`products`** table (Open Food Facts import + family entries). Items **without barcodes** use **`POST /inventory`** only (eggs, produce, bulk spices).

### Import Open Food Facts (offline)

1. Download the JSONL export (large file, several GB compressed) into `server/data/imports/`:  
   https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz  
   Or from `server/`: `.\scripts\download-open-food-facts.ps1`
2. Run the import (US products only by default):

   ```powershell
   cd server
   .\import-products.ps1 -ImportPath data\imports\openfoodfacts-products.jsonl.gz
   ```

   Test on the committed sample:

   ```powershell
   .\import-products.ps1 -ImportPath data\imports\sample.openfoodfacts.jsonl -Country ""
   ```

   Options: `--limit N`, `--dry-run`, `--country en:united-states` (empty string = all countries).

   Import stores **package size** (`default_quantity`, `default_unit`, `default_quantity_kind`). Scans multiply that by **how many packages** you enter on the phone. Unknown barcodes still fall back to live OFF lookup when the PC has internet.

   After import succeeds, you may **delete** `server/data/imports/openfoodfacts-products.jsonl.gz` to free disk; the catalog remains in `server/data/app.db`. You do **not** need to revert application code — those changes are how barcode scans use the catalog.

### Manual entry paths

| Situation | API |
|-----------|-----|
| No barcode (fresh food, pantry staples) | `POST /inventory` with `name`, quantities — omit `barcode` |
| Barcode not in import / store brand | `POST /products` with `barcode`, `name`, optional `brand` |
| Scan unknown UPC once and remember it | `POST /scan/barcode` with `manual_name` and `"register_product": true` |
| Scan unknown UPC one-time only | `POST /scan/barcode` with `manual_name` only (adds to inventory, not catalog) |

## Linting & CI

### Unit tests (local)

These match the CI jobs **Unit tests (server)** and **Unit tests (mobile)** (not lint/typecheck).

**Server** (from repo root; use your venv if you have one, e.g. `server\.venv\Scripts\python.exe` on Windows):

```powershell
cd server
pip install -r requirements-dev.txt   # first time
python -m pytest tests -q
```

**Mobile:**

```powershell
cd apps/mobile
npm install   # first time
npm test
```

**All unit tests** (PowerShell, from repo root):

```powershell
Push-Location server; python -m pytest tests -q; if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }; Pop-Location
Push-Location apps/mobile; npm test; if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }; Pop-Location
```

**All unit tests** (bash, from repo root):

```bash
cd server && python -m pytest tests -q && cd ../apps/mobile && npm test
```

Verbose server run: `python -m pytest tests -v`. CI uses `npm test -- --ci` in `apps/mobile` (same as `npm test` locally).

### Lint & typecheck

| Stack | Config | Run locally |
|-------|--------|-------------|
| **Python** (`server/`) | `server/pyproject.toml` (Ruff) | `cd server` then `ruff check app tests` and `ruff format --check app tests` |
| **TypeScript** (`apps/mobile/`) | `apps/mobile/.eslintrc.yml` | `cd apps/mobile` then `npm run lint` and `npm run typecheck` |
| **CI** | `.github/workflows/lint.yml` | Push/PR: Ruff, pytest, ESLint, typecheck, Jest |
| **Optional hooks** | `.pre-commit-config.yaml` | `pip install pre-commit && pre-commit install` |

**GitHub branch protection:** require these status checks before merging to `main`:

- `Ruff (server)`
- `Unit tests (server)`
- `ESLint (mobile)`
- `Unit tests (mobile)`

(`Typecheck` runs in the ESLint job; it is not a separate check name.)

## Roadmap (later)

- **TestFlight** iOS build so phones do not need Expo / Metro off-LAN (API + Tailscale URL is already documented above).

Product **package defaults** (`default_quantity_kind`, `default_quantity`, `default_unit`) are inferred during OFF import and live OFF lookup. Re-run the import script to backfill existing catalog rows.

## Environment variables

Copy `server/.env.example` to `server/.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | SQLite under `server/data/` | Database file |
| `OLLAMA_HOST` | `http://127.0.0.1:11434` | Ollama API |
| `OLLAMA_TEXT_MODEL` | `mistral:7b` | Recipe generate & import |
| `DEFAULT_PERSIST_GENERATED_RECIPES` | `false` | Auto-save generate/import when client omits `persist` |

## License

Copyright © 2026 Zero Tech, LLC. Steven Blahut. All rights reserved.

This software and documentation are proprietary to **Zero Tech, LLC**. You may not copy, modify, distribute, or use them except as permitted by Zero Tech, LLC in writing.

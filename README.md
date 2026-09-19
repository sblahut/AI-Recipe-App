# AI Recipe App

Family kitchen inventory and recipe app: **100% offline on your home network**. Phone (Expo) scans barcodes; a **Windows PC** runs FastAPI, SQLite, and **Ollama** for local recipe generation.

## Goals

- **Fast recipe generation** from what you have on hand (primary daily flow).
- **Barcode scan** to add inventory and shopping-list items (local product DB, no GPU).
- **Manual inventory entry** with **count, weight, or volume** amounts.
- **Save recipes** manually (including ones you generate) for later.
- **No cloud** for inference or product lookup at runtime (optional local Open Food Facts import).

There is **no fridge/pantry image recognition** — onboarding is barcodes + manual entry.

## Architecture

```text
Phone (Expo / React Native)          Home PC (Windows)
  - Barcode camera (offline decode)     - FastAPI :8000
  - Manual add / edit inventory         - SQLite (inventory, products, lists, recipes)
  - Recipe generate & saved recipes     - Ollama text model (GPU: RTX 5060 Ti 8 GB)
        |                                        |
        +-------- Wi-Fi LAN (HTTP) --------------+
```

| Layer | Choice | Notes |
|--------|--------|--------|
| Mobile (planned) | Expo | Barcode camera, forms for quantities, LAN API |
| Backend | Python FastAPI | This repo: `server/` |
| Database | SQLite | File: `server/data/app.db` (gitignored) |
| Recipes | Ollama text model | Default: `mistral:7b`, keep warm for speed |
| Barcodes | Local `products` table | Import OFF dump later; `manual_name` until then |

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
| **Ollama** | `POST /recipes/generate` only | [ollama.com](https://ollama.com) — inventory, barcodes, shopping work without it |

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
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
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

### Recipe generation (optional)

```powershell
ollama pull mistral:7b
```

In Swagger, **POST `/recipes/generate`**:

```json
{ "use_all": true, "count": 2 }
```

Optional — keep the model loaded between requests (restart Ollama after `setx`):

```powershell
setx OLLAMA_KEEP_ALIVE "30m"
```

### Where data is stored

Inventory and other records live in SQLite:

```text
server/data/app.db
```

Created on first startup. Browse via **GET `/inventory`**, [DB Browser for SQLite](https://sqlitebrowser.org/), or the `sqlite3` CLI. The file is gitignored.

### Phone / other devices on your Wi‑Fi

Use your PC’s LAN IP instead of `127.0.0.1`, e.g. `http://192.168.1.50:8000/docs`.

- Start Uvicorn with `--host 0.0.0.0` ( `run.ps1` already does this ).
- Allow inbound **TCP 8000** on **Private** networks in Windows Firewall.

### Troubleshooting

| Problem | What to try |
|---------|----------------|
| `Python was not found` | Install from python.org (not the Store stub); reopen the terminal |
| Port already in use | `uvicorn app.main:app --reload --port 8001` |
| `POST /recipes/generate` returns 502 | Start Ollama; run `ollama pull mistral:7b` |
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
| POST | `/inventory` | Manual pantry entry (no barcode — produce, bulk, etc.) |
| POST | `/recipes/generate` | AI recipes from inventory |
| GET/POST/DELETE | `/recipes/saved` | Store and browse family recipes |
| GET/POST | `/shopping/lists` | Shopping trips and line items |

## Usage flow

1. **Stock the pantry** — scan barcodes or add items manually with the right kind/unit.
2. **Cook** — generate recipes; save favorites with `POST /recipes/saved`.
3. **Shop** — build lists, scan items in the store, check off lines (no AI).

## Linting

| Stack | Config | Run locally |
|-------|--------|-------------|
| **Python** (`server/`) | `server/pyproject.toml` (Ruff) | `pip install -r requirements-dev.txt` then `ruff check app` and `ruff format app` |
| **TypeScript** (`apps/mobile/`) | `apps/mobile/.eslintrc.yml` | `cd apps/mobile && npm install && npm run lint` |
| **CI** | `.github/workflows/lint.yml` | [Actions tab](https://github.com/sblahut/AI-Recipe-App/actions) — Ruff on push/PR; ESLint when `apps/mobile/package.json` exists |
| **Optional hooks** | `.pre-commit-config.yaml` | `pip install pre-commit && pre-commit install` |

## Mobile app (Phase 3)

Expo app in `apps/mobile/` — pantry, recipes, shopping, settings, barcode scan. Requires Node.js; point **Settings** at your PC API URL on the same Wi‑Fi.

```powershell
cd apps/mobile
npm install
npx expo start
```

Details: [apps/mobile/README.md](apps/mobile/README.md).

## Barcode catalog (Phase 2)

Packaged goods are resolved from the local **`products`** table (Open Food Facts import + family entries). Items **without barcodes** use **`POST /inventory`** only (eggs, produce, bulk spices).

### Import Open Food Facts (offline)

1. Download the JSONL export (large file, several GB compressed):  
   https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz  
2. Save under `server/data/imports/` (gitignored except the small sample file).
3. Run the import:

   ```powershell
   cd server
   .\.venv\Scripts\Activate.ps1
   python scripts/import_open_food_facts.py --input data/imports/openfoodfacts-products.jsonl.gz --country en:united-states
   ```

   Test on the committed sample:

   ```powershell
   python scripts/import_open_food_facts.py --input data/imports/sample.openfoodfacts.jsonl
   ```

   Options: `--limit N`, `--dry-run`, `--country en:united-states`.

### Manual entry paths

| Situation | API |
|-----------|-----|
| No barcode (fresh food, pantry staples) | `POST /inventory` with `name`, quantities — omit `barcode` |
| Barcode not in import / store brand | `POST /products` with `barcode`, `name`, optional `brand` |
| Scan unknown UPC once and remember it | `POST /scan/barcode` with `manual_name` and `"register_product": true` |
| Scan unknown UPC one-time only | `POST /scan/barcode` with `manual_name` only (adds to inventory, not catalog) |

## Build order

- [x] README + architecture (no vision)
- [x] FastAPI: inventory, barcodes, recipes, shopping, quantity kinds, saved recipes
- [x] Open Food Facts import script + manual product / inventory entry
- [ ] Expo mobile app — **in progress** on `phase-3-mobile` (see `apps/mobile/README.md`)

## Environment variables

Copy `server/.env.example` to `server/.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | SQLite under `server/data/` | Database file |
| `OLLAMA_HOST` | `http://127.0.0.1:11434` | Ollama API |
| `OLLAMA_TEXT_MODEL` | `mistral:7b` | Recipe generation |

## License

TBD

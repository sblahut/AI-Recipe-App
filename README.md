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

## Windows setup

### 1. Ollama

1. Install [Ollama for Windows](https://ollama.com).
2. Pull the recipe model:

   ```powershell
   ollama pull mistral:7b
   ```

3. Optional — keep the model loaded:

   ```powershell
   setx OLLAMA_KEEP_ALIVE "30m"
   ```

### 2. Python backend

```powershell
cd server
.\run.ps1
```

Or manually: venv, `pip install -r requirements.txt`, `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`.

- API docs: http://localhost:8000/docs
- LAN: http://\<your-pc-ip\>:8000

### 3. Firewall

Allow inbound **TCP 8000** on **Private** networks.

## API overview

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness + Ollama reachability |
| GET | `/meta/quantity-units` | Units per kind (for UI dropdowns) |
| GET/POST/PATCH/DELETE | `/inventory` | Pantry stock (manual or from barcode) |
| POST | `/scan/barcode` | UPC lookup + add to inventory or shopping list |
| POST | `/recipes/generate` | AI recipes from inventory |
| GET/POST/DELETE | `/recipes/saved` | Store and browse family recipes |
| GET/POST | `/shopping/lists` | Shopping trips and line items |

## Usage flow

1. **Stock the pantry** — scan barcodes or add items manually with the right kind/unit.
2. **Cook** — generate recipes; save favorites with `POST /recipes/saved`.
3. **Shop** — build lists, scan items in the store, check off lines (no AI).

## Build order

- [x] README + architecture (no vision)
- [x] FastAPI: inventory, barcodes, recipes, shopping, quantity kinds, saved recipes
- [ ] Import script for offline barcode database
- [ ] Expo mobile app

## Environment variables

Copy `server/.env.example` to `server/.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | SQLite under `server/data/` | Database file |
| `OLLAMA_HOST` | `http://127.0.0.1:11434` | Ollama API |
| `OLLAMA_TEXT_MODEL` | `mistral:7b` | Recipe generation |

## License

TBD

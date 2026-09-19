# AI Recipe — Mobile (Expo)

React Native client for the home LAN FastAPI server.

## Setup

1. Install [Node.js 22 LTS](https://nodejs.org/).
2. Start the backend on your PC (`server/run.ps1`, port 8000).
3. Install and run:

   ```powershell
   cd apps/mobile
   npm install
   npx expo start
   ```

4. Open **Settings** and set your PC URL (e.g. `http://192.168.1.50:8000`), then **Test connection**.

Use **Expo Go** on the same Wi‑Fi as the PC. Android allows cleartext HTTP via `app.json`; iOS allows local networking.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm start` | Expo dev server |
| `npm run lint` | ESLint (strict TypeScript) |
| `npm run typecheck` | `tsc --noEmit` |

After first `npm install`, commit `package-lock.json` so CI can run `npm ci`.

## Tabs

- **Pantry** — list, manual add/edit, barcode scan
- **Recipes** — generate from pantry, save favorites
- **Shopping** — lists, manual items, scan to list, check off
- **Settings** — server URL + health check

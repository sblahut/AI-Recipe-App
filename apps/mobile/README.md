# AI Recipe — Mobile (Expo)

React Native client for the home LAN FastAPI server.

## Setup

1. Install [Node.js 22 LTS](https://nodejs.org/).
2. Start the backend on your PC (`server/run.ps1`, port 8000).
3. Install and run:

   ```powershell
   cd apps/mobile
   npm install
   npx expo install --fix
   npm start
   ```

   Use **`npm start`** (not `npm expo start`). If Metro complains about a missing `expo-*` package, run `npx expo install --fix` again.

4. Open **Settings** and set your PC URL (e.g. `http://192.168.1.50:8000`), then **Test connection**.

Use **Expo Go** on the same Wi‑Fi as the PC. Android allows cleartext HTTP via `app.json`; iOS allows local networking.

## Two URLs (easy to mix up)

| URL | What it is |
|-----|------------|
| `http://192.168.x.x:8081` | **Metro** — dev server for the React Native app (Expo) |
| `http://192.168.x.x:8000` | **Your API** — FastAPI pantry/recipes (`server/run.ps1`) |

Set **8000** in the app **Settings** tab. **8081** is only for Expo Go / web dev.

## QR code or blank `localhost:8081`

1. **Reinstall deps** (fixes missing `query-string` / web white screen):

   ```powershell
   cd apps/mobile
   npm install
   npm run fix-deps
   ```

2. **Restart Metro** with cache clear: `npm start` (already uses `-c`).

3. **Phone on same Wi‑Fi** as the PC. Terminal should show `Metro waiting on exp://192.168.x.x:8081` — scan with **Expo Go** (Android) or Camera → Expo (iOS). Do not open `localhost` on the phone.

4. **Windows Firewall** — allow **Node.js** on **Private** networks (ports **8081** for Metro and **8000** for API).

5. If LAN still fails: `npm run start:tunnel` (slower; works across tricky networks).

6. **Web preview**: after a successful bundle, press **`w`** in the Expo terminal, or run `npm run start:web`. A blank page usually means the bundle failed — check the terminal for red errors.

7. **Expo Go** must support **SDK 52** (update Expo Go from the app store).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm start` | Expo dev server (LAN + clear cache) |
| `npm run start:tunnel` | Expo via tunnel (QR when LAN blocked) |
| `npm run start:web` | Open web preview |
| `npm run lint` | ESLint (strict TypeScript) |
| `npm run typecheck` | `tsc --noEmit` |

After first `npm install`, commit `package-lock.json` so CI can run `npm ci`.

## Tabs

- **Pantry** — list, manual add/edit, barcode scan
- **Recipes** — generate from pantry, save favorites
- **Shopping** — lists, manual items, scan to list, check off
- **Settings** — server URL + health check

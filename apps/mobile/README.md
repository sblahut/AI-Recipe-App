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

4. Open **Settings** and set your PC URL, then **Test connection**.
   - Same Wi‑Fi: `http://192.168.x.x:8000`
   - Dedicated Tailscale name (home or away): `http://<machine>.<tailnet>.ts.net:8000`

   The Windows launcher (`scripts/start-home-stack.ps1`) prints this URL and a QR. See the repo README **Off-LAN with Tailscale**.

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

5. Prefer **`npm start` (LAN)** over tunnel when phone and PC share Wi‑Fi. Tunnel QR codes often fail in the **iPhone Camera** app with *“No usable data found”*.

6. **Web preview**: after a successful bundle, press **`w`** in the Expo terminal, or run `npm run start:web`. A blank page usually means the bundle failed — check the terminal for red errors.

7. **Expo Go** must match the project **SDK 57** (update Expo Go from the app store). If you see “SDK 57 vs SDK 52”, run `npm install`, `npm run fix-deps`, restart Metro with `npm start`.

## Connect Expo Go (no “Scan QR” / “Enter URL” on your phone?)

Recent **Expo Go** versions (especially **iOS**) often **removed “Enter URL manually”**. The home screen may only show tutorials unless you use one of these paths:

### A. Easiest: use the web app on your PC (no phone)

With Metro running, press **`w`** in the terminal (or `npm run start:web`).  
Set API in **Settings** to `http://127.0.0.1:8000` and test pantry there.

### B. Phone: force **Expo Go** mode on the PC

1. Stop Metro (**Ctrl+C**), then:

   ```powershell
   npm start
   ```

   (`npm start` uses **`--go`** so the QR is for Expo Go, not a dev client.)

2. Under the QR, the terminal must say **`› Using Expo Go`**.  
   If it says **development build**, press **`s`** in that terminal to switch to Expo Go.

3. **Same Wi‑Fi** as the PC (not guest network). Prefer LAN (`exp://192.168.x.x:8081`), not tunnel, when possible.

### C. Open the project without Expo Go’s scan UI

**iPhone**

1. Copy the URL from the terminal, e.g. `exp://192.168.1.45:8081`.
2. **AirDrop / Messages / Notes** → paste the link → tap it → choose **Open in Expo Go**.  
   Or paste into **Safari’s address bar** and go (should offer Expo Go).

**Android**

1. Open **Expo Go**.
2. Look for **Scan QR code** on the home tab (layout varies by version; sometimes **Profile → Projects**, or a **camera icon** top-right).
3. If there is no scanner, paste `exp://192.168.x.x:8081` wherever the app allows opening a link, or tap the LAN link if **Development servers** lists your machine (same Wi‑Fi).

### D. “No usable data found” (Camera app)

That is the **system Camera** scanning an **`exp://`** or **tunnel** QR — use **B/C** above, not the iPhone Camera app alone.

**Not the same:** **Pantry → Scan** in this app is for **grocery barcodes**, not the Metro QR on your monitor.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm start` | Expo dev server (LAN + clear cache) |
| `npm run start:tunnel` | Expo via tunnel (QR when LAN blocked) |
| `npm run start:web` | Open web preview |
| `npm run lint` | ESLint (strict TypeScript) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Jest unit tests (`lib/`) |

From the **repo root**, run server + mobile unit tests (see root **README** → *Linting & CI* → *Unit tests (local)*).

After first `npm install`, commit `package-lock.json` so CI can run `npm ci`.

## Tabs

- **Ingredients** — pantry by storage area, search, manual add/edit, swipe delete, barcode scan, custom zones
- **Recipes** — generate from pantry, paste/URL import, search, favorites, share, add to shopping / ingredients
- **Plan** — week meal plan from saved recipes, **Shop this week** → shopping list
- **Shopping** — lists, weekly ad links by store chain, scan to list; **Open list** for filters (all / to buy / in cart)
- **Settings** — profile & photo, appearance, kitchen defaults, favorite stores, recipes options, home server URL (dev/LAN)

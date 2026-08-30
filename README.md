# WattGuard

AI-driven home energy manager — routes between solar, the utility grid, and
battery backup based on live weather, and helps users understand and lower
their electricity bill.

## How the AI logic actually works

WattGuard never guesses about your battery. The flow is:

1. **Weather** (`backend/api/weather.py`) — pulls live conditions (day/night,
   sky condition, cloud cover, rain chance) from Open-Meteo, a free API that
   needs no key.
2. **Power routing** (`backend/api/power_router.py`) — decides Solar / Grid /
   Battery. Battery is only ever chosen when the user has explicitly marked
   it as charging/in use in the app — the AI has no way to sense that on its
   own, so it never assumes it.
3. **Appliances** (`backend/api/appliances.py`) — turns the current power
   source into a plain answer per appliance: safe to run or not, and for how
   long, in whichever unit (hours/minutes/seconds) actually makes sense.
4. **Billing** (`backend/api/bill.py`) — only the grid is billed. Includes
   the Pro bill-translator and budget-optimizer endpoints.

## Project layout

```
backend/            Flask API (this is what your phone talks to)
  app.py              entry point — run this
  api/
    weather.py         live weather lookup
    power_router.py     solar/grid/battery decision + alert logic
    appliances.py       safe-to-run + runtime per appliance
    bill.py              grid bill estimate + pro bill tools
  models/
    appliances.py        appliance catalog (wattages)

mobile/              Expo / React Native app
  App.js               navigation between the 4 screens
  screens/
    AuthScreen.js         Screen 1 — login/signup
    SetupScreen.js         Screen 2 — solar panels, battery
    DashboardScreen.js      Screen 3 — the main energy hub
    AccurateBillScreen.js    Screen 4 — Pro tools, paywall
  components/           shared UI pieces
  services/
    api.js               talks to the Flask backend
    purchases.js           RevenueCat wrapper (pro entitlement)
```

## Running the backend

```
cd backend
pip3 install -r requirements.txt
python3 app.py
```
Runs on `http://localhost:5000`. Check it's alive: `curl http://localhost:5000/api/health`

## Running the mobile app

```
cd mobile
npm install
npx expo start
```
Scan the QR code with Expo Go on your phone. **Before that works**, open
`mobile/services/api.js` and change `BASE_URL` from `localhost` to your
Mac's LAN IP (find it with `ipconfig getifaddr en0`) — a phone can't reach
your laptop's `localhost`.

## What's stubbed and needs finishing

- **Auth** — the login screen collects fields but doesn't persist a real
  account yet. Add `/api/auth/signup` + `/api/auth/login` routes and a
  database (SQLite is enough for a hackathon) when ready.
- **Bill translator photo upload** — the backend endpoint
  (`/api/bill/translate`) does the math once it has usage-by-appliance
  hours; it doesn't do OCR yet. Add `expo-image-picker` on the mobile side
  and send the photo to the Gemini Vision API to extract those hours — see
  the TODO comment in `backend/api/bill.py`.
- **RevenueCat** — `mobile/services/purchases.js` has the full integration
  pattern; you just need to paste in your real API key and create the
  `pro` entitlement + your two products in the RevenueCat dashboard.
- **Meter/bill photo upload for unit entry** (both tiers) — same idea as
  the bill translator; needs an image picker + OCR call wired in.

## Terminology note

Everything in the UI uses US utility language for the judges: "utility
grid" (not WAPDA), "electricity bill / kWh" (not units), "zip code" (not
area/region). The underlying logic is unchanged.

# AgriImpact

**Precision irrigation advisories on live weather — with MRV-grade impact measurement.**

AgriImpact maps your field, forecasts **root-zone** soil moisture using real weather data, tells you exactly when to irrigate (or when to safely skip), and then **measures** the water, energy, carbon and yield impact of every decision in an auditable ledger. Not just tech — proof.

> What makes it different from a typical "soil moisture dashboard":
> - **Root-zone truth** — satellite radar sees only the top ~5 cm; AgriImpact models the crop's actual root zone with an FAO-56 dual-bucket water balance (and shows the surface layer too, side by side).
> - **Predictive, not descriptive** — the 7-day forecast is a dry-run simulation that predicts *when stress begins* if nothing is done.
> - **Impact you can audit** — every adopt/skip decision writes water (L), pumping energy (kWh), CO₂e (kg) and yield-protection entries into an MRV ledger with method + provenance, exportable as CSV.
> - **Open & honest** — free keyless APIs (Open-Meteo weather, Esri World Imagery satellite basemap), all assumptions documented on the in-app Methodology page.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript 5 |
| Styling | Tailwind CSS 4, **Space Mono** font, **Banana Leaf `#2E7F25`** brand color |
| UI | shadcn/ui (New York) + Lucide icons + Recharts |
| Map | Leaflet + react-leaflet v5 (**Esri World Imagery satellite** basemap — no API key; fields, roads and buildings clearly visible for polygon drawing) |
| Database | SQLite via Prisma ORM (zero external DB setup) |
| State | Zustand (client) |
| Weather | [Open-Meteo](https://open-meteo.com) — observed (ERA5 blend) + forecast (ICON/ECMWF), free, no key |
| AI (optional) | z-ai-web-dev-sdk server-side narration of computed results, with deterministic fallback |

## Quick start (local)

**Prerequisites:** Node.js 20+ (or Bun 1.1+), npm (or bun).

```bash
git clone https://github.com/pm-karthicksivaraj/agri-impact.git
cd agri-impact

# 1) install dependencies (also runs `prisma generate` via postinstall)
npm install            # or: bun install

# 2) environment
cp .env.example .env

# 3) create the local SQLite database
npx prisma db push     # or: npm run db:push

# 4) run
npm run dev            # or: bun run dev
```

Open <http://localhost:3000>. No API keys needed — weather and map tiles are keyless open data.

> **Verified path note:** `DATABASE_URL="file:./db/custom.db"` resolves (for both the Prisma CLI and the runtime client) to `prisma/db/custom.db`. That file is gitignored; `npx prisma db push` creates it.

### Production build

```bash
npm run build
npm start
```

### First run: load the demo dataset

The app starts empty. Click **Load demo data** in the header to create 6 real smallholder fields across Vietnam (rice, maize, coffee, vegetables, sugarcane). Every field is analysed against **live weather at its real coordinates** — moisture values, advisories, alerts and impact numbers are all genuinely computed at seed time, never hard-coded.

### The golden path

1. **Fields → Draw new field** — click the map to place ≥ 3 corners, close the polygon, fill the form (crop, soil, growth stage). The analysis runs immediately on live weather for that exact location.
2. **Monitor** — dual-layer soil status (root zone + surface), 14-day history, 7-day dry-run forecast, weather strip, advisories, alerts, per-field impact ledger. Try **Generate brief** for a plain-language summary (AI narration when the SDK is configured, deterministic text otherwise).
3. **Advisories → Adopt / Dismiss** — adopting an advisory (or an explicit "hold irrigation" recommendation) computes the realised impact vs the conventional baseline and writes MRV ledger entries.
4. **Impact** — totals (L saved, kWh, kgCO₂e, yield protection, adoption rate), baseline-vs-plan charts, sustainability score with transparent weights, SDG 6.4 / 2.3 / 13 indicators, the full audit ledger, and **Export MRV report (CSV)**.
5. **Alerts** — dry-stress / heavy-rain / heat rule engine, re-checked via *Run checks on all fields*.
6. **Method** — the full methodology: equations, constants, sources, and stated limitations.

## How the model works (short version)

```
ETc = Kc(stage) × ET0                       # FAO-56 crop coefficient
Peff = P − runoff(P, soil)                  # soil-specific runoff
θroot(t+1) = θroot(t) + Peff − ETc          # bounded [WP, FC]
stress begins when depletion > p × TAW      # FAO-56 RAW threshold
```

- The last **30 days of observed weather** at the field's coordinates are replayed from a field-capacity start to estimate today's state — so the current soil water is driven by what actually happened, not a guess.
- The next **7 days of real forecast** are simulated as a **dry-run** (no irrigation) — stress onset in that window triggers the advisory and the alerts.
- Impact is only recorded on a **decision** (adopt / explicit skip): `water saved = (baseline − advisory) × area`, `energy = ρ·g·V·h/η`, `CO₂e = kWh × grid EF (0.6538 kg/kWh, IGES VN-2019)`, `yield protection = stress-days avoided × crop sensitivity`.

All constants (conventional irrigation baseline by crop, pump head 10 m, pump efficiency 0.4, grid emission factor, score weights) are in [`src/lib/engine/constants.ts`](src/lib/engine/constants.ts) and are shown verbatim on the in-app Methodology page.

## Project structure

```
src/
├── app/
│   ├── page.tsx                 # single-page app shell (view switcher)
│   ├── layout.tsx               # Space Mono font + theme provider
│   └── api/
│       ├── fields/              # list/create, detail/delete, analyze, insight (AI brief)
│       ├── advisories/[id]/     # adopt / dismiss → MRV ledger
│       ├── alerts/              # list, acknowledge, scan-all
│       ├── impact/              # aggregation + sustainability score + SDG
│       ├── export/              # CSV MRV report
│       └── seed/                # demo dataset (POST) / reset (DELETE)
├── components/agri/             # views: landing, map, dashboard, impact, alerts, about
├── hooks/useAgriData.ts         # data hooks (fetch + cancellation)
├── lib/
│   ├── client/api.ts            # typed API client
│   ├── store.ts                 # zustand app store
│   └── engine/                  # THE SCIENCE
│       ├── constants.ts         # documented assumptions (single source of truth)
│       ├── crops.ts             # FAO-56 crop & soil parameter tables
│       ├── geo.ts               # geodesic polygon area / centroid
│       ├── weather.ts           # Open-Meteo client (cached 30 min)
│       ├── waterBalance.ts      # FAO-56 dual-bucket model
│       ├── alerts.ts            # rule engine + advisory drafting
│       ├── impact.ts            # MRV engine + sustainability score + SDG
│       ├── adoption.ts          # decision → ledger pipeline
│       ├── analysis.ts          # orchestrator (weather → model → DB)
│       └── seed-data.ts         # demo fields (real coordinates)
└── prisma/schema.prisma         # Field, AnalysisSnapshot, Advisory, AlertEvent, ImpactRecord
```

## Verification (what was actually tested)

This repository was pushed only after:

- `eslint .` and `tsc --noEmit` pass with **zero errors/warnings**
- Full browser end-to-end: draw field on the map → create (201) → live analysis → advisory adoption → 3 MRV ledger entries written → aggregate impact + CSV export → alerts acknowledge → dark mode → 375 px mobile viewport → no console/page errors
- API-level checks: oversized/invalid polygons rejected (400), advisory decisions idempotent, seed/reset flows, CSV content
- Live-data checks: Open-Meteo returns real observed + forecast weather; impact math hand-verified (13.71 ML ↔ 936 kWh ↔ 612 kgCO₂e for a 39 ha skip decision)

## Known limitations (by design, stated in-app)

- Soil state is modelled from weather + texture-class constants (not in-situ sensors); the surface layer is a physically-consistent proxy for what satellite radar sees.
- Yield protection uses FAO-33-style planning coefficients, not harvested measurements.
- v1 has no authentication — all data is shared demo data; stakeholder views are views, not access controls.
- Weather forecast uncertainty is inherent; the app shows the forecast window explicitly rather than hiding it.

## License & data

Code: see repository owner. Data sources: [Open-Meteo](https://open-meteo.com) (CC-BY 4.0, attribution required); satellite imagery © [Esri](https://www.esri.com/) — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community. Agronomy references: FAO-56 (Allen et al., 1998), FAO-33 production functions.

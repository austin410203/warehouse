# WareTrack · Warehouse Digital Twin (Prototype)

Next.js 15 + React Three Fiber prototype of an isometric warehouse digital twin.
**Core idea: state lives in the store/DB, the 3D scene is only a projection of it.**

## Features
- Isometric (orthographic) warehouse: 3 inbound docks (In 1–3), 1 outbound dock (Out 1), yard, storage zone, trucks, forklifts, pallets — all procedural low-poly geometry, no assets
- KPI cards (stock on hand, trucks on site, on-time %, dock utilization + score)
- Right detail panel for trucks / forklifts / docks / shipments (click anything in 3D or in lists)
- Bottom shipment timeline (Order Confirmed → Picked → Loaded → In Transit → Unloading x/y)
- Dock list with Docks / Forklifts / Trucks tabs
- **Drag-to-assign**: drag a *Waiting* truck in 3D onto a dock pad (compatible docks light up), or drag it from the Trucks tab onto a dock row; or use the buttons in the detail panel
- Dedicate a forklift to a truck (manual) or leave it on auto-dispatch
- Time control: pause / 1x / 4x / 8x
- Random events: rush orders, dock door faults (dispatch maintenance for −20 pts), truck delays
- Scoring: +100 on-time, +250 on-time rush, −50 late
- Camera: zoom, rotate, home, search → auto-focus (left-drag pan, right-drag rotate, wheel zoom)

## Run
```bash
npm install
npm run dev        # http://localhost:3000 — Demo mode, zero config
```

## Deploy to Vercel
```bash
npx vercel         # or import the repo in the Vercel dashboard — no env vars needed for Demo mode
```

## Modes
| Mode | How | Data flow |
|---|---|---|
| **Demo** (default) | nothing to configure | `lib/sim/engine.ts` runs in the browser at 10 Hz × speed, seeded from `lib/sim/seed.ts` |
| **DB** | set `DATABASE_URL` (Neon) and `NEXT_PUBLIC_DATA_MODE=db` | Same engine runs server-side (lazy tick on each read), state persisted in Postgres via Drizzle; client receives SSE from `/api/stream` (falls back to 2 s polling) |

DB setup:
```bash
cp .env.example .env.local     # fill DATABASE_URL, set NEXT_PUBLIC_DATA_MODE=db
npm run db:push                # create tables from db/schema.ts
curl -X POST http://localhost:3000/api/seed   # load the demo world (protect with SEED_TOKEN in prod)
```

## API (Route Handlers, `app/api/*`)
| Route | Purpose |
|---|---|
| `GET /api/state` | Current world, advanced to "now" by the engine |
| `GET /api/stream` | SSE stream of the world (~25 s per connection, auto-reconnect — Vercel has no WebSockets) |
| `POST /api/assign` | `{truckId, dockId}` assign · `{forkliftId, truckId}` dedicate · `{repairDockId}` maintenance |
| `POST /api/seed` | Reset DB to seed world (`Authorization: Bearer $SEED_TOKEN` if set) |

All return `503` with `mode: "demo"` when `DATABASE_URL` is not set.

## Structure
```
lib/sim/types.ts     World model (trucks, docks, forklifts, shipments, events)
lib/sim/engine.ts    Pure tick loop + player actions (shared by browser & server)
lib/sim/seed.ts      Seed world (TRK-2205 unloading at In 1, etc.)
lib/sim/layout.ts    Scene coordinates and sim clock (1 sim s = 10 clock s)
lib/store.ts         Zustand store shared by 3D scene and UI panels
components/scene/    R3F scene + procedural models
components/ui/Hud.tsx  KPI cards, detail panel, timeline, dock list, top bar
db/schema.ts         Drizzle schema: warehouses, docks, trucks, shipments, pallets, inventory, forklifts, tasks, events, stock_levels
db/repository.ts     load/save World ↔ tables (optimistic lock on warehouses.version)
```

## Next steps toward production
- Replace whole-snapshot save with per-entity updates / event sourcing from the `events` table
- Feed real WMS/ERP data into `trucks`, `shipments`, `inventory`; turn off the spawner
- Move the tick into a Vercel Cron or queue worker; add Ably/Pusher for sub-second push
- Use `pallets`/`tasks` tables for location-level tracking

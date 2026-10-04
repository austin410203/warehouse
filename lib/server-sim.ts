import 'server-only';
import { getDb, loadWorld, saveWorld, type Db } from '../db/repository';
import { step } from './sim/engine';
import type { SimSettings, World } from './sim/types';

const SETTINGS: SimSettings = { autoDock: true, autoForklift: true, randomEvents: true, autoSpawn: true };
const MAX_CATCHUP = 30; // sim seconds advanced per request at most

export const dbMissing = () =>
  Response.json({ ok: false, mode: 'demo', msg: 'DATABASE_URL not set — app runs in Demo mode (front-end simulation).' }, { status: 503 });

/** Lazy server-side tick: load, advance by wall-clock time since last save, persist. */
export async function tickAndLoad(db: Db): Promise<World | null> {
  const loaded = await loadWorld(db);
  if (!loaded) return null;
  const elapsed = Math.min(MAX_CATCHUP, (Date.now() - loaded.updatedAt.getTime()) / 1000);
  if (elapsed < 0.5) return loaded.world;
  step(loaded.world, elapsed, SETTINGS);
  const saved = await saveWorld(db, loaded.world, loaded.version);
  return saved ? loaded.world : (await loadWorld(db))?.world ?? loaded.world;
}

/** Load → mutate with an engine action → save (retry once on version conflict). */
export async function mutateWorld<T>(db: Db, fn: (w: World) => T): Promise<T | null> {
  for (let i = 0; i < 2; i++) {
    const loaded = await loadWorld(db);
    if (!loaded) return null;
    const res = fn(loaded.world);
    if (await saveWorld(db, loaded.world, loaded.version)) return res;
  }
  return null;
}

export { getDb };

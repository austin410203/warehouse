import { saveWorld } from '../../../db/repository';
import { createSeedWorld } from '../../../lib/sim/seed';
import { dbMissing, getDb } from '../../../lib/server-sim';

export const dynamic = 'force-dynamic';

// POST /api/seed → reset the DB to the demo seed world (requires SEED_TOKEN if set)
export async function POST(req: Request) {
  const db = getDb();
  if (!db) return dbMissing();
  const token = process.env.SEED_TOKEN;
  if (token && req.headers.get('authorization') !== `Bearer ${token}`) return Response.json({ ok: false }, { status: 401 });
  await saveWorld(db, createSeedWorld(), null);
  return Response.json({ ok: true, msg: 'Seeded WH-04' });
}

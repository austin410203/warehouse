import { dbMissing, getDb, tickAndLoad } from '../../../lib/server-sim';

export const dynamic = 'force-dynamic';

// GET /api/state → current world (advanced to "now" by the shared engine)
export async function GET() {
  const db = getDb();
  if (!db) return dbMissing();
  const world = await tickAndLoad(db);
  if (!world) return Response.json({ ok: false, msg: 'No warehouse found — POST /api/seed first' }, { status: 404 });
  return Response.json({ ok: true, mode: 'db', world });
}

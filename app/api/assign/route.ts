import { assignTruckToDock, pinForklift, repairDock } from '../../../lib/sim/engine';
import { dbMissing, getDb, mutateWorld } from '../../../lib/server-sim';

export const dynamic = 'force-dynamic';

// POST /api/assign  { truckId, dockId }            → assign truck to dock
//                   { forkliftId, truckId | null } → dedicate forklift
//                   { repairDockId }               → dispatch maintenance
export async function POST(req: Request) {
  const db = getDb();
  if (!db) return dbMissing();
  const body = await req.json().catch(() => ({}));
  const res = await mutateWorld(db, (w) => {
    if (body.forkliftId) { pinForklift(w, body.forkliftId, body.truckId ?? null); return { ok: true, code: 'forkliftUpdated' }; }
    if (body.repairDockId) { repairDock(w, body.repairDockId); return { ok: true, code: 'repairDispatched' }; }
    if (body.truckId && body.dockId) return assignTruckToDock(w, body.truckId, body.dockId);
    return { ok: false, code: 'errBadRequest' };
  });
  if (!res) return Response.json({ ok: false, msg: 'Conflict or no data, retry' }, { status: 409 });
  return Response.json(res, { status: res.ok ? 200 : 400 });
}

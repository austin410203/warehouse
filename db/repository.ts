import 'server-only';
import { neon } from '@neondatabase/serverless';
import { and, desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import * as s from './schema';
import type { World } from '../lib/sim/types';

export const WAREHOUSE_ID = 'WH-04';

// events.msg stores {code, params} as JSON so the UI can render it in any language
function parseMsg(msg: string): { code: string; params?: Record<string, string | number | boolean> } {
  try { const j = JSON.parse(msg); if (j && typeof j.code === 'string') return j; } catch {}
  return { code: 'raw', params: { text: msg } };
}

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return drizzle(neon(url), { schema: s });
}
export type Db = NonNullable<ReturnType<typeof getDb>>;

export async function loadWorld(db: Db, warehouseId = WAREHOUSE_ID): Promise<{ world: World; version: number; updatedAt: Date } | null> {
  const [wh] = await db.select().from(s.warehouses).where(eq(s.warehouses.id, warehouseId));
  if (!wh) return null;
  const [dockRows, truckRows, shipRows, flRows, evRows, stockRows] = await Promise.all([
    db.select().from(s.docks).where(eq(s.docks.warehouseId, warehouseId)).orderBy(s.docks.doorX),
    db.select().from(s.trucks).where(eq(s.trucks.warehouseId, warehouseId)),
    db.select().from(s.shipments).where(eq(s.shipments.warehouseId, warehouseId)),
    db.select().from(s.forklifts).where(eq(s.forklifts.warehouseId, warehouseId)).orderBy(s.forklifts.id),
    db.select().from(s.events).where(eq(s.events.warehouseId, warehouseId)).orderBy(desc(s.events.seq)).limit(60),
    db.select().from(s.stockLevels).where(eq(s.stockLevels.warehouseId, warehouseId)),
  ]);
  const world: World = {
    warehouse: { id: wh.id, name: wh.name, capacity: wh.capacity },
    t: wh.simT, stock: stockRows[0]?.pallets ?? 0, stockStart: wh.stockStart,
    completed: wh.completed, onTimeCount: wh.onTimeCount, score: wh.score,
    nextSpawn: wh.nextSpawn, nextEvent: wh.nextEvent, seq: wh.seq,
    docks: dockRows.map((d) => ({
      id: d.id, name: d.name, kind: d.kind, pos: [d.x, d.z], door: [d.doorX, d.doorZ],
      status: d.status, truckId: d.truckId, faultUntil: d.faultUntil,
    })),
    trucks: truckRows.map((t) => ({
      id: t.id, plate: t.plate, driver: t.driver, carrier: t.carrier, kind: t.kind, status: t.status, dockId: t.dockId,
      total: t.totalPallets, done: t.donePallets, inFlight: t.inFlight, tons: t.tons, eta: t.eta, waitingSince: t.waitingSince,
      pos: [t.x, t.z], heading: t.heading, target: t.targetX !== null && t.targetZ !== null ? [t.targetX, t.targetZ] : null,
      yardSlot: t.yardSlot, shipmentId: t.shipmentId, delayed: t.delayed, rush: t.rush,
    })),
    shipments: shipRows.map((x) => ({
      id: x.id, customer: x.customer, destination: x.destination, truckId: x.truckId, kind: x.kind,
      stages: x.stages, dueAt: x.dueAt, completedAt: x.completedAt, onTime: x.onTime,
    })),
    forklifts: flRows.map((f) => ({
      id: f.id, name: f.name, status: f.status, pos: [f.x, f.z], heading: f.heading,
      target: f.targetX !== null && f.targetZ !== null ? [f.targetX, f.targetZ] : null, home: [f.homeX, f.homeZ],
      carrying: f.carrying, truckId: f.truckId, pinnedTruckId: f.pinnedTruckId, busyUntil: f.busyUntil, next: 'pickup', moved: f.moved,
    })),
    events: evRows.map((e) => ({
      id: e.seq, t: e.t, kind: e.kind, ...parseMsg(e.msg),
      ref: e.refType && e.refId ? { type: e.refType as 'truck', id: e.refId } : undefined,
    })),
  };
  return { world, version: wh.version, updatedAt: wh.updatedAt };
}

/** Persist a whole world snapshot. Returns false if another request saved first (optimistic lock). */
export async function saveWorld(db: Db, w: World, expectedVersion: number | null): Promise<boolean> {
  const id = w.warehouse.id;
  const whValues = {
    name: w.warehouse.name, capacity: w.warehouse.capacity, simT: w.t, stockStart: w.stockStart,
    completed: w.completed, onTimeCount: w.onTimeCount, score: w.score, nextSpawn: w.nextSpawn,
    nextEvent: w.nextEvent, seq: w.seq, updatedAt: new Date(),
  };
  if (expectedVersion === null) {
    await db.insert(s.warehouses).values({ id, ...whValues, version: 0 })
      .onConflictDoUpdate({ target: s.warehouses.id, set: { ...whValues, version: 0 } });
  } else {
    const updated = await db.update(s.warehouses).set({ ...whValues, version: expectedVersion + 1 })
      .where(and(eq(s.warehouses.id, id), eq(s.warehouses.version, expectedVersion))).returning({ id: s.warehouses.id });
    if (!updated.length) return false;
  }

  const maxSeqSaved = await db.select({ seq: s.events.seq }).from(s.events).where(eq(s.events.warehouseId, id)).orderBy(desc(s.events.seq)).limit(1);
  const newEvents = w.events.filter((e) => e.id > (maxSeqSaved[0]?.seq ?? 0));

  await db.batch([
    db.delete(s.docks).where(eq(s.docks.warehouseId, id)),
    db.delete(s.trucks).where(eq(s.trucks.warehouseId, id)),
    db.delete(s.forklifts).where(eq(s.forklifts.warehouseId, id)),
    db.delete(s.shipments).where(eq(s.shipments.warehouseId, id)),
    db.insert(s.docks).values(w.docks.map((d) => ({
      id: d.id, warehouseId: id, name: d.name, kind: d.kind, x: d.pos[0], z: d.pos[1], doorX: d.door[0], doorZ: d.door[1],
      status: d.status, truckId: d.truckId, faultUntil: d.faultUntil,
    }))),
    db.insert(s.forklifts).values(w.forklifts.map((f) => ({
      id: f.id, warehouseId: id, name: f.name, status: f.status, x: f.pos[0], z: f.pos[1], heading: f.heading,
      targetX: f.target?.[0] ?? null, targetZ: f.target?.[1] ?? null, homeX: f.home[0], homeZ: f.home[1],
      carrying: f.carrying, truckId: f.truckId, pinnedTruckId: f.pinnedTruckId, busyUntil: f.busyUntil, moved: f.moved,
    }))),
    db.insert(s.shipments).values(w.shipments.slice(-200).map((x) => ({
      id: x.id, warehouseId: id, customer: x.customer, destination: x.destination, truckId: x.truckId, kind: x.kind,
      stages: x.stages, dueAt: x.dueAt, completedAt: x.completedAt, onTime: x.onTime,
    }))),
    ...(w.trucks.length ? [db.insert(s.trucks).values(w.trucks.map((t) => ({
      id: t.id, warehouseId: id, plate: t.plate, driver: t.driver, carrier: t.carrier, kind: t.kind, status: t.status,
      dockId: t.dockId, totalPallets: t.total, donePallets: t.done, inFlight: t.inFlight, tons: t.tons, eta: t.eta,
      waitingSince: t.waitingSince, x: t.pos[0], z: t.pos[1], heading: t.heading, targetX: t.target?.[0] ?? null,
      targetZ: t.target?.[1] ?? null, yardSlot: t.yardSlot, shipmentId: t.shipmentId, delayed: t.delayed, rush: t.rush,
    })))] : []),
    ...(newEvents.length ? [db.insert(s.events).values(newEvents.map((e) => ({
      warehouseId: id, seq: e.id, t: e.t, kind: e.kind, msg: JSON.stringify({ code: e.code, params: e.params }), refType: e.ref?.type ?? null, refId: e.ref?.id ?? null,
    })))] : []),
    db.insert(s.stockLevels).values({ warehouseId: id, pallets: w.stock })
      .onConflictDoUpdate({ target: s.stockLevels.warehouseId, set: { pallets: w.stock } }),
  ] as const);
  return true;
}

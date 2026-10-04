// Neon Postgres schema (Drizzle ORM). Mirrors lib/sim/types.ts so the same
// engine can run against DB state. Run `npm run db:push` after setting DATABASE_URL.
import { boolean, doublePrecision, index, integer, jsonb, pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const dockKind = pgEnum('dock_kind', ['in', 'out']);
export const dockStatus = pgEnum('dock_status', ['available', 'occupied', 'fault']);
export const truckKind = pgEnum('truck_kind', ['inbound', 'outbound']);
export const truckStatus = pgEnum('truck_status', ['transit', 'arriving', 'waiting', 'docking', 'working', 'departing', 'departed']);
export const forkliftStatus = pgEnum('forklift_status', ['idle', 'toPickup', 'handling', 'toDrop', 'returning']);
export const taskStatus = pgEnum('task_status', ['queued', 'active', 'done', 'cancelled']);
export const eventKind = pgEnum('event_kind', ['rush', 'fault', 'delay', 'info', 'success', 'warn']);

export const warehouses = pgTable('warehouses', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  capacity: integer('capacity').notNull(),
  // simulation clock + game state (DB mode runs the same engine server-side)
  simT: doublePrecision('sim_t').notNull().default(0),
  stockStart: integer('stock_start').notNull().default(0),
  completed: integer('completed').notNull().default(0),
  onTimeCount: integer('on_time_count').notNull().default(0),
  score: integer('score').notNull().default(0),
  nextSpawn: doublePrecision('next_spawn').notNull().default(0),
  nextEvent: doublePrecision('next_event').notNull().default(0),
  seq: integer('seq').notNull().default(0),
  version: integer('version').notNull().default(0), // optimistic lock for concurrent ticks
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const docks = pgTable('docks', {
  id: text('id').primaryKey(),
  warehouseId: text('warehouse_id').notNull().references(() => warehouses.id),
  name: text('name').notNull(),
  kind: dockKind('kind').notNull(),
  x: doublePrecision('x').notNull(),
  z: doublePrecision('z').notNull(),
  doorX: doublePrecision('door_x').notNull(),
  doorZ: doublePrecision('door_z').notNull(),
  status: dockStatus('status').notNull().default('available'),
  truckId: text('truck_id'),
  faultUntil: doublePrecision('fault_until').notNull().default(0),
});

export const trucks = pgTable('trucks', {
  id: text('id').primaryKey(),
  warehouseId: text('warehouse_id').notNull().references(() => warehouses.id),
  plate: text('plate').notNull(),
  driver: text('driver').notNull(),
  carrier: text('carrier').notNull(),
  kind: truckKind('kind').notNull(),
  status: truckStatus('status').notNull(),
  dockId: text('dock_id'),
  totalPallets: integer('total_pallets').notNull(),
  donePallets: integer('done_pallets').notNull().default(0),
  inFlight: integer('in_flight').notNull().default(0),
  tons: doublePrecision('tons').notNull(),
  eta: doublePrecision('eta').notNull().default(0),
  waitingSince: doublePrecision('waiting_since').notNull().default(0),
  x: doublePrecision('x').notNull(),
  z: doublePrecision('z').notNull(),
  heading: doublePrecision('heading').notNull().default(0),
  targetX: doublePrecision('target_x'),
  targetZ: doublePrecision('target_z'),
  yardSlot: integer('yard_slot'),
  shipmentId: text('shipment_id').notNull(),
  delayed: boolean('delayed').notNull().default(false),
  rush: boolean('rush').notNull().default(false),
}, (t) => [index('trucks_status_idx').on(t.status)]);

export const shipments = pgTable('shipments', {
  id: text('id').primaryKey(),
  warehouseId: text('warehouse_id').notNull().references(() => warehouses.id),
  customer: text('customer').notNull(),
  destination: text('destination').notNull(),
  truckId: text('truck_id').notNull(),
  kind: truckKind('kind').notNull(),
  // timeline: [{ label, clock }] — Order Confirmed → Picked → Loaded → In Transit → Unloading
  stages: jsonb('stages').$type<{ label: string; clock: number | null }[]>().notNull(),
  dueAt: doublePrecision('due_at').notNull(),
  completedAt: doublePrecision('completed_at'),
  onTime: boolean('on_time'),
});

export const forklifts = pgTable('forklifts', {
  id: text('id').primaryKey(),
  warehouseId: text('warehouse_id').notNull().references(() => warehouses.id),
  name: text('name').notNull(),
  status: forkliftStatus('status').notNull().default('idle'),
  x: doublePrecision('x').notNull(),
  z: doublePrecision('z').notNull(),
  heading: doublePrecision('heading').notNull().default(0),
  targetX: doublePrecision('target_x'),
  targetZ: doublePrecision('target_z'),
  homeX: doublePrecision('home_x').notNull(),
  homeZ: doublePrecision('home_z').notNull(),
  carrying: boolean('carrying').notNull().default(false),
  truckId: text('truck_id'),
  pinnedTruckId: text('pinned_truck_id'),
  busyUntil: doublePrecision('busy_until').notNull().default(0),
  moved: integer('moved').notNull().default(0),
});

// Physical inventory. The prototype tracks an aggregate stock level per warehouse;
// pallets/inventory are ready for location-level tracking when wired to a WMS.
export const inventory = pgTable('inventory', {
  id: serial('id').primaryKey(),
  warehouseId: text('warehouse_id').notNull().references(() => warehouses.id),
  sku: text('sku').notNull(),
  location: text('location').notNull(),
  pallets: integer('pallets').notNull(),
});

export const pallets = pgTable('pallets', {
  id: text('id').primaryKey(),
  warehouseId: text('warehouse_id').notNull().references(() => warehouses.id),
  sku: text('sku'),
  location: text('location'), // storage cell / dock / truck id / forklift id
  shipmentId: text('shipment_id'),
});

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  warehouseId: text('warehouse_id').notNull().references(() => warehouses.id),
  forkliftId: text('forklift_id'),
  truckId: text('truck_id'),
  palletId: text('pallet_id'),
  fromLoc: text('from_loc').notNull(),
  toLoc: text('to_loc').notNull(),
  status: taskStatus('status').notNull().default('queued'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  warehouseId: text('warehouse_id').notNull().references(() => warehouses.id),
  seq: integer('seq').notNull(),
  t: doublePrecision('t').notNull(),
  kind: eventKind('kind').notNull(),
  msg: text('msg').notNull(),
  refType: text('ref_type'),
  refId: text('ref_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('events_wh_seq_idx').on(t.warehouseId, t.seq)]);

// Aggregate stock level (kept on its own row so a WMS feed can update it independently)
export const stockLevels = pgTable('stock_levels', {
  warehouseId: text('warehouse_id').primaryKey().references(() => warehouses.id),
  pallets: integer('pallets').notNull(),
});

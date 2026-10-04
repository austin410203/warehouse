import { DOCK_DEFS, DOCK_PARK_Z, WALL_Z, YARD_SLOTS, fromClock, hm } from './layout';
import type { Dock, Forklift, Shipment, Truck, World } from './types';

const stages = (kind: 'inbound' | 'outbound', times: (number | null)[]) =>
  (kind === 'inbound'
    ? ['Order Confirmed', 'Picked', 'Loaded', 'In Transit', 'Unloading']
    : ['Order Confirmed', 'Picked', 'Staged', 'Loading', 'Departed']
  ).map((label, i) => ({ label, clock: times[i] ?? null }));

function truck(p: Partial<Truck> & Pick<Truck, 'id' | 'kind' | 'shipmentId'>): Truck {
  return {
    plate: 'ZBY-0000', driver: 'Driver', carrier: 'WareTrack Freight', status: 'transit',
    dockId: null, total: 6, done: 0, inFlight: 0, tons: 2.4, eta: 30, waitingSince: 0,
    pos: [-24, 12], heading: Math.PI / 2, target: null, yardSlot: null, delayed: false, rush: false,
    ...p,
  };
}

export function createSeedWorld(): World {
  const docks: Dock[] = DOCK_DEFS.map((d) => ({
    id: d.id, name: d.name, kind: d.kind,
    pos: [d.x, DOCK_PARK_Z] as [number, number], door: [d.x, WALL_Z] as [number, number],
    status: 'available' as const, truckId: null as string | null, faultUntil: 0,
  }));

  const trucks: Truck[] = [
    truck({ id: 'TRK-2205', plate: 'ZBY-5648', driver: 'Sam Chen', kind: 'inbound', status: 'working',
      dockId: 'in1', total: 6, done: 2, tons: 1.2, pos: [docks[0].pos[0], docks[0].pos[1]], heading: 0, shipmentId: 'SHP-78450' }),
    truck({ id: 'TRK-2218', plate: 'KLA-2231', driver: 'Mia Lin', kind: 'inbound', status: 'waiting',
      total: 5, tons: 2.0, pos: YARD_SLOTS[0], heading: 0, yardSlot: 0, waitingSince: 0, shipmentId: 'SHP-78462' }),
    truck({ id: 'TRK-2231', plate: 'RTE-9087', driver: 'Leo Wang', kind: 'inbound', eta: 18, total: 6, shipmentId: 'SHP-78471' }),
    truck({ id: 'TRK-3104', plate: 'OUT-4410', driver: 'Ivy Huang', carrier: 'Northline Logistics', kind: 'outbound',
      eta: 40, total: 4, tons: 1.8, shipmentId: 'SHP-80112' }),
  ];
  docks[0].status = 'occupied';
  docks[0].truckId = 'TRK-2205';

  const shipments: Shipment[] = [
    { id: 'SHP-78450', customer: 'Oakridge Market', destination: 'WH-04 Southfield Cross-Dock', truckId: 'TRK-2205', kind: 'inbound',
      stages: stages('inbound', [hm(6, 58), hm(8, 25), hm(9, 11), hm(9, 37), null]), dueAt: fromClock(hm(9, 56)), completedAt: null, onTime: null },
    { id: 'SHP-78462', customer: 'Bluewater Foods', destination: 'WH-04 Southfield Cross-Dock', truckId: 'TRK-2218', kind: 'inbound',
      stages: stages('inbound', [hm(7, 12), hm(8, 40), hm(9, 2), hm(9, 20), null]), dueAt: fromClock(hm(10, 10)), completedAt: null, onTime: null },
    { id: 'SHP-78471', customer: 'Harbor Pharmacy', destination: 'WH-04 Southfield Cross-Dock', truckId: 'TRK-2231', kind: 'inbound',
      stages: stages('inbound', [hm(7, 30), hm(8, 52), hm(9, 15), hm(9, 31), null]), dueAt: fromClock(hm(10, 25)), completedAt: null, onTime: null },
    { id: 'SHP-80112', customer: 'Cedar Home Goods', destination: 'Cedar DC · Taoyuan', truckId: 'TRK-3104', kind: 'outbound',
      stages: stages('outbound', [hm(8, 5), hm(9, 0), hm(9, 30), null, null]), dueAt: fromClock(hm(10, 40)), completedAt: null, onTime: null },
  ];

  const homes: [number, number][] = [[-1, 6], [0.6, 6], [2.2, 6], [3.8, 6], [5.4, 6]];
  const forklifts: Forklift[] = homes.map((h, i) => ({
    id: `FL-0${i + 1}`, name: `Forklift ${i + 1}`, status: 'idle', pos: [...h] as [number, number], heading: Math.PI,
    target: null, home: h, carrying: false, truckId: null, pinnedTruckId: null, busyUntil: 0, next: 'pickup', moved: 0,
  }));

  return {
    warehouse: { id: 'WH-04', name: 'Southfield Cross-Dock', capacity: 1600 },
    t: 0, stock: 610, stockStart: 590, trucks, docks, forklifts, shipments,
    events: [{ id: 1, t: 0, kind: 'info', msg: 'Shift started · Demo mode simulation running' }],
    completed: 124, onTimeCount: 119, score: 0, nextSpawn: 45, nextEvent: 35, seq: 2,
  };
}

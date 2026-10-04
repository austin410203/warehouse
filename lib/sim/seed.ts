import { DOCK_PARK_Z, WALL_Z, YARD_SLOTS, dockLayout, fromClock, hm } from './layout';
import type { Dock, Forklift, Shipment, Truck, TruckKind, World } from './types';

export const STAGES: Record<TruckKind, string[]> = {
  inbound: ['Order Confirmed', 'Picked', 'Loaded', 'In Transit', 'Unloading'],
  outbound: ['Order Confirmed', 'Picked', 'Staged', 'Loading', 'Departed'],
};
const stages = (kind: TruckKind, times: (number | null)[]) => STAGES[kind].map((label, i) => ({ label, clock: times[i] ?? null }));

function truck(p: Partial<Truck> & Pick<Truck, 'id' | 'kind' | 'shipmentId'>): Truck {
  return {
    plate: 'ZBY-0000', driver: 'Driver', carrier: 'WareTrack Freight', status: 'transit',
    dockId: null, total: 6, done: 0, inFlight: 0, tons: 2.4, eta: 30, waitingSince: 0,
    pos: [-24, 12], heading: Math.PI / 2, target: null, yardSlot: null, delayed: false, rush: false,
    ...p,
  };
}

interface TruckSeed {
  id: string; plate: string; driver: string; carrier?: string; kind: TruckKind; total: number; tons: number;
  state: { working: { dock: number; done: number } } | { waiting: number } | { transit: number };
  ship: { id: string; customer: string; destination?: string; times: (number | null)[]; due: number };
}

interface WarehouseSeed {
  id: string; name: string; nameZh: string; city: string; capacity: number; stock: number; stockStart: number;
  nIn: number; nOut: number; forklifts: number; completed: number; onTime: number; trucks: TruckSeed[];
}

const SEEDS: WarehouseSeed[] = [
  {
    id: 'WH-04', name: 'Southfield Cross-Dock', nameZh: '南田轉運倉', city: 'Taoyuan', capacity: 1600, stock: 610, stockStart: 590,
    nIn: 3, nOut: 1, forklifts: 5, completed: 124, onTime: 119,
    trucks: [
      { id: 'TRK-2205', plate: 'ZBY-5648', driver: 'Sam Chen', kind: 'inbound', total: 6, tons: 1.2, state: { working: { dock: 0, done: 2 } },
        ship: { id: 'SHP-78450', customer: 'Oakridge Market', times: [hm(6, 58), hm(8, 25), hm(9, 11), hm(9, 37)], due: hm(9, 56) } },
      { id: 'TRK-2218', plate: 'KLA-2231', driver: 'Mia Lin', kind: 'inbound', total: 5, tons: 2.0, state: { waiting: 0 },
        ship: { id: 'SHP-78462', customer: 'Bluewater Foods', times: [hm(7, 12), hm(8, 40), hm(9, 2), hm(9, 20)], due: hm(10, 10) } },
      { id: 'TRK-2224', plate: 'MHT-7710', driver: 'Kevin Wu', carrier: 'Swift Haul', kind: 'outbound', total: 4, tons: 1.6, state: { waiting: 1 },
        ship: { id: 'SHP-80105', customer: 'Lotus Electronics', destination: 'Lotus DC · Hsinchu', times: [hm(8, 1), hm(9, 5), hm(9, 40)], due: hm(10, 20) } },
      { id: 'TRK-2231', plate: 'RTE-9087', driver: 'Leo Wang', kind: 'inbound', total: 6, tons: 2.4, state: { transit: 18 },
        ship: { id: 'SHP-78471', customer: 'Harbor Pharmacy', times: [hm(7, 30), hm(8, 52), hm(9, 15), hm(9, 31)], due: hm(10, 25) } },
      { id: 'TRK-2236', plate: 'PNX-3302', driver: 'Grace Lo', kind: 'inbound', total: 7, tons: 2.9, state: { transit: 32 },
        ship: { id: 'SHP-78480', customer: 'Metro Grocers', times: [hm(7, 45), hm(8, 58), hm(9, 22), hm(9, 40)], due: hm(10, 35) } },
      { id: 'TRK-3104', plate: 'OUT-4410', driver: 'Ivy Huang', carrier: 'Northline Logistics', kind: 'outbound', total: 4, tons: 1.8, state: { transit: 40 },
        ship: { id: 'SHP-80112', customer: 'Cedar Home Goods', destination: 'Cedar DC · Taoyuan', times: [hm(8, 5), hm(9, 0), null], due: hm(10, 40) } },
    ],
  },
  {
    id: 'WH-01', name: 'Taoyuan Airport Hub', nameZh: '桃園機場物流中心', city: 'Taoyuan', capacity: 2400, stock: 1320, stockStart: 1290,
    nIn: 4, nOut: 2, forklifts: 7, completed: 210, onTime: 203,
    trucks: [
      { id: 'TRK-4101', plate: 'TAO-1188', driver: 'Jason Lin', kind: 'inbound', total: 8, tons: 3.1, state: { working: { dock: 0, done: 3 } },
        ship: { id: 'SHP-41020', customer: 'Summit Outdoor', times: [hm(6, 40), hm(8, 0), hm(8, 50), hm(9, 20)], due: hm(10, 0) } },
      { id: 'TRK-4108', plate: 'TAO-5521', driver: 'Amy Chou', kind: 'inbound', total: 6, tons: 2.2, state: { working: { dock: 2, done: 1 } },
        ship: { id: 'SHP-41027', customer: 'Pine & Co.', times: [hm(7, 0), hm(8, 15), hm(9, 0), hm(9, 25)], due: hm(10, 5) } },
      { id: 'TRK-4115', plate: 'AIR-0907', driver: 'Ben Hsieh', carrier: 'Swift Haul', kind: 'outbound', total: 5, tons: 1.9, state: { working: { dock: 4, done: 2 } },
        ship: { id: 'SHP-42003', customer: 'Lotus Electronics', destination: 'TPE Air Cargo Terminal', times: [hm(8, 10), hm(9, 0), hm(9, 30), hm(9, 38)], due: hm(10, 15) } },
      { id: 'TRK-4122', plate: 'TAO-7340', driver: 'Cindy Yang', kind: 'inbound', total: 5, tons: 1.9, state: { waiting: 0 },
        ship: { id: 'SHP-41033', customer: 'Bluewater Foods', times: [hm(7, 20), hm(8, 30), hm(9, 5), hm(9, 28)], due: hm(10, 20) } },
      { id: 'TRK-4129', plate: 'AIR-3315', driver: 'Daniel Ho', kind: 'outbound', total: 6, tons: 2.4, state: { waiting: 1 },
        ship: { id: 'SHP-42010', customer: 'Harbor Pharmacy', destination: 'Harbor DC · Taipei', times: [hm(8, 20), hm(9, 10), hm(9, 41)], due: hm(10, 30) } },
      { id: 'TRK-4136', plate: 'TAO-2290', driver: 'Eric Kao', kind: 'inbound', total: 7, tons: 2.7, state: { transit: 15 },
        ship: { id: 'SHP-41040', customer: 'Metro Grocers', times: [hm(7, 35), hm(8, 45), hm(9, 12), hm(9, 33)], due: hm(10, 30) } },
      { id: 'TRK-4143', plate: 'TAO-6604', driver: 'Fiona Tsai', kind: 'inbound', total: 4, tons: 1.4, state: { transit: 35 },
        ship: { id: 'SHP-41047', customer: 'Oakridge Market', times: [hm(7, 50), hm(9, 0), hm(9, 20), hm(9, 39)], due: hm(10, 45) } },
    ],
  },
  {
    id: 'WH-07', name: 'Taichung Distribution Center', nameZh: '台中配送中心', city: 'Taichung', capacity: 1200, stock: 380, stockStart: 395,
    nIn: 2, nOut: 2, forklifts: 4, completed: 88, onTime: 82,
    trucks: [
      { id: 'TRK-7203', plate: 'TXG-4402', driver: 'Henry Liao', carrier: 'Northline Logistics', kind: 'outbound', total: 5, tons: 2.0, state: { working: { dock: 2, done: 1 } },
        ship: { id: 'SHP-72011', customer: 'Metro Grocers', destination: 'Metro Store #12 · Taichung', times: [hm(8, 0), hm(8, 55), hm(9, 25), hm(9, 35)], due: hm(10, 0) } },
      { id: 'TRK-7210', plate: 'TXG-1950', driver: 'Irene Su', kind: 'inbound', total: 6, tons: 2.3, state: { waiting: 0 },
        ship: { id: 'SHP-71004', customer: 'Summit Outdoor', times: [hm(6, 50), hm(8, 10), hm(9, 0), hm(9, 25)], due: hm(10, 10) } },
      { id: 'TRK-7217', plate: 'TXG-8836', driver: 'Jack Chang', kind: 'outbound', total: 3, tons: 1.1, state: { transit: 12 },
        ship: { id: 'SHP-72018', customer: 'Pine & Co.', destination: 'Pine Showroom · Changhua', times: [hm(8, 30), hm(9, 15), null], due: hm(10, 15) } },
      { id: 'TRK-7224', plate: 'TXG-3071', driver: 'Kelly Fang', kind: 'inbound', total: 7, tons: 2.8, state: { transit: 28 },
        ship: { id: 'SHP-71011', customer: 'Lotus Electronics', times: [hm(7, 5), hm(8, 20), hm(9, 10), hm(9, 32)], due: hm(10, 30) } },
    ],
  },
];

export const WAREHOUSE_IDS = SEEDS.map((s) => s.id);

export function createSeedWorld(id = 'WH-04'): World {
  const cfg = SEEDS.find((s) => s.id === id) ?? SEEDS[0];
  const docks: Dock[] = dockLayout(cfg.nIn, cfg.nOut).map((d) => ({
    id: d.id, name: d.name, kind: d.kind, pos: [d.x, DOCK_PARK_Z], door: [d.x, WALL_Z],
    status: 'available', truckId: null, faultUntil: 0,
  }));

  const trucks: Truck[] = [];
  const shipments: Shipment[] = [];
  for (const s of cfg.trucks) {
    const t = truck({ id: s.id, plate: s.plate, driver: s.driver, carrier: s.carrier ?? 'WareTrack Freight', kind: s.kind,
      total: s.total, tons: s.tons, shipmentId: s.ship.id });
    if ('working' in s.state) {
      const d = docks[s.state.working.dock];
      Object.assign(t, { status: 'working', dockId: d.id, done: s.state.working.done, pos: [...d.pos], heading: 0 });
      d.status = 'occupied';
      d.truckId = t.id;
    } else if ('waiting' in s.state) {
      Object.assign(t, { status: 'waiting', yardSlot: s.state.waiting, pos: [...YARD_SLOTS[s.state.waiting]], heading: 0 });
    } else {
      t.eta = s.state.transit;
    }
    trucks.push(t);
    shipments.push({
      id: s.ship.id, customer: s.ship.customer, destination: s.ship.destination ?? `${cfg.id} ${cfg.name}`,
      truckId: t.id, kind: s.kind, stages: stages(s.kind, s.ship.times), dueAt: fromClock(s.ship.due),
      completedAt: null, onTime: null, source: 'seed',
    });
  }

  const forklifts: Forklift[] = Array.from({ length: cfg.forklifts }, (_, i) => {
    const h: [number, number] = [-1 + i * 1.6, 6];
    return {
      id: `FL-${String(i + 1).padStart(2, '0')}`, name: `Forklift ${i + 1}`, status: 'idle', pos: [...h] as [number, number],
      heading: Math.PI, target: null, home: h, carrying: false, truckId: null, pinnedTruckId: null, busyUntil: 0, next: 'pickup', moved: 0,
    };
  });

  return {
    warehouse: { id: cfg.id, name: cfg.name, nameZh: cfg.nameZh, city: cfg.city, capacity: cfg.capacity },
    t: 0, stock: cfg.stock, stockStart: cfg.stockStart, trucks, docks, forklifts, shipments,
    events: [{ id: 1, t: 0, kind: 'info', code: 'shiftStart' }],
    completed: cfg.completed, onTimeCount: cfg.onTime, score: 0, nextSpawn: 45, nextEvent: 35, seq: 2,
  };
}

export function createAllWorlds(): Record<string, World> {
  return Object.fromEntries(WAREHOUSE_IDS.map((id) => [id, createSeedWorld(id)]));
}

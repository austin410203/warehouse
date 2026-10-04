// Pure simulation engine. `step` advances a World by dt sim-seconds.
// It runs in the browser (Demo mode) or in a Route Handler (DB mode) — same code.
import { EXIT, GATE, YARD_SLOTS, fromClock, storageCell, toClock } from './layout';
import type { Dock, EventKind, Forklift, GameEvent, SimSettings, Truck, Vec, World } from './types';

const TRUCK_SPEED = 6;
const FORKLIFT_SPEED = 2.6;
const HANDLING = 2.5;
const AUTO_DOCK_DELAY = 12;

const CUSTOMERS = ['Oakridge Market', 'Bluewater Foods', 'Harbor Pharmacy', 'Summit Outdoor', 'Lotus Electronics', 'Pine & Co.', 'Metro Grocers'];
const DRIVERS = ['Sam Chen', 'Mia Lin', 'Leo Wang', 'Ivy Huang', 'Noah Tsai', 'Emma Kuo', 'Ray Lee', 'Zoe Hsu'];
const CARRIERS = ['WareTrack Freight', 'Northline Logistics', 'Swift Haul'];

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

export function cloneWorld(w: World): World {
  return structuredClone(w);
}

function moveToward(pos: Vec, target: Vec, dist: number): { pos: Vec; heading: number | null; arrived: boolean } {
  const dx = target[0] - pos[0];
  const dz = target[1] - pos[1];
  const d = Math.hypot(dx, dz);
  if (d <= dist || d < 1e-4) return { pos: [target[0], target[1]], heading: d > 1e-4 ? Math.atan2(dx, dz) : null, arrived: true };
  return { pos: [pos[0] + (dx / d) * dist, pos[1] + (dz / d) * dist], heading: Math.atan2(dx, dz), arrived: false };
}

export function log(w: World, kind: EventKind, msg: string, ref?: GameEvent['ref']) {
  w.events.unshift({ id: ++w.seq, t: w.t, kind, msg, ref });
  if (w.events.length > 60) w.events.length = 60;
}

const findTruck = (w: World, id: string | null) => (id ? w.trucks.find((t) => t.id === id) : undefined);
const findDock = (w: World, id: string | null) => (id ? w.docks.find((d) => d.id === id) : undefined);
const freeYardSlot = (w: World) =>
  YARD_SLOTS.findIndex((_, i) => !w.trucks.some((t) => t.yardSlot === i && ['arriving', 'waiting'].includes(t.status)));

const truckPickupPoint = (dock: Dock): Vec => [dock.pos[0] + 1.8, dock.pos[1] - 1.2];

// ───────────────────────── player actions ─────────────────────────

export function assignTruckToDock(w: World, truckId: string, dockId: string): { ok: boolean; msg: string } {
  const truck = findTruck(w, truckId);
  const dock = findDock(w, dockId);
  if (!truck || !dock) return { ok: false, msg: 'Unknown truck or dock' };
  if (truck.status !== 'waiting') return { ok: false, msg: `${truck.id} is not waiting in the yard` };
  if (dock.status === 'fault') return { ok: false, msg: `${dock.name} is out of service` };
  if (dock.status === 'occupied') return { ok: false, msg: `${dock.name} is occupied` };
  if ((truck.kind === 'inbound') !== (dock.kind === 'in'))
    return { ok: false, msg: `${truck.kind === 'inbound' ? 'Inbound' : 'Outbound'} trucks need an ${truck.kind === 'inbound' ? 'In' : 'Out'} dock` };
  dock.status = 'occupied';
  dock.truckId = truck.id;
  truck.dockId = dock.id;
  truck.status = 'docking';
  truck.target = [dock.pos[0], dock.pos[1]];
  truck.yardSlot = null;
  log(w, 'info', `${truck.id} assigned to ${dock.name}`, { type: 'truck', id: truck.id });
  return { ok: true, msg: `${truck.id} → ${dock.name}` };
}

export function pinForklift(w: World, forkliftId: string, truckId: string | null) {
  const f = w.forklifts.find((x) => x.id === forkliftId);
  if (!f) return;
  f.pinnedTruckId = truckId;
  log(w, 'info', truckId ? `${f.id} dedicated to ${truckId}` : `${f.id} back to auto dispatch`, { type: 'forklift', id: f.id });
}

export function repairDock(w: World, dockId: string) {
  const d = findDock(w, dockId);
  if (!d || d.status !== 'fault') return;
  d.faultUntil = Math.min(d.faultUntil, w.t + 6);
  w.score -= 20;
  log(w, 'info', `Maintenance crew dispatched to ${d.name} (−20 pts)`, { type: 'dock', id: d.id });
}

// ───────────────────────── spawning & events ─────────────────────────

export function spawnTruck(w: World, kind: Truck['kind'], opts: { rush?: boolean; eta?: number } = {}): Truck {
  const n = 2240 + w.seq;
  const id = kind === 'inbound' ? `TRK-${n}` : `TRK-${n + 900}`;
  const shipmentId = `SHP-${78500 + w.seq}`;
  const eta = opts.eta ?? rand(15, 45);
  const total = kind === 'inbound' ? Math.round(rand(4, 8)) : Math.round(rand(3, 6));
  const truck: Truck = {
    id, plate: `${String.fromCharCode(65 + (w.seq % 26))}${String.fromCharCode(75 + (w.seq % 10))}Y-${1000 + Math.floor(Math.random() * 8999)}`,
    driver: pick(DRIVERS), carrier: pick(CARRIERS), kind, status: 'transit', dockId: null,
    total, done: 0, inFlight: 0, tons: +(total * rand(0.3, 0.45)).toFixed(1), eta, waitingSince: 0,
    pos: [...GATE] as Vec, heading: Math.PI / 2, target: null, yardSlot: null, shipmentId, delayed: false, rush: !!opts.rush,
  };
  const now = toClock(w.t);
  const window = (opts.rush ? 60 : 130) + eta;
  w.trucks.push(truck);
  w.shipments.push({
    id: shipmentId, customer: pick(CUSTOMERS), truckId: id, kind,
    destination: kind === 'inbound' ? `${w.warehouse.id} ${w.warehouse.name}` : `${pick(CUSTOMERS)} DC`,
    stages: (kind === 'inbound'
      ? [['Order Confirmed', now - 9000], ['Picked', now - 5200], ['Loaded', now - 2800], ['In Transit', now - 900], ['Unloading', null]]
      : [['Order Confirmed', now - 4000], ['Picked', now - 1500], ['Staged', null], ['Loading', null], ['Departed', null]]
    ).map(([label, clock]) => ({ label: label as string, clock: clock as number | null })),
    dueAt: w.t + window, completedAt: null, onTime: null,
  });
  return truck;
}

function randomEvent(w: World) {
  const roll = Math.random();
  if (roll < 0.38) {
    const t = spawnTruck(w, 'outbound', { rush: true, eta: rand(6, 12) });
    log(w, 'rush', `Rush order! ${t.id} (outbound, ${t.total} pallets) arriving — tight deadline`, { type: 'truck', id: t.id });
  } else if (roll < 0.7) {
    const candidates = w.docks.filter((d) => d.status === 'available');
    if (!candidates.length) return;
    const d = pick(candidates);
    d.status = 'fault';
    d.faultUntil = w.t + rand(40, 70);
    log(w, 'fault', `${d.name} door fault — dock out of service`, { type: 'dock', id: d.id });
  } else {
    const transit = w.trucks.filter((t) => t.status === 'transit');
    if (!transit.length) return;
    const t = pick(transit);
    const extra = Math.round(rand(25, 50));
    t.eta += extra;
    t.delayed = true;
    log(w, 'delay', `${t.id} delayed by traffic (+${extra * 10 / 60 | 0} min)`, { type: 'truck', id: t.id });
  }
}

// ───────────────────────── tick ─────────────────────────

function finishShipment(w: World, truck: Truck) {
  const s = w.shipments.find((x) => x.id === truck.shipmentId);
  if (!s) return;
  s.completedAt = w.t;
  s.onTime = w.t <= s.dueAt;
  s.stages[s.stages.length - (truck.kind === 'inbound' ? 1 : 1)].clock = toClock(w.t);
  w.completed += 1;
  if (s.onTime) {
    w.onTimeCount += 1;
    w.score += truck.rush ? 250 : 100;
    log(w, 'success', `${s.id} completed on time${truck.rush ? ' · rush bonus' : ''} (+${truck.rush ? 250 : 100})`, { type: 'shipment', id: s.id });
  } else {
    w.score -= 50;
    log(w, 'warn', `${s.id} completed late (−50)`, { type: 'shipment', id: s.id });
  }
}

function stepTrucks(w: World, dt: number, settings: SimSettings) {
  for (const truck of w.trucks) {
    const s = w.shipments.find((x) => x.id === truck.shipmentId);
    switch (truck.status) {
      case 'transit': {
        truck.eta -= dt;
        if (truck.eta <= 0) {
          const slot = freeYardSlot(w);
          if (slot < 0) { truck.eta = 3; break; } // yard full, circle around
          truck.status = 'arriving';
          truck.yardSlot = slot;
          truck.pos = [...GATE] as Vec;
          truck.target = [...YARD_SLOTS[slot]] as Vec;
          if (s && truck.kind === 'outbound') s.stages[2].clock = toClock(w.t);
          log(w, 'info', `${truck.id} arrived at gate${truck.rush ? ' (RUSH)' : ''}`, { type: 'truck', id: truck.id });
        }
        break;
      }
      case 'arriving':
      case 'docking':
      case 'departing': {
        if (!truck.target) break;
        // simple road routing: drive along the road first, then turn in
        const waypoint: Vec =
          truck.status === 'departing' && truck.pos[1] < 11.9 && Math.abs(truck.pos[0] - truck.target[0]) > 0.1
            ? [truck.pos[0], 12]
            : truck.status === 'arriving' && truck.pos[1] > truck.target[1] + 0.1 && Math.abs(truck.pos[0] - truck.target[0]) > 0.1
              ? [truck.target[0], 12]
              : truck.target;
        const m = moveToward(truck.pos, waypoint, TRUCK_SPEED * dt);
        truck.pos = m.pos;
        if (m.heading !== null) truck.heading = m.heading;
        if (m.arrived && waypoint === truck.target) {
          if (truck.status === 'arriving') { truck.status = 'waiting'; truck.waitingSince = w.t; truck.heading = 0; truck.target = null; }
          else if (truck.status === 'docking') {
            truck.status = 'working'; truck.heading = 0; truck.target = null;
            if (s && truck.kind === 'outbound') s.stages[3].clock = toClock(w.t);
            log(w, 'info', `${truck.id} docked · ${truck.kind === 'inbound' ? 'unloading' : 'loading'} started`, { type: 'truck', id: truck.id });
          } else { truck.status = 'departed'; truck.target = null; }
        }
        break;
      }
      case 'waiting': {
        if (settings.autoDock && w.t - truck.waitingSince > AUTO_DOCK_DELAY) {
          const dock = w.docks.find((d) => d.status === 'available' && (d.kind === 'in') === (truck.kind === 'inbound'));
          if (dock) assignTruckToDock(w, truck.id, dock.id);
        }
        break;
      }
      case 'working': {
        if (truck.done >= truck.total && truck.inFlight === 0) {
          finishShipment(w, truck);
          const dock = findDock(w, truck.dockId);
          if (dock) { dock.status = dock.status === 'fault' ? 'fault' : 'available'; dock.truckId = null; }
          truck.dockId = null;
          truck.status = 'departing';
          truck.target = [...EXIT] as Vec;
          for (const f of w.forklifts) if (f.pinnedTruckId === truck.id) f.pinnedTruckId = null;
        }
        break;
      }
    }
  }
  // drop departed trucks (keep their shipments for history)
  w.trucks = w.trucks.filter((t) => t.status !== 'departed');
}

function remaining(t: Truck) {
  return t.total - t.done - t.inFlight;
}

function chooseJob(w: World, f: Forklift, settings: SimSettings): Truck | undefined {
  const working = w.trucks.filter((t) => t.status === 'working' && remaining(t) > 0 && (t.kind === 'inbound' || w.stock > 0));
  if (f.pinnedTruckId) return working.find((t) => t.id === f.pinnedTruckId);
  if (!settings.autoForklift) return undefined;
  // avoid trucks that have a dedicated forklift unless there's spare work
  return working.sort((a, b) => Number(b.rush) - Number(a.rush) || (a.done / a.total) - (b.done / b.total))[0];
}

function stepForklifts(w: World, dt: number, settings: SimSettings) {
  for (const f of w.forklifts) {
    if (f.status === 'idle') {
      const job = chooseJob(w, f, settings);
      if (job) {
        const dock = findDock(w, job.dockId)!;
        job.inFlight += 1;
        f.truckId = job.id;
        f.status = 'toPickup';
        const cell = storageCell(w.stock + Math.floor(Math.random() * 6));
        f.target = job.kind === 'inbound' ? truckPickupPoint(dock) : cell;
        continue;
      }
      // drift home
      if (Math.hypot(f.pos[0] - f.home[0], f.pos[1] - f.home[1]) > 0.05) {
        const m = moveToward(f.pos, f.home, FORKLIFT_SPEED * dt);
        f.pos = m.pos;
        if (m.heading !== null) f.heading = m.heading;
      }
      continue;
    }

    const truck = findTruck(w, f.truckId);
    if (!truck || truck.status !== 'working') {
      // job vanished — abort
      if (truck) truck.inFlight = Math.max(0, truck.inFlight - 1);
      f.status = 'idle'; f.truckId = null; f.carrying = false; f.target = null;
      continue;
    }
    const dock = findDock(w, truck.dockId)!;

    if (f.status === 'handling') {
      if (w.t >= f.busyUntil) {
        if (!f.carrying) {
          // picked up
          f.carrying = true;
          if (truck.kind === 'outbound') w.stock -= 1;
          f.status = 'toDrop';
          f.target = truck.kind === 'inbound' ? storageCell(w.stock + Math.floor(Math.random() * 6)) : truckPickupPoint(dock);
        } else {
          f.carrying = false;
          truck.inFlight -= 1;
          truck.done += 1;
          f.moved += 1;
          if (truck.kind === 'inbound') w.stock += 1;
          if (truck.kind === 'outbound') {
            const s = w.shipments.find((x) => x.id === truck.shipmentId);
            if (s && truck.done === truck.total) s.stages[4].clock = toClock(w.t);
          }
          f.status = 'idle';
          f.truckId = null;
          f.target = null;
        }
      }
      continue;
    }

    if (f.target) {
      const m = moveToward(f.pos, f.target, FORKLIFT_SPEED * dt);
      f.pos = m.pos;
      if (m.heading !== null) f.heading = m.heading;
      if (m.arrived) {
        f.status = 'handling';
        f.busyUntil = w.t + HANDLING;
      }
    }
  }
}

export function step(w: World, dt: number, settings: SimSettings): World {
  if (dt <= 0) return w;
  // sub-step to keep movement stable at 8x
  const n = Math.max(1, Math.ceil(dt / 0.25));
  const h = dt / n;
  for (let i = 0; i < n; i++) {
    w.t += h;

    for (const d of w.docks) {
      if (d.status === 'fault' && w.t >= d.faultUntil) {
        d.status = d.truckId ? 'occupied' : 'available';
        log(w, 'info', `${d.name} repaired and back in service`, { type: 'dock', id: d.id });
      }
    }

    if (w.t >= w.nextSpawn) {
      const kind = Math.random() < 0.72 ? 'inbound' : 'outbound';
      if (w.trucks.length < 8) {
        const t = spawnTruck(w, kind);
        log(w, 'info', `${t.id} dispatched (${kind}, ETA ${fmtEta(t.eta)})`, { type: 'truck', id: t.id });
      }
      w.nextSpawn = w.t + rand(30, 55);
    }
    if (settings.randomEvents && w.t >= w.nextEvent) {
      randomEvent(w);
      w.nextEvent = w.t + rand(40, 75);
    }

    stepTrucks(w, h, settings);
    stepForklifts(w, h, settings);
  }
  return w;
}

export const fmtEta = (simSeconds: number) => `${Math.max(0, Math.round((simSeconds * 10) / 60))} min`;
export { fromClock };

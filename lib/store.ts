'use client';
import { create } from 'zustand';
import {
  assignTruckToDock, cloneWorld, createOrder, deleteOrder, log, pinForklift, repairDock, spawnTruck, startManual, step, stopManual,
  type ActionResult, type OrderInput,
} from './sim/engine';
import { createAllWorlds, WAREHOUSE_IDS } from './sim/seed';
import type { SelectionType, SimSettings, Vec, World } from './sim/types';
import type { Lang } from './i18n';
import type { ParsedOrder } from './orders';

export type DataMode = 'demo' | 'db';
export type CamCmd = { kind: 'zoomIn' | 'zoomOut' | 'rotL' | 'rotR' | 'home' | 'focus'; target?: Vec; n: number };

interface Toast { id: number; ok: boolean; code: string; params?: ActionResult['params'] }

interface State {
  mode: DataMode;
  lang: Lang;
  worlds: Record<string, World>;
  activeId: string;
  world: World; // = worlds[activeId]
  speed: 0 | 1 | 4 | 8;
  settings: SimSettings;
  selected: { type: SelectionType; id: string } | null;
  drag: { truckId: string; pos: Vec | null; hoverDock: string | null } | null;
  driving: string | null; // truck id under manual control
  cam: CamCmd;
  toast: Toast | null;
  ordersOpen: boolean;
  tick: (dt: number) => void;
  drive: (dt: number, input: { throttle: number; steer: number; brake: boolean }) => void;
  setWorld: (w: World) => void;
  setLang: (l: Lang) => void;
  switchWarehouse: (id: string) => void;
  setSpeed: (s: State['speed']) => void;
  toggle: (k: keyof SimSettings) => void;
  select: (type: SelectionType, id: string, focus?: boolean) => void;
  clearSelection: () => void;
  startDrag: (truckId: string) => void;
  updateDrag: (pos: Vec | null, hoverDock: string | null) => void;
  endDrag: (dockId: string | null) => void;
  assign: (truckId: string, dockId: string) => void;
  pin: (forkliftId: string, truckId: string | null) => void;
  repair: (dockId: string) => void;
  triggerRush: () => void;
  addOrder: (o: OrderInput, warehouseId?: string) => void;
  removeOrder: (shipmentId: string) => void;
  importOrders: (orders: ParsedOrder[], replace: boolean) => number;
  startDriving: (truckId: string) => void;
  stopDriving: () => void;
  setOrdersOpen: (v: boolean) => void;
  notify: (ok: boolean, code: string, params?: ActionResult['params']) => void;
  camera: (kind: CamCmd['kind'], target?: Vec) => void;
  reset: () => void;
}

const MODE: DataMode = process.env.NEXT_PUBLIC_DATA_MODE === 'db' ? 'db' : 'demo';
const initialLang = (): Lang => {
  if (typeof window === 'undefined') return 'zh';
  try {
    const s = localStorage.getItem('waretrack.lang');
    if (s === 'zh' || s === 'en') return s;
  } catch {}
  return navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
};

export function positionOf(w: World, type: SelectionType, id: string): Vec | undefined {
  if (type === 'truck') return w.trucks.find((t) => t.id === id)?.pos;
  if (type === 'forklift') return w.forklifts.find((f) => f.id === id)?.pos;
  if (type === 'dock') return w.docks.find((d) => d.id === id)?.pos;
  const s = w.shipments.find((s) => s.id === id);
  return s ? w.trucks.find((t) => t.id === s.truckId)?.pos : undefined;
}

// In DB mode, mutations go to the API and the next poll brings back the authoritative state.
async function post(path: string, body: unknown) {
  const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return r.json().catch(() => ({}));
}

const DRIVE_SPEED = 9; // units per real second
const TURN_RATE = 2.2;
const BOUNDS = { x: [-24, 24], z: [-2.2, 13.5] };

const seedWorlds = createAllWorlds();

export const useSim = create<State>((set, get) => {
  /** mutate the active world */
  const mutate = (fn: (w: World) => void, id = get().activeId) => {
    const w = cloneWorld(get().worlds[id]);
    fn(w);
    set((s) => ({ worlds: { ...s.worlds, [id]: w }, ...(id === s.activeId ? { world: w } : {}) }));
  };
  const notify = (ok: boolean, code: string, params?: ActionResult['params']) => {
    const id = Date.now() + Math.random();
    set({ toast: { id, ok, code, params } });
    setTimeout(() => get().toast?.id === id && set({ toast: null }), 2800);
  };

  return {
    mode: MODE,
    lang: 'zh',
    worlds: seedWorlds,
    activeId: 'WH-04',
    world: seedWorlds['WH-04'],
    speed: 1,
    settings: { autoDock: true, autoForklift: true, randomEvents: true, autoSpawn: true },
    selected: { type: 'truck', id: 'TRK-2205' },
    drag: null,
    driving: null,
    cam: { kind: 'home', n: 0 },
    toast: null,
    ordersOpen: false,

    tick: (dt) => {
      if (get().mode === 'db') return;
      const { worlds, settings, activeId } = get();
      const next: Record<string, World> = {};
      for (const [id, w0] of Object.entries(worlds)) {
        const w = cloneWorld(w0);
        step(w, dt, settings); // every warehouse keeps running in the background
        next[id] = w;
      }
      set({ worlds: next, world: next[activeId] });
    },

    drive: (dt, input) => {
      const { driving, world, activeId } = get();
      if (!driving) return;
      const t = world.trucks.find((x) => x.id === driving);
      if (!t || !t.manual) { set({ driving: null }); return; }
      const v = input.brake ? 0 : input.throttle * DRIVE_SPEED;
      // reverse steering when backing up, like a real vehicle
      const heading = t.heading - input.steer * TURN_RATE * dt * (v === 0 ? 0 : Math.sign(v));
      let x = t.pos[0] + Math.sin(heading) * v * dt;
      let z = t.pos[1] + Math.cos(heading) * v * dt;
      x = Math.max(BOUNDS.x[0], Math.min(BOUNDS.x[1], x));
      z = Math.max(BOUNDS.z[0], Math.min(BOUNDS.z[1], z));
      if (v === 0 && heading === t.heading) return;
      const truck = { ...t, pos: [x, z] as Vec, heading };
      const w = { ...world, trucks: world.trucks.map((y) => (y.id === t.id ? truck : y)) };
      set((s) => ({ world: w, worlds: { ...s.worlds, [activeId]: w } }));
    },

    setWorld: (world) => set((s) => ({ world, worlds: { ...s.worlds, [world.warehouse.id]: world } })),
    setLang: (lang) => {
      try { localStorage.setItem('waretrack.lang', lang); } catch {}
      set({ lang });
    },
    switchWarehouse: (id) => {
      if (!get().worlds[id]) return;
      if (get().driving) get().stopDriving();
      set((s) => ({ activeId: id, world: s.worlds[id], selected: null, drag: null }));
      get().camera('home');
    },
    setSpeed: (speed) => set({ speed }),
    toggle: (k) => set((s) => ({ settings: { ...s.settings, [k]: !s.settings[k] } })),
    select: (type, id, focus) => {
      set({ selected: { type, id } });
      const p = positionOf(get().world, type, id);
      if (focus && p) get().camera('focus', p);
    },
    clearSelection: () => set({ selected: null }),
    startDrag: (truckId) => set({ drag: { truckId, pos: null, hoverDock: null }, selected: { type: 'truck', id: truckId } }),
    updateDrag: (pos, hoverDock) => {
      const d = get().drag;
      if (d) set({ drag: { ...d, pos: pos ?? d.pos, hoverDock } });
    },
    endDrag: (dockId) => {
      const d = get().drag;
      set({ drag: null });
      if (d && dockId) get().assign(d.truckId, dockId);
    },
    assign: (truckId, dockId) => {
      if (get().mode === 'db') {
        post('/api/assign', { truckId, dockId }).then((r) => notify(!!r.ok, r.code ?? 'errBadRequest', r.params));
        return;
      }
      let res: ActionResult = { ok: false, code: 'errUnknown' };
      mutate((w) => { res = assignTruckToDock(w, truckId, dockId); if (res.ok) w.score += 5; });
      notify(res.ok, res.code, res.params);
    },
    pin: (forkliftId, truckId) => get().mode === 'db'
      ? void post('/api/assign', { forkliftId, truckId })
      : mutate((w) => pinForklift(w, forkliftId, truckId)),
    repair: (dockId) => get().mode === 'db'
      ? void post('/api/assign', { repairDockId: dockId })
      : mutate((w) => repairDock(w, dockId)),
    triggerRush: () => mutate((w) => {
      const t = spawnTruck(w, 'outbound', { rush: true, eta: 8, source: 'rush' });
      log(w, 'rush', 'rush', { truck: t.id, n: t.total }, { type: 'truck', id: t.id });
    }),

    addOrder: (o, warehouseId) => {
      const id = warehouseId ?? get().activeId;
      let truckId = '', shipId = '';
      mutate((w) => {
        const t = createOrder(w, o);
        truckId = t.id; shipId = t.shipmentId;
        log(w, o.rush ? 'rush' : 'info', 'orderAdded', { ship: shipId, truck: truckId }, { type: 'shipment', id: shipId });
      }, id);
      notify(true, 'orderAdded', { ship: shipId, truck: truckId });
    },
    removeOrder: (shipmentId) => {
      if (get().driving && get().world.trucks.find((t) => t.id === get().driving)?.shipmentId === shipmentId) set({ driving: null });
      mutate((w) => { deleteOrder(w, shipmentId); });
      const sel = get().selected;
      if (sel && (sel.id === shipmentId || !positionOf(get().world, sel.type, sel.id) && sel.type !== 'shipment')) set({ selected: null });
      notify(true, 'orderDeleted', { ship: shipmentId });
    },
    importOrders: (orders, replace) => {
      const byWh: Record<string, ParsedOrder[]> = {};
      for (const o of orders) {
        const id = o.warehouseId && get().worlds[o.warehouseId] ? o.warehouseId : get().activeId;
        (byWh[id] ??= []).push(o);
      }
      if (replace) set((s) => ({ settings: { ...s.settings, autoSpawn: false }, driving: null }));
      for (const [id, list] of Object.entries(byWh)) {
        mutate((w) => {
          if (replace) {
            // clear queued/in-yard orders; keep trucks already working at a dock
            for (const s of [...w.shipments]) {
              const t = w.trucks.find((x) => x.id === s.truckId);
              if (s.completedAt === null && (!t || ['transit', 'arriving', 'waiting'].includes(t.status))) deleteOrder(w, s.id);
            }
            w.events = w.events.filter((e) => e.code !== 'orderDeleted');
          }
          for (const o of list) createOrder(w, o);
          log(w, 'info', 'importEv', { n: list.length });
        }, id);
      }
      notify(true, 'imported', { n: orders.length });
      return orders.length;
    },

    startDriving: (truckId) => {
      let ok = false;
      mutate((w) => { ok = startManual(w, truckId); });
      if (!ok) { notify(false, 'cantDrive'); return; }
      set({ driving: truckId, selected: { type: 'truck', id: truckId } });
      const p = positionOf(get().world, 'truck', truckId);
      if (p) get().camera('focus', p);
      notify(true, 'driveStart', { truck: truckId });
    },
    stopDriving: () => {
      const id = get().driving;
      if (!id) return;
      let res: ActionResult = { ok: true, code: 'driveParked' };
      mutate((w) => { res = stopManual(w, id); });
      set({ driving: null });
      notify(res.ok, res.code, res.params);
    },
    setOrdersOpen: (ordersOpen) => set({ ordersOpen }),
    notify,
    camera: (kind, target) => set((s) => ({ cam: { kind, target, n: s.cam.n + 1 } })),
    reset: () => {
      const worlds = createAllWorlds();
      set((s) => ({ worlds, world: worlds[s.activeId], selected: null, drag: null, driving: null,
        settings: { ...s.settings, autoSpawn: true } }));
    },
  };
});

export { WAREHOUSE_IDS };

if (typeof window !== 'undefined') {
  (window as unknown as { __waretrack: typeof useSim }).__waretrack = useSim;
  // restore language after hydration
  queueMicrotask(() => useSim.setState({ lang: initialLang() }));
}

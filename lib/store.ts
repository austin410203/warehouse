'use client';
import { create } from 'zustand';
import { assignTruckToDock, cloneWorld, pinForklift, repairDock, spawnTruck, step, log } from './sim/engine';
import { createSeedWorld } from './sim/seed';
import type { SelectionType, SimSettings, Vec, World } from './sim/types';

export type DataMode = 'demo' | 'db';
export type CamCmd = { kind: 'zoomIn' | 'zoomOut' | 'rotL' | 'rotR' | 'home' | 'focus'; target?: Vec; n: number };

interface Toast { id: number; ok: boolean; msg: string }

interface State {
  mode: DataMode;
  world: World;
  speed: 0 | 1 | 4 | 8;
  settings: SimSettings;
  selected: { type: SelectionType; id: string } | null;
  drag: { truckId: string; pos: Vec | null; hoverDock: string | null } | null;
  cam: CamCmd;
  toast: Toast | null;
  tick: (dt: number) => void;
  setWorld: (w: World) => void;
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
  camera: (kind: CamCmd['kind'], target?: Vec) => void;
  reset: () => void;
}

const MODE: DataMode = process.env.NEXT_PUBLIC_DATA_MODE === 'db' ? 'db' : 'demo';

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

export const useSim = create<State>((set, get) => {
  const mutate = (fn: (w: World) => void) => {
    const w = cloneWorld(get().world);
    fn(w);
    set({ world: w });
  };
  const showToast = (ok: boolean, msg: string) => {
    const id = Date.now();
    set({ toast: { id, ok, msg } });
    setTimeout(() => get().toast?.id === id && set({ toast: null }), 2600);
  };

  return {
    mode: MODE,
    world: createSeedWorld(),
    speed: 1,
    settings: { autoDock: true, autoForklift: true, randomEvents: true },
    selected: { type: 'truck', id: 'TRK-2205' },
    drag: null,
    cam: { kind: 'home', n: 0 },
    toast: null,

    tick: (dt) => {
      if (get().mode === 'db') return;
      const w = cloneWorld(get().world);
      step(w, dt, get().settings);
      set({ world: w });
    },
    setWorld: (world) => set({ world }),
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
        post('/api/assign', { truckId, dockId }).then((r) => showToast(!!r.ok, r.msg ?? 'Request sent'));
        return;
      }
      let res = { ok: false, msg: '' };
      mutate((w) => { res = assignTruckToDock(w, truckId, dockId); if (res.ok) w.score += 5; });
      showToast(res.ok, res.msg);
    },
    pin: (forkliftId, truckId) => get().mode === 'db'
      ? void post('/api/assign', { forkliftId, truckId })
      : mutate((w) => pinForklift(w, forkliftId, truckId)),
    repair: (dockId) => get().mode === 'db'
      ? void post('/api/assign', { repairDockId: dockId })
      : mutate((w) => repairDock(w, dockId)),
    triggerRush: () => mutate((w) => {
      const t = spawnTruck(w, 'outbound', { rush: true, eta: 8 });
      log(w, 'rush', `Rush order! ${t.id} (outbound, ${t.total} pallets) inserted`, { type: 'truck', id: t.id });
    }),
    camera: (kind, target) => set((s) => ({ cam: { kind, target, n: s.cam.n + 1 } })),
    reset: () => set({ world: createSeedWorld(), selected: null, drag: null }),
  };
});

if (typeof window !== 'undefined') (window as unknown as { __waretrack: typeof useSim }).__waretrack = useSim;

'use client';
import { useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  AlertTriangle, Bell, Boxes, Check, ChevronDown, ChevronRight, Clock, Crosshair, ExternalLink, FileText, Gauge, Home,
  Minus, Package, Pause, Play, Plus, RotateCcw, RotateCw, Search, Truck as TruckIcon, Warehouse, X, Zap, Forklift as ForkliftIcon,
} from 'lucide-react';
import { positionOf, useSim } from '@/lib/store';
import { fmtClock, toClock } from '@/lib/sim/layout';
import { fmtEta } from '@/lib/sim/engine';
import type { Dock, Forklift, GameEvent, Shipment, Truck, World } from '@/lib/sim/types';

const card = 'rounded-2xl bg-white/95 shadow-[0_8px_30px_rgba(31,79,214,0.10)] ring-1 ring-slate-200/70 backdrop-blur';

export const truckState = (t: Truck) =>
  t.status === 'working' ? (t.kind === 'inbound' ? 'Unloading' : 'Loading')
    : ({ transit: 'In transit', arriving: 'Arriving', waiting: 'Waiting', docking: 'Docking', departing: 'Departing', departed: 'Departed' } as const)[t.status];

function Badge({ tone, children }: { tone: 'green' | 'blue' | 'gray' | 'red' | 'amber'; children: React.ReactNode }) {
  return (
    <span className={clsx('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold', {
      'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200': tone === 'green',
      'bg-blue-50 text-blue-600 ring-1 ring-blue-200': tone === 'blue',
      'bg-slate-100 text-slate-500 ring-1 ring-slate-200': tone === 'gray',
      'bg-red-50 text-red-600 ring-1 ring-red-200': tone === 'red',
      'bg-amber-50 text-amber-700 ring-1 ring-amber-200': tone === 'amber',
    })}>{children}</span>
  );
}
const truckTone = (t: Truck) => (t.status === 'working' ? 'green' : t.status === 'waiting' ? 'amber' : t.status === 'transit' && t.delayed ? 'red' : 'blue');

// ───────────────────────── Top bar ─────────────────────────

function SearchBox() {
  const world = useSim((s) => s.world);
  const select = useSim((s) => s.select);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return [];
    const r: { type: 'truck' | 'forklift' | 'dock' | 'shipment'; id: string; label: string; sub: string }[] = [];
    world.trucks.forEach((t) => (t.id + t.plate + t.driver).toLowerCase().includes(k) && r.push({ type: 'truck', id: t.id, label: t.id, sub: `${t.driver} · ${truckState(t)}` }));
    world.forklifts.forEach((f) => (f.id + f.name).toLowerCase().includes(k) && r.push({ type: 'forklift', id: f.id, label: f.id, sub: f.status }));
    world.docks.forEach((d) => (d.id + d.name).toLowerCase().includes(k) && r.push({ type: 'dock', id: d.id, label: d.name, sub: d.status }));
    world.shipments.forEach((s) => (s.id + s.customer).toLowerCase().includes(k) && r.push({ type: 'shipment', id: s.id, label: `#${s.id}`, sub: s.customer }));
    return r.slice(0, 7);
  }, [q, world]);
  const go = (r: (typeof results)[number]) => { select(r.type, r.id, true); setQ(''); setOpen(false); };
  return (
    <div className="relative w-full max-w-md">
      <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
        <Search className="h-4 w-4 text-slate-400" />
        <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onKeyDown={(e) => e.key === 'Enter' && results[0] && go(results[0])}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search trucks, forklifts, docks, shipments…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
        <kbd className="rounded border border-slate-200 px-1.5 text-[10px] text-slate-400">↵</kbd>
      </div>
      {open && results.length > 0 && (
        <div className={clsx(card, 'absolute left-0 right-0 top-12 z-50 overflow-hidden p-1')}>
          {results.map((r) => (
            <button key={r.type + r.id} onMouseDown={() => go(r)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-blue-50">
              <span className="font-semibold text-slate-700">{r.label}</span>
              <span className="text-xs text-slate-400">{r.type} · {r.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EventBell() {
  const events = useSim((s) => s.world.events);
  const select = useSim((s) => s.select);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(0);
  const unread = events.filter((e) => e.id > seen && e.kind !== 'info').length;
  return (
    <div className="relative">
      <button onClick={() => { setOpen(!open); setSeen(events[0]?.id ?? 0); }} className="relative rounded-xl p-2 hover:bg-slate-100">
        <Bell className="h-5 w-5 text-slate-600" />
        {unread > 0 && <span className="absolute right-1 top-1 h-4 min-w-4 rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white">{unread}</span>}
      </button>
      {open && (
        <div className={clsx(card, 'absolute right-0 top-12 z-50 max-h-96 w-80 overflow-auto p-2')}>
          <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Event log</div>
          {events.map((e) => <EventRow key={e.id} e={e} onClick={() => e.ref && select(e.ref.type, e.ref.id, true)} />)}
        </div>
      )}
    </div>
  );
}

function EventRow({ e, onClick }: { e: GameEvent; onClick?: () => void }) {
  const Icon = { rush: Zap, fault: AlertTriangle, delay: Clock, info: FileText, success: Check, warn: AlertTriangle }[e.kind];
  return (
    <button onClick={onClick} className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50">
      <Icon className={clsx('mt-0.5 h-3.5 w-3.5 shrink-0', {
        'text-red-500': e.kind === 'rush' || e.kind === 'fault' || e.kind === 'warn', 'text-amber-500': e.kind === 'delay',
        'text-emerald-500': e.kind === 'success', 'text-slate-400': e.kind === 'info' })} />
      <span className="flex-1 text-xs text-slate-600">{e.msg}</span>
      <span className="text-[10px] text-slate-400">{fmtClock(toClock(e.t))}</span>
    </button>
  );
}

export function TopBar() {
  const w = useSim((s) => s.world);
  const mode = useSim((s) => s.mode);
  const speed = useSim((s) => s.speed);
  const setSpeed = useSim((s) => s.setSpeed);
  const settings = useSim((s) => s.settings);
  const toggle = useSim((s) => s.toggle);
  const docked = w.docks.filter((d) => d.status === 'occupied').length;
  const pct = Math.round((w.stock / w.warehouse.capacity) * 100);
  return (
    <header className="pointer-events-auto flex items-center gap-3 border-b border-slate-200/70 bg-white/90 px-5 py-2.5 backdrop-blur">
      <div className="flex items-center gap-2 pr-4">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[#4f86ff] to-[#1f4fd6] text-white shadow"><Boxes className="h-5 w-5" /></div>
        <span className="text-xl font-bold tracking-tight text-slate-900">WareTrack</span>
      </div>
      <SearchBox />
      <div className="ml-auto flex items-center gap-2 rounded-xl px-2 py-1 ring-1 ring-slate-200">
        <span className="rounded-md bg-[#2f6bff] px-1.5 py-1 text-xs font-bold text-white">{w.warehouse.id}</span>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-slate-800">{w.warehouse.name}</div>
          <div className="text-[11px] text-slate-500">{pct}% full · {docked}/{w.docks.length} docked</div>
        </div>
      </div>
      {/* time controls */}
      <div className="flex items-center gap-0.5 rounded-xl bg-slate-100 p-1">
        <button title="Pause" onClick={() => setSpeed(0)} className={clsx('rounded-lg p-1.5', speed === 0 ? 'bg-white shadow text-[#1f4fd6]' : 'text-slate-500')}><Pause className="h-3.5 w-3.5" /></button>
        {([1, 4, 8] as const).map((s) => (
          <button key={s} onClick={() => setSpeed(s)} className={clsx('rounded-lg px-2 py-1 text-xs font-bold', speed === s ? 'bg-white shadow text-[#1f4fd6]' : 'text-slate-500')}>{s}x</button>
        ))}
      </div>
      <div className={clsx('flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold', mode === 'db' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700')}>
        <span className={clsx('h-2 w-2 rounded-full', speed === 0 ? 'bg-slate-400' : 'animate-pulse bg-emerald-500')} />
        {mode === 'db' ? 'Live' : 'Demo'} {fmtClock(toClock(w.t))}
      </div>
      <details className="relative">
        <summary className="flex cursor-pointer list-none items-center gap-1 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">
          <Gauge className="h-4 w-4" /> Sim <ChevronDown className="h-3 w-3" />
        </summary>
        <div className={clsx(card, 'absolute right-0 top-10 z-50 w-56 space-y-1 p-3 text-sm')}>
          {([['autoDock', 'Auto-assign docks'], ['autoForklift', 'Auto-dispatch forklifts'], ['randomEvents', 'Random events']] as const).map(([k, l]) => (
            <label key={k} className="flex cursor-pointer items-center justify-between rounded-lg px-1 py-1 hover:bg-slate-50">
              <span className="text-slate-700">{l}</span>
              <input type="checkbox" checked={settings[k]} onChange={() => toggle(k)} className="accent-[#2f6bff]" />
            </label>
          ))}
          <div className="flex gap-2 pt-2">
            <button onClick={() => useSim.getState().triggerRush()} className="flex-1 rounded-lg bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100">+ Rush order</button>
            <button onClick={() => useSim.getState().reset()} className="flex-1 rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200">Reset</button>
          </div>
        </div>
      </details>
      <EventBell />
      <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-orange-400 text-sm font-bold text-white">AC</div>
        <div className="hidden leading-tight xl:block">
          <div className="text-sm font-semibold text-slate-800">Alex Chen</div>
          <div className="text-[11px] text-slate-500">Operations Manager</div>
        </div>
      </div>
    </header>
  );
}

// ───────────────────────── KPI cards ─────────────────────────

function Kpi({ icon, title, value, delta, sub, good = true }: { icon: React.ReactNode; title: string; value: string; delta?: string; sub: string; good?: boolean }) {
  return (
    <div className={clsx(card, 'flex min-w-[210px] items-center gap-3 px-4 py-3')}>
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-[#2f6bff]">{icon}</div>
      <div>
        <div className="text-xs font-medium text-slate-500">{title}</div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900 tabular-nums">{value}</span>
          {delta && <span className={clsx('text-xs font-semibold', good ? 'text-emerald-600' : 'text-red-500')}>{delta}</span>}
        </div>
        <div className="text-[11px] text-slate-400">{sub}</div>
      </div>
    </div>
  );
}

export function KpiRow() {
  const w = useSim((s) => s.world);
  const onSite = w.trucks.filter((t) => t.status !== 'transit').length;
  const inbound = w.trucks.filter((t) => t.status !== 'transit' && t.kind === 'inbound').length;
  const ontime = w.completed ? (w.onTimeCount / w.completed) * 100 : 100;
  const util = (w.docks.filter((d) => d.status === 'occupied').length / w.docks.length) * 100;
  const d = w.stock - w.stockStart;
  return (
    <div className="pointer-events-auto flex flex-wrap gap-3">
      <Kpi icon={<Package className="h-5 w-5" />} title="Stock on hand" value={String(w.stock)} delta={`${d >= 0 ? '↑' : '↓'} ${d >= 0 ? '+' : ''}${d}`} good={d >= 0} sub={`pallets · ${w.warehouse.id}`} />
      <Kpi icon={<TruckIcon className="h-5 w-5" />} title="Trucks on site" value={String(onSite)} sub={`${inbound} inbound · ${w.trucks.filter((t) => t.status === 'transit').length} en route`} />
      <Kpi icon={<Clock className="h-5 w-5" />} title="On-time delivery" value={`${ontime.toFixed(1)}%`} sub={`${w.onTimeCount}/${w.completed} shipments`} good={ontime >= 95} delta={ontime >= 95 ? '● on target' : '● below 95%'} />
      <Kpi icon={<Warehouse className="h-5 w-5" />} title="Dock utilization" value={`${util.toFixed(0)}%`} sub={`score ${w.score} pts`} />
    </div>
  );
}

// ───────────────────────── Detail panel ─────────────────────────

function Row({ k, v, link, onClick }: { k: string; v: React.ReactNode; link?: boolean; onClick?: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-500">{k}</span>
      {onClick ? <button onClick={onClick} className={clsx('font-semibold', link ? 'text-[#2f6bff] hover:underline' : 'text-slate-800')}>{v}</button>
        : <span className={clsx('font-semibold', link ? 'text-[#2f6bff]' : 'text-slate-800')}>{v}</span>}
    </div>
  );
}

function Progress({ v, total }: { v: number; total: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500" style={{ width: `${(v / Math.max(1, total)) * 100}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-500 tabular-nums">{v}/{total}</span>
    </div>
  );
}

function TruckDetail({ t, w }: { t: Truck; w: World }) {
  const select = useSim((s) => s.select);
  const assign = useSim((s) => s.assign);
  const ship = w.shipments.find((s) => s.id === t.shipmentId);
  const dock = w.docks.find((d) => d.id === t.dockId);
  const crew = w.forklifts.filter((f) => f.truckId === t.id).length;
  const remainingSim = t.status === 'working' ? ((t.total - t.done) * 14) / Math.max(1, crew) : t.eta;
  const freeDocks = w.docks.filter((d) => d.status === 'available' && (d.kind === 'in') === (t.kind === 'inbound'));
  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <Badge tone={truckTone(t)}>{truckState(t)}</Badge>
        {t.rush && <Badge tone="red">RUSH</Badge>}
        {t.delayed && <Badge tone="red">Delayed</Badge>}
        <span className="text-xs text-slate-500">{w.warehouse.id}{dock ? ` · ${dock.name}` : ''} · {t.done}/{t.total} pallets</span>
      </div>
      <Progress v={t.done} total={t.total} />
      <div className="mt-3">
        {ship && <Row k="Shipment" v={`#${ship.id}`} link onClick={() => select('shipment', ship.id)} />}
        {ship && <Row k="Customer" v={ship.customer} />}
        {ship && <Row k="Destination" v={ship.destination} />}
        <Row k={t.status === 'transit' ? 'ETA' : 'Est. finish'} v={t.status === 'working' ? `Done in ${fmtEta(remainingSim)}` : t.status === 'transit' ? fmtEta(t.eta) : '—'} />
        {ship && <Row k="Due" v={<span className={w.t > ship.dueAt ? 'text-red-500' : ''}>{fmtClock(toClock(ship.dueAt))}</span>} />}
        <Row k="Speed" v={['arriving', 'docking', 'departing'].includes(t.status) ? '18 km/h' : '0 km/h'} />
        <Row k="Bay" v={dock ? `${dock.name} · ${w.warehouse.id}` : t.yardSlot !== null ? `Yard ${t.yardSlot + 1}` : '—'} link={!!dock} onClick={dock ? () => select('dock', dock.id) : undefined} />
        <Row k="Cargo" v={`${t.done}/${t.total} pallets moved · ${t.tons} t`} />
        <Row k="Forklifts" v={`${crew} working`} />
      </div>
      {t.status === 'waiting' && (
        <div className="mt-3 rounded-xl bg-amber-50 p-3">
          <div className="mb-2 text-xs font-semibold text-amber-800">Assign to dock (or drag the truck in 3D)</div>
          <div className="flex flex-wrap gap-2">
            {freeDocks.length ? freeDocks.map((d) => (
              <button key={d.id} onClick={() => assign(t.id, d.id)} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#1f4fd6] ring-1 ring-blue-200 hover:bg-blue-50">{d.name}</button>
            )) : <span className="text-xs text-amber-700">No compatible dock free</span>}
          </div>
        </div>
      )}
    </>
  );
}

function ForkliftDetail({ f, w }: { f: Forklift; w: World }) {
  const pin = useSim((s) => s.pin);
  const working = w.trucks.filter((t) => t.status === 'working');
  const label = { idle: 'Idle', toPickup: 'To pickup', handling: 'Handling', toDrop: 'Delivering', returning: 'Returning' }[f.status];
  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <Badge tone={f.status === 'idle' ? 'gray' : 'green'}>{label}</Badge>
        <Badge tone={f.pinnedTruckId ? 'amber' : 'blue'}>{f.pinnedTruckId ? 'Manual' : 'Auto dispatch'}</Badge>
      </div>
      <Row k="Current task" v={f.truckId ? `${f.carrying ? 'Carrying pallet' : 'Heading to pickup'} · ${f.truckId}` : '—'} />
      <Row k="Pallets moved" v={f.moved} />
      <Row k="Battery" v={`${Math.max(18, 92 - f.moved * 2)}%`} />
      <Row k="Position" v={`${f.pos[0].toFixed(1)}, ${f.pos[1].toFixed(1)}`} />
      <div className="mt-3 rounded-xl bg-slate-50 p-3">
        <div className="mb-2 text-xs font-semibold text-slate-600">Dedicate to truck</div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => pin(f.id, null)} className={clsx('rounded-lg px-3 py-1.5 text-xs font-semibold ring-1', !f.pinnedTruckId ? 'bg-[#2f6bff] text-white ring-[#2f6bff]' : 'bg-white text-slate-600 ring-slate-200')}>Auto</button>
          {working.map((t) => (
            <button key={t.id} onClick={() => pin(f.id, t.id)} className={clsx('rounded-lg px-3 py-1.5 text-xs font-semibold ring-1', f.pinnedTruckId === t.id ? 'bg-[#2f6bff] text-white ring-[#2f6bff]' : 'bg-white text-slate-600 ring-slate-200')}>{t.id}</button>
          ))}
        </div>
      </div>
    </>
  );
}

function DockDetail({ d, w }: { d: Dock; w: World }) {
  const select = useSim((s) => s.select);
  const assign = useSim((s) => s.assign);
  const repair = useSim((s) => s.repair);
  const t = w.trucks.find((x) => x.id === d.truckId);
  const waiting = w.trucks.filter((x) => x.status === 'waiting' && (x.kind === 'inbound') === (d.kind === 'in'));
  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <Badge tone={d.status === 'fault' ? 'red' : d.status === 'occupied' ? 'green' : 'gray'}>{d.status === 'fault' ? 'Out of service' : d.status === 'occupied' ? 'Occupied' : 'Available'}</Badge>
        <span className="text-xs text-slate-500">{d.kind === 'in' ? 'Inbound' : 'Outbound'} dock · {w.warehouse.id}</span>
      </div>
      <Row k="Truck" v={t ? t.id : 'No truck assigned'} link={!!t} onClick={t ? () => select('truck', t.id, true) : undefined} />
      {t && <Row k="Progress" v={`${t.done}/${t.total} pallets`} />}
      {d.status === 'fault' && <Row k="Back in service" v={fmtClock(toClock(d.faultUntil))} />}
      {d.status === 'fault' && (
        <button onClick={() => repair(d.id)} className="mt-3 w-full rounded-xl bg-red-500 py-2 text-sm font-semibold text-white hover:bg-red-600">Dispatch maintenance (−20 pts)</button>
      )}
      {d.status === 'available' && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3">
          <div className="mb-2 text-xs font-semibold text-slate-600">Assign a waiting truck</div>
          <div className="flex flex-wrap gap-2">
            {waiting.length ? waiting.map((x) => (
              <button key={x.id} onClick={() => assign(x.id, d.id)} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#1f4fd6] ring-1 ring-blue-200 hover:bg-blue-50">{x.id}{x.rush ? ' ⚡' : ''}</button>
            )) : <span className="text-xs text-slate-400">No compatible truck waiting</span>}
          </div>
        </div>
      )}
    </>
  );
}

function ShipmentDetail({ s, w }: { s: Shipment; w: World }) {
  const select = useSim((st) => st.select);
  const t = w.trucks.find((x) => x.id === s.truckId);
  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <Badge tone={s.completedAt !== null ? (s.onTime ? 'green' : 'red') : 'blue'}>{s.completedAt !== null ? (s.onTime ? 'Delivered on time' : 'Delivered late') : 'In progress'}</Badge>
      </div>
      <Row k="Customer" v={s.customer} />
      <Row k="Type" v={s.kind} />
      <Row k="Destination" v={s.destination} />
      <Row k="Truck" v={s.truckId} link={!!t} onClick={t ? () => select('truck', t.id, true) : undefined} />
      <Row k="Due" v={fmtClock(toClock(s.dueAt))} />
      {s.stages.map((st) => <Row key={st.label} k={st.label} v={st.clock !== null ? fmtClock(st.clock) : '—'} />)}
    </>
  );
}

export function DetailPanel() {
  const sel = useSim((s) => s.selected);
  const w = useSim((s) => s.world);
  const clear = useSim((s) => s.clearSelection);
  const camera = useSim((s) => s.camera);
  if (!sel) return null;
  let title = '', kicker = '', sub = '', body: React.ReactNode = null, icon: React.ReactNode = <TruckIcon className="h-6 w-6" />;
  if (sel.type === 'truck') {
    const t = w.trucks.find((x) => x.id === sel.id);
    if (!t) return null;
    title = t.id; kicker = t.carrier; sub = `${t.driver} · ${t.plate}`; body = <TruckDetail t={t} w={w} />;
  } else if (sel.type === 'forklift') {
    const f = w.forklifts.find((x) => x.id === sel.id);
    if (!f) return null;
    title = f.id; kicker = 'Forklift'; sub = f.name; body = <ForkliftDetail f={f} w={w} />; icon = <ForkliftIcon className="h-6 w-6" />;
  } else if (sel.type === 'dock') {
    const d = w.docks.find((x) => x.id === sel.id);
    if (!d) return null;
    title = d.name; kicker = 'Loading dock'; sub = `${w.warehouse.id} ${w.warehouse.name}`; body = <DockDetail d={d} w={w} />; icon = <Warehouse className="h-6 w-6" />;
  } else {
    const s = w.shipments.find((x) => x.id === sel.id);
    if (!s) return null;
    title = `#${s.id}`; kicker = 'Shipment'; sub = s.customer; body = <ShipmentDetail s={s} w={w} />; icon = <Package className="h-6 w-6" />;
  }
  const pos = positionOf(w, sel.type, sel.id);
  return (
    <aside className={clsx(card, 'pointer-events-auto w-[360px] p-4')}>
      <div className="mb-3 flex items-start gap-3 border-b border-slate-100 pb-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-[#2f6bff]">{icon}</div>
        <div className="flex-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#2f6bff]">{kicker}</div>
          <div className="text-lg font-bold leading-tight text-slate-900">{title}</div>
          <div className="text-xs text-slate-500">{sub}</div>
        </div>
        <div className="flex gap-1">
          <button title="Focus" disabled={!pos} onClick={() => pos && camera('focus', pos)} className="rounded-lg p-1.5 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40"><Crosshair className="h-4 w-4 text-slate-600" /></button>
          <button title="Open" className="rounded-lg p-1.5 ring-1 ring-slate-200 hover:bg-slate-50"><ExternalLink className="h-4 w-4 text-slate-600" /></button>
          <button title="Close" onClick={clear} className="rounded-lg p-1.5 ring-1 ring-slate-200 hover:bg-slate-50"><X className="h-4 w-4 text-slate-600" /></button>
        </div>
      </div>
      {body}
    </aside>
  );
}

// ───────────────────────── Shipment timeline ─────────────────────────

export function ShipmentTimeline() {
  const w = useSim((s) => s.world);
  const sel = useSim((s) => s.selected);
  const select = useSim((s) => s.select);
  let truck: Truck | undefined;
  if (sel?.type === 'truck') truck = w.trucks.find((t) => t.id === sel.id);
  if (sel?.type === 'shipment') truck = w.trucks.find((t) => t.shipmentId === sel.id);
  if (sel?.type === 'dock') truck = w.trucks.find((t) => t.dockId === sel.id);
  truck ??= w.trucks.find((t) => t.status === 'working') ?? w.trucks[0];
  const ship = truck ? w.shipments.find((s) => s.id === truck!.shipmentId) : sel?.type === 'shipment' ? w.shipments.find((s) => s.id === sel.id) : undefined;
  if (!ship) return null;
  const icons = [FileText, Package, Boxes, TruckIcon, Check];
  const active = ship.stages.findIndex((s) => s.clock === null);
  const cur = active === -1 ? ship.stages.length : active;
  return (
    <div className={clsx(card, 'pointer-events-auto flex items-stretch gap-4 p-4')}>
      <div className="flex-1">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-base font-bold text-slate-900"><TruckIcon className="h-5 w-5 text-[#2f6bff]" /> Shipment Tracking</div>
          <div className="text-xs text-slate-500">{ship.truckId} · {truck?.carrier ?? 'WareTrack'}</div>
        </div>
        <div className="relative flex justify-between px-4">
          <div className="absolute left-10 right-10 top-4 h-1 rounded bg-slate-200" />
          <div className="absolute left-10 top-4 h-1 rounded bg-[#2f6bff] transition-all duration-700" style={{ width: `calc(${(Math.min(cur, ship.stages.length - 1) / (ship.stages.length - 1)) * 100}% - ${(Math.min(cur, ship.stages.length - 1) / (ship.stages.length - 1)) * 80}px)` }} />
          {ship.stages.map((s, i) => {
            const Icon = icons[i];
            const done = s.clock !== null;
            const isCur = i === cur;
            const label = isCur && truck && truck.status === 'working' ? `${s.label} ${truck.done}/${truck.total}` : s.label;
            return (
              <div key={s.label} className="relative z-10 flex w-24 flex-col items-center text-center">
                <div className={clsx('grid h-9 w-9 place-items-center rounded-full ring-4 ring-white transition',
                  done ? 'bg-[#2f6bff] text-white' : isCur ? 'animate-pulse bg-[#2f6bff] text-white shadow-[0_0_0_6px_rgba(47,107,255,0.18)]' : 'bg-slate-200 text-slate-400')}>
                  {done && i === ship.stages.length - 1 ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-700">{label}</div>
                <div className="text-[10px] text-slate-400">{done ? fmtClock(s.clock!) : isCur ? `ETA ${fmtClock(toClock(ship.dueAt))}` : '—'}</div>
              </div>
            );
          })}
        </div>
      </div>
      <button onClick={() => select('shipment', ship.id)} className="flex w-64 items-center gap-3 rounded-xl bg-slate-50 p-3 text-left ring-1 ring-slate-200 hover:bg-blue-50">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white text-[#2f6bff] ring-1 ring-slate-200"><TruckIcon className="h-6 w-6" /></div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-slate-900">#{ship.id}</div>
          <div className="truncate text-xs text-slate-500">To: {ship.destination}</div>
          {truck && <div className="mt-1"><Badge tone={truckTone(truck)}>{truckState(truck)}</Badge></div>}
          <div className="mt-1 text-[11px] text-slate-500">{ship.customer}</div>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-400" />
      </button>
    </div>
  );
}

// ───────────────────────── Dock list (HTML drag & drop) ─────────────────────────

export function DockList() {
  const w = useSim((s) => s.world);
  const select = useSim((s) => s.select);
  const assign = useSim((s) => s.assign);
  const [tab, setTab] = useState<'docks' | 'forklifts' | 'trucks'>('docks');
  const [over, setOver] = useState<string | null>(null);
  const busyF = w.forklifts.filter((f) => f.status !== 'idle').length;
  const occupied = w.docks.filter((d) => d.status === 'occupied').length;
  return (
    <div className={clsx(card, 'pointer-events-auto w-[440px] p-3')}>
      <div className="mb-2 flex items-center gap-1">
        {([['docks', `Docks`, `${occupied}/${w.docks.length}`], ['forklifts', 'Forklifts', `${busyF}/${w.forklifts.length}`], ['trucks', 'Trucks', `${w.trucks.length}`]] as const).map(([k, l, n]) => (
          <button key={k} onClick={() => setTab(k)} className={clsx('rounded-lg px-3 py-1.5 text-sm font-semibold', tab === k ? 'bg-white text-slate-900 shadow ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700')}>
            {l} <span className="text-[#2f6bff]">{n}</span>
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400">{w.warehouse.name}</span>
      </div>
      <div className="max-h-52 overflow-auto">
        {tab === 'docks' && w.docks.map((d) => {
          const t = w.trucks.find((x) => x.id === d.truckId);
          return (
            <div key={d.id} onClick={() => select('dock', d.id, true)}
              onDragOver={(e) => { e.preventDefault(); setOver(d.id); }} onDragLeave={() => setOver(null)}
              onDrop={(e) => { e.preventDefault(); setOver(null); assign(e.dataTransfer.getData('text/truck'), d.id); }}
              className={clsx('flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50', over === d.id && 'bg-blue-50 ring-2 ring-[#2f6bff]')}>
              <div className="w-12 leading-tight"><div className="text-sm font-bold text-slate-800">{d.name}</div><div className="text-[10px] text-slate-400">{w.warehouse.id}</div></div>
              <div className="flex-1 truncate text-sm text-slate-600">{t ? <><span className="mr-1 text-[#2f6bff]">●</span>{t.id} · {t.carrier.split(' ')[0]}</> : d.status === 'fault' ? 'Door fault' : 'No truck assigned'}</div>
              <Badge tone={d.status === 'fault' ? 'red' : t ? (t.status === 'working' ? 'green' : 'blue') : 'gray'}>{d.status === 'fault' ? 'Fault' : t ? truckState(t) : 'Available'}</Badge>
              {t && <div className="w-12"><div className="h-1 rounded bg-slate-100"><div className="h-1 rounded bg-emerald-500" style={{ width: `${(t.done / t.total) * 100}%` }} /></div><div className="text-[10px] text-slate-500">{t.done}/{t.total}</div></div>}
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </div>
          );
        })}
        {tab === 'forklifts' && w.forklifts.map((f) => (
          <div key={f.id} onClick={() => select('forklift', f.id, true)} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
            <ForkliftIcon className="h-4 w-4 text-amber-500" />
            <div className="w-14 text-sm font-bold text-slate-800">{f.id}</div>
            <div className="flex-1 text-sm text-slate-600">{f.truckId ? `${f.carrying ? 'Carrying' : 'Fetching'} · ${f.truckId}` : 'Idle'}</div>
            {f.pinnedTruckId && <Badge tone="amber">Manual</Badge>}
            <Badge tone={f.status === 'idle' ? 'gray' : 'green'}>{f.status === 'idle' ? 'Idle' : 'Busy'}</Badge>
          </div>
        ))}
        {tab === 'trucks' && w.trucks.map((t) => (
          <div key={t.id} draggable={t.status === 'waiting'} onDragStart={(e) => e.dataTransfer.setData('text/truck', t.id)}
            onClick={() => select('truck', t.id, t.status !== 'transit')}
            className={clsx('flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50', t.status === 'waiting' ? 'cursor-grab' : 'cursor-pointer')}>
            <TruckIcon className={clsx('h-4 w-4', t.kind === 'inbound' ? 'text-[#2f6bff]' : 'text-emerald-600')} />
            <div className="w-20 text-sm font-bold text-slate-800">{t.id}</div>
            <div className="flex-1 truncate text-xs text-slate-500">{t.kind} · {t.total} pallets{t.status === 'transit' ? ` · ETA ${fmtEta(t.eta)}` : ''}</div>
            {t.rush && <Badge tone="red">RUSH</Badge>}
            <Badge tone={truckTone(t)}>{truckState(t)}</Badge>
          </div>
        ))}
      </div>
      <div className="mt-1 border-t border-slate-100 pt-2 text-[11px] text-slate-400">Tip: drag a waiting truck (3D or Trucks tab) onto a dock to assign it.</div>
    </div>
  );
}

// ───────────────────────── misc overlays ─────────────────────────

export function CameraControls() {
  const camera = useSim((s) => s.camera);
  const b = 'grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100';
  return (
    <div className={clsx(card, 'pointer-events-auto flex flex-col gap-1 p-1')}>
      <button className={b} title="Zoom in" onClick={() => camera('zoomIn')}><Plus className="h-4 w-4" /></button>
      <button className={b} title="Zoom out" onClick={() => camera('zoomOut')}><Minus className="h-4 w-4" /></button>
      <button className={b} title="Rotate left" onClick={() => camera('rotL')}><RotateCcw className="h-4 w-4" /></button>
      <button className={b} title="Rotate right" onClick={() => camera('rotR')}><RotateCw className="h-4 w-4" /></button>
      <button className={b} title="Home" onClick={() => camera('home')}><Home className="h-4 w-4" /></button>
    </div>
  );
}

export function EventFeed() {
  const events = useSim((s) => s.world.events);
  const select = useSim((s) => s.select);
  const recent = events.filter((e) => e.kind !== 'info').slice(0, 3);
  if (!recent.length) return null;
  return (
    <div className="pointer-events-auto w-80 space-y-2">
      {recent.map((e) => (
        <div key={e.id} className={clsx(card, 'overflow-hidden', e.kind === 'rush' || e.kind === 'fault' ? 'ring-red-200' : '')}>
          <EventRow e={e} onClick={() => e.ref && select(e.ref.type, e.ref.id, true)} />
        </div>
      ))}
    </div>
  );
}

export function Toast() {
  const toast = useSim((s) => s.toast);
  if (!toast) return null;
  return (
    <div className={clsx('pointer-events-none absolute left-1/2 top-24 z-50 -translate-x-1/2 rounded-xl px-4 py-2 text-sm font-semibold shadow-lg', toast.ok ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white')}>
      {toast.ok ? '✓ ' : '✕ '}{toast.msg}
    </div>
  );
}

export function PausedBadge() {
  const speed = useSim((s) => s.speed);
  const setSpeed = useSim((s) => s.setSpeed);
  if (speed !== 0) return null;
  return (
    <button onClick={() => setSpeed(1)} className="pointer-events-auto absolute left-1/2 top-24 -translate-x-1/2 rounded-full bg-slate-900/80 px-4 py-2 text-sm font-semibold text-white shadow-lg">
      <Play className="mr-1 inline h-4 w-4" /> Simulation paused — resume
    </button>
  );
}

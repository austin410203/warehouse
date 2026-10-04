'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Bell, Boxes, Check, ChevronDown, ChevronRight, ClipboardList, Clock,
  Crosshair, Download, FileSpreadsheet, FileText, Gamepad2, Gauge, Home, Languages, Minus, Package, Pause, Play, Plus, RotateCcw,
  RotateCw, Search, Trash2, Truck as TruckIcon, Upload, Warehouse, X, Zap, Forklift as ForkliftIcon, Square,
} from 'lucide-react';
import { positionOf, useSim } from '@/lib/store';
import { fmtClock, toClock } from '@/lib/sim/layout';
import { canDrive } from '@/lib/sim/engine';
import { dockName, eventText, translate, type Lang } from '@/lib/i18n';
import { downloadTemplate, parseClock, parseOrdersFile } from '@/lib/orders';
import type { Dock, Forklift, GameEvent, Shipment, Truck, TruckKind, World } from '@/lib/sim/types';

const card = 'rounded-2xl bg-white/95 shadow-[0_8px_30px_rgba(31,79,214,0.10)] ring-1 ring-slate-200/70 backdrop-blur';

export function useT() {
  const lang = useSim((s) => s.lang);
  return useCallback((key: string, params?: Record<string, string | number | boolean>) => translate(lang, key, params), [lang]);
}
const useLang = () => useSim((s) => s.lang);

/** true below Tailwind's md breakpoint (phones, small tablets in portrait) */
export function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return m;
}
const dropdownMobile = 'max-md:fixed max-md:inset-x-2 max-md:top-[104px] max-md:w-auto';
const whName = (w: World, lang: Lang) => (lang === 'zh' && w.warehouse.nameZh ? w.warehouse.nameZh : w.warehouse.name);
const etaMin = (sim: number) => Math.max(0, Math.round((sim * 10) / 60));

export const truckStateKey = (t: Truck) =>
  t.manual ? 'st_manual' : t.status === 'working' ? (t.kind === 'inbound' ? 'st_unloading' : 'st_loading') : `st_${t.status}`;

function Badge({ tone, children }: { tone: 'green' | 'blue' | 'gray' | 'red' | 'amber' | 'violet'; children: React.ReactNode }) {
  return (
    <span className={clsx('inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold', {
      'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200': tone === 'green',
      'bg-blue-50 text-blue-600 ring-1 ring-blue-200': tone === 'blue',
      'bg-slate-100 text-slate-500 ring-1 ring-slate-200': tone === 'gray',
      'bg-red-50 text-red-600 ring-1 ring-red-200': tone === 'red',
      'bg-amber-50 text-amber-700 ring-1 ring-amber-200': tone === 'amber',
      'bg-violet-50 text-violet-700 ring-1 ring-violet-200': tone === 'violet',
    })}>{children}</span>
  );
}
const truckTone = (t: Truck) => (t.manual ? 'violet' : t.status === 'working' ? 'green' : t.status === 'waiting' ? 'amber' : t.status === 'transit' && t.delayed ? 'red' : 'blue');

// ───────────────────────── Top bar ─────────────────────────

function SearchBox() {
  const world = useSim((s) => s.world);
  const select = useSim((s) => s.select);
  const t = useT();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return [];
    const r: { type: 'truck' | 'forklift' | 'dock' | 'shipment'; id: string; label: string; sub: string }[] = [];
    world.trucks.forEach((x) => (x.id + x.plate + x.driver).toLowerCase().includes(k) && r.push({ type: 'truck', id: x.id, label: x.id, sub: `${x.driver} · ${t(truckStateKey(x))}` }));
    world.forklifts.forEach((f) => (f.id + f.name).toLowerCase().includes(k) && r.push({ type: 'forklift', id: f.id, label: f.id, sub: t(`fl_${f.status}`) }));
    world.docks.forEach((d) => (d.id + d.name + dockName('zh', d.name)).toLowerCase().includes(k) && r.push({ type: 'dock', id: d.id, label: dockName(useSim.getState().lang, d.name), sub: t(d.status === 'fault' ? 'faultSt' : d.status) }));
    world.shipments.forEach((s) => (s.id + s.customer).toLowerCase().includes(k) && r.push({ type: 'shipment', id: s.id, label: `#${s.id}`, sub: s.customer }));
    return r.slice(0, 7);
  }, [q, world, t]);
  const go = (r: (typeof results)[number]) => { select(r.type, r.id, true); setQ(''); setOpen(false); };
  return (
    <div className="relative hidden w-full max-w-sm md:block">
      <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
        <Search className="h-4 w-4 text-slate-400" />
        <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onKeyDown={(e) => e.key === 'Enter' && results[0] && go(results[0])}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={t('search')} className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
        <kbd className="rounded border border-slate-200 px-1.5 text-[10px] text-slate-400">↵</kbd>
      </div>
      {open && results.length > 0 && (
        <div className={clsx(card, 'absolute left-0 right-0 top-12 z-50 overflow-hidden p-1')}>
          {results.map((r) => (
            <button key={r.type + r.id} onMouseDown={() => go(r)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-blue-50">
              <span className="font-semibold text-slate-700">{r.label}</span>
              <span className="text-xs text-slate-400">{r.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EventRow({ e, onClick }: { e: GameEvent; onClick?: () => void }) {
  const lang = useLang();
  const Icon = { rush: Zap, fault: AlertTriangle, delay: Clock, info: FileText, success: Check, warn: AlertTriangle }[e.kind];
  return (
    <button onClick={onClick} className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50">
      <Icon className={clsx('mt-0.5 h-3.5 w-3.5 shrink-0', {
        'text-red-500': e.kind === 'rush' || e.kind === 'fault' || e.kind === 'warn', 'text-amber-500': e.kind === 'delay',
        'text-emerald-500': e.kind === 'success', 'text-slate-400': e.kind === 'info' })} />
      <span className="flex-1 text-xs text-slate-600">{eventText(lang, e.code, e.params)}</span>
      <span className="text-[10px] text-slate-400">{fmtClock(toClock(e.t))}</span>
    </button>
  );
}

function EventBell() {
  const events = useSim((s) => s.world.events);
  const select = useSim((s) => s.select);
  const t = useT();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(0);
  const unread = events.filter((e) => e.id > seen && e.kind !== 'info').length;
  return (
    <div className="relative">
      <button onClick={() => { setOpen(!open); setSeen(events[0]?.id ?? 0); }} className="relative rounded-xl p-1.5 hover:bg-slate-100 md:p-2">
        <Bell className="h-5 w-5 text-slate-600" />
        {unread > 0 && <span className="absolute right-1 top-1 h-4 min-w-4 rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white">{unread}</span>}
      </button>
      {open && (
        <div className={clsx(card, 'absolute right-0 top-12 z-50 max-h-96 w-80 overflow-auto p-2', dropdownMobile)}>
          <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{t('eventLog')}</div>
          {events.map((e) => <EventRow key={e.id} e={e} onClick={() => e.ref && select(e.ref.type, e.ref.id, true)} />)}
        </div>
      )}
    </div>
  );
}

function WarehouseSwitcher() {
  const worlds = useSim((s) => s.worlds);
  const activeId = useSim((s) => s.activeId);
  const switchWarehouse = useSim((s) => s.switchWarehouse);
  const lang = useLang();
  const t = useT();
  const [open, setOpen] = useState(false);
  const w = worlds[activeId];
  const docked = w.docks.filter((d) => d.status === 'occupied').length;
  const pct = Math.round((w.stock / w.warehouse.capacity) * 100);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} title={t('switchWarehouse')}
        className="flex items-center gap-2 rounded-xl px-2 py-1 text-left ring-1 ring-slate-200 hover:bg-slate-50">
        <span className="whitespace-nowrap rounded-md bg-[#2f6bff] px-1.5 py-1 text-xs font-bold text-white">{w.warehouse.id}</span>
        <div className="leading-tight">
          <div className="max-w-[110px] truncate text-sm font-semibold text-slate-800 md:max-w-[180px]">{whName(w, lang)}</div>
          <div className="hidden whitespace-nowrap text-[11px] text-slate-500 md:block">{t('full', { pct, docked, docks: w.docks.length })}</div>
        </div>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>
      {open && (
        <div className={clsx(card, 'absolute right-0 top-14 z-50 w-80 p-1', dropdownMobile)}>
          <div className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{t('switchWarehouse')}</div>
          {Object.values(worlds).map((x) => {
            const u = Math.round((x.docks.filter((d) => d.status === 'occupied').length / x.docks.length) * 100);
            const alerts = x.docks.filter((d) => d.status === 'fault').length + x.trucks.filter((tr) => tr.rush && tr.status !== 'departing').length;
            return (
              <button key={x.warehouse.id} onClick={() => { switchWarehouse(x.warehouse.id); setOpen(false); }}
                className={clsx('flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-blue-50', x.warehouse.id === activeId && 'bg-blue-50')}>
                <span className={clsx('rounded-md px-1.5 py-1 text-xs font-bold', x.warehouse.id === activeId ? 'bg-[#2f6bff] text-white' : 'bg-slate-100 text-slate-600')}>{x.warehouse.id}</span>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="truncate text-sm font-semibold text-slate-800">{whName(x, lang)}</div>
                  <div className="text-[11px] text-slate-500">
                    {x.docks.filter((d) => d.kind === 'in').length} {t('inbound')} · {x.docks.filter((d) => d.kind === 'out').length} {t('outbound')} · {x.trucks.length} {t('trucksTab')} · {u}%
                  </div>
                </div>
                {alerts > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{alerts}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function TopBar() {
  const w = useSim((s) => s.world);
  const mode = useSim((s) => s.mode);
  const speed = useSim((s) => s.speed);
  const setSpeed = useSim((s) => s.setSpeed);
  const settings = useSim((s) => s.settings);
  const toggle = useSim((s) => s.toggle);
  const lang = useLang();
  const setLang = useSim((s) => s.setLang);
  const setOrdersOpen = useSim((s) => s.setOrdersOpen);
  const t = useT();
  const activeOrders = w.shipments.filter((s) => s.completedAt === null).length;
  return (
    <header className="pointer-events-auto relative z-30 flex flex-wrap items-center gap-2 border-b border-slate-200/70 bg-white/90 px-2 py-2 backdrop-blur md:flex-nowrap md:gap-2.5 md:px-4 md:py-2.5">
      <div className="flex items-center gap-2 pr-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[#4f86ff] to-[#1f4fd6] text-white shadow"><Boxes className="h-5 w-5" /></div>
        <span className="hidden text-xl font-bold tracking-tight text-slate-900 sm:inline">WareTrack</span>
      </div>
      <SearchBox />
      <button onClick={() => setOrdersOpen(true)} className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-[#2f6bff] px-2.5 py-2 text-sm font-semibold text-white shadow hover:bg-[#1f4fd6] md:px-3">
        <ClipboardList className="h-4 w-4" /> <span className="hidden sm:inline">{t('orders')}</span> <span className="rounded-md bg-white/20 px-1.5 text-xs">{activeOrders}</span>
      </button>
      <div className="ml-auto"><WarehouseSwitcher /></div>
      <div className="flex items-center gap-0.5 rounded-xl bg-slate-100 p-1">
        <button title={t('pause')} onClick={() => setSpeed(0)} className={clsx('rounded-lg p-1 md:p-1.5', speed === 0 ? 'bg-white text-[#1f4fd6] shadow' : 'text-slate-500')}><Pause className="h-3.5 w-3.5" /></button>
        {([1, 4, 8] as const).map((s) => (
          <button key={s} onClick={() => setSpeed(s)} className={clsx('rounded-lg px-1.5 py-1 text-xs font-bold md:px-2', speed === s ? 'bg-white text-[#1f4fd6] shadow' : 'text-slate-500')}>{s}x</button>
        ))}
      </div>
      <div className={clsx('flex items-center gap-1.5 whitespace-nowrap rounded-xl px-2 py-1.5 text-sm font-semibold md:px-3', mode === 'db' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700')}>
        <span className={clsx('h-2 w-2 rounded-full', speed === 0 ? 'bg-slate-400' : 'animate-pulse bg-emerald-500')} />
        <span className="hidden lg:inline">{t(mode === 'db' ? 'live' : 'demo')}</span> {fmtClock(toClock(w.t))}
      </div>
      <details className="relative">
        <summary className="flex cursor-pointer list-none items-center gap-1 whitespace-nowrap rounded-xl px-1.5 py-1.5 md:px-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">
          <Gauge className="h-4 w-4" /> <span className="hidden lg:inline">{t('sim')}</span> <ChevronDown className="h-3 w-3" />
        </summary>
        <div className={clsx(card, 'absolute right-0 top-10 z-50 w-60 space-y-1 p-3 text-sm', dropdownMobile)}>
          {(['autoSpawn', 'autoDock', 'autoForklift', 'randomEvents'] as const).map((k) => (
            <label key={k} className="flex cursor-pointer items-center justify-between rounded-lg px-1 py-1 hover:bg-slate-50">
              <span className="text-slate-700">{t(k)}</span>
              <input type="checkbox" checked={settings[k]} onChange={() => toggle(k)} className="accent-[#2f6bff]" />
            </label>
          ))}
          <div className="flex gap-2 pt-2">
            <button onClick={() => useSim.getState().triggerRush()} className="flex-1 rounded-lg bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100">{t('rushBtn')}</button>
            <button onClick={() => useSim.getState().reset()} className="flex-1 rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200">{t('reset')}</button>
          </div>
        </div>
      </details>
      <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} title="中文 / English"
        className="flex items-center gap-1 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100">
        <Languages className="hidden h-4 w-4 md:block" />
        <span className={lang === 'zh' ? 'text-[#1f4fd6]' : 'text-slate-400'}>中</span>/<span className={lang === 'en' ? 'text-[#1f4fd6]' : 'text-slate-400'}>EN</span>
      </button>
      <EventBell />
      <div className="hidden items-center gap-2 border-l border-slate-200 pl-3 md:flex">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#4f86ff] to-[#1f4fd6] text-sm font-bold text-white">AH</div>
        <div className="hidden leading-tight xl:block">
          <div className="whitespace-nowrap text-sm font-semibold text-slate-800">{t('managerName')}</div>
          <div className="text-[11px] text-slate-500">{t('managerRole')}</div>
        </div>
      </div>
    </header>
  );
}

// ───────────────────────── KPI cards ─────────────────────────

function Kpi({ icon, title, value, delta, sub, good = true }: { icon: React.ReactNode; title: string; value: string; delta?: string; sub: string; good?: boolean }) {
  return (
    <div className={clsx(card, 'flex shrink-0 items-center gap-2 px-3 py-2 md:min-w-[200px] md:gap-3 md:px-4 md:py-3')}>
      <div className="hidden h-11 w-11 place-items-center rounded-xl bg-blue-50 text-[#2f6bff] md:grid">{icon}</div>
      <div>
        <div className="whitespace-nowrap text-[11px] font-medium text-slate-500 md:text-xs">{title}</div>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold tabular-nums text-slate-900 md:text-2xl">{value}</span>
          {delta && <span className={clsx('text-xs font-semibold', good ? 'text-emerald-600' : 'text-red-500')}>{delta}</span>}
        </div>
        <div className="hidden whitespace-nowrap text-[11px] text-slate-400 md:block">{sub}</div>
      </div>
    </div>
  );
}

export function KpiRow() {
  const w = useSim((s) => s.world);
  const t = useT();
  const onSite = w.trucks.filter((x) => x.status !== 'transit').length;
  const inbound = w.trucks.filter((x) => x.status !== 'transit' && x.kind === 'inbound').length;
  const ontime = w.completed ? (w.onTimeCount / w.completed) * 100 : 100;
  const util = (w.docks.filter((d) => d.status === 'occupied').length / w.docks.length) * 100;
  const d = w.stock - w.stockStart;
  return (
    <div className="pointer-events-auto flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:gap-3 md:overflow-visible md:pb-0">
      <Kpi icon={<Package className="h-5 w-5" />} title={t('kpiStock')} value={String(w.stock)} delta={`${d >= 0 ? '↑ +' : '↓ '}${d}`} good={d >= 0} sub={t('kpiStockSub', { wh: w.warehouse.id })} />
      <Kpi icon={<TruckIcon className="h-5 w-5" />} title={t('kpiTrucks')} value={String(onSite)} sub={t('kpiTrucksSub', { inb: inbound, route: w.trucks.filter((x) => x.status === 'transit').length })} />
      <Kpi icon={<Clock className="h-5 w-5" />} title={t('kpiOnTime')} value={`${ontime.toFixed(1)}%`} sub={t('kpiOnTimeSub', { a: w.onTimeCount, b: w.completed })} good={ontime >= 95} delta={t(ontime >= 95 ? 'onTarget' : 'belowTarget')} />
      <Kpi icon={<Warehouse className="h-5 w-5" />} title={t('kpiUtil')} value={`${util.toFixed(0)}%`} sub={t('kpiUtilSub', { score: w.score })} />
    </div>
  );
}

// ───────────────────────── Detail panel ─────────────────────────

function Row({ k, v, link, onClick }: { k: string; v: React.ReactNode; link?: boolean; onClick?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="shrink-0 text-slate-500">{k}</span>
      {onClick ? <button onClick={onClick} className={clsx('text-right font-semibold', link ? 'text-[#2f6bff] hover:underline' : 'text-slate-800')}>{v}</button>
        : <span className={clsx('text-right font-semibold', link ? 'text-[#2f6bff]' : 'text-slate-800')}>{v}</span>}
    </div>
  );
}

function Progress({ v, total }: { v: number; total: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500" style={{ width: `${(v / Math.max(1, total)) * 100}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums text-slate-500">{v}/{total}</span>
    </div>
  );
}

function TruckDetail({ tr, w }: { tr: Truck; w: World }) {
  const select = useSim((s) => s.select);
  const assign = useSim((s) => s.assign);
  const driving = useSim((s) => s.driving);
  const startDriving = useSim((s) => s.startDriving);
  const stopDriving = useSim((s) => s.stopDriving);
  const removeOrder = useSim((s) => s.removeOrder);
  const lang = useLang();
  const t = useT();
  const ship = w.shipments.find((s) => s.id === tr.shipmentId);
  const dock = w.docks.find((d) => d.id === tr.dockId);
  const crew = w.forklifts.filter((f) => f.truckId === tr.id).length;
  const remainingSim = tr.status === 'working' ? ((tr.total - tr.done) * 14) / Math.max(1, crew) : tr.eta;
  const freeDocks = w.docks.filter((d) => d.status === 'available' && (d.kind === 'in') === (tr.kind === 'inbound'));
  const isDriving = driving === tr.id;
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone={truckTone(tr)}>{t(truckStateKey(tr))}</Badge>
        <Badge tone="gray">{t(tr.kind)}</Badge>
        {tr.rush && <Badge tone="red">{t('rush')}</Badge>}
        {tr.delayed && <Badge tone="red">{t('delayed')}</Badge>}
        <span className="text-xs text-slate-500">{w.warehouse.id}{dock ? ` · ${dockName(lang, dock.name)}` : ''}</span>
      </div>
      <Progress v={tr.done} total={tr.total} />
      <div className="mt-3 flex gap-2">
        {isDriving ? (
          <button onClick={stopDriving} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-violet-600 py-2 text-sm font-semibold text-white hover:bg-violet-700">
            <Square className="h-4 w-4" /> {t('stopDrive')}
          </button>
        ) : (
          <button onClick={() => startDriving(tr.id)} disabled={!canDrive(tr) || !!driving} title={canDrive(tr) ? '' : t('cantDrive')}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-violet-50 py-2 text-sm font-semibold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-40">
            <Gamepad2 className="h-4 w-4" /> {t('drive')}
          </button>
        )}
        {ship && (
          <button onClick={() => window.confirm(t('confirmDelete', { ship: ship.id })) && removeOrder(ship.id)} title={t('deleteOrder')}
            className="rounded-xl px-3 py-2 text-red-500 ring-1 ring-red-200 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
        )}
      </div>
      <div className="mt-2">
        {ship && <Row k={t('shipment')} v={`#${ship.id}`} link onClick={() => select('shipment', ship.id)} />}
        {ship && <Row k={t('customer')} v={ship.customer} />}
        {ship && <Row k={t('destination')} v={ship.destination} />}
        <Row k={tr.status === 'transit' ? t('eta') : t('estFinish')} v={tr.status === 'working' ? t('doneIn', { min: etaMin(remainingSim) }) : tr.status === 'transit' ? t('min', { n: etaMin(tr.eta) }) : '—'} />
        {ship && <Row k={t('due')} v={<span className={w.t > ship.dueAt ? 'text-red-500' : ''}>{fmtClock(toClock(ship.dueAt))}</span>} />}
        <Row k={t('speed')} v={['arriving', 'docking', 'departing'].includes(tr.status) || isDriving ? '18 km/h' : '0 km/h'} />
        <Row k={t('bay')} v={dock ? `${dockName(lang, dock.name)} · ${w.warehouse.id}` : tr.yardSlot !== null ? t('yard', { n: tr.yardSlot + 1 }) : '—'} link={!!dock} onClick={dock ? () => select('dock', dock.id) : undefined} />
        <Row k={t('cargo')} v={t('cargoV', { done: tr.done, total: tr.total, tons: tr.tons })} />
        <Row k={t('forklifts')} v={t('forkliftsWorking', { n: crew })} />
      </div>
      {tr.status === 'waiting' && !tr.manual && (
        <div className="mt-3 rounded-xl bg-amber-50 p-3">
          <div className="mb-2 text-xs font-semibold text-amber-800">{t('assignToDock')}</div>
          <div className="flex flex-wrap gap-2">
            {freeDocks.length ? freeDocks.map((d) => (
              <button key={d.id} onClick={() => assign(tr.id, d.id)} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#1f4fd6] ring-1 ring-blue-200 hover:bg-blue-50">{dockName(lang, d.name)}</button>
            )) : <span className="text-xs text-amber-700">{t('noCompatibleDock')}</span>}
          </div>
        </div>
      )}
    </>
  );
}

function ForkliftDetail({ f, w }: { f: Forklift; w: World }) {
  const pin = useSim((s) => s.pin);
  const t = useT();
  const working = w.trucks.filter((x) => x.status === 'working');
  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <Badge tone={f.status === 'idle' ? 'gray' : 'green'}>{t(`fl_${f.status}`)}</Badge>
        <Badge tone={f.pinnedTruckId ? 'amber' : 'blue'}>{t(f.pinnedTruckId ? 'manual' : 'autoDispatch')}</Badge>
      </div>
      <Row k={t('currentTask')} v={f.truckId ? `${t(f.carrying ? 'carrying' : 'toPickupTask')} · ${f.truckId}` : '—'} />
      <Row k={t('palletsMoved')} v={f.moved} />
      <Row k={t('battery')} v={`${Math.max(18, 92 - f.moved * 2)}%`} />
      <Row k={t('position')} v={`${f.pos[0].toFixed(1)}, ${f.pos[1].toFixed(1)}`} />
      <div className="mt-3 rounded-xl bg-slate-50 p-3">
        <div className="mb-2 text-xs font-semibold text-slate-600">{t('dedicate')}</div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => pin(f.id, null)} className={clsx('rounded-lg px-3 py-1.5 text-xs font-semibold ring-1', !f.pinnedTruckId ? 'bg-[#2f6bff] text-white ring-[#2f6bff]' : 'bg-white text-slate-600 ring-slate-200')}>{t('auto')}</button>
          {working.map((x) => (
            <button key={x.id} onClick={() => pin(f.id, x.id)} className={clsx('rounded-lg px-3 py-1.5 text-xs font-semibold ring-1', f.pinnedTruckId === x.id ? 'bg-[#2f6bff] text-white ring-[#2f6bff]' : 'bg-white text-slate-600 ring-slate-200')}>{x.id}</button>
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
  const t = useT();
  const tr = w.trucks.find((x) => x.id === d.truckId);
  const waiting = w.trucks.filter((x) => x.status === 'waiting' && !x.manual && (x.kind === 'inbound') === (d.kind === 'in'));
  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <Badge tone={d.status === 'fault' ? 'red' : d.status === 'occupied' ? 'green' : 'gray'}>{t(d.status === 'fault' ? 'outOfService' : d.status)}</Badge>
        <span className="text-xs text-slate-500">{t(d.kind === 'in' ? 'inbDock' : 'outDock')} · {w.warehouse.id}</span>
      </div>
      <Row k={t('truck')} v={tr ? tr.id : t('noTruck')} link={!!tr} onClick={tr ? () => select('truck', tr.id, true) : undefined} />
      {tr && <Row k={t('progress')} v={t('palletsV', { done: tr.done, total: tr.total })} />}
      {d.status === 'fault' && <Row k={t('backInService')} v={fmtClock(toClock(d.faultUntil))} />}
      {d.status === 'fault' && (
        <button onClick={() => repair(d.id)} className="mt-3 w-full rounded-xl bg-red-500 py-2 text-sm font-semibold text-white hover:bg-red-600">{t('dispatchRepair')}</button>
      )}
      {d.status === 'available' && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3">
          <div className="mb-2 text-xs font-semibold text-slate-600">{t('assignWaiting')}</div>
          <div className="flex flex-wrap gap-2">
            {waiting.length ? waiting.map((x) => (
              <button key={x.id} onClick={() => assign(x.id, d.id)} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#1f4fd6] ring-1 ring-blue-200 hover:bg-blue-50">{x.id}{x.rush ? ' ⚡' : ''}</button>
            )) : <span className="text-xs text-slate-400">{t('noWaiting')}</span>}
          </div>
        </div>
      )}
    </>
  );
}

function ShipmentDetail({ s, w }: { s: Shipment; w: World }) {
  const select = useSim((st) => st.select);
  const removeOrder = useSim((st) => st.removeOrder);
  const t = useT();
  const tr = w.trucks.find((x) => x.id === s.truckId);
  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <Badge tone={s.completedAt !== null ? (s.onTime ? 'green' : 'red') : 'blue'}>{t(s.completedAt !== null ? (s.onTime ? 'deliveredOnTime' : 'deliveredLate') : 'inProgress')}</Badge>
        {s.source && <Badge tone="gray">{t(`src_${s.source}`)}</Badge>}
      </div>
      <Row k={t('customer')} v={s.customer} />
      <Row k={t('type')} v={t(s.kind)} />
      <Row k={t('destination')} v={s.destination} />
      <Row k={t('truck')} v={s.truckId} link={!!tr} onClick={tr ? () => select('truck', tr.id, true) : undefined} />
      <Row k={t('due')} v={fmtClock(toClock(s.dueAt))} />
      {s.stages.map((st) => <Row key={st.label} k={t(st.label)} v={st.clock !== null ? fmtClock(st.clock) : '—'} />)}
      {s.completedAt === null && (
        <button onClick={() => window.confirm(t('confirmDelete', { ship: s.id })) && removeOrder(s.id)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-50">
          <Trash2 className="h-4 w-4" /> {t('deleteOrder')}
        </button>
      )}
    </>
  );
}

export function DetailPanel({ className }: { className?: string }) {
  const sel = useSim((s) => s.selected);
  const w = useSim((s) => s.world);
  const clear = useSim((s) => s.clearSelection);
  const camera = useSim((s) => s.camera);
  const lang = useLang();
  const t = useT();
  if (!sel) return null;
  let title = '', kicker = '', sub = '', body: React.ReactNode = null, icon: React.ReactNode = <TruckIcon className="h-6 w-6" />;
  if (sel.type === 'truck') {
    const x = w.trucks.find((y) => y.id === sel.id);
    if (!x) return null;
    title = x.id; kicker = x.carrier; sub = `${x.driver} · ${x.plate}`; body = <TruckDetail tr={x} w={w} />;
  } else if (sel.type === 'forklift') {
    const f = w.forklifts.find((y) => y.id === sel.id);
    if (!f) return null;
    title = f.id; kicker = t('forklift'); sub = f.name; body = <ForkliftDetail f={f} w={w} />; icon = <ForkliftIcon className="h-6 w-6" />;
  } else if (sel.type === 'dock') {
    const d = w.docks.find((y) => y.id === sel.id);
    if (!d) return null;
    title = dockName(lang, d.name); kicker = t('loadingDock'); sub = `${w.warehouse.id} ${whName(w, lang)}`; body = <DockDetail d={d} w={w} />; icon = <Warehouse className="h-6 w-6" />;
  } else {
    const s = w.shipments.find((y) => y.id === sel.id);
    if (!s) return null;
    title = `#${s.id}`; kicker = t('shipment'); sub = s.customer; body = <ShipmentDetail s={s} w={w} />; icon = <Package className="h-6 w-6" />;
  }
  const pos = positionOf(w, sel.type, sel.id);
  return (
    <aside className={clsx(card, 'pointer-events-auto overflow-auto p-4', className ?? 'max-h-[calc(100vh-430px)] min-h-[200px] w-[360px]')}>
      <div className="mb-3 flex items-start gap-3 border-b border-slate-100 pb-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-[#2f6bff]">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[10px] font-bold uppercase tracking-wider text-[#2f6bff]">{kicker}</div>
          <div className="text-lg font-bold leading-tight text-slate-900">{title}</div>
          <div className="truncate text-xs text-slate-500">{sub}</div>
        </div>
        <div className="flex gap-1">
          <button title={t('focus')} disabled={!pos} onClick={() => pos && camera('focus', pos)} className="rounded-lg p-1.5 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40"><Crosshair className="h-4 w-4 text-slate-600" /></button>
          <button title={t('close')} onClick={clear} className="rounded-lg p-1.5 ring-1 ring-slate-200 hover:bg-slate-50"><X className="h-4 w-4 text-slate-600" /></button>
        </div>
      </div>
      {body}
    </aside>
  );
}

// ───────────────────────── Shipment timeline ─────────────────────────

export function ShipmentTimeline({ compact = false }: { compact?: boolean }) {
  const w = useSim((s) => s.world);
  const sel = useSim((s) => s.selected);
  const select = useSim((s) => s.select);
  const t = useT();
  let truck: Truck | undefined;
  if (sel?.type === 'truck') truck = w.trucks.find((x) => x.id === sel.id);
  if (sel?.type === 'shipment') truck = w.trucks.find((x) => x.shipmentId === sel.id);
  if (sel?.type === 'dock') truck = w.trucks.find((x) => x.dockId === sel.id);
  truck ??= w.trucks.find((x) => x.status === 'working') ?? w.trucks[0];
  const ship = sel?.type === 'shipment' ? w.shipments.find((s) => s.id === sel.id) : truck ? w.shipments.find((s) => s.id === truck!.shipmentId) : undefined;
  if (!ship) return null;
  const icons = [FileText, Package, Boxes, TruckIcon, Check];
  const active = ship.stages.findIndex((s) => s.clock === null);
  const cur = active === -1 ? ship.stages.length : active;
  const n = ship.stages.length - 1;
  const frac = Math.min(cur, n) / n;
  return (
    <div className={clsx(card, 'pointer-events-auto flex items-stretch gap-4', compact ? 'p-3' : 'p-4')}>
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-base font-bold text-slate-900"><TruckIcon className="h-5 w-5 text-[#2f6bff]" /> {t('shipmentTracking')}</div>
          <div className="text-xs text-slate-500">{ship.truckId} · {truck?.carrier ?? 'WareTrack'}</div>
        </div>
        <div className={clsx('relative flex justify-between', compact ? 'px-0' : 'px-4')}>
          <div className="absolute left-10 right-10 top-4 h-1 rounded bg-slate-200" />
          <div className="absolute left-10 top-4 h-1 rounded bg-[#2f6bff] transition-all duration-700" style={{ width: `calc(${frac * 100}% - ${frac * 80}px)` }} />
          {ship.stages.map((s, i) => {
            const Icon = icons[i];
            const done = s.clock !== null;
            const isCur = i === cur;
            const label = isCur && truck && truck.status === 'working' ? `${t(s.label)} ${truck.done}/${truck.total}` : t(s.label);
            return (
              <div key={s.label} className={clsx('relative z-10 flex flex-col items-center text-center', compact ? 'w-14' : 'w-24')}>
                <div className={clsx('grid h-9 w-9 place-items-center rounded-full ring-4 ring-white transition',
                  done ? 'bg-[#2f6bff] text-white' : isCur ? 'animate-pulse bg-[#2f6bff] text-white shadow-[0_0_0_6px_rgba(47,107,255,0.18)]' : 'bg-slate-200 text-slate-400')}>
                  {done && i === n ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className={clsx('mt-2 font-semibold text-slate-700', compact ? 'text-[10px] leading-tight' : 'text-xs')}>{label}</div>
                <div className="text-[10px] text-slate-400">{done ? fmtClock(s.clock!) : isCur ? t('etaAt', { t: fmtClock(toClock(ship.dueAt)) }) : '—'}</div>
              </div>
            );
          })}
        </div>
      </div>
      {!compact && <button onClick={() => select('shipment', ship.id)} className="flex w-60 items-center gap-3 rounded-xl bg-slate-50 p-3 text-left ring-1 ring-slate-200 hover:bg-blue-50">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white text-[#2f6bff] ring-1 ring-slate-200"><TruckIcon className="h-6 w-6" /></div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-slate-900">#{ship.id}</div>
          <div className="truncate text-xs text-slate-500">{t('to')}: {ship.destination}</div>
          {truck && <div className="mt-1"><Badge tone={truckTone(truck)}>{t(truckStateKey(truck))}</Badge></div>}
          <div className="mt-1 truncate text-[11px] text-slate-500">{ship.customer}</div>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-400" />
      </button>}
    </div>
  );
}

// ───────────────────────── Dock list (HTML drag & drop) ─────────────────────────

export function DockList({ className }: { className?: string }) {
  const w = useSim((s) => s.world);
  const select = useSim((s) => s.select);
  const assign = useSim((s) => s.assign);
  const lang = useLang();
  const t = useT();
  const [tab, setTab] = useState<'docks' | 'forklifts' | 'trucks'>('docks');
  const [over, setOver] = useState<string | null>(null);
  const busyF = w.forklifts.filter((f) => f.status !== 'idle').length;
  const occupied = w.docks.filter((d) => d.status === 'occupied').length;
  return (
    <div className={clsx(card, 'pointer-events-auto p-3', className ?? 'w-[440px]')}>
      <div className="mb-2 flex items-center gap-1">
        {([['docks', 'docksTab', `${occupied}/${w.docks.length}`], ['forklifts', 'forkliftsTab', `${busyF}/${w.forklifts.length}`], ['trucks', 'trucksTab', `${w.trucks.length}`]] as const).map(([k, l, n]) => (
          <button key={k} onClick={() => setTab(k)} className={clsx('rounded-lg px-3 py-1.5 text-sm font-semibold', tab === k ? 'bg-white text-slate-900 shadow ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700')}>
            {t(l)} <span className="text-[#2f6bff]">{n}</span>
          </button>
        ))}
        <span className="ml-auto truncate text-xs text-slate-400">{whName(w, lang)}</span>
      </div>
      <div className="max-h-52 overflow-auto">
        {tab === 'docks' && w.docks.map((d) => {
          const tr = w.trucks.find((x) => x.id === d.truckId);
          return (
            <div key={d.id} onClick={() => select('dock', d.id, true)}
              onDragOver={(e) => { e.preventDefault(); setOver(d.id); }} onDragLeave={() => setOver(null)}
              onDrop={(e) => { e.preventDefault(); setOver(null); assign(e.dataTransfer.getData('text/truck'), d.id); }}
              className={clsx('flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50', over === d.id && 'bg-blue-50 ring-2 ring-[#2f6bff]')}>
              <div className="w-14 leading-tight"><div className="text-sm font-bold text-slate-800">{dockName(lang, d.name)}</div><div className="text-[10px] text-slate-400">{w.warehouse.id}</div></div>
              <div className="flex-1 truncate text-sm text-slate-600">{tr ? <><span className="mr-1 text-[#2f6bff]">●</span>{tr.id} · {tr.carrier.split(' ')[0]}</> : d.status === 'fault' ? t('doorFault') : t('noTruck')}</div>
              <Badge tone={d.status === 'fault' ? 'red' : tr ? (tr.status === 'working' ? 'green' : 'blue') : 'gray'}>{d.status === 'fault' ? t('faultSt') : tr ? t(truckStateKey(tr)) : t('available')}</Badge>
              {tr && <div className="w-12"><div className="h-1 rounded bg-slate-100"><div className="h-1 rounded bg-emerald-500" style={{ width: `${(tr.done / tr.total) * 100}%` }} /></div><div className="text-[10px] text-slate-500">{tr.done}/{tr.total}</div></div>}
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </div>
          );
        })}
        {tab === 'forklifts' && w.forklifts.map((f) => (
          <div key={f.id} onClick={() => select('forklift', f.id, true)} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
            <ForkliftIcon className="h-4 w-4 text-amber-500" />
            <div className="w-14 text-sm font-bold text-slate-800">{f.id}</div>
            <div className="flex-1 text-sm text-slate-600">{f.truckId ? `${t(f.carrying ? 'carryingShort' : 'fetching')} · ${f.truckId}` : t('fl_idle')}</div>
            {f.pinnedTruckId && <Badge tone="amber">{t('manual')}</Badge>}
            <Badge tone={f.status === 'idle' ? 'gray' : 'green'}>{t(f.status === 'idle' ? 'fl_idle' : 'busy')}</Badge>
          </div>
        ))}
        {tab === 'trucks' && w.trucks.map((x) => (
          <div key={x.id} draggable={x.status === 'waiting' && !x.manual} onDragStart={(e) => e.dataTransfer.setData('text/truck', x.id)}
            onClick={() => select('truck', x.id, x.status !== 'transit')}
            className={clsx('flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50', x.status === 'waiting' ? 'cursor-grab' : 'cursor-pointer')}>
            <TruckIcon className={clsx('h-4 w-4', x.kind === 'inbound' ? 'text-[#2f6bff]' : 'text-emerald-600')} />
            <div className="w-20 text-sm font-bold text-slate-800">{x.id}</div>
            <div className="flex-1 truncate text-xs text-slate-500">{t(x.kind)} · {t('palletsN', { n: x.total })}{x.status === 'transit' ? ` · ${t('eta')} ${t('min', { n: etaMin(x.eta) })}` : ''}</div>
            {x.rush && <Badge tone="red">{t('rush')}</Badge>}
            <Badge tone={truckTone(x)}>{t(truckStateKey(x))}</Badge>
          </div>
        ))}
      </div>
      <div className="mt-1 border-t border-slate-100 pt-2 text-[11px] text-slate-400">{t('tip')}</div>
    </div>
  );
}

// ───────────────────────── Orders panel (CRUD + Excel import) ─────────────────────────

function NewOrderForm({ onDone }: { onDone: () => void }) {
  const addOrder = useSim((s) => s.addOrder);
  const worlds = useSim((s) => s.worlds);
  const activeId = useSim((s) => s.activeId);
  const lang = useLang();
  const t = useT();
  const [f, setF] = useState({ wh: activeId, kind: 'inbound' as TruckKind, customer: '', pallets: 6, eta: 5, due: '', rush: false, destination: '' });
  const set = (k: keyof typeof f, v: unknown) => setF((p) => ({ ...p, [k]: v }));
  const input = 'w-full rounded-lg bg-white px-2.5 py-1.5 text-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-[#2f6bff]';
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    addOrder({
      kind: f.kind, customer: f.customer.trim() || (lang === 'zh' ? '新客戶' : 'New Customer'), pallets: Math.max(1, Math.min(20, +f.pallets || 1)),
      etaMin: Math.max(0, +f.eta || 0), dueClock: parseClock(f.due), rush: f.rush, destination: f.destination.trim() || undefined, source: 'manual',
    }, f.wh);
    onDone();
  };
  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <label className="text-xs font-semibold text-slate-600">{t('fWarehouse')}
        <select value={f.wh} onChange={(e) => set('wh', e.target.value)} className={clsx(input, 'mt-1')}>
          {Object.values(worlds).map((w) => <option key={w.warehouse.id} value={w.warehouse.id}>{w.warehouse.id} · {whName(w, lang)}</option>)}
        </select>
      </label>
      <label className="text-xs font-semibold text-slate-600">{t('fType')}
        <select value={f.kind} onChange={(e) => set('kind', e.target.value)} className={clsx(input, 'mt-1')}>
          <option value="inbound">{t('inbound')}</option><option value="outbound">{t('outbound')}</option>
        </select>
      </label>
      <label className="text-xs font-semibold text-slate-600">{t('fCustomer')}
        <input value={f.customer} onChange={(e) => set('customer', e.target.value)} className={clsx(input, 'mt-1')} placeholder={lang === 'zh' ? '例：全聯福利中心' : 'e.g. Oakridge Market'} />
      </label>
      <label className="text-xs font-semibold text-slate-600">{t('fPallets')}
        <input type="number" min={1} max={20} value={f.pallets} onChange={(e) => set('pallets', e.target.value)} className={clsx(input, 'mt-1')} />
      </label>
      <label className="text-xs font-semibold text-slate-600">{t('fEta')}
        <input type="number" min={0} value={f.eta} onChange={(e) => set('eta', e.target.value)} className={clsx(input, 'mt-1')} />
      </label>
      <label className="text-xs font-semibold text-slate-600">{t('fDue')}
        <input value={f.due} onChange={(e) => set('due', e.target.value)} className={clsx(input, 'mt-1')} placeholder="10:30" />
      </label>
      <label className="text-xs font-semibold text-slate-600 sm:col-span-2">{t('fDestination')}
        <input value={f.destination} onChange={(e) => set('destination', e.target.value)} className={clsx(input, 'mt-1')} />
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold text-red-600">
        <input type="checkbox" checked={f.rush} onChange={(e) => set('rush', e.target.checked)} className="accent-red-500" /> {t('fRush')}
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-200">{t('cancel')}</button>
        <button type="submit" className="rounded-lg bg-[#2f6bff] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#1f4fd6]">{t('create')}</button>
      </div>
    </form>
  );
}

function ImportBox() {
  const importOrders = useSim((s) => s.importOrders);
  const notify = useSim((s) => s.notify);
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [replace, setReplace] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { orders, skipped } = await parseOrdersFile(file);
      importOrders(orders, replace);
      setMsg(`${t('imported', { n: orders.length })}${skipped ? ` · ${t('importSkipped', { n: skipped })}` : ''}`);
    } catch (e) {
      notify(false, 'importFailed', { err: String(e) });
    }
    if (fileRef.current) fileRef.current.value = '';
  };
  return (
    <div className="rounded-xl border-2 border-dashed border-slate-200 p-4"
      onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}>
      <div className="flex flex-wrap items-center gap-2">
        <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
        <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700">
          <Upload className="h-4 w-4" /> {t('importExcel')}
        </button>
        <button onClick={downloadTemplate} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50">
          <Download className="h-4 w-4" /> {t('template')}
        </button>
        <label className="flex w-full items-center gap-2 text-xs text-slate-600 md:ml-auto md:w-auto">
          <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="accent-emerald-600" /> {t('replaceOrders')}
        </label>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      </div>
      <p className="mt-2 text-[11px] text-slate-500">{t('importHelp')}</p>
      {msg && <p className="mt-1 text-xs font-semibold text-emerald-700">✓ {msg}</p>}
    </div>
  );
}

export function OrdersPanel() {
  const open = useSim((s) => s.ordersOpen);
  const setOpen = useSim((s) => s.setOrdersOpen);
  const w = useSim((s) => s.world);
  const select = useSim((s) => s.select);
  const removeOrder = useSim((s) => s.removeOrder);
  const lang = useLang();
  const t = useT();
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active');
  if (!open) return null;
  const rows = [...w.shipments]
    .filter((s) => (filter === 'all' ? true : filter === 'active' ? s.completedAt === null : s.completedAt !== null))
    .sort((a, b) => a.dueAt - b.dueAt);
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 grid place-items-center bg-slate-900/30 p-0 backdrop-blur-sm md:p-6" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div className={clsx(card, 'flex h-full w-full max-w-4xl flex-col gap-3 overflow-hidden rounded-none p-3 md:h-auto md:max-h-full md:rounded-2xl md:p-5')}>
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-[#2f6bff]" />
          <h2 className="min-w-0 truncate text-base font-bold text-slate-900 md:text-lg">{t('ordersTitle', { wh: `${w.warehouse.id} ${whName(w, lang)}` })}</h2>
          <button onClick={() => setAdding((v) => !v)} className="ml-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#2f6bff] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#1f4fd6]">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">{t('newOrder')}</span>
          </button>
          <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 ring-1 ring-slate-200 hover:bg-slate-50"><X className="h-4 w-4" /></button>
        </div>
        <div className="max-h-[45vh] shrink-0 space-y-3 overflow-auto md:max-h-none">
          {adding && <NewOrderForm onDone={() => setAdding(false)} />}
          <ImportBox />
        </div>
        <div className="flex gap-1">
          {(['active', 'completed', 'all'] as const).map((k) => (
            <button key={k} onClick={() => setFilter(k)} className={clsx('rounded-lg px-3 py-1 text-sm font-semibold', filter === k ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100')}>
              {t(k)} <span className="opacity-60">{w.shipments.filter((s) => (k === 'all' ? true : k === 'active' ? s.completedAt === null : s.completedAt !== null)).length}</span>
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-auto rounded-xl ring-1 ring-slate-200">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                {['colOrder', 'colType', 'colCustomer', 'colPallets', 'colDue', 'colTruck', 'colStatus'].map((h) => <th key={h} className="px-3 py-2 font-semibold">{t(h)}</th>)}
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400">{t('noOrders')}</td></tr>}
              {rows.map((s) => {
                const tr = w.trucks.find((x) => x.id === s.truckId);
                const late = s.completedAt === null && w.t > s.dueAt;
                return (
                  <tr key={s.id} className="border-t border-slate-100 hover:bg-blue-50/50">
                    <td className="px-3 py-2">
                      <button onClick={() => { select('shipment', s.id, true); setOpen(false); }} className="font-semibold text-[#2f6bff] hover:underline">#{s.id}</button>
                      {s.source && s.source !== 'seed' && <span className="ml-1.5"><Badge tone={s.source === 'excel' ? 'green' : s.source === 'rush' ? 'red' : 'gray'}>{t(`src_${s.source}`)}</Badge></span>}
                    </td>
                    <td className="px-3 py-2"><Badge tone={s.kind === 'inbound' ? 'blue' : 'green'}>{t(s.kind)}</Badge></td>
                    <td className="max-w-[180px] truncate px-3 py-2 text-slate-700">{s.customer}</td>
                    <td className="px-3 py-2 tabular-nums text-slate-700">{tr ? `${tr.done}/${tr.total}` : '—'}</td>
                    <td className={clsx('px-3 py-2 tabular-nums', late ? 'font-semibold text-red-500' : 'text-slate-700')}>{fmtClock(toClock(s.dueAt))}</td>
                    <td className="px-3 py-2 text-slate-700">{s.truckId}</td>
                    <td className="px-3 py-2">
                      {s.completedAt !== null ? <Badge tone={s.onTime ? 'green' : 'red'}>{t(s.onTime ? 'deliveredOnTime' : 'deliveredLate')}</Badge>
                        : tr ? <Badge tone={truckTone(tr)}>{t(truckStateKey(tr))}</Badge> : '—'}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {s.completedAt === null && (
                        <button onClick={() => window.confirm(t('confirmDelete', { ship: s.id })) && removeOrder(s.id)} title={t('deleteOrder')}
                          className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Manual driving ─────────────────────────

const pad = { throttle: 0, steer: 0, brake: false };

/** Keyboard + on-screen pad → store.drive() each animation frame. */
export function DriveController() {
  const driving = useSim((s) => s.driving);
  const stopDriving = useSim((s) => s.stopDriving);
  const t = useT();
  const keys = useRef(new Set<string>());

  useEffect(() => {
    if (!driving) return;
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'Escape') { stopDriving(); return; }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      keys.current.add(e.key.toLowerCase());
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const k = keys.current;
      const throttle = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 0.6 : 0) + pad.throttle;
      const steer = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0) + pad.steer;
      useSim.getState().drive(dt, { throttle: Math.max(-1, Math.min(1, throttle)), steer: Math.max(-1, Math.min(1, steer)), brake: k.has(' ') || pad.brake });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); cancelAnimationFrame(raf); keys.current.clear(); };
  }, [driving, stopDriving]);

  if (!driving) return null;
  const hold = (k: 'throttle' | 'steer', v: number) => ({
    onPointerDown: () => { pad[k] = v; }, onPointerUp: () => { pad[k] = 0; }, onPointerLeave: () => { pad[k] = 0; },
  });
  const btn = 'grid h-14 w-14 md:h-11 md:w-11 place-items-center rounded-xl bg-white text-slate-700 shadow ring-1 ring-slate-200 active:bg-violet-100 select-none touch-none';
  return (
    <div className="pointer-events-auto absolute inset-x-2 bottom-3 z-30 flex items-end justify-between gap-3 md:inset-x-auto md:bottom-[200px] md:left-1/2 md:-translate-x-1/2 md:justify-start md:gap-4">
      <div className={clsx(card, 'min-w-0 max-w-sm px-3 py-2 md:px-4 md:py-3')}>
        <div className="flex items-center gap-2 text-sm font-bold text-violet-700"><Gamepad2 className="h-4 w-4" /> {t('driving', { truck: driving })}</div>
        <p className="mt-1 hidden text-[11px] leading-snug text-slate-500 md:block">{t('driveHelp')}</p>
        <button onClick={stopDriving} className="mt-2 w-full rounded-lg bg-violet-600 py-1.5 text-sm font-semibold text-white hover:bg-violet-700">{t('stopDrive')} (Esc)</button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <span />
        <button className={btn} {...hold('throttle', 1)}><ArrowUp className="h-5 w-5" /></button>
        <span />
        <button className={btn} {...hold('steer', -1)}><ArrowLeft className="h-5 w-5" /></button>
        <button className={btn} {...hold('throttle', -0.6)}><ArrowDown className="h-5 w-5" /></button>
        <button className={btn} {...hold('steer', 1)}><ArrowRight className="h-5 w-5" /></button>
      </div>
    </div>
  );
}

// ───────────────────────── misc overlays ─────────────────────────

export function CameraControls() {
  const camera = useSim((s) => s.camera);
  const b = 'grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100';
  return (
    <div className={clsx(card, 'pointer-events-auto flex flex-col gap-1 p-1')}>
      <button className={b} onClick={() => camera('zoomIn')}><Plus className="h-4 w-4" /></button>
      <button className={b} onClick={() => camera('zoomOut')}><Minus className="h-4 w-4" /></button>
      <button className={b} onClick={() => camera('rotL')}><RotateCcw className="h-4 w-4" /></button>
      <button className={b} onClick={() => camera('rotR')}><RotateCw className="h-4 w-4" /></button>
      <button className={b} onClick={() => camera('home')}><Home className="h-4 w-4" /></button>
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
  const lang = useLang();
  if (!toast) return null;
  return (
    <div className={clsx('pointer-events-none absolute left-1/2 top-24 z-50 -translate-x-1/2 rounded-xl px-4 py-2 text-sm font-semibold shadow-lg', toast.ok ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white')}>
      {toast.ok ? '✓ ' : '✕ '}{eventText(lang, toast.code, toast.params)}
    </div>
  );
}

export function PausedBadge() {
  const speed = useSim((s) => s.speed);
  const setSpeed = useSim((s) => s.setSpeed);
  const t = useT();
  if (speed !== 0) return null;
  return (
    <button onClick={() => setSpeed(1)} className="pointer-events-auto absolute left-1/2 top-36 -translate-x-1/2 rounded-full bg-slate-900/80 px-4 py-2 text-sm font-semibold text-white shadow-lg">
      <Play className="mr-1 inline h-4 w-4" /> {t('paused')}
    </button>
  );
}

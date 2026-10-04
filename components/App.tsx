'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Map as MapIcon, Route, Warehouse } from 'lucide-react';
import { useSim } from '@/lib/store';
import type { World } from '@/lib/sim/types';
import { CameraControls, DetailPanel, DockList, DriveController, EventFeed, KpiRow, OrdersPanel, PausedBadge, ShipmentTimeline, Toast, TopBar, useIsMobile, useT } from './ui/Hud';

const Scene = dynamic(() => import('./scene/Scene'), { ssr: false, loading: () => <div className="grid h-full place-items-center text-slate-400">Loading 3D scene… 載入中</div> });

/** Demo mode: advance the front-end simulation at 10 Hz × speed.
 *  DB mode: subscribe to the server via SSE (falls back to 2 s polling). */
function Driver() {
  const mode = useSim((s) => s.mode);
  const speed = useSim((s) => s.speed);
  useEffect(() => {
    if (mode !== 'demo') return;
    const id = setInterval(() => useSim.getState().tick(0.1 * speed), 100);
    return () => clearInterval(id);
  }, [mode, speed]);

  useEffect(() => {
    if (mode !== 'db') return;
    let poll: ReturnType<typeof setInterval> | undefined;
    const apply = (w: World | undefined) => w && useSim.getState().setWorld(w);
    const es = new EventSource('/api/stream');
    es.onmessage = (e) => apply(JSON.parse(e.data).world);
    es.onerror = () => {
      // the stream ends every ~25 s (function duration) and the browser reconnects;
      // only fall back to polling if SSE is unavailable altogether
      if (es.readyState !== EventSource.CLOSED) return;
      poll ??= setInterval(() => fetch('/api/state').then((r) => r.json()).then((d) => apply(d.world)).catch(() => {}), 2000);
    };
    return () => { es.close(); if (poll) clearInterval(poll); };
  }, [mode]);
  return null;
}

/** Phone layout: one bottom sheet at a time + a bottom nav, so panels never stack on top of each other. */
function MobileOverlay() {
  const t = useT();
  const selected = useSim((s) => s.selected);
  const driving = useSim((s) => s.driving);
  const clear = useSim((s) => s.clearSelection);
  const [sheet, setSheet] = useState<'timeline' | 'docks' | 'none'>('none');
  // start on a clean map on phones; the panel opens when something is tapped
  useEffect(() => { useSim.getState().clearSelection(); }, []);
  const showDetail = !!selected && !driving;
  const tab = (k: typeof sheet, icon: React.ReactNode, label: string) => (
    <button onClick={() => { clear(); setSheet(sheet === k ? 'none' : k); }}
      className={clsx('flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold',
        !showDetail && sheet === k ? 'bg-blue-50 text-[#1f4fd6]' : 'text-slate-500')}>
      {icon}{label}
    </button>
  );
  return (
    <>
      <div className="absolute left-0 right-0 top-2 px-2"><KpiRow /></div>
      {!showDetail && sheet === 'none' && !driving && <div className="absolute right-2 top-[72px]"><CameraControls /></div>}
      {!driving && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 px-2 pb-2">
          {showDetail && <DetailPanel className="max-h-[52vh] w-full" />}
          {!showDetail && sheet === 'timeline' && <ShipmentTimeline compact />}
          {!showDetail && sheet === 'docks' && <DockList className="w-full" />}
          <nav className="pointer-events-auto flex gap-1 rounded-2xl bg-white/95 p-1 shadow-[0_8px_30px_rgba(31,79,214,0.15)] ring-1 ring-slate-200/70 backdrop-blur">
            {tab('none', <MapIcon className="h-5 w-5" />, t('navMap'))}
            {tab('timeline', <Route className="h-5 w-5" />, t('shipmentTracking'))}
            {tab('docks', <Warehouse className="h-5 w-5" />, `${t('docksTab')} / ${t('trucksTab')}`)}
          </nav>
        </div>
      )}
    </>
  );
}

export default function App() {
  const mobile = useIsMobile();
  useEffect(() => {
    // frame the scene for the actual screen size (phones need a wider view)
    const id = setTimeout(() => useSim.getState().camera('home'), 300);
    return () => clearTimeout(id);
  }, [mobile]);
  return (
    <div className="relative h-[100dvh] w-screen overflow-hidden bg-[#dbe4f3] text-slate-800">
      <Driver />
      <div className="absolute inset-0 isolate z-0"><Scene /></div>
      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
        <TopBar />
        <div className="relative flex-1">
          {mobile ? <MobileOverlay /> : (
            <>
              <div className="absolute left-4 top-4"><KpiRow /></div>
              <div className="absolute left-4 top-28"><EventFeed /></div>
              <div className="absolute right-4 top-4 flex items-start gap-3">
                <CameraControls />
                <DetailPanel />
              </div>
              <div className="absolute bottom-4 left-4 right-[470px]"><ShipmentTimeline /></div>
              <div className="absolute bottom-4 right-4"><DockList /></div>
            </>
          )}
          <DriveController />
          <Toast />
          <PausedBadge />
        </div>
        <OrdersPanel />
      </div>
    </div>
  );
}

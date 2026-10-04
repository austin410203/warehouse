'use client';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html, Line, OrbitControls } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useSim } from '@/lib/store';
import { STORAGE_COLS, STORAGE_ROWS, WALL_Z, YARD_SLOTS, storageCell } from '@/lib/sim/layout';
import type { Dock, Forklift, Truck, Vec } from '@/lib/sim/types';
import { ForkliftModel, Pallet, Tree, TruckModel } from './models';
import { truckStateKey, useT } from '@/components/ui/Hud';
import { dockName } from '@/lib/i18n';

const HOME_TARGET = new THREE.Vector3(1, 0, -1.5);
const HOME_POS = new THREE.Vector3(26, 26, 26).add(HOME_TARGET);
const HOME_ZOOM = 28;

// Smoothly follow the simulated position (sim ticks at 10 Hz, render at 60 Hz).
function useFollow(pos: Vec, heading: number) {
  const ref = useRef<THREE.Group>(null);
  const first = useRef(true);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    if (first.current) {
      g.position.set(pos[0], 0, pos[1]);
      g.rotation.y = heading;
      first.current = false;
      return;
    }
    const k = 1 - Math.exp(-dt * 12);
    g.position.x += (pos[0] - g.position.x) * k;
    g.position.z += (pos[1] - g.position.z) * k;
    let d = heading - g.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    g.rotation.y += d * k;
  });
  return ref;
}

function nearestDock(docks: Dock[], p: THREE.Vector3): string | null {
  let best: string | null = null;
  let bd = 3.2;
  for (const d of docks) {
    const dist = Math.hypot(d.pos[0] - p.x, d.pos[1] - p.z);
    if (dist < bd) { bd = dist; best = d.id; }
  }
  return best;
}

// ───────────────────────── static environment ─────────────────────────

function Ground() {
  const docks = useSim((s) => s.world.docks);
  const drag = useSim((s) => s.drag);
  const updateDrag = useSim((s) => s.updateDrag);
  const endDrag = useSim((s) => s.endDrag);
  const clear = useSim((s) => s.clearSelection);
  const t = useT();

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!drag) return;
    updateDrag([e.point.x, e.point.z], nearestDock(docks, e.point));
  };
  const onUp = (e: ThreeEvent<PointerEvent>) => {
    if (!drag) return;
    e.stopPropagation();
    endDrag(nearestDock(docks, e.point));
  };
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onPointerMove={onMove} onPointerUp={onUp}
        onPointerMissed={() => undefined} onClick={(e) => { if (!drag && e.delta < 4) clear(); }}>
        <planeGeometry args={[80, 60]} />
        <meshStandardMaterial color="#dfe6f3" />
      </mesh>
      {/* apron in front of the building */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 2.5]} receiveShadow>
        <planeGeometry args={[46, 17]} />
        <meshStandardMaterial color="#e9eef7" />
      </mesh>
      {/* road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 12]} receiveShadow>
        <planeGeometry args={[80, 4]} />
        <meshStandardMaterial color="#c9d3e6" />
      </mesh>
      {Array.from({ length: 20 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-38 + i * 4, 0.02, 12]}>
          <planeGeometry args={[1.6, 0.14]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      {/* yellow lane dashes */}
      {Array.from({ length: 22 }).map((_, i) => (
        <mesh key={`y${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[-21 + i * 2, 0.02, 8.6]}>
          <planeGeometry args={[0.9, 0.08]} />
          <meshBasicMaterial color="#f2c14e" />
        </mesh>
      ))}
      {/* yard parking outlines */}
      {YARD_SLOTS.map(([x, z], i) => (
        <group key={i} position={[x, 0.03, z]}>
          <Line points={[[-1.4, 0, -2.7], [1.4, 0, -2.7], [1.4, 0, 2.7], [-1.4, 0, 2.7], [-1.4, 0, -2.7]]} color="#f2c14e" lineWidth={1.5} />
          <Html position={[0, 0, 3.1]} center transform={false} style={{ pointerEvents: 'none' }}>
            <div className="whitespace-nowrap text-[9px] font-semibold tracking-wider text-amber-600/80">{t('yardLbl', { n: i + 1 })}</div>
          </Html>
        </group>
      ))}
      {/* storage outline */}
      <Line points={[[9, 0.03, -0.6], [19.4, 0.03, -0.6], [19.4, 0.03, 4.5], [9, 0.03, 4.5], [9, 0.03, -0.6]]} color="#f2c14e" lineWidth={1.5} dashed dashSize={0.6} gapSize={0.3} />
      {/* fence */}
      {Array.from({ length: 13 }).map((_, i) => (
        <mesh key={`f${i}`} position={[-23, 0.6, -5 + i * 1.3]}>
          <boxGeometry args={[0.06, 1.2, 0.06]} />
          <meshStandardMaterial color="#9aa6bd" />
        </mesh>
      ))}
      <mesh position={[-23, 0.9, 2.8]}>
        <boxGeometry args={[0.03, 0.05, 15.6]} />
        <meshStandardMaterial color="#9aa6bd" />
      </mesh>
      <Tree position={[-21.5, 0, 9]} />
      <Tree position={[21, 0, 8.5]} />
      <Tree position={[-25, 0, -2]} />
    </group>
  );
}

function Building() {
  const id = useSim((s) => s.world.warehouse.id);
  return (
    <group>
      <mesh position={[0, 3.2, WALL_Z - 6]} castShadow receiveShadow>
        <boxGeometry args={[34, 6.4, 12]} />
        <meshStandardMaterial color="#e6ebf5" />
      </mesh>
      {/* corrugated stripes */}
      {Array.from({ length: 34 }).map((_, i) => (
        <mesh key={i} position={[-16.5 + i, 3.6, WALL_Z + 0.01]}>
          <planeGeometry args={[0.06, 5.4]} />
          <meshBasicMaterial color="#cfd7e6" />
        </mesh>
      ))}
      <mesh position={[0, 6.55, WALL_Z - 6]}>
        <boxGeometry args={[34.4, 0.3, 12.4]} />
        <meshStandardMaterial color="#c3cde0" />
      </mesh>
      {/* loading platform */}
      <mesh position={[0, 0.5, WALL_Z + 0.4]} receiveShadow>
        <boxGeometry args={[34, 1, 0.8]} />
        <meshStandardMaterial color="#b9c4d9" />
      </mesh>
      {/* sign */}
      <group position={[13.5, 4.8, WALL_Z + 0.05]}>
        <mesh>
          <planeGeometry args={[5, 1.2]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <Html position={[0, 0, 0.02]} center transform scale={0.5} style={{ pointerEvents: 'none' }}>
          <div className="font-bold text-[#1f4fd6] text-[28px] whitespace-nowrap">▣ WareTrack · {id}</div>
        </Html>
      </group>
    </group>
  );
}

// ───────────────────────── docks ─────────────────────────

function DockDoor({ dock }: { dock: Dock }) {
  const selected = useSim((s) => s.selected?.type === 'dock' && s.selected.id === dock.id);
  const drag = useSim((s) => s.drag);
  const dragTruck = useSim((s) => (s.drag ? s.world.trucks.find((t) => t.id === s.drag!.truckId) : undefined));
  const select = useSim((s) => s.select);
  const endDrag = useSim((s) => s.endDrag);
  const updateDrag = useSim((s) => s.updateDrag);
  const lang = useSim((s) => s.lang);
  const t = useT();

  const compatible = dragTruck ? (dragTruck.kind === 'inbound') === (dock.kind === 'in') && dock.status === 'available' : false;
  const hover = drag?.hoverDock === dock.id;
  const padColor = dock.status === 'fault' ? '#ff6b6b' : drag ? (compatible ? (hover ? '#2f6bff' : '#8fb0ff') : '#d0d6e2') : dock.status === 'occupied' ? '#c7d7ff' : '#e9eef7';
  const frame = dock.status === 'fault' ? '#e03131' : '#2f6bff';

  return (
    <group>
      {/* door frame */}
      <group position={[dock.door[0], 0, WALL_Z + 0.02]}>
        <mesh position={[0, 2.2, 0]}>
          <boxGeometry args={[2.9, 3.4, 0.12]} />
          <meshStandardMaterial color={frame} />
        </mesh>
        <mesh position={[0, 2.1, 0.07]}>
          <boxGeometry args={[2.4, 3.0, 0.05]} />
          <meshStandardMaterial color={dock.status === 'occupied' ? '#3a4560' : '#f4f6fb'} />
        </mesh>
        {/* stacked cartons visible inside open door */}
        {dock.status !== 'fault' && (
          <group position={[0, 1.0, -0.2]} scale={1.1}>
            <Pallet boxes={8} />
          </group>
        )}
        <Html position={[0, 4.25, 0.1]} center style={{ pointerEvents: 'none' }}>
          <div className={`whitespace-nowrap px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${dock.status === 'fault' ? 'bg-red-500' : 'bg-[#1f4fd6]'}`}>
            {dockName(lang, dock.name)}
          </div>
        </Html>
      </group>
      {/* pad = click + drop target */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[dock.pos[0], 0.025, dock.pos[1]]}
        onClick={(e) => { e.stopPropagation(); if (!drag) select('dock', dock.id); }}
        onPointerOver={() => drag && updateDrag(null, dock.id)}
        onPointerUp={(e) => { if (drag) { e.stopPropagation(); endDrag(dock.id); } }}>
        <planeGeometry args={[2.8, 6]} />
        <meshStandardMaterial color={padColor} transparent opacity={0.85} />
      </mesh>
      <Line points={[[-1.4, 0, -3], [1.4, 0, -3], [1.4, 0, 3], [-1.4, 0, 3], [-1.4, 0, -3]].map(([x, y, z]) => [x + dock.pos[0], 0.04, z + dock.pos[1]] as [number, number, number])}
        color={selected ? '#1f4fd6' : '#f2c14e'} lineWidth={selected ? 3 : 1.5} />
      {dock.status === 'fault' && (
        <Html position={[dock.pos[0], 0.8, dock.pos[1] + 1]} center style={{ pointerEvents: 'none' }}>
          <div className="animate-pulse px-2 py-1 rounded-full bg-red-500 text-white text-[10px] font-bold shadow">{t('faultLbl')}</div>
        </Html>
      )}
    </group>
  );
}

// ───────────────────────── entities ─────────────────────────

function SelectionBox({ size, y = 0 }: { size: [number, number, number]; y?: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = y + Math.sin(clock.elapsedTime * 3) * 0.04;
  });
  const geo = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(...size)), [size]);
  return (
    <group ref={ref}>
      <lineSegments geometry={geo} position={[0, size[1] / 2, 0]}>
        <lineBasicMaterial color="#2f6bff" />
      </lineSegments>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <planeGeometry args={[size[0], size[2]]} />
        <meshBasicMaterial color="#2f6bff" transparent opacity={0.15} />
      </mesh>
    </group>
  );
}


function TruckEntity({ truck }: { truck: Truck }) {
  const ref = useFollow(truck.pos, truck.heading);
  const selected = useSim((s) => s.selected?.type === 'truck' && s.selected.id === truck.id);
  const dragging = useSim((s) => s.drag?.truckId === truck.id);
  const select = useSim((s) => s.select);
  const startDrag = useSim((s) => s.startDrag);
  const controls = useThree((s) => s.controls) as unknown as { enabled: boolean } | null;
  const t = useT();
  const label = t(truckStateKey(truck));

  return (
    <group ref={ref}>
      <group
        onClick={(e) => { e.stopPropagation(); select('truck', truck.id); }}
        onPointerDown={(e) => { if (truck.status === 'waiting' && !truck.manual) { e.stopPropagation(); if (controls) controls.enabled = false; startDrag(truck.id); } }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = truck.status === 'waiting' && !truck.manual ? 'grab' : 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = ''; }}>
        <group visible={!dragging}>
          <TruckModel kind={truck.kind} />
        </group>
      </group>
      {selected && <SelectionBox size={[2.6, 2.6, 5.4]} />}
      {truck.manual && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[3.0, 3.4, 40]} />
          <meshBasicMaterial color="#7c3aed" transparent opacity={0.6} />
        </mesh>
      )}
      <Html position={[0, 3.1, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[20, 0]}>
        <div className={`flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-semibold shadow ${truck.manual ? 'bg-violet-600 text-white' : selected ? 'bg-[#1f4fd6] text-white' : 'bg-white/90 text-slate-700'}`}>
          {truck.rush && <span className="rounded bg-red-500 px-1 text-white">RUSH</span>}
          {truck.id}
          <span className={`rounded px-1 ${selected ? 'bg-white/20' : 'bg-slate-100'}`}>{label}{truck.status === 'working' ? ` ${truck.done}/${truck.total}` : ''}</span>
        </div>
      </Html>
      {truck.status === 'waiting' && !dragging && !truck.manual && (
        <Html position={[0, 0.2, 3.2]} center style={{ pointerEvents: 'none' }}>
          <div className="whitespace-nowrap text-[9px] font-medium text-slate-500">{t('dragHint')}</div>
        </Html>
      )}
    </group>
  );
}

function DragGhost() {
  const drag = useSim((s) => s.drag);
  const truck = useSim((s) => (s.drag ? s.world.trucks.find((t) => t.id === s.drag!.truckId) : undefined));
  const docks = useSim((s) => s.world.docks);
  if (!drag || !truck) return null;
  const hoverDock = docks.find((d) => d.id === drag.hoverDock);
  const p: Vec = hoverDock ? hoverDock.pos : drag.pos ?? truck.pos;
  return (
    <group position={[p[0], 0.05, p[1]]}>
      <TruckModel kind={truck.kind} ghost />
      <Line points={[[0, 0.1, 0], [truck.pos[0] - p[0], 0.1, truck.pos[1] - p[1]]]} color="#2f6bff" lineWidth={2} dashed dashSize={0.4} gapSize={0.25} />
    </group>
  );
}

function ForkliftEntity({ f }: { f: Forklift }) {
  const ref = useFollow(f.pos, f.heading);
  const selected = useSim((s) => s.selected?.type === 'forklift' && s.selected.id === f.id);
  const select = useSim((s) => s.select);
  return (
    <group ref={ref}>
      <group onClick={(e) => { e.stopPropagation(); select('forklift', f.id); }}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = ''; }}>
        <ForkliftModel carrying={f.carrying} color={f.pinnedTruckId ? '#ff8a3d' : '#f5b301'} />
      </group>
      {selected && (
        <>
          <SelectionBox size={[1.4, 2, 2.2]} />
          <Html position={[0, 2.4, 0]} center style={{ pointerEvents: 'none' }}>
            <div className="rounded-md bg-[#1f4fd6] px-1.5 py-0.5 text-[10px] font-semibold text-white whitespace-nowrap">{f.id}</div>
          </Html>
        </>
      )}
    </group>
  );
}

function Storage() {
  const stock = useSim((s) => s.world.stock);
  const capacity = useSim((s) => s.world.warehouse.capacity);
  const t = useT();
  const cells = STORAGE_COLS * STORAGE_ROWS;
  const ratio = stock / capacity;
  return (
    <group>
      {Array.from({ length: cells }).map((_, i) => {
        // fill visually proportional to stock level, deterministic per cell
        const fill = Math.max(0, Math.min(1, ratio * cells * 0.9 - i * 0.55 + 4));
        const boxes = Math.round(fill * 8);
        const [x, z] = storageCell(i);
        if (boxes === 0) return null;
        return (
          <group key={i} position={[x, 0, z]}>
            <Pallet boxes={boxes} wrap={i % 5 === 2} color={i % 7 === 3 ? '#3b6df0' : '#c9915a'} />
          </group>
        );
      })}
      <Html position={[14.2, 0.1, 5.2]} center style={{ pointerEvents: 'none' }}>
        <div className="whitespace-nowrap rounded bg-white/80 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-slate-500">{t('storageLbl', { n: stock })}</div>
      </Html>
    </group>
  );
}

function Pin({ to }: { to: Vec }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.x += (to[0] - ref.current.position.x) * 0.2;
      ref.current.position.z += (to[1] - ref.current.position.z) * 0.2;
      ref.current.position.y = 4.4 + Math.sin(clock.elapsedTime * 3) * 0.15;
    }
  });
  return (
    <group ref={ref} position={[to[0], 4.4, to[1]]}>
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.38, 20, 20]} />
        <meshStandardMaterial color="#2f6bff" />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.16, 12, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0.0, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.3, 0.6, 20]} />
        <meshStandardMaterial color="#2f6bff" />
      </mesh>
    </group>
  );
}

function SelectedPin() {
  const sel = useSim((s) => s.selected);
  const pos = useSim((s) => {
    if (!s.selected || s.selected.type !== 'dock') return null;
    return s.world.docks.find((d) => d.id === s.selected!.id)?.pos ?? null;
  });
  if (!sel || !pos) return null;
  return <Pin to={pos} />;
}

// ───────────────────────── camera ─────────────────────────

function CameraRig() {
  const cam = useSim((s) => s.cam);
  const dragging = useSim((s) => !!s.drag);
  const drivePos = useSim((s) => (s.driving ? s.world.trucks.find((x) => x.id === s.driving)?.pos ?? null : null));
  const followRef = useRef<Vec | null>(null);
  followRef.current = drivePos;
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const goal = useRef<{ target: THREE.Vector3; pos: THREE.Vector3; zoom: number } | null>(null);

  useEffect(() => {
    const c = controls.current;
    if (!c || cam.n === 0) return;
    const ortho = camera as THREE.OrthographicCamera;
    const target = c.target.clone();
    const offset = camera.position.clone().sub(c.target);
    let zoom = ortho.zoom;
    switch (cam.kind) {
      case 'zoomIn': zoom = Math.min(90, zoom * 1.25); break;
      case 'zoomOut': zoom = Math.max(12, zoom / 1.25); break;
      case 'rotL': offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 6); break;
      case 'rotR': offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 6); break;
      case 'home': target.copy(HOME_TARGET); offset.copy(HOME_POS).sub(HOME_TARGET); zoom = HOME_ZOOM; break;
      case 'focus': if (cam.target) { target.set(cam.target[0], 0, cam.target[1]); zoom = Math.max(zoom, 44); } break;
    }
    goal.current = { target, pos: target.clone().add(offset), zoom };
  }, [cam, camera]);

  useFrame((_, dt) => {
    const c = controls.current;
    const f = followRef.current;
    if (c && f) {
      // follow the truck being driven, keep the current viewing angle & zoom
      const offset = camera.position.clone().sub(c.target);
      const k = 1 - Math.exp(-dt * 4);
      c.target.lerp(new THREE.Vector3(f[0], 0, f[1]), k);
      camera.position.copy(c.target.clone().add(offset));
      c.update();
      goal.current = null;
      return;
    }
    const g = goal.current;
    if (!g || !c) return;
    const k = 1 - Math.exp(-dt * 6);
    const ortho = camera as THREE.OrthographicCamera;
    c.target.lerp(g.target, k);
    camera.position.lerp(g.pos, k);
    ortho.zoom += (g.zoom - ortho.zoom) * k;
    ortho.updateProjectionMatrix();
    c.update();
    if (camera.position.distanceTo(g.pos) < 0.02 && Math.abs(ortho.zoom - g.zoom) < 0.05) goal.current = null;
  });

  return (
    <OrbitControls ref={controls} target={HOME_TARGET.toArray()} enabled={!dragging} enableDamping makeDefault
      minZoom={12} maxZoom={90} maxPolarAngle={Math.PI / 2.4} minPolarAngle={Math.PI / 8}
      mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }}
      onStart={() => { goal.current = null; }} />
  );
}

// ───────────────────────── root ─────────────────────────

function Entities() {
  const trucks = useSim((s) => s.world.trucks);
  const forklifts = useSim((s) => s.world.forklifts);
  const docks = useSim((s) => s.world.docks);
  return (
    <>
      {docks.map((d) => <DockDoor key={d.id} dock={d} />)}
      {trucks.filter((t) => t.status !== 'transit').map((t) => <TruckEntity key={t.id} truck={t} />)}
      {forklifts.map((f) => <ForkliftEntity key={f.id} f={f} />)}
    </>
  );
}

export default function Scene() {
  const endDrag = useSim((s) => s.endDrag);
  useEffect(() => {
    // releasing outside any drop target cancels the drag
    const up = () => setTimeout(() => useSim.getState().drag && endDrag(null), 0);
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, [endDrag]);

  return (
    <Canvas orthographic shadows dpr={[1, 2]} camera={{ position: HOME_POS.toArray(), zoom: HOME_ZOOM, near: -200, far: 400 }}
      gl={{ antialias: true }} onCreated={({ gl }) => gl.setClearColor('#dbe4f3')}>
      <ambientLight intensity={1.4} />
      <hemisphereLight args={['#ffffff', '#b8c4dc', 0.8]} />
      <directionalLight position={[18, 30, 14]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-35} shadow-camera-right={35} shadow-camera-top={35} shadow-camera-bottom={-35} />
      <Ground />
      <Building />
      <Storage />
      <Entities />
      <DragGhost />
      <SelectedPin />
      <CameraRig />
    </Canvas>
  );
}

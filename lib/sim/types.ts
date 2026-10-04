// World model shared by the 3D scene, the UI panels, the simulation engine and the DB layer.
// Positions are [x, z] on the ground plane. `t` is simulation seconds.

export type Vec = [number, number];

export type TruckKind = 'inbound' | 'outbound';
export type TruckStatus =
  | 'transit'   // on the road, not on site yet
  | 'arriving'  // driving from gate to yard slot
  | 'waiting'   // parked in yard, waiting for a dock (draggable)
  | 'docking'   // driving to assigned dock
  | 'working'   // unloading (inbound) or loading (outbound)
  | 'departing' // leaving site
  | 'departed';

export interface Truck {
  id: string;
  plate: string;
  driver: string;
  carrier: string;
  kind: TruckKind;
  status: TruckStatus;
  dockId: string | null;
  total: number;    // pallets to move
  done: number;     // pallets moved
  inFlight: number; // pallets currently being moved by forklifts
  tons: number;
  eta: number;      // sim seconds until arrival (transit only)
  waitingSince: number;
  pos: Vec;
  heading: number;
  target: Vec | null;
  yardSlot: number | null;
  shipmentId: string;
  delayed: boolean;
  rush: boolean;
}

export type DockKind = 'in' | 'out';
export type DockStatus = 'available' | 'occupied' | 'fault';

export interface Dock {
  id: string;
  name: string;
  kind: DockKind;
  pos: Vec;   // where a docked truck parks
  door: Vec;  // door location on the wall
  status: DockStatus;
  truckId: string | null;
  faultUntil: number;
}

export type ForkliftStatus = 'idle' | 'toPickup' | 'handling' | 'toDrop' | 'returning';

export interface Forklift {
  id: string;
  name: string;
  status: ForkliftStatus;
  pos: Vec;
  heading: number;
  target: Vec | null;
  home: Vec;
  carrying: boolean;
  truckId: string | null;
  pinnedTruckId: string | null; // manual assignment from the player
  busyUntil: number;
  next: 'pickup' | 'drop';
  moved: number;
}

export interface ShipmentStage {
  label: string;
  clock: number | null; // seconds since midnight
}

export interface Shipment {
  id: string;
  customer: string;
  destination: string;
  truckId: string;
  kind: TruckKind;
  stages: ShipmentStage[];
  dueAt: number; // sim seconds
  completedAt: number | null;
  onTime: boolean | null;
}

export type EventKind = 'rush' | 'fault' | 'delay' | 'info' | 'success' | 'warn';

export interface GameEvent {
  id: number;
  t: number;
  kind: EventKind;
  msg: string;
  ref?: { type: SelectionType; id: string };
}

export type SelectionType = 'truck' | 'forklift' | 'dock' | 'shipment';

export interface World {
  warehouse: { id: string; name: string; capacity: number };
  t: number;
  stock: number;
  stockStart: number;
  trucks: Truck[];
  docks: Dock[];
  forklifts: Forklift[];
  shipments: Shipment[];
  events: GameEvent[];
  completed: number;
  onTimeCount: number;
  score: number;
  nextSpawn: number;
  nextEvent: number;
  seq: number;
}

export interface SimSettings {
  autoDock: boolean;
  autoForklift: boolean;
  randomEvents: boolean;
}

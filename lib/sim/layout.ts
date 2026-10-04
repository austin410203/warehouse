import type { Vec } from './types';

// Simulation clock: 1 sim second = CLOCK_SCALE clock seconds. Demo starts at 09:43.
export const CLOCK_SCALE = 10;
export const CLOCK_START = 9 * 3600 + 43 * 60;
export const toClock = (t: number) => CLOCK_START + t * CLOCK_SCALE;
export const fromClock = (clock: number) => (clock - CLOCK_START) / CLOCK_SCALE;
export const fmtClock = (clock: number) => {
  const s = ((Math.floor(clock) % 86400) + 86400) % 86400;
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;
};
export const hm = (h: number, m: number) => h * 3600 + m * 60;

// Scene layout (ground plane, units ≈ metres / 2)
export const WALL_Z = -6;
export const DOCK_DEFS = [
  { id: 'in1', name: 'In 1', kind: 'in' as const, x: -9 },
  { id: 'in2', name: 'In 2', kind: 'in' as const, x: -4 },
  { id: 'in3', name: 'In 3', kind: 'in' as const, x: 1 },
  { id: 'out1', name: 'Out 1', kind: 'out' as const, x: 7 },
];
export const DOCK_PARK_Z = -3.0;
export const GATE: Vec = [-24, 12];
export const EXIT: Vec = [24, 12];
export const ROAD_Z = 12;
export const YARD_SLOTS: Vec[] = [
  [-17, 6], [-13, 6], [-17, 1], [-13, 1],
];
export const STORAGE_ORIGIN: Vec = [10, 0.5];
export const STORAGE_COLS = 6;
export const STORAGE_ROWS = 3;
export const STORAGE_GAP = 1.6;

export function storageCell(i: number): Vec {
  const n = STORAGE_COLS * STORAGE_ROWS;
  const k = ((i % n) + n) % n;
  return [STORAGE_ORIGIN[0] + (k % STORAGE_COLS) * STORAGE_GAP, STORAGE_ORIGIN[1] + Math.floor(k / STORAGE_COLS) * STORAGE_GAP];
}

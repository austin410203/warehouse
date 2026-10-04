// Excel (.xlsx/.xls/.csv) order import + template export, client-side via SheetJS.
import * as XLSX from 'xlsx';
import type { OrderInput } from './sim/engine';
import type { TruckKind } from './sim/types';

export interface ParsedOrder extends OrderInput { warehouseId: string | null }

// header aliases (lower-cased, spaces removed)
const H: Record<keyof Omit<ParsedOrder, 'source'>, string[]> = {
  warehouseId: ['warehouse', 'wh', '倉庫', '倉庫代碼', '倉別'],
  kind: ['type', 'kind', 'direction', '類型', '方向', '進出'],
  customer: ['customer', 'client', '客戶', '客戶名稱'],
  pallets: ['pallets', 'qty', 'quantity', '棧板', '棧板數', '數量'],
  etaMin: ['eta', 'eta(min)', 'etamin', 'arrivein', 'arrivalmin', '抵達(分鐘)', '抵達分鐘', '幾分鐘後抵達', '抵達'],
  dueClock: ['due', 'duetime', 'deadline', '截止', '截止時間', '交期'],
  rush: ['rush', 'urgent', 'priority', '急單', '緊急'],
  plate: ['plate', 'truckplate', '車牌'],
  driver: ['driver', '司機'],
  carrier: ['carrier', '承運商', '物流商'],
  destination: ['destination', 'dest', '目的地'],
};

const norm = (s: string) => s.toLowerCase().replace(/[\s_\-（）()]/g, (c) => (c === '（' ? '(' : c === '）' ? ')' : c === '(' || c === ')' ? c : ''));

function pickField(row: Record<string, unknown>, aliases: string[]): unknown {
  for (const [k, v] of Object.entries(row)) {
    // bilingual headers like "棧板數 Pallets" match on either part
    const keys = [norm(k), ...k.split(/\s+/).map(norm)];
    if (aliases.some((a) => keys.includes(norm(a)))) return v;
  }
  return undefined;
}

function parseKind(v: unknown): TruckKind | null {
  const s = String(v ?? '').trim().toLowerCase();
  if (['inbound', 'in', '入庫', '進貨', '收貨', '入'].includes(s)) return 'inbound';
  if (['outbound', 'out', '出貨', '出庫', '發貨', '出'].includes(s)) return 'outbound';
  return null;
}

/** Accepts "10:30", Excel time fractions (0.4375) or Date objects; returns seconds since midnight. */
export function parseClock(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null;
  if (v instanceof Date) return v.getHours() * 3600 + v.getMinutes() * 60;
  if (typeof v === 'number') return v < 1 ? Math.round(v * 86400) : null;
  const m = String(v).trim().match(/^(\d{1,2})[:：](\d{2})/);
  return m ? +m[1] * 3600 + +m[2] * 60 : null;
}

const truthy = (v: unknown) => ['1', 'y', 'yes', 'true', '是', 'v', '✓', 'x'].includes(String(v ?? '').trim().toLowerCase());

export async function parseOrdersFile(file: File): Promise<{ orders: ParsedOrder[]; skipped: number }> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  const orders: ParsedOrder[] = [];
  let skipped = 0;
  for (const r of rows) {
    const kind = parseKind(pickField(r, H.kind));
    const pallets = Number(pickField(r, H.pallets));
    if (!kind || !Number.isFinite(pallets) || pallets <= 0) { skipped++; continue; }
    const wh = String(pickField(r, H.warehouseId) ?? '').trim().toUpperCase();
    orders.push({
      warehouseId: wh || null,
      kind,
      customer: String(pickField(r, H.customer) ?? '').trim() || 'Excel Customer',
      pallets: Math.min(20, Math.round(pallets)),
      etaMin: Math.max(0, Number(pickField(r, H.etaMin)) || 0),
      dueClock: parseClock(pickField(r, H.dueClock)),
      rush: truthy(pickField(r, H.rush)),
      plate: String(pickField(r, H.plate) ?? '').trim() || undefined,
      driver: String(pickField(r, H.driver) ?? '').trim() || undefined,
      carrier: String(pickField(r, H.carrier) ?? '').trim() || undefined,
      destination: String(pickField(r, H.destination) ?? '').trim() || undefined,
      source: 'excel',
    });
  }
  return { orders, skipped };
}

export const TEMPLATE_ROWS = [
  ['倉庫 Warehouse', '類型 Type', '客戶 Customer', '棧板數 Pallets', '抵達(分鐘) ETA', '截止時間 Due', '急單 Rush', '車牌 Plate', '司機 Driver', '目的地 Destination'],
  ['WH-04', '入庫', '全聯福利中心', 6, 5, '10:15', '', 'ABC-1234', '王小明', ''],
  ['WH-04', '出貨', '家樂福', 4, 10, '10:30', '是', 'XYZ-5678', '李大華', '家樂福 桃園店'],
  ['WH-04', 'inbound', 'Oakridge Market', 5, 15, '10:45', '', '', '', ''],
  ['WH-01', '入庫', '台積電', 8, 3, '10:05', '', 'TSM-0001', '陳志明', ''],
  ['WH-01', '出貨', 'Lotus Electronics', 5, 8, '10:25', 'yes', '', '', 'TPE Air Cargo'],
  ['WH-07', '入庫', '統一超商', 6, 6, '10:20', '', '', '', ''],
  ['WH-07', 'outbound', 'Metro Grocers', 3, 12, '10:50', '', '', '', 'Metro Store #3'],
];

export function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet(TEMPLATE_ROWS);
  ws['!cols'] = TEMPLATE_ROWS[0].map(() => ({ wch: 16 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Orders');
  XLSX.writeFile(wb, 'waretrack-orders-template.xlsx');
}

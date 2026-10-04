// Lightweight i18n: Traditional Chinese (zh) + English (en).
export type Lang = 'zh' | 'en';
type Dict = Record<string, string>;
type P = Record<string, string | number | boolean> | undefined;

const en: Dict = {
  // top bar
  search: 'Search trucks, forklifts, docks, orders…',
  full: '{pct}% full · {docked}/{docks} docked',
  live: 'Live', demo: 'Demo', pause: 'Pause', sim: 'Sim',
  autoDock: 'Auto-assign docks', autoForklift: 'Auto-dispatch forklifts', randomEvents: 'Random events', autoSpawn: 'Auto-generate trucks',
  rushBtn: '+ Rush order', reset: 'Reset', eventLog: 'Event log',
  managerName: 'IBM Austin Huang', managerRole: 'Operations Manager',
  switchWarehouse: 'Switch warehouse', orders: 'Orders',
  // kpi
  kpiStock: 'Stock on hand', kpiStockSub: 'pallets · {wh}',
  kpiTrucks: 'Trucks on site', kpiTrucksSub: '{inb} inbound · {route} en route',
  kpiOnTime: 'On-time delivery', kpiOnTimeSub: '{a}/{b} shipments', onTarget: '● on target', belowTarget: '● below 95%',
  kpiUtil: 'Dock utilization', kpiUtilSub: 'score {score} pts',
  // statuses
  st_transit: 'In transit', st_arriving: 'Arriving', st_waiting: 'Waiting', st_docking: 'Docking', st_departing: 'Departing',
  st_departed: 'Departed', st_unloading: 'Unloading', st_loading: 'Loading', st_manual: 'Manual drive',
  inbound: 'Inbound', outbound: 'Outbound', rush: 'RUSH', delayed: 'Delayed',
  fl_idle: 'Idle', fl_toPickup: 'To pickup', fl_handling: 'Handling', fl_toDrop: 'Delivering', fl_returning: 'Returning', busy: 'Busy',
  available: 'Available', occupied: 'Occupied', faultSt: 'Fault', outOfService: 'Out of service',
  // stages
  'Order Confirmed': 'Order Confirmed', Picked: 'Picked', Loaded: 'Loaded', 'In Transit': 'In Transit',
  Unloading: 'Unloading', Staged: 'Staged', Loading: 'Loading', Departed: 'Departed',
  // detail
  carrierTruck: 'Truck', forklift: 'Forklift', loadingDock: 'Loading dock', shipment: 'Shipment',
  customer: 'Customer', destination: 'Destination', eta: 'ETA', estFinish: 'Est. finish', doneIn: 'Done in {min} min',
  due: 'Due', speed: 'Speed', bay: 'Bay', cargo: 'Cargo', cargoV: '{done}/{total} pallets moved · {tons} t',
  forklifts: 'Forklifts', forkliftsWorking: '{n} working', yard: 'Yard {n}', min: '{n} min',
  assignToDock: 'Assign to dock (or drag the truck in 3D)', noCompatibleDock: 'No compatible dock free',
  currentTask: 'Current task', carrying: 'Carrying pallet', toPickupTask: 'Heading to pickup', palletsMoved: 'Pallets moved',
  battery: 'Battery', position: 'Position', dedicate: 'Dedicate to truck', auto: 'Auto', manual: 'Manual', autoDispatch: 'Auto dispatch',
  truck: 'Truck', noTruck: 'No truck assigned', progress: 'Progress', palletsV: '{done}/{total} pallets',
  backInService: 'Back in service', dispatchRepair: 'Dispatch maintenance (−20 pts)', assignWaiting: 'Assign a waiting truck',
  noWaiting: 'No compatible truck waiting', inbDock: 'Inbound dock', outDock: 'Outbound dock',
  deliveredOnTime: 'Delivered on time', deliveredLate: 'Delivered late', inProgress: 'In progress', type: 'Type',
  focus: 'Focus', close: 'Close', deleteOrder: 'Delete order',
  // drive
  drive: 'Drive manually', stopDrive: 'Release control', driving: 'Driving {truck}',
  driveHelp: 'W/S or ↑/↓ throttle · A/D or ←/→ steer · Space brake · Esc release. Stop on a dock pad to dock.',
  cantDrive: 'Only trucks waiting, arriving or docking can be driven',
  // timeline
  shipmentTracking: 'Shipment Tracking', to: 'To', etaAt: 'ETA {t}',
  // dock list
  docksTab: 'Docks', forkliftsTab: 'Forklifts', trucksTab: 'Trucks', doorFault: 'Door fault', fetching: 'Fetching', carryingShort: 'Carrying',
  tip: 'Tip: drag a waiting truck (3D or Trucks tab) onto a dock, or select a truck and drive it.',
  palletsN: '{n} pallets',
  // orders
  ordersTitle: 'Orders · {wh}', newOrder: 'New order', importExcel: 'Import Excel', template: 'Download template',
  colOrder: 'Order', colType: 'Type', colCustomer: 'Customer', colPallets: 'Pallets', colDue: 'Due', colStatus: 'Status', colTruck: 'Truck',
  fCustomer: 'Customer', fType: 'Type', fPallets: 'Pallets', fEta: 'Arrives in (min)', fDue: 'Due time (HH:MM, optional)',
  fRush: 'Rush order', fDestination: 'Destination (optional)', fWarehouse: 'Warehouse', create: 'Create', cancel: 'Cancel',
  confirmDelete: 'Delete order {ship} and its truck?', noOrders: 'No orders', active: 'Active', completed: 'Completed',
  replaceOrders: 'Replace existing orders (clear queue & stop random trucks)',
  importHelp: 'Columns: Warehouse, Type (inbound/outbound), Customer, Pallets, ETA (min), Due (HH:MM), Rush, Plate, Driver, Destination. Chinese headers also work.',
  imported: 'Imported {n} orders', importFailed: 'Could not read file: {err}', importSkipped: '{n} rows skipped',
  src_seed: 'Seed', src_auto: 'Auto', src_manual: 'Manual', src_excel: 'Excel', src_rush: 'Rush',
  all: 'All',
  // scene
  yardLbl: 'YARD {n}', dragHint: 'drag to a dock ↗', storageLbl: 'STORAGE · {n} PALLETS', faultLbl: '⚠ FAULT',
  paused: 'Simulation paused — resume', loading3d: 'Loading 3D scene…',
  // events
  shiftStart: 'Shift started · Demo simulation running',
  assigned: '{truck} assigned to {dock}', assignedShort: '{truck} → {dock}',
  forkliftPinned: '{f} dedicated to {truck}', forkliftAuto: '{f} back to auto dispatch', forkliftUpdated: 'Forklift updated',
  repairDispatched: 'Maintenance crew dispatched to {dock} (−20 pts)',
  rushEv: 'Rush order! {truck} (outbound, {n} pallets) — tight deadline', fault: '{dock} door fault — dock out of service',
  delay: '{truck} delayed by traffic (+{min} min)', doneOnTime: '{ship} completed on time (+100)',
  doneRush: '{ship} completed on time · rush bonus (+250)', doneLate: '{ship} completed late (−50)',
  arrived: '{truck} arrived at gate', arrivedRush: '{truck} arrived at gate (RUSH)',
  dockedUnload: '{truck} docked · unloading started', dockedLoad: '{truck} docked · loading started',
  repaired: '{dock} repaired and back in service', dispatchedIn: '{truck} dispatched (inbound, ETA {min} min)',
  dispatchedOut: '{truck} dispatched (outbound, ETA {min} min)', orderAdded: 'Order {ship} created ({truck})',
  orderDeleted: 'Order {ship} deleted', importEv: '{n} orders imported from Excel', driveParked: '{truck} parked',
  driveStart: 'You are driving {truck}',
  errUnknown: 'Unknown truck or dock', errNotWaiting: '{truck} is not waiting in the yard', errDockFault: '{dock} is out of service',
  errDockOccupied: '{dock} is occupied', errNeedIn: 'Inbound trucks need an In dock', errNeedOut: 'Outbound trucks need an Out dock',
  errBadRequest: 'Bad request', raw: '{text}',
};

const zh: Dict = {
  search: '搜尋卡車、堆高機、碼頭、訂單…',
  full: '使用率 {pct}% · 已靠 {docked}/{docks}',
  live: '即時', demo: '模擬', pause: '暫停', sim: '模擬設定',
  autoDock: '自動分配碼頭', autoForklift: '堆高機自動調度', randomEvents: '隨機事件', autoSpawn: '自動產生卡車',
  rushBtn: '+ 插入急單', reset: '重設', eventLog: '事件紀錄',
  managerName: 'IBM Austin Huang', managerRole: '營運經理',
  switchWarehouse: '切換倉庫', orders: '訂單',
  kpiStock: '庫存量', kpiStockSub: '棧板 · {wh}',
  kpiTrucks: '場內卡車', kpiTrucksSub: '{inb} 台入庫 · {route} 台在途',
  kpiOnTime: '準時交貨率', kpiOnTimeSub: '{a}/{b} 筆出貨', onTarget: '● 達標', belowTarget: '● 低於 95%',
  kpiUtil: '碼頭使用率', kpiUtilSub: '分數 {score}',
  st_transit: '運輸中', st_arriving: '進場中', st_waiting: '等候中', st_docking: '靠碼頭中', st_departing: '離場中',
  st_departed: '已離場', st_unloading: '卸貨中', st_loading: '裝貨中', st_manual: '手動駕駛',
  inbound: '入庫', outbound: '出貨', rush: '急單', delayed: '延誤',
  fl_idle: '閒置', fl_toPickup: '前往取貨', fl_handling: '裝卸中', fl_toDrop: '運送中', fl_returning: '返回中', busy: '作業中',
  available: '可用', occupied: '使用中', faultSt: '故障', outOfService: '停用中',
  'Order Confirmed': '訂單確認', Picked: '揀貨', Loaded: '裝車', 'In Transit': '運輸中',
  Unloading: '卸貨', Staged: '備貨', Loading: '裝貨', Departed: '已出車',
  carrierTruck: '卡車', forklift: '堆高機', loadingDock: '裝卸碼頭', shipment: '出貨單',
  customer: '客戶', destination: '目的地', eta: '預計抵達', estFinish: '預計完成', doneIn: '約 {min} 分鐘後完成',
  due: '截止時間', speed: '速度', bay: '位置', cargo: '貨物', cargoV: '已搬 {done}/{total} 板 · {tons} 噸',
  forklifts: '堆高機', forkliftsWorking: '{n} 台作業中', yard: '等候區 {n}', min: '{n} 分鐘',
  assignToDock: '指派碼頭（或在 3D 中拖曳卡車）', noCompatibleDock: '沒有可用的對應碼頭',
  currentTask: '目前任務', carrying: '搬運棧板中', toPickupTask: '前往取貨', palletsMoved: '已搬運棧板',
  battery: '電量', position: '座標', dedicate: '指定服務卡車', auto: '自動', manual: '手動', autoDispatch: '自動調度',
  truck: '卡車', noTruck: '無卡車', progress: '進度', palletsV: '{done}/{total} 板',
  backInService: '預計修復', dispatchRepair: '派員維修（−20 分）', assignWaiting: '指派等候中的卡車',
  noWaiting: '沒有對應的等候卡車', inbDock: '入庫碼頭', outDock: '出貨碼頭',
  deliveredOnTime: '準時完成', deliveredLate: '延遲完成', inProgress: '進行中', type: '類型',
  focus: '聚焦', close: '關閉', deleteOrder: '刪除訂單',
  drive: '手動駕駛', stopDrive: '結束駕駛', driving: '駕駛中：{truck}',
  driveHelp: 'W/S 或 ↑/↓ 油門 · A/D 或 ←/→ 轉向 · 空白鍵煞車 · Esc 結束。停在碼頭區塊上即可靠站。',
  cantDrive: '只有等候中、進場中或靠碼頭中的卡車可以手動駕駛',
  shipmentTracking: '出貨追蹤', to: '送往', etaAt: '預計 {t}',
  docksTab: '碼頭', forkliftsTab: '堆高機', trucksTab: '卡車', doorFault: '門故障', fetching: '取貨中', carryingShort: '搬運中',
  tip: '提示：把等候中的卡車（3D 或「卡車」分頁）拖到碼頭；或選取卡車後手動駕駛。',
  palletsN: '{n} 板',
  ordersTitle: '訂單管理 · {wh}', newOrder: '新增訂單', importExcel: '匯入 Excel', template: '下載範本',
  colOrder: '訂單', colType: '類型', colCustomer: '客戶', colPallets: '棧板', colDue: '截止', colStatus: '狀態', colTruck: '卡車',
  fCustomer: '客戶名稱', fType: '類型', fPallets: '棧板數', fEta: '幾分鐘後抵達', fDue: '截止時間（HH:MM，可留空）',
  fRush: '急單', fDestination: '目的地（可留空）', fWarehouse: '倉庫', create: '建立', cancel: '取消',
  confirmDelete: '確定刪除訂單 {ship} 及其卡車？', noOrders: '沒有訂單', active: '進行中', completed: '已完成',
  replaceOrders: '取代現有訂單（清空佇列並停止自動產生卡車）',
  importHelp: '欄位：倉庫、類型（入庫/出貨）、客戶、棧板數、抵達(分鐘)、截止時間(HH:MM)、急單、車牌、司機、目的地。英文欄位名稱也可以。',
  imported: '已匯入 {n} 筆訂單', importFailed: '無法讀取檔案：{err}', importSkipped: '略過 {n} 列',
  src_seed: '初始', src_auto: '自動', src_manual: '手動', src_excel: 'Excel', src_rush: '急單',
  all: '全部',
  yardLbl: '等候區 {n}', dragHint: '拖曳到碼頭 ↗', storageLbl: '儲區 · {n} 板', faultLbl: '⚠ 故障',
  paused: '模擬已暫停 — 繼續', loading3d: '載入 3D 場景中…',
  shiftStart: '班次開始 · 模擬運行中',
  assigned: '{truck} 已指派至 {dock}', assignedShort: '{truck} → {dock}',
  forkliftPinned: '{f} 專責服務 {truck}', forkliftAuto: '{f} 恢復自動調度', forkliftUpdated: '堆高機已更新',
  repairDispatched: '已派員維修 {dock}（−20 分）',
  rushEv: '急單！{truck}（出貨 {n} 板）— 期限很趕', fault: '{dock} 門故障 — 碼頭停用',
  delay: '{truck} 因塞車延誤（+{min} 分鐘）', doneOnTime: '{ship} 準時完成（+100）',
  doneRush: '{ship} 準時完成 · 急單加分（+250）', doneLate: '{ship} 延遲完成（−50）',
  arrived: '{truck} 已抵達大門', arrivedRush: '{truck} 已抵達大門（急單）',
  dockedUnload: '{truck} 已靠站 · 開始卸貨', dockedLoad: '{truck} 已靠站 · 開始裝貨',
  repaired: '{dock} 已修復，恢復使用', dispatchedIn: '{truck} 已發車（入庫，約 {min} 分鐘抵達）',
  dispatchedOut: '{truck} 已發車（出貨，約 {min} 分鐘抵達）', orderAdded: '已建立訂單 {ship}（{truck}）',
  orderDeleted: '已刪除訂單 {ship}', importEv: '已從 Excel 匯入 {n} 筆訂單', driveParked: '{truck} 已停車',
  driveStart: '你正在駕駛 {truck}',
  errUnknown: '找不到卡車或碼頭', errNotWaiting: '{truck} 不在等候區', errDockFault: '{dock} 停用中',
  errDockOccupied: '{dock} 已有卡車', errNeedIn: '入庫卡車需要入庫碼頭', errNeedOut: '出貨卡車需要出貨碼頭',
  errBadRequest: '請求錯誤', raw: '{text}',
};

const DICTS: Record<Lang, Dict> = { en, zh };

// The "rush" event code collides with the "rush" badge label, so events use rushEv.
const EVENT_ALIAS: Record<string, string> = { rush: 'rushEv' };

export function translate(lang: Lang, key: string, params?: P): string {
  let s = DICTS[lang][key] ?? DICTS.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      const val = typeof v === 'string' && (k === 'dock') ? dockName(lang, v) : String(v);
      s = s.replaceAll(`{${k}}`, val);
    }
  }
  return s;
}

export function eventText(lang: Lang, code: string, params?: P): string {
  let k = EVENT_ALIAS[code] ?? code;
  if (code === 'arrived' && params?.rush) k = 'arrivedRush';
  return translate(lang, k, params);
}

/** "In 2" → "入庫 2", "Out 1" → "出貨 1" */
export function dockName(lang: Lang, name: string): string {
  if (lang === 'en') return name;
  return name.replace(/^In /, '入庫 ').replace(/^Out /, '出貨 ');
}

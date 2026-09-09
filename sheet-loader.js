// Live Google-Sheets loader for the RL prototype.
// Fetches each tab as CSV from the shared sheet, parses, and shapes it into
// the same structure as the bundled data/game-data.js. CORS-enabled via the
// gviz endpoint (works for link-shared sheets).

import { DATA as BUNDLE } from './data/game-data.js?v=val3';

// 탭 이름 → shape() 결과 필드. 선택 탭이 실패했을 때 번들 값으로 메꾸는 데 쓴다.
const TAB_FIELD = { Config:'config', PrimaryStat:'primaryStats', SecondaryStat:'secondaryStats',
  StatusEffect:'statusEffects', WeaponAttribute:'weaponAttributes', Weapon:'weapons', Armor:'armor',
  Item:'items', Valuable:'valuables', Monster:'monsters', City:'cities', Zone:'zones', Vendor:'vendors',
  Shop:'shops', LootTable:'lootTable', Accessory:'artifacts', Talisman:'talismans', Bag:'bags',
  Affix:'affixes', SpawnTable:'spawnTable', CombatLog:'combatLog', USB:'usb', ColdData:'coldData',
  NpcDialogue:'npcDialogue', UIString:'ui', Liquor:'liquor', Module:'modules', LootGroup:'lootGroups',
  LootGroupItem:'lootGroupItems', Tip:'tips', Facility:'facilities', Blueprint:'blueprints', Quest:'quests' };

export const SHEET_ID = '1d-LNhcuFo1dKO1zzszDNAXXT-zDqffatr1aCe3yB8ls';
export const TABS = ['Config','PrimaryStat','SecondaryStat','StatusEffect','WeaponAttribute',
  'Weapon','Armor','Item','Valuable','Monster','City','Zone','Vendor','Shop','LootTable','Accessory','Talisman','Bag','Affix','SpawnTable','CombatLog',
  'USB','ColdData','NpcDialogue','UIString',
  'Liquor','Module','LootGroup','LootGroupItem','Tip','Facility','Blueprint','Quest'];
// tabs that may not exist yet in older sheets — a failed fetch is non-fatal
const OPTIONAL_TABS = new Set(['USB','ColdData','NpcDialogue','UIString','Liquor','Module','LootGroup','LootGroupItem','Talisman','Bag','Tip','Valuable','Facility','Blueprint','Quest']);

// --- RFC4180-ish CSV parser (handles quoted commas + newlines) ---
export function parseCSV(text) {
  const rows = []; let row = [], field = '', i = 0, inq = false;
  while (i < text.length) {
    const c = text[i];
    if (inq) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } inq = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { inq = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Stable gid map for this workbook (fallback if live discovery fails).
export const GIDS = {
  Config:'618819984', PrimaryStat:'1912326207', SecondaryStat:'1392044965', WeaponAttribute:'1086480785',
  StatusEffect:'669993744', Affix:'1902981873', Accessory:'876429288', Talisman:'1967199186', Shop:'543913112', Item:'799451703',
  City:'1696147459', Zone:'761789751', Vendor:'259794886', Monster:'1464124612', Weapon:'1482785136',
  Armor:'540890839', All_IDs:'220464388', LootTable:'290666291'
};

// ⚠️ 타임아웃 없이 fetch하면 구글이 429로 조여도 응답을 안 줘 부팅이 99%에서 영원히 멈춘다(실기 재현).
// AbortController로 끊어 예외를 만들고, 호출부의 기존 폴백(캐시 → 번들)이 받게 한다.
const FETCH_TIMEOUT_MS = 10000;
async function fetchT(url, opts){
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  try { return await fetch(url, { ...(opts||{}), signal: ac.signal }); }
  finally { clearTimeout(t); }
}

// Discover the name->gid map live (so added/renamed tabs still work); fall back to GIDS.
export async function fetchGidMap(id = SHEET_ID) {
  try {
    const r = await fetchT(`https://docs.google.com/spreadsheets/d/${id}/htmlview?_=${Date.now()}`, { mode:'cors', cache:'no-store' });
    const t = await r.text();
    const map = {};
    for (const m of t.matchAll(/\{name:\s*"([^"]+)",\s*pageUrl:\s*"([^"]+)"/g)) {
      const gid = (m[2].match(/gid=(\d+)/) || [])[1];
      if (gid) map[m[1]] = gid;
    }
    return Object.keys(map).length ? { ...GIDS, ...map } : { ...GIDS };
  } catch (_) { return { ...GIDS }; }
}

// /export?format=csv exports DISPLAYED values verbatim (no per-column type inference,
// unlike gviz which nulls text cells in a numeric column). &_=<ts> busts caches.
function tabUrl(id, gid) {
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}&_=${Date.now()}`;
}

// fetch every tab in parallel -> { tabName: rows[][] }
export async function fetchAllTabs(id = SHEET_ID) {
  const gidMap = await fetchGidMap(id);
  const out = {};
  const skipped = [];
  await Promise.all(TABS.map(async tab => {
    const gid = gidMap[tab];
    if (gid == null) { skipped.push(tab); return; }
    try {
      const r = await fetchT(tabUrl(id, gid), { mode: 'cors', cache: 'no-store' });
      if (!r.ok) throw new Error(tab + ' HTTP ' + r.status);
      out[tab] = parseCSV(await r.text());
    } catch (e) {
      // ⚠️ 선택 탭이라도 '조용히 빈 채로' 두면 안 된다 — UIString 하나가 빠지면
      //    화면 전체가 키 문자열(hide_disk_close…)로 뜬다(2026-09-07 실제 발생).
      //    스킵 목록을 넘겨 shape()가 번들 값으로 메꾸게 한다.
      if (OPTIONAL_TABS.has(tab)) { console.warn('optional tab skipped:', tab, e); skipped.push(tab); return; }
      throw e;
    }
  }));
  out.__skipped = skipped;
  return out;
}

// --- shape raw rows into DATA (mirrors data/game-data.js generator) ---
const coerce = v => (v !== '' && v != null && !isNaN(Number(v)) ? Number(v) : v);
function toObjs(rows) {
  if (!rows || !rows.length) return [];
  const header = rows[0].map(h => (h || '').trim());
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]; if (!r || !r.some(c => c && String(c).trim())) continue;
    const o = {}; header.forEach((h, j) => { if (h) o[h] = coerce((r[j] ?? '').toString().trim()); });
    out.push(o);
  }
  return out;
}
const pfx = (arr, key, p) => arr.filter(r => String(r[key] || '').startsWith(p));

export function shape(rowsByTab) {
  const config = {};
  toObjs(rowsByTab.Config).forEach(r => { if (r.Key) config[r.Key] = r.Value; });
  const shaped = {
    config,
    primaryStats: pfx(toObjs(rowsByTab.PrimaryStat), 'PrimaryStatID', 'stat_'),
    secondaryStats: pfx(toObjs(rowsByTab.SecondaryStat), 'SecondaryStatID', 'sec_'),
    statusEffects: pfx(toObjs(rowsByTab.StatusEffect), 'StatusID', 'status_'),
    weaponAttributes: toObjs(rowsByTab.WeaponAttribute).filter(r => String(r.AttributeID || '').trim()),
    weapons: pfx(toObjs(rowsByTab.Weapon), 'WeaponID', 'weapon_'),
    armor: pfx(toObjs(rowsByTab.Armor), 'ArmorID', 'armor_'),
    items: pfx(toObjs(rowsByTab.Item), 'ItemID', 'item_'),
    valuables: pfx(toObjs(rowsByTab.Valuable || []), 'ValuableID', 'item_'),
    monsters: pfx(toObjs(rowsByTab.Monster), 'MonsterID', 'monster_'),
    cities: pfx(toObjs(rowsByTab.City), 'CityID', 'city_'),
    zones: pfx(toObjs(rowsByTab.Zone), 'ZoneID', 'city_'),
    vendors: pfx(toObjs(rowsByTab.Vendor), 'VendorID', 'vendor_'),
    shops: pfx(toObjs(rowsByTab.Shop), 'ShopID', 'shop_'),
    lootTable: toObjs(rowsByTab.LootTable).map(r => (r.ItemID ? r : { ...r, ItemID: r.itemID })).filter(r => String(r.MonsterID || '').startsWith('monster_') && r.ItemID),
    spawnTable: toObjs(rowsByTab.SpawnTable || []).filter(r => String(r.ZoneID || '').startsWith('city_') && String(r.MonsterID || '').startsWith('monster_')),
    artifacts: toObjs(rowsByTab.Accessory || []),
    talismans: toObjs(rowsByTab.Talisman || []).filter(r => String(r.TalismanID || '').trim()),
    bags: toObjs(rowsByTab.Bag || []).filter(r => String(r.BagID || '').trim()),
    affixes: toObjs(rowsByTab.Affix || []).filter(r => String(r.AffixID || '').trim()),
    combatLog: toObjs(rowsByTab.CombatLog || []).filter(r => String(r.LineID || '').trim()),
    ui: toObjs(rowsByTab.UIString || []).filter(r => String(r.StringID || '').trim()),
    usb: toObjs(rowsByTab.USB || []).filter(r => String(r.USBID || '').trim()),
    coldData: toObjs(rowsByTab.ColdData || []).filter(r => String(r.ColdDataID || r.ID || '').trim()),
    npcDialogue: toObjs(rowsByTab.NpcDialogue || []).filter(r => String(r.DialogueID || '').trim()),
    liquor: toObjs(rowsByTab.Liquor || []).filter(r => String(r.LiquorID || '').trim()),
    modules: toObjs(rowsByTab.Module || []).filter(r => String(r.ModuleID || '').trim()),
    lootGroups: toObjs(rowsByTab.LootGroup || []).filter(r => String(r.GroupID || '').trim()),
    lootGroupItems: toObjs(rowsByTab.LootGroupItem || []).filter(r => String(r.GroupID || '').trim() && String(r.MemberItemID || '').trim()),
    tips: toObjs(rowsByTab.Tip || []).filter(r => String(r.TipID || '').trim() && String(r.Status || '').toLowerCase() !== 'cut'),
    facilities: toObjs(rowsByTab.Facility || []).filter(r => String(r.FacilityLevelID || '').trim()),
    blueprints: toObjs(rowsByTab.Blueprint || []).filter(r => String(r.BlueprintID || '').trim()),
    quests: toObjs(rowsByTab.Quest || []).filter(r => String(r.QuestID || '').trim()),
  };
  // 못 받은 탭은 번들 값으로 메꾼다 — 텍스트·전투로그처럼 비면 화면이 깨지는 탭이 있다.
  const skipped = (rowsByTab && rowsByTab.__skipped) || [];
  for (const tab of skipped) {
    const f = TAB_FIELD[tab];
    if (!f || !BUNDLE[f]) continue;
    const cur = shaped[f];
    const empty = Array.isArray(cur) ? !cur.length : !cur || !Object.keys(cur).length;
    if (empty) shaped[f] = BUNDLE[f];
  }
  shaped.__skipped = skipped;
  return shaped;
}

// 귀중품(Valuable 탭)은 열 이름이 Item 탭과 다르다(ValuableID/Name_KR/Description_KR).
// 여기서 Item 스키마로 정규화해 byId.item에 합쳐두면 이름·설명·카테고리 조회가
// 기존 아이템과 똑같이 동작한다 — 렌더러 쪽 조회 체인을 건드릴 필요가 없다.
// SellPrice는 일부러 넣지 않는다: 흥정(전당포) 전까지 판매 대상이 아니다.
export function asItemRow(v) {
  return { ...v, ItemID: v.ValuableID, ItemName_KR: v.Name_KR, ItemName_EN: v.Name_EN,
    Description: v.Description_KR, Description_EN: v.Description_EN,
    Category: 'Valuable', MaxStack: 1 };
}

// 도면(Blueprint)을 Item 스키마로 정규화 — 이름·설명·카테고리 조회가 일반 아이템과 똑같이 동작한다.
// ⚠️ 설치·제작 정보(InstallMinutes·OutputItemID·Inputs)는 여기 담지 않는다. 그건 byId.blueprint가 갖는다.
export function bpAsItemRow(b) {
  return { ...b, ItemID: b.BlueprintID, ItemName_KR: b.Name_KR, ItemName_EN: b.Name_EN,
    Category: 'Blueprint', MaxStack: 1 };
}

export function buildIndex(DATA) {
  const valuables = (DATA.valuables || []).map(asItemRow);
  const blueprints = (DATA.blueprints || []).map(bpAsItemRow);
  const byId = {
    item: Object.fromEntries([...DATA.items, ...valuables, ...blueprints].map(x => [x.ItemID, x])),
    blueprint: Object.fromEntries((DATA.blueprints || []).map(x => [x.BlueprintID, x])),
    valuable: Object.fromEntries(valuables.map(x => [x.ItemID, x])),
    weapon: Object.fromEntries(DATA.weapons.map(x => [x.WeaponID, x])),
    armor: Object.fromEntries(DATA.armor.map(x => [x.ArmorID, x])),
    monster: Object.fromEntries(DATA.monsters.map(x => [x.MonsterID, x])),
    artifact: Object.fromEntries((DATA.artifacts || []).map(x => [x.AccessoryID, x])),
    talisman: Object.fromEntries((DATA.talismans || []).map(x => [x.TalismanID, x])),
    bag: Object.fromEntries((DATA.bags || []).map(x => [x.BagID, x])),
    zone: Object.fromEntries(DATA.zones.map(x => [x.ZoneID, x])),
    city: Object.fromEntries(DATA.cities.map(x => [x.CityID, x])),
    vendor: Object.fromEntries(DATA.vendors.map(x => [x.VendorID, x])),
    status: Object.fromEntries(DATA.statusEffects.map(x => [x.Attribute, x])),
    usb: Object.fromEntries((DATA.usb || []).map(x => [x.USBID, x])),
    liquor: Object.fromEntries((DATA.liquor || []).map(x => [x.LiquorID, x])),
    module: Object.fromEntries((DATA.modules || []).map(x => [x.ModuleID, x])),
    lootGroup: Object.fromEntries((DATA.lootGroups || []).map(x => [x.GroupID, x])),
    facility: Object.fromEntries((DATA.facilities || []).map(x => [x.FacilityLevelID, x])),
    quest: Object.fromEntries((DATA.quests || []).map(x => [x.QuestID, x])),
  };
  return { byId };
}

// Live Google-Sheets loader for the RL prototype.
// Fetches each tab as CSV from the shared sheet, parses, and shapes it into
// the same structure as the bundled data/game-data.js. CORS-enabled via the
// gviz endpoint (works for link-shared sheets).

export const SHEET_ID = '1d-LNhcuFo1dKO1zzszDNAXXT-zDqffatr1aCe3yB8ls';
export const TABS = ['Config','PrimaryStat','SecondaryStat','StatusEffect','WeaponAttribute',
  'Weapon','Armor','Item','Monster','City','Zone','Vendor','Shop','LootTable','Artifact','Affix','SpawnTable','CombatLog',
  'USB','ColdData','NpcDialogue','UIString'];
// tabs that may not exist yet in older sheets — a failed fetch is non-fatal
const OPTIONAL_TABS = new Set(['USB','ColdData','NpcDialogue','UIString']);

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
  StatusEffect:'669993744', Affix:'1902981873', Artifact:'876429288', Shop:'543913112', Item:'799451703',
  City:'1696147459', Zone:'761789751', Vendor:'259794886', Monster:'1464124612', Weapon:'1482785136',
  Armor:'540890839', All_IDs:'220464388', LootTable:'290666291'
};

// Discover the name->gid map live (so added/renamed tabs still work); fall back to GIDS.
export async function fetchGidMap(id = SHEET_ID) {
  try {
    const r = await fetch(`https://docs.google.com/spreadsheets/d/${id}/htmlview?_=${Date.now()}`, { mode:'cors', cache:'no-store' });
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
  await Promise.all(TABS.map(async tab => {
    const gid = gidMap[tab];
    if (gid == null) return;
    try {
      const r = await fetch(tabUrl(id, gid), { mode: 'cors', cache: 'no-store' });
      if (!r.ok) throw new Error(tab + ' HTTP ' + r.status);
      out[tab] = parseCSV(await r.text());
    } catch (e) {
      if (OPTIONAL_TABS.has(tab)) { console.warn('optional tab skipped:', tab, e); return; }
      throw e;
    }
  }));
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
  return {
    config,
    primaryStats: pfx(toObjs(rowsByTab.PrimaryStat), 'PrimaryStatID', 'stat_'),
    secondaryStats: pfx(toObjs(rowsByTab.SecondaryStat), 'SecondaryStatID', 'sec_'),
    statusEffects: pfx(toObjs(rowsByTab.StatusEffect), 'StatusID', 'status_'),
    weaponAttributes: toObjs(rowsByTab.WeaponAttribute).filter(r => r.AttributeName_EN && r.StatusEffect_KR),
    weapons: pfx(toObjs(rowsByTab.Weapon), 'WeaponID', 'weapon_'),
    armor: pfx(toObjs(rowsByTab.Armor), 'ArmorID', 'armor_'),
    items: pfx(toObjs(rowsByTab.Item), 'ItemID', 'item_'),
    monsters: pfx(toObjs(rowsByTab.Monster), 'MonsterID', 'monster_'),
    cities: pfx(toObjs(rowsByTab.City), 'CityID', 'city_'),
    zones: pfx(toObjs(rowsByTab.Zone), 'ZoneID', 'city_'),
    vendors: pfx(toObjs(rowsByTab.Vendor), 'VendorID', 'vendor_'),
    shops: pfx(toObjs(rowsByTab.Shop), 'ShopID', 'shop_'),
    lootTable: toObjs(rowsByTab.LootTable).filter(r => String(r.MonsterID || '').startsWith('monster_') && r.ItemID),
    spawnTable: toObjs(rowsByTab.SpawnTable || []).filter(r => String(r.ZoneID || '').startsWith('city_') && String(r.MonsterID || '').startsWith('monster_')),
    artifacts: toObjs(rowsByTab.Artifact || []),
    affixes: toObjs(rowsByTab.Affix || []).filter(r => String(r.AffixID || '').trim()),
    combatLog: toObjs(rowsByTab.CombatLog || []).filter(r => String(r.LineID || '').trim()),
    ui: toObjs(rowsByTab.UIString || []).filter(r => String(r.StringID || '').trim()),
    usb: toObjs(rowsByTab.USB || []).filter(r => String(r.USBID || '').trim()),
    coldData: toObjs(rowsByTab.ColdData || []).filter(r => String(r.ColdDataID || r.ID || '').trim()),
    npcDialogue: toObjs(rowsByTab.NpcDialogue || []).filter(r => String(r.DialogueID || '').trim()),
  };
}

export function buildIndex(DATA) {
  const byId = {
    item: Object.fromEntries(DATA.items.map(x => [x.ItemID, x])),
    weapon: Object.fromEntries(DATA.weapons.map(x => [x.WeaponID, x])),
    armor: Object.fromEntries(DATA.armor.map(x => [x.ArmorID, x])),
    monster: Object.fromEntries(DATA.monsters.map(x => [x.MonsterID, x])),
    artifact: Object.fromEntries((DATA.artifacts || []).map(x => [x.ArtifactID, x])),
    zone: Object.fromEntries(DATA.zones.map(x => [x.ZoneID, x])),
    city: Object.fromEntries(DATA.cities.map(x => [x.CityID, x])),
    vendor: Object.fromEntries(DATA.vendors.map(x => [x.VendorID, x])),
    status: Object.fromEntries(DATA.statusEffects.map(x => [x.Attribute, x])),
    usb: Object.fromEntries((DATA.usb || []).map(x => [x.USBID, x])),
  };
  return { byId };
}

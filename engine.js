// RL Prototype — pure game engine. No DOM.
// Data source is swappable: starts from the bundled snapshot, can be replaced
// live via setDATA() (e.g. a fresh Google-Sheets fetch).
import { DATA as FALLBACK } from './data/game-data.js?v=val2';
import { buildIndex } from './sheet-loader.js?v=val2';

export let DATA = FALLBACK;
export let byId = buildIndex(FALLBACK).byId;
let C = DATA.config;
export function anyItem(id){ return byId.item[id] || byId.weapon[id] || byId.armor[id] || byId.artifact[id] || (byId.talisman && byId.talisman[id]) || (byId.bag && byId.bag[id]) || null; }
export function anyName(id){
  const o = anyItem(id);
  if (o){
    const base = o.ItemID ? 'ItemName' : o.WeaponID ? 'WeaponName' : o.ArmorID ? 'ArmorName' : o.TalismanID ? 'TalismanName' : o.BagID ? 'BagName' : 'AccessoryName';
    return tr(o, base) || id;
  }
  const u = (DATA.usb || []).find(x => x.USBID === id);
  if (u) return tr(u, 'Name') || id;
  const lq = byId.liquor && byId.liquor[id];
  if (lq) return tr(lq, 'Name') || id;
  const md = byId.module && byId.module[id];
  if (md) return tr(md, 'ColorName') || id;
  return id;
}
// swap the live data set (returns count summary)
export function setDATA(newData){
  DATA = newData; C = DATA.config; byId = buildIndex(newData).byId; invalidateUi();
  return { monsters: DATA.monsters.length, items: DATA.items.length, zones: DATA.zones.length };
}
// ---------- language (KR/EN 시트 컬럼 스위칭) ----------
export let LANG = 'kr';
export function setLang(l){ LANG = (l === 'en' ? 'en' : 'kr'); }
export function tr(row, base){
  if (!row) return '';
  const en = row[base + '_EN'];
  const kr = (row[base + '_KR'] != null && row[base + '_KR'] !== '') ? row[base + '_KR'] : row[base];
  if (LANG === 'en') return (en != null && en !== '') ? String(en) : (kr != null && kr !== '' ? String(kr) : '');
  return (kr != null && kr !== '') ? String(kr) : (en != null && en !== '' ? String(en) : '');
}
// pick(row,'Name') -> lang-appropriate Name_KR/Name_EN with KR fallback (alias of tr)
export const pick = tr;

// ---------- UI strings (UIString tab) ----------
// t(key): key may be a StringID OR a raw KR literal (reverse-indexed). Returns
// lang-appropriate Text; unknown keys pass through unchanged (dev safety).
let _uiById = null, _uiByKr = null;
function buildUiIndex(){
  _uiById = {}; _uiByKr = {};
  for (const r of (DATA.ui || [])){
    if (!r || !r.StringID) continue;
    _uiById[r.StringID] = r;
    if (r.Text_KR) _uiByKr[String(r.Text_KR)] = r;
  }
}
export function t(key){
  if (key == null || key === '') return '';
  if (!_uiById) buildUiIndex();
  const row = _uiById[key] || _uiByKr[key];
  if (!row){
    const f = V3_STRINGS[key];
    if (f) return LANG === 'en' ? f[1] : f[0];
    return String(key);
  }
  const en = row.Text_EN, kr = row.Text_KR;
  if (LANG === 'en') return (en != null && en !== '') ? String(en) : String(kr || key);
  return (kr != null && kr !== '') ? String(kr) : String(en || key);
}
// v3 built-in fallbacks — used only when the UIString tab lacks the key (sheet wins).
const V3_STRINGS = {
  appraise_tab:['감정','Appraise'], module_tab:['모듈','Modules'],
  appraise_unappraised:['미감정','Unappraised'],
  // 도주 카드 뒤집기 전 경고. 실패해도 즉시 전투가 아니라 '다음 조우 카드'로 간다(2026-08-26 도망 개편).
  combat_flee_warn:['도주 실패시 다음 전투로 강제 진입합니다.','On failure, the next encounter is forced.'],
  appraise_pick_liquor:['감정에 쓸 술을 고른다','Pick a liquor to appraise with'],
  appraise_uses:['감정 횟수','Uses'], appraise_proof_band:['도수 = 변동폭','Proof = variance'],
  appraise_no_liquor:['감정용 술이 없다 — 몬스터가 드랍한다','No liquor — monsters drop it'],
  appraise_pick_item:['감정할 아이템을 고른다','Pick an item to appraise'],
  appraise_hidden_opts:['미감정 옵션','Hidden options'],
  appraise_no_item:['감정할 미감정 아이템이 없다','No unappraised items'],
  appraise_confirm:['감정 실행 — 1회 확정','Appraise — one shot, final'],
  appraise_execute:['감정하기','Appraise'], appraise_revealed:['공개된 옵션','Revealed options'],
  marta_intro:['미감정 원석은 술로 읽는다. 뭘 마실 텐가.','Raw goods read with liquor. What will you drink.'],
  marta_pick:['어느 물건을 볼까. 한 번 열면 되돌릴 수 없다.','Which piece. Once opened, no take-backs.'],
  marta_confirm:['도수만큼 흔들린다. 각오는 됐나.','It swings with the proof. Ready.'],
  marta_done:['이게 자네가 들고 있던 물건의 정체다.','This is what you were carrying.'],
  vendor_marta_label:['마르타 콜 · 전당포','Marta Cole · Pawnshop'],
  module_intro:['소켓이 있는 장비를 가져와. 색을 박아주지.','Bring gear with sockets. I set the color.'],
  module_pick_item:['모듈을 박을 장비','Gear to socket'],
  module_no_socket_item:['소켓이 있는 장비가 없다','No gear with sockets'],
  module_pick_socket:['소켓을 고르게.','Choose a socket.'],
  module_sockets:['소켓','Sockets'], module_tap_socket:['소켓을 눌러 장착하거나 제거한다','Tap a socket to attach or remove'],
  module_installed:['장착된 모듈','Installed module'],
  module_remove_line:['빼면 부서진다. 그래도 하겠나.','Pull it and it breaks. Still.'],
  module_remove_warn:['제거하면 모듈은 즉시 파괴된다','Removing destroys the module'],
  module_remove_do:['제거 (파괴)','Remove (destroy)'],
  module_pick_module:['박을 색을 고르게.','Pick a color.'],
  module_owned:['보유 모듈','Owned modules'], module_no_owned:['맞는 모듈이 없다','No matching modules'],
  module_bind_line:['한 번 박으면 그 장비의 것이 된다.','Once set, it belongs to that gear.'],
  module_confirm:['장착 확인','Confirm attach'],
  module_bind_warn:['장착 시 이 장비에 귀속 · 분리/재활용 불가','Binds to this gear · no reuse'],
  module_attach_do:['장착','Attach'], module_attach_fail:['장착할 수 없는 소켓','Cannot attach here'],
  module_hint_red:['공격·힘 계열','Attack·STR'], module_hint_green:['방어·저항 계열','Defense·Resist'],
  module_hint_blue:['적중·민첩 계열','Accuracy·DEX'], module_hint_violet:['체력·생명 계열','Vitality·HP'],
  item_slot_weapon:['무기','Weapon'], item_slot_armor:['방어구','Armor'],
  loot_open_all:['한번에 뒤집기','Flip all'], loot_open_one:['하나씩','One by one'],
  loot_carousel:['획득 — 카드를 뒤집어 확인','Loot — flip to reveal'], loot_tap_flip:['카드를 눌러 공개','Tap card to reveal'],
  socket_label:['소켓','Socket'],
  search_failed_title:['전리품 획득 실패','No loot found'],
  search_failed_desc:['시체에서 아무것도 찾을 수 없었다.','Found nothing on the body.'],
  search_failed_cat:['실패','FAILED'],
  item_desc_label:['아이템 설명','Item description'],
  item_head:['방어구','Head'], item_body:['갑옷','Body'], item_food:['음식','Food'],
  item_junk:['정크','Junk'], item_quest:['퀘스트','Quest'], item_key:['키','Key'],
  item_accessory:['장신구','Accessory'], item_talisman:['징표','Token'], dmg_reduce:['피해 감소','Damage Reduced'], item_material_type:['재질','Material'],
  common_me:['나','Me'],
  stat_max_dur:['최대 내구도','Max Durability'], stat_growth_tags:['성장 태그','Growth Tags'],
  item_liquor:['술','Liquor'], item_module:['모듈','Module'], item_data:['데이터','Data'],
  pvp_flee_fail_loss:['도주 실패 — 착용 장비 1개가 영구 소실됐다','Flee failed — one equipped item lost forever'],
  pvp_flee_success:['도주 성공 — 무사히 벗어났다','Fled clean — got away safely'],
  pvp_win_pick_tpl:['승리 — 카드 1장 선택 · 복제 확률 {Rate}%','Win — pick 1 card · copy chance {Rate}%'],
  pvp_lose_pick_tpl:['패배 — 카드 1장 선택 · 도주 실패 확률 {Rate}%','Lose — pick 1 card · flee-fail chance {Rate}%'],
  // save system (UIString Category=save — sheet wins, these are offline fallbacks)
  save_section:['세이브','Save'],
  save_continue:['이어하기','Continue'],
  save_new_game:['처음부터','New game'],
  save_resuming:['이어하는 중','Resuming'],
  save_export:['세이브 코드 내보내기','Export save code'],
  save_import:['세이브 코드 불러오기','Import save code'],
  save_import_hint:['세이브 코드를 붙여넣으세요','Paste your save code'],
  save_import_apply:['불러오기','Load'],
  save_code_copied:['세이브 코드가 복사되었습니다','Save code copied'],
  save_code_invalid:['세이브 코드가 올바르지 않습니다','Invalid save code'],
  save_imported:['세이브를 불러왔습니다','Save loaded'],
  save_reset:['세이브 초기화','Reset save'],
  save_reset_done:['세이브를 초기화했습니다','Save reset'],
  save_autosaved:['자동 저장됨','Autosaved'],
  // toast messages (sheet UIString wins; these are offline fallbacks)
  shop_buy_done:['아이템 구매 완료','Item purchased'],
  shop_sell_done:['아이템 판매 완료','Item sold'],
  feed_done:['식사 완료','Meal served'],
  heal_recover:['생명력 회복','HP recovered'],
  stamina_recover:['스태미너 회복','Stamina recovered'],
  equip_unequip_btn:['해제','Unequip'],
};
export function invalidateUi(){ _uiById = null; _uiByKr = null; }

// affix name/target resolved lang-aware at display time (instances store affixId)
export function affixName(af){ if(!af) return ''; const row = (DATA.affixes || []).find(x => x.AffixID === af.affixId); return row ? tr(row, 'AffixName') : (af.name || ''); }
export function affixTarget(af){ if(!af) return ''; const row = (DATA.affixes || []).find(x => x.AffixID === af.affixId); return row ? tr(row, 'TargetStat') : (af.targetKr || af.target || ''); }
const N = (v, d = 0) => (v === '' || v == null || isNaN(Number(v)) ? d : Number(v));
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const R = { rand, randInt, clamp };

// a weapon/armor instance is 'functional' only while it still has durability.
// dur 0 / maxDur >=1 = 파손(broken, unusable but repairable); maxDur 0 = 파괴(destroyed).
export const functional = (inst) => !inst ? false
  : ((inst.kind !== 'weapon' && inst.kind !== 'armor') ? true : (N(inst.maxDur) > 0 && N(inst.dur) > 0));
export function itemState(inst) {
  if (!inst || (inst.kind !== 'weapon' && inst.kind !== 'armor')) return 'ok';
  if (N(inst.maxDur) <= 0) return 'destroyed'; // 파괴
  if (N(inst.dur) <= 0) return 'broken';       // 파손
  return 'ok';
}

const PRIM = { stat_str: 'str', stat_dex: 'dex', stat_vit: 'vit', stat_will: 'will' };

// ---------- starting state ----------
export function startingState() {
  const sp = String(C.start_primary_stats || '10,10,10,10').split(',').map(x => N(x, 10));
  const primary = { str: sp[0], dex: sp[1], vit: sp[2], will: sp[3] };
  const growth = {
    str: { level: sp[0], points: 0 }, dex: { level: sp[1], points: 0 },
    vit: { level: sp[2], points: 0 }, will: { level: sp[3], points: 0 },
  };
  const vaultIds = String(C.start_vault_items || 'weapon_wooden_sword,armor_cloth_hood').split(',').map(s => s.trim()).filter(Boolean);
  const vault = vaultIds.map(id => mkInstance(id));
  // auto-equip the starting weapon + head/body if present in vault
  const equip = { weapon: null, head: null, body: null, artifact1: null, artifact2: null, bag: null };
  for (const it of vault) {
    if (it.kind === 'weapon' && !equip.weapon) equip.weapon = it.uid;
    else if (it.kind === 'armor') {
      const a = byId.armor[it.id];
      if (a && a.Category === 'Head' && !equip.head) equip.head = it.uid;
      if (a && a.Category === 'Body' && !equip.body) equip.body = it.uid;
    }
    else if (it.kind === 'artifact') {
      // 장신구는 artifact1 슬롯 전용.
      if (!equip.artifact1) equip.artifact1 = it.uid;
    }
    else if (it.kind === 'talisman') {
      // 부적은 artifact2 슬롯 전용.
      if (!equip.artifact2) equip.artifact2 = it.uid;
    }
    else if (it.kind === 'bag') {
      // 가방: bag 슬롯 전용. 자동 장착 → 시작 시 배낭 용량 개방.
      if (!equip.bag) equip.bag = it.uid;
    }
  }
  return {
    sato: N(C.start_sato, 0),
    hp: null, sta: null,          // filled after derive
    primary, growth,
    vault, bag: [],               // item instances
    equip,
    sorties: 0,
    shopStock: {},                // shopId+itemId -> remaining
  };
}

let _uid = 1;
export function nextUid(){ return 'u' + (_uid++); }
// save/load support — the uid counter must survive a restore, or freshly-made
// instances re-issue uids already used by loaded items (equip slots then point wrong).
export function getUidCounter(){ return _uid; }
export function setUidCounter(n){ const v = Number(n); if (Number.isFinite(v) && v > _uid) _uid = Math.floor(v); }

// v3 appraisable option keys per kind (재질·소켓수·카테고리·상태이상종류·부여력종류 = 공개, 제외)
export const APPRAISE_OPTS = {
  weapon: ['minAtk','maxAtk','atkSpeed','accuracy','critChance','maxDur','potency'],
  armor:  ['def','evasion','statusResist','maxDur'],
};
const OPT_KR = { minAtk:'최소 공격력', maxAtk:'최대 공격력', atkSpeed:'공격 속도', accuracy:'적중률', critChance:'크리티컬 확률', maxDur:'최대 내구도', potency:'부여력', def:'방어력', evasion:'회피율', statusResist:'상태이상 저항', growthTags:'성장 태그' };
export function optKr(k){ return OPT_KR[k] || k; }
const STAT_KEYS = ['str','dex','vit','will'];

// seed the working (rolled) value for one option from the base def
function seedOpt(kind, key, w, a){
  switch(key){
    case 'minAtk': return randInt(N(w.MinAtk_Low), N(w.MinAtk_High));
    case 'maxAtk': return randInt(N(w.MaxAtk_Low), N(w.MaxAtk_High));
    case 'atkSpeed': return N(w.AttackSpeed);
    case 'accuracy': return N(w.Accuracy);
    case 'critChance': return N(w.CritChance);
    case 'potency': return N(w.Potency);
    case 'def': return randInt(N(a.Def_Low), N(a.Def_High));
    case 'evasion': return N(a.Evasion);
    case 'statusResist': return N(a.StatusResist);
    case 'maxDur': return N((w||a).MaxDurability);
  }
  return 0;
}

// 성장 태그 개수 롤 — 1개/2개 확률이 서로 독립(롤 1회로 갈라짐). 무기·투구·갑옷·장신구 공통.
// ★ 감정과 무관하다: 드랍 시점에 확정·공개된다(2026-08-25). 도수는 수치 옵션에만 작용하므로
//   성장 태그를 감정에 묶어두면 "좋은 술을 쓰면 태그가 잘 나온다"는 잘못된 학습을 부른다.
// 히든(IsHidden)·PvP(IsPvP) 존 드랍은 _rare 확률을 쓴다. 두 태그의 스탯은 각각 독립 랜덤(같은 스탯 = 1/4).
function rollGrowthTags(rare){
  const p2 = clamp(N(rare ? C.growth_tag_chance_2_rare : C.growth_tag_chance_2, rare ? 0.03 : 0.01), 0, 1);
  const p1 = clamp(N(rare ? C.growth_tag_chance_1_rare : C.growth_tag_chance_1, rare ? 0.2 : 0.15), 0, 1);
  const r = Math.random();
  const n = r < p2 ? 2 : (r < p2 + p1 ? 1 : 0);
  return Array.from({ length: n }, () => STAT_KEYS[randInt(0, 3)]);
}

// v3 instance: 베이스ID · sockets[] · unappraised[] · rolls{} · growthTags[] · dur/maxDur
export function mkInstance(id, qty = 1, opts = {}) {
  const w = byId.weapon[id], a = byId.armor[id], it = byId.item[id], af = byId.artifact[id], tal = byId.talisman && byId.talisman[id], bg = byId.bag && byId.bag[id];
  let kind = 'item', maxDur = 0;
  if (w) { kind = 'weapon'; maxDur = N(w.MaxDurability); }
  else if (a) { kind = 'armor'; maxDur = N(a.MaxDurability); }
  else if (af) { kind = 'artifact'; maxDur = N(af.MaxDurability); }
  else if (tal) { kind = 'talisman'; }   // 부적: 내구도·롤·소켓 없음. 효과 참조만 (Stage 2에서 발동)
  else if (bg) { kind = 'bag'; }          // 가방: 용량(Capacity)만. 내구도·롤 없음
  const inst = { uid: nextUid(), id, kind, qty };
  if (kind === 'weapon' || kind === 'armor' || kind === 'artifact') { inst.dur = maxDur; inst.maxDur = maxDur; }

  if (af) { // 장신구: 소켓·감정 없음. 옵션 롤 + 성장태그 랜덤(감정 없이 항상 공개)
    inst.stat1 = randInt(N(af.Value1_Low), N(af.Value1_High));
    if (af.Stat2 && af.Stat2 !== '-') inst.stat2 = randInt(N(af.Value2_Low), N(af.Value2_High));
    // 성장태그: 무기·방어구와 완전 동일한 확률(2026-08-25 통일). 예전 accessory_growth_tag_chance는 폐지.
    inst.growthTags = rollGrowthTags(opts.rareZone);
    return inst;
  }
  if (!w && !a) {
    const liq = byId.liquor[id];
    if (liq) { inst.proof = liquorProof(liq); }   // 용량(Volume) 폐지 2026-08-18 — 감정 1회 = 1병
    return inst; // plain item / liquor / module chip
  }

  const src = w || a;
  // 1) 소켓: 0~SocketMax 롤, 빈 슬롯 = null (감정 대상 아님·공개)
  const socketMax = Math.max(0, N(src.SocketMax));
  inst.socketMax = socketMax;
  inst.sockets = Array.from({ length: randInt(0, socketMax) }, () => null);
  // 2) 옵션 롤값 (미감정이어도 내부 작동)
  inst.rolls = {}; for (const k of APPRAISE_OPTS[kind]) inst.rolls[k] = seedOpt(kind, k, w, a);
  inst.maxDur = inst.rolls.maxDur; inst.dur = inst.rolls.maxDur;
  // 3) 미감정 롤: 수치 옵션마다 독립 · p = clamp(base × zoneMult, 0, 1). ★growthTags는 감정 대상이 아니다.
  const mult = N(opts.unappraisedMult, 1);
  const p = clamp(N(C.unappraised_base_chance, 0.1) * mult, 0, 1);
  inst.unappraised = APPRAISE_OPTS[kind].filter(() => Math.random() < p);
  // 4) 성장 태그 — 드랍 시 확정·공개 (장신구와 동일 규칙)
  inst.growthTags = rollGrowthTags(opts.rareZone);
  inst.appraised = inst.unappraised.length === 0;
  return inst;
}

// working value of an appraisable option (hidden ≠ inactive)
export function instOpt(inst, key){ return (inst && inst.rolls && inst.rolls[key] != null) ? inst.rolls[key] : 0; }
export function isHidden(inst, key){ return !!(inst && inst.unappraised && inst.unappraised.includes(key)); }
export function growthTagsActive(inst){ return (inst && inst.growthTags && !isHidden(inst, 'growthTags')) ? inst.growthTags : []; }

// ---------- appraisal (마르타 · 술) ----------
// 술 도수 = 개체별 ± 변동폭. 각 미감정 옵션 독립 균일랜덤 ±proof%.
// 성장 태그는 감정 대상이 아니다(드랍 시 이미 공개) — 여기서 다루지 않는다.
export function liquorProof(liq){ return rand(N(liq.ProofMin), N(liq.ProofMax)); }
export function appraise(inst, proofPct){
  if (!inst || !inst.unappraised || !inst.unappraised.length) return [];
  const changes = [];
  const f = N(proofPct) / 100;
  for (const key of inst.unappraised.slice()){
    const before = inst.rolls[key];
    const delta = before * rand(-f, f);
    let after = before + delta;
    if (key === 'maxDur') after = Math.max(1, after);
    else if (['accuracy','critChance','evasion','statusResist'].includes(key)) after = clamp(after, 0, 100);
    else after = Math.max(0, after);
    inst.rolls[key] = after;
    inst.apprDelta = inst.apprDelta || {};
    inst.apprDelta[key] = after > before ? 1 : (after < before ? -1 : 0);
    changes.push({ key, from: before, to: after });
  }
  // 감정된 최대 내구도는 rolls뿐 아니라 인스턴스 본체에도 반영해야 한다 —
  // maxDur은 전투 소모·수리·itemState가 전부 inst.maxDur을 보므로, 안 옮기면 감정 결과가 무효가 된다.
  // 내구도는 정수 단위(수리 실패 롤이 point 단위)라 반올림해서 넣는다.
  // ★현재 내구도는 클램프가 아니라 "잔량 비율 보존"으로 옮긴다. min(dur, newMax)로 두면 최대치가
  //   올라갔을 때 현재값만 뒤처져(44/50) 쓰지도 않은 장비가 닳아 보인다. 비율을 유지하면
  //   새 드랍 44/44 → 50/50, 3 닳은 물건 41/44 → 47/50, 파손 0/44 → 0/50이 된다.
  //   (마모량 보존은 파손품이 감정만으로 6/50으로 부활해 버려서 못 쓴다 — 수리를 건너뛰게 된다.)
  if (inst.unappraised.includes('maxDur')) {
    const oldMax = Math.max(1, Math.round(N(inst.maxDur)));
    const ratio = clamp(N(inst.dur) / oldMax, 0, 1);
    inst.maxDur = Math.max(1, Math.round(inst.rolls.maxDur));
    inst.dur = clamp(Math.round(inst.maxDur * ratio), 0, inst.maxDur);
  }
  inst.unappraised = [];
  inst.appraised = true;
  return changes;
}

// ---------- modules (미스터 박 · 소켓) ----------
export function moduleColorStat(mod){ return mod ? (mod.ColorFamily || '') : ''; }
export function socketFilled(inst){ return (inst && inst.sockets) ? inst.sockets.filter(Boolean).length : 0; }
export function attachModule(inst, socketIdx, moduleId){
  const mod = byId.module[moduleId]; if (!inst || !mod || !inst.sockets) return false;
  if (String(mod.Tag) !== inst.kind) return false;             // 무기/방어구 구분만
  if (socketIdx < 0 || socketIdx >= inst.sockets.length) return false;
  if (inst.sockets[socketIdx]) return false;
  inst.sockets[socketIdx] = { moduleId, target: mod.TargetStat, value: randInt(N(mod.Value_Min), N(mod.Value_Max)) };
  return true;
}
export function removeModule(inst, socketIdx){
  if (!inst || !inst.sockets || !inst.sockets[socketIdx]) return false;
  inst.sockets[socketIdx] = null;                              // 모듈 즉시 파괴
  return true;
}

// ---------- stat derivation ----------
export function deriveSecondary(primary) {
  const sec = {};
  for (const r of DATA.secondaryStats) {
    const id = r.SecondaryStatID, src = PRIM[r.SourcePrimary];
    const add = N(r.BaseValue) + (primary[src] || 0) * N(r.ValuePerPoint);
    sec[id] = (sec[id] || 0) + add;
  }
  return sec;
}

// build the full combat profile for the player given state
export function playerProfile(state, staminaZero = false) {
  // broken/destroyed gear stays equipped but contributes nothing (사용 불가)
  const wRaw = state.equip.weapon ? instById(state, state.equip.weapon) : null;
  const w = functional(wRaw) ? wRaw : null;
  const wd = w ? byId.weapon[w.id] : null;
  const headRaw = state.equip.head ? instById(state, state.equip.head) : null;
  const bodyRaw = state.equip.body ? instById(state, state.equip.body) : null;
  const headInst = functional(headRaw) ? headRaw : null;
  const bodyInst = functional(bodyRaw) ? bodyRaw : null;
  const head = headInst ? byId.armor[headInst.id] : null;
  const body = bodyInst ? byId.armor[bodyInst.id] : null;
  // gather bonuses from equipped gear: v3 socket modules (+ legacy affixes for back-compat)
  const primAdd = { str: 0, dex: 0, vit: 0, will: 0 }; const secAdd = {};
  const addStat = (key, val) => { const pk = PRIM[key]; if (pk) primAdd[pk] += N(val); else if (key) secAdd[key] = (secAdd[key] || 0) + N(val); };
  for (const inst of [w, headInst, bodyInst]) {
    if (!inst) continue;
    if (inst.sockets) for (const s of inst.sockets) { if (s) addStat(s.target, s.value); }
    if (inst.affixes) for (const af of inst.affixes) addStat(af.target, af.value);
  }
  // equipped artifacts contribute Stat1/Stat2 (rolled per instance; may be negative)
  for (const uid of [state.equip.artifact1, state.equip.artifact2]) {
    if (!uid) continue; const inst = instById(state, uid); if (!inst) continue;
    const ar = byId.artifact[inst.id]; if (!ar) continue;
    const applyStat = (key, val) => { if (!key || key === '-' || val == null || val === '') return; addStat(key, val); };
    applyStat(ar.Stat1, inst.stat1 != null ? inst.stat1 : N(ar.Value1_Low));
    applyStat(ar.Stat2, inst.stat2 != null ? inst.stat2 : N(ar.Value2_Low));
  }
  const p = { ...state.primary };
  if (staminaZero) { const k = 1 - N(C.stamina_penalty_rate, 0.5); p.str *= k; p.dex *= k; p.vit *= k; p.will *= k; }
  p.str += primAdd.str; p.dex += primAdd.dex; p.vit += primAdd.vit; p.will += primAdd.will;
  const sec = deriveSecondary(p);
  // v3: appraisable stats read the per-instance rolled value (works even while hidden)
  const wOpt = k => (w ? instOpt(w, k) : 0);
  const armorOpt = k => (headInst ? instOpt(headInst, k) : 0) + (bodyInst ? instOpt(bodyInst, k) : 0);
  const armorDef = armorOpt('def');
  const armorEva = armorOpt('evasion');
  const armorSR = armorOpt('statusResist');
  const speedMult = clamp(1 + p.dex * 0.015, 0.3, 3);
  const sa = k => secAdd[k] || 0;
  return {
    name: t('common_me'),
    maxHp: Math.round(sec.sec_max_hp + sa('sec_max_hp')),
    minAtk: sec.sec_min_atk + (w ? wOpt('minAtk') : 0) + sa('sec_min_atk'),
    maxAtk: sec.sec_max_atk + (w ? wOpt('maxAtk') : 1) + sa('sec_max_atk'),
    defense: sec.sec_defense + armorDef + sa('sec_defense'),
    atkSpeed: clamp((w ? wOpt('atkSpeed') || 1 : 1) * speedMult, 0.2, 3),
    accuracy: sec.sec_accuracy + (w ? wOpt('accuracy') : 0) + sa('sec_accuracy'),
    evasion: sec.sec_evasion + armorEva + sa('sec_evasion'),
    critChance: sec.sec_crit_chance + (w ? wOpt('critChance') : 0) + sa('sec_crit_chance'),
    critResist: sec.sec_crit_resist + sa('sec_crit_resist'),
    statusResist: sec.sec_status_resist + armorSR + sa('sec_status_resist'),
    potency: w ? wOpt('potency') : 0,
    attribute: wd ? wd.Attribute : null,
    weaponMaxDmg: w ? wOpt('maxAtk') : 2,
    primAdd,
    sec,
    talismans: activeTalismans(state),
  };
}

export function monsterProfile(m) {
  return {
    name: tr(m, 'MonsterName') || m.MonsterName_KR, id: m.MonsterID,
    maxHp: N(m.BaseHP), minAtk: N(m.MinATK), maxAtk: N(m.MaxATK),
    defense: N(m.Defense), atkSpeed: N(m.AttackSpeed, 1),
    accuracy: N(m.Accuracy), evasion: N(m.Evasion),
    critChance: N(m.CritChance), critResist: N(m.CritResist),
    statusResist: N(m.StatusResist), potency: N(m.Potency),
    attribute: (m.StatusAttack && m.StatusAttack !== 'none') ? m.StatusAttack : null, weaponMaxDmg: N(m.MaxATK),
    grade: m.Grade, staminaCost: N(m.StaminaCost, 1), timeLimit: N(m.CombatTimeLimit, 20),
  };
}

export function instById(state, uid) {
  return state.vault.find(x => x.uid === uid) || state.bag.find(x => x.uid === uid) || null;
}

// 부적(Talisman) 발동 효과 — 장착 슬롯에서 byId.talisman 개체만 추출해 정규화.
// 스탯 가감 없음(장신구와 별개). simulateCombat이 prof.talismans로 읽어 전투 훅 적용.
export function activeTalismans(state) {
  const out = [];
  for (const uid of [state.equip.artifact1, state.equip.artifact2]) {
    if (!uid) continue;
    const inst = instById(state, uid); if (!inst) continue;
    const tl = byId.talisman && byId.talisman[inst.id]; if (!tl) continue;
    out.push({
      id: tl.TalismanID,
      trigger: String(tl.TriggerType || '').trim(),
      compare: String(tl.TriggerCompare || '').trim(),
      triggerValue: N(tl.TriggerValue),
      effect: String(tl.EffectType || '').trim(),
      stat: String(tl.EffectStat || '').trim(),
      value: N(tl.EffectValue),
    });
  }
  return out;
}

// 착용 가방(equip.bag)의 용량(전리품 슬롯 수). 미착용=0 → 런에서는 주머니(잠금) 2칸만.
export function equippedBagCapacity(state) {
  const uid = state && state.equip && state.equip.bag; if (!uid) return 0;
  const inst = instById(state, uid); if (!inst) return 0;
  const b = byId.bag && byId.bag[inst.id]; return b ? N(b.Capacity) : 0;
}

// 현재 체력비율(0~1)에서 조건 충족한 부적 stat_buff의 유효 배수. UI 전투표시 동적갱신용.
// (simulateCombat의 hp_threshold 로직과 동일 공식을 표시 목적으로 미러)
export function talismanStatMods(prof, hpFrac) {
  const mods = {};
  const list = (prof && prof.talismans) || [];
  for (const e of list) {
    if (e.effect !== 'stat_buff' || e.trigger !== 'hp_threshold') continue;
    const ok = e.compare === 'gte' ? hpFrac >= e.triggerValue : e.compare === 'lte' ? hpFrac <= e.triggerValue : false;
    if (!ok) continue;
    mods[e.stat] = (mods[e.stat] || 1) * (1 + e.value);
  }
  return mods;
}

// ---------- combat resolution helpers ----------
function hitChance(acc, eva) { const K = N(C.hit_soften, 10); return clamp((acc + K) / (acc + eva + K), N(C.hit_min, 0.1), N(C.hit_max, 0.95)); }
function critChance(cc, cr) {
  const K = N(C.crit_soften, 100);
  return clamp(cc / (cc + cr + K), N(C.crit_proc_min, 0.02), N(C.crit_proc_max, 0.45));
}
function statusChance(pot, res) {
  const s = pot + res, ratio = s <= 0 ? 0 : pot / s;
  return clamp(N(C.status_proc_min, 0.05) + (N(C.status_proc_max, 0.25) - N(C.status_proc_min, 0.05)) * ratio, N(C.status_proc_min), N(C.status_proc_max));
}
function defMitigate(dmg, def, pierceFrac = 0) {
  const K = N(C.defense_constant, 60);
  const eff = def * (1 - pierceFrac);
  return dmg * (K / (K + Math.max(0, eff)));
}
const ATTR_KR = { bleed: '출혈', stun: '기절', pierce: '관통', rupture: '파열', sever: '절단' };

// ---------- combat-log grammar (sheet-driven, CombatLog tab) ----------
// Templates come from DATA.combatLog (live sheet); DEFAULT_TPL is the fallback
// when the tab is missing or a row is blank. {Placeholders} are substituted.
const DEFAULT_TPL = {
  start: '{MonsterName} ({Grade}) 과(와) 조우. 제한시간 {TimeLimit}s.',
  miss: '{Attacker} 공격 → {Target} 회피 (명중률 {HitPct}%)',
  hit: '{Attacker} 공격 → {Target} −{Damage} · HP {TargetHP}/{TargetMaxHP}',
  crit: '{Attacker} ⟪치명타⟫ 공격 → {Target} −{Damage} · HP {TargetHP}/{TargetMaxHP}',
  pierce_suffix: ' (관통 −방어{PiercePct}%)',
  status_bleed: '▶ {Target} 출혈 ({DmgPerTick}/tick, {Duration}s)',
  status_stun: '▶ {Target} 기절 (+{Delay}s 지연)',
  status_rupture: '▶ {Target} 파열 x{Stacks} (공격력↓)',
  dot_bleed: '{Target} 출혈 피해 −{Damage} (HP {CurrentHP})',
  stun_skip: '{Target} 기절 — 행동 지연',
  win: '{MonsterName} 처치. ({Elapsed}s)',
  lose: '쓰러졌다… ({Elapsed}s)',
  timeout: '제한시간 초과 — {MonsterName} 을(를) 쓰러뜨리지 못했다.',
  loot: '적에게서 무언가를 획득했다.',
  talisman_extra: '▶ ⟪징표⟫ 연격',
  talisman_heal: '▶ ⟪징표⟫ 처치 회복 +{Amount} · HP {CurrentHP}',
};
const DEFAULT_TPL_EN = {
  start: 'Encountered {MonsterName} ({Grade}). Time limit {TimeLimit}s.',
  miss: '{Attacker} attacks → {Target} evades (hit {HitPct}%)',
  hit: '{Attacker} attacks → {Target} −{Damage} · HP {TargetHP}/{TargetMaxHP}',
  crit: '{Attacker} ⟪CRIT⟫ → {Target} −{Damage} · HP {TargetHP}/{TargetMaxHP}',
  pierce_suffix: ' (pierce −def {PiercePct}%)',
  status_bleed: '▶ {Target} bleeding ({DmgPerTick}/tick, {Duration}s)',
  status_stun: '▶ {Target} stunned (+{Delay}s delay)',
  status_rupture: '▶ {Target} rupture x{Stacks} (attack↓)',
  dot_bleed: '{Target} bleed damage −{Damage} (HP {CurrentHP})',
  stun_skip: '{Target} stunned — action delayed',
  win: '{MonsterName} defeated. ({Elapsed}s)',
  lose: 'You collapsed… ({Elapsed}s)',
  timeout: 'Time out — failed to bring down {MonsterName}.',
  loot: 'Recovered something from the enemy.',
  talisman_extra: '▶ ⟪Charm⟫ extra strike',
  talisman_heal: '▶ ⟪Charm⟫ kill heal +{Amount} · HP {CurrentHP}',
};
const uiT = (k) => t(k);
export function logTpl(id, vars) {
  const row = (DATA.combatLog || []).find(r => r.LineID === id);
  const en = LANG === 'en';
  const s = (en && row && row.Template_EN != null && String(row.Template_EN).trim()) ? String(row.Template_EN)
          : (row && row.Template != null && String(row.Template).trim()) ? String(row.Template)
          : (en ? DEFAULT_TPL_EN[id] : DEFAULT_TPL[id]);
  if (s == null) return '';
  return s.replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null) ? String(vars[k]) : '');
}

// ---------- one combat encounter ----------
// returns { log:[{t,who,type,text}], winner:'player'|'monster'|'timeout', triggers, playerHpEnd }
export function simulateCombat(pProf, mProf, playerHpStart) {
  const log = [];
  const A = { ...pProf, hp: playerHpStart != null ? playerHpStart : pProf.maxHp, side: 'player', next: 0, stunUntil: 0, bleed: [], ruptureStacks: 0, ruptureUntil: 0 };
  const B = { ...mProf, hp: mProf.maxHp, side: 'monster', next: 0, stunUntil: 0, bleed: [], ruptureStacks: 0, ruptureUntil: 0 };
  const triggers = { hitsLanded: 0, evades: 0, hitsTaken: 0, critsLanded: 0 };
  const ME = uiT('common_me');
  const limit = mProf.timeLimit;
  let t = 0, guard = 0;
  const push = (who, type, text) => log.push({ t: +t.toFixed(1), who, type, text, hpP: Math.max(0, Math.round(A.hp)), hpM: Math.max(0, Math.round(B.hp)) });
  push('sys', 'start', logTpl('start', { MonsterName: mProf.name, Grade: mProf.grade, TimeLimit: limit }));

  function applyBleedTicks(actor, now) {
    actor.bleed = actor.bleed.filter(b => b.until > now);
    // handled via scheduled ticks below (simplified: apply on each actor's turn)
  }
  function ruptureMult(actor, now) {
    if (actor.ruptureUntil > now && actor.ruptureStacks > 0) {
      const per = 0.10 + 0.05 * (actor.ruptureStacks - 1);
      return clamp(1 - per, 0.3, 1);
    }
    return 1;
  }

  // --- 부적(Talisman) 효과 정규화 · 플레이어 A 전용 ---
  const TAL = { firstCrit: 0, speed: [], dmgTaken: [], onHitExtra: [], onKillHeal: 0 };
  for (const e of (pProf.talismans || [])) {
    if (e.trigger === 'combat_start' && e.effect === 'guaranteed_crit') TAL.firstCrit += Math.max(1, e.value || 1);
    else if (e.trigger === 'hp_threshold' && e.effect === 'stat_buff' && e.stat === 'attack_speed') TAL.speed.push({ cmp: e.compare, thr: e.triggerValue, mult: 1 + e.value });
    else if (e.trigger === 'hp_threshold' && e.effect === 'stat_buff' && e.stat === 'damage_taken') TAL.dmgTaken.push({ cmp: e.compare, thr: e.triggerValue, mult: 1 + e.value }); // value 음수 = 감소
    else if (e.trigger === 'on_hit' && e.effect === 'extra_attack') TAL.onHitExtra.push({ chance: e.triggerValue, count: Math.max(1, e.value || 1) });
    else if (e.trigger === 'on_kill' && e.effect === 'heal_maxhp_pct') TAL.onKillHeal += e.value;
  }
  let firstCritLeft = TAL.firstCrit;
  const hpFrac = () => (A.maxHp > 0 ? A.hp / A.maxHp : 0);
  const cmpOk = (cmp, frac, thr) => cmp === 'gte' ? frac >= thr : cmp === 'lte' ? frac <= thr : false;
  const playerSpeed = () => { let m = 1; for (const s of TAL.speed) if (cmpOk(s.cmp, hpFrac(), s.thr)) m *= s.mult; return A.atkSpeed * m; };
  const playerDmgTakenMult = () => { let m = 1; for (const d of TAL.dmgTaken) if (cmpOk(d.cmp, hpFrac(), d.thr)) m *= d.mult; return m; };

  // 타격 처리(명중→데미지→크리→관통→상태이상). 일반 공격 = opts 없이 호출(기존 동작 동일).
  // 추가타(부적)는 allowExtra:false로 재귀 1회 — 재프록·시간소모 없음.
  function strike(actor, foe, opts) {
    opts = opts || {};
    const nm = actor.side === 'player' ? ME : actor.name;
    const fnm = foe.side === 'player' ? ME : foe.name;
    const hc = hitChance(actor.accuracy, foe.evasion);
    if (!opts.forceHit && Math.random() > hc) {
      push(actor.side, 'miss', logTpl('miss', { Attacker: nm, Target: fnm, HitPct: (hc * 100).toFixed(0) }));
      if (foe.side === 'player') triggers.evades++;
      return;
    }
    let dmg = rand(actor.minAtk, actor.maxAtk) * ruptureMult(actor, t);
    const isCrit = opts.forceCrit || Math.random() < critChance(actor.critChance, foe.critResist);
    if (isCrit) { dmg *= N(C.crit_damage_mult, 1.5); if (actor.side === 'player') triggers.critsLanded++; }
    let pierceFrac = 0;
    if (actor.attribute === 'pierce' && Math.random() < statusChance(actor.potency, foe.statusResist)) {
      pierceFrac = rand(N(byId.status.pierce?.Value, 0.05), N(byId.status.pierce?.ValueMax, 0.4));
    }
    let final = defMitigate(dmg, foe.defense, pierceFrac);
    if (foe === A) final *= playerDmgTakenMult();   // 부적: 받는 피해 감소 (피격 전 체력 조건)
    foe.hp -= final;
    if (actor.side === 'player') triggers.hitsLanded++;
    if (foe.side === 'player') triggers.hitsTaken++;
    let text = logTpl(isCrit ? 'crit' : 'hit', { Attacker: nm, Target: fnm, Damage: final.toFixed(0), TargetHP: Math.max(0, foe.hp).toFixed(0), TargetMaxHP: foe.maxHp });
    if (pierceFrac > 0) text += logTpl('pierce_suffix', { PiercePct: (pierceFrac * 100).toFixed(0) });
    if (opts.talismanCrit) text += (LANG === 'en' ? '  ⟪Token⟫' : '  ⟪징표⟫');
    push(actor.side, isCrit ? 'crit' : 'hit', text);

    // status application (non-pierce)
    if (actor.attribute && actor.attribute !== 'pierce' && foe.hp > 0) {
      const sc = statusChance(actor.potency, foe.statusResist);
      if (Math.random() < sc) {
        const eff = actor.attribute;
        if (eff === 'bleed') {
          const s = byId.status.bleed;
          const dmgPer = actor.weaponMaxDmg * N(s?.Value, 0.5);
          const dur = N(s?.Duration, 4), iv = N(s?.TickInterval, 2);
          foe.bleed.push({ dmg: dmgPer, until: t + dur, nextTick: t + iv, interval: iv });
          if (foe.bleed.length > N(s?.MaxStack, 3)) foe.bleed.shift();
          push(actor.side, 'status', logTpl('status_bleed', { Target: fnm, DmgPerTick: dmgPer.toFixed(0), Duration: dur }));
        } else if (eff === 'stun') {
          const s = byId.status.stun;
          const delay = (1 / actor.atkSpeed) * N(s?.Value, 0.5);
          foe.stunUntil = Math.max(foe.stunUntil, foe.next) + delay;
          push(actor.side, 'status', logTpl('status_stun', { Target: fnm, Delay: delay.toFixed(1) }));
        } else if (eff === 'rupture') {
          const s = byId.status.rupture;
          foe.ruptureStacks = Math.min(N(s?.MaxStack, 3), foe.ruptureStacks + 1);
          foe.ruptureUntil = t + N(s?.Duration, 3);
          push(actor.side, 'status', logTpl('status_rupture', { Target: fnm, Stacks: foe.ruptureStacks }));
        }
      }
    }

    // 부적: 처치 회복 (플레이어가 몬스터 처치 시 — 이번 전투 종료 후 HP로 이월)
    if (actor === A && foe === B && foe.hp <= 0 && TAL.onKillHeal) {
      const heal = A.maxHp * TAL.onKillHeal;
      A.hp = Math.min(A.maxHp, A.hp + heal);
      push('player', 'heal', logTpl('talisman_heal', { Amount: heal.toFixed(0), CurrentHP: Math.round(A.hp) }));
    }
    // 부적: 추가타 (플레이어 타격 후 · 대상 생존 · 재프록/시간소모 없음)
    if (opts.allowExtra && actor === A && foe.hp > 0 && TAL.onHitExtra.length) {
      for (const ex of TAL.onHitExtra) {
        for (let k = 0; k < ex.count && foe.hp > 0; k++) {
          if (Math.random() < ex.chance) {
            push('player', 'extra', logTpl('talisman_extra', {}));
            strike(actor, foe, { allowExtra: false });
          }
        }
      }
    }
  }

  while (A.hp > 0 && B.hp > 0 && t <= limit && guard++ < 400) {
    // whoever acts next
    const actor = A.next <= B.next ? A : B;
    const foe = actor === A ? B : A;
    t = actor.next;
    if (t > limit) break;

    // bleed dot resolves as time passes on this actor
    for (const b of actor.bleed) {
      while (b.nextTick <= t && b.until >= b.nextTick) {
        actor.hp -= b.dmg;
        push(actor.side, 'dot', logTpl('dot_bleed', { Target: actor.side === 'player' ? ME : actor.name, Damage: b.dmg.toFixed(0), CurrentHP: Math.max(0, actor.hp).toFixed(0) }));
        b.nextTick += b.interval;
        if (actor.hp <= 0) break;
      }
    }
    actor.bleed = actor.bleed.filter(b => b.until > t);
    if (actor.hp <= 0) break;

    if (actor.stunUntil > t) { // stunned: skip, reschedule
      push(actor.side, 'stun', logTpl('stun_skip', { Target: actor.side === 'player' ? ME : actor.name }));
      actor.next = actor.stunUntil + 1 / (actor === A ? playerSpeed() : actor.atkSpeed);
      continue;
    }

    // 부적: 첫 스윙 명중+치명 확정 (플레이어 A만 · 1회 소모)
    const opts = { allowExtra: true };
    if (actor === A && firstCritLeft > 0) { opts.forceHit = true; opts.forceCrit = true; opts.talismanCrit = true; firstCritLeft--; }
    strike(actor, foe, opts);
    // 다음 행동 스케줄 (플레이어는 부적 공속 버프 반영)
    actor.next = t + 1 / (actor === A ? playerSpeed() : actor.atkSpeed);
  }

  let winner = 'timeout';
  if (B.hp <= 0) winner = 'player';
  else if (A.hp <= 0) winner = 'monster';
  if (winner === 'player') push('sys', 'win', logTpl('win', { MonsterName: mProf.name, Elapsed: t.toFixed(1) }));
  else if (winner === 'monster') push('sys', 'lose', logTpl('lose', { Elapsed: t.toFixed(1) }));
  else push('sys', 'timeout', logTpl('timeout', { MonsterName: mProf.name }));
  return { log, winner, triggers, playerHpEnd: Math.max(0, A.hp), elapsed: +t.toFixed(1) };
}

// ---------- durability wear (combat) ----------
// weapon loses 1 dur per dura_weapon_hits_per_loss successful hits landed;
// each worn armor piece loses 1 dur per dura_armor_hits_per_loss hits taken.
// 장신구(artifact1)는 적중·피격을 '합산'해 dura_accessory_hits_per_loss마다 -1 —
// 공격형·방어형 어느 빌드에서도 비슷하게 닳게 하려는 의도(무기=적중만·방어구=피격만과 다름).
// remainders accumulate on the instance (_wear) across encounters.
export function applyDurabilityWear(state, triggers) {
  const wpl = N(C.dura_weapon_hits_per_loss, 20);
  const apl = N(C.dura_armor_hits_per_loss, 20);
  const cpl = N(C.dura_accessory_hits_per_loss, 100);
  const changes = [];
  const wear = (inst, add, per) => {
    if (!inst || N(inst.maxDur) <= 0 || N(inst.dur) <= 0 || add <= 0 || per <= 0) return;
    inst._wear = (inst._wear || 0) + add;
    let loss = 0;
    while (inst._wear >= per) { inst._wear -= per; loss++; }
    if (loss > 0) {
      const before = inst.dur;
      inst.dur = clamp(inst.dur - loss, 0, inst.maxDur);
      if (inst.dur !== before) changes.push({ uid: inst.uid, id: inst.id, from: before, to: inst.dur, broke: inst.dur <= 0 });
    }
  };
  const w = state.equip.weapon ? instById(state, state.equip.weapon) : null;
  wear(w, N(triggers.hitsLanded), wpl);
  const head = state.equip.head ? instById(state, state.equip.head) : null;
  const body = state.equip.body ? instById(state, state.equip.body) : null;
  [head, body].filter(Boolean).forEach(p => wear(p, N(triggers.hitsTaken), apl));
  // artifact1 = 장신구. artifact2(징표)는 maxDur이 0이라 wear()의 가드에서 자동으로 걸러진다.
  const acc = state.equip.artifact1 ? instById(state, state.equip.artifact1) : null;
  wear(acc, N(triggers.hitsLanded) + N(triggers.hitsTaken), cpl);
  return changes;
}

// ---------- repair (per-point probabilistic) ----------
// cost is a placeholder economy (repair_cost_per_point) pending client balancing.
export function repairCostPreview(inst) {
  const worn = Math.max(0, N(inst.maxDur) - N(inst.dur));
  // 수리비 = repair_cost_base + repair_cost_per_point × 닳은점 (시도 기준 과금 — 실패분 포함)
  return Math.ceil(N(C.repair_cost_base, 0) + worn * N(C.repair_cost_per_point, 20));
}
// each worn point is restored, but with repair_fail_chance_per_point it fails:
// a failed point is not restored and permanently drops maxDur by repair_fail_maxdur_loss.
export function repair(state, inst) {
  const worn = Math.max(0, N(inst.maxDur) - N(inst.dur));
  if (N(inst.maxDur) <= 0) return { ok: false, reason: 'destroyed' };
  if (worn <= 0) return { ok: false, reason: 'full' };
  const cost = repairCostPreview(inst);
  if (state.sato < cost) return { ok: false, reason: 'sato', cost };
  state.sato -= cost;
  const p = N(C.repair_fail_chance_per_point, 0.06);
  const perLoss = N(C.repair_fail_maxdur_loss, 1);
  let restored = 0, fails = 0, maxLoss = 0;
  for (let i = 0; i < worn; i++) {
    if (Math.random() < p) { fails++; inst.maxDur = Math.max(0, inst.maxDur - perLoss); maxLoss += perLoss; }
    else restored++;
  }
  inst.dur = Math.min(N(inst.dur) + restored, inst.maxDur);
  if (inst.maxDur <= 0) inst.destroyed = true;
  return { ok: true, cost, worn, restored, fails, maxLoss, dur: inst.dur, maxDur: inst.maxDur };
}

// ---------- monster spawn & card draw (RL_SpawnTable) ----------
// per-zone distribution: specials use SpawnChance %, the single IsBase monster
// fills the remainder (100 - sum of specials). Missing monsters are skipped.
// bossUp = 이번 레이드에서 처치로 누적한 보스 확률 상승분(%p). 보스 몫이 늘면
// 베이스 몬스터가 자동으로 그만큼 차감됨(100 - 스페셜합). 다른 등급은 불변.
// 등급별 보스 확률 상승치(%p). 값이 그대로 %p다 — 중간 환산 없음.
// 보스 행은 조우 시 누적이 리셋되므로 실제로는 쓰이지 않는다(표 완성용).
export function bossChanceUp(grade) {
  const g = String(grade || '').trim().toLowerCase();
  return N(C['boss_chance_up_' + g], 0);
}

// bossUp = 이번 레이드에서 처치로 누적한 보스 확률 상승분(%p).
// 2026-08-26 개편: 전투 '횟수' 램프(boss_spawn_bonus × depth/grade_ramp_fights)를 폐지하고
// 등급별 누적 %p로 바꿨다. 시트 값이 곧 %p라 몇 % 오르는지 시트만 봐도 안다.
// ★상한(boss_chance_max)은 반드시 여기서 클램프한다 — 칩에서만 자르면 표시는 15%인데
//   실제 굴림은 20%가 되는 어긋남이 생긴다. 표시와 굴림이 같은 계산을 써야 한다.
export function spawnDistribution(zoneId, bossUp = 0) {
  const rows = (DATA.spawnTable || []).filter(r => r.ZoneID === zoneId && byId.monster[r.MonsterID]);
  if (!rows.length) return null;
  const base = rows.find(r => N(r.IsBase) === 1);
  const specials = rows.filter(r => N(r.IsBase) !== 1);
  const isBoss = id => String((byId.monster[id] || {}).Grade || '').trim() === 'Boss';
  const bossRows = specials.filter(r => isBoss(r.MonsterID));
  // 존 기본% 합 + 누적분을, 존과 무관하게 boss_chance_max(15%)로 자른다
  const bossBase = bossRows.reduce((s, r) => s + N(r.SpawnChance), 0);
  const capped = clamp(bossBase + Math.max(0, N(bossUp)), 0, N(C.boss_chance_max, 15));
  const scale = bossBase > 0 ? capped / bossBase : 0;   // 보스가 여럿이면 기본 비율대로 나눠 갖는다
  const dist = specials.map(r => ({ id: r.MonsterID, chance: isBoss(r.MonsterID) ? N(r.SpawnChance) * scale : N(r.SpawnChance) }));
  const specialSum = dist.reduce((s, d) => s + d.chance, 0);
  if (base) dist.push({ id: base.MonsterID, chance: Math.max(0, 100 - specialSum), base: true });
  return dist.filter(d => d.chance > 0);
}
// one weighted draw; falls back to any same-zone/legacy monster if no table
export function drawMonster(zoneId, bossUp = 0) {
  const dist = spawnDistribution(zoneId, bossUp);
  if (!dist || !dist.length) {
    const pool = DATA.monsters.filter(m => String(m.SpawnZones || '').split(',').map(s => s.trim()).includes(zoneId));
    const use = pool.length ? pool : DATA.monsters;
    return use[Math.floor(Math.random() * use.length)].MonsterID;
  }
  const total = dist.reduce((s, d) => s + d.chance, 0);
  let r = Math.random() * total;
  for (const d of dist) { r -= d.chance; if (r <= 0) return d.id; }
  return dist[dist.length - 1].id;
}
// n independent draws (cards may repeat) for the pre-combat card pick
export function drawCards(zoneId, n, bossUp = 0) {
  const out = []; for (let i = 0; i < Math.max(1, n); i++) out.push(drawMonster(zoneId, bossUp)); return out;
}

// ---------- loot ----------
// resolve one loot row -> concrete item ids (그룹이면 LootGroupItem 균등추첨 · MinQty~MaxQty회 복원추출)
function isGroupRef(r){ return String(r.ItemID || '').startsWith('group_') || /Group/i.test(String(r.Category || '')); }
function groupMembers(groupId){ return (DATA.lootGroupItems || []).filter(m => m.GroupID === groupId); }
export function rollLoot(monsterId, zoneId) {
  const zone = zoneId ? byId.zone[zoneId] : null;
  const mult = zone ? N(zone.UnappraisedMult, 1) : 1;
  // 성장 태그 확률은 존 등급(히든·PvP)으로만 갈린다 — UnappraisedMult(1~3)를 재사용하면 태그가 폭주한다.
  const rareZone = !!(zone && (N(zone.IsHidden) || N(zone.IsPvP)));
  const out = [];
  const push = (id, n) => { const ex = out.find(o => o.id === id); if (ex) ex.qty += n; else out.push({ id, qty: n, unappraisedMult: mult, rareZone }); };
  for (const r of DATA.lootTable) {
    if (r.MonsterID !== monsterId || !r.ItemID) continue;
    if (Math.random() * 100 >= N(r.DropRate)) continue;
    const draws = randInt(N(r.MinQty, 1), N(r.MaxQty, 1));
    if (isGroupRef(r)) {
      const members = groupMembers(r.ItemID);
      if (!members.length) { console.warn('empty loot group', r.ItemID); continue; }
      for (let i = 0; i < draws; i++) push(members[randInt(0, members.length - 1)].MemberItemID, 1);
    } else {
      push(r.ItemID, draws);
    }
  }
  return out;
}

// ---------- growth ----------
export function growthMultiplier(state, stat) {
  let tags = 0;
  for (const uid of [state.equip.weapon, state.equip.head, state.equip.body, state.equip.artifact1, state.equip.artifact2]) {
    if (!uid) continue; const inst = instById(state, uid); if (!inst) continue;
    tags += growthTagsActive(inst).filter(t => t === stat).length; // v3: 확정·활성 태그만 (무기·방어구·장신구·부적)
  }
  return N(C.growth_tag_mult_base, 0.5) + N(C.growth_tag_mult_step, 0.5) * tags;
}
export function growthReq(level) { return N(C.growth_A, 5) * Math.pow(N(C.growth_r, 1.35), level - 1); }
const POINT_PER = { str: 1, dex: 2, vit: 1.5, will: 4 };
export function applyGrowth(state, triggers) {
  const map = { str: triggers.hitsLanded, dex: triggers.evades, vit: triggers.hitsTaken, will: triggers.critsLanded };
  const ups = [];
  for (const stat of ['str', 'dex', 'vit', 'will']) {
    const n = map[stat]; if (!n) continue;
    const g = state.growth[stat];
    g.points += n * POINT_PER[stat] * growthMultiplier(state, stat);
    let leveled = 0;
    while (g.points >= growthReq(g.level)) { g.points -= growthReq(g.level); g.level++; leveled++; }
    if (leveled) { state.primary[stat] = g.level; ups.push({ stat, to: g.level, by: leveled }); }
  }
  return ups;
}
export function growthPct(state, stat) {
  const g = state.growth[stat];
  return clamp((g.points / growthReq(g.level)) * 100, 0, 100);
}

// ---------- USB growth (USB tab) — 일시 중단, 아지트(하이드) 신설 시 재연결 ----------
export function parseMaterials(json){
  try{ const o = JSON.parse(String(json == null ? '{}' : json)); return Object.entries(o).map(([id, qty]) => ({ id, qty: N(qty, 1) })); }catch(_){ return []; }
}
export function countItem(state, id){ let n = 0; for (const arr of [state.bag, state.vault]) for (const it of arr) if (it.id === id) n += (it.qty || 1); return n; }
export function consumeItems(state, id, qty){
  let left = qty;
  const dec = (arr) => { for (let i = arr.length - 1; i >= 0 && left > 0; i--){ if (arr[i].id !== id) continue; const take = Math.min(left, arr[i].qty || 1); if ((arr[i].qty || 1) > take) arr[i].qty -= take; else arr.splice(i, 1); left -= take; } };
  dec(state.bag); dec(state.vault);
  return left <= 0;
}
// GrantValue: 1.0 = 스탯 1레벨분. 정수부는 레벨, 소수부는 성장 포인트로 환산해 영구 적용.
export function applyUsbGrant(state, grantStat, value){
  const key = PRIM[grantStat]; if (!key) return null;
  const g = state.growth[key]; const before = g.level;
  const v = N(value, 1); const whole = Math.floor(v); const frac = v - whole;
  g.level += whole;
  if (frac > 0){ g.points += frac * growthReq(g.level); while (g.points >= growthReq(g.level)){ g.points -= growthReq(g.level); g.level++; } }
  state.primary[key] = g.level;
  return { stat: key, grantStat, from: before, to: g.level };
}

// ---------- NPC dialogue (NpcDialogue tab · usbload flow) ----------
// fallback pool when the tab is missing — 미스터 박: 냉정·주술사적·클러리컬
const USB_TPL = {
  intro: ['저장매체를 갖고 있군. 해독이 필요하면 내놓아라.', '구 유물은 아무나 다루지 못한다. 볼일이 있으면 매체를 보여라.'],
  request: ['{USB}. 해독에는 재료가 든다 — {MAT}. 있나.', '수신 준비에 {MAT}이(가) 필요하다.'],
  insufficient: ['모자란다. {MAT}. 갖춰서 다시 와라.', '이걸로는 회로를 못 돌린다. {MAT}.'],
  start: ['됐다. 이식을 시작한다. {MIN}분. 접속을 끊지 마라.', '수신 개시. {MIN}분간 유지해라.'],
  uploading: ['수신 중이다. 끊지 마라.', '신호가 흐르고 있다. 기다려라.'],
  complete: ['끝났다. {STAT}의 감각이 돌아왔을 거다.', '수신 완료. {STAT}이(가) 몸에 새겨졌다.'],
  farewell: ['볼일이 끝났으면 가라.', '다음 매체를 구해 와라.'],
};
const STAT_KR_FALLBACK = { stat_str: '힘', stat_dex: '민첩', stat_vit: '체력', stat_will: '의지' };
export function substUsbTokens(s, u){
  s = String(s == null ? '' : s);
  if (!u) return s.replace(/\{USB\}|\{MAT\}|\{STAT\}|\{MIN\}/g, '');
  const mats = parseMaterials(u.RequiredMaterials).map(m => anyName(m.id) + ' ' + m.qty + '개').join(', ');
  const sr = DATA.primaryStats.find(r => r.PrimaryStatID === u.GrantStat);
  const statName = (sr && (tr(sr, 'StatName') || sr.Name_KR || sr.PrimaryStat_KR)) || STAT_KR_FALLBACK[u.GrantStat] || '';
  return s.replace(/\{USB\}/g, tr(u, 'Name') || '').replace(/\{MAT\}/g, mats).replace(/\{STAT\}/g, statName).replace(/\{MIN\}/g, String(N(u.UploadMinutes, 1)));
}
// 2026-08-18: usbload 대사는 시트(NpcDialogue)에서 전량 삭제됨 — 내장 템플릿만 쓴다.
// USB 이식은 아지트(하이드) 신설 때 되살릴 예정이라 화면·함수는 남겨둔다.
export function usbLine(stage, usbRow){
  const pool = USB_TPL[stage] || [''];
  return substUsbTokens(pool[Math.floor(Math.random() * pool.length)], usbRow);
}

// ---------- ColdData (비대칭 PvP · DEV_HANDOFF §6-6) ----------
const midVal = (a, b) => Math.round((N(a) + N(b)) / 2);
// 장비 인스턴스 토큰: "베이스 / 접두 / 접미 / 현재내구 / 최대내구" ('-' = 빈 값)
export function parseGearToken(token){
  const parts = String(token == null ? '' : token).split('/').map(s => s.trim());
  const id = parts[0];
  if (!id || id === '-') return null;
  const w = byId.weapon[id], a = byId.armor[id], af = byId.artifact[id];
  const src = w || a || af || byId.item[id]; if (!src) return null;
  const kind = w ? 'weapon' : a ? 'armor' : af ? 'artifact' : 'item';
  const baseMax = N(src.MaxDurability);
  const inst = { uid: 'u' + (_uid++), id, kind, qty: 1,
    dur: (parts[3] && parts[3] !== '-') ? N(parts[3], baseMax) : baseMax,
    maxDur: (parts[4] && parts[4] !== '-') ? N(parts[4], baseMax) : baseMax };
  if (w){ inst.minAtk = midVal(w.MinAtk_Low, w.MinAtk_High); inst.maxAtk = midVal(w.MaxAtk_Low, w.MaxAtk_High); }
  else if (a){ inst.def = midVal(a.Def_Low, a.Def_High); }
  else if (af){ inst.stat1 = midVal(af.Value1_Low, af.Value1_High); if (af.Stat2 && af.Stat2 !== '-') inst.stat2 = midVal(af.Value2_Low, af.Value2_High); }
  inst.affixes = [];
  for (const [pos, type] of [[1, 'prefix'], [2, 'suffix']]){
    const aid = parts[pos]; if (!aid || aid === '-') continue;
    const row = (DATA.affixes || []).find(x => x.AffixID === aid); if (!row) continue;
    inst.affixes.push({ affixId: row.AffixID, name: row.AffixName_KR, type, target: row.TargetStat, targetKr: row.TargetStat_KR, value: midVal(row.Value_Min, row.Value_Max) });
  }
  return inst;
}
export function coldGear(bot){
  return { weapon: parseGearToken(bot.Weapon), head: parseGearToken(bot.Helmet), body: parseGearToken(bot.Armor), artifact1: parseGearToken(bot.Artifact1), artifact2: parseGearToken(bot.Artifact2) };
}
export function coldEquippedList(bot){ return Object.values(coldGear(bot)).filter(Boolean); }
export function cloneGearInstance(inst){
  const c = { ...inst, uid: 'u' + (_uid++) };
  if (inst.affixes) c.affixes = inst.affixes.map(x => ({ ...x }));
  return c;
}
// ColdData 봇의 전투 프로필 — playerProfile과 동일한 파생 경로 (1차 스탯 + 장비 + 접사 + 아티팩트)
export function coldProfile(bot){
  const gear = coldGear(bot);
  const w = functional(gear.weapon) ? gear.weapon : null; const wd = w ? byId.weapon[w.id] : null;
  const headI = functional(gear.head) ? gear.head : null, bodyI = functional(gear.body) ? gear.body : null;
  const head = headI ? byId.armor[headI.id] : null, body = bodyI ? byId.armor[bodyI.id] : null;
  const primAdd = { str: 0, dex: 0, vit: 0, will: 0 }; const secAdd = {};
  for (const inst of [w, headI, bodyI]){
    if (!inst || !inst.affixes) continue;
    for (const x of inst.affixes){ const pk = PRIM[x.target]; if (pk) primAdd[pk] += x.value; else secAdd[x.target] = (secAdd[x.target] || 0) + x.value; }
  }
  for (const inst of [gear.artifact1, gear.artifact2]){
    if (!inst) continue; const ar = byId.artifact[inst.id]; if (!ar) continue;
    const applyStat = (key, val) => { if (!key || key === '-' || val == null || val === '') return; const pk = PRIM[key]; if (pk) primAdd[pk] += N(val); else secAdd[key] = (secAdd[key] || 0) + N(val); };
    applyStat(ar.Stat1, inst.stat1); applyStat(ar.Stat2, inst.stat2);
  }
  const p = { str: N(bot.Str, 1) + primAdd.str, dex: N(bot.Dex, 1) + primAdd.dex, vit: N(bot.Vit, 1) + primAdd.vit, will: N(bot.Will, 1) + primAdd.will };
  const sec = deriveSecondary(p);
  const armorDef = (headI ? (headI.def ?? 0) : 0) + (bodyI ? (bodyI.def ?? 0) : 0);
  const armorEva = (head ? N(head.Evasion) : 0) + (body ? N(body.Evasion) : 0);
  const armorSR = (head ? N(head.StatusResist) : 0) + (body ? N(body.StatusResist) : 0);
  const speedMult = clamp(1 + p.dex * 0.015, 0.3, 3);
  const sa = k => secAdd[k] || 0;
  return {
    name: tr(bot, 'Name') || bot.ColdDataID || bot.ID, id: bot.ColdDataID || bot.ID, isUser: true, tier: bot.Tier, desc: tr(bot, 'Description'), gear,
    maxHp: Math.round(sec.sec_max_hp + sa('sec_max_hp')),
    minAtk: sec.sec_min_atk + (w ? w.minAtk : 0) + sa('sec_min_atk'),
    maxAtk: sec.sec_max_atk + (w ? w.maxAtk : 1) + sa('sec_max_atk'),
    defense: sec.sec_defense + armorDef + sa('sec_defense'),
    atkSpeed: clamp((wd ? N(wd.AttackSpeed, 1) : 1) * speedMult, 0.2, 3),
    accuracy: sec.sec_accuracy + (wd ? N(wd.Accuracy) : 0) + sa('sec_accuracy'),
    evasion: sec.sec_evasion + armorEva + sa('sec_evasion'),
    critChance: sec.sec_crit_chance + (wd ? N(wd.CritChance) : 0) + sa('sec_crit_chance'),
    critResist: sec.sec_crit_resist + sa('sec_crit_resist'),
    statusResist: sec.sec_status_resist + armorSR + sa('sec_status_resist'),
    potency: wd ? N(wd.Potency) : 0,
    attribute: (wd && wd.Attribute && wd.Attribute !== 'none') ? wd.Attribute : null,
    weaponMaxDmg: w ? w.maxAtk : 2,
    // PvP는 상대가 콜드데이터라 Monster 탭 행이 없다 → 스태미너·제한시간을 Config로 관리(2026-08-26).
    grade: '생존자', staminaCost: N(C.pvp_stamina_cost, 3), timeLimit: N(C.pvp_time_limit, 60),
  };
}
// 매칭: 순수 1차 스탯 총합 ±pvp_match_range, 같은 CityID. 범위 내 없으면 가장 가까운 후보로 폴백.
export function pickColdOpponent(state, cityId){
  let pool = (DATA.coldData || []).filter(b => String(b.CityID || '').trim() === String(cityId).trim());
  if (!pool.length && (DATA.coldData || []).length){ console.warn('ColdData: no CityID match for', cityId, '— using full pool'); pool = DATA.coldData; }
  if (!pool.length) return null;
  const mySum = state.primary.str + state.primary.dex + state.primary.vit + state.primary.will;
  const range = N(C.pvp_match_range, 10);
  const sum = b => N(b.Str) + N(b.Dex) + N(b.Vit) + N(b.Will);
  const fit = pool.filter(b => Math.abs(sum(b) - mySum) <= range);
  const use = fit.length ? fit : pool.slice().sort((a, b) => Math.abs(sum(a) - mySum) - Math.abs(sum(b) - mySum)).slice(0, 2);
  return use[Math.floor(Math.random() * use.length)];
}

export { ATTR_KR, N, C };

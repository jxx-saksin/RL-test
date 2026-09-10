// RL Prototype — pure game engine. No DOM.
// Data source is swappable: starts from the bundled snapshot, can be replaced
// live via setDATA() (e.g. a fresh Google-Sheets fetch).
import { DATA as FALLBACK } from './data/game-data.js?v=val4';
import { buildIndex } from './sheet-loader.js?v=val10';

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
  // 퀘스트 (일일) — 시트 UIString에 같은 키가 들어오면 시트가 이긴다
  quest_tab_daily:['일일','Daily'], quest_tab_weekly:['주간','Weekly'], quest_tab_story:['스토리','Story'],
  quest_chip_new:['신규','New'], quest_chip_run:['진행중','Active'], quest_chip_done:['완료','Done'],
  quest_kicker:['퀘스트','Quest'],
  quest_kind_submit:['제출','Submit'], quest_kind_kill:['소탕','Cull'], quest_kind_encounter:['조우','Recon'],
  quest_kind_visit:['정찰','Scout'], quest_kind_use:['사용','Use'], quest_kind_depth:['연전','Gauntlet'],
  quest_left:['남은시간','Time left'], quest_sec_reward:['보상','Reward'],
  quest_rw_sato:['사토','Sato'], quest_rw_pass:['프로토콜 패스','Protocol Pass'],
  quest_rw_item:['아이템','Item'], quest_rw_unknown:['알수없음','Unknown'],
  quest_btn_accept:['수락하기','Accept'], quest_btn_giveup:['포기하기','Abandon'],
  quest_btn_complete:['완료하기','Complete'], quest_btn_close:['닫기','Close'], quest_btn_cancel:['취소','Cancel'],
  quest_btn_back:['뒤로가기','Back'],
  quest_giveup_ask:['정말 포기하시겠습니까? 진행 내역은 사라집니다.','Abandon this quest? Your progress will be lost.'],
  quest_empty:['받을 수 있는 퀘스트가 없습니다.','No quests available.'],
  quest_short:['제출할 아이템이 모자랍니다.','Not enough items to submit.'],
  quest_rw_fail:['보상 정보를 불러오지 못했습니다. 잠시 뒤 다시 시도하세요.','Could not load the reward data. Try again shortly.'],
  // 배너형(정찰·연전) 목표 문장 — {a}=존 이름, {n}=진행 카운터('0/2')가 들어갈 자리
  quest_obj_visit:['{a} {n}회 살아서 돌아오기','Extract from {a} {n} times'],
  quest_obj_depth:['회복 아이템 사용 하지않고 {n}회 연속 승리','Win {n} in a row without healing'],
  // 리스트형 상세의 목표 행 라벨 — 제출·소탕은 이름만 쓰고 조우·사용만 동사를 붙인다(목업)
  quest_row_encounter:['"{a}" 조우','Find "{a}"'], quest_row_use:['"{a}" 섭취','Consume "{a}"'],
  // effect 축 목표의 표시 이름 — EffectType 값을 그대로 키로 쓴다(quest_eff_<EffectType>)
  quest_eff_stamina:['스태미너 회복','Stamina Recovery'], quest_eff_heal:['생명력 회복','HP Recovery'],
  // context:'rest' 전용 변형 — 전투 중 '휴식하기' 화면에서 쓴 것만 인정하는 목표
  quest_row_use_rest:['휴식 중 "{a}"','"{a}" while resting'],
  quest_sum_use_rest:['전투 중 휴식에서 "{a}" {n}회','Recover "{a}" {n}x while resting mid-raid'],
  // 리스트 행 한 줄 요약 — {n}=목표치
  quest_sum_submit:['"{a}" {n}개 제출','Submit {n}x "{a}"'],
  quest_sum_kill:['{a} {n}마리 처치','Kill {n} {a}'],
  quest_sum_encounter:['"{a}" 조우 {n}회','Find "{a}" {n}x'],
  quest_sum_visit:['{a}에서 살아서 귀환하기 {n}회','Extract from {a} {n}x'],
  quest_sum_use:['전투 중 "{a}" {n}회 사용','Use "{a}" {n}x in combat'],
  quest_sum_depth:['{a}에서 회복 없이 {n}연승','{n} wins in a row in {a}, no healing'],
  quest_sum_more:['{a} 외 {n}종','{a} +{n} more'],
  // 조립대 · 제작 (시트 UIString에 같은 키가 들어오면 시트가 이긴다)
  hide_craft_label:['제작','Craft'], hide_craft_time:['제작시간','Craft time'],
  hide_craft_try:['제작시도','Attempt'], hide_craft_rate:['성공률','Success rate'],
  hide_craft_confirm:['제작을 진행 하시겠습니까?','Start crafting?'],
  hide_craft_ready:['제작을 준비중입니다.','Preparing to craft.'],
  hide_craft_running:['제작이 진행중입니다.','Crafting in progress.'],
  hide_craft_complete:['제작이 완료되었습니다.','Crafting complete.'],
  hide_craft_failed:['제작에 실패해 재료가 소모되었습니다.','Crafting failed. Materials were consumed.'],
  hide_craft_do:['제작','Craft'], hide_craft_doing:['제작중','Crafting'],
  hide_craft_done_label:['완성','Done'], hide_craft_fail_label:['실패','Failed'],
  hide_craft_empty:['설치된 도면이 없다.','No blueprints installed.'],
  hide_store_put:['보관함에 넣기','Store'],
  // 조립대 · 분해
  hide_disa_label:['분해','Disassemble'], hide_disa_section:['분해가능 아이템','Disassemblable'],
  hide_disa_confirm:['분해 하시겠습니까?','Disassemble this?'],
  hide_disa_running:['분해 진행중','Disassembling.'],
  hide_disa_complete:['분해가 완료되었습니다.','Disassembly complete.'],
  hide_disa_empty:['분해 가능한 아이템이 없습니다','No items can be disassembled'],
  hide_disa_none:['분해해서 나올 것이 없습니다','Nothing can be salvaged from this'],
  btn_to_clinic:['보건소로','To the Clinic'],   // 사망 결과 화면 — 귀환 실패는 보건소 치료로 바로 보낸다
  hide_craft_can:['제작가능','Ready'],   // 조립대 목록 칩 — 재료가 전부 모인 도면 (※ hide_craft_ready = '제작을 준비중입니다' 와 다른 키)
  // 시설 화면 버튼 칩 — 슬롯 중 완료가 하나라도 있으면 '완료'가 이긴다(수령 대기가 더 급한 정보)
  hide_chip_run:['진행','Running'], hide_chip_done:['완료','Done'],
  hide_reveal_all:['전부 확인','Reveal all'], hide_store_all:['전부 넣기','Store all'],
  // 정비대 · 수리 / 모듈
  hide_rep_section:['수리가능 아이템','Repairable'], hide_rep_confirm:['수리를 진행 하시겠습니까?','Start the repair?'],
  hide_rep_rate:['성공률','Success rate'],
  hide_mod_section:['모듈 장착 아이템','Socketed gear'],
  hide_mod_label:['모듈','Modules'], hide_mod_attach:['모듈 장착','Install module'], hide_mod_remove:['모듈 해체','Remove module'],
  hide_mod_pick_slot:['장착 및 해체 슬롯을 선택하세요.','Pick a socket to install or remove.'],
  hide_mod_pick_module:['장착 하고싶은 모듈을 선택해주세요.','Pick a module to install.'],
  hide_mod_pull:['위로 올려 장착하기','Swipe up to install'],
  hide_mod_attach_confirm:['장착 진행 하시겠습니까?','Install this module?'],
  hide_mod_attach_running:['장착이 진행중입니다.','Installing.'],
  hide_mod_attach_done:['장착이 완료되었습니다.','Installation complete.'],
  hide_mod_attach_label:['장착','Install'], hide_mod_attach_doing:['장착중','Installing'],
  hide_mod_remove_warn:['모듈은 파괴됩니다. 진행 하시겠습니까?','The module will be destroyed. Continue?'],
  hide_mod_remove_running:['해체가 진행중입니다.','Removing.'],
  hide_mod_remove_done:['해체가 완료되었습니다.','Removal complete.'],
  hide_mod_remove_label:['해체','Remove'], hide_mod_remove_doing:['해체중','Removing'],
  hide_mod_empty:['사용 가능한 아이템이 없습니다','No usable items'],
  hide_mod_none_gear:['모듈 장착 가능한 아이템이 없습니다','No items can take modules'],
  hide_rep_empty:['수리 가능한 아이템이 없습니다','No items can be repaired'],
  module_fits_weapon:['무기에 장착가능하다.','Fits weapons.'], module_fits_armor:['방어구에 장착가능하다.','Fits armor.'],
  // 부팅 지연 안내 — 시트 응답이 늦을 때 로딩 화면에 뜬다
  boot_slow:['데이터를 불러오는 중. 연결이 다소 지연되고있습니다.','Loading data. The connection is a little slow.'],
  boot_retry:['다시 시도','Retry'], boot_offline:['오프라인으로 시작하기','Start offline'],
  boot_partial:['일부 데이터를 불러오는데 실패했습니다.','Some data failed to load.'],
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

// a weapon/armor/accessory instance is 'functional' only while it still has durability.
// dur 0 / maxDur >=1 = 파손(broken, unusable but repairable); maxDur 0 = 파괴(destroyed).
// ⚠️ 장신구(artifact)는 2026-08-26에 내구도가 생겼다 — 여기 빠져 있으면 파손·파괴된 장신구의
// 스탯이 계속 적용된다(2026-08-27 버그). 징표(talisman)는 내구도가 없어 항상 정상이다.
const DURABLE = { weapon: 1, armor: 1, artifact: 1 };
export const functional = (inst) => !inst ? false
  : (!DURABLE[inst.kind] ? true : (N(inst.maxDur) > 0 && N(inst.dur) > 0));
export function itemState(inst) {
  if (!inst || !DURABLE[inst.kind]) return 'ok';
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
    shopStockAt: 0,               // 마지막 재고 리셋 시점의 sorties (restockShopsIfDue)
    shopRolls: {},                // shopId+itemId -> 진열분 고정 롤(술 도수). 재고와 함께 리셋된다
    buffs: [],                    // 소모품 버프(§6-7) — 레이드 안에서만 산다. buffMods() 참조
    // 아지트(§3.5). lv = 시설별 현재 레벨 · upg = 진행 중인 업그레이드 {fac,to,endAt} 또는 null.
    // 시설 데이터(Facility 탭)에 다음 레벨 행이 없으면 업그레이드 버튼이 잠긴다 — 데이터가 곧 게이트다.
    hideout: { built: 0, lv: { storage: 1, repair: 1, workbench: 1, terminal: 1 }, upg: {},   // upg = 시설별 진행 중 업그레이드 맵
      disk: [], disks: [], decode: [], craft: [], disa: null },   // disk = 도면 설치 · disks = 설치 완료 BlueprintID · decode = 슬롯별 해독 · craft = 슬롯별 제작 작업
    epoch: N(C.save_epoch, 0),    // 강제 초기화 기준 — 시트 save_epoch가 이보다 크면 세이브를 버린다
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
    // 도수는 opts.proof가 오면 그걸 쓴다 — 상점 진열분은 재고 1주기 동안 같은 병이어야 한다
    // (안 그러면 미리보기를 열 때마다, 그리고 실제로 살 때 또 한 번 새로 굴려진다).
    if (liq) { inst.proof = (opts.proof != null) ? N(opts.proof) : liquorProof(liq); }   // 용량(Volume) 폐지 2026-08-18 — 감정 1회 = 1병
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
// ---------- 아지트 시설 (Facility 탭 · §3.5) ----------
// 한 행 = 시설 하나의 한 레벨. 다음 레벨 행이 없으면 그 시설은 더 못 올린다 —
// 즉 **데이터가 곧 잠금장치**다. 코드에 레벨 상한을 박지 않는다.
export function facilityRow(facId, level){
  return (DATA.facilities || []).find(r => String(r.FacilityID || '').trim() === facId && N(r.Level) === N(level)) || null;
}
function jsonCol(v){ try{ return (v && v !== '-') ? JSON.parse(v) : []; }catch(_){ return []; } }
export function facilityEffects(row){ return row ? jsonCol(row.Effects) : []; }
export function facilityCostItems(row){ return row ? jsonCol(row.CostItems) : []; }
// Unlocks = 이 레벨에서 열리는 기능 스위치(repair·module·craft·disassemble·disk·decode).
// 수치가 아니라 on/off라 Effects와 분리했다 — 섞으면 업그레이드 화면에 "제작 0 → 1" 같은 줄이 뜬다.
export function facilityUnlocks(state, facId){
  const out = new Set();
  const lv = facilityLevel(state, facId);
  for (let i = 1; i <= lv; i++){
    const r = facilityRow(facId, i); if (!r) continue;
    String(r.Unlocks || '').split(',').map(x => x.trim()).filter(x => x && x !== '-').forEach(x => out.add(x));
  }
  return out;
}
export function facilityLevel(state, facId){
  const lv = state && state.hideout && state.hideout.lv ? state.hideout.lv[facId] : 1;
  return Math.max(1, N(lv, 1));
}
// 다음 레벨 행 — 없으면 null(= 업그레이드 잠금)
export function facilityNext(state, facId){ return facilityRow(facId, facilityLevel(state, facId) + 1); }
// 현재 레벨에서 유효한 효과값 — 해당 key를 가진 **가장 높은 레벨(≤현재)** 행의 to값.
// 레벨마다 같은 key를 다시 적으므로(예: decode_slot 1→2→3) 마지막 것이 정답이다.
export function facilityEffectValue(state, facId, key, fallback){
  const lv = facilityLevel(state, facId);
  for (let i = lv; i >= 1; i--){
    const e = facilityEffects(facilityRow(facId, i)).find(x => x && x.key === key);
    if (e) return N(e.to, fallback);
  }
  return fallback;
}

// 보관고 용량 = 현재 레벨 행의 capacity 효과 to값. 행이 없으면 폴백.
export function vaultCap(state){
  const eff = facilityEffects(facilityRow('storage', facilityLevel(state, 'storage'))).find(e => e && e.key === 'capacity');
  return eff ? N(eff.to, 40) : N(C.hideout_storage_cap_fallback, 40);
}
// 사용 칸 = 금고 배열의 길이. stackAdd가 MaxStack을 넘기면 새 묶음을 만들므로
// "MaxStack 1묶음 = 1칸"이 배열 길이와 그대로 일치한다 — 따로 세지 않는다.
export function vaultUsed(state){ return ((state && state.vault) || []).length; }
export function vaultRoom(state){ return Math.max(0, vaultCap(state) - vaultUsed(state)); }

// ---------- 소모품 버프 (§6-7) ----------
// state.buffs = [{ id, type, value, left }] · left = 남은 전투 수(유지력).
// 안전지대에서도 먹을 수 있고(출발 전 준비) 세이브에 그대로 남는다. 비우는 곳은 endSortie 하나 —
// 귀환하면 유지력이 남았든 말든 사라진다("매 레이드 재투자"). 다른 데서 또 비우지 말 것.
// 중첩은 하지 않는다: 같은 EffectType은 갱신(값 큰 쪽 + 유지력 리셋) — rl.dc.html useConsumable 참조.
export function buffMods(state) {
  const out = { speedMult: 1, dmgFlatCut: 0, immune: {} };
  for (const b of (state && state.buffs) || []) {
    if (!b || N(b.left) <= 0) continue;
    if (b.type === 'attack_speed') out.speedMult *= (1 + N(b.value) / 100);   // 값 = 퍼센트
    else if (b.type === 'damage_reduce') out.dmgFlatCut += N(b.value);        // 값 = 플랫
    // 상태이상 면역 — b.stat(EffectStat) = 막을 상태이상, 값 = **차단 확률(%)**.
    // 시트가 100이라 항상 막지만, 60으로 낮추면 코드를 안 고쳐도 부분 저항이 된다.
    else if (b.type === 'status_resist' && b.stat) out.immune[b.stat] = Math.max(N(out.immune[b.stat]), N(b.value));
  }
  return out;
}

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
    if (!functional(inst)) continue;   // 파손·파괴된 장신구는 착용만 유지되고 효과는 없다(무기·방어구와 동일)
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
  const bf = buffMods(state);   // 소모품 버프 — 공속 배수 · 받는 피해 플랫 차감
  const sa = k => secAdd[k] || 0;
  return {
    name: t('common_me'),
    maxHp: Math.round(sec.sec_max_hp + sa('sec_max_hp')),
    minAtk: sec.sec_min_atk + (w ? wOpt('minAtk') : 0) + sa('sec_min_atk'),
    maxAtk: sec.sec_max_atk + (w ? wOpt('maxAtk') : 1) + sa('sec_max_atk'),
    defense: sec.sec_defense + armorDef + sa('sec_defense'),
    atkSpeed: clamp((w ? wOpt('atkSpeed') || 1 : 1) * speedMult * bf.speedMult, 0.2, 3),   // 버프는 곱한 뒤 clamp — 상한 3은 그대로
    accuracy: sec.sec_accuracy + (w ? wOpt('accuracy') : 0) + sa('sec_accuracy'),
    evasion: sec.sec_evasion + armorEva + sa('sec_evasion'),
    critChance: sec.sec_crit_chance + (w ? wOpt('critChance') : 0) + sa('sec_crit_chance'),
    critResist: sec.sec_crit_resist + sa('sec_crit_resist'),
    statusResist: sec.sec_status_resist + armorSR + sa('sec_status_resist'),
    potency: w ? wOpt('potency') : 0,
    attribute: wd ? wd.Attribute : null,
    weaponMaxDmg: w ? wOpt('maxAtk') : 2,
    dmgFlatCut: bf.dmgFlatCut,   // 소모품: 받는 피해 플랫 감소 (simulateCombat.strike에서 차감)
    statusImmune: bf.immune,     // 소모품: 상태이상별 차단 확률(%) — strike의 관통/상태이상 두 경로가 본다
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
    // 상태이상 면역(§6-7) — 플레이어가 맞는 쪽일 때만. ⚠️ 관통은 피해 계산 **전**에 처리되는
    // 별개 경로라, 아래 상태이상 블록만 막으면 더마실(pierce)이 조용히 무효가 된다.
    const immune = (target, eff) => target === A && A.statusImmune && Math.random() * 100 < N(A.statusImmune[eff], 0);
    let dmg = rand(actor.minAtk, actor.maxAtk) * ruptureMult(actor, t);
    const isCrit = opts.forceCrit || Math.random() < critChance(actor.critChance, foe.critResist);
    if (isCrit) { dmg *= N(C.crit_damage_mult, 1.5); if (actor.side === 'player') triggers.critsLanded++; }
    let pierceFrac = 0;
    if (actor.attribute === 'pierce' && !immune(foe, 'pierce') && Math.random() < statusChance(actor.potency, foe.statusResist)) {
      pierceFrac = rand(N(byId.status.pierce?.Value, 0.05), N(byId.status.pierce?.ValueMax, 0.4));
    }
    let final = defMitigate(dmg, foe.defense, pierceFrac);
    if (foe === A) {
      final *= playerDmgTakenMult();   // 부적: 받는 피해 감소 (피격 전 체력 조건)
      // 소모품(§6-7): 징표 배수를 적용한 **뒤에** 플랫 차감. 순서를 뒤집으면 징표가 좋을수록 약이 약해진다.
      // 하한 1 — 0을 허용하면 저급 몬스터 상대로 무적이 되고 로그에 '0 피해'가 찍힌다.
      const cut = N(A.dmgFlatCut, 0);
      if (cut > 0) final = Math.max(1, final - cut);
    }
    foe.hp -= final;
    if (actor.side === 'player') triggers.hitsLanded++;
    if (foe.side === 'player') triggers.hitsTaken++;
    let text = logTpl(isCrit ? 'crit' : 'hit', { Attacker: nm, Target: fnm, Damage: final.toFixed(0), TargetHP: Math.max(0, foe.hp).toFixed(0), TargetMaxHP: foe.maxHp });
    if (pierceFrac > 0) text += logTpl('pierce_suffix', { PiercePct: (pierceFrac * 100).toFixed(0) });
    if (opts.talismanCrit) text += (LANG === 'en' ? '  ⟪Token⟫' : '  ⟪징표⟫');
    push(actor.side, isCrit ? 'crit' : 'hit', text);

    // status application (non-pierce)
    if (actor.attribute && actor.attribute !== 'pierce' && foe.hp > 0 && !immune(foe, actor.attribute)) {
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

// ---------- 상점 재고 리셋 ----------
// 레이드 '복귀' N회마다(shop_stock_reset_interval) 전 상점 재고를 StockMax로 되돌린다.
// 성공·도망·사망 무관 — 결과 화면을 거치는 모든 종료가 sorties를 올리므로 그대로 쓴다.
// ⚠️ sorties % N 으로 재지 말 것: 카운터가 한 번이라도 건너뛰면 그 주기를 통째로 놓친다.
//    마지막 리셋 시점(shopStockAt)과의 경과분으로 재면 그런 구멍이 없다.
// shopStock을 비우기만 하면 각 항목이 Shop.StockMax 폴백으로 되살아난다(UI가 그렇게 조회한다).
export function restockShopsIfDue(state) {
  const iv = Math.max(1, Math.round(N(C.shop_stock_reset_interval, 3)));
  if (N(state.sorties) - N(state.shopStockAt, 0) < iv) return false;
  state.shopStock = {};
  state.shopRolls = {};          // 진열분 롤(술 도수)도 함께 새로 — 재고가 바뀌면 병도 바뀐 것
  state.shopStockAt = N(state.sorties);
  applyStockRotation(state);     // 회전재고 그룹은 다시 뽑는다 — 이번 주기에 뭐가 깔리는지가 바뀐다
  return true;
}

// 회전재고 — Shop.Notes에 '회전재고:<그룹>' 태그가 붙은 행들은 리셋 주기마다 그룹당 1종만 깔린다
// (모듈 시그니처 부품 4종이 그렇다: 매번 다 살 수 있으면 모듈이 화폐로 바뀐다).
// 진열될 1종은 값을 안 써서 Shop.StockMax 폴백으로 살아나고, 나머지는 shopStock에 0을 박아 품절로 만든다.
// ⚠️ 부팅마다 다시 뽑으면 안 된다 — 앱만 껐다 켜도 진열이 바뀐다. shopRotAt으로 주기당 한 번만.
const ROT_TAG = /회전재고\s*:\s*([A-Za-z0-9_]+)/;
export function applyStockRotation(state){
  const groups = {};
  for (const r of (DATA.shops || [])){
    const m = ROT_TAG.exec(String(r.Notes || '')); if (!m) continue;
    const k = r.ShopID + '|' + m[1];
    (groups[k] || (groups[k] = [])).push(r);
  }
  state.shopStock = state.shopStock || {};
  for (const k of Object.keys(groups)){
    const rows = groups[k], win = randInt(0, rows.length - 1);
    rows.forEach((r, i) => { if (i !== win) state.shopStock[r.ShopID + '|' + r.ItemID] = 0; });
  }
  state.shopRotAt = N(state.sorties);
  return true;
}

// ---------- repair (per-point probabilistic) ----------
// cost is a placeholder economy (repair_cost_per_point) pending client balancing.
// 장신구(artifact)는 무기·방어구와 다른 요율을 쓴다 — repair_accessory_* 키를 먼저 보고,
// 그 행이 없으면 공용 repair_* 로 떨어진다(시트에 일부만 넣어도 동작). 2026-08-27 신설.
// 값이 0인 행은 '설정 안 함'이 아니라 명시적 0으로 취급한다(기본 수공비 0 등).
function repairCfg(inst) {
  const acc = !!inst && inst.kind === 'artifact';
  const pick = (key, dflt) => {
    if (acc) { const v = C['repair_accessory_' + key]; if (v != null && v !== '') return N(v, dflt); }
    return N(C['repair_' + key], dflt);
  };
  return { per: pick('cost_per_point', 20), base: pick('cost_base', 0),
           fail: pick('fail_chance_per_point', 0.06), loss: pick('fail_maxdur_loss', 1) };
}
// UI 표기용 — '완벽 수리 확률' 계산에 쓴다. UI가 Config 키를 직접 고르면
// 장신구(다른 요율)에서 틀린 값을 보여주므로 반드시 이 함수를 통할 것.
export function repairFailChance(inst) { return repairCfg(inst).fail; }
export function repairCostPreview(inst) {
  const worn = Math.max(0, N(inst.maxDur) - N(inst.dur));
  // 수리비 = base + per × 닳은점 (시도 기준 과금 — 실패분 포함)
  const cfg = repairCfg(inst);
  return Math.ceil(cfg.base + worn * cfg.per);
}
// each worn point is restored, but with the fail chance it fails:
// a failed point is not restored and permanently drops maxDur by the loss amount.
// opts.free = 사토를 받지 않는다(아지트 정비대 — 재료로 낸다) · opts.fail = 점당 실패율 덮어쓰기
export function repair(state, inst, opts = {}) {
  const worn = Math.max(0, N(inst.maxDur) - N(inst.dur));
  if (N(inst.maxDur) <= 0) return { ok: false, reason: 'destroyed' };
  if (worn <= 0) return { ok: false, reason: 'full' };
  const cost = opts.free ? null : repairCostPreview(inst);
  if (!opts.free) {
    if (state.sato < cost) return { ok: false, reason: 'sato', cost };
    state.sato -= cost;
  }
  const cfg = repairCfg(inst);
  const p = (opts.fail != null) ? clamp(N(opts.fail), 0, 1) : cfg.fail;
  const perLoss = cfg.loss;
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
// resolve one loot row -> concrete item ids (그룹이면 LootGroupItem 추첨 · MinQty~MaxQty회 복원추출)
function isGroupRef(r){ return String(r.ItemID || '').startsWith('group_') || /Group/i.test(String(r.Category || '')); }
function groupMembers(groupId){ return (DATA.lootGroupItems || []).filter(m => m.GroupID === groupId); }
// 그룹 추첨은 기본이 균등이지만, 멤버 중 Weight를 가진 것(현재는 Module 탭뿐)은 그 값으로 가중한다.
// LootGroupItem에는 Weight 열이 없어 멤버 ID로 원본 행을 찾아 읽는다. 전부 무가중이면 균등과 같다.
function memberWeight(id){ const m = byId.module && byId.module[id]; const w = m ? N(m.Weight, 0) : 0; return w > 0 ? w : 1; }
function pickMember(members){
  const ws = members.map(m => memberWeight(m.MemberItemID));
  let total = 0; for (const w of ws) total += w;
  let r = Math.random() * total;
  for (let i = 0; i < members.length; i++){ r -= ws[i]; if (r < 0) return members[i]; }
  return members[members.length - 1];
}
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
      for (let i = 0; i < draws; i++) push(pickMember(members).MemberItemID, 1);
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
// USB 부여 효과 — Grants JSON 열(개수 자유)이 정본. 없으면 옛 GrantStat/GrantValue 한 쌍으로 폴백한다.
export function usbGrants(u){
  if (!u) return [];
  try {
    const g = u.Grants;
    if (g && g !== '-') { const a = JSON.parse(g); if (Array.isArray(a)) return a.filter(x => x && x.stat).map(x => ({ stat: x.stat, v: N(x.v, 1) })); }
  } catch(_) {}
  return u.GrantStat ? [{ stat: u.GrantStat, v: N(u.GrantValue, 1) }] : [];
}
export function statName(id){
  const sr = DATA.primaryStats.find(r => r.PrimaryStatID === id);
  return (sr && (tr(sr, 'StatName') || sr.Name_KR || sr.PrimaryStat_KR)) || STAT_KR_FALLBACK[id] || '';
}
export function substUsbTokens(s, u){
  s = String(s == null ? '' : s);
  if (!u) return s.replace(/\{USB\}|\{MAT\}|\{STAT\}|\{MIN\}/g, '');
  const mats = parseMaterials(u.RequiredMaterials).map(m => anyName(m.id) + ' ' + m.qty + '개').join(', ');
  const names = usbGrants(u).map(g => statName(g.stat)).filter(Boolean).join(', ');
  return s.replace(/\{USB\}/g, tr(u, 'Name') || '').replace(/\{MAT\}/g, mats).replace(/\{STAT\}/g, names).replace(/\{MIN\}/g, String(N(u.UploadMinutes, 1)));
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
    if (!inst || !functional(inst)) continue;   // 상대 봇도 동일 — 파손 장신구는 효과 없음(playerProfile과 대칭)
    const ar = byId.artifact[inst.id]; if (!ar) continue;
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

// ===== 아지트 · 조립대(제작) =====
// 성공률 = 도면 등급 base + 조립대 레벨 보너스(flat) — 확장_시스템_설계_v3 §제작 시스템 상세.
// 도면 행에는 성공률을 두지 않는다(등급이 곧 성공률).
const CRAFT_BASE = { Common: 80, Rare: 70, Unique: 55, Special: 45, Boss: 20 };
const CRAFT_GRADE_LV = { Common: 1, Rare: 1, Unique: 2, Special: 2, Boss: 3 };   // 해금되는 조립대 레벨

export function craftSlots(state){ return Math.max(1, N(facilityEffectValue(state, 'workbench', 'craft_slot', 1), 1)); }
export function craftBonus(state){ return N(facilityEffectValue(state, 'workbench', 'craft_bonus', 0), 0); }
export function craftGradeOk(state, grade){ return facilityLevel(state, 'workbench') >= (CRAFT_GRADE_LV[String(grade)] || 1); }
export function craftBaseRate(bp){ return N(CRAFT_BASE[String((bp && bp.Grade) || 'Common')], 80); }
export function craftRate(state, bp){ return clamp(craftBaseRate(bp) + craftBonus(state), 0, 100); }

// 시트의 JSON 열(Blueprint.Inputs · DisassembleOutputs · Module.Inputs) 공통 파서.
// 배열이면 그대로, 문자열이면 파싱. 빈 값·'TBD'·'-'·깨진 JSON은 전부 null — 호출부가 "없음"으로 다룬다.
function jsonList(raw){
  if (Array.isArray(raw)) return raw;
  const t = String(raw == null ? '' : raw).trim();
  if (!t || t === 'TBD' || t === '-') return null;
  try { const a = JSON.parse(t); return Array.isArray(a) ? a : null; } catch(_){ return null; }
}

// 재료 = 시트 Blueprint.Inputs JSON([{id,qty}]). 전 도면에 실 레시피가 들어와 더미는 제거했다(2026-09-07).
// 파싱 불가/빈 값이면 []를 준다 — 호출부는 "재료 목록이 비면 제작 불가"로 다룬다(재료 0개로 공짜 제작 방지).
export function craftInputs(bp){
  const arr = jsonList(bp && bp.Inputs);
  if (!arr) return [];
  return arr.map(x => ({ id: x.id || x.ItemID, qty: Math.max(1, N(x.qty, 1)) })).filter(x => x.id);
}


// ===== 아지트 · 조립대(분해) =====
// 분해는 실패가 없다(3초 연출이 전부). 산출은 min~max 범위로 보여주고 실행 시 굴린다.
// 소스 = 각 장비 행의 DisassembleOutputs 열(JSON [{id,min,max}]) — 대체로 그 장비의 수리 정크가 나온다.
// 열이 없거나 깨졌으면 [] — 호출부는 "분해 산출 없음"으로 다룬다(정크를 지어내지 않는다).
export function disassembleSpec(inst){
  if (!inst) return [];
  const tbl = byId[inst.kind];                       // weapon / armor / artifact / bag
  const src = tbl ? tbl[inst.id] : null;
  if (!src) return [];
  const arr = jsonList(src.DisassembleOutputs);
  if (!arr) return [];
  return arr.map(x => {
    const lo = Math.max(0, N(x.min, 0)), hi = Math.max(lo, N(x.max, lo));
    return { id: x.id || x.ItemID, min: lo, max: hi };
  }).filter(x => x.id && x.max > 0);
}
export function disassembleRoll(spec){ return (spec || []).map(s => ({ id: s.id, qty: randInt(N(s.min,1), N(s.max,1)) })).filter(d => d.qty > 0); }

// ===== 아지트 · 정비대 =====
// 수리 성공률(점당) = Facility 탭 repair_rate. Lv1이 기준선이고 위 레벨은 그 차이를 보너스로 보여준다.
export function repairRate(state){ return N(facilityEffectValue(state, 'repair', 'repair_rate', 90), 90); }
export function repairRateBase(){ const r = facilityRow('repair', 1); const e = facilityEffects(r).find(x => x && x.key === 'repair_rate'); return e ? N(e.to, 90) : 90; }

// 수리 재료 — 정비대는 사토가 아니라 정크를 받는다. 두 축(재질 + 유형)을 각각
// ceil(마모 / repair_durability_per_junk) 개씩, 최소 1개. 분해 산출이 대체로 이 정크라 분해→수리 루프가 돈다.
//   재질축: 장비 Material  ·  유형축: 무기=속성(날붙이/타격) · 방어구=고정 · 장신구=재질 열이 없어 단독
const REPAIR_MAT_JUNK = {
  '금속':'item_welding_rod', '목재':'item_wood_board', '섬유':'item_repair_thread', '합성':'item_patch_resin',
  Metal:'item_welding_rod', Wood:'item_wood_board', Fabric:'item_repair_thread', Synthetic:'item_patch_resin' };
const REPAIR_EDGE_ATTR = new Set(['bleed','pierce']);      // 날붙이 — 나머지(stun/rupture/none)는 타격
export function repairInputs(inst){
  if (!inst) return [];
  const worn = Math.max(0, N(inst.maxDur) - N(inst.dur));
  if (worn <= 0) return [];
  const qty = Math.max(1, Math.ceil(worn / Math.max(1, N(C.repair_durability_per_junk, 5))));
  const tbl = byId[inst.kind], src = tbl ? tbl[inst.id] : null;
  if (!src) return [];
  if (inst.kind === 'artifact') return [{ id: 'item_fine_parts', qty }];   // 장신구는 정밀 부품 단독
  const out = [];
  const mat = REPAIR_MAT_JUNK[String(src.Material || '').trim()];
  if (mat) out.push({ id: mat, qty });
  if (inst.kind === 'weapon') out.push({ id: REPAIR_EDGE_ATTR.has(String(src.Attribute || '').trim()) ? 'item_metal_file' : 'item_rivets', qty });
  else if (inst.kind === 'armor') out.push({ id: 'item_strap_buckle', qty });
  return out;
}
// 모듈 장착 재료 = 시트 Module.Inputs(계열별 전자 정크 2종). 사토는 안 받는다(module_attach_cost=0).
export function moduleInputs(moduleId){
  const arr = jsonList(byId.module[moduleId] && byId.module[moduleId].Inputs);
  if (!arr) return [];
  return arr.map(x => ({ id: x.id || x.ItemID, qty: Math.max(1, N(x.qty, 1)) })).filter(x => x.id);
}

// ===== 퀘스트 (Quest 탭 · 일일) =========================================
// 시트의 Objective/Reward는 JSON 열이다. Objective는 targets 배열이 정본이고,
// 구형 {target,count} 한 벌짜리도 길이 1 배열로 감싸 받는다(번들 폴백·옛 시트 대비).
function questJson(raw){
  const t = String(raw == null ? '' : raw).trim();
  if (!t || t === 'TBD' || t === '-') return null;
  try { const o = JSON.parse(t); return (o && typeof o === 'object') ? o : null; } catch(_){ return null; }
}
export function questRows(){ return DATA.quests || []; }
export function questRow(id){ return (DATA.quests || []).find(q => q.QuestID === id) || null; }
// {kind, targets:[{id|filter, count}], ...조건 플래그}. 목표가 하나도 없으면 null — 호출부가 "표시 안 함"으로 다룬다.
export function questObjective(q){
  const o = questJson(q && q.Objective); if (!o || !o.kind) return null;
  let ts = Array.isArray(o.targets) ? o.targets : null;
  if (!ts) ts = [{ id: o.target, filter: o.filter, count: o.count }];      // 구형 폴백
  // 대상 지정 축 3종 — id(단일 ID) / filter(Category 목록) / effect(EffectType). 셋 중 하나만 있으면 유효.
  ts = ts.map(x => ({ id: x.id || null, filter: Array.isArray(x.filter) ? x.filter : null,
                      effect: x.effect ? String(x.effect).trim() : null,
                      count: Math.max(1, N(x.count, 1)) }))
         .filter(x => x.id || x.filter || x.effect);
  if (!ts.length) return null;
  return { ...o, kind: String(o.kind), targets: ts };
}
export function questReward(q){
  const r = questJson(q && q.Reward) || {};
  return { sato: N(r.sato, 0), pass: N(r.pass, 0),
           items: (r.items && typeof r.items === 'object') ? r.items : {},
           group: (r.group && r.group.id) ? { id: r.group.id, min: Math.max(1, N(r.group.min, 1)), max: Math.max(1, N(r.group.max, 1)) } : null };
}
// 리셋 주기 — 오늘 quest_reset_anchor_hour시 정각을 기준점으로 잡고 quest_reset_minutes 간격으로 칸을 나눈다.
// 30분이면 05:00·05:30·06:00…, 1440분이면 매일 05:00 한 번. 같은 식으로 둘 다 돈다.
export function questResetMinutes(){ return Math.max(1, N(C.quest_reset_minutes, 1440)); }
export function questPeriod(now){
  const t = now == null ? Date.now() : now;
  const d = new Date(t); const anchor = new Date(d.getFullYear(), d.getMonth(), d.getDate(), N(C.quest_reset_anchor_hour, 5), 0, 0, 0);
  return Math.floor((t - anchor.getTime()) / (questResetMinutes() * 60000));
}
// 다음 리셋까지 남은 ms
// ===== 일일 퀘스트 로테이션 (셔플 백) =====
// 덱을 섞어 위에서부터 뽑고, 다 쓰면 다음 사이클 시드로 다시 섞는다.
// 재등장 간격이 '덱 크기 ÷ 하루 뽑는 수'로 정확히 떨어진다(일반 20장·3장 → 약 7일 / 고난도 7장·1장 → 7일).
// 주기 인덱스(questPeriod)를 시드로 쓰므로 시트에도 세이브에도 아무것도 남기지 않는다 — 같은 날은 항상 같은 결과.
function qHash(str){
  let h = 2166136261 >>> 0; const t = String(str);
  for (let i = 0; i < t.length; i++){ h ^= t.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function qShuffle(list, seed){                       // xorshift32 + Fisher-Yates (시드 고정 = 결정론적)
  const a = list.slice(); let s = (seed >>> 0) || 1;
  const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
// 누적 인덱스 = period*perDay + k. 사이클이 넘어가면 그 사이클 시드로 다시 섞는다(하루 안에서 경계를 넘어도 안전).
// take = 실제로 뽑아볼 장수. 사이클 경계를 넘는 날은 이미 나온 카드가 다시 나올 수 있어서,
// 여유분을 더 뽑아두고 호출부에서 중복을 걷어낸 뒤 앞에서 perDay장을 취한다.
// (여유분을 안 두면 그날 한 상인만 2장이 되어 노출 수가 틀어진다.)
function qBag(list, key, period, perDay, take){
  const n = list.length; if (!n || perDay <= 0) return [];
  const want = Math.max(perDay, take || perDay);
  const out = [], cache = {};
  for (let k = 0; k < want; k++){
    const g = period * perDay + k, cyc = Math.floor(g / n), pos = ((g % n) + n) % n;
    if (!cache[cyc]) cache[cyc] = qShuffle(list, qHash(key + '|' + cyc));
    out.push(cache[cyc][pos]);
  }
  return out;
}
export function questTier(q){
  return String((q && q.Tier) || '').trim().toLowerCase() === 'hard' ? 'hard' : 'normal';
}
export function questPerVendor(){ return Math.max(1, N(C.quest_daily_per_vendor, 3)); }
// 오늘의 편성 — 고난도는 **전역 덱에서 하루 1장**이고, 그 퀘스트의 GiverVendorID가 곧 오늘의 상인이다.
// 일반은 상인별 덱에서 perDay장. 고난도가 붙은 상인은 마지막 한 칸을 고난도에 내준다(하루 노출 수는 그대로).
export function questDaily(period){
  const p = period == null ? questPeriod() : period;
  const rows = (DATA.quests || []).filter(q => String(q.Type || '') === 'daily');
  const per = questPerVendor();
  const hard = qBag(rows.filter(q => questTier(q) === 'hard'), 'hard', p, 1)[0] || null;
  const hv = hard ? String(hard.GiverVendorID || '') : '';
  const byVendor = {};
  for (const vid of [...new Set(rows.map(q => String(q.GiverVendorID || '')))]){
    const pool = rows.filter(q => String(q.GiverVendorID || '') === vid && questTier(q) === 'normal');
    const seen = new Set();
    // 여유분까지 뽑아 중복을 걷어내고 앞에서 per장. 풀이 per보다 작으면 있는 만큼만 나온다(콘텐츠 부족 구간 대비).
    let picked = qBag(pool, 'v:' + vid, p, per, Math.min(pool.length, per * 2)).filter(q => {
      if (!q || seen.has(q.QuestID)) return false; seen.add(q.QuestID); return true; }).slice(0, per);
    if (vid === hv){ picked = picked.slice(0, Math.max(0, per - 1)); picked.push(hard); }
    byVendor[vid] = picked;
  }
  if (hv && !byVendor[hv]) byVendor[hv] = [hard];
  return { period: p, hard, byVendor };
}
export function questTodayIds(period){
  const d = questDaily(period), s = new Set();
  for (const vid in d.byVendor) for (const q of d.byVendor[vid]) if (q) s.add(q.QuestID);
  return s;
}

export function questResetLeft(now){
  const t = now == null ? Date.now() : now;
  const step = questResetMinutes() * 60000;
  const d = new Date(t); const anchor = new Date(d.getFullYear(), d.getMonth(), d.getDate(), N(C.quest_reset_anchor_hour, 5), 0, 0, 0).getTime();
  const passed = t - anchor;
  return step - ((passed % step) + step) % step;
}

export { ATTR_KR, N, C };

// RL Prototype — pure game engine. No DOM.
// Data source is swappable: starts from the bundled snapshot, can be replaced
// live via setDATA() (e.g. a fresh Google-Sheets fetch).
import { DATA as FALLBACK } from './data/game-data.js';
import { buildIndex } from './sheet-loader.js';

export let DATA = FALLBACK;
export let byId = buildIndex(FALLBACK).byId;
let C = DATA.config;
export function anyItem(id){ return byId.item[id] || byId.weapon[id] || byId.armor[id] || byId.artifact[id] || null; }
export function anyName(id){
  const o = anyItem(id);
  if (o){
    const base = o.ItemID ? 'ItemName' : o.WeaponID ? 'WeaponName' : o.ArmorID ? 'ArmorName' : 'ArtifactName';
    return tr(o, base) || id;
  }
  const u = (DATA.usb || []).find(x => x.USBID === id);
  return u ? (tr(u, 'Name') || id) : id;
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
  if (!row) return String(key);
  const en = row.Text_EN, kr = row.Text_KR;
  if (LANG === 'en') return (en != null && en !== '') ? String(en) : String(kr || key);
  return (kr != null && kr !== '') ? String(kr) : String(en || key);
}
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
  const equip = { weapon: null, head: null, body: null, artifact1: null, artifact2: null };
  for (const it of vault) {
    if (it.kind === 'weapon' && !equip.weapon) equip.weapon = it.uid;
    else if (it.kind === 'armor') {
      const a = byId.armor[it.id];
      if (a && a.Category === 'Head' && !equip.head) equip.head = it.uid;
      if (a && a.Category === 'Body' && !equip.body) equip.body = it.uid;
    }
    else if (it.kind === 'artifact') {
      const af = byId.artifact[it.id];
      if (af && af.Category === 'Artifact_Carried' && !equip.artifact2) equip.artifact2 = it.uid;
      else if (!equip.artifact1) equip.artifact1 = it.uid;
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
export function mkInstance(id, qty = 1) {
  const w = byId.weapon[id], a = byId.armor[id], it = byId.item[id], af = byId.artifact[id];
  let kind = 'item', maxDur = 0;
  if (w) { kind = 'weapon'; maxDur = N(w.MaxDurability); }
  else if (a) { kind = 'armor'; maxDur = N(a.MaxDurability); }
  else if (af) { kind = 'artifact'; maxDur = N(af.MaxDurability); }
  const inst = { uid: 'u' + (_uid++), id, kind, qty };
  if (kind === 'weapon' || kind === 'armor' || kind === 'artifact') { inst.dur = maxDur; inst.maxDur = maxDur; }
  // roll ranged stats once, fixed for the life of this instance
  if (w) {
    inst.minAtk = randInt(N(w.MinAtk_Low), N(w.MinAtk_High));
    inst.maxAtk = randInt(N(w.MaxAtk_Low), N(w.MaxAtk_High));
    if (inst.maxAtk < inst.minAtk) inst.maxAtk = inst.minAtk;
  } else if (a) {
    inst.def = randInt(N(a.Def_Low), N(a.Def_High));
  } else if (af) {
    inst.stat1 = randInt(N(af.Value1_Low), N(af.Value1_High));
    if (af.Stat2 && af.Stat2 !== '-') inst.stat2 = randInt(N(af.Value2_Low), N(af.Value2_High));
  }
  // roll prefix + suffix affixes from the item's group pools
  if (w) inst.affixes = [rollAffix('weapon', w.PrefixGroups, 'prefix'), rollAffix('weapon', w.SuffixGroups, 'suffix')].filter(Boolean);
  else if (a) inst.affixes = [rollAffix('armor', a.PrefixGroups, 'prefix'), rollAffix('armor', a.SuffixGroups, 'suffix')].filter(Boolean);
  return inst;
}

// weighted-random one affix from the pools referenced by the item, of the given type
function rollAffix(category, groupsStr, type) {
  const groups = String(groupsStr || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!groups.length) return null;
  const pool = DATA.affixes.filter(af => af.AffixType === type && (!af.Category || af.Category === category) && groups.includes(af.GroupID));
  if (!pool.length) return null;
  const total = pool.reduce((s, af) => s + Math.max(1, N(af.Weight, 1)), 0);
  let r = Math.random() * total, pick = pool[pool.length - 1];
  for (const af of pool) { r -= Math.max(1, N(af.Weight, 1)); if (r <= 0) { pick = af; break; } }
  return { affixId: pick.AffixID, name: pick.AffixName_KR, type, target: pick.TargetStat, targetKr: pick.TargetStat_KR, value: randInt(N(pick.Value_Min), N(pick.Value_Max)) };
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
  // gather affix bonuses from equipped gear (prefix/suffix rolled per instance)
  const primAdd = { str: 0, dex: 0, vit: 0, will: 0 }; const secAdd = {};
  for (const inst of [w, headInst, bodyInst]) {
    if (!inst || !inst.affixes) continue;
    for (const af of inst.affixes) { const pk = PRIM[af.target]; if (pk) primAdd[pk] += af.value; else secAdd[af.target] = (secAdd[af.target] || 0) + af.value; }
  }
  // equipped artifacts contribute Stat1/Stat2 (rolled per instance; may be negative)
  for (const uid of [state.equip.artifact1, state.equip.artifact2]) {
    if (!uid) continue; const inst = instById(state, uid); if (!inst) continue;
    const ar = byId.artifact[inst.id]; if (!ar) continue;
    const applyStat = (key, val) => { if (!key || key === '-' || val == null || val === '') return; const pk = PRIM[key]; if (pk) primAdd[pk] += N(val); else secAdd[key] = (secAdd[key] || 0) + N(val); };
    applyStat(ar.Stat1, inst.stat1 != null ? inst.stat1 : N(ar.Value1_Low));
    applyStat(ar.Stat2, inst.stat2 != null ? inst.stat2 : N(ar.Value2_Low));
  }
  const p = { ...state.primary };
  if (staminaZero) { const k = 1 - N(C.stamina_penalty_rate, 0.5); p.str *= k; p.dex *= k; p.vit *= k; p.will *= k; }
  p.str += primAdd.str; p.dex += primAdd.dex; p.vit += primAdd.vit; p.will += primAdd.will;
  const sec = deriveSecondary(p);
  const armorDef = (headInst ? (headInst.def ?? N(head.Def_Low)) : 0) + (bodyInst ? (bodyInst.def ?? N(body.Def_Low)) : 0);
  const armorEva = (head ? N(head.Evasion) : 0) + (body ? N(body.Evasion) : 0);
  const armorSR = (head ? N(head.StatusResist) : 0) + (body ? N(body.StatusResist) : 0);
  const speedMult = clamp(1 + p.dex * 0.015, 0.3, 3);
  const sa = k => secAdd[k] || 0;
  return {
    name: '나',
    maxHp: Math.round(sec.sec_max_hp + sa('sec_max_hp')),
    minAtk: sec.sec_min_atk + (w ? (w.minAtk ?? N(wd.MinAtk_Low)) : 0) + sa('sec_min_atk'),
    maxAtk: sec.sec_max_atk + (w ? (w.maxAtk ?? N(wd.MaxAtk_High)) : 1) + sa('sec_max_atk'),
    defense: sec.sec_defense + armorDef + sa('sec_defense'),
    atkSpeed: clamp((wd ? N(wd.AttackSpeed, 1) : 1) * speedMult, 0.2, 3),
    accuracy: sec.sec_accuracy + (wd ? N(wd.Accuracy) : 0) + sa('sec_accuracy'),
    evasion: sec.sec_evasion + armorEva + sa('sec_evasion'),
    critChance: sec.sec_crit_chance + (wd ? N(wd.CritChance) : 0) + sa('sec_crit_chance'),
    critResist: sec.sec_crit_resist + sa('sec_crit_resist'),
    statusResist: sec.sec_status_resist + armorSR + sa('sec_status_resist'),
    potency: wd ? N(wd.Potency) : 0,
    attribute: wd ? wd.Attribute : null,
    weaponMaxDmg: w ? (w.maxAtk ?? N(wd.MaxAtk_High)) : 2,
    primAdd,
    sec,
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
};
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
        push(actor.side, 'dot', logTpl('dot_bleed', { Target: actor.side === 'player' ? (LANG==='en'?'You':'나') : actor.name, Damage: b.dmg.toFixed(0), CurrentHP: Math.max(0, actor.hp).toFixed(0) }));
        b.nextTick += b.interval;
        if (actor.hp <= 0) break;
      }
    }
    actor.bleed = actor.bleed.filter(b => b.until > t);
    if (actor.hp <= 0) break;

    if (actor.stunUntil > t) { // stunned: skip, reschedule
      push(actor.side, 'stun', logTpl('stun_skip', { Target: actor.side === 'player' ? (LANG==='en'?'You':'나') : actor.name }));
      actor.next = actor.stunUntil + 1 / actor.atkSpeed;
      continue;
    }

    // attempt hit
    const hc = hitChance(actor.accuracy, foe.evasion);
    const nm = actor.side === 'player' ? (LANG==='en'?'You':'나') : actor.name;
    const fnm = foe.side === 'player' ? (LANG==='en'?'You':'나') : foe.name;
    if (Math.random() > hc) {
      push(actor.side, 'miss', logTpl('miss', { Attacker: nm, Target: fnm, HitPct: (hc * 100).toFixed(0) }));
      if (foe.side === 'player') triggers.evades++;
      actor.next = t + 1 / actor.atkSpeed;
      continue;
    }
    // damage
    let dmg = rand(actor.minAtk, actor.maxAtk) * ruptureMult(actor, t);
    const isCrit = Math.random() < critChance(actor.critChance, foe.critResist);
    if (isCrit) { dmg *= N(C.crit_damage_mult, 1.5); if (actor.side === 'player') triggers.critsLanded++; }
    // pierce (attacker attribute)
    let pierceFrac = 0;
    if (actor.attribute === 'pierce' && Math.random() < statusChance(actor.potency, foe.statusResist)) {
      pierceFrac = rand(N(byId.status.pierce?.Value, 0.05), N(byId.status.pierce?.ValueMax, 0.4));
    }
    const final = defMitigate(dmg, foe.defense, pierceFrac);
    foe.hp -= final;
    if (actor.side === 'player') triggers.hitsLanded++;
    if (foe.side === 'player') triggers.hitsTaken++;
    let text = logTpl(isCrit ? 'crit' : 'hit', { Attacker: nm, Target: fnm, Damage: final.toFixed(0), TargetHP: Math.max(0, foe.hp).toFixed(0), TargetMaxHP: foe.maxHp });
    if (pierceFrac > 0) text += logTpl('pierce_suffix', { PiercePct: (pierceFrac * 100).toFixed(0) });
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
    actor.next = t + 1 / actor.atkSpeed;
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
// remainders accumulate on the instance (_wear) across encounters.
export function applyDurabilityWear(state, triggers) {
  const wpl = N(C.dura_weapon_hits_per_loss, 20);
  const apl = N(C.dura_armor_hits_per_loss, 20);
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
export function spawnDistribution(zoneId) {
  const rows = (DATA.spawnTable || []).filter(r => r.ZoneID === zoneId && byId.monster[r.MonsterID]);
  if (!rows.length) return null;
  const base = rows.find(r => N(r.IsBase) === 1);
  const specials = rows.filter(r => N(r.IsBase) !== 1);
  const specialSum = specials.reduce((s, r) => s + N(r.SpawnChance), 0);
  const dist = specials.map(r => ({ id: r.MonsterID, chance: N(r.SpawnChance) }));
  if (base) dist.push({ id: base.MonsterID, chance: Math.max(0, 100 - specialSum), base: true });
  return dist.filter(d => d.chance > 0);
}
// one weighted draw; falls back to any same-zone/legacy monster if no table
export function drawMonster(zoneId) {
  const dist = spawnDistribution(zoneId);
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
export function drawCards(zoneId, n) {
  const out = []; for (let i = 0; i < Math.max(1, n); i++) out.push(drawMonster(zoneId)); return out;
}

// ---------- loot ----------
export function rollLoot(monsterId) {
  const out = [];
  for (const r of DATA.lootTable) {
    if (r.MonsterID !== monsterId || !r.ItemID) continue;
    if (Math.random() * 100 < N(r.DropRate)) {
      out.push({ id: r.ItemID, qty: randInt(N(r.MinQty, 1), N(r.MaxQty, 1)) });
    }
  }
  return out;
}

// ---------- growth ----------
export function growthMultiplier(state, stat) {
  const tagKey = { str: 'GrowthTag_Str', dex: 'GrowthTag_Dex', vit: 'GrowthTag_Vit', will: 'GrowthTag_Will' }[stat];
  let tags = 0;
  for (const uid of [state.equip.weapon, state.equip.head, state.equip.body]) {
    if (!uid) continue; const inst = instById(state, uid); if (!inst) continue;
    const src = byId.weapon[inst.id] || byId.armor[inst.id];
    if (src) tags += N(src[tagKey]);
  }
  return N(C.growth_tag_mult_base, 0.25) + N(C.growth_tag_mult_step, 0.25) * tags;
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

// ---------- USB growth (USB tab · vendor_usb_tech) ----------
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
export function usbLine(stage, usbRow){
  const rows = (DATA.npcDialogue || []).filter(r => String(r.NPC) === 'vendor_usb_tech' && String(r.Flow) === 'usbload' && String(r.Stage) === stage);
  let pool = rows.map(r => String(tr(r, 'Line') || '').trim()).filter(Boolean);
  if (!pool.length) pool = USB_TPL[stage] || [''];
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
    grade: '생존자', staminaCost: 1, timeLimit: N(C.pvp_time_limit, 20),
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

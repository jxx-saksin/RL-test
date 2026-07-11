# RL Extraction — Design System

Design system for **"가치의 역전 (Value Inversion)"** — a text-based Extraction survival game. Derived from the tone brief in `SCREEN_SPEC_MVP.md` §1 (디자인 방향) and the world/systems in `Game_Concept_v2.md`.

> **Source documents** (in `uploads/`): `SCREEN_SPEC_MVP.md` (screen spec & MVP scope, the input doc), `Game_Concept_v2.md` (concept & systems). Data lives in external Google Sheets (`RL_*`).

---

## The idea in one line

**A cold ledger for staying alive.** The UI pretends to be an ordinary daily app — a productivity tool crossed with a finance app — that happens to manage life, fatigue, durability and a strange currency called Sato. There is no game chrome. No HUD flourish, no rarity rainbows, no bevels. Just quiet numbers, honest lists, and a combat *log* that reads like a transaction history you can't undo.

The dread comes from restraint. The world already ended; the app just keeps the books.

---

## CONTENT FUNDAMENTALS

How copy is written:

- **Register:** flat, clerical, unsentimental. The app never hypes, never comforts. It states.
- **Voice:** system-neutral, third-person. It addresses the player as an operator of a tool, not a hero. Avoid "You bravely…"; prefer "명중. 12 피해." / "내구도 −3."
- **Language:** Korean primary. Numbers and log entries lean terse. English/roman only for system labels, grades (Common/Rare/Unique/Special) and IDs.
- **Casing:** Korean can't uppercase, so emphasis comes from **weight, color, and mono kicker labels with letter-spacing**, not caps. The few EN labels (grades, tab route codes) may use wide tracking.
- **Numbers are the star.** Balances, prices, damage, durability, stamina — always mono, tabular, aligned. A player should be able to scan a column of numbers like a bank statement.
- **Tone of warnings:** blunt and final. Irreversible actions say exactly what is lost: "수리 시 최대 내구도가 영구히 감소합니다." No euphemism.
- **No emoji.** Ever. Iconography is thin-line and monochrome (see ICONOGRAPHY).
- **Example log line:** `[03] 녹슨 파이프 · 명중 · 14 피해 (크리)  ▸ 출혈 +1` — turn index, actor, outcome, number, status, all quietly punctuated.

---

## VISUAL FOUNDATIONS

- **Color:** near-black neutral base with a whisper of blue (hue ~264) so it reads *cold*, never cozy-warm. Five-step surface ladder (`--bg-void` → `--surface-3`); elevation is carried by surface lightness + hairlines far more than by shadow. Text in four dimmed tiers (never pure white). Accents are **muted ink** — a restrained asset-teal for Sato/money, a clay red for death & permanent loss, amber for irreversible warnings, sage for recovery. Chroma stays low (≤0.12 at the reddest). **No rarity color:** items have no grades, so nothing is ever tinted by quality — value comes from stats and combination, per the concept's "가치의 역전."
- **Type:** two families. **IBM Plex Sans KR** for language (UI, headings, body); **IBM Plex Mono** for *data* (the combat log, every number, stat values, prices, IDs, timestamps). Rule: read-as-language → sans; read-as-data → mono + tabular. ⚠ Both are **temporary placeholders** pending client-supplied EN/number/KR fonts (see CAVEATS).
- **The log is the hero surface.** Mono, 14px, line-height 1.62 for a deliberate rhythm. Rounds separated by hairlines. Inline colored tokens for damage/crit/heal/status — sparingly, so signal stays sharp. New lines fade+rise in quietly (`--dur-logline`), never slide or bounce.
- **Backgrounds:** flat surfaces only. No gradients, no textures, no imagery behind content. Any imagery placeholder is a subtly-striped neutral block with a mono caption — this game ships almost no illustration by design.
- **Spacing:** 4px grid, 16px gutter, dense like a finance app, but rows stay ≥44px tappable.
- **Radii:** restrained — 4px chips, 6px inputs/buttons, 8px cards, 14px sheets. Never bubbly.
- **Borders:** 1px hairlines (`--line-1`) do most of the structural work; `--line-2` for component edges.
- **Shadows:** reserved for floating layers only (dialogs, bottom sheets, sticky bars). Content-level cards use surface + hairline, not shadow.
- **Motion:** quiet and short (120–260ms), eased-out, no bounce, nothing celebratory. Hover = +1 surface step; press = brief background darken (no scale toys). Destructive confirms don't animate playfully.
- **Layout:** mobile-first portrait. Bottom tab nav is the primary chrome. Sticky resource bars at top of combat. Content scrolls under fixed chrome.

---

## ICONOGRAPHY

- **System:** [Lucide](https://lucide.dev) — thin (1.5–2px) monochrome line icons, loaded from CDN. Chosen for a clinical/productivity feel that matches the "daily app" disguise; never filled, never multicolor.
- **Color:** icons inherit `--text-lo` (idle) / `--text-hi` (active). Never accent-colored except a single semantic glyph in a danger dialog.
- **Tab icons (MVP):** home (안전가옥), target/swords (출정), package (인벤토리), user (캐릭터), store (상점), wrench (수리).
- **No emoji, no unicode-as-icon, no hand-drawn SVG.** Status effects and grades are shown as mono *text* tokens + a tiny color dot, not pictograms.
- **Imagery:** none by design. Where a monster/item art slot might one day exist, use a striped neutral placeholder with a mono caption.

---

## INDEX / MANIFEST

- `styles.css` — global entry (imports all tokens). **Consumers link this one file.**
- `tokens/` — `fonts.css` (⚠ temp), `colors.css`, `typography.css`, `spacing.css`, `effects.css`.
- `guidelines/` — foundation specimen cards (Colors, Type, Spacing) shown in the Design System tab.
- `components/` — component specimen cards: log view, resource bars, item card, monster card, category tags, list, tab nav, dialog, buttons.
- `ui_kits/game/` — composed screens (S2 안전가옥 허브, S4 전투 로그) on phone frames.
- `SKILL.md` — portable skill wrapper.

## CAVEATS

- **Fonts are temporary.** IBM Plex Sans KR + IBM Plex Mono stand in until the client's dedicated EN / number / KR fonts arrive. Swap the two `@font-face` families in `tokens/fonts.css`; nothing else changes.
- Components are delivered as **visual specimen cards** this pass (the derived look for each requested component). Reusable code components / a click-through prototype are a natural next step.

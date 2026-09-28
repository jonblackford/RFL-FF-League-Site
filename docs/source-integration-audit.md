# Additional-source integration audit — 28 September 2026

Scope: inventoried all 14 supplied project directories and reviewed their relevant executable modules, data contracts and UI patterns. This is a capability/integration review, not a claim that every archived file or model was independently validated. The source directories are unchanged. The production app stays Vue/TypeScript with static GitHub Pages hosting.

## Integrated AI workflows

`src/features/advisor/intelligence.ts` is the common evidence service consumed by the Advisor Insights tab and the AI prompt. It combines current league ownership and projection coverage with completed-week usage and imported league scoring. `AdvisorChat.vue` exposes weekly planning, roster checks, waiver research, two-sided trade research and evidence checks. The Gemini system instruction keeps observed scores, projections, estimates and missing inputs separate.

The trade signals adapt `fantasy-football-ai/src/fantasy_football_ai/reporting.py:get_trade_suggestions`: latest completed score compared with the earlier mean, with +10 / -5 thresholds. The adaptation uses canonical IDs and at least two earlier observations, never names as identity or future weeks. These are investigation leads, not predictions. The source's standard-deviation and two-sided trade-analysis ideas are available in evidence and the analysis protocol.

The waiver workflow adapts `analysis.py:find_waiver_gems` and `pickup_suggester.py`: examine opportunity before chasing fantasy points. The original helper excludes only the user's roster and acknowledges inaccurate ESPN free-agent lists. This implementation excludes **all** currently owned players in the active Sleeper league, checks availability, and reports a rising-usage watch list. It requires at least two observations, latest targets + carries >= 8, and a rise >= 2 over the earlier available average. It does not call projections observed production or claim to implement the original high-usage/low-points quantile model without its required scoring inputs.

Fantasy-Intelligence's `app/core/evidence-semantics.js`, `value-calibration-guard.js`, architecture/data contracts and audit boundary informed the evidence classifications, canonical identity, scoring coverage, per-league context and missing-data handling. This is an original adapter, **not** a port or activation of its research forecasting engines. Current source contracts explicitly distinguish research candidates, promotion, league-local lineage, calibrated ranges and missing evidence. Its private league snapshots, model coefficients and unlicensed runtime code are not copied. The app's existing scoring/eligibility service remains authoritative.

## Review of every supplied project

| Source | Relevant implementation reviewed | Integration / disposition |
| --- | --- | --- |
| fantasy-football-ai | `analysis.py`, `reporting.py`, `pickup_suggester.py`, `trade_suggester.py`, AGENTS and README | Adapted observed trade signals, usage-first waiver research, roster audit and two-sided AI trade protocol. Apache-2.0 license included under `third_party/`. Its personal ESPN rules and credentials are excluded. |
| Fantasy-Intelligence | current architecture/data contracts/audit boundary; `app/core/evidence-semantics.js`, `value-calibration-guard.js`; specialist/runtime module inventory | Original evidence-quality adapter and specialist scoring instructions. No candidate model activation, probability claims or cross-league artifact reuse. |
| fantasy-football-metrics-weekly-report | `ffmwr/calculate/coaching_efficiency.py`, `metrics.py`, report structure | Existing legal-lineup calculations feed weekly awards. Rebuilt summaries, scored-week selection, source labels, exports and paginated PDF-ready reports. Corrected unsupported bad-luck/efficiency awards. No Python report server required. |
| Sleeper-Watchdog | `src/rules/checks/roster_oversight.py`, `settings_changed.py`, rule inventory | Empty-starting-slot and availability reminders in Insights; existing transaction activity view retained. Unlike the earlier inventory's scaffold assumption, actual rules are present. Its commissioner strikes, constitutional deadlines, settings-change enforcement and Discord delivery are not suitable universal league defaults. |
| league-page | `src/lib/utils/Classes/records.js`, transactions page loader and route inventory | League-scoped history, records and transaction browsing remain in the Vue app; clearer shared guide/navigation connects them. No duplicate Svelte app or state store. |
| fantasy-plus | player/projection/cache routines in `index.html`, README | Compact league/team/week selectors, responsive decision cards and explicit data-failure behavior. Its standard/PPR projection shortcut is not substituted for custom scoring. |
| sleeper-chatgpt | Competition workflow, README and bundled context structure | Compact context-driven explanation pattern retained in bounded, league/team/week-isolated conversations. Historical bundled JSON is not used as current facts. |
| nflverse-data | release/archive/upload structure and license | Existing scheduled verified weekly usage feed remains the shared enrichment source. Preserve source timestamp on refresh failure. |
| nflreadpy | `load_stats.py`, loader inventory | Verified season/week loader conventions; existing lightweight Python CSV job supplies compact JSON, avoiding an unnecessary browser/Python runtime. |
| nflreadr | `R/load_stats.R` and data-dictionary conventions | Weekly vs season and REG/POST boundaries inform enrichment validation. No R dependency in the site. |
| NFLData.jl | `src/statsdata.jl` and reader structure | Confirms the same upstream dataset role; no additional Julia runtime or duplicate feed. |
| nflfastR | `R/calculate_stats.R` player/team and season-type contract | Uses published historical usage, not a transplanted EPA model or unverified forecast. Advanced play-by-play metrics are not fabricated when absent from the feed. |
| nflseedR | simulation function validation and seeding module inventory | NFL-specific simulation/tiebreak rules are incompatible with fantasy leagues. Existing fantasy simulations retained with plain-language uncertainty explanations. |
| fantasy-manager | `components/Player.js`, application/provider inventory, README | Player-card/search/filter interaction patterns adapted into the responsive Player Values view and existing watchlists. Soccer transfer budgets, authentication and scoring are not imported. |

## Site and report behavior

- Shared navy surfaces, red accent, spacing, grouped navigation and explanatory feature guides apply across the league workspace. Existing specialized charts are retained.
- Weekly reports calculate from the chosen imported week rather than an unavailable AI backend. Notes are isolated by provider, league, season and week. Copy, text and image export work locally.
- **Save PDF / print** opens a dedicated printable report. Choose **Save as PDF** in the native print dialog. It includes score comparisons, matchup results, awards, player performances, notes, league/season/week and creation time. No PDF service or upload is involved.
- Player Values includes every rostered player and labels its index as recorded production, not a proprietary price or forecast. Historical scoring already reflects imported league rules. Byes/zeroes included in recorded roster weeks affect the average; sample coverage is explicit. Missing history is not a zero-value conclusion.
- Optional AI now uses Firebase AI Logic on the unbilled `rfl-agent` project. Visitors do not need their own Gemini key. App Check is enforced; no paid fallback or provider secret is embedded. Free quotas still apply.

## Verification boundaries

Deterministic tests cover selected-week isolation, unknown values, missing starter-score alignment, ownership exclusions, future-week exclusion, report escaping and notes. Browser checks cover report navigation, exports, mobile layout, Player Values, Advisor Insights and existing multi-league flows. A PDF is generated through Chromium and rendered with PyMuPDF to verify text and layout. Public-source live availability is checked separately; mock tests do not prove current upstream service health.

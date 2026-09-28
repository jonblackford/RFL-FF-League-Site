# Additional source integration proposal

This revises the audience and integration scope of `2026-09-28-rfl-integrated-experience-design.md`. It is a researched proposal, not an implementation or deployment record. The user explicitly selected **any fantasy manager across multiple leagues**. That supersedes the older RFL-only scope. Retain the earlier free-only operating constraint unless the user changes it.

## Revised product design

Build one multi-league fantasy dashboard within the existing Vue application. Users add supported league identifiers, select their team, save leagues locally and switch between them. Sleeper is the initial complete decision-support integration; retain existing ESPN analytics and clearly expose which ESPN capabilities are actually supported. Do not promise identical coverage or private ESPN league access before validating the existing adapter. RFL may remain a saved preset, but must not silently supply another league's scoring or team identity.

Primary navigation covers Overview, Lineup, Waivers, Players, Trades, Reports and League History, reusing existing screens where appropriate. A persistent league/team/season/week selector supplies the same context to every feature. The overview highlights matchup context, availability, lineup opportunities, waiver candidates and data freshness. Player comparisons and watchlists are scoped to the relevant league. Existing links remain supported.

Use provider adapters and a shared normalized snapshot for league rules, rosters, ownership, matchups and available player evidence. Namespace caches and saved preferences by provider/league/season/team. Cancel obsolete requests and prevent responses for one league from appearing after a switch. Respect each league's live scoring and eligible roster slots, including return scoring only where configured. Missing data remains visibly unavailable.

Provide one contextual AI drawer with explanations for lineup changes, waiver alternatives, player comparisons, trade analysis and weekly reports. Build instructions dynamically from the active league and team; remove hardcoded Dart Vader identity. Keep bounded follow-up conversations isolated by league/team/week and annotate answers with snapshot freshness. AI can explain supported calculations and evidence but cannot submit fantasy transactions. On provider failure, the calculated dashboard continues to work.

For the first release, saved leagues and watchlists remain on the user's device; cross-device accounts are a separate scope. Public shared server-side AI needs authentication or controlled access and durable per-user limits before rollout; the current private RFL token and per-instance throttling are insufficient for an unrestricted public endpoint. Browser-entered keys offer a simpler initial free hosting path while an authenticated backend is evaluated. Do not expose an unprotected shared provider key or assume free-tier capacity for arbitrary public traffic.

Recommended approach: incrementally extend the current app and its analytics, using the supplied projects as focused capability sources. A full rewrite would duplicate working analytics and increase migration risk; embedding all supplied apps would fragment navigation, state and deployment. Validate one end-to-end multi-league flow before adding enrichment and additional report metrics.

## Source inventory and intended use

| Local project | Intended integration | Boundary |
| --- | --- | --- |
| Fantasy-Intelligence-main | Review league-specific player evidence, defense/kicker analysis, and snapshot quality patterns | Read its AGENTS.md and current contracts before adapting implementation. Research outputs must not become live recommendations without validation. |
| fantasy-football-ai-main | Team analysis, buy-low/sell-high and usage-based waiver workflows | Adapt to live Sleeper ownership and RFL scoring; its ESPN configuration is not this league's configuration. |
| fantasy-football-metrics-weekly-report-main | Weekly recap, coaching efficiency, luck and matchup-report ideas | Integrate focused metrics into the existing reports; avoid adding a separate Python report server solely for presentation. |
| league-page-master | League history, records, manager pages and transaction browsing | Extend existing Vue analytics rather than introduce a second Svelte application. |
| fantasy-plus-main | Review compact live-score, player and decision-support interactions | Its standalone HTML is a reference, not a drop-in Vue module. |
| Sleeper-Watchdog-main | Scheduled snapshot comparisons and in-site transaction/settings alerts | README identifies a scaffold. Do not assume implemented rules or enable Discord posting. |
| sleeper-chatgpt-main | Study compact roster, waiver, transaction and matchup context for AI | Bundled JSON is historical/reference data, never current RFL truth. |
| nflverse-data-main | Upstream player/game data for richer historical evidence | Track source, season/week and refresh time; fetch selected releases rather than vendor the archive. |
| nflreadpy-main | Preferred candidate for a scheduled Python data preparation job | Produce compact site-ready JSON if current feed contracts and identifiers are verified. |
| nflreadr-main | Data dictionary and loader references | No R runtime required in the browser. |
| NFLData.jl-main | Alternative nflverse reader reference | Duplicates the reader role; no additional Julia runtime planned. |
| nflfastR-master | Advanced historical metrics such as EPA and usage evidence | Consume verified published data where useful; do not port the full modeling package. |
| nflseedR-master | Simulation methodology reference | NFL playoff seeding differs from fantasy league rules; do not directly reuse those rules. |
| fantasy-manager-main | Player filters, watchlists and export interaction ideas | A separate fantasy game supporting soccer leagues; no replacement of Sleeper ownership or scoring. |

Check source licenses and attribution before copying code. Several folders have no top-level license visible in the inventory; availability on disk alone does not establish redistribution terms.

## Recommended delivery order

1. Generalize the existing league snapshot and selected provider/league/team/week state. Add league switching, a weekly overview, custom-scored lineup/waivers, comparison and watchlist within the existing app.
2. Connect one shared AI advisor to those screens: contextual questions, bounded follow-up history, evidence timestamps, cancellation/retry and provider status. Deterministic scoring remains authoritative.
3. Add a compact enrichment feed from verified upstream data, then incorporate usage trends into player details, weekly reports and AI evidence. Missing or stale enrichment cannot silently change recommendations.
4. Add league activity and refreshed reports; integrate useful existing history/trade/draft screens into the shared navigation.
5. Run unit/type/build and deterministic browser checks; review the existing dirty changes separately; push reviewed code to the configured GitHub repository and verify hosting against the pushed commit.

## Hosting alternatives

- Existing GitHub Pages plus shared browser-entered Gemini connection: smallest hosting change, but provider-key entry remains necessary.
- Existing design's same-origin frontend/API hosting: supports server-side provider credentials and one integrated AI connection; free-plan eligibility, account access and current limits require verification before selecting a host.
- Separate backend plus Pages: possible, but adds a second deployment and cross-origin configuration. Prefer only if an existing backend account makes this materially simpler.

GitHub code deployment and football-data refresh are separate workflows. Code should deploy after tested pushes. A scheduled data job should refresh a compact validated snapshot and preserve the last good artifact on upstream failure. If a job commits data using GITHUB_TOKEN, explicitly arrange artifact deployment rather than assuming that commit triggers another push workflow.

## Verified repository state

On September 28, the configured remote is `https://github.com/jonblackford/RFL-FF-League-Site.git`. Remote HEAD is `b43aa48589d04f9d5aeef469ba593826cc55d830`, matching local HEAD. The local Pages workflow deploys main-branch pushes. Push authorization and current hosted status have not been verified in this turn. Existing modified/deleted files, the nested site copy and archives must not be blindly staged together.

## Validation criteria

Verify consistent provider/league/team/week context across screens and AI; two leagues with different scoring and roster rules; scoring/ownership correctness; stale-feed behavior; player-ID mapping; follow-up and cache isolation between leagues/teams/weeks; no provider keys in source or build output; mobile and keyboard operation; old league links; CI and deployed commit. Live AI operation requires a successful real provider response and cannot be established by mocked tests.

# Multi-league Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task if native execution is selected, or superpowers:subagent-driven-development if selected. Steps use checkbox syntax for tracking.

**Goal:** Expand the existing site into a coherent multi-league fantasy dashboard with contextual AI, richer evidence and verified GitHub updates.

**Architecture:** Reuse the Vue shell, existing saved-league store and analytics. Generalize the RFL scoring/advisor modules behind a shared league/team/week snapshot; enrich it with compact external data without replacing Sleeper authority. Keep browser-key AI available on GitHub Pages and retain protected server hosting as an optional deployment, not an unrestricted public shared-key endpoint.

**Tech Stack:** Vue 3, TypeScript, Pinia, Vite, Vitest, Playwright, GitHub Actions; a Python standard-library data preparation job for published NFL CSV feeds.

**Spec:** `docs/superpowers/specs/2026-09-28-additional-source-integration-map.md`, approved by the user on September 28, 2026. This supersedes the RFL-only audience in the linked earlier design.

## Global Constraints

- Any fantasy manager across multiple leagues.
- Sleeper is the initial complete decision-support integration; retain existing ESPN analytics and clearly expose which ESPN capabilities are actually supported.
- Retain the earlier free-only operating constraint unless the user changes it.
- AI can explain supported calculations and evidence but cannot submit fantasy transactions.
- Missing data remains visibly unavailable.
- Preserve existing local work; exclude credentials, archives and the nested duplicate site from publication.
- No cross-device account system or unrestricted shared-key AI service in this release.

## Review Focus

- Switching leagues during a slow request must never display another league's results (Task 1).
- Storage corruption or denied browser storage must not prevent opening the dashboard (Task 2).
- AI cancellation and late responses must not append to another team's conversation (Task 3).
- Missing player-ID mappings and incomplete weeks must remain unavailable rather than join the wrong player (Task 4).
- Data-only workflow commits must not silently fail to deploy because GITHUB_TOKEN push events do not trigger another workflow (Task 6).

## Task 1: Generalize league snapshots and evidence

**Files:** Modify `src/features/rfl/data.ts`, `types.ts`, `presentation.ts`; create `src/store/advisor.ts`; extend `test/rfl-data.test.ts`, `test/rfl-view.test.ts`; create `test/advisor-store.test.ts`.

**Interfaces:** `AdvisorSelection = { provider: 'sleeper'; leagueId: string; rosterId: number; week?: number }`; `loadLeagueSnapshot(selection: AdvisorSelection, signal?: AbortSignal, force?: boolean): Promise<RflSnapshot>`; retain `loadRflSnapshot` as a compatibility wrapper. Add team-name metadata without breaking existing fixtures. `useAdvisorStore()` exposes selection, snapshot, loading, error, select and refresh. `buildEvidence` derives team identity from the selected snapshot.

- [ ] Add tests for two leagues with reception coefficients 0.5 and 1, different roster IDs and reserve lists; assert separate calculated totals and team identity. Test malformed IDs, nonexistent rosters and switching while a request is unresolved.
- [ ] Run `npx vitest run test/rfl-data.test.ts test/rfl-view.test.ts test/advisor-store.test.ts`; confirm new assertions fail for the intended missing behavior.
- [ ] Implement generalized fetches, user/team labels and shared state. Reject unsupported provider requests explicitly; preserve the last snapshot only with its original selection and a stale status.
- [ ] Rerun the targeted tests and existing scoring/recommendation tests; commit only this task's reviewed files.

## Task 2: Integrate dashboard, comparisons and watchlists

**Files:** Modify `src/App.vue`, `src/views/Home.vue`, `src/main.ts`, `src/components/layout/AppSidebar.vue`, `src/lib/features.ts`; create `src/features/advisor/AdvisorDashboard.vue`, `AdvisorOverview.vue`, `AdvisorLineup.vue`, `AdvisorWaivers.vue`, `PlayerComparison.vue`, `preferences.ts`; create `test/advisor-preferences.test.ts`, `e2e/multi-league-advisor.spec.ts`; extend `e2e/fixtures/league-api.ts`.

**Interfaces:** Dashboard consumes `useAdvisorStore()` and existing `useStore()` saved leagues. `readAdvisorPreferences(key: string)` and `writeAdvisorPreferences(key: string, value: AdvisorPreferences)` store `{ rosterId, watchlist: string[] }`, keyed by provider/league/season, with guarded JSON/storage access. Comparison selects at most three player IDs from the active snapshot.

- [ ] Test malformed/denied storage, watchlist isolation and comparison reset on league switch. Add mocked browser flows for adding/selecting two leagues and retaining existing ESPN navigation.
- [ ] Run targeted tests and confirm missing behavior fails before implementing.
- [ ] Add a dashboard entry in the existing shell, consistent league/team/week controls and route query state. Compose overview, legal lineup assignments, searchable position-filtered waivers and comparisons from the existing optimizer. Preserve old deep links, including `/rfl` compatibility; do not default every visitor to RFL.
- [ ] Show data time, coverage, unavailable projections and league-specific scoring. Use responsive cards/tables and keyboard-accessible controls. ESPN shows supported existing analytics and a clear advisor availability state.
- [ ] Run preferences tests and mocked desktop/mobile browser checks, including 390px width, keyboard navigation, week changes and network failure; commit reviewed files.

## Task 3: Share contextual AI and follow-up conversations

**Files:** Modify `src/features/rfl/gemini.ts`, `AdvisorChat.vue`, `src/components/start_sit/StartSitDashboard.vue`, `src/App.vue`; create `src/features/advisor/conversation.ts`, `AdvisorDrawer.vue`; modify `api/_lib/rflAdvisor.ts` only for compatible protected-mode support; extend `test/rfl-gemini.test.ts`, `test/rfl-ai.test.ts`; create `test/advisor-conversation.test.ts`.

**Interfaces:** `AdvisorMessage = { role: 'user' | 'model'; text: string; fetchedAt: number }`; `conversationKey(selection, season): string` includes provider, league, roster, season and week. Extend Gemini request options with bounded history and configurable model while preserving existing callers. Keep the provider key only in shared in-memory session state.

- [ ] Test follow-up payloads, active-team identity, maximum six prior messages, no key persistence, timeout/quota handling and cancellation followed by league switching. Assert the late response cannot enter a different conversation.
- [ ] Run the targeted AI tests and confirm new behavior initially fails.
- [ ] Replace hardcoded RFL prompts with selected evidence. Add a shared drawer with contextual lineup/waiver/player/trade/report entry points, reset/retry/cancel, safe rendering and snapshot timestamps. Prevent duplicate in-flight requests; cap question length at 1500 characters and prior text per message at 4000 characters.
- [ ] For Pages, use explicit browser-key connection. Preserve protected server-mode access checks; do not broaden the private endpoint into a public shared-key proxy. Review current official provider model/API documentation before modifying provider contracts.
- [ ] Run AI tests and mocked browser tests covering follow-ups across navigation, quota failure and stale answers. Validate a live response only if configured access is available; commit without credentials.

## Task 4: Enrich player evidence and weekly insights

**Files:** Create `scripts/refresh-football-data.py`, `src/features/advisor/enrichment.ts`, `src/features/advisor/PlayerTrends.vue`, `test/advisor-enrichment.test.ts`, `test/data-refresh.test.py`, `docs/data-sources.md`; modify comparison/overview and evidence modules from Tasks 1–3.

**Interfaces:** `EnrichmentFeed = { schemaVersion: 1; season: number; generatedAt: string; source: string; players: Record<string, PlayerTrend> }`; `PlayerTrend = { games: number; throughWeek: number; targets: number | null; carries: number | null; receptions: number | null; receivingYards: number | null; rushingYards: number | null }`. `loadEnrichment(season, signal)` validates a compact same-origin feed and returns an explicit unavailable state on failure. Player records use verified Sleeper IDs.

- [ ] Inspect current official nflverse player-ID and weekly-stat release contracts, plus local source dictionaries; record exact source URLs and attribution. Read applicable source AGENTS.md before adapting code. Use original implementation where redistribution permission is unclear.
- [ ] Add fixture tests for duplicate/missing ID mappings, missing columns, valid zero totals, partial weeks, season mismatch and failed downloads preserving the prior artifact. Run `python3 -m unittest discover -s test -p 'data-refresh.test.py'` and `npx vitest run test/advisor-enrichment.test.ts`; confirm expected failures.
- [ ] Implement bounded CSV download/validation and atomic generation of `public/data/football-<season>.json`; compute recent completed-game usage only. Reject ambiguous mappings and record coverage, not fabricated estimates.
- [ ] Add recent usage details and watchlist candidates with explicit sample sizes; include available trend evidence in AI. Keep projected lineup gain separate from historical usage and do not silently change optimizer scoring.
- [ ] Rerun fixture tests and inspect a real generated feed if upstream data is available; document unavailable sources precisely and commit implementation plus an appropriately sized verified artifact.

## Task 5: Connect league activity, reports and existing analytics

**Files:** Create `src/features/advisor/activity.ts`, `LeagueActivity.vue`, `WeeklyBrief.vue`, `test/advisor-activity.test.ts`; modify `src/components/weekly_report/WeeklyReport.vue`, `src/components/trade_lab/TradeLab.vue`, and the dashboard navigation/evidence integration.

**Interfaces:** `loadLeagueActivity(leagueId: string, week: number, signal?: AbortSignal): Promise<LeagueActivity[]>` returns normalized transactions with stable ID, timestamp, type and roster/player IDs. Weekly briefs consume official matchup results and available computed evidence. Existing trade evaluations supply structured values and limitations to the shared advisor.

- [ ] Test duplicate transactions, missing metadata, failed activity fetches and actual matchup totals distinct from projected totals; run `npx vitest run test/advisor-activity.test.ts` and confirm expected failures.
- [ ] Add transaction browsing and a weekly action/report summary; connect contextual report/trade questions to the shared drawer. Make history/draft/trade tools reachable through consistent navigation. Label remaining generic-scoring analysis where applicable.
- [ ] Preserve reports' existing rendering/export behavior; do not add automated Discord/email posting or copy historic source JSON into current league displays.
- [ ] Run targeted report/trade tests and dashboard browser flows; commit reviewed files.

## Task 6: Verify and synchronize GitHub deployment

**Files:** Modify `.github/workflows/deploy-pages.yml`, `.gitignore`, `README.md`; create `.github/workflows/ci.yml`, `.github/workflows/refresh-football-data.yml`, `docs/deployment.md`; update deterministic browser coverage.

**Interfaces:** CI runs unit tests, type/build and mocked browser smoke tests. Data refresh calls the Task 4 script for the current NFL season, selected explicitly or derived from month/year, validates output and deploys a tested artifact within its own workflow rather than relying on a token-authored push event.

- [ ] Before implementation execution, apply the worktree skill: preserve existing tracked/untracked edits, isolate new work, record the baseline and review which preexisting changes belong in publication. Never stage the entire directory or force-push.
- [ ] Add PR/main checks and scheduled/manual data refresh with concurrency protection. Failed refreshes keep the last good feed; only validated feeds reach a deployment. Avoid overlapping publishing workflows racing to deploy older source.
- [ ] Run `npm test -- --run`, Python feed tests, `npm run build`, deterministic Playwright checks and a Pages-mode build (`GITHUB_PAGES=true VITE_GITHUB_PAGES=true npm run build`). Inspect desktop/mobile output and built artifacts for credential exposure without printing secret values.
- [ ] Review the complete diff against the approved spec, resolve material findings and record live-data/provider limitations separately from mocked checks.
- [ ] Push reviewed commits to the existing repository using available authenticated Git tooling. Integrate through a normal fast-forward or pull request as repository rules permit, then verify the deployed commit and site behavior. User approval of the task already authorizes synchronization; ask only for genuinely missing account access.
- [ ] Report completed features, test evidence, commit/deployment URLs and any specifically blocked external setup. Do not equate local build success with deployment success.

## Execution handoff

Recommended method: native execution in this session, followed by one independent whole-change review. Tasks share the same snapshot, navigation and AI interfaces, so one implementer reduces coordination and merge overhead. This plan is ready for the required user review and execution-method selection; no implementation is claimed yet.


## Execution record

User approved native execution. Implementation and verification are recorded in `docs/implementation-status.md`; final GitHub deployment verification follows the reviewed commits.

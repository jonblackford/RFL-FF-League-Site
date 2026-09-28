# RFL Advisor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver an RFL dashboard for Dart Vader with league-scored lineup and waiver recommendations and optional real Gemini explanations.

**Architecture:** Isolate raw-data normalization, scoring, lineup optimization and waiver evaluation from the Vue interface. Use a serverless Gemini endpoint for explanations; calculated recommendations continue without AI credentials.

**Tech Stack:** Existing Vue 3, TypeScript, Vite, Vitest and serverless API handlers. No new database or paid dependency required.

**Spec:** `docs/superpowers/specs/2026-09-22-rfl-advisor-design.md`

## Global Constraints

- League `1394364555710181376`; default roster 1, Dart Vader. Refresh rules from Sleeper rather than hardcoding scoring.
- API credentials remain server-side. No automatic paid fallback, lineup submission or waiver claims.
- Missing projected categories remain visibly missing; historical estimates are labeled separately.
- Preserve existing analysis pages and saved league data. This directory has no Git metadata; do not invent a worktree or claim commits.
- Live provider verification requires a configured credential. All other work and verification proceeds without one.

## Review Focus

- Missing versus zero projections: zero is valid, missing data is not a zero forecast.
- Multi-position superflex players: a player cannot occupy two slots or be dropped twice.
- Negative projections: fill required slots when eligible players exist; explicitly report unfillable slots.
- Stale responses and switched weeks: an older request cannot overwrite the active view.
- Provider failure and quota exhaustion: retain calculated advice and disclose AI unavailability.

## Task 1: League data and scoring

**Files:** create `src/features/rfl/types.ts`, `data.ts`, `scoring.ts`; create `test/rfl-scoring.test.ts`, `test/rfl-data.test.ts`.

**Interfaces:** `scoreStats(stats, settings, position)` returns `{total, breakdown, missing, unsupported}`. `loadRflSnapshot(week?, signal?)` returns a typed league/rosters/player/projection snapshot with timestamps and warnings. Numeric missing values remain absent, not coerced to zero.

- [ ] Write scoring tests first, including this core acceptance case:

```ts
expect(scoreStats({ kr_yd: 150 }, { kr_yd: 0.1 }, 'WR').total).toBe(15);
expect(scoreStats({}, { kr_yd: 0.1 }, 'WR').missing).toContain('kr_yd');
expect(scoreStats({ kr_yd: 0 }, { kr_yd: 0.1 }, 'WR').missing).not.toContain('kr_yd');
```

- [ ] Add tests for full PPR plus returns, passing first downs, interceptions/pick six, long plays, missed kicks, 60+ FG buckets, non-overlapping defense thresholds, and unsupported scoring keys. Avoid calculating threshold points from mean projected yards when the source provides expected bucket counts.
- [ ] Run `npx vitest run test/rfl-scoring.test.ts test/rfl-data.test.ts` and verify failures arise from missing behavior.
- [ ] Implement category metadata and a pure scoring engine. Ignore aggregate `pts_ppr` values when scoring raw stats. Calculate category applicability per position and report coverage.
- [ ] Implement request timeouts, schema checks and bounded caching. Fetch NFL state, league and all rosters through `/v1` and weekly bulk projections through `https://api.sleeper.app/projections/nfl/{season}/{week}?season_type=regular`. The `.com` host returned 403 during exploration; the `.app` bulk feed returned raw stats. Validate history on the same host before enabling historical estimates.
- [ ] Test HTTP failure, empty/malformed payload, valid zeros, player cache expiry, cancellation and season/week matching. Cache the directory for 24 hours and weekly data for five minutes; retain timestamps.
- [ ] When recent return stats are available, estimate returns from up to three completed weeks with recorded participation and display sample size. Otherwise leave missing return projections explicit.
- [ ] Re-run both test files and inspect a live RFL snapshot for scoring coverage.

## Task 2: Lineup and waiver recommendations

**Files:** create `src/features/rfl/recommendations.ts`, `test/rfl-recommendations.test.ts`; reuse eligibility definitions from `src/lib/lineup.ts`.

**Interfaces:** `optimizeLineup(players, slots)` returns identified assignments, total and unfilled slots. `recommendWaivers(snapshot)` returns candidate/drop pairs, lineup gain, depth comparison and constraint warnings. Players carry IDs, eligible positions, availability and nullable projections.

- [ ] Write fixtures asserting optimal QB/superflex allocation, multi-position eligibility and no duplicate IDs. Include required slots with negative projections and no eligible player. Assert confirmed out, bye and reserve players are excluded.
- [ ] Run `npx vitest run test/rfl-recommendations.test.ts` to observe the missing implementation.
- [ ] Implement memoized assignment over roster players and slot occupancy, preserving IDs. Prefer maximum feasible filled slots, then score. Preserve the distinction between a projected optimal lineup and a currently executable lineup when game locks are unverified.
- [ ] Add failing waiver tests for rostered/reserve/taxi ownership, position limits, full rosters, open roster spaces, and missing projections.
- [ ] Implement add/drop simulation using the optimizer, checking roster size and positional constraints. Rank immediate lineup gains separately from depth value; display source waiver mode and avoid assuming FAAB.
- [ ] Compare current starter IDs with recommended IDs for understandable changes. Return explicit coverage warnings rather than fabricated precision.
- [ ] Re-run recommendation tests and Tasks 1–2 together.

## Task 3: Secure AI explanations

**Files:** create `api/rfl-advisor.ts`, `api/_lib/rflAdvisor.ts`, `test/rfl-ai.test.ts`; add `.env.example` entries and deployment instructions in `README.md`.

**Interfaces:** POST `/api/rfl-advisor` accepts a bounded question and validated compact snapshot; returns `{answer}` or a structured unavailable/error response. Configure `GEMINI_API_KEY`, `GEMINI_MODEL` and optional private-instance access protection server-side.

- [ ] Write tests for wrong HTTP method, oversized inputs, wrong league, invalid numeric fields, missing key, provider timeout, quota failure and malformed provider response. Use injected fetch for provider contract tests.
- [ ] Run `npx vitest run test/rfl-ai.test.ts` before implementation.
- [ ] Verify current official Gemini REST schema and free-tier model availability. Implement a server-side request with bounded output, timeout and an evidence-only instruction. Treat all supplied text as data, not system instructions.
- [ ] Validate the snapshot's shape and explicitly frame it as supplied evidence. Do not imply independently verified facts. Add bounded per-instance throttling and document its serverless limitations; private deployment protection and provider quota are required for an internet-exposed zero-cost instance.
- [ ] Return private/no-store headers. Cache repeated advice only within an appropriately scoped bounded cache; never put personalized answers into a public CDN cache. Never expose provider error bodies or credentials.
- [ ] Re-run AI tests; document credential setup and the fact that static hosting requires a separate API host. Without a key, verify the unavailable response rather than claiming a live AI call.

## Task 4: RFL advisor interface and navigation

**Files:** create `src/views/RflAdvisor.vue` and focused components under `src/features/rfl/`; modify `src/main.ts`, `src/views/Home.vue` and relevant navigation to make the advisor accessible and the default for a fresh RFL visit. Preserve explicit existing deep links.

**Interfaces:** UI consumes the snapshot and pure recommendation outputs. Server errors never clear the loaded roster or calculated suggestions.

- [ ] Add tests for week/request race protection and snapshot-to-view summaries before implementation.
- [ ] Implement a responsive dashboard with RFL/Dart Vader identity, week selection, refresh, lineup, waiver cards, roster overview and expandable live scoring. Each player shows offensive/return contributions, availability and coverage.
- [ ] Add current-lineup comparison, proposed drop, projected gain, roster-limit explanation and an explicit check-in-Sleeper instruction when locks/claim eligibility cannot be verified.
- [ ] Implement AI question input and suggested prompts for lineup, return specialists and waiver priorities. Render generated text as text, not untrusted HTML. Show unavailable/loading/retry states separately from deterministic advice.
- [ ] Add loading, empty, incomplete and stale-data states; preserve previous snapshot on refresh failure and visibly label its timestamp. Cancel superseded requests.
- [ ] Add a stable advisor route and default RFL entry without removing existing analysis navigation. Verify hash-routing compatibility with the existing router.
- [ ] Run the UI logic tests and build before browser verification.

## Task 5: Verification and handoff

**Files:** `README.md`, new focused tests and existing application as needed for failures caused by these changes.

- [ ] Run `npm test -- --run` and `npm run build`; report all failures, including pre-existing failures, by name.
- [ ] Use the browser skill to verify desktop/mobile layout, live team identity, week selection, refresh, scoring breakdown, lineup changes, waiver exclusions and missing-key behavior. Exercise a failed refresh and ensure old data remains labeled stale.
- [ ] Review the implementation against this plan and spec, focusing on return coverage, threshold double counting, multi-position identity, reserve restrictions and AI evidence boundaries.
- [ ] Update documentation with exact setup commands, server environment variables, data sources, limitations and test results. Do not deploy or claim live AI activation without a successful provider call.

## Execution recommendation

Native execution in this session is recommended: these tasks share tightly coupled scoring and player interfaces, and no parallel agent work is needed. Plan is ready for user review before implementation as required by the writing-plans skill.

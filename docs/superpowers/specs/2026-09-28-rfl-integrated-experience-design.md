# RFL integrated experience — proposed design

## Outcome and constraints

Turn the existing site into one polished, league-specific application for the Red Flag League, with Dart Vader selected by default. Make roster decisions, custom scoring, AI explanations and existing league analytics work together. Publish verified changes through the existing GitHub repository so the hosted site updates from source control.

The user explicitly requires a $0 operating setup. Use free service plans only; do not activate paid billing, a paid trial, a custom-domain purchase or a paid data subscription. Limits must produce a useful unavailable state, not an automatic paid fallback. No changes are submitted to Sleeper.

League: `1394364555710181376`. Default roster: 1 / Dart Vader / JonBlackford42. Sleeper remains authoritative for rules, ownership and official points. Player return yardage is currently 0.1 points per yard and must continue to come from live settings.

## Current state verified September 28

- Repository: `https://github.com/jonblackford/RFL-FF-League-Site`, branch `main`. Local HEAD and remote HEAD both equal `b43aa48589d04f9d5aeef469ba593826cc55d830`.
- GitHub Pages is live and its latest deployment succeeded. The existing workflow already deploys pushes to main.
- Later commits redirected `/rfl` back to the existing home page and attached an AI question panel to start/sit. The reusable custom-scoring data and recommendation modules still exist.
- The current AI panel makes direct Gemini calls and holds its own browser-entered key. It has no shared conversation or connection state. Existing start/sit still obtains generic scoring totals and supplies no waiver candidates to its AI evidence.
- There are 25 tracked files with uncommitted changes, including removals of local news/scoring helpers and reversions in the deployment workflow. Preserve these changes while establishing a reviewable implementation branch; do not blindly reset or publish them.
- Baseline: 428 tests passed across 60 test files; production build passed. Existing browser tests need to be reconciled with the current routing before claiming complete UI verification.

## Recommended hosting

Use the existing GitHub repository and Vercel Hobby for the complete application, including its same-origin AI endpoints. Vercel's free plan is intended for personal, noncommercial projects. Keep the existing Pages deployment operational until the replacement deployment is verified; no DNS or domain purchase is required.

Vercel Hobby price and limit behavior: https://vercel.com/docs/plans/hobby and https://vercel.com/pricing. Free-tier suitability assumes personal league use without selling the service. A Vercel account/project connection may require the user's signed-in session; prepare and verify all local deployment configuration before requesting that missing access.

Keep Gemini on a free-tier project with a configurable currently available model. Provider billing status cannot be guaranteed by frontend code. Do not enable paid billing. Credentials remain server-side, excluded from source control and built assets. The previously supplied key is already in the ignored local environment file and must never be added to GitHub files.

Alternative: preserve Pages as primary hosting with one shared in-memory browser-key connection, or attach a separately hosted API. That minimizes hosting migration but retains key-entry friction or introduces a second deployment. The full Vercel application is recommended for integrated AI. A paid server/database architecture is excluded by the user's budget.

## One interface

Use one application shell and navigation instead of a separate advisor page and a different analytics application. Desktop uses a compact left sidebar, a persistent league/team/week header and a right-side AI drawer. Mobile uses a condensed header, primary navigation and a full-width advisor sheet.

Visual direction: a restrained sports dashboard with deep navy, warm white surfaces, red RFL accents, clear status colors, compact readable tables, player portraits where available and useful empty/loading states. Replace the large promotional hero with a weekly overview that exposes the next decisions immediately. Use a consistent type scale, spacing, cards, tables and buttons across the primary screens. Retain existing advanced analysis under organized League navigation; remove unrelated marketing and subscription prompts from the RFL decision flows without deleting unrelated account functionality.

Primary screens:

1. **Overview:** current matchup/standings context where verified, roster availability alerts, recommended changes, waiver shortlist, return-scoring impact and a weekly action checklist. Show when the data was fetched and whether it is complete.
2. **Lineup:** current versus recommended starters, legal slot assignments, a searchable bench, and player details. A manual comparison can select two or three players. Each recommendation explains the point difference, eligibility and missing information. Out/bye/reserve players are visibly distinct; unsupported lock data is explicitly unverified.
3. **Waivers:** position/search filters, available-player rankings, suggested add/drop alternatives and an editable watchlist. Explain projected starter gain separately from speculative depth value. Preserve options outside the first twelve when filtering. Watchlists/checklist state are local preferences keyed by league and season; roster ownership always refreshes from Sleeper.
4. **Player comparison:** side-by-side league-scored production, offense/returns breakdown, recent available game data, status and coverage. Allow comparison from roster or waiver rows without navigating away from the current task.
5. **League:** standings, matchups and links into the existing history/trade/draft views using the same shell. Clearly identify any remaining legacy view that uses generic scoring, rather than presenting it as fully custom-scored.

Use real route/query state for shareable navigation and preserve existing league deep links. The RFL loads automatically on first visit. Team selection may inspect another roster, but Dart Vader remains the default and AI must identify the selected roster correctly.

## Shared data and scoring

Create one shared league snapshot store backed by the existing `features/rfl` adapters and scoring engine. Every primary screen and every AI request receives the same league, season, week, selected roster, ownership and scoring version. Do not maintain an independent generic-PPR calculation in the new lineup screen.

Reuse and extend the tested pure optimizer/waiver engine. Cache the player directory and weekly feeds, cancel superseded requests and reject mismatched season/week responses. Keep previous data on refresh failure with an obvious stale marker; do not silently display an older week under a new heading.

Missing stats remain unknown. Historical return estimates remain separately labeled with sample size. The known 50+ field-goal projection bucket cannot be split into 50–59 and 60+ without evidence; comparisons must surface that gap. Recommendation confidence is based on coverage and sample information, not a fabricated probability of winning.

Use official league matchup totals when reporting actual results. For recomputed player history, distinguish sparse recorded zero stats from unavailable records and verify the result against available official scoring examples. Do not derive expected defense bucket points by thresholding mean projected yards.

## AI as part of the workflow

Provide a shared advisor drawer and connection state, available from all primary screens. Contextual actions include Explain this lineup, Compare these players, Explain this pickup, Return-yard impact and Build my weekly plan. Selecting a player or proposed move supplies that structured context; the user should not need to retype names or scoring rules.

Support follow-up messages within a bounded conversation. Retain useful conversation context across navigation in the current session, keyed by roster/week; mark previous answers as based on an older snapshot after a refresh. Keep the source snapshot timestamp and the selected player IDs with each answer. Provide reset/retry/cancel controls and a clear configured/unavailable/quota status.

AI requests use one same-origin server adapter with server-only Gemini credentials. Reuse private league access protection with one shared connection per session rather than collecting the provider key in each component. Any optional remembered access must use an expiring protected session, not expose the provider key to browser storage.

The server validates bounded messages and structured evidence, restricts league scope and sends only relevant data. It treats names, news and user messages as untrusted content. Model output explains calculated evidence; it cannot alter authoritative scores, invent current news, infer unavailable return roles as fact, or execute a transaction. Responses should be readable with safe text/Markdown rendering and show their evidence limitations.

Reduce free-tier consumption through explicit user-triggered generation, bounded conversation history, small evidence packets, deduplication, cancellation and caching per evidence/question. Do not generate AI text for every row on page load. On quota, timeout or model retirement, show an actionable status and preserve calculated advice. Recheck model availability during implementation; the earlier live tests returned provider high-demand errors, not a successful answer.

## GitHub and deployment workflow

Work on an isolated branch after preserving the current dirty state. Inventory differences against GitHub and deliberately include only reviewed changes; exclude the nested duplicate project, archives, scratch logs, local environment files and credentials. Do not discard existing edits to make the checkout clean.

Add automated unit/type/build checks for pull requests and main. Use a stable mocked-data UI smoke test in CI; keep live-provider/league verification separate so temporary outages do not masquerade as code regressions. Ensure both the selected production routing and supported legacy deep links pass.

Push the reviewed implementation to the existing repository, establish the free hosting integration and verify the deployed commit/status. The user's instruction authorizes GitHub synchronization and automatic updates; no paid upgrade or unrelated repository changes are authorized. Use normal fast-forward or pull-request integration; never force-push over remote work. A successful local build is not proof of a successful hosted deployment.

## Acceptance criteria

- One consistent interface opens the RFL and Dart Vader without manual league entry.
- Lineup, waivers and comparisons use the same live custom-scoring snapshot, including return production and visible projection gaps.
- Contextual AI can explain selected players and moves, answer follow-ups and preserve context across navigation with one connection state.
- Key/provider failures and stale data leave the application useful and do not expose credentials.
- Existing useful league analysis remains reachable; legacy generic-scoring views are identified.
- Mobile layout, keyboard/focus behavior, no horizontal overflow, empty states and refresh/week races are verified.
- Unit tests, type/build checks and deterministic UI checks pass. Live Gemini success is claimed only after a real successful response.
- Reviewed source is synchronized to GitHub, and the hosted deployment is checked against its commit when account access permits it. Account-dependent remaining work is reported specifically.
- No paid plans, billing activation, domain purchases or automatic paid fallback.

## Review status

Proposed for review. This file records the researched design; the expanded UI/AI implementation has not started. The user clarified the strict free-only requirement; hosting account access has not yet been verified.

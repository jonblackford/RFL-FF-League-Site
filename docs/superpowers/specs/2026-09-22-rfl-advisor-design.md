# RFL roster advisor — proposed design

## Purpose

Make the existing Vue application a useful weekly decision tool for The RFL (Red Flag League), with Dart Vader as the default team. Improve roster, start/sit, and waiver decisions using actual league rules and current data, with real AI explanations and no required paid service for core recommendations.

Confirmed Sleeper league: `1394364555710181376`, season 2026. Confirmed team: Dart Vader, username `JonBlackford42`, owner `1292674700060692480`, roster 1. These are defaults, not authorization to submit transactions or change a lineup.

## Verified rules

Read scoring and roster settings from Sleeper on refresh; the supplied prose is not the authoritative scoring configuration. Both `kr_yd` and `pr_yd` are 0.1 points per yard. The league has 14 rosters and starts QB, RB, RB, WR, WR, TE, SUPER_FLEX, K, DEF, with five bench slots and two reserve slots. Enforce imported positional limits when evaluating pickups. Live settings include defense yards-allowed scoring, six-point field goals at 60+ yards, and minus three for 35+ points allowed. Do not replace these with generic PPR assumptions.

## Proposed experience

The landing experience opens the RFL and remembers Dart Vader. An advisor dashboard presents this week's recommended legal lineup, suggested changes from the current lineup, available waiver targets with proposed drops, and an AI question panel. Each recommendation includes projected point impact, a scoring breakdown including returns, data freshness, and relevant injury or availability flags. League scoring remains visible and refreshable.

Retain existing useful analysis pages. Focus this change on the decision flows rather than a wholesale visual redesign or unrelated billing/account refactoring.

## Data and calculations

Import league settings, users, rosters, NFL state, players, and transactions from Sleeper. Derive available players from all league rosters, including reserve/taxi membership where supplied. Distinguish roster availability from waiver processing or claim eligibility; do not describe every unrostered player as immediately addable.

Audit existing raw-stat projection and history endpoints before choosing the production data adapter. Existing Sleeper projection endpoints are a dependency to validate, not a guarantee of complete return-yard forecasts. Cache the player directory and batch/cache weekly data where supported. Expose source and retrieval time; retain clearly marked stale data on refresh failure.

Use a shared pure scoring module to multiply supported raw stats by actual scoring coefficients. Handle category semantics, defense thresholds, and kicker buckets explicitly to avoid overlapping bonuses or double counting. Report unsupported categories and missing projected stats; never silently equate missing data with zero. Avoid adding return points to aggregate fantasy totals whose included categories are unknown.

Use available recent return production to provide a separately labeled return estimate only when sufficient evidence exists. Show its sample window and uncertainty. If there is insufficient data, show incomplete projection coverage and reduce recommendation confidence. AI must not invent return roles, injuries, news, or projections.

Optimize over eligible roster positions, including superflex and multi-position eligibility, with each player used at most once. Exclude ineligible reserve players, byes and confirmed unavailable players where data supports those states. Respect game locks only when reliable kickoff/lock data exists; otherwise label lock status unverified and require users to check Sleeper.

Rank waiver candidates by their improvement to this team's feasible lineup and depth, using league-specific scores. Evaluate add/drop pairs against roster and position limits. Identify unsupported roster constraints rather than claiming a move is valid. Keep projected starter gain separate from speculative bench value. Read the actual waiver mode; do not infer FAAB from the presence of a budget field.

## Real AI integration

Recommended: a server-side Gemini adapter using a model eligible for the provider's free tier at setup time. Keep the model configurable and the API key exclusively in server environment variables. Use the existing serverless deployment pattern; a static-only deployment cannot host this endpoint by itself.

Send a compact, validated snapshot of league rules, this roster, computed recommendations, and source timestamps. The model explains calculated evidence and answers questions within that evidence. Treat player names, news and user questions as untrusted inputs. Validate requests, cap prompt/output sizes, apply rate limits and cache repeated analysis. Keep personalized responses out of shared public caches.

The model does not calculate authoritative fantasy scores or execute actions. Without a configured key, on quota exhaustion, or on provider failure, retain deterministic recommendations and explicitly show that AI is unavailable. Never label a template response as generated AI. No paid fallback or billing activation is automatic.

Alternatives considered: a local model avoids a hosted inference bill but requires an always-running capable machine; a paid model offers more capacity but conflicts with the preferred zero-cost setup. Neither is required for this design. Free-tier availability and limits are provider-controlled and are not an unlimited-service promise.

## Verification and completion

Add meaningful tests for custom scoring (including 150 return yards = 15 points), defensive thresholds, kicking buckets, missing projection coverage, superflex assignment, duplicate-player prevention, position limits, and unavailable-player exclusion. Test waiver ownership filtering and legal add/drop simulation. Test server request validation, provider failures and missing-key behavior.

Run the applicable existing suite and production build. Check the dashboard in desktop and mobile layouts and verify the league/team identity and scoring against live Sleeper responses. Document environment variables, supported deployment, data limitations and free-tier setup. A live AI response requires a user-provided server-side credential; do not claim that integration is live before an actual provider call succeeds.

## Review status

Proposed for user review. No product implementation is included in this document. The workspace is an extracted directory without Git metadata, so this spec has not been committed.

# Multi-league integration delivery

Implemented: shared league/team/week snapshots; Advisor overview, lineup, waiver search, player research, comparisons and team-specific watchlists; shared Gemini connection and bounded follow-up conversations; contextual trade/report questions; official league scores and completed transactions; mapped historical usage; tested Pages deployment and daily feed refresh.

The independent review identified storage denial, enrichment remount and route-query selection bugs. These were fixed and covered by regression checks. A separate Pages league-switch bug was also reproduced and fixed.

## Implementation decisions

- Reuse the existing Vue tab shell and saved-league lifecycle instead of adding a second app shell. This keeps ESPN and existing deep links but retains coupling to the existing navigation.
- Use an in-memory visitor-provided Gemini key for the public Pages deployment. This keeps free static hosting and prevents exposing a shared provider credential; visitors connect their own key per visit. The private server endpoint retains its original restricted scope.
- Compose the primary UI from a dashboard plus overview, player, comparison, activity and trend components. Separate files per small tab were unnecessary.
- Use original standard-library data preparation against the current nflverse `stats_player_week` release contract. The older player_stats URL returned 404. Upstream schema or URL changes will show unavailable/stale history rather than fabricate data.
- Combine scheduled refresh with the existing Pages workflow so a token-authored snapshot commit deploys in the same run. Repository rules must allow that data-only commit; otherwise publication stops with a reported workflow error.
- Rename the Python test to `test_data_refresh.py` because dotted module names are ignored by unittest discovery.
- Reconcile old browser assertions with the existing RFL Agent storage/branding and current advisor routing. Live-network checks are opt-in; deterministic checks run in CI.

## Scope and limits

Sleeper supports the new custom-scored advisor. ESPN retains its existing analytics with explicit advisor availability messaging. Watchlists persist locally; conversations and provider keys last only for the current visit. Missing projections, unverified locks, historical estimates and stale records remain visible. Source projects are integrated selectively as capabilities and data contracts, not copied wholesale; see `data-sources.md` and the approved integration map.

No paid billing, hosting upgrade, or fantasy transaction was activated. A live Gemini request succeeded; provider quotas remain external. Deployment status is verified separately against GitHub Actions and `version.json`.

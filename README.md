# RFL Agent

A Vue/TypeScript fantasy football workspace for Sleeper and ESPN leagues. Add a league, switch between saved leagues, and open **Advisor** for the integrated decision tools.

## Features

- Sleeper advisor with team/week selection and live league-specific scoring.
- Recommended lineups, waiver add/drop alternatives, player search, comparisons and local watchlists.
- Historical usage from nflverse and DynastyProcess player-ID mappings, with source times and sample sizes.
- Official weekly scores, completed league transactions and contextual weekly briefs.
- Shared Gemini conversation panel with follow-ups and contextual lineup, player, waiver, trade and report questions.
- Existing standings, power rankings, expected wins, playoffs, history, draft, manager and trade analysis.
- Existing ESPN analytics; the new custom-scored optimizer currently supports Sleeper.

The About, Changelog, Privacy Policy, Terms and Account pages and their navigation links are removed. Existing URLs return to the main site while preserving league selection. Legacy paid service integrations are not enabled or bypassed by this change.

## Run locally

Use Node 24+ and npm:

```bash
npm install
npm run dev
```

Calculated league analysis needs no AI credential. Open **Ask advisor → Connect Gemini AI** to enter your Google AI Studio key. It stays in memory for the current visit and is sent directly to Google, not saved by the app. The model ID is configurable. Use a provider project without billing for a free setup; model availability and quotas are external. Provider failures leave calculated advice available.

Conversations are isolated by provider, league, team, season and week. Answers retain their snapshot timestamp. Watchlists and saved league preferences persist on the device, not across devices. No lineup, trade or waiver transaction is submitted by this site.

The existing `/api/rfl-advisor` endpoint remains a separately protected private RFL endpoint, not the public multi-league chat backend. To run that optional endpoint locally, configure server-only values from `.env.example` in `.env.local`, then run `npm run dev:api`. Never put provider keys in `VITE_` variables or commit environment files.

## GitHub and hosting

Main-branch pushes deploy to GitHub Pages after unit, Python, build and browser checks. The same workflow refreshes historical usage daily at 10:20 UTC, subject to GitHub scheduling. It deploys validated data in the same run, so token-authored commits do not depend on triggering another workflow. Failed refreshes retain the previous committed feed and its original timestamp. `/version.json` identifies the deployed source commit.

See [deployment](docs/deployment.md), [data sources](docs/data-sources.md), and [implementation decisions](docs/implementation-status.md). No paid plan, provider billing or domain purchase is required or activated.

## Data limits

Sleeper is authoritative for league settings, ownership and official matchup totals. The raw projection/stat endpoints are undocumented and can change. Missing projected scoring categories are shown explicitly; available-stat totals do not imply complete forecasts. Historical return estimates are labeled and do not establish next week's role. Kicker buckets that cannot be split reliably remain missing. Game locks and immediate claim eligibility must be checked in Sleeper.

Historical usage uses up to three recorded games before the selected week. Ambiguous player-ID mappings are excluded; unavailable stats remain null. Changing the analysis week uses current roster ownership. Existing legacy analytics may use standard/PPR estimates; custom-scored advisor projections are identified separately.

## Verification

```bash
npm test -- --run
python3 -m unittest discover -s test -p 'test_data_refresh.py'
npm run build
npx playwright install chromium
npx playwright test
```

Live-data verification is separate from deterministic CI:

```bash
RUN_LIVE_TESTS=true npx playwright test e2e/rfl-advisor.spec.ts
GITHUB_PAGES=true VITE_GITHUB_PAGES=true npm run build
TEST_PAGES=true npx playwright test e2e/multi-league-advisor.spec.ts
```

Refresh historical data manually with `python3 scripts/refresh-football-data.py`.

## Source layout

`src/features/advisor/` contains the integrated UI, conversation, usage and activity modules. `src/features/rfl/` retains the generalized scoring, optimizer and data adapters for compatibility. `src/store/advisor.ts` owns selected snapshot state. Existing analytics remain under `src/components/`. `scripts/refresh-football-data.py` generates compact historical data for the site.

This independent tool is not sponsored or endorsed by Sleeper, ESPN, the NFL or their affiliates.

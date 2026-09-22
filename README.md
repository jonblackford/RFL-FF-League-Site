# RFL Agent

RFL Agent is a Vue/TypeScript fantasy football league analyzer for Sleeper and ESPN leagues. It transforms league, roster, matchup, draft, and transaction data into power rankings, playoff odds, reports, trade insights, and personalized season recaps.

![RFL Agent logo](public/logo.webp)

## Current Features

- Comprehensive standings and AI-generated league news/current trends
- Power rankings, roster rankings, and projections
- Expected wins, strength of schedule (measuring luck), and schedule analysis
- Roster management stats, trade rankings, Trade Finder, and waiver wire moves
- Playoff odds
- AI-generated weekly reports with matchup recaps, awards, top and bottom performers, customizable shared Premium reports, shareable images, and video recaps
- Weekly matchup previews
- Start/sit stats with latest player news
- Draft grades, recap, and historical manager tendencies
- Draft plans and league-mate scouting based on league draft history
- Schedule simulator and trade calculator
- Manager profiles highlighting tendencies, strengths, and overall identity
- League history stats
- Yearly Spotify Wrapped-style presentation

## Contributing

### Project Structure

```text
src/
  api/          API clients and data transforms
  components/   Feature and shared UI components
  composables/  Reusable view logic
  lib/          App utilities, auth helpers, and integrations
  store/        Pinia stores
  types/        Shared TypeScript types
  views/        Route-level pages

test/           Vitest coverage
```

### Getting Started

To run the project locally, you'll need Node.js and npm installed.

```bash
  npm install
  npm run dev
```

No environment variables are required for the static league analyzer and Trade Finder. Features that call private backend APIs, such as AI-generated summaries, account billing, and shared report generation, require additional backend configuration.

### GitHub Pages

This fork includes a GitHub Actions workflow at `.github/workflows/deploy-pages.yml`.

1. Push the project to a GitHub repository.
2. In GitHub, open Settings > Pages.
3. Set Source to GitHub Actions.
4. Push to `main` or run the workflow manually.

The Pages build uses relative asset paths and hash routing so teammates can open the app from a repository Pages URL.

### Technologies

- Frontend: Vue 3, TypeScript, Vite
- State management: Pinia
- UI: Tailwind CSS, shadcn-vue
- Optional backend integrations: Node.js, Supabase, Stripe, Resend, OpenAI
- Analytics: PostHog, Umami
- Testing: Vitest
- Deployment: GitHub Pages or Vercel

## Acknowledgements

- [Sleeper API](https://docs.sleeper.com/)
- [Avatars](https://getavataaars.com/)

## Notes

RFL Agent is an independent fantasy football tool and is not sponsored, endorsed, or operated by Sleeper, ESPN, the NFL, or their affiliates.

## Dart Vader / RFL advisor

The default entry opens `/rfl`, a dedicated advisor for **Dart Vader** in Sleeper league **1394364555710181376**. Existing league analytics remain available through the **League analytics** link; existing URLs with league query parameters still work.

The advisor imports live league scoring and roster rules, scores raw weekly projections, assigns players to eligible starting slots (including superflex), and compares available add/drop alternatives against this roster. Expand a player for category-level scoring and coverage. Waiver suggestions are alternatives, not a sequence of transactions. The site does not submit lineups or claims.

### Run locally

Requires Node 24+ for the small local TypeScript API runner (the frontend retains its existing runtime requirements).

```bash
npm install
npm run dev
```

Calculated recommendations need no AI key. To enable actual AI explanations, copy `.env.example` to `.env.local`, configure the server-only values, then run a second terminal:

```bash
npm run dev:api
```

- `GEMINI_API_KEY`: your Google AI Studio API key; never put this in a `VITE_` variable or the browser.
- `GEMINI_MODEL`: defaults to `gemini-3-flash-preview`; configurable as provider availability changes.
- `RFL_ADVISOR_TOKEN`: a long random access token for your private instance. Enter this token (not the Gemini key) under **Connect private AI access**. It stays in browser memory for the visit.

The Vite development server proxies `/api/rfl-advisor` to the local API on port 3001. The default model has a free tier in the [Gemini pricing documentation](https://ai.google.dev/gemini-api/docs/pricing), subject to provider limits, regional eligibility, and model changes. Keep the Google project on its free tier if you want no inference charges; application code cannot enforce your provider billing settings. Free-tier inputs may be used by Google to improve products under its terms. The app sends a compact roster/scoring snapshot and your question, not the full player directory.

### Hosting

On Vercel, configure the same server environment variables and deploy the existing project normally. `api/rfl-advisor.ts` provides the AI endpoint; `/rfl` is rewritten to the SPA. Nothing is deployed automatically by this change. Restrict access to your private instance and keep provider quota limits in place. The endpoint requires the private token, caps requests and output, caches identical requests for five minutes, and allows five uncached calls per minute **per server instance**. The in-memory limit is not a global spending cap across serverless instances.

GitHub Pages supports calculated advice using the existing hash router. It cannot run the serverless endpoint. AI requires a same-origin `/api/rfl-advisor` service/reverse proxy; Vercel or the local runner is the supported straightforward setup. Do not publish credentials with static assets.

### Data limits

- Sleeper `/v1` supplies league, roster and player metadata; the weekly raw-stat feed uses `api.sleeper.app/projections/nfl/...`. These projection/stat endpoints are not part of the documented public `/v1` contract and may change.
- Missing projected categories are displayed, not silently treated as zero. The displayed total is an **available-stat total**, not a claim of complete projection coverage. Generic `pts_ppr` values are not used by this advisor.
- Individual kick-return projections are absent in the inspected feed. `def_kr_yd` is deliberately not assumed to mean individual `kr_yd`. When at least two recent active-game records and recorded return-yard evidence exist, individual returns can use a separately labeled historical estimate. This does not verify next week's return role.
- The inspected kicker feed combines 50+ field goals; RFL distinguishes 50–59 and 60+. Those unsplittable categories remain missing, which can materially understate kicker totals. Compare coverage before acting on kicker recommendations.
- Injury status comes from Sleeper, not a separate real-time news service. Kickoff locks and immediate claim eligibility are unverified. Reserve-inclusive position cap checks are conservative. Unprojected/unavailable players are not suggested as drops.
- Week changes use current roster ownership. Refresh failures retain the prior snapshot with a stale-data warning. Player metadata is cached in memory for 24 hours, weekly data for five minutes; refreshed projections also carry player metadata.
- Existing general league analytics are retained; the new advisor is the custom-scored decision surface. Legacy analysis pages may still use their original standard/PPR calculations.

### Verification

```bash
npm test -- --run
npm run build
npx playwright install chromium
npx playwright test e2e/rfl-advisor.spec.ts
```

Unit discovery is scoped to this project's `test/` directory so the older nested `RFL FF League Site.` copy is not mixed into its imports. The advisor browser test uses live Sleeper data and therefore needs network access; it checks desktop/mobile layout, roster/waiver navigation, scoring rules, unavailable AI and stale refresh behavior. A live AI response requires your configured provider credential; mocked provider tests do not establish live activation.

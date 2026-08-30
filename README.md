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

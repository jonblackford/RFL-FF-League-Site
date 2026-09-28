# Football evidence and source integration

The additional source folders informed the feature map in `superpowers/specs/2026-09-28-additional-source-integration-map.md`. No standalone apps, credentials, historical league dumps or research models are blindly bundled into production.

- Sleeper supplies live league rules, rosters, users, transactions and actual matchup totals: https://docs.sleeper.com/ . Weekly raw-stat projections remain an undocumented feed and carry coverage warnings.
- nflverse supplies published weekly player statistics: https://nflreadr.nflverse.com/reference/load_player_stats.html . The local nflreadr `R/load_stats.R` identifies the current `stats_player/stats_player_week_<season>.csv` release contract.
- DynastyProcess supplies GSIS/Sleeper ID mapping: https://nflreadr.nflverse.com/reference/load_ff_playerids.html and https://github.com/dynastyprocess/data . Ambiguous mappings are omitted; names are never used as a fuzzy substitute.
- The snapshot generator is original Python standard-library code. It consumes selected CSV data, rather than importing the R/Julia/Python loader libraries. nflverse data is provided under CC BY 4.0; attribution and upstream source URLs are retained. Consult upstream licensing for each source's applicable terms.
- The AI follows the selected league's evidence, using Gemini's generateContent API: https://ai.google.dev/api/generate-content . Model selection is configurable because availability can change. No successful live inference is implied by mocked tests.

## Adapted capabilities

League-page/fantasy-plus informed connected league navigation and player research. Fantasy Football AI informed contextual team/waiver/trade questions. Weekly-report informed the weekly brief connected to official scores. Watchdog informed transaction monitoring; no messages are sent to Discord. Fantasy Intelligence informed explicit snapshot/coverage boundaries; its research models remain unpromoted. nflseedR's NFL seeding rules and fantasy-manager's separate soccer-game ownership model are not used for Sleeper decisions.

## Historical usage contract

`public/data/football-<season>.json` contains schema version, season, build time, source URLs, mapped player IDs and weekly records. The UI uses up to three recorded games strictly before the selected week. The generator excludes the current incomplete week by default using Sleeper NFL state. Missing categories stay null. Usage averages are supporting historical evidence, not projections, and never alter authoritative league scoring.

Refresh manually with `python3 scripts/refresh-football-data.py`; the optional `--season` and `--through-week` arguments support explicit archived snapshots. Download/schema/mapping failures leave the prior snapshot intact. A feed can be stale even when successfully downloaded; the UI exposes its generation time and each player's through-week/sample.

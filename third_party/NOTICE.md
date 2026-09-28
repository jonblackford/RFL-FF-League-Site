# Source acknowledgments

The observed buy-low/sell-high workflow and two-sided trade/usage analysis in `src/features/advisor/intelligence.ts` are adapted from Nicholas Wilde's `fantasy-football-ai` project, provided under Apache License 2.0 (included here). The TypeScript implementation uses canonical player IDs, at least two prior observations, current league ownership and selected-week boundaries; it does not reproduce the source project's personal ESPN configuration.

Fantasy-Intelligence's evidence semantics and data-governance documentation informed an original implementation of evidence coverage and missing-data presentation. No unlicensed runtime code, model coefficients, private league snapshots or research artifacts are redistributed.

Other source reviews and data attributions are recorded in `docs/source-integration-audit.md` and `docs/data-sources.md`.

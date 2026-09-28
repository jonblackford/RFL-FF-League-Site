# Deployment and refresh

The existing repository deploys main to GitHub Pages. Pull requests and the implementation branch run unit, Python, production-build and deterministic browser checks. The production workflow repeats checks and verifies hash routing before publication.

One Pages workflow owns both code deployment and daily historical-feed refresh (10:20 UTC, subject to GitHub scheduler delays). It checks out current main, refreshes completed-game data, builds and smoke-tests the artifact, commits only validated feed JSON, and deploys the artifact in the same run. This avoids relying on a GITHUB_TOKEN-authored commit to trigger another workflow. A concurrent source push makes the feed push fail normally rather than overwrite remote changes; a later queued run uses current main.

On upstream refresh failure, the last committed historical snapshot remains available with its original timestamp. Live Sleeper league and roster data is fetched by the browser independently. `/version.json` identifies the exact deployed commit. GitHub Pages must remain configured to use GitHub Actions; repository rules must permit the workflow's narrowly scoped data commit or the workflow will report that failure before deployment.

Gemini on Pages uses the visitor's own key, retained only in memory and sent directly to Google. Model ID is configurable in the connection panel. No server key is included in a Pages build. The existing private RFL server endpoint is retained for its original scope; this release does not convert it into a public shared-key service. Quota errors leave calculated advice available. All selected platform changes remain read-only: no lineup, trade or waiver is submitted by this site.

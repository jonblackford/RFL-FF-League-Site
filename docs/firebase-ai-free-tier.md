# Free-tier AI connection

## Active configuration

- Project: `rfl-agent` (`1078810053990`), owned by the user's Google account.
- Web app: `1:1078810053990:web:cf83c564b5493187774ca7`, RFL Agent GitHub Pages.
- Billing verification: no linked Cloud Billing account; Spark/free-tier setup.
- Provider: Firebase AI Logic, **Gemini Developer API**; model `gemini-3.1-flash-lite` (current free-tier text model).
- App Check: reCAPTCHA Enterprise, hostname `jonblackford.github.io`, minimum score 0.5, token lifetime one day. AI Logic enforcement is enabled (`firebaseml.googleapis.com` is its App Check service ID).
- Firebase browser API key restricted to `https://jonblackford.github.io/*` and the Firebase API allowlist. Gemini Developer API access is not allowed directly with this public Firebase key.
- Client configuration is in `src/config/firebase-ai.json`. Its Firebase API key and reCAPTCHA site key are public configuration, not provider/service-account secrets.

The app initializes App Check before Firebase AI and sends bounded conversation history with the current league/team/week evidence. Visitors no longer supply a Gemini key. Missing configuration, quota exhaustion, app attestation failure and incomplete answers produce errors without switching to a paid provider. The SDK is loaded only when AI is requested.

No Cloud Functions, Firestore, Firebase Hosting, Vertex/Agent Platform backend or paid billing was activated. The site stays on GitHub Pages. Keep this project unlinked from billing: a code label alone cannot prevent charges if an owner later upgrades its cloud billing plan. Free usage is limited, not unlimited.

## Diagnosis and verification

Previously the public app required a visitor-entered key; `.env.local` configured only the separate private local endpoint and could not connect a static GitHub Pages deployment. The legacy direct-key path now reports unverified, model-access verified and actual answered states accurately, but the deployed site uses Firebase instead.

459 unit tests passed. Browser tests exercise the shared Firebase request with App Check mocked and verify that no personal-key field is needed. A real Firebase AI Logic request to the configured model returned HTTP 200, finish reason STOP, and “RFL connection works.” A temporary App Check debug token used for that administrative smoke test was deleted immediately; no debug token is shipped in the app. Production browser attestation is checked separately at release.

The Firebase CLI account-list command unexpectedly emitted credentials in the local tool transcript. Those credentials are not in source control or client configuration. The user was notified to revoke/re-authenticate that pre-existing CLI login. All subsequent account handling filters output and avoids printing tokens.

## What the API directory does and does not provide

The linked `OuterSpacee/free-ai-apis` repository is a directory, not an AI backend or a guarantee of current quotas. Verify each entry against provider documentation. Puter's current user-pays model gives users an allowance and meters usage to their accounts; it is not unlimited free AI for all site visitors. Local inference avoids a hosted API quota but consumes the user's hardware and needs a separate local/browser model integration.

Checked 2026-09-28:
- [Firebase AI Logic pricing and Spark requirements](https://firebase.google.com/docs/ai-logic/pricing)
- [Firebase Web setup](https://firebase.google.com/docs/ai-logic/get-started?platform=web)
- [Firebase App Check setup](https://firebase.google.com/docs/ai-logic/app-check)
- [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Puter user-pays model](https://docs.puter.com/user-pays-model/)
- [Original API directory](https://github.com/OuterSpacee/free-ai-apis)

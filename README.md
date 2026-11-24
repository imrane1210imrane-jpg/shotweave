# Shotweave

Turn numbered scene beats into a continuity checklist for an independent film crew. Each suggestion cites the original beat and names the relevant department. Export the reviewed draft as Markdown.

Live demo: https://shotweave-c984a.web.app/

## Modes

- **Review on this device** uses Firebase AI Logic in on-device-only mode. Draft beats are held in page memory and do not go to cloud inference.
- **Review fictional scene** uses hybrid inference with explicit consent. It sends the shipped fictional scene only, regardless of what is in the editor. Firebase AI Logic tries on-device inference first and falls back to the Gemini Developer API when unavailable. The result identifies the inference route.
- Suggestions still require a crew member to verify the content against the cited beat.

## Configure and run

1. Provision a separate Firebase project on **Spark**, with billing disabled. Enable Firebase AI Logic and choose **Gemini Developer API**, not the billing-required backend. Register a Web app.
2. Register the Web app with Firebase App Check using a reCAPTCHA Enterprise site key for the production hosting domain. Enforce App Check on Firebase AI Logic. Keep the provider secret in the Firebase console. Add only the public Firebase Web configuration and public reCAPTCHA **site key** to `public/firebase-config.mjs`.
3. Deploy `public` to the project's Firebase Hosting domain using the supplied `firebase.json`. Authenticate with the owner account using the Firebase CLI and deploy with `firebase deploy --only hosting --project YOUR_PROJECT_ID`. Do not commit API secrets, reCAPTCHA secrets or debug tokens.
4. For local inference, use desktop Chrome on a supported device and follow the Firebase hybrid Web guide to enable and download Gemini Nano. A local-only error leaves the cloud opt-in available for the fictional scene. Firebase's supported devices, model delivery and free quotas apply.

References: [Firebase hybrid Web setup](https://firebase.google.com/docs/ai-logic/hybrid/web/get-started), [pricing](https://firebase.google.com/docs/ai-logic/pricing), [App Check](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider), [contest rules](https://firebasehybridaihackathon.devpost.com/rules).

## Run tests

- `node --test tests/core.test.mjs`
- Optional browser integration suite: install Playwright in the test environment, serve `public` locally at port 8764 with `python3 -m http.server 8764 --directory public`, then run `node tests/browser.cjs`. Run against the repository's unconfigured fixture. Its second pass intercepts the adapter explicitly and covers rendering, exported output and separation of draft text from the fictional cloud request.
- Production acceptance: on a Chrome device with Nano available, run the fictional scene through **Review on this device** and confirm **On device** and a Markdown export. On a browser without Nano, opt into the fictional scene fallback and confirm **Cloud · fictional scene**. Retry a private-input local-only request on that browser and verify it fails without cloud inference. Record both real paths for the submission demo.

## Development and disclosure

Built during the November 2026 submission period. Codex was used substantially for design, implementation, tests and submission material. Scene data is fictional. Firebase JavaScript SDK is loaded from Google's CDN at runtime. The LICENSE file contains the Apache License, Version 2.0 for the Shotweave source. The Firebase JavaScript SDK and Gemini models are external dependencies under their respective terms.

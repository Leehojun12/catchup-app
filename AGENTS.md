# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Cursor Cloud specific instructions

This is a managed-workflow Expo SDK 56 (React Native 0.85, React 19) app (`catchup-app`). There is no backend, database, lint, or test setup — just the Metro dev server. Run commands are in `package.json` scripts.

- In the headless cloud VM there is no iOS/Android simulator, so use the **web** target to run/see the app: `npx expo start --web --port 8081`, then open `http://localhost:8081/`. It is a long-lived process; run it in tmux/background, not a blocking shell call.
- The web target requires runtime peers `react-dom`, `react-native-web`, and `@expo/metro-runtime` (already added to `package.json`; `npm install` restores them).
- The web bundle is large (~1.5 MB) and is compiled lazily on first request, so the first page load / first bundle fetch can take ~10–20s before the app renders. This is normal, not a hang.
- To verify a build without a browser, fetch a bundle from the dev server, e.g. `curl "http://localhost:8081/index.bundle?platform=web&dev=true"` (or `platform=android`) and expect HTTP 200.

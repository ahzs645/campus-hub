# Campus Hub TV

Android TV / Google TV shell for Campus Hub. The supported Android target is now a thin native Kotlin app that wraps the Campus Hub web display in a `WebView`, keeps a small local setup server, and stays focused on unattended signage use.

The React Native code in this directory remains only for experimental non-Android TV work.

## Prerequisites

- Node.js 18+
- Android Studio / Android SDK
- For Android TV: Android TV emulator or device available through ADB
- React Native tooling is only needed if you are still experimenting with the tvOS side of this directory

## Setup

```bash
cd tv-app
npm install

# iOS/tvOS files remain in the repo for experimental work, but the supported
# deployment path is Android TV / Google TV.
```

## Running

### Android TV / Google TV

```bash
npm run android-tv
```

This installs the native Android TV shell and launches `com.campushubtv/.MainActivity`.

If you only want to build the APK:

```bash
npm run android-tv-build
```

## Configuration

Edit the Android build constants in `android/app/build.gradle` to set your Campus Hub server URL:

- `CAMPUS_HUB_BASE_URL`
- `DEFAULT_DISPLAY_PATH`
- `OFFLINE_FALLBACK_URL`
- `SETUP_WEBSOCKET_PATH`

Local network `http://` URLs are supported on Android so the shell can point at a LAN-hosted Campus Hub instance during signage deployments.

## Release Signing

`android/gradle.properties` holds the release keystore credentials read by
`android/app/build.gradle` and is **git-ignored** (`tv-app/.gitignore`). It is
not in the repo, so a fresh clone needs it created:

```bash
cd tv-app/android
cp gradle.properties.example gradle.properties
# then edit gradle.properties and fill in:
#   CAMPUSHUBTV_UPLOAD_STORE_FILE     path to the keystore, relative to android/app/
#   CAMPUSHUBTV_UPLOAD_KEY_ALIAS
#   CAMPUSHUBTV_UPLOAD_STORE_PASSWORD
#   CAMPUSHUBTV_UPLOAD_KEY_PASSWORD
```

Keep the keystore itself out of the repo too (`*.keystore` is ignored; use a
name that is ignored or store it outside the tree). Only
`gradle.properties.example`, with placeholder values, is tracked.

### Secret rotation required

An earlier revision committed the real `android/gradle.properties`, including
`CAMPUSHUBTV_UPLOAD_STORE_PASSWORD` and `CAMPUSHUBTV_UPLOAD_KEY_PASSWORD`
(introduced in commit `768b6ce`). Removing the file from the tree does not
remove it from history, so:

1. Treat those passwords as compromised and rotate them: generate a new upload
   keystore/key (or at least change both passwords) and, if the key was used for
   Play Console uploads, request an upload-key reset from Google Play.
2. Purge the file from history and force-push. This rewrites every commit since
   `768b6ce` and must be coordinated by the repository owner with anyone who has
   a clone:

   ```bash
   git filter-repo --path tv-app/android/gradle.properties --invert-paths
   git push --force --all
   git push --force --tags
   ```

## Pairing Model

The shipped Android TV pairing flow is **direct local HTTP**:

- The TV shows a QR code that opens `http://<tv-ip>:8888/?pair=<code>`.
- The phone connects to the TV directly on the LAN.
- The TV's local page uses the 6-digit pairing code for API access.
- Config updates and actions are sent straight to the TV over HTTP.

This keeps setup serverless and avoids a relay/signaling service for the TV shell.

### Why this is the shipped path

- It works with the current thin-shell architecture.
- It avoids WebRTC signaling, TURN, and backend coordination.
- It is simpler to support operationally for same-network signage installs.

### Operational constraints

- The phone and TV must be on the same local network.
- Guest Wi-Fi, client isolation, and segmented enterprise LANs can block direct pairing.
- The recommended path is to scan the QR code and open the TV's own local page directly.
- A hosted helper page can assist with manual entry, but some browsers restrict HTTPS-to-local-device requests.
- Android emulator addresses such as `10.0.2.15` are emulator-internal; validate real QR scanning on actual Android TV / Google TV hardware or use `adb forward tcp:8888 tcp:8888` during local development.

### What was considered and not used

- **Public-site-only control without a local endpoint**: browsers do not give normal websites reliable LAN discovery or unrestricted direct local connectivity.
- **LocalSend-style browser discovery**: realistic for native apps, not for a normal hosted web page.
- **PairDrop/WebRTC-style setup**: still needs server-assisted signaling and optional TURN.
- **WICG Local Peer-to-Peer API**: promising, but not a production-ready browser dependency for this project.

### WebSocket upgrade path

The local API already reserves a future transport seam for live updates:

- HTTP today: `http://<tv-ip>:8888`
- Reserved socket path for future work: `ws://<tv-ip>:8888/ws?pair=<code>`

The current implementation advertises that WebSocket path in its metadata, but does not enable it yet. The intent is to add live status pushes and persistent control sessions later without redesigning the pairing flow.

## Remote Control

| Action | Android TV |
|--------|------------|
| Open setup | `Menu` |
| Return from setup | `Back` |
| Return to home from display | `Back` |
| Retry on error | Focus `Retry` and press `Select` |

## Architecture

The Android TV app is a thin native shell that loads the Campus Hub web display in a `WebView`:

```
┌─────────────────────────────────┐
│  Native Android TV shell          │
│  ┌───────────────────────────┐  │
│  │  WebView                  │  │
│  │  ┌─────────────────────┐  │  │
│  │  │ Campus Hub Web App  │  │  │
│  │  │ (Next.js static)    │  │  │
│  │  └─────────────────────┘  │  │
│  └───────────────────────────┘  │
│  Local Setup Server (port 8888) │
│  Pair Code + QR Setup Screen    │
│  Auto-reload / Offline Fallback │
└─────────────────────────────────┘
```

The setup flow is local-first:

- The TV shows a QR code, local address, and 6-digit pairing code.
- The QR opens the TV's own local setup page directly.
- The local page calls `/api/config`, `/api/info`, and `/api/action` on the TV with the pairing code.
- The TV exits QR mode as soon as a config is applied and returns to the display.

## Deployment Tips

- **Kiosk mode**: On Android TV, use a device management tool to lock the device to this app on boot.
- **Local network**: Host Campus Hub on the same LAN as the TVs for fastest load times.
- **Wrapper-only deployment**: Keep the Android app as a minimal shell and let the web app remain the product surface for widget rendering and configuration.
- **Offline bundling**: Export a static display build into Android assets and point `CAMPUS_HUB_BASE_URL` at `file:///android_asset/web`.

## tvOS Status

The `ios/` directory remains in the repository for experimental work, but tvOS is not the primary supported deployment path.

If you need a managed native TV shell, Android TV / Google TV is the recommended direction for this repo.

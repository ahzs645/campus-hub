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
| Open setup | `Back` or `Menu` |
| Return from setup | `Back` |
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

# Campus Hub TV

React Native TV shell for Android TV and Google TV, with experimental non-Android fallback code in the repository. The primary supported use case is loading the Campus Hub web display in a lightweight managed TV container.

## Prerequisites

- Node.js 18+
- [React Native development environment](https://reactnative.dev/docs/environment-setup)
- For Android TV: Android Studio with Android TV emulator or device

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

Ensure an Android TV emulator is running or a device is connected via ADB.

## Configuration

Edit `src/utils/config.ts` to set your Campus Hub server URL:

```ts
export const CONFIG = {
  CAMPUS_HUB_URL: "https://hub.yourcampus.edu",
  DEFAULT_PATH: "/display/",
  // ...
};
```

For URL-configured displays, append the config hash to the path:

```ts
DEFAULT_PATH: "/display/?c=YOUR_CONFIG_HASH",
```

Local network `http://` URLs are supported on Android so the shell can point at a LAN-hosted Campus Hub instance during signage deployments.

## Remote Control

| Action        | Apple TV (Siri Remote) | Android TV (D-pad) |
|---------------|----------------------|-------------------|
| Reload (error)| Press Select         | Press Select      |
| Go back       | Press Menu           | Press Menu        |
| Force reload  | Long-press Select    | Long-press Select |
| Info overlay  | Press Play/Pause     | Press Play/Pause  |

## Architecture

The Android TV app is a thin native shell that loads the Campus Hub web display in a WebView:

```
┌─────────────────────────────────┐
│  React Native TV shell            │
│  ┌───────────────────────────┐  │
│  │  WebView                  │  │
│  │  ┌─────────────────────┐  │  │
│  │  │ Campus Hub Web App  │  │  │
│  │  │ (Next.js static)    │  │  │
│  │  └─────────────────────┘  │  │
│  └───────────────────────────┘  │
│  TV Remote Handler               │
│  Auto-reload Timer               │
│  Error/Loading States            │
└─────────────────────────────────┘
```

The web app runs on a separate server. The Android TV shell connects to it over the network and provides remote shortcuts, setup QR flow, and reload controls.

## Deployment Tips

- **Kiosk mode**: On Android TV, use a device management tool to lock the device to this app on boot.
- **Local network**: Host Campus Hub on the same LAN as the TVs for fastest load times.
- **Wrapper-only deployment**: Keep the Android app as a minimal shell and let the web app remain the product surface for widget rendering and configuration.
- **Offline bundling** (Android only): Export the Next.js static site into `android/app/src/main/assets/web/` and set `CAMPUS_HUB_URL` to `file:///android_asset/web`.

## tvOS Status

The `ios/` directory remains in the repository for experimental work, but tvOS is not the primary supported deployment path.

If you need a managed native TV shell, Android TV / Google TV is the recommended direction for this repo.

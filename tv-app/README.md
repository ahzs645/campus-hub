# Campus Hub TV

React Native TV app for Apple TV (tvOS) and Android TV. Wraps the Campus Hub web app in a native TV shell with remote control support.

## Prerequisites

- Node.js 18+
- [React Native development environment](https://reactnative.dev/docs/environment-setup)
- For Apple TV: Xcode 15+ with tvOS SDK
- For Android TV: Android Studio with Android TV emulator or device

## Setup

```bash
cd tv-app
npm install

# iOS/tvOS: install CocoaPods
cd ios && pod install && cd ..
```

## Running

### Apple TV

```bash
npm run tvos
```

This launches the app on an Apple TV simulator. To run on a physical Apple TV, configure code signing in Xcode and select your device.

### Android TV

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

## Remote Control

| Action        | Apple TV (Siri Remote) | Android TV (D-pad) |
|---------------|----------------------|-------------------|
| Reload (error)| Press Select         | Press Select      |
| Go back       | Press Menu           | Press Menu        |
| Force reload  | Long-press Select    | Long-press Select |
| Info overlay  | Press Play/Pause     | Press Play/Pause  |

## Architecture

The TV app is a thin native shell that loads the Campus Hub web app in a WebView:

```
┌─────────────────────────────────┐
│  React Native (react-native-tvos)│
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

The web app runs on a separate server (or can be bundled as assets for Android TV). The TV app connects to it over the network.

## Deployment Tips

- **Kiosk mode**: On Android TV, use a device management tool to lock the device to this app on boot.
- **Auto-start on Apple TV**: Configure the app as a Single App Mode profile via Apple Configurator or MDM.
- **Local network**: Host Campus Hub on the same LAN as the TVs for fastest load times.
- **Offline bundling** (Android only): Export the Next.js static site into `android/app/src/main/assets/web/` and set `CAMPUS_HUB_URL` to `file:///android_asset/web`.

## tvOS Native Project

The `ios/` directory contains the native Xcode project for Apple TV (tvOS):

| File | Purpose |
|------|---------|
| `CampusHubTV.xcodeproj/project.pbxproj` | Xcode project targeting tvOS 16.0 with `TARGETED_DEVICE_FAMILY = 3` (Apple TV) |
| `CampusHubTV/AppDelegate.mm` + `.h` | Standard React Native app delegate |
| `CampusHubTV/main.m` | App entry point |
| `CampusHubTV/Info.plist` | App config with local network permissions, dark mode, ATS exceptions |
| `CampusHubTV/LaunchScreen.storyboard` | Launch screen with "Campus Hub TV" in gold on green (matching theme) |
| `CampusHubTV/PrivacyInfo.xcprivacy` | Apple privacy manifest |
| `Podfile` | CocoaPods config targeting `platform :tvos, '16.0'` |
| `.xcode.env` | Node binary path for RN build scripts |

### Building for tvOS

```bash
# Install CocoaPods (one-time)
gem install cocoapods
# or: brew install cocoapods

# Install pods
cd tv-app/ios && pod install && cd ..

# Run on Apple TV simulator
npm run tvos
```

The `npm run tvos` script targets `--scheme CampusHubTV --simulator 'Apple TV'`, so it works out of the box after pod install.

### Code Signing (Physical Apple TV)

To deploy to a real Apple TV device:

1. Open `ios/CampusHubTV.xcworkspace` in Xcode
2. Select the CampusHubTV target → Signing & Capabilities
3. Set your development team and bundle identifier
4. Connect your Apple TV and select it as the run destination

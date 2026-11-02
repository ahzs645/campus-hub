# Roku App Feasibility Analysis

**Date:** 2026-03-23
**Status:** Not Recommended

## Summary

Building a Roku app for Campus Hub is **not viable** using the same approach as the Android TV app. The Android app works by wrapping the Campus Hub web interface in a WebView with a local HTTP server for configuration. Roku lacks WebView, embedded browsers, and HTML/CSS/JS rendering entirely, making a direct port impossible.

## Android TV App Architecture (Current)

The Android TV app (`tv-app/android/`) uses:

- **WebView** to render the full Campus Hub Next.js web interface
- **NanoHTTPD** local HTTP server (port 8888) for setup/config API
- **QR code pairing** via the local server for easy on-site setup
- **Boot receiver** for auto-launch on power-on
- **Socket.IO** (via WebView) for real-time signaling server communication

This approach is lightweight because the web app *is* the product — the native shell just hosts it.

## Roku Platform Limitations

| Capability             | Android TV       | Roku                  |
| ---------------------- | ---------------- | --------------------- |
| WebView component      | Yes (Chromium)   | **Not available**     |
| Runtime language       | Kotlin/Java      | BrightScript (proprietary) |
| Embedded HTTP server   | Yes (NanoHTTPD)  | **Not available**     |
| HTML/CSS/JS rendering  | Full             | **None**              |
| Socket.IO support      | Yes (via WebView)| **Not available**     |
| React Native support   | Yes              | **Not available**     |
| WebSocket support      | N/A              | **Not available natively** |

## Widget Feasibility on Roku

| Widget              | Feasible? | Notes                                      |
| ------------------- | --------- | ------------------------------------------ |
| Clock               | Yes       | SceneGraph Label + Timer nodes             |
| Poster Carousel     | Yes       | Roku has Poster/RowList nodes              |
| Events List         | Yes       | LabelList/MarkupList components            |
| News Ticker         | Partial   | Manual animation needed in SceneGraph      |
| Weather             | Yes       | REST API call + native rendering           |
| RSS Feeds           | Yes       | HTTP fetch + XML parsing supported         |
| YouTube Player      | **No**    | No iframe/embed support on Roku            |
| Web Embed           | **No**    | No web rendering capability                |
| Home Assistant      | Partial   | REST API only, no WebSocket/Socket.IO      |
| GridStack Layouts   | **No**    | Would require custom grid engine in BrightScript |
| Media Player        | Partial   | Roku supports video/audio but not web media|
| QR Code Generator   | Partial   | Would need custom bitmap rendering         |

**Estimated widget coverage:** ~40-50% of current widget library

## Effort Estimates

| Approach                                  | Effort        | Widget Coverage |
| ----------------------------------------- | ------------- | --------------- |
| Full native BrightScript app              | Very High     | ~50%            |
| Subset app (clock, posters, events, ticker) | High        | ~25%            |
| Roku "Web Video Player" channel type      | Low           | Display only    |

## Key Blockers

1. **No WebView** — the entire Android app architecture depends on this
2. **No local HTTP server** — QR-code pairing/setup flow cannot work; would need signaling-server-only approach or Roku ECP protocol
3. **No Socket.IO / WebSocket** — real-time config push would need polling
4. **BrightScript ecosystem** — niche language, limited tooling, small community
5. **Roku certification** — strict review process for channel publishing
6. **Maintenance burden** — every new widget would need a parallel BrightScript implementation

## Recommended Alternatives

For expanding to more TV/display platforms, these options provide much better ROI:

### High-Value, Low-Effort

| Platform                | Why                                                        |
| ----------------------- | ---------------------------------------------------------- |
| **Amazon Fire TV**      | Runs Android — existing APK works with minimal changes     |
| **Chromecast/Google TV**| Android-based — same APK approach                          |
| **Raspberry Pi**        | Chromium kiosk mode — full feature parity, very cheap hardware |

### Medium-Value, Medium-Effort

| Platform                | Why                                                        |
| ----------------------- | ---------------------------------------------------------- |
| **LG webOS**            | Has built-in web app support — can host the web UI directly|
| **Samsung Tizen**       | Has web app runtime — similar to webOS approach            |

### Not Recommended

| Platform                | Why                                                        |
| ----------------------- | ---------------------------------------------------------- |
| **Roku**                | No web rendering — requires full native rewrite for partial coverage |

## Conclusion

The Campus Hub architecture is fundamentally web-first, which is a strength for platforms that support web rendering (Android WebView, browser kiosk, webOS, Tizen). Roku's lack of any web rendering makes it a poor fit. Development effort would be very high for significantly reduced functionality.

**Recommendation:** Prioritize Fire TV, Google TV, and Raspberry Pi for maximum reach with minimum effort. Consider LG webOS and Samsung Tizen for smart TV coverage. Skip Roku.

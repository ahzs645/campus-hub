# Reviewer Notes

Campus Hub TV is an Android TV / Google TV signage shell.

## Basic Review Flow

1. Launch the app from the Android TV home screen.
2. The app opens directly into the live display runtime.
3. Press `Menu` on the remote to open the setup screen.
4. Press `Back` once to return from setup to the display.
5. Press `Back` again from the display to return to the Android TV launcher.

## Setup Behavior

- The setup screen shows a local network address, QR code, and 6-digit pairing code.
- Setup is intended for a phone on the same Wi-Fi or Ethernet network as the TV.
- The QR code opens the TV's own local setup page directly.

## Important Notes

- The Android emulator may show `10.0.2.15`, which is emulator-internal and not representative of a real TV device on a LAN.
- On physical hardware, the app displays the actual local network address of the TV device.
- The app does not require user login to launch or review the default display shell.

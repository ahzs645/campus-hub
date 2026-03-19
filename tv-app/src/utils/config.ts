/**
 * TV app configuration.
 *
 * Set CAMPUS_HUB_URL to the URL where your Campus Hub web app is hosted.
 * This can be a local network address (for self-hosted setups) or a
 * public URL (for cloud-hosted deployments).
 */

export const CONFIG = {
  /**
   * Base URL of the Campus Hub web app.
   * Examples:
   *   - "http://192.168.1.100:3000" (local network)
   *   - "https://hub.yourcampus.edu" (production)
   *   - "file:///android_asset/web" (bundled, Android TV only)
   */
  CAMPUS_HUB_URL: "https://campus.ahmadjalil.com",

  /**
   * Default path to load. Typically "/display/" to go straight
   * to the signage display, or "/" for the landing page.
   */
  DEFAULT_PATH: "/display/",

  /**
   * How long (ms) to wait before showing an error screen
   * when the web app fails to load.
   */
  LOAD_TIMEOUT_MS: 15000,

  /**
   * Auto-reload interval (ms). Set to 0 to disable.
   * Useful for recovering from stale states on unattended displays.
   */
  AUTO_RELOAD_INTERVAL_MS: 6 * 60 * 60 * 1000, // 6 hours
} as const;

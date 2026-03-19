import React, { useRef, useState, useCallback, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator, Text, Platform } from "react-native";
import { WebView, WebViewNavigation } from "react-native-webview";
import { CONFIG } from "@/utils/config";
import { useTVRemote, TVRemoteAction } from "@/hooks/useTVRemote";

/**
 * Full-screen WebView component that loads the Campus Hub web app.
 *
 * Features:
 * - Loads the display page directly for signage mode
 * - Shows a loading spinner while the page loads
 * - Handles load errors with a retry mechanism
 * - Responds to TV remote events (menu to go back, select to reload)
 * - Auto-reloads on a configurable interval for unattended displays
 */
export function TVWebView() {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  const displayUrl = `${CONFIG.CAMPUS_HUB_URL}${CONFIG.DEFAULT_PATH}`;

  // Auto-reload for long-running unattended displays
  useEffect(() => {
    if (CONFIG.AUTO_RELOAD_INTERVAL_MS <= 0) return;

    const interval = setInterval(() => {
      webViewRef.current?.reload();
    }, CONFIG.AUTO_RELOAD_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  // TV remote handler
  useTVRemote(
    useCallback((action: TVRemoteAction) => {
      switch (action) {
        case "select":
          if (hasError) {
            setHasError(false);
            webViewRef.current?.reload();
          }
          break;
        case "menu":
          webViewRef.current?.goBack();
          break;
        case "playPause":
          // Toggle an overlay with connection info
          setShowOverlay((prev) => !prev);
          break;
        case "longSelect":
          // Force reload
          webViewRef.current?.reload();
          break;
      }
    }, [hasError])
  );

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
  }, []);

  const handleLoadEnd = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  // Inject JS to disable scrolling and ensure full-screen display
  const injectedJS = `
    (function() {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      // Prevent any scroll/bounce behavior
      document.addEventListener('touchmove', function(e) { e.preventDefault(); }, { passive: false });
    })();
    true;
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: displayUrl }}
        style={styles.webview}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        onHttpError={handleError}
        injectedJavaScript={injectedJS}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        // Allow mixed content for local network setups
        mixedContentMode="compatibility"
        // Performance optimizations for TV
        cacheEnabled={true}
        cacheMode="LOAD_DEFAULT"
        // Accessibility - allow focus management for remote control
        focusable={true}
      />

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading Campus Hub...</Text>
        </View>
      )}

      {hasError && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorIcon}>!</Text>
          <Text style={styles.errorTitle}>Unable to Connect</Text>
          <Text style={styles.errorMessage}>
            Could not reach Campus Hub at:{"\n"}
            {displayUrl}
          </Text>
          <Text style={styles.errorHint}>
            Press Select to retry
          </Text>
        </View>
      )}

      {showOverlay && (
        <View style={styles.infoOverlay}>
          <Text style={styles.infoTitle}>Campus Hub TV</Text>
          <Text style={styles.infoText}>
            Server: {CONFIG.CAMPUS_HUB_URL}
          </Text>
          <Text style={styles.infoText}>
            Platform: {Platform.OS} ({Platform.isTV ? "TV" : "Mobile"})
          </Text>
          <Text style={styles.infoHint}>
            Press Play/Pause to dismiss
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  webview: {
    flex: 1,
    backgroundColor: "#000",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#9ca3af",
    fontSize: 20,
    marginTop: 16,
    fontWeight: "300",
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorIcon: {
    color: "#ef4444",
    fontSize: 64,
    fontWeight: "bold",
    marginBottom: 16,
  },
  errorTitle: {
    color: "#f3f4f6",
    fontSize: 32,
    fontWeight: "600",
    marginBottom: 12,
  },
  errorMessage: {
    color: "#9ca3af",
    fontSize: 18,
    textAlign: "center",
    lineHeight: 28,
    marginBottom: 24,
  },
  errorHint: {
    color: "#6b7280",
    fontSize: 16,
  },
  infoOverlay: {
    position: "absolute",
    bottom: 40,
    right: 40,
    backgroundColor: "rgba(0,0,0,0.85)",
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: "#374151",
  },
  infoTitle: {
    color: "#f3f4f6",
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  infoText: {
    color: "#9ca3af",
    fontSize: 14,
    marginBottom: 4,
  },
  infoHint: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 8,
  },
});

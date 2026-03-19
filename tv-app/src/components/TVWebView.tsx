import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Pressable,
  Animated,
} from "react-native";
import { WebView } from "react-native-webview";
import { CONFIG } from "@/utils/config";

type Props = {
  url: string;
  showIdentify?: boolean;
  onOpenSetup?: () => void;
};

export type TVWebViewHandle = {
  reload: () => void;
};

export const TVWebView = forwardRef<TVWebViewHandle, Props>(
  function TVWebView({ url, showIdentify, onOpenSetup }, ref) {
    const webViewRef = useRef<WebView>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [showToolbar, setShowToolbar] = useState(false);
    const toolbarOpacity = useRef(new Animated.Value(0)).current;
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useImperativeHandle(ref, () => ({
      reload: () => webViewRef.current?.reload(),
    }));

    // Auto-reload for long-running unattended displays
    useEffect(() => {
      if (CONFIG.AUTO_RELOAD_INTERVAL_MS <= 0) return;
      const interval = setInterval(() => {
        webViewRef.current?.reload();
      }, CONFIG.AUTO_RELOAD_INTERVAL_MS);
      return () => clearInterval(interval);
    }, []);

    const showToolbarWithTimer = useCallback(() => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setShowToolbar(true);
      Animated.timing(toolbarOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      hideTimer.current = setTimeout(() => {
        Animated.timing(toolbarOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setShowToolbar(false));
      }, 4000);
    }, [toolbarOpacity]);

    const handleTap = useCallback(() => {
      if (showToolbar) {
        // Already showing — hide it
        if (hideTimer.current) clearTimeout(hideTimer.current);
        Animated.timing(toolbarOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setShowToolbar(false));
      } else {
        showToolbarWithTimer();
      }
    }, [showToolbar, showToolbarWithTimer, toolbarOpacity]);

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

    const injectedJS = `
      (function() {
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        document.addEventListener('touchmove', function(e) { e.preventDefault(); }, { passive: false });
      })();
      true;
    `;

    return (
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          source={{ uri: url }}
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
          mixedContentMode="compatibility"
          cacheEnabled={true}
          cacheMode="LOAD_DEFAULT"
          focusable={true}
        />

        {/* Invisible tap layer over the WebView */}
        <Pressable
          style={styles.tapLayer}
          onPress={handleTap}
        />

        {/* Floating toolbar */}
        {showToolbar && (
          <Animated.View
            style={[styles.toolbar, { opacity: toolbarOpacity }]}
          >
            <Pressable
              style={styles.toolbarBtn}
              onPress={() => {
                webViewRef.current?.reload();
                showToolbarWithTimer();
              }}
            >
              <Text style={styles.toolbarBtnIcon}>↻</Text>
              <Text style={styles.toolbarBtnLabel}>Reload</Text>
            </Pressable>

            <Pressable
              style={[styles.toolbarBtn, styles.toolbarBtnPrimary]}
              onPress={onOpenSetup}
            >
              <Text style={styles.toolbarBtnIcon}>⚙</Text>
              <Text style={[styles.toolbarBtnLabel, styles.toolbarBtnLabelPrimary]}>
                Setup / QR Code
              </Text>
            </Pressable>
          </Animated.View>
        )}

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading Campus Hub...</Text>
          </View>
        )}

        {hasError && (
          <Pressable style={styles.errorOverlay} onPress={handleTap}>
            <Text style={styles.errorIcon}>!</Text>
            <Text style={styles.errorTitle}>Unable to Connect</Text>
            <Text style={styles.errorMessage}>
              Could not reach Campus Hub at:{"\n"}
              {url}
            </Text>
            <Text style={styles.errorHint}>
              Tap screen to open settings
            </Text>
          </Pressable>
        )}

        {showIdentify && (
          <View style={styles.identifyOverlay}>
            <Text style={styles.identifyText}>Campus Hub TV</Text>
            <Text style={styles.identifySubtext}>This is your TV!</Text>
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  webview: {
    flex: 1,
    backgroundColor: "#000",
  },
  tapLayer: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 80,
    height: 80,
    // Invisible corner tap target — doesn't block WebView interaction
  },
  toolbar: {
    position: "absolute",
    top: 24,
    right: 24,
    flexDirection: "row",
    gap: 10,
    backgroundColor: "rgba(0,0,0,0.85)",
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  toolbarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  toolbarBtnPrimary: {
    backgroundColor: "#3b82f6",
  },
  toolbarBtnIcon: {
    fontSize: 18,
    color: "#e5e7eb",
  },
  toolbarBtnLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#e5e7eb",
  },
  toolbarBtnLabelPrimary: {
    color: "#fff",
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
  identifyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(59,130,246,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  identifyText: {
    color: "#fff",
    fontSize: 48,
    fontWeight: "800",
  },
  identifySubtext: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 24,
    marginTop: 8,
  },
});

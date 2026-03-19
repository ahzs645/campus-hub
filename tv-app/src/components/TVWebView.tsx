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
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { CONFIG } from "@/utils/config";
import { useTVRemote } from "@/hooks/useTVRemote";

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
    const [focusedBtn, setFocusedBtn] = useState(0);
    const toolbarOpacity = useRef(new Animated.Value(0)).current;
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const tapCount = useRef(0);
    const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const BUTTONS = ["reload", "setup", "close"] as const;

    useImperativeHandle(ref, () => ({
      reload: () => webViewRef.current?.reload(),
    }));

    useEffect(() => {
      if (CONFIG.AUTO_RELOAD_INTERVAL_MS <= 0) return;
      const interval = setInterval(() => {
        webViewRef.current?.reload();
      }, CONFIG.AUTO_RELOAD_INTERVAL_MS);
      return () => clearInterval(interval);
    }, []);

    const openToolbar = useCallback(() => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setShowToolbar(true);
      setFocusedBtn(1); // Focus on "Setup" by default
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
      }, 8000);
    }, [toolbarOpacity]);

    const dismissToolbar = useCallback(() => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      Animated.timing(toolbarOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setShowToolbar(false));
    }, [toolbarOpacity]);

    const executeButton = useCallback(
      (btn: (typeof BUTTONS)[number]) => {
        switch (btn) {
          case "reload":
            webViewRef.current?.reload();
            dismissToolbar();
            break;
          case "setup":
            dismissToolbar();
            onOpenSetup?.();
            break;
          case "close":
            dismissToolbar();
            break;
        }
      },
      [dismissToolbar, onOpenSetup]
    );

    // TV remote / keyboard navigation
    useTVRemote(
      useCallback(
        (action) => {
          if (showToolbar) {
            switch (action) {
              case "left":
                setFocusedBtn((i) => Math.max(0, i - 1));
                break;
              case "right":
                setFocusedBtn((i) => Math.min(BUTTONS.length - 1, i + 1));
                break;
              case "select":
                executeButton(BUTTONS[focusedBtn]);
                break;
              case "menu":
                dismissToolbar();
                break;
            }
          } else {
            // When toolbar is hidden: menu or select opens it
            if (action === "menu" || action === "select") {
              openToolbar();
            }
          }
        },
        [showToolbar, focusedBtn, executeButton, dismissToolbar, openToolbar]
      )
    );

    // Listen for triple-tap from inside the WebView (touch fallback)
    const handleWebViewMessage = useCallback(
      (event: WebViewMessageEvent) => {
        const msg = event.nativeEvent.data;
        if (msg === "TAP") {
          tapCount.current += 1;
          if (tapTimer.current) clearTimeout(tapTimer.current);
          if (tapCount.current >= 3) {
            tapCount.current = 0;
            showToolbar ? dismissToolbar() : openToolbar();
          } else {
            tapTimer.current = setTimeout(() => {
              tapCount.current = 0;
            }, 800);
          }
        }
      },
      [showToolbar, openToolbar, dismissToolbar]
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

    const injectedJS = `
      (function() {
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        document.addEventListener('touchmove', function(e) { e.preventDefault(); }, { passive: false });
        document.addEventListener('click', function(e) {
          window.ReactNativeWebView.postMessage('TAP');
        });
        document.addEventListener('touchend', function(e) {
          if (e.changedTouches.length === 1) {
            window.ReactNativeWebView.postMessage('TAP');
          }
        });
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
          onMessage={handleWebViewMessage}
          injectedJavaScript={injectedJS}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          mixedContentMode="compatibility"
          cacheEnabled={true}
          cacheMode="LOAD_DEFAULT"
          focusable={!showToolbar}
        />

        {/* Full-screen overlay + toolbar */}
        {showToolbar && (
          <Pressable style={styles.toolbarOverlay} onPress={dismissToolbar}>
            <Animated.View
              style={[styles.toolbar, { opacity: toolbarOpacity }]}
            >
              {BUTTONS.map((btn, i) => (
                <Pressable
                  key={btn}
                  style={[
                    styles.toolbarBtn,
                    btn === "setup" && styles.toolbarBtnPrimary,
                    btn === "close" && styles.toolbarBtnClose,
                    focusedBtn === i && styles.toolbarBtnFocused,
                  ]}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    executeButton(btn);
                  }}
                >
                  <Text
                    style={[
                      styles.toolbarBtnIcon,
                      focusedBtn === i && styles.toolbarBtnTextFocused,
                    ]}
                  >
                    {btn === "reload" ? "↻" : btn === "setup" ? "⚙" : "✕"}
                  </Text>
                  {btn !== "close" && (
                    <Text
                      style={[
                        styles.toolbarBtnLabel,
                        btn === "setup" && styles.toolbarBtnLabelPrimary,
                        focusedBtn === i && styles.toolbarBtnTextFocused,
                      ]}
                    >
                      {btn === "reload" ? "Reload" : "Setup / QR Code"}
                    </Text>
                  )}
                </Pressable>
              ))}
            </Animated.View>

            <View style={styles.toolbarHint}>
              <Text style={styles.toolbarHintText}>
                ← → Navigate • OK/Enter Select • Back/Esc Dismiss
              </Text>
            </View>
          </Pressable>
        )}

        {isLoading && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading Campus Hub...</Text>
            <Text style={styles.loadingHint}>
              Press OK or Enter for settings
            </Text>
          </View>
        )}

        {hasError && (
          <Pressable style={styles.errorOverlay} onPress={openToolbar}>
            <Text style={styles.errorIcon}>!</Text>
            <Text style={styles.errorTitle}>Unable to Connect</Text>
            <Text style={styles.errorMessage}>
              Could not reach Campus Hub at:{"\n"}
              {url}
            </Text>
            <Text style={styles.errorHint}>
              Press OK/Enter or tap for settings
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
  toolbarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  toolbar: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "rgba(0,0,0,0.9)",
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  toolbarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 2,
    borderColor: "transparent",
  },
  toolbarBtnPrimary: {
    backgroundColor: "rgba(59,130,246,0.3)",
  },
  toolbarBtnClose: {
    paddingHorizontal: 16,
  },
  toolbarBtnFocused: {
    borderColor: "#3b82f6",
    backgroundColor: "rgba(59,130,246,0.25)",
  },
  toolbarBtnIcon: {
    fontSize: 20,
    color: "#e5e7eb",
  },
  toolbarBtnLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#e5e7eb",
  },
  toolbarBtnLabelPrimary: {
    color: "#93c5fd",
  },
  toolbarBtnTextFocused: {
    color: "#fff",
  },
  toolbarHint: {
    marginTop: 16,
  },
  toolbarHintText: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 13,
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
  loadingHint: {
    color: "#4b5563",
    fontSize: 14,
    marginTop: 12,
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

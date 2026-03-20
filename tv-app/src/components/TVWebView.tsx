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
  requireNativeComponent,
  UIManager,
  findNodeHandle,
} from "react-native";
import { CONFIG } from "@/utils/config";
import { useTVRemote } from "@/hooks/useTVRemote";

// Use our custom native tvOS WKWebView
const NativeTVWebView = requireNativeComponent<{
  url: string;
  onLoadStart?: (event: any) => void;
  onLoadEnd?: (event: any) => void;
  onLoadError?: (event: any) => void;
  style?: any;
}>("TVWebView");

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
    const webViewRef = useRef<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [showToolbar, setShowToolbar] = useState(false);
    const [focusedBtn, setFocusedBtn] = useState(0);
    const toolbarOpacity = useRef(new Animated.Value(0)).current;
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Force reload by changing the URL key
    const [reloadKey, setReloadKey] = useState(0);

    const BUTTONS = ["reload", "setup", "close"] as const;

    useImperativeHandle(ref, () => ({
      reload: () => setReloadKey((k) => k + 1),
    }));

    useEffect(() => {
      if (CONFIG.AUTO_RELOAD_INTERVAL_MS <= 0) return;
      const interval = setInterval(() => {
        setReloadKey((k) => k + 1);
      }, CONFIG.AUTO_RELOAD_INTERVAL_MS);
      return () => clearInterval(interval);
    }, []);

    const openToolbar = useCallback(() => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setShowToolbar(true);
      setFocusedBtn(1);
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
            setReloadKey((k) => k + 1);
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
            if (action === "menu" || action === "select") {
              openToolbar();
            }
          }
        },
        [showToolbar, focusedBtn, executeButton, dismissToolbar, openToolbar]
      )
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

    return (
      <View style={styles.container}>
        <NativeTVWebView
          key={reloadKey}
          ref={webViewRef}
          url={url}
          style={styles.webview}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onLoadError={handleError}
        />

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

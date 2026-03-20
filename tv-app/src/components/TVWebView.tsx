import React, {
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useMemo,
} from "react";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  Animated,
  Platform,
} from "react-native";
import WebView from "react-native-webview";
import type {
  WebViewErrorEvent,
  WebViewHttpErrorEvent,
} from "react-native-webview/lib/WebViewTypes";
import { useTVRemote } from "@/hooks/useTVRemote";
import { DisplayRenderer } from "@/display/DisplayRenderer";
import { DisplayConfig, DEFAULT_CONFIG } from "@/display/types";
import { CONFIG } from "@/utils/config";

type Props = {
  url: string;
  showIdentify?: boolean;
  onOpenSetup?: () => void;
};

export type TVWebViewHandle = {
  reload: () => void;
};

type LoadState = "loading" | "ready" | "error";
const TOOLBAR_BUTTONS = ["reload", "setup", "close"] as const;

function normalizeDisplayConfig(raw: unknown): DisplayConfig {
  const candidate =
    raw && typeof raw === "object" ? (raw as Partial<DisplayConfig>) : {};

  return {
    ...DEFAULT_CONFIG,
    ...candidate,
    layout: Array.isArray(candidate.layout)
      ? candidate.layout
      : DEFAULT_CONFIG.layout,
    theme: {
      ...DEFAULT_CONFIG.theme,
      ...(candidate.theme ?? {}),
    },
  };
}

function parseConfigJsonParam(value: string): DisplayConfig | null {
  const candidates = [value];

  try {
    const decoded = decodeURIComponent(value);
    if (decoded !== value) {
      candidates.push(decoded);
    }
  } catch {}

  for (const candidate of candidates) {
    try {
      return normalizeDisplayConfig(JSON.parse(candidate));
    } catch {}
  }

  return null;
}

export const TVWebView = forwardRef<TVWebViewHandle, Props>(
  function TVWebView({ url, showIdentify, onOpenSetup }, ref) {
    const webViewRef = useRef<WebView>(null);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const loadFailedRef = useRef(false);
    const [toolbarOpacity] = useState(() => new Animated.Value(0));

    const [reloadKey, setReloadKey] = useState(0);
    const [showToolbar, setShowToolbar] = useState(false);
    const [focusedBtn, setFocusedBtn] = useState(0);
    const [loadState, setLoadState] = useState<LoadState>("loading");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const isBundledAssetUrl = useMemo(() => url.startsWith("file://"), [url]);

    const nativeDisplay = useMemo(() => {
      try {
        const parsed = new URL(url);
        const configJson = parsed.searchParams.get("configJson");
        const configUrlParam = parsed.searchParams.get("configUrl");

        if (configJson) {
          const parsedConfig = parseConfigJsonParam(configJson);
          if (parsedConfig) {
            return {
              config: parsedConfig,
              configUrl: undefined,
            };
          }
        }

        if (configJson) {
          return {
            config: DEFAULT_CONFIG,
            configUrl: undefined,
          };
        }

        if (configUrlParam) {
          return {
            config: DEFAULT_CONFIG,
            configUrl: configUrlParam,
          };
        }
      } catch {
        return {
          config: DEFAULT_CONFIG,
          configUrl: undefined,
        };
      }

      return {
        config: DEFAULT_CONFIG,
        configUrl: undefined,
      };
    }, [url]);

    const clearLoadTimeout = useCallback(() => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    }, []);

    const beginLoad = useCallback(() => {
      loadFailedRef.current = false;
      setLoadState("loading");
      setErrorMessage(null);
      clearLoadTimeout();
      loadTimeoutRef.current = setTimeout(() => {
        loadFailedRef.current = true;
        webViewRef.current?.stopLoading();
        setLoadState("error");
        setErrorMessage(
          `Timed out after ${Math.round(CONFIG.LOAD_TIMEOUT_MS / 1000)} seconds.`
        );
      }, CONFIG.LOAD_TIMEOUT_MS);
    }, [clearLoadTimeout]);

    const completeLoad = useCallback(() => {
      clearLoadTimeout();
      if (loadFailedRef.current) return;
      setLoadState("ready");
    }, [clearLoadTimeout]);

    const failLoad = useCallback(
      (message: string) => {
        clearLoadTimeout();
        loadFailedRef.current = true;
        setLoadState("error");
        setErrorMessage(message);
      },
      [clearLoadTimeout]
    );

    const reload = useCallback(() => {
      if (Platform.OS === "android") {
        beginLoad();
        webViewRef.current?.reload();
      }
      setReloadKey((current) => current + 1);
    }, [beginLoad]);

    useImperativeHandle(ref, () => ({
      reload,
    }));

    useEffect(() => {
      if (Platform.OS !== "android") return;
      if (CONFIG.AUTO_RELOAD_INTERVAL_MS <= 0) return;
      const interval = setInterval(() => {
        reload();
      }, CONFIG.AUTO_RELOAD_INTERVAL_MS);
      return () => clearInterval(interval);
    }, [reload]);

    useEffect(() => {
      return clearLoadTimeout;
    }, [clearLoadTimeout]);

    useEffect(() => {
      return () => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
      };
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
      (btn: (typeof TOOLBAR_BUTTONS)[number]) => {
        switch (btn) {
          case "reload":
            reload();
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
      [dismissToolbar, onOpenSetup, reload]
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
                setFocusedBtn((i) =>
                  Math.min(TOOLBAR_BUTTONS.length - 1, i + 1)
                );
                break;
              case "select":
                executeButton(TOOLBAR_BUTTONS[focusedBtn]);
                break;
              case "menu":
                dismissToolbar();
                break;
            }
          } else if (action === "menu" || action === "select") {
            openToolbar();
          }
        },
        [
          showToolbar,
          focusedBtn,
          executeButton,
          dismissToolbar,
          openToolbar,
        ]
      )
    );

    const handleHttpError = useCallback(
      (event: WebViewHttpErrorEvent) => {
        const { statusCode, description } = event.nativeEvent;
        failLoad(
          description
            ? `HTTP ${statusCode}: ${description}`
            : `HTTP ${statusCode}`
        );
      },
      [failLoad]
    );

    const handleError = useCallback(
      (event: WebViewErrorEvent) => {
        const description =
          event.nativeEvent.description || "Could not load the display URL.";
        failLoad(description);
      },
      [failLoad]
    );

    if (Platform.OS !== "android") {
      return (
        <View style={styles.container}>
          <DisplayRenderer
            key={reloadKey}
            config={nativeDisplay.config}
            configUrl={nativeDisplay.configUrl}
          />

          {showToolbar && (
            <Pressable style={styles.toolbarOverlay} onPress={dismissToolbar}>
              <Animated.View
                style={[styles.toolbar, { opacity: toolbarOpacity }]}
              >
                {TOOLBAR_BUTTONS.map((btn, i) => (
                  <Pressable
                    key={btn}
                    style={[
                      styles.toolbarBtn,
                      btn === "setup" && styles.toolbarBtnPrimary,
                      btn === "close" && styles.toolbarBtnClose,
                      focusedBtn === i && styles.toolbarBtnFocused,
                    ]}
                    onPress={(event) => {
                      event.stopPropagation?.();
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

          {showIdentify && (
            <View style={styles.identifyOverlay}>
              <Text style={styles.identifyText}>Campus Hub TV</Text>
              <Text style={styles.identifySubtext}>This is your TV!</Text>
            </View>
          )}
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <WebView
          key={`${url}-${reloadKey}`}
          ref={webViewRef}
          source={{ uri: url }}
          style={styles.webView}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          allowFileAccess
          allowFileAccessFromFileURLs={isBundledAssetUrl}
          allowUniversalAccessFromFileURLs={isBundledAssetUrl}
          mixedContentMode="compatibility"
          cacheEnabled
          cacheMode="LOAD_DEFAULT"
          setSupportMultipleWindows={false}
          onLoadStart={beginLoad}
          onLoadEnd={completeLoad}
          onHttpError={handleHttpError}
          onError={handleError}
        />

        {loadState === "loading" && (
          <View style={styles.loadingOverlay}>
            <Text style={styles.loadingTitle}>Loading display...</Text>
            <Text style={styles.loadingSubtitle}>{url}</Text>
          </View>
        )}

        {loadState === "error" && (
          <View style={styles.errorOverlay}>
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Display failed to load</Text>
              <Text style={styles.errorMessage}>
                {errorMessage ?? "Could not load the display URL."}
              </Text>
              <Text style={styles.errorHint}>
                Check the URL, network access, or CORS proxy settings.
              </Text>

              <View style={styles.errorActions}>
                <Pressable style={styles.errorButton} onPress={reload}>
                  <Text style={styles.errorButtonText}>Reload</Text>
                </Pressable>
                <Pressable
                  style={[styles.errorButton, styles.errorButtonPrimary]}
                  onPress={onOpenSetup}
                >
                  <Text
                    style={[
                      styles.errorButtonText,
                      styles.errorButtonTextPrimary,
                    ]}
                  >
                    Open Setup
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {showToolbar && (
          <Pressable style={styles.toolbarOverlay} onPress={dismissToolbar}>
            <Animated.View
              style={[styles.toolbar, { opacity: toolbarOpacity }]}
            >
              {TOOLBAR_BUTTONS.map((btn, i) => (
                <Pressable
                  key={btn}
                  style={[
                    styles.toolbarBtn,
                    btn === "setup" && styles.toolbarBtnPrimary,
                    btn === "close" && styles.toolbarBtnClose,
                    focusedBtn === i && styles.toolbarBtnFocused,
                  ]}
                  onPress={(event) => {
                    event.stopPropagation?.();
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
  webView: {
    flex: 1,
    backgroundColor: "#000",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 48,
  },
  loadingTitle: {
    color: "#f3f4f6",
    fontSize: 24,
    fontWeight: "700",
  },
  loadingSubtitle: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 14,
    marginTop: 10,
    textAlign: "center",
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.88)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 48,
  },
  errorCard: {
    width: "100%",
    maxWidth: 760,
    borderRadius: 20,
    padding: 28,
    backgroundColor: "rgba(17,24,39,0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  errorTitle: {
    color: "#f9fafb",
    fontSize: 28,
    fontWeight: "700",
  },
  errorMessage: {
    color: "#d1d5db",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
  },
  errorHint: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    marginTop: 12,
  },
  errorActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  errorButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  errorButtonPrimary: {
    backgroundColor: "#B79527",
    borderColor: "#B79527",
  },
  errorButtonText: {
    color: "#e5e7eb",
    fontSize: 16,
    fontWeight: "700",
  },
  errorButtonTextPrimary: {
    color: "#022b21",
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
    color: "#bfdbfe",
  },
  toolbarBtnTextFocused: {
    color: "#fff",
  },
  toolbarHint: {
    position: "absolute",
    bottom: 48,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  toolbarHintText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
  },
  identifyOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  identifyText: {
    fontSize: 46,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 1,
  },
  identifySubtext: {
    fontSize: 18,
    marginTop: 10,
    color: "rgba(255,255,255,0.8)",
  },
});

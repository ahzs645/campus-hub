import React, {
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
} from 'react';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  Animated,
} from 'react-native';
import { DisplayRenderer } from '@/display/DisplayRenderer';
import { DisplayConfig, DEFAULT_CONFIG } from '@/display/types';
import { useTVRemote } from '@/hooks/useTVRemote';

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
    const [config, setConfig] = useState<DisplayConfig>(DEFAULT_CONFIG);
    const [configUrl, setConfigUrl] = useState<string | undefined>();
    const [reloadKey, setReloadKey] = useState(0);
    const [showToolbar, setShowToolbar] = useState(false);
    const [focusedBtn, setFocusedBtn] = useState(0);
    const toolbarOpacity = useRef(new Animated.Value(0)).current;
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const BUTTONS = ['reload', 'setup', 'close'] as const;

    useImperativeHandle(ref, () => ({
      reload: () => setReloadKey((k) => k + 1),
    }));

    // Parse URL to extract config
    useEffect(() => {
      try {
        const parsed = new URL(url);
        const configJson = parsed.searchParams.get('configJson');
        const configUrlParam = parsed.searchParams.get('configUrl');

        if (configJson) {
          const decoded = JSON.parse(decodeURIComponent(configJson));
          setConfig(decoded);
          setConfigUrl(undefined);
        } else if (configUrlParam) {
          setConfigUrl(configUrlParam);
        } else {
          // Try fetching the URL itself as a config
          setConfig(DEFAULT_CONFIG);
        }
      } catch {
        setConfig(DEFAULT_CONFIG);
      }
    }, [url]);

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
          case 'reload':
            setReloadKey((k) => k + 1);
            dismissToolbar();
            break;
          case 'setup':
            dismissToolbar();
            onOpenSetup?.();
            break;
          case 'close':
            dismissToolbar();
            break;
        }
      },
      [dismissToolbar, onOpenSetup],
    );

    useTVRemote(
      useCallback(
        (action) => {
          if (showToolbar) {
            switch (action) {
              case 'left':
                setFocusedBtn((i) => Math.max(0, i - 1));
                break;
              case 'right':
                setFocusedBtn((i) => Math.min(BUTTONS.length - 1, i + 1));
                break;
              case 'select':
                executeButton(BUTTONS[focusedBtn]);
                break;
              case 'menu':
                dismissToolbar();
                break;
            }
          } else {
            if (action === 'menu' || action === 'select') {
              openToolbar();
            }
          }
        },
        [showToolbar, focusedBtn, executeButton, dismissToolbar, openToolbar],
      ),
    );

    return (
      <View style={styles.container}>
        <DisplayRenderer
          key={reloadKey}
          config={config}
          configUrl={configUrl}
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
                    btn === 'setup' && styles.toolbarBtnPrimary,
                    btn === 'close' && styles.toolbarBtnClose,
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
                    {btn === 'reload' ? '↻' : btn === 'setup' ? '⚙' : '✕'}
                  </Text>
                  {btn !== 'close' && (
                    <Text
                      style={[
                        styles.toolbarBtnLabel,
                        btn === 'setup' && styles.toolbarBtnLabelPrimary,
                        focusedBtn === i && styles.toolbarBtnTextFocused,
                      ]}
                    >
                      {btn === 'reload' ? 'Reload' : 'Setup / QR Code'}
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
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  toolbarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  toolbar: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  toolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  toolbarBtnPrimary: {
    backgroundColor: 'rgba(59,130,246,0.3)',
  },
  toolbarBtnClose: {
    paddingHorizontal: 16,
  },
  toolbarBtnFocused: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59,130,246,0.25)',
  },
  toolbarBtnIcon: {
    fontSize: 20,
    color: '#e5e7eb',
  },
  toolbarBtnLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  toolbarBtnLabelPrimary: {
    color: '#93c5fd',
  },
  toolbarBtnTextFocused: {
    color: '#fff',
  },
  toolbarHint: {
    marginTop: 16,
  },
  toolbarHintText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 13,
  },
  identifyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(59,130,246,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  identifyText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '800',
  },
  identifySubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 24,
    marginTop: 8,
  },
});

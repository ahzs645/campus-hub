import React, { useEffect, useState, useCallback, useRef } from "react";
import { StatusBar } from "react-native";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { TVWebView } from "@/components/TVWebView";
import { SetupScreen } from "@/screens/SetupScreen";
import { startTVServer, TVConfig, TVAction } from "@/server/tv-server";
import { useTVRemote } from "@/hooks/useTVRemote";
import { CONFIG } from "@/utils/config";

const DEVICE_NAME = "Campus Hub TV";
const SERVER_PORT = 8888;
const DEFAULT_DISPLAY_URL = `${CONFIG.CAMPUS_HUB_URL}${CONFIG.DEFAULT_PATH}`;

function getServerUrl(state: NetInfoState): string {
  const ipAddress =
    state.details && "ipAddress" in state.details
      ? state.details.ipAddress
      : null;

  if (ipAddress) {
    return `http://${ipAddress}:${SERVER_PORT}`;
  }

  return `http://localhost:${SERVER_PORT}`;
}

export default function App() {
  const [mode, setMode] = useState<"display" | "setup">("display");
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [displayUrl, setDisplayUrl] = useState(DEFAULT_DISPLAY_URL);
  const webViewRef = useRef<{ reload: () => void } | null>(null);
  const [showIdentify, setShowIdentify] = useState(false);
  const serverRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    StatusBar.setHidden(true);

    const currentConfig: TVConfig = { url: DEFAULT_DISPLAY_URL };

    const handleConfigChange = (config: TVConfig) => {
      if (config.configJson) {
        const encoded = encodeURIComponent(config.configJson);
        setDisplayUrl(
          `${CONFIG.CAMPUS_HUB_URL}/display/?configJson=${encoded}`
        );
      } else if (config.url) {
        setDisplayUrl(config.url);
      }
      setMode("display");
    };

    const handleAction = (action: TVAction) => {
      switch (action) {
        case "reload":
          webViewRef.current?.reload();
          break;
        case "reset":
          setDisplayUrl(DEFAULT_DISPLAY_URL);
          setMode("display");
          break;
        case "identify":
          setShowIdentify(true);
          setTimeout(() => setShowIdentify(false), 3000);
          break;
      }
    };

    const server = startTVServer(
      currentConfig,
      DEVICE_NAME,
      handleConfigChange,
      handleAction
    );
    serverRef.current = server;

    const syncServerUrl = (state: NetInfoState) => {
      setServerUrl(getServerUrl(state));
    };

    const unsubscribeNetInfo = NetInfo.addEventListener(syncServerUrl);
    NetInfo.fetch().then(syncServerUrl);

    return () => {
      unsubscribeNetInfo();
      serverRef.current?.stop();
    };
  }, []);

  useTVRemote(
    useCallback(
      (action) => {
        if (action === "longSelect" || action === "playPause") {
          setMode((m) => (m === "display" ? "setup" : "display"));
        }
        if (action === "menu" && mode === "setup") {
          setMode("display");
        }
      },
      [mode]
    )
  );

  if (mode === "setup") {
    return (
      <SetupScreen serverUrl={serverUrl} deviceName={DEVICE_NAME} />
    );
  }

  return (
    <TVWebView
      ref={webViewRef}
      url={displayUrl}
      showIdentify={showIdentify}
      onOpenSetup={() => setMode("setup")}
    />
  );
}

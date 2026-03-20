import React, { useEffect, useState, useCallback, useRef } from "react";
import { StatusBar } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { TVWebView } from "@/components/TVWebView";
import { SetupScreen } from "@/screens/SetupScreen";
import { startTVServer, TVConfig, TVAction } from "@/server/tv-server";
import { useTVRemote } from "@/hooks/useTVRemote";
import { CONFIG } from "@/utils/config";

const DEVICE_NAME = "Campus Hub TV";
const SERVER_PORT = 8888;

export default function App() {
  const [mode, setMode] = useState<"display" | "setup">("display");
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [displayUrl, setDisplayUrl] = useState(
    `${CONFIG.CAMPUS_HUB_URL}${CONFIG.DEFAULT_PATH}`
  );
  const webViewRef = useRef<{ reload: () => void } | null>(null);
  const [showIdentify, setShowIdentify] = useState(false);
  const serverRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    StatusBar.setHidden(true);

    const currentConfig: TVConfig = { url: displayUrl };

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
          setDisplayUrl(`${CONFIG.CAMPUS_HUB_URL}${CONFIG.DEFAULT_PATH}`);
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

    NetInfo.fetch().then((state) => {
      const ip =
        state.type === "wifi"
          ? (state as any).details?.ipAddress
          : null;
      if (ip) {
        setServerUrl(`http://${ip}:${SERVER_PORT}`);
      } else {
        setServerUrl(`http://localhost:${SERVER_PORT}`);
      }
    });

    return () => {
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

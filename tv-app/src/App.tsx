import React, { useEffect } from "react";
import { Platform, StatusBar } from "react-native";
import { TVWebView } from "@/components/TVWebView";

export default function App() {
  useEffect(() => {
    // Hide status bar for full-screen signage display
    StatusBar.setHidden(true);
  }, []);

  return <TVWebView />;
}

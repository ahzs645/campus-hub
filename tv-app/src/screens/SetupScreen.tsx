import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { CONFIG } from "@/utils/config";

type Props = {
  serverUrl: string | null;
  deviceName: string;
};

export function SetupScreen({ serverUrl, deviceName }: Props) {
  // QR code points to the live website with the TV's local address as a param
  // e.g. https://campus.ahmadjalil.com/tv-setup?tv=http://192.168.1.50:8888
  const qrValue = serverUrl
    ? `${CONFIG.CAMPUS_HUB_URL}/tv-setup?tv=${encodeURIComponent(serverUrl)}`
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Campus Hub TV</Text>
        <Text style={styles.subtitle}>Setup Mode</Text>

        {qrValue && serverUrl ? (
          <>
            <View style={styles.qrContainer}>
              <QRCode
                value={qrValue}
                size={200}
                backgroundColor="#ffffff"
                color="#000000"
              />
            </View>

            <Text style={styles.instruction}>
              Scan this QR code with your phone to configure this display
            </Text>

            <View style={styles.urlBox}>
              <Text style={styles.urlLabel}>Opens:</Text>
              <Text style={styles.urlWebsite}>
                {CONFIG.CAMPUS_HUB_URL}/tv-setup
              </Text>
              <Text style={styles.urlDivider}>connected to</Text>
              <Text style={styles.url}>{serverUrl}</Text>
            </View>

            <Text style={styles.hint}>
              Make sure your phone is on the same Wi-Fi network as this TV
            </Text>
          </>
        ) : (
          <>
            <ActivityIndicator
              size="large"
              color="#3b82f6"
              style={styles.spinner}
            />
            <Text style={styles.instruction}>
              Starting configuration server...
            </Text>
            <Text style={styles.hint}>Connecting to network</Text>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {deviceName} • Press Back to return to display
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    padding: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: "700",
    color: "#f9fafb",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 18,
    color: "#6b7280",
    marginBottom: 40,
    fontWeight: "400",
  },
  qrContainer: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 16,
    marginBottom: 32,
    elevation: 8,
  },
  instruction: {
    fontSize: 18,
    color: "#d1d5db",
    textAlign: "center",
    marginBottom: 20,
    maxWidth: 400,
    lineHeight: 26,
  },
  urlBox: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 20,
    alignItems: "center",
  },
  urlLabel: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  urlWebsite: {
    fontSize: 14,
    color: "#9ca3af",
    fontFamily: "monospace",
    marginBottom: 6,
  },
  urlDivider: {
    fontSize: 11,
    color: "#4b5563",
    marginBottom: 6,
  },
  url: {
    fontSize: 16,
    color: "#3b82f6",
    fontWeight: "600",
    fontFamily: "monospace",
  },
  hint: {
    fontSize: 14,
    color: "#4b5563",
    textAlign: "center",
    maxWidth: 350,
  },
  spinner: {
    marginBottom: 24,
  },
  footer: {
    position: "absolute",
    bottom: 32,
  },
  footerText: {
    fontSize: 13,
    color: "#374151",
  },
});

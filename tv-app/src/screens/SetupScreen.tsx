import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { CONFIG } from "@/utils/config";

type Props = {
  serverUrl: string | null;
  deviceName: string;
};

export function SetupScreen({ serverUrl, deviceName }: Props) {
  const qrValue = serverUrl
    ? `${CONFIG.CAMPUS_HUB_URL}/tv-setup?tv=${encodeURIComponent(serverUrl)}`
    : null;

  return (
    <View style={styles.container}>
      {qrValue && serverUrl ? (
        <View style={styles.splitLayout}>
          {/* Left side — instructions */}
          <View style={styles.leftPanel}>
            <View style={styles.deviceBadge}>
              <Text style={styles.deviceBadgeIcon}>📺</Text>
              <Text style={styles.deviceBadgeText}>{deviceName}</Text>
            </View>

            <Text style={styles.title}>Quickly set up with{"\n"}your phone</Text>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>
                Make sure your phone is connected{"\n"}to the same Wi-Fi network as this TV
              </Text>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View>
                <Text style={styles.stepText}>
                  Open your phone's camera and scan{"\n"}the QR code on the right
                </Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>
                Choose a dashboard layout and apply{"\n"}it to this display
              </Text>
            </View>

            <View style={styles.helpRow}>
              <Text style={styles.helpText}>
                Or visit{" "}
                <Text style={styles.helpUrl}>
                  {CONFIG.CAMPUS_HUB_URL.replace("https://", "")}/tv-setup
                </Text>
              </Text>
            </View>
          </View>

          {/* Right side — QR code */}
          <View style={styles.rightPanel}>
            <View style={styles.qrCard}>
              {/* Corner accents */}
              <View style={[styles.cornerAccent, styles.cornerTL]} />
              <View style={[styles.cornerAccent, styles.cornerTR]} />
              <View style={[styles.cornerAccent, styles.cornerBL]} />
              <View style={[styles.cornerAccent, styles.cornerBR]} />

              <View style={styles.qrInner}>
                <QRCode
                  value={qrValue}
                  size={260}
                  backgroundColor="#ffffff"
                  color="#000000"
                />
              </View>
            </View>
            <Text style={styles.qrCaption}>Scan this QR code</Text>
          </View>
        </View>
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B79527" style={styles.spinner} />
          <Text style={styles.loadingTitle}>Starting configuration server...</Text>
          <Text style={styles.loadingHint}>Connecting to network</Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerChevron}>⌄</Text>
        <Text style={styles.footerText}>
          Press Back to return to display
        </Text>
      </View>
    </View>
  );
}

const GOLD = "#B79527";
const GREEN = "#035642";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    justifyContent: "center",
    alignItems: "center",
  },

  // -- Split layout (instructions left, QR right) --
  splitLayout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 80,
    gap: 100,
    flex: 1,
  },
  leftPanel: {
    flex: 1,
    maxWidth: 520,
    justifyContent: "center",
  },
  rightPanel: {
    alignItems: "center",
    justifyContent: "center",
  },

  // -- Device badge --
  deviceBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  deviceBadgeIcon: {
    fontSize: 18,
  },
  deviceBadgeText: {
    fontSize: 16,
    color: "#9ca3af",
    fontWeight: "500",
  },

  // -- Title --
  title: {
    fontSize: 42,
    fontWeight: "700",
    color: "#f9fafb",
    marginBottom: 48,
    lineHeight: 52,
  },

  // -- Steps --
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 28,
    gap: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: GREEN,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 15,
    fontWeight: "700",
    color: GOLD,
  },
  stepText: {
    fontSize: 18,
    color: "#d1d5db",
    lineHeight: 26,
  },

  // -- Help row --
  helpRow: {
    marginTop: 16,
  },
  helpText: {
    fontSize: 15,
    color: "#6b7280",
  },
  helpUrl: {
    color: GOLD,
    fontWeight: "600",
  },

  // -- QR card with corner accents --
  qrCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    position: "relative",
  },
  qrInner: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
  },
  cornerAccent: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: GOLD,
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 24,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 24,
    borderColor: GREEN,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 24,
    borderColor: GREEN,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 24,
  },
  qrCaption: {
    marginTop: 20,
    fontSize: 16,
    color: "#9ca3af",
    textAlign: "center",
  },

  // -- Loading state --
  loadingContainer: {
    alignItems: "center",
  },
  spinner: {
    marginBottom: 24,
  },
  loadingTitle: {
    fontSize: 22,
    color: "#f9fafb",
    fontWeight: "600",
    marginBottom: 8,
  },
  loadingHint: {
    fontSize: 16,
    color: "#6b7280",
  },

  // -- Footer --
  footer: {
    position: "absolute",
    bottom: 40,
    alignItems: "center",
  },
  footerChevron: {
    fontSize: 24,
    color: "#4b5563",
    marginBottom: 4,
  },
  footerText: {
    fontSize: 14,
    color: "#4b5563",
  },
});

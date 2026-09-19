import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppTextField } from "@/components/ui/AppTextField";
import { Card } from "@/components/ui/Card";
import { radius, spacing, typography } from "@/constants/theme";
import { useServerSettings } from "@/contexts/ServerSettingsContext";
import { useAppTheme } from "@/hooks/useAppTheme";
import { apiJson } from "@/lib/api";
import { barcodeScanResponseSchema } from "@/lib/schemas";

type ScanParams = {
  target?: string;
  listId?: string;
};

export default function ScanScreen() {
  const { colors } = useAppTheme();
  const { serverUrl } = useServerSettings();
  const params = useLocalSearchParams<ScanParams>();
  const target = params.target === "shopping_list" ? "shopping_list" : "inventory";
  const listId = params.listId ? Number(params.listId) : undefined;

  const [permission, requestPermission] = useCameraPermissions();
  const [manualName, setManualName] = useState("");
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const handled = useRef<string | null>(null);

  const submitBarcode = async (barcode: string, nameOverride?: string) => {
    setBusy(true);
    try {
      const body: Record<string, unknown> = {
        barcode,
        target,
        manual_name: nameOverride ?? null,
        register_product: Boolean(nameOverride),
        quantity: 1,
        quantity_kind: "count",
        unit: "each",
      };
      if (target === "shopping_list" && listId != null) {
        body.shopping_list_id = listId;
      }

      const raw = await apiJson<unknown>("/scan/barcode", {
        baseUrl: serverUrl,
        method: "POST",
        body: JSON.stringify(body),
      });
      const parsed = barcodeScanResponseSchema.parse(raw);

      if (parsed.unknown && !nameOverride) {
        setLastBarcode(barcode);
        Alert.alert("Unknown barcode", "Enter a name below to add and optionally save to catalog.");
        return;
      }

      Alert.alert("Added", `Barcode ${parsed.barcode}`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert("Scan failed", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  };

  if (!permission) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Requesting camera permission…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          Camera access is required to scan barcodes.
        </Text>
        <AppButton label="Allow camera" onPress={() => void requestPermission()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128"] }}
        onBarcodeScanned={
          busy
            ? undefined
            : ({ data }) => {
                if (handled.current === data) return;
                handled.current = data;
                void submitBarcode(data);
              }
        }
      />
      <View style={[styles.frameHint, { borderColor: colors.primary }]} pointerEvents="none" />
      {lastBarcode ? (
        <View style={styles.manualWrap}>
          <Card>
            <Text style={[styles.manualTitle, { color: colors.text }]}>Unknown barcode</Text>
            <Text style={[styles.manualCode, { color: colors.textMuted }]}>{lastBarcode}</Text>
            <AppTextField
              placeholder="Product name"
              value={manualName}
              onChangeText={setManualName}
            />
            <AppButton
              label="Add & save to catalog"
              onPress={() => {
                if (!manualName.trim()) return;
                void submitBarcode(lastBarcode, manualName.trim());
              }}
            />
          </Card>
        </View>
      ) : (
        <View style={styles.hintBar}>
          <Text style={[styles.hintText, { color: colors.text }]}>
            {busy ? "Adding…" : "Point at a barcode inside the frame"}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg, gap: spacing.md },
  message: { textAlign: "center", ...typography.body },
  frameHint: {
    position: "absolute",
    top: "28%",
    alignSelf: "center",
    width: "72%",
    height: 120,
    borderWidth: 2,
    borderRadius: radius.lg,
    borderStyle: "dashed",
  },
  hintBar: {
    position: "absolute",
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: "rgba(255,255,255,0.92)",
    padding: spacing.md,
    borderRadius: radius.md,
  },
  hintText: { textAlign: "center", ...typography.label },
  manualWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: "rgba(247, 245, 240, 0.96)",
  },
  manualTitle: typography.headline,
  manualCode: { ...typography.caption, fontFamily: "monospace" },
});

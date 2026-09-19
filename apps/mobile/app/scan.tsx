import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useServerSettings } from "@/contexts/ServerSettingsContext";
import { apiJson } from "@/lib/api";
import { barcodeScanResponseSchema } from "@/lib/schemas";

type ScanParams = {
  target?: string;
  listId?: string;
};

export default function ScanScreen() {
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
      <View style={styles.center}>
        <Text>Requesting camera permission…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>Camera access is required to scan barcodes.</Text>
        <Pressable style={styles.btn} onPress={() => void requestPermission()}>
          <Text style={styles.btnText}>Allow camera</Text>
        </Pressable>
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
      {lastBarcode ? (
        <View style={styles.manualBox}>
          <Text>Unknown: {lastBarcode}</Text>
          <TextInput
            style={styles.input}
            placeholder="Product name"
            value={manualName}
            onChangeText={setManualName}
          />
          <Pressable
            style={styles.btn}
            onPress={() => {
              if (!manualName.trim()) return;
              void submitBarcode(lastBarcode, manualName.trim());
            }}
          >
            <Text style={styles.btnText}>Add & save to catalog</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16, gap: 12 },
  message: { textAlign: "center" },
  manualBox: { padding: 12, gap: 8, backgroundColor: "#fff" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  btn: { backgroundColor: "#2563eb", padding: 12, borderRadius: 8, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "600" },
});

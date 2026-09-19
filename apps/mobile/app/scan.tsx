import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppTextField } from "@/components/ui/AppTextField";
import { Card } from "@/components/ui/Card";
import { radius, spacing, typography } from "@/constants/theme";
import { useServerSettings } from "@/contexts/ServerSettingsContext";
import { useAppTheme } from "@/hooks/useAppTheme";
import { apiJson } from "@/lib/api";
import { barcodeScanResponseSchema, savedRecipeReadSchema } from "@/lib/schemas";

type ScanParams = {
  target?: string;
  listId?: string;
  location?: string;
  continuous?: string;
  savedRecipeId?: string;
};

export default function ScanScreen() {
  const { colors } = useAppTheme();
  const { serverUrl } = useServerSettings();
  const params = useLocalSearchParams<ScanParams>();
  const target = params.target === "shopping_list" ? "shopping_list" : "inventory";
  const listId = params.listId ? Number(params.listId) : undefined;
  const storageLocation = params.location?.trim() || undefined;
  const continuous = params.continuous === "1";
  const savedRecipeId = params.savedRecipeId ? Number(params.savedRecipeId) : undefined;

  const [permission, requestPermission] = useCameraPermissions();
  const [manualName, setManualName] = useState("");
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<string[]>([]);
  const handled = useRef<string | null>(null);
  const cooldown = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (savedRecipeId == null) {
      return;
    }
    void (async () => {
      try {
        const raw = await apiJson<unknown>(`/recipes/saved/${savedRecipeId}`, {
          baseUrl: serverUrl,
        });
        const saved = savedRecipeReadSchema.parse(raw);
        setChecklist(saved.recipe.ingredients.map((line) => line.name));
      } catch {
        setChecklist([]);
      }
    })();
  }, [savedRecipeId, serverUrl]);

  const releaseScanner = () => {
    if (cooldown.current) {
      clearTimeout(cooldown.current);
    }
    cooldown.current = setTimeout(() => {
      handled.current = null;
      cooldown.current = null;
    }, 1500);
  };

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
      if (target === "inventory" && storageLocation) {
        body.location = storageLocation;
      }

      const raw = await apiJson<unknown>("/scan/barcode", {
        baseUrl: serverUrl,
        method: "POST",
        body: JSON.stringify(body),
      });
      const parsed = barcodeScanResponseSchema.parse(raw);

      if (parsed.unknown && !nameOverride) {
        setLastBarcode(barcode);
        Alert.alert(
          "Unknown barcode",
          "Not in your UPC catalog yet. Enter a name to add and save it for next time.",
        );
        return;
      }

      const label = parsed.product?.name ?? parsed.barcode;
      setLastAdded(label);
      setLastBarcode(null);
      setManualName("");

      if (continuous) {
        releaseScanner();
        return;
      }

      Alert.alert("Added", label, [{ text: "OK", onPress: () => router.back() }]);
    } catch (e) {
      Alert.alert("Scan failed", e instanceof Error ? e.message : "Unknown error");
      releaseScanner();
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

  const hint =
    busy && lastAdded
      ? `Added ${lastAdded}`
      : busy
        ? "Adding…"
        : storageLocation
          ? `Scan into ${storageLocation} · stays open for multiple scans`
          : "Point at a barcode inside the frame";

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

      {checklist.length > 0 ? (
        <View style={styles.checklistWrap}>
          <Card padded style={styles.checklistCard}>
            <Text style={[styles.checklistTitle, { color: colors.text }]}>Recipe items</Text>
            <ScrollView style={styles.checklistScroll} nestedScrollEnabled>
              {checklist.map((name) => (
                <Text key={name} style={[styles.checklistLine, { color: colors.textSecondary }]}>
                  · {name}
                </Text>
              ))}
            </ScrollView>
          </Card>
        </View>
      ) : null}

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
              label="Add & save to UPC catalog"
              onPress={() => {
                if (!manualName.trim()) return;
                void submitBarcode(lastBarcode, manualName.trim());
              }}
            />
          </Card>
        </View>
      ) : (
        <View style={styles.hintBar}>
          <Text style={[styles.hintText, { color: colors.text }]}>{hint}</Text>
          {continuous ? (
            <AppButton label="Done scanning" variant="secondary" compact onPress={() => router.back()} />
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  message: { textAlign: "center", ...typography.body },
  frameHint: {
    position: "absolute",
    top: "22%",
    alignSelf: "center",
    width: "72%",
    height: 120,
    borderWidth: 2,
    borderRadius: radius.lg,
    borderStyle: "dashed",
  },
  checklistWrap: {
    position: "absolute",
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    maxHeight: 140,
  },
  checklistCard: { gap: spacing.xs },
  checklistTitle: { ...typography.caption, fontWeight: "700" },
  checklistScroll: { maxHeight: 100 },
  checklistLine: { ...typography.caption, lineHeight: 18 },
  hintBar: {
    position: "absolute",
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: "rgba(255,255,255,0.92)",
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
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

import { CameraView, useCameraPermissions } from "expo-camera";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ExpirationDateField } from "@/components/ExpirationDateField";
import { AppButton } from "@/components/ui/AppButton";
import { AppTextField } from "@/components/ui/AppTextField";
import { Card } from "@/components/ui/Card";
import { radius, spacing, typography } from "@/constants/theme";
import { useServerSettings } from "@/contexts/ServerSettingsContext";
import { useAppTheme } from "@/hooks/useAppTheme";
import { apiJson } from "@/lib/api";
import { formatProductPackage } from "@/lib/formatProductPackage";
import { parseServerUrlFromQr, phoneUnreachableHomeServerReason } from "@/lib/parseServerUrlFromQr";
import {
  barcodeScanResponseSchema,
  productReadSchema,
  savedRecipeReadSchema,
} from "@/lib/schemas";

type ScanParams = {
  target?: string;
  listId?: string;
  location?: string;
  continuous?: string;
  savedRecipeId?: string;
};

type PendingScan = {
  barcode: string;
  productName: string | null;
  packageLabel: string | null;
  resolving: boolean;
};

function ServerUrlQrScan() {
  const { colors } = useAppTheme();
  const { setServerUrl } = useServerSettings();
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.message, { color: colors.text }]}>
          Camera access is needed to scan the home server QR.
        </Text>
        <AppButton label="Allow camera" onPress={() => void requestPermission()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Scan server QR" }} />
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={({ data }) => {
          if (handled.current) {
            return;
          }
          const url = parseServerUrlFromQr(data);
          if (!url) {
            return;
          }
          const blocked = phoneUnreachableHomeServerReason(url);
          if (blocked) {
            handled.current = true;
            Alert.alert("Not a phone-reachable API", blocked, [
              { text: "Scan again", onPress: () => { handled.current = false; } },
              { text: "Cancel", onPress: () => router.back() },
            ]);
            return;
          }
          handled.current = true;
          void setServerUrl(url).then(() => {
            Alert.alert("Home server saved", url, [{ text: "OK", onPress: () => router.back() }]);
          });
        }}
      />
      <View style={[styles.frameHint, { borderColor: colors.primary }]} pointerEvents="none" />
      <View style={[styles.hintBar, { backgroundColor: colors.surface + "EB" }]}>
        <Text style={[styles.hintText, { color: colors.text }]}>
          Scan the QR from the Windows home-stack page (or another phone’s Settings).
        </Text>
        <AppButton label="Cancel" variant="ghost" compact onPress={() => router.back()} />
      </View>
    </View>
  );
}

export default function ScanScreen() {
  const params = useLocalSearchParams<ScanParams>();
  if (params.target === "server_url") {
    return <ServerUrlQrScan />;
  }
  return <BarcodeScanScreen />;
}

function BarcodeScanScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
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
  const [pending, setPending] = useState<PendingScan | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const handled = useRef<string | null>(null);
  const cooldown = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scannerPaused = Boolean(pending) || Boolean(lastBarcode) || busy;

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

  const finishAdded = (label: string, qty: number) => {
    const where =
      target === "inventory" && storageLocation
        ? ` in ${storageLocation}`
        : target === "shopping_list"
          ? " to your shopping list"
          : " to your pantry";

    if (continuous) {
      setLastAdded(`${qty} × ${label}`);
      releaseScanner();
      return;
    }

    const backLabel = target === "shopping_list" ? "Back to shopping" : "Back to pantry";
    Alert.alert(
      "Added",
      `${qty} × ${label}${where}.`,
      [{ text: backLabel, onPress: () => router.back() }],
      { cancelable: false },
    );
  };

  const submitBarcode = async (
    barcode: string,
    options?: { nameOverride?: string; quantity?: number; expiresAt?: string | null },
  ) => {
    const qty = options?.quantity ?? 1;
    setBusy(true);
    try {
      const manual = Boolean(options?.nameOverride);
      const body: Record<string, unknown> = {
        barcode,
        target,
        manual_name: options?.nameOverride ?? null,
        register_product: manual,
        quantity: qty,
        use_product_defaults: !manual,
      };
      if (manual) {
        body.quantity_kind = "count";
        body.unit = "each";
      }
      if (target === "shopping_list" && listId != null) {
        body.shopping_list_id = listId;
      }
      if (target === "inventory" && storageLocation) {
        body.location = storageLocation;
      }
      if (target === "inventory" && options?.expiresAt) {
        body.expires_at = options.expiresAt;
      }

      const raw = await apiJson<unknown>("/scan/barcode", {
        baseUrl: serverUrl,
        method: "POST",
        body: JSON.stringify(body),
      });
      const parsed = barcodeScanResponseSchema.parse(raw);

      if (parsed.unknown && !options?.nameOverride) {
        setLastBarcode(barcode);
        setPending(null);
        Alert.alert(
          "Unknown barcode",
          "Not in your catalog yet. Enter a name to add and save it for next time.",
        );
        return;
      }

      const label = parsed.product?.name ?? options?.nameOverride ?? parsed.barcode;
      setLastAdded(label);
      setLastBarcode(null);
      setManualName("");
      setPending(null);
      setQuantity("1");
      setExpiresAt(null);
      handled.current = barcode;

      finishAdded(label, qty);
    } catch (e) {
      Alert.alert("Scan failed", e instanceof Error ? e.message : "Unknown error");
      releaseScanner();
    } finally {
      setBusy(false);
    }
  };

  const beginConfirmScan = (barcode: string) => {
    setQuantity("1");
    setExpiresAt(null);
    setPending({ barcode, productName: null, packageLabel: null, resolving: true });
    void (async () => {
      try {
        const raw = await apiJson<unknown>(`/products/${barcode}`, { baseUrl: serverUrl });
        const product = raw == null ? null : productReadSchema.parse(raw);
        if (!product?.name) {
          setPending(null);
          setLastBarcode(barcode);
          return;
        }
        setPending({
          barcode,
          productName: product.name,
          packageLabel: formatProductPackage(product),
          resolving: false,
        });
      } catch {
        setPending(null);
        setLastBarcode(barcode);
      }
    })();
  };

  const onBarcodeDetected = (data: string) => {
    if (scannerPaused || handled.current === data) {
      return;
    }
    handled.current = data;

    if (continuous) {
      void submitBarcode(data, { quantity: 1 });
      return;
    }

    beginConfirmScan(data);
  };

  const confirmPending = () => {
    if (!pending) {
      return;
    }
    const parsedQty = Number(quantity);
    if (Number.isNaN(parsedQty) || parsedQty <= 0) {
      Alert.alert("Quantity", "Enter a number greater than zero.");
      return;
    }
    void submitBarcode(pending.barcode, {
      quantity: parsedQty,
      expiresAt: target === "inventory" ? expiresAt : null,
    });
  };

  const cancelPending = () => {
    setPending(null);
    setQuantity("1");
    setExpiresAt(null);
    handled.current = null;
  };

  if (!permission) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          Requesting camera permission…
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          Camera access is needed to scan barcodes.
        </Text>
        <AppButton label="Allow camera" onPress={() => void requestPermission()} />
      </View>
    );
  }

  const hint = continuous
    ? busy && lastAdded
      ? `Added ${lastAdded} — scan next item`
      : storageLocation
        ? `Scanning into ${storageLocation} — tap Done when finished`
        : "Scan each item — tap Done when finished"
    : storageLocation
      ? `Scan a barcode to add to ${storageLocation}`
      : "Point your camera at a barcode";

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128"] }}
        onBarcodeScanned={scannerPaused ? undefined : ({ data }) => onBarcodeDetected(data)}
      />

      {/* Scan frame guide */}
      <View style={[styles.frameHint, { borderColor: colors.primary }]} pointerEvents="none" />

      {/* Recipe checklist overlay */}
      {checklist.length > 0 && !pending && !lastBarcode ? (
        <View style={[styles.checklistWrap, { top: insets.top + spacing.sm }]}>
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

      {/* Confirm known product */}
      {pending ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[styles.sheetWrapTop, { paddingTop: insets.top + spacing.sm, backgroundColor: colors.background + "F7" }]}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
        >
          <Card>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              {pending.resolving ? "Looking up product…" : pending.productName ?? "Product"}
            </Text>
            {!pending.resolving && pending.productName ? (
              <>
                <Text style={[styles.sheetMeta, { color: colors.textMuted }]}>
                  {storageLocation ? `Add to ${storageLocation}` : "Add to pantry"}
                  {pending.packageLabel ? ` · ${pending.packageLabel} per package` : ""}
                </Text>
                <AppTextField
                  label={pending.packageLabel ? "How many packages?" : "Quantity"}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="decimal-pad"
                />
                {target === "inventory" ? (
                  <ExpirationDateField value={expiresAt} onChange={setExpiresAt} />
                ) : null}
                <View style={styles.sheetActions}>
                  <AppButton label="Cancel" variant="ghost" onPress={cancelPending} />
                  <AppButton
                    label={busy ? "Adding…" : "Add"}
                    loading={busy}
                    onPress={confirmPending}
                  />
                </View>
              </>
            ) : null}
          </Card>
        </KeyboardAvoidingView>
      ) : null}

      {/* Unknown barcode entry */}
      {lastBarcode && !pending ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[styles.sheetWrapTop, { paddingTop: insets.top + spacing.sm, backgroundColor: colors.background + "F7" }]}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
        >
          <Card>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Unknown barcode</Text>
            <Text style={[styles.barcodeText, { color: colors.textMuted }]}>{lastBarcode}</Text>
            <AppTextField
              placeholder="Product name"
              value={manualName}
              onChangeText={setManualName}
              autoFocus
            />
            <AppTextField
              label="Quantity"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="decimal-pad"
            />
            {target === "inventory" ? (
              <ExpirationDateField value={expiresAt} onChange={setExpiresAt} />
            ) : null}
            <AppButton
              label="Add & save to catalog"
              loading={busy}
              onPress={() => {
                if (!manualName.trim()) return;
                const parsedQty = Number(quantity);
                if (Number.isNaN(parsedQty) || parsedQty <= 0) {
                  Alert.alert("Quantity", "Enter a number greater than zero.");
                  return;
                }
                void submitBarcode(lastBarcode, {
                  nameOverride: manualName.trim(),
                  quantity: parsedQty,
                  expiresAt: target === "inventory" ? expiresAt : null,
                });
              }}
            />
            <AppButton label="Cancel" variant="ghost" onPress={() => {
              setLastBarcode(null);
              setExpiresAt(null);
              handled.current = null;
            }} />
          </Card>
        </KeyboardAvoidingView>
      ) : null}

      {/* Bottom hint bar */}
      {!pending && !lastBarcode ? (
        <View style={[styles.hintBar, { backgroundColor: colors.surface + "EB" }]}>
          <Text style={[styles.hintText, { color: colors.text }]}>{hint}</Text>
          {continuous ? (
            <AppButton label="Done scanning" variant="secondary" compact onPress={() => router.back()} />
          ) : (
            <AppButton label="Cancel" variant="ghost" compact onPress={() => router.back()} />
          )}
        </View>
      ) : null}
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
    padding: spacing.xl,
    gap: spacing.lg,
  },
  message: { textAlign: "center", ...typography.body },
  frameHint: {
    position: "absolute",
    top: "42%",
    alignSelf: "center",
    width: "70%",
    height: 110,
    borderWidth: 2,
    borderRadius: radius.lg,
    borderStyle: "dashed",
  },
  checklistWrap: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    maxHeight: 140,
  },
  checklistCard: { gap: spacing.xs },
  checklistTitle: { ...typography.captionMedium, fontWeight: "700" },
  checklistScroll: { maxHeight: 100 },
  checklistLine: { ...typography.caption, lineHeight: 18 },
  sheetWrapTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    zIndex: 10,
    elevation: 10,
  },
  sheetActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  hintBar: {
    position: "absolute",
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  hintText: { textAlign: "center", ...typography.bodyMedium },
  sheetTitle: typography.headline,
  sheetMeta: typography.caption,
  barcodeText: { ...typography.caption, fontFamily: "monospace" },
});

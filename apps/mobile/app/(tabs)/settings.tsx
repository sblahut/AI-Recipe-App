import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppTextField } from "@/components/ui/AppTextField";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Screen } from "@/components/ui/Screen";
import { spacing, typography } from "@/constants/theme";
import { useServerSettings } from "@/contexts/ServerSettingsContext";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { useAppTheme } from "@/hooks/useAppTheme";
import { openAddressInMaps } from "@/lib/openMaps";
import { STORE_CHAINS, type GroceryStore, type StoreChain } from "@/lib/userPreferences";

type StoreDraft = {
  id?: string;
  name: string;
  address: string;
  chain: StoreChain;
};

const emptyStore: StoreDraft = { name: "", address: "", chain: "Other" };

export default function SettingsScreen() {
  const { colors } = useAppTheme();
  const { serverUrl, setServerUrl, loading, testConnection } = useServerSettings();
  const { preferences, setUsername, addStore, updateStore, deleteStore } = useUserPreferences();
  const [draft, setDraft] = useState(serverUrl);
  const [usernameDraft, setUsernameDraft] = useState(preferences.username);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [usernameSaved, setUsernameSaved] = useState<string | null>(null);
  const [storeDraft, setStoreDraft] = useState<StoreDraft | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setDraft(serverUrl);
    });
  }, [serverUrl]);

  useEffect(() => {
    queueMicrotask(() => {
      setUsernameDraft(preferences.username);
    });
  }, [preferences.username]);

  if (loading) {
    return <Screen loading />;
  }

  const resultColor =
    result?.startsWith("✓") === true
      ? colors.success
      : result?.startsWith("✗") === true
        ? colors.danger
        : colors.textSecondary;

  const saveStore = async () => {
    if (!storeDraft) {
      return;
    }
    try {
      if (storeDraft.id) {
        await updateStore({
          id: storeDraft.id,
          name: storeDraft.name,
          address: storeDraft.address,
          chain: storeDraft.chain,
        });
      } else {
        await addStore({
          name: storeDraft.name,
          address: storeDraft.address,
          chain: storeDraft.chain,
        });
      }
      setStoreDraft(null);
    } catch (e) {
      Alert.alert("Store", e instanceof Error ? e.message : "Could not save store");
    }
  };

  const confirmDeleteStore = (store: GroceryStore) => {
    Alert.alert("Delete store", `Remove ${store.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void deleteStore(store.id);
          if (storeDraft?.id === store.id) {
            setStoreDraft(null);
          }
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <Text style={[styles.lead, { color: colors.textMuted }]}>
        {preferences.username
          ? `Signed in as ${preferences.username}. Connect your home server and favorite stores.`
          : "Add a display name, connect to your home PC API, and save grocery stores."}
      </Text>

      <Card>
        <Text style={[styles.section, { color: colors.text }]}>Profile</Text>
        <AppTextField
          label="Username"
          hint="Shown in the app. This stays on your phone."
          value={usernameDraft}
          onChangeText={setUsernameDraft}
          autoCapitalize="words"
          autoCorrect={false}
        />
        <AppButton
          label="Save username"
          onPress={() => {
            void (async () => {
              await setUsername(usernameDraft);
              setUsernameSaved("Saved.");
            })();
          }}
        />
        {usernameSaved ? (
          <Text style={[styles.result, { color: colors.success }]}>{usernameSaved}</Text>
        ) : null}
      </Card>

      <Card>
        <Text style={[styles.section, { color: colors.text }]}>Home server</Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Recipe API on port 8000 (not Metro on 8081). Same Wi‑Fi as this phone.
        </Text>
        <AppTextField
          label="Home server URL"
          hint="Example: http://192.168.1.45:8000"
          value={draft}
          onChangeText={setDraft}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        <AppButton
          label="Save"
          onPress={() => {
            void (async () => {
              await setServerUrl(draft);
              setResult("Saved.");
            })();
          }}
        />

        <AppButton
          label={testing ? "Testing…" : "Test connection"}
          variant="secondary"
          loading={testing}
          onPress={() => {
            void (async () => {
              setTesting(true);
              setResult(null);
              const out = await testConnection();
              setResult(out.ok ? `✓ ${out.message}` : `✗ ${out.message}`);
              setTesting(false);
            })();
          }}
        />

        {result ? (
          <Text style={[styles.result, { color: resultColor }]}>{result}</Text>
        ) : null}
      </Card>

      <Card>
        <Text style={[styles.section, { color: colors.text }]}>Favorite grocery stores</Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Save stores you shop at. Open an address in your phone’s default maps app.
        </Text>

        {preferences.stores.length === 0 && storeDraft == null ? (
          <Text style={[styles.empty, { color: colors.textMuted }]}>No stores saved yet.</Text>
        ) : null}

        {preferences.stores.map((store) => (
          <View key={store.id} style={[styles.storeRow, { borderColor: colors.border }]}>
            <View style={styles.flex}>
              <Text style={[styles.storeName, { color: colors.text }]}>{store.name}</Text>
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                {store.chain}
                {store.address ? ` · ${store.address}` : ""}
              </Text>
            </View>
            <View style={styles.storeActions}>
              <AppButton
                label="Maps"
                variant="accent"
                compact
                onPress={() => {
                  void openAddressInMaps(store.address || store.name).catch((e: unknown) => {
                    Alert.alert("Maps", e instanceof Error ? e.message : "Could not open maps");
                  });
                }}
              />
              <AppButton
                label="Edit"
                variant="secondary"
                compact
                onPress={() => setStoreDraft(store)}
              />
              <AppButton label="Delete" variant="ghost" compact onPress={() => confirmDeleteStore(store)} />
            </View>
          </View>
        ))}

        {storeDraft ? (
          <View style={styles.storeForm}>
            <AppTextField
              label={storeDraft.id ? "Edit store" : "New store"}
              placeholder="Publix at Brook Hill"
              value={storeDraft.name}
              onChangeText={(name) => setStoreDraft({ ...storeDraft, name })}
            />
            <AppTextField
              label="Address"
              hint="Used to open Apple Maps, Google Maps, or your default GPS app."
              placeholder="123 Main St, Locust Grove, VA"
              value={storeDraft.address}
              onChangeText={(address) => setStoreDraft({ ...storeDraft, address })}
            />
            <Text style={[styles.chainLabel, { color: colors.text }]}>Chain</Text>
            <View style={styles.chipRow}>
              {STORE_CHAINS.map((chain) => (
                <Chip
                  key={chain}
                  label={chain}
                  selected={storeDraft.chain === chain}
                  onPress={() => setStoreDraft({ ...storeDraft, chain })}
                />
              ))}
            </View>
            <View style={styles.row}>
              <AppButton label="Cancel" variant="ghost" compact onPress={() => setStoreDraft(null)} />
              <AppButton label="Save store" compact onPress={() => void saveStore()} />
            </View>
          </View>
        ) : (
          <AppButton
            label="+ Add store"
            variant="secondary"
            onPress={() => setStoreDraft(emptyStore)}
          />
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { ...typography.caption, lineHeight: 20 },
  section: typography.headline,
  hint: { ...typography.caption, lineHeight: 18 },
  result: { ...typography.body, marginTop: spacing.xs },
  empty: typography.caption,
  storeRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
  },
  storeName: typography.label,
  storeActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  storeForm: { gap: spacing.sm },
  chainLabel: typography.label,
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  row: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm, alignItems: "center" },
  flex: { flex: 1 },
});

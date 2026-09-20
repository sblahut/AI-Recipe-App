import Constants from "expo-constants";
import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Platform, StyleSheet, Text, View } from "react-native";

import { ProfileAvatar } from "@/components/ProfileAvatar";
import { SettingsLinkRow, SettingsSwitchRow } from "@/components/ui/SettingsRow";
import { AppButton } from "@/components/ui/AppButton";
import { AppTextField } from "@/components/ui/AppTextField";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Screen } from "@/components/ui/Screen";
import { spacing, typography } from "@/constants/theme";
import { useServerSettings } from "@/contexts/ServerSettingsContext";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";
import { useAppTheme } from "@/hooks/useAppTheme";
import { openAddressInMaps, openExternalUrl } from "@/lib/openMaps";
import { pickProfilePhoto, profilePhotoSourceOptions } from "@/lib/profilePhoto";
import { apiJson } from "@/lib/api";
import { expoGoDisplayUrl, qrCodeImageUri } from "@/lib/expoGoDevUrl";
import { phoneUnreachableHomeServerReason } from "@/lib/parseServerUrlFromQr";
import { homeNetworkSchema } from "@/lib/schemas";
import { weeklyAdUrlForStore } from "@/lib/storeChains";
import {
  STORE_CHAINS,
  allStorageLocations,
  type GroceryStore,
  type StoreChain,
  type ThemeMode,
} from "@/lib/userPreferences";

type StoreDraft = {
  id?: string;
  name: string;
  address: string;
  chain: StoreChain;
};

const emptyStore: StoreDraft = { name: "", address: "", chain: "Other" };

const THEME_OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: "system", label: "System" },
  { mode: "light", label: "Light" },
  { mode: "dark", label: "Dark" },
];

const RECIPE_COUNT_OPTIONS = [1, 2, 3, 5, 10] as const;

export default function SettingsScreen() {
  const { colors } = useAppTheme();
  const { serverUrl, setServerUrl, loading, testConnection } = useServerSettings();
  const {
    preferences,
    setUsername,
    addZone,
    removeZone,
    addStore,
    updateStore,
    deleteStore,
    setAutoPersistGeneratedRecipes,
    setThemeMode,
    setDefaultStorageLocation,
    setPromptForStorageLocation,
    setPrioritizeExpiringWhenGenerating,
    setDefaultRecipeCount,
    setProfilePhotoUri,
  } = useUserPreferences();
  const [photoBusy, setPhotoBusy] = useState(false);
  const [draft, setDraft] = useState(serverUrl);
  const [usernameDraft, setUsernameDraft] = useState(preferences.username);
  const [editingProfile, setEditingProfile] = useState(false);
  const [zoneDraft, setZoneDraft] = useState("");
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [storeDraft, setStoreDraft] = useState<StoreDraft | null>(null);

  const storageLocations = useMemo(
    () => allStorageLocations(preferences.customZones),
    [preferences.customZones],
  );

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const [networkExpoUrl, setNetworkExpoUrl] = useState<string | null>(null);
  const [lanHost, setLanHost] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await apiJson<unknown>("/meta/home-network", { baseUrl: serverUrl });
        const network = homeNetworkSchema.parse(raw);
        setLanHost(network.lan_host);
        setNetworkExpoUrl(network.expo_go_url);
      } catch {
        setLanHost(null);
        setNetworkExpoUrl(null);
      }
    })();
  }, [serverUrl]);

  const expoGoUrl = useMemo(
    () => expoGoDisplayUrl(lanHost) ?? networkExpoUrl,
    [lanHost, networkExpoUrl],
  );

  useEffect(() => {
    queueMicrotask(() => {
      setDraft(serverUrl);
    });
  }, [serverUrl]);

  useEffect(() => {
    if (!editingProfile) {
      queueMicrotask(() => {
        setUsernameDraft(preferences.username);
      });
    }
  }, [preferences.username, editingProfile]);

  if (loading) {
    return <Screen loading />;
  }

  const resultColor =
    result?.startsWith("✓") === true
      ? colors.success
      : result?.startsWith("✗") === true
        ? colors.danger
        : colors.textSecondary;

  const saveProfile = async () => {
    await setUsername(usernameDraft);
    setEditingProfile(false);
  };

  const cancelProfileEdit = () => {
    setUsernameDraft(preferences.username);
    setEditingProfile(false);
  };

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

  const openStoreWeeklyAd = (store: GroceryStore) => {
    const url = weeklyAdUrlForStore(store);
    if (!url) {
      Alert.alert("Weekly ad", `No weekly ad link is set for ${store.chain}.`);
      return;
    }
    void openExternalUrl(url).catch((e: unknown) => {
      Alert.alert("Weekly ad", e instanceof Error ? e.message : "Could not open the weekly ad");
    });
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

  const addCustomZone = async () => {
    try {
      await addZone(zoneDraft);
      setZoneDraft("");
    } catch (e) {
      Alert.alert("Storage area", e instanceof Error ? e.message : "Could not add area");
    }
  };

  const applyPickedPhoto = async (source: "library" | "camera") => {
    setPhotoBusy(true);
    try {
      const uri = await pickProfilePhoto(source);
      if (uri) {
        await setProfilePhotoUri(uri);
      }
    } catch (e) {
      Alert.alert("Profile photo", e instanceof Error ? e.message : "Could not update photo");
    } finally {
      setPhotoBusy(false);
    }
  };

  const openProfilePhotoMenu = () => {
    if (photoBusy) {
      return;
    }
    const buttons: { text: string; style?: "cancel" | "destructive"; onPress?: () => void }[] = [];
    if (profilePhotoSourceOptions().includes("library")) {
      buttons.push({
        text: "Choose from library",
        onPress: () => {
          void applyPickedPhoto("library");
        },
      });
    }
    if (profilePhotoSourceOptions().includes("camera")) {
      buttons.push({
        text: "Take photo",
        onPress: () => {
          void applyPickedPhoto("camera");
        },
      });
    }
    if (preferences.profilePhotoUri) {
      buttons.push({
        text: "Remove photo",
        style: "destructive",
        onPress: () => {
          void setProfilePhotoUri(null);
        },
      });
    }
    buttons.push({ text: "Cancel", style: "cancel" });
    Alert.alert("Profile photo", undefined, buttons);
  };

  const confirmRemoveZone = (zone: string) => {
    Alert.alert("Remove area", `Remove "${zone}" from your filters? Items keep their location.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          void removeZone(zone);
          if (preferences.defaultStorageLocation === zone) {
            void setDefaultStorageLocation(null);
          }
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      {/* Profile */}
      <Card>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Profile</Text>
        <View style={styles.profilePhotoBlock}>
          <ProfileAvatar
            colors={colors}
            username={preferences.username}
            photoUri={preferences.profilePhotoUri}
            size={80}
            onPress={openProfilePhotoMenu}
          />
          <AppButton
            label={photoBusy ? "Updating…" : "Change photo"}
            variant="secondary"
            compact
            disabled={photoBusy}
            onPress={openProfilePhotoMenu}
          />
          {preferences.profilePhotoUri ? (
            <AppButton
              label="Remove photo"
              variant="ghost"
              compact
              disabled={photoBusy}
              onPress={() => void setProfilePhotoUri(null)}
            />
          ) : null}
          {Platform.OS === "web" ? (
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              On web, choose a photo from your files.
            </Text>
          ) : null}
        </View>

        {!editingProfile ? (
          <View style={styles.profileRow}>
            <View style={styles.profileText}>
              <Text style={[styles.displayName, { color: colors.text }]}>
                {preferences.username.trim() || "No display name"}
              </Text>
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                Name and photo stay on this device only.
              </Text>
            </View>
            <AppButton
              label={preferences.username.trim() ? "Edit" : "Add name"}
              variant="secondary"
              compact
              onPress={() => setEditingProfile(true)}
            />
          </View>
        ) : (
          <View style={styles.profileEdit}>
            <AppTextField
              label="Display name"
              hint="How you appear in the app."
              value={usernameDraft}
              onChangeText={setUsernameDraft}
              autoCapitalize="words"
              autoCorrect={false}
              placeholder="Alex"
            />
            <View style={styles.row}>
              <AppButton label="Cancel" variant="ghost" compact onPress={cancelProfileEdit} />
              <AppButton
                label="Clear"
                variant="ghost"
                compact
                onPress={() => setUsernameDraft("")}
              />
              <AppButton label="Save" compact onPress={() => void saveProfile()} />
            </View>
          </View>
        )}
      </Card>

      {/* Appearance */}
      <Card>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Choose light or dark mode, or follow your phone.
        </Text>
        <View style={styles.chipRow}>
          {THEME_OPTIONS.map(({ mode, label }) => (
            <Chip
              key={mode}
              label={label}
              selected={(preferences.themeMode ?? "system") === mode}
              capitalize={false}
              onPress={() => void setThemeMode(mode)}
            />
          ))}
        </View>
      </Card>

      {/* Kitchen defaults */}
      <Card>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Kitchen</Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Default storage when adding items from scans or recipes.
        </Text>
        <Text style={[styles.fieldLabel, { color: colors.text }]}>Default location</Text>
        <View style={styles.chipRow}>
          <Chip
            label="None"
            selected={!preferences.defaultStorageLocation}
            capitalize={false}
            onPress={() => void setDefaultStorageLocation(null)}
          />
          {storageLocations.map((loc) => (
            <Chip
              key={loc}
              label={loc}
              selected={preferences.defaultStorageLocation === loc}
              capitalize={false}
              onPress={() => void setDefaultStorageLocation(loc)}
            />
          ))}
        </View>
        <SettingsSwitchRow
          colors={colors}
          label="Ask every time"
          hint="When off, uses your default location without asking."
          value={preferences.promptForStorageLocation ?? true}
          onValueChange={(next) => void setPromptForStorageLocation(next)}
          disabled={!preferences.defaultStorageLocation}
        />

        <Text style={[styles.fieldLabel, { color: colors.text, marginTop: spacing.md }]}>
          Custom storage areas
        </Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Same areas as on the Pantry tab. Removing one doesn't delete items.
        </Text>
        {preferences.customZones.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textMuted }]}>No custom areas yet.</Text>
        ) : (
          preferences.customZones.map((zone) => (
            <View key={zone} style={[styles.zoneRow, { borderColor: colors.border }]}>
              <Text style={[styles.storeName, { color: colors.text }]}>{zone}</Text>
              <AppButton
                label="Remove"
                variant="ghost"
                compact
                onPress={() => confirmRemoveZone(zone)}
              />
            </View>
          ))
        )}
        <View style={styles.zoneAdd}>
          <AppTextField
            label="New area"
            placeholder="Garage fridge"
            value={zoneDraft}
            onChangeText={setZoneDraft}
          />
          <AppButton label="Add area" variant="secondary" onPress={() => void addCustomZone()} />
        </View>
      </Card>

      {/* Recipes */}
      <Card>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recipes</Text>
        <SettingsSwitchRow
          colors={colors}
          label="Auto-save generated recipes"
          hint="Saves each generate run on the server (not as favorites)."
          value={preferences.autoPersistGeneratedRecipes}
          onValueChange={(next) => void setAutoPersistGeneratedRecipes(next)}
        />
        <SettingsSwitchRow
          colors={colors}
          label="Prioritize expiring ingredients"
          hint="Tells the AI to use items that expire soon first."
          value={preferences.prioritizeExpiringWhenGenerating ?? true}
          onValueChange={(next) => void setPrioritizeExpiringWhenGenerating(next)}
        />
        <Text style={[styles.fieldLabel, { color: colors.text }]}>Recipes per generate</Text>
        <View style={styles.chipRow}>
          {RECIPE_COUNT_OPTIONS.map((count) => (
            <Chip
              key={count}
              label={String(count)}
              selected={(preferences.defaultRecipeCount ?? 3) === count}
              capitalize={false}
              onPress={() => void setDefaultRecipeCount(count)}
            />
          ))}
        </View>
      </Card>

      {/* Stores */}
      <Card>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Grocery stores</Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Save the stores you shop at. Open directions in your phone's maps app.
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
              <AppButton
                label="Ad"
                variant="secondary"
                compact
                onPress={() => openStoreWeeklyAd(store)}
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
              hint="Used for directions in your maps app."
              placeholder="123 Main St, Locust Grove, VA"
              value={storeDraft.address}
              onChangeText={(address) => setStoreDraft({ ...storeDraft, address })}
            />
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Chain</Text>
            <View style={styles.chipRow}>
              {STORE_CHAINS.map((chain) => (
                <Chip
                  key={chain}
                  label={chain}
                  selected={storeDraft.chain === chain}
                  capitalize={false}
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

      {/* About */}
      <Card>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          AI Recipe · version {appVersion}
        </Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Your family's cooking assistant, running on your home network.
        </Text>
        <SettingsLinkRow
          colors={colors}
          label="Open API docs"
          hint={`${serverUrl}/docs`}
          onPress={() => {
            void openExternalUrl(`${serverUrl.replace(/\/+$/, "")}/docs`).catch((e: unknown) => {
              Alert.alert("Browser", e instanceof Error ? e.message : "Could not open link");
            });
          }}
        />
      </Card>

      {/* Dev + server connection */}
      <Card>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Connect this phone</Text>

        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Scan with the iPhone Camera to open this project in Expo Go (same Wi‑Fi as the PC). Works
          from this phone, from the PC status page, or while previewing on http://localhost:8081 —
          the QR always uses your PC's LAN address, not localhost.
        </Text>
        {expoGoUrl ? (
          <View style={styles.serverQrWrap}>
            <Image
              accessibilityLabel="QR code to open this app in Expo Go"
              source={{ uri: qrCodeImageUri(expoGoUrl) }}
              style={styles.serverQr}
            />
            <Text style={[styles.hint, { color: colors.textMuted }]} selectable>
              {expoGoUrl}
            </Text>
          </View>
        ) : (
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Start the API on your PC (port 8000) and Metro (port 8081), then reopen Settings to load
            the Expo QR.
          </Text>
        )}

        <Text style={[styles.subsectionTitle, { color: colors.text, marginTop: spacing.md }]}>
          Home server API
        </Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Kitchen data on your PC (port 8000). Use a LAN IP or Tailscale MagicDNS URL — not
          localhost or port 8081.
        </Text>
        <AppTextField
          label="Server address"
          hint="Example: http://kitchen-pc.tailxxxxx.ts.net:8000"
          value={draft}
          onChangeText={setDraft}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        <AppButton
          label="Save address"
          onPress={() => {
            void (async () => {
              const blocked = phoneUnreachableHomeServerReason(draft.trim());
              if (blocked) {
                setResult(`✗ ${blocked}`);
                return;
              }
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: typography.headline,
  subsectionTitle: { ...typography.label, fontWeight: "700", marginTop: spacing.sm },
  hint: { ...typography.caption, lineHeight: 18 },
  result: { ...typography.bodyMedium },
  empty: { ...typography.caption, paddingVertical: spacing.xs },
  fieldLabel: { ...typography.label, marginTop: spacing.sm },
  profilePhotoBlock: {
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  profileText: { flex: 1, gap: 2 },
  displayName: typography.bodyMedium,
  profileEdit: { gap: spacing.sm },
  storeRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
  },
  zoneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  zoneAdd: { gap: spacing.sm, marginTop: spacing.sm },
  storeName: typography.bodyMedium,
  storeActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  storeForm: { gap: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  row: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm, alignItems: "center" },
  flex: { flex: 1 },
  serverQrWrap: { alignItems: "center", paddingVertical: spacing.sm },
  serverQr: { width: 180, height: 180 },
});

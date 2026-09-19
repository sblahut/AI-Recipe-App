import Constants from "expo-constants";
import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";

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
      <Text style={[styles.lead, { color: colors.textMuted }]}>
        Profile, appearance, and kitchen defaults for your pantry.
      </Text>

      <Card>
        <Text style={[styles.section, { color: colors.text }]}>Profile</Text>
        <View style={styles.profilePhotoBlock}>
          <ProfileAvatar
            colors={colors}
            username={preferences.username}
            photoUri={preferences.profilePhotoUri}
            size={88}
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
              label={preferences.username.trim() ? "Edit name" : "Add name"}
              variant="secondary"
              compact
              onPress={() => setEditingProfile(true)}
            />
          </View>
        ) : (
          <View style={styles.profileEdit}>
            <AppTextField
              label="Display name"
              hint="How you want to be shown in the app."
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

      <Card>
        <Text style={[styles.section, { color: colors.text }]}>Appearance</Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Override light or dark mode, or follow your phone.
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

      <Card>
        <Text style={[styles.section, { color: colors.text }]}>Kitchen</Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Default storage when stocking from recipes or scans.
        </Text>
        <Text style={[styles.chainLabel, { color: colors.text }]}>Default location</Text>
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
          hint="When off, uses your default location without prompting."
          value={preferences.promptForStorageLocation ?? true}
          onValueChange={(next) => void setPromptForStorageLocation(next)}
          disabled={!preferences.defaultStorageLocation}
        />

        <Text style={[styles.chainLabel, { color: colors.text, marginTop: spacing.sm }]}>
          Custom storage areas
        </Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Same areas as on the Ingredients tab. Removing one does not delete items.
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

      <Card>
        <Text style={[styles.section, { color: colors.text }]}>Recipes</Text>
        <SettingsSwitchRow
          colors={colors}
          label="Auto-save generated recipes"
          hint="Saves each generate run on the server (not favorites)."
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
        <Text style={[styles.chainLabel, { color: colors.text }]}>Recipes per generate</Text>
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
              <AppButton
                label="Weekly ad"
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

      <Card>
        <Text style={[styles.section, { color: colors.text }]}>About</Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          AI Recipe · version {appVersion}
        </Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Pantry, barcodes, and local recipe generation on your home network.
        </Text>
        <SettingsLinkRow
          colors={colors}
          label="Open API docs in browser"
          hint={`${serverUrl}/docs`}
          onPress={() => {
            void openExternalUrl(`${serverUrl.replace(/\/+$/, "")}/docs`).catch((e: unknown) => {
              Alert.alert("Browser", e instanceof Error ? e.message : "Could not open link");
            });
          }}
        />
      </Card>

      <Card>
        <Text style={[styles.section, { color: colors.text }]}>Home server</Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Dev / LAN setup: recipe API on port 8000 (not Metro on 8081). Same Wi‑Fi as this phone.
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
          label="Save URL"
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { ...typography.caption, lineHeight: 20 },
  section: typography.headline,
  hint: { ...typography.caption, lineHeight: 18 },
  result: { ...typography.body, marginTop: spacing.xs },
  empty: typography.caption,
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
  displayName: typography.label,
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
  storeName: typography.label,
  storeActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  storeForm: { gap: spacing.sm },
  chainLabel: typography.label,
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  row: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm, alignItems: "center" },
  flex: { flex: 1 },
});

import Constants from "expo-constants";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Image, Keyboard, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { HomeServerStatusCard } from "@/components/HomeServerStatusCard";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ThemeColorPickerModal } from "@/components/ThemeColorPickerModal";
import { SettingsLinkRow, SettingsSwitchRow } from "@/components/ui/SettingsRow";
import { AppButton } from "@/components/ui/AppButton";
import { AppSelect } from "@/components/ui/AppSelect";
import { AppTextField } from "@/components/ui/AppTextField";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
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
import { homeNetworkSchema } from "@/lib/schemas";
import { isCollapsibleExpanded } from "@/lib/collapsibleExpanded";
import { WEEK_START_DAY_OPTIONS } from "@/lib/mealPlanWeek";
import { rescheduleExpirationRemindersFromServer } from "@/lib/expirationReminders";
import {
  DEFAULT_PUBLIX_STORE_NUMBER,
  PUBLIX_CHANCELLOR_CROSSING_URL,
  weeklyAdUrlForStore,
} from "@/lib/storeChains";
import { effectivePublixStoreNumber, parsePublixStoreNumberInput } from "@/lib/publixStoreNumber";
import {
  ACCENT_COLOR_PRESETS,
  DEFAULT_THEME_ACCENT,
  DEFAULT_THEME_PRIMARY,
  PRIMARY_COLOR_PRESETS,
} from "@/lib/themePalette";
import { shoppingListSchema, type ShoppingList } from "@/lib/schemas";
import {
  STORE_CHAINS,
  allStorageLocations,
  parseAvoidIngredientsInput,
  type GroceryStore,
  type PantrySortBy,
  type StoreChain,
  type ThemeMode,
  type WeekStartsOnDay,
} from "@/lib/userPreferences";
import { z } from "zod";

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

const EXPIRATION_REMINDER_OPTIONS: { days: number | null; label: string }[] = [
  { days: null, label: "Off" },
  { days: 1, label: "1 day" },
  { days: 2, label: "2 days" },
  { days: 3, label: "3 days" },
  { days: 7, label: "7 days" },
];

const LOW_STOCK_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "Off" },
  { value: 1, label: "≤ 1" },
  { value: 2, label: "≤ 2" },
  { value: 5, label: "≤ 5" },
];

const PANTRY_SORT_OPTIONS: { value: PantrySortBy; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "expiry", label: "Expiry" },
  { value: "location", label: "Location" },
];

const PREF_TEXT_DEBOUNCE_MS = 500;

type SettingsSectionId =
  | "profile"
  | "appearance"
  | "kitchen"
  | "aiRecipes"
  | "shoppingPantry"
  | "mealPlan"
  | "stores"
  | "about"
  | "connect"
  | "data";

export default function SettingsScreen() {
  const { colors } = useAppTheme();
  const { serverUrl, loading } = useServerSettings();
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
    setPrimaryColor,
    setAccentColor,
    resetBrandColors,
    setDefaultStorageLocation,
    setPromptForStorageLocation,
    setPrioritizeExpiringWhenGenerating,
    setDefaultRecipeCount,
    setProfilePhotoUri,
    updatePreferences,
    resetLocalAppData,
  } = useUserPreferences();
  const [photoBusy, setPhotoBusy] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState(preferences.username);
  const [editingProfile, setEditingProfile] = useState(false);
  const [zoneDraft, setZoneDraft] = useState("");
  const [storeDraft, setStoreDraft] = useState<StoreDraft | null>(null);
  const savedPublixStoreText = String(effectivePublixStoreNumber(preferences));
  const [publixStoreDraft, setPublixStoreDraft] = useState(savedPublixStoreText);
  const [primaryPickerOpen, setPrimaryPickerOpen] = useState(false);
  const [accentPickerOpen, setAccentPickerOpen] = useState(false);
  const [avoidDraft, setAvoidDraft] = useState(preferences.avoidIngredients.join(", "));
  const [constraintDraft, setConstraintDraft] = useState(preferences.defaultConstraintText);
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const avoidPersistSkip = useRef(true);
  const constraintPersistSkip = useRef(true);
  const [expandedSections, setExpandedSections] = useState<
    Partial<Record<SettingsSectionId, boolean>>
  >({});

  const isSectionExpanded = useCallback(
    (id: SettingsSectionId) => isCollapsibleExpanded(id, expandedSections, true),
    [expandedSections],
  );

  const toggleSection = useCallback((id: SettingsSectionId) => {
    setExpandedSections((prev) => ({
      ...prev,
      [id]: !isCollapsibleExpanded(id, prev, true),
    }));
  }, []);

  const displayPrimary = preferences.primaryColor ?? colors.primary;
  const displayAccent = preferences.accentColor ?? colors.accent;
  const usingDefaultBrand =
    preferences.primaryColor == null && preferences.accentColor == null;

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
    setPublixStoreDraft(String(effectivePublixStoreNumber(preferences)));
  }, [preferences.publixStoreNumber]);

  const publixStoreDirty = publixStoreDraft !== savedPublixStoreText;
  const publixStoreCanSave = parsePublixStoreNumberInput(publixStoreDraft) != null;

  const savePublixStoreNumber = () => {
    const n = parsePublixStoreNumberInput(publixStoreDraft);
    if (n == null) {
      Alert.alert("Publix store number", "Enter a valid store number (digits only).");
      return;
    }
    void updatePreferences({ publixStoreNumber: n });
    Keyboard.dismiss();
  };

  useEffect(() => {
    if (!editingProfile) {
      queueMicrotask(() => {
        setUsernameDraft(preferences.username);
      });
    }
  }, [preferences.username, editingProfile]);

  useEffect(() => {
    queueMicrotask(() => {
      setAvoidDraft(preferences.avoidIngredients.join(", "));
      setConstraintDraft(preferences.defaultConstraintText);
      avoidPersistSkip.current = true;
      constraintPersistSkip.current = true;
    });
  }, [preferences.avoidIngredients, preferences.defaultConstraintText]);

  const loadShoppingLists = useCallback(async () => {
    try {
      const raw = await apiJson<unknown>("/shopping/lists", { baseUrl: serverUrl });
      setShoppingLists(z.array(shoppingListSchema).parse(raw));
    } catch {
      setShoppingLists([]);
    }
  }, [serverUrl]);

  useFocusEffect(
    useCallback(() => {
      void loadShoppingLists();
    }, [loadShoppingLists]),
  );

  useEffect(() => {
    if (avoidPersistSkip.current) {
      avoidPersistSkip.current = false;
      return;
    }
    const timer = setTimeout(() => {
      void updatePreferences({ avoidIngredients: parseAvoidIngredientsInput(avoidDraft) });
    }, PREF_TEXT_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [avoidDraft, updatePreferences]);

  useEffect(() => {
    if (constraintPersistSkip.current) {
      constraintPersistSkip.current = false;
      return;
    }
    const timer = setTimeout(() => {
      void updatePreferences({ defaultConstraintText: constraintDraft.trim() });
    }, PREF_TEXT_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [constraintDraft, updatePreferences]);

  if (loading) {
    return <Screen loading />;
  }

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

  const setExpirationReminderDays = (days: number | null) => {
    void (async () => {
      await updatePreferences({ expirationReminderDaysBefore: days });
      try {
        await rescheduleExpirationRemindersFromServer(serverUrl, days);
      } catch {
        // Pantry unreachable; Pantry tab refresh will reschedule.
      }
    })();
  };

  const confirmClearLocalData = () => {
    Alert.alert(
      "Clear local data",
      "Resets preferences, profile photo, and on-device settings. Pantry, recipes, and lists on your home server are not deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            void resetLocalAppData();
          },
        },
      ],
    );
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
    <Screen scroll contentContainerStyle={styles.sections}>
      <CollapsibleSection
        title="Profile"
        expanded={isSectionExpanded("profile")}
        onToggle={() => toggleSection("profile")}
        leadingIcon="person-outline"
      >
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
      </CollapsibleSection>

      <CollapsibleSection
        title="Appearance"
        expanded={isSectionExpanded("appearance")}
        onToggle={() => toggleSection("appearance")}
        leadingIcon="color-palette-outline"
      >
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
        <Text style={[styles.fieldLabel, { color: colors.text, marginTop: spacing.md }]}>
          Brand colors
        </Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Main color drives buttons, tabs, and links. Accent color is used for scan, shop, and
          checkbox highlights.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setPrimaryPickerOpen(true)}
          style={({ pressed }) => [
            styles.colorRow,
            { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <View style={[styles.colorSwatch, { backgroundColor: displayPrimary }]} />
          <View style={styles.colorRowText}>
            <Text style={[styles.colorRowLabel, { color: colors.text }]}>Main color</Text>
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              {preferences.primaryColor ?? `Default (${DEFAULT_THEME_PRIMARY.light})`}
            </Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setAccentPickerOpen(true)}
          style={({ pressed }) => [
            styles.colorRow,
            { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <View style={[styles.colorSwatch, { backgroundColor: displayAccent }]} />
          <View style={styles.colorRowText}>
            <Text style={[styles.colorRowLabel, { color: colors.text }]}>Accent color</Text>
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              {preferences.accentColor ?? `Default (${DEFAULT_THEME_ACCENT.light})`}
            </Text>
          </View>
        </Pressable>
        {!usingDefaultBrand ? (
          <AppButton
            label="Reset to default colors"
            variant="ghost"
            compact
            onPress={() => void resetBrandColors()}
          />
        ) : null}
        <ThemeColorPickerModal
          visible={primaryPickerOpen}
          title="Choose main color"
          value={displayPrimary}
          swatches={PRIMARY_COLOR_PRESETS}
          onClose={() => setPrimaryPickerOpen(false)}
          onSave={(hex) => void setPrimaryColor(hex)}
        />
        <ThemeColorPickerModal
          visible={accentPickerOpen}
          title="Choose accent color"
          value={displayAccent}
          swatches={ACCENT_COLOR_PRESETS}
          onClose={() => setAccentPickerOpen(false)}
          onSave={(hex) => void setAccentColor(hex)}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Kitchen"
        expanded={isSectionExpanded("kitchen")}
        onToggle={() => toggleSection("kitchen")}
        leadingIcon="restaurant-outline"
      >
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
      </CollapsibleSection>

      <CollapsibleSection
        title="AI-generated recipes"
        expanded={isSectionExpanded("aiRecipes")}
        onToggle={() => toggleSection("aiRecipes")}
        leadingIcon="sparkles-outline"
      >
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Generate, AI search, and import — plus how recipes appear in the app.
        </Text>
        <SettingsSwitchRow
          colors={colors}
          label="Auto-favorite generated recipes"
          hint="Stars each recipe from generate and AI search so it appears under Family favorites."
          value={preferences.autoPersistGeneratedRecipes}
          onValueChange={(next) => void setAutoPersistGeneratedRecipes(next)}
        />
        <SettingsSwitchRow
          colors={colors}
          label="Auto-favorite imported recipes"
          hint="When on, pasted or URL imports are saved and starred separately from AI generate."
          value={preferences.autoFavoriteImportedRecipes}
          onValueChange={(next) => void updatePreferences({ autoFavoriteImportedRecipes: next })}
        />
        <Text style={[styles.fieldLabel, { color: colors.text }]}>Diet & allergies</Text>
        <SettingsSwitchRow
          colors={colors}
          label="Vegetarian"
          value={preferences.dietVegetarian}
          onValueChange={(next) => void updatePreferences({ dietVegetarian: next })}
        />
        <SettingsSwitchRow
          colors={colors}
          label="Vegan"
          value={preferences.dietVegan}
          onValueChange={(next) => void updatePreferences({ dietVegan: next })}
        />
        <SettingsSwitchRow
          colors={colors}
          label="Gluten-free"
          value={preferences.dietGlutenFree}
          onValueChange={(next) => void updatePreferences({ dietGlutenFree: next })}
        />
        <AppTextField
          label="Never use (comma-separated)"
          hint="Saved automatically. Sent to AI on generate and search."
          value={avoidDraft}
          onChangeText={setAvoidDraft}
          placeholder="peanuts, shellfish"
        />
        <SettingsSwitchRow
          colors={colors}
          label="Prefer quick recipes"
          hint="Under 30 minutes when possible."
          value={preferences.preferQuickRecipes}
          onValueChange={(next) => void updatePreferences({ preferQuickRecipes: next })}
        />
        <SettingsSwitchRow
          colors={colors}
          label="Kid-friendly"
          value={preferences.preferKidFriendly}
          onValueChange={(next) => void updatePreferences({ preferKidFriendly: next })}
        />
        <AppTextField
          label="Default notes for every generate"
          hint="Saved automatically."
          value={constraintDraft}
          onChangeText={setConstraintDraft}
          placeholder="No cilantro, air fryer OK"
        />
        <SettingsSwitchRow
          colors={colors}
          label="Show prep time prominently"
          value={preferences.showPrepTimeProminent ?? true}
          onValueChange={(next) => void updatePreferences({ showPrepTimeProminent: next })}
        />
        <SettingsSwitchRow
          colors={colors}
          label="Number recipe steps"
          value={preferences.showStepNumbers ?? true}
          onValueChange={(next) => void updatePreferences({ showStepNumbers: next })}
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
      </CollapsibleSection>

      <CollapsibleSection
        title="Shopping & pantry"
        expanded={isSectionExpanded("shoppingPantry")}
        onToggle={() => toggleSection("shoppingPantry")}
        leadingIcon="basket-outline"
      >
        <Text style={[styles.fieldLabel, { color: colors.text }]}>Default shopping list</Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Recipe and meal-plan adds skip the picker when set.
        </Text>
        <View style={styles.chipRow}>
          <Chip
            label="Ask each time"
            selected={preferences.defaultShoppingListId == null}
            capitalize={false}
            onPress={() => void updatePreferences({ defaultShoppingListId: null })}
          />
          {shoppingLists.map((list) => (
            <Chip
              key={list.id}
              label={list.name}
              selected={preferences.defaultShoppingListId === list.id}
              capitalize={false}
              onPress={() => void updatePreferences({ defaultShoppingListId: list.id })}
            />
          ))}
        </View>
        <SettingsSwitchRow
          colors={colors}
          label="Skip pantry when building lists"
          hint="For add-from-recipe and shop-this-week only. When off, all recipe lines are added."
          value={preferences.omitPantryItemsFromShoppingLists ?? true}
          onValueChange={(next) => void updatePreferences({ omitPantryItemsFromShoppingLists: next })}
        />
        <Text style={[styles.fieldLabel, { color: colors.text, marginTop: spacing.md }]}>
          Sort pantry by
        </Text>
        <View style={styles.chipRow}>
          {PANTRY_SORT_OPTIONS.map(({ value, label }) => (
            <Chip
              key={value}
              label={label}
              selected={(preferences.pantrySortBy ?? "name") === value}
              capitalize={false}
              onPress={() => void updatePreferences({ pantrySortBy: value })}
            />
          ))}
        </View>
        {Platform.OS !== "web" ? (
          <>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Expiration reminders</Text>
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              Local notifications before items expire. Schedules immediately when you change this.
            </Text>
            <View style={styles.chipRow}>
              {EXPIRATION_REMINDER_OPTIONS.map(({ days, label }) => (
                <Chip
                  key={label}
                  label={label}
                  selected={(preferences.expirationReminderDaysBefore ?? null) === days}
                  capitalize={false}
                  onPress={() => setExpirationReminderDays(days)}
                />
              ))}
            </View>
          </>
        ) : null}
        <Text style={[styles.fieldLabel, { color: colors.text }]}>Low stock hint</Text>
        <View style={styles.chipRow}>
          {LOW_STOCK_OPTIONS.map(({ value, label }) => (
            <Chip
              key={label}
              label={label}
              selected={(preferences.globalLowStockThreshold ?? null) === value}
              capitalize={false}
              onPress={() => void updatePreferences({ globalLowStockThreshold: value })}
            />
          ))}
        </View>
      </CollapsibleSection>

      <CollapsibleSection
        title="Meal plan"
        expanded={isSectionExpanded("mealPlan")}
        onToggle={() => toggleSection("mealPlan")}
        leadingIcon="calendar-outline"
      >
        <AppSelect<WeekStartsOnDay>
          label="Week starts on"
          hint="First day shown on the Plan tab."
          value={preferences.weekStartsOnDay ?? 1}
          options={WEEK_START_DAY_OPTIONS.map(({ day, label }) => ({ value: day, label }))}
          onValueChange={(day) => void updatePreferences({ weekStartsOnDay: day })}
          accessibilityLabel="Week starts on"
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Grocery stores"
        expanded={isSectionExpanded("stores")}
        onToggle={() => toggleSection("stores")}
        leadingIcon="storefront-outline"
      >
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Save the stores you shop at. Open directions in your phone's maps app.
        </Text>
        <AppTextField
          label="Publix store number"
          hint={`For BOGO recipe ideas. Default is ${DEFAULT_PUBLIX_STORE_NUMBER} (Chancellor Crossing). Find yours at publix.com/locations.`}
          placeholder={String(DEFAULT_PUBLIX_STORE_NUMBER)}
          value={publixStoreDraft}
          onChangeText={(text) => setPublixStoreDraft(text.replace(/\D/g, ""))}
          keyboardType="number-pad"
          returnKeyType="done"
          onSubmitEditing={savePublixStoreNumber}
        />
        {publixStoreDirty && publixStoreCanSave ? (
          <View style={styles.row}>
            <AppButton
              label="Save store number"
              compact
              onPress={savePublixStoreNumber}
            />
            <AppButton
              label="Cancel"
              variant="ghost"
              compact
              onPress={() => {
                setPublixStoreDraft(savedPublixStoreText);
                Keyboard.dismiss();
              }}
            />
          </View>
        ) : null}
        <SettingsLinkRow
          colors={colors}
          label="Default store (Chancellor Crossing)"
          hint={PUBLIX_CHANCELLOR_CROSSING_URL}
          onPress={() => {
            void openExternalUrl(PUBLIX_CHANCELLOR_CROSSING_URL).catch((e: unknown) => {
              Alert.alert("Browser", e instanceof Error ? e.message : "Could not open link");
            });
          }}
        />

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
      </CollapsibleSection>

      <CollapsibleSection
        title="About"
        expanded={isSectionExpanded("about")}
        onToggle={() => toggleSection("about")}
        leadingIcon="information-circle-outline"
      >
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
        <HomeServerStatusCard />
      </CollapsibleSection>

      <CollapsibleSection
        title="Connect this phone"
        expanded={isSectionExpanded("connect")}
        onToggle={() => toggleSection("connect")}
        leadingIcon="qr-code-outline"
      >
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
      </CollapsibleSection>

      <CollapsibleSection
        title="Data"
        expanded={isSectionExpanded("data")}
        onToggle={() => toggleSection("data")}
        leadingIcon="trash-outline"
      >
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Clears on-device preferences and profile photo. Server pantry, recipes, and shopping lists
          are unchanged.
        </Text>
        <AppButton
          label="Clear local data"
          variant="secondary"
          onPress={confirmClearLocalData}
        />
      </CollapsibleSection>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sections: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  hint: { ...typography.caption, lineHeight: 18 },
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
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  colorRowText: {
    flex: 1,
    gap: 2,
  },
  colorRowLabel: {
    ...typography.label,
  },
  row: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm, alignItems: "center" },
  flex: { flex: 1 },
  serverQrWrap: { alignItems: "center", paddingVertical: spacing.sm },
  serverQr: { width: 180, height: 180 },
});

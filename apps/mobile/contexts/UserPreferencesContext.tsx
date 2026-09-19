import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_USER_PREFERENCES,
  getUserPreferences,
  isReservedZoneName,
  newLocalId,
  normalizeZoneName,
  setUserPreferences,
  zoneNameTaken,
  type GroceryStore,
  type UserPreferences,
} from "@/lib/userPreferences";

type UserPreferencesContextValue = {
  preferences: UserPreferences;
  loading: boolean;
  setUsername: (username: string) => Promise<void>;
  addZone: (name: string) => Promise<void>;
  removeZone: (name: string) => Promise<void>;
  addStore: (store: Omit<GroceryStore, "id">) => Promise<void>;
  updateStore: (store: GroceryStore) => Promise<void>;
  deleteStore: (id: string) => Promise<void>;
  setAutoPersistGeneratedRecipes: (enabled: boolean) => Promise<void>;
};

const UserPreferencesContext = createContext<UserPreferencesContextValue | null>(null);

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferencesState] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setPreferencesState(await getUserPreferences());
      setLoading(false);
    })();
  }, []);

  const persist = useCallback(async (next: UserPreferences) => {
    setPreferencesState(next);
    await setUserPreferences(next);
  }, []);

  const setUsername = useCallback(
    async (username: string) => {
      await persist({ ...preferences, username: username.trim() });
    },
    [persist, preferences],
  );

  const addZone = useCallback(
    async (name: string) => {
      const zone = normalizeZoneName(name);
      if (!zone) {
        throw new Error("Enter a zone name.");
      }
      if (isReservedZoneName(zone) || zoneNameTaken(zone, preferences.customZones)) {
        throw new Error("That area already exists.");
      }
      await persist({ ...preferences, customZones: [...preferences.customZones, zone] });
    },
    [persist, preferences],
  );

  const removeZone = useCallback(
    async (name: string) => {
      await persist({
        ...preferences,
        customZones: preferences.customZones.filter((zone) => zone !== name),
      });
    },
    [persist, preferences],
  );

  const addStore = useCallback(
    async (store: Omit<GroceryStore, "id">) => {
      const next: GroceryStore = { ...store, id: newLocalId(), name: store.name.trim(), address: store.address.trim() };
      if (!next.name) {
        throw new Error("Store name is required.");
      }
      await persist({ ...preferences, stores: [...preferences.stores, next] });
    },
    [persist, preferences],
  );

  const updateStore = useCallback(
    async (store: GroceryStore) => {
      const name = store.name.trim();
      if (!name) {
        throw new Error("Store name is required.");
      }
      await persist({
        ...preferences,
        stores: preferences.stores.map((row) =>
          row.id === store.id ? { ...store, name, address: store.address.trim() } : row,
        ),
      });
    },
    [persist, preferences],
  );

  const deleteStore = useCallback(
    async (id: string) => {
      await persist({
        ...preferences,
        stores: preferences.stores.filter((store) => store.id !== id),
      });
    },
    [persist, preferences],
  );

  const setAutoPersistGeneratedRecipes = useCallback(
    async (enabled: boolean) => {
      await persist({ ...preferences, autoPersistGeneratedRecipes: enabled });
    },
    [persist, preferences],
  );

  const value = useMemo(
    () => ({
      preferences,
      loading,
      setUsername,
      addZone,
      removeZone,
      addStore,
      updateStore,
      deleteStore,
      setAutoPersistGeneratedRecipes,
    }),
    [
      preferences,
      loading,
      setUsername,
      addZone,
      removeZone,
      addStore,
      updateStore,
      deleteStore,
      setAutoPersistGeneratedRecipes,
    ],
  );

  return <UserPreferencesContext.Provider value={value}>{children}</UserPreferencesContext.Provider>;
}

export function useUserPreferences(): UserPreferencesContextValue {
  const ctx = useContext(UserPreferencesContext);
  if (!ctx) {
    throw new Error("useUserPreferences must be used within UserPreferencesProvider");
  }
  return ctx;
}

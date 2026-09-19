import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { apiJson } from "@/lib/api";
import { healthSchema } from "@/lib/schemas";
import { DEFAULT_SERVER_URL, getStoredServerUrl, setStoredServerUrl } from "@/lib/storage";

type ServerSettingsContextValue = {
  serverUrl: string;
  setServerUrl: (url: string) => Promise<void>;
  loading: boolean;
  testConnection: () => Promise<{ ok: boolean; message: string }>;
};

const ServerSettingsContext = createContext<ServerSettingsContextValue | null>(null);

export function ServerSettingsProvider({ children }: { children: ReactNode }) {
  const [serverUrl, setServerUrlState] = useState(DEFAULT_SERVER_URL);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const stored = await getStoredServerUrl();
      if (stored) {
        setServerUrlState(stored);
      } else {
        await setStoredServerUrl(DEFAULT_SERVER_URL);
      }
      setLoading(false);
    })();
  }, []);

  const setServerUrl = useCallback(async (url: string) => {
    await setStoredServerUrl(url);
    setServerUrlState(url.trim().replace(/\/+$/, ""));
  }, []);

  const testConnection = useCallback(async () => {
    try {
      const raw = await apiJson<unknown>("/health", { baseUrl: serverUrl });
      const health = healthSchema.parse(raw);
      return {
        ok: health.status === "ok",
        message: health.ollama ? "API ok · Ollama reachable" : "API ok · Ollama offline",
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Connection failed";
      return { ok: false, message };
    }
  }, [serverUrl]);

  const value = useMemo(
    () => ({ serverUrl, setServerUrl, loading, testConnection }),
    [serverUrl, setServerUrl, loading, testConnection],
  );

  return (
    <ServerSettingsContext.Provider value={value}>{children}</ServerSettingsContext.Provider>
  );
}

export function useServerSettings(): ServerSettingsContextValue {
  const ctx = useContext(ServerSettingsContext);
  if (!ctx) {
    throw new Error("useServerSettings must be used within ServerSettingsProvider");
  }
  return ctx;
}

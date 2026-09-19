import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useServerSettings } from "@/contexts/ServerSettingsContext";

export default function SettingsScreen() {
  const { serverUrl, setServerUrl, loading, testConnection } = useServerSettings();
  const [draft, setDraft] = useState(serverUrl);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    setDraft(serverUrl);
  }, [serverUrl]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Home server URL</Text>
      <Text style={styles.hint}>
        API port is 8000 (FastAPI), not 8081 (Expo). Use your PC LAN IP from the Expo terminal, e.g.
        http://192.168.1.45:8000 — then tap Save before using Pantry.
      </Text>
      <TextInput
        style={styles.input}
        value={draft}
        onChangeText={setDraft}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />

      <Pressable
        style={styles.btn}
        onPress={() => {
          void (async () => {
            await setServerUrl(draft);
            setResult("Saved.");
          })();
        }}
      >
        <Text style={styles.btnText}>Save</Text>
      </Pressable>

      <Pressable
        style={[styles.btn, styles.btnSecondary]}
        onPress={() => {
          void (async () => {
            setTesting(true);
            setResult(null);
            const out = await testConnection();
            setResult(out.ok ? `✓ ${out.message}` : `✗ ${out.message}`);
            setTesting(false);
          })();
        }}
      >
        <Text style={styles.btnSecondaryText}>{testing ? "Testing…" : "Test connection"}</Text>
      </Pressable>

      {result ? <Text style={styles.result}>{result}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 16, fontWeight: "600" },
  hint: { color: "#666", fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  btn: {
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "600" },
  btnSecondary: { backgroundColor: "#e5e7eb" },
  btnSecondaryText: { fontWeight: "600" },
  result: { marginTop: 8, fontSize: 15 },
});

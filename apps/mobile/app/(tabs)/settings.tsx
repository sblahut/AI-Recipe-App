import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";

import { AppButton } from "@/components/ui/AppButton";
import { AppTextField } from "@/components/ui/AppTextField";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { spacing, typography } from "@/constants/theme";
import { useServerSettings } from "@/contexts/ServerSettingsContext";
import { useAppTheme } from "@/hooks/useAppTheme";

export default function SettingsScreen() {
  const { colors } = useAppTheme();
  const { serverUrl, setServerUrl, loading, testConnection } = useServerSettings();
  const [draft, setDraft] = useState(serverUrl);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setDraft(serverUrl);
    });
  }, [serverUrl]);

  if (loading) {
    return <Screen loading />;
  }

  const resultColor =
    result?.startsWith("✓") === true
      ? colors.success
      : result?.startsWith("✗") === true
        ? colors.danger
        : colors.textSecondary;

  return (
    <Screen scroll>
      <Text style={[styles.lead, { color: colors.textMuted }]}>
        Connect to your home PC running the recipe API on port 8000 (not Metro on 8081).
      </Text>

      <Card>
        <AppTextField
          label="Home server URL"
          hint="Example: http://192.168.1.45:8000 — same Wi‑Fi as this phone."
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { ...typography.caption, lineHeight: 20 },
  result: { ...typography.body, marginTop: spacing.xs },
});

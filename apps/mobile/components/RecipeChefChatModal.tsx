import { Ionicons } from "@expo/vector-icons";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppButton } from "@/components/ui/AppButton";
import { AppTextField } from "@/components/ui/AppTextField";
import { Card } from "@/components/ui/Card";
import { spacing, typography } from "@/constants/theme";
import { useAppTheme } from "@/hooks/useAppTheme";
import { apiFetch, apiJson } from "@/lib/api";
import {
  recipeChatSendResponseSchema,
  type GeneratedRecipe,
  type RecipeChatMessage,
} from "@/lib/schemas";

export type RecipeChefChatContext = {
  usePantry: boolean;
  usePublixBogo: boolean;
  ideaQuery: string;
  count: number;
  constraints?: string;
  prioritizeExpiring: boolean;
  publixStoreNumber?: number;
  persistGenerated: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  serverUrl: string;
  context: RecipeChefChatContext;
  sessionId: number | null;
  messages: RecipeChatMessage[];
  onThreadUpdate: (sessionId: number, messages: RecipeChatMessage[]) => void;
  onNewConversation: () => void;
  onRecipes: (recipes: GeneratedRecipe[]) => void;
  onFavoritesChanged?: () => void;
  onOpenRecipe: (recipe: GeneratedRecipe) => void;
};

type ListItem =
  | { kind: "message"; message: RecipeChatMessage }
  | { kind: "pending_user"; content: string }
  | { kind: "thinking" };

export function RecipeChefChatModal({
  visible,
  onClose,
  serverUrl,
  context,
  sessionId,
  messages,
  onThreadUpdate,
  onNewConversation,
  onRecipes,
  onFavoritesChanged,
  onOpenRecipe,
}: Props) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ListItem>>(null);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingUserText, setPendingUserText] = useState<string | null>(null);

  const listData = useMemo((): ListItem[] => {
    const items: ListItem[] = messages.map((message) => ({ kind: "message", message }));
    if (pendingUserText) {
      items.push({ kind: "pending_user", content: pendingUserText });
    }
    if (sending) {
      items.push({ kind: "thinking" });
    }
    return items;
  }, [messages, pendingUserText, sending]);

  const scrollToEnd = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  };

  const startNewConversation = async () => {
    if (sessionId != null) {
      try {
        await apiFetch(`/recipes/chat/sessions/${sessionId}`, {
          baseUrl: serverUrl,
          method: "DELETE",
        });
      } catch {
        // Local reset still applies if delete fails.
      }
    }
    setDraft("");
    setError(null);
    setPendingUserText(null);
    setSending(false);
    onNewConversation();
  };

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || sending) {
      return;
    }
    setSending(true);
    setError(null);
    setDraft("");
    setPendingUserText(text);
    scrollToEnd();
    try {
      const raw = await apiJson<unknown>("/recipes/chat/send", {
        baseUrl: serverUrl,
        method: "POST",
        body: JSON.stringify({
          ...(sessionId != null ? { session_id: sessionId } : {}),
          message: text,
          use_pantry: context.usePantry,
          use_publix_bogo: context.usePublixBogo,
          ...(context.ideaQuery.trim() ? { query: context.ideaQuery.trim() } : {}),
          count: context.count,
          prioritize_expiring: context.prioritizeExpiring,
          persist_generated: context.persistGenerated,
          ...(context.constraints ? { constraints: context.constraints } : {}),
          ...(context.publixStoreNumber != null
            ? { publix_store_number: context.publixStoreNumber }
            : {}),
        }),
      });
      const parsed = recipeChatSendResponseSchema.parse(raw);
      onThreadUpdate(parsed.session_id, parsed.messages);
      setPendingUserText(null);
      if (parsed.recipes.length > 0) {
        onRecipes(parsed.recipes);
      }
      if (parsed.saved_recipes.length > 0) {
        onFavoritesChanged?.();
      }
      scrollToEnd();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send message");
      setDraft(text);
      setPendingUserText(null);
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item.kind === "thinking") {
      return (
        <View style={[styles.bubbleRow, styles.bubbleRowAssistant]}>
          <View
            style={[
              styles.bubble,
              styles.thinkingBubble,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.thinkingText, { color: colors.textMuted }]}>Chef is thinking…</Text>
          </View>
        </View>
      );
    }

    const isUser = item.kind === "pending_user" || item.message.role === "user";
    const content = item.kind === "pending_user" ? item.content : item.message.content;
    const recipes = item.kind === "message" ? item.message.recipes : [];

    return (
      <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant]}>
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: isUser ? colors.primaryMuted : colors.surface,
              borderColor: colors.border,
              opacity: item.kind === "pending_user" ? 0.85 : 1,
            },
          ]}
        >
          <Text style={[styles.bubbleText, { color: colors.text }]}>{content}</Text>
          {recipes.length > 0 ? (
            <View style={styles.recipeList}>
              {recipes.map((recipe, index) => (
                <Pressable
                  key={`${recipe.title}-${index}`}
                  onPress={() => onOpenRecipe(recipe)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                >
                  <Card style={styles.recipeCard}>
                    <Text style={[styles.recipeTitle, { color: colors.text }]}>{recipe.title}</Text>
                    <Text style={[styles.recipeMeta, { color: colors.textMuted }]}>
                      Tap to view ingredients and steps
                    </Text>
                  </Card>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.fill, { backgroundColor: colors.background, paddingTop: insets.top }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close chef chat">
            <Ionicons name="close" size={26} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Chef chat</Text>
          <Pressable
            onPress={() => void startNewConversation()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="New conversation"
          >
            <Text style={[styles.newChat, { color: colors.primary }]}>New</Text>
          </Pressable>
        </View>

        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Ask follow-ups, refine ideas, or request new recipes. Pantry and BOGO toggles from the Recipes tab
          apply to each message.
        </Text>

        <FlatList
          ref={listRef}
          data={listData}
          keyExtractor={(item, index) => {
            if (item.kind === "message") {
              return `msg-${item.message.id}`;
            }
            if (item.kind === "pending_user") {
              return "pending-user";
            }
            return `thinking-${index}`;
          }}
          renderItem={renderItem}
          contentContainerStyle={styles.listPad}
          onContentSizeChange={scrollToEnd}
          ListEmptyComponent={
            !sending ? (
              <Text style={[styles.empty, { color: colors.textMuted }]}>
                Start with what you want to cook, or ask to improve a previous suggestion.
              </Text>
            ) : null
          }
        />

        {error ? (
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        ) : null}

        <View
          style={[
            styles.composer,
            { borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, spacing.sm) },
          ]}
        >
          <View style={styles.composerField}>
            <AppTextField
              value={draft}
              onChangeText={setDraft}
              placeholder="Message the chef…"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!sending}
            />
          </View>
          <AppButton
            label="Send"
            loading={sending}
            onPress={() => void sendMessage()}
            disabled={sending || !draft.trim()}
            compact
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    ...typography.headline,
  },
  newChat: {
    ...typography.button,
  },
  hint: {
    ...typography.caption,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  listPad: {
    padding: spacing.lg,
    gap: spacing.md,
    flexGrow: 1,
  },
  empty: {
    ...typography.body,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  bubbleRow: {
    flexDirection: "row",
  },
  bubbleRowUser: {
    justifyContent: "flex-end",
  },
  bubbleRowAssistant: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "92%",
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  thinkingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  thinkingText: {
    ...typography.caption,
  },
  bubbleText: {
    ...typography.body,
  },
  recipeList: {
    gap: spacing.sm,
  },
  recipeCard: {
    padding: spacing.sm,
  },
  recipeTitle: {
    ...typography.headline,
  },
  recipeMeta: {
    ...typography.caption,
    marginTop: 2,
  },
  errorText: {
    ...typography.caption,
    paddingHorizontal: spacing.lg,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  composerField: {
    flex: 1,
  },
});

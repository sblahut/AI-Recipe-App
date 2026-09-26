import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { MODAL_BACKDROP_COLOR } from "@/components/ui/DismissibleModal";
import { apiJson } from "@/lib/api";
import { formatModelDisplayText } from "@/lib/formatModelDisplayText";
import { fetchRecipeChatSession, fetchRecipeChatSessions } from "@/lib/recipeChatSessions";
import {
  recipeChatSendResponseSchema,
  type GeneratedRecipe,
  type RecipeChatMessage,
  type RecipeChatSessionSummary,
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
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historySessions, setHistorySessions] = useState<RecipeChatSessionSummary[]>([]);
  const [loadingSessionId, setLoadingSessionId] = useState<number | null>(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const sessions = await fetchRecipeChatSessions(serverUrl);
      setHistorySessions(sessions);
    } catch (e) {
      setHistoryError(e instanceof Error ? e.message : "Could not load past chats");
      setHistorySessions([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [serverUrl]);

  useEffect(() => {
    if (visible && historyOpen) {
      void loadHistory();
    }
  }, [visible, historyOpen, loadHistory]);

  useEffect(() => {
    if (!visible) {
      setHistoryOpen(false);
    }
  }, [visible]);

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

  const startNewConversation = () => {
    setDraft("");
    setError(null);
    setPendingUserText(null);
    setSending(false);
    onNewConversation();
  };

  const openHistory = () => {
    setHistoryOpen(true);
  };

  const closeHistory = () => {
    setHistoryOpen(false);
    setHistoryError(null);
  };

  const selectHistorySession = async (id: number) => {
    if (loadingSessionId != null) {
      return;
    }
    setLoadingSessionId(id);
    setHistoryError(null);
    try {
      const detail = await fetchRecipeChatSession(serverUrl, id);
      onThreadUpdate(detail.id, detail.messages);
      setDraft("");
      setError(null);
      setPendingUserText(null);
      closeHistory();
      scrollToEnd();
    } catch (e) {
      setHistoryError(e instanceof Error ? e.message : "Could not open chat");
    } finally {
      setLoadingSessionId(null);
    }
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
    const rawContent = item.kind === "pending_user" ? item.content : item.message.content;
    const content =
      item.kind === "pending_user" ? rawContent : formatModelDisplayText(rawContent);
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
          <Text style={[styles.bubbleText, { color: colors.text }]} selectable>
            {content}
          </Text>
          {recipes.length > 0 ? (
            <View style={styles.recipeList}>
              {recipes.map((recipe, index) => (
                <Pressable
                  key={`${recipe.title}-${index}`}
                  onPress={() => onOpenRecipe(recipe)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                >
                  <Card style={styles.recipeCard}>
                    <Text style={[styles.recipeTitle, { color: colors.text }]}>
                      {formatModelDisplayText(recipe.title)}
                    </Text>
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
          <View style={styles.headerLeading}>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close chef chat"
            >
              <Ionicons name="close" size={26} color={colors.text} />
            </Pressable>
            <Pressable
              onPress={openHistory}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Past chef chats"
            >
              <Ionicons name="menu" size={26} color={colors.text} />
            </Pressable>
          </View>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            Chef chat
          </Text>
          <Pressable
            onPress={startNewConversation}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="New conversation"
          >
            <Text style={[styles.newChat, { color: colors.primary }]}>New</Text>
          </Pressable>
        </View>

        {historyOpen ? (
          <View style={styles.historyOverlay}>
            <View
              style={[
                styles.historyPanel,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  paddingTop: insets.top,
                  paddingBottom: Math.max(insets.bottom, spacing.md),
                },
              ]}
            >
              <View style={[styles.historyHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.historyTitle, { color: colors.text }]}>Past chats</Text>
                <Pressable
                  onPress={closeHistory}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Close past chats panel"
                >
                  <Ionicons name="close" size={24} color={colors.text} />
                </Pressable>
              </View>
              {historyLoading ? (
                <View style={styles.historyCentered}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : historyError ? (
                <Text style={[styles.historyError, { color: colors.danger }]}>{historyError}</Text>
              ) : historySessions.length === 0 ? (
                <Text style={[styles.historyEmpty, { color: colors.textMuted }]}>
                  No saved chats yet. Tap New to start another thread — your current chat stays on the
                  server.
                </Text>
              ) : (
                <FlatList
                  data={historySessions}
                  keyExtractor={(item) => `session-${item.id}`}
                  contentContainerStyle={styles.historyList}
                  renderItem={({ item }) => {
                    const isActive = sessionId === item.id;
                    const isLoading = loadingSessionId === item.id;
                    const when = new Date(item.updated_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    });
                    return (
                      <Pressable
                        onPress={() => void selectHistorySession(item.id)}
                        disabled={isLoading}
                        style={({ pressed }) => [
                          styles.historyRow,
                          {
                            borderColor: colors.border,
                            backgroundColor: isActive ? colors.primaryMuted : colors.surface,
                            opacity: pressed || isLoading ? 0.85 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[styles.historyPreview, { color: colors.text }]}
                          numberOfLines={2}
                        >
                          {formatModelDisplayText(item.preview)}
                        </Text>
                        <Text style={[styles.historyMeta, { color: colors.textMuted }]}>
                          {when} · {item.message_count} messages
                          {isActive ? " · current" : ""}
                        </Text>
                        {isLoading ? (
                          <ActivityIndicator
                            style={styles.historyRowSpinner}
                            color={colors.primary}
                            size="small"
                          />
                        ) : null}
                      </Pressable>
                    );
                  }}
                />
              )}
            </View>
            <Pressable
              style={[styles.historyBackdrop, { backgroundColor: MODAL_BACKDROP_COLOR }]}
              onPress={closeHistory}
              accessibilityRole="button"
              accessibilityLabel="Close past chats"
            />
          </View>
        ) : null}

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
    gap: spacing.sm,
  },
  headerLeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerTitle: {
    ...typography.headline,
    flex: 1,
    textAlign: "center",
  },
  historyOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
    flexDirection: "row",
  },
  historyBackdrop: {
    flex: 1,
  },
  historyPanel: {
    flex: 1,
    maxWidth: 360,
    borderRightWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  historyTitle: {
    ...typography.headline,
  },
  historyList: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  historyRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.md,
    gap: spacing.xs,
  },
  historyPreview: {
    ...typography.body,
  },
  historyMeta: {
    ...typography.caption,
  },
  historyRowSpinner: {
    marginTop: spacing.xs,
  },
  historyCentered: {
    padding: spacing.xl,
    alignItems: "center",
  },
  historyEmpty: {
    ...typography.body,
    padding: spacing.lg,
  },
  historyError: {
    ...typography.caption,
    padding: spacing.lg,
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

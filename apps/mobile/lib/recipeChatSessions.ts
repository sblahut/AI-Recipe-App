import { z } from "zod";

import { apiJson } from "@/lib/api";
import {
  recipeChatSessionDetailSchema,
  recipeChatSessionSummarySchema,
  type RecipeChatSessionDetail,
  type RecipeChatSessionSummary,
} from "@/lib/schemas";

export async function fetchRecipeChatSessions(baseUrl: string): Promise<RecipeChatSessionSummary[]> {
  const raw = await apiJson<unknown>("/recipes/chat/sessions", { baseUrl });
  return z.array(recipeChatSessionSummarySchema).parse(raw);
}

export async function fetchRecipeChatSession(
  baseUrl: string,
  sessionId: number,
): Promise<RecipeChatSessionDetail> {
  const raw = await apiJson<unknown>(`/recipes/chat/sessions/${sessionId}`, { baseUrl });
  return recipeChatSessionDetailSchema.parse(raw);
}

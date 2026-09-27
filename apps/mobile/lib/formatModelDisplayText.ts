/** Plain, readable text from LLM output (markdown / escaped newlines). */
export function formatModelDisplayText(text: string): string {
  let cleaned = text.trim();
  if (!cleaned) {
    return cleaned;
  }

  if (cleaned.includes("\\n")) {
    cleaned = cleaned.replace(/\\n/g, "\n");
  }
  if (cleaned.includes("\\t")) {
    cleaned = cleaned.replace(/\\t/g, "\t");
  }

  cleaned = cleaned.replace(/```(?:json)?/gi, "").replace(/```/g, "");
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1");
  cleaned = cleaned.replace(/__([^_]+)__/g, "$1");
  cleaned = cleaned.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1");
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, "");
  cleaned = cleaned.replace(/^\s*[-*]\s+/gm, "• ");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
}

import { ref, watch } from "vue";
import { createConversationSession } from "./conversation";
import { DEFAULT_GEMINI_MODEL } from "@/features/rfl/gemini";
export const advisorApiKey = ref("");
export const advisorModel = ref(DEFAULT_GEMINI_MODEL);
export const advisorConnection = ref<"unverified" | "verified" | "answered">(
  "unverified",
);
watch(
  [advisorApiKey, advisorModel],
  () => {
    advisorConnection.value = "unverified";
  },
  { flush: "sync" },
);
export const advisorConversation = createConversationSession();
export const conversationRevision = ref(0);
export const advisorDrawer = ref<{
  question: string;
  evidence: Record<string, unknown>;
} | null>(null);
export function openAdvisor(
  question: string,
  evidence: Record<string, unknown>,
) {
  advisorDrawer.value = { question, evidence };
}

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from "vue";
import type { buildEvidence } from "./presentation";
const props = defineProps<{
  evidence: ReturnType<typeof buildEvidence>;
  disabled?: boolean;
}>();
const question = ref("");
const token = ref("");
const answer = ref("");
const error = ref("");
const loading = ref(false);
let controller: AbortController | undefined;
watch(
  () => props.evidence,
  () => {
    controller?.abort();
    answer.value = "";
    error.value = "";
    loading.value = false;
  },
);
onBeforeUnmount(() => controller?.abort());
async function ask(prompt?: string) {
  if (loading.value || props.disabled) return;
  if (prompt) question.value = prompt;
  if (!question.value.trim()) return;
  controller?.abort();
  const active = new AbortController();
  controller = active;
  loading.value = true;
  error.value = "";
  answer.value = "";
  try {
    const response = await fetch("/api/rfl-advisor", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify({
        question: question.value,
        evidence: props.evidence,
      }),
      signal: AbortSignal.any([active.signal, AbortSignal.timeout(25000)]),
    });
    if (!response.headers.get("content-type")?.includes("application/json"))
      throw new Error(
        "AI service is not running. Start the advisor API or configure it on your hosting service. Your calculated recommendations still work.",
      );
    const data = await response.json();
    if (!response.ok)
      throw new Error(
        data.error || "AI is unavailable. Please try again later.",
      );
    if (typeof data.answer !== "string")
      throw new Error("AI returned an invalid response.");
    if (controller === active) answer.value = data.answer;
  } catch (e) {
    if (controller === active && !active.signal.aborted)
      error.value = e instanceof Error ? e.message : "AI is unavailable.";
  } finally {
    if (controller === active) loading.value = false;
  }
}
</script>
<template>
  <section class="advisor-chat panel" aria-labelledby="ai-title">
    <div class="section-heading">
      <div>
        <p class="eyebrow">YOUR SECOND OPINION</p>
        <h2 id="ai-title">Ask your RFL advisor</h2>
      </div>
      <span class="ai-badge">Gemini AI</span>
    </div>
    <p class="section-intro">
      Get an explanation grounded in your roster, RFL scoring, and the
      recommendations above.
    </p>
    <div class="prompt-buttons">
      <button
        :disabled="loading || disabled"
        @click="
          ask(
            'Explain the best lineup changes for Dart Vader this week, including uncertainties.',
          )
        "
      >
        Explain my lineup</button
      ><button
        :disabled="loading || disabled"
        @click="
          ask(
            'Which available waiver pickup helps my team most, and who would I drop?',
          )
        "
      >
        Prioritize waivers</button
      ><button
        :disabled="loading || disabled"
        @click="
          ask(
            'How do return yards change the value of my players? Distinguish estimates from projections.',
          )
        "
      >
        Find return value
      </button>
    </div>
    <form @submit.prevent="ask()">
      <label for="advisor-question">Your question</label
      ><textarea
        id="advisor-question"
        v-model="question"
        maxlength="1500"
        rows="3"
        placeholder="Who should I start in superflex, and why?"
        :disabled="loading || disabled"
      />
      <div class="chat-actions">
        <span>{{ question.length }} / 1500</span
        ><button
          class="primary-button"
          :disabled="loading || disabled || !question.trim()"
        >
          {{ loading ? "Thinking…" : "Ask advisor ↗" }}
        </button>
      </div>
    </form>
    <details class="connection-details">
      <summary>Connect private AI access</summary>
      <p>
        Enter your advisor access token configured by the site owner. This is
        not a Gemini API key. It stays in memory for this visit.
      </p>
      <label for="advisor-token">Advisor access token</label
      ><input
        id="advisor-token"
        v-model="token"
        type="password"
        autocomplete="off"
        placeholder="Private access token"
      />
      <p>
        AI requires a configured server and is subject to free-tier limits.
        Calculated recommendations are always available without AI.
      </p>
    </details>
    <p v-if="loading" role="status" class="ai-message">
      Reviewing your league evidence…
    </p>
    <p v-if="error" role="alert" class="error-banner">{{ error }}</p>
    <div v-if="answer" class="ai-answer" aria-live="polite">
      <p class="eyebrow">AI EXPLANATION</p>
      <p>{{ answer }}</p>
      <small
        >Based on the displayed snapshot. Check injuries and lineup locks in
        Sleeper.</small
      >
    </div>
  </section>
</template>

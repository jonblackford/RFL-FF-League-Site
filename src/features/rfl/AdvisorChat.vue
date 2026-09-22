<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from "vue";
import { requestGeminiAnswer } from "./gemini";
const props = defineProps<{
  evidence: Record<string, unknown>;
  disabled?: boolean;
}>();
const question = ref("");
const apiKey = ref("");
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
    if (!apiKey.value.trim())
      throw new Error("Enter your Gemini API key below before asking the advisor.");
    answer.value = await requestGeminiAnswer(
      apiKey.value.trim(),
      question.value,
      props.evidence,
      { signal: AbortSignal.any([active.signal, AbortSignal.timeout(60000)]) },
    );
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
      <summary>Connect Gemini AI</summary>
      <p>
        Enter your own Google AI Studio API key. It is used directly from this
        browser tab and is not saved by this site.
      </p>
      <label for="advisor-api-key">Gemini API key</label
      ><input
        id="advisor-api-key"
        v-model="apiKey"
        type="password"
        autocomplete="off"
        placeholder="Paste your Gemini API key"
      />
      <p>
        The key remains in memory for this visit and is sent only to Google.
        Use a restricted key and keep billing disabled if you want a free setup.
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

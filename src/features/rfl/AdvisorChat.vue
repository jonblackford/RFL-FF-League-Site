<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from "vue";
import { renderMarkdown } from "@/lib/markdown";
import {
  firebaseAiEnabled,
  requestFirebaseAnswer,
} from "../advisor/firebaseAi";
import { advisorAnalysisModes } from "../advisor/intelligence";
import { requestGeminiAnswer, checkGeminiConnection } from "./gemini";
import {
  advisorApiKey,
  advisorConnection,
  advisorModel,
  advisorConversation,
  conversationRevision,
} from "../advisor/aiSession";
const props = defineProps<{
  evidence: Record<string, unknown>;
  disabled?: boolean;
  initialQuestion?: string;
}>();
const question = ref(props.initialQuestion || ""),
  error = ref(""),
  loading = ref(false);
const checking = ref(false);
const key = computed(() =>
  [
    props.evidence.provider || "sleeper",
    props.evidence.leagueId,
    props.evidence.season,
    props.evidence.rosterId ?? props.evidence.team,
    props.evidence.week,
  ].join(":"),
);
const messages = computed(() => {
  void conversationRevision.value;
  return advisorConversation.messages(key.value);
});
let controller: AbortController | undefined;
function cancel() {
  controller?.abort();
  controller = undefined;
  advisorConversation.cancel();
  loading.value = false;
  checking.value = false;
  conversationRevision.value++;
}
watch(
  () => props.initialQuestion,
  (v) => {
    if (v) question.value = v;
  },
);
watch(
  () => [key.value, props.evidence.fetchedAt],
  () => {
    cancel();
    error.value = "";
  },
);
watch([advisorApiKey, advisorModel], () => {
  cancel();
  error.value = "";
});
onBeforeUnmount(cancel);
async function checkConnection() {
  if (checking.value || loading.value) return;
  const active = new AbortController();
  controller = active;
  checking.value = true;
  error.value = "";
  try {
    await checkGeminiConnection(advisorApiKey.value, {
      model: advisorModel.value,
      signal: AbortSignal.any([active.signal, AbortSignal.timeout(15000)]),
    });
    if (controller === active && !active.signal.aborted)
      advisorConnection.value = "verified";
  } catch (e) {
    if (controller === active && !active.signal.aborted) {
      advisorConnection.value = "unverified";
      error.value =
        e instanceof Error ? e.message : "Unable to check Google connection.";
    }
  } finally {
    if (controller === active) checking.value = false;
  }
}
function reset() {
  cancel();
  advisorConversation.reset(key.value);
  conversationRevision.value++;
}
async function ask(prompt?: string) {
  if (loading.value || checking.value || props.disabled) return;
  if (prompt) question.value = prompt;
  if (!question.value.trim()) return;
  if (!firebaseAiEnabled && !advisorApiKey.value.trim()) {
    error.value = "Connect your Gemini API key below to ask the advisor.";
    return;
  }
  const active = new AbortController();
  controller = active;
  loading.value = true;
  error.value = "";
  const selected = key.value;
  try {
    const pending = advisorConversation.ask(
      selected,
      question.value,
      Number(props.evidence.fetchedAt) || Date.now(),
      (history) => {
        const options = {
          history,
          model: advisorModel.value,
          signal: AbortSignal.any([active.signal, AbortSignal.timeout(60000)]),
        };
        return firebaseAiEnabled
          ? requestFirebaseAnswer(question.value, props.evidence, options)
          : requestGeminiAnswer(
              advisorApiKey.value.trim(),
              question.value,
              props.evidence,
              options,
            );
      },
    );
    conversationRevision.value++;
    await pending;
    if (controller === active) {
      question.value = "";
      advisorConnection.value = "answered";
    }
  } catch (e) {
    if (controller === active && !active.signal.aborted)
      error.value = e instanceof Error ? e.message : "AI unavailable";
  } finally {
    if (controller === active) loading.value = false;
    conversationRevision.value++;
  }
}
</script>
<template>
  <section class="ad-chat" aria-label="Fantasy advisor conversation">
    <p class="ad-muted">
      {{ evidence.team }} · Week {{ evidence.week }} · Answers use this league's
      displayed evidence.
    </p>
    <div class="ad-actions">
      <button
        v-for="mode in advisorAnalysisModes"
        :key="mode.id"
        :disabled="loading || disabled"
        @click="ask(mode.question)"
      >
        {{ mode.label }}
      </button>
      <button @click="reset">New conversation</button>
    </div>
    <div class="ad-messages" aria-live="polite">
      <article
        v-for="(m, i) in messages"
        :key="i"
        :class="['ad-message', m.role]"
      >
        <strong>{{ m.role === "user" ? "You" : "Advisor" }}</strong>
        <div
          v-if="m.role === 'model'"
          class="ad-answer"
          v-html="renderMarkdown(m.text)"
        ></div>
        <p v-else>{{ m.text }}</p>
        <small v-if="m.role === 'model'"
          >Snapshot {{ new Date(m.fetchedAt).toLocaleString()
          }}{{
            m.fetchedAt !== evidence.fetchedAt
              ? " · Previous snapshot — refresh your question for current evidence."
              : ""
          }}</small
        >
      </article>
    </div>
    <form @submit.prevent="ask()">
      <label for="advisor-question">{{
        messages.length ? "Ask a follow-up" : "Your question"
      }}</label
      ><textarea
        id="advisor-question"
        v-model="question"
        maxlength="1500"
        rows="3"
        placeholder="Compare my options and explain the trade-offs…"
        :disabled="loading || disabled"
      />
      <div class="ad-row">
        <small>{{ question.length }} / 1500</small
        ><button v-if="loading" type="button" @click="cancel">Cancel</button
        ><button
          v-else
          class="ad-primary"
          :disabled="disabled || !question.trim()"
        >
          Ask advisor ↗
        </button>
      </div>
    </form>
    <p v-if="loading" role="status">Reviewing league evidence…</p>
    <p v-if="error" role="alert" class="ad-error">
      {{ error }} You can retry your question.
    </p>
    <p v-if="firebaseAiEnabled" class="ad-muted">
      Uses RFL Agent's Google AI connection. No personal API key is needed. Free
      usage limits apply.
    </p>
    <details
      v-else
      :open="!advisorApiKey || advisorConnection === 'unverified'"
      class="ad-connection"
    >
      <summary>
        {{
          !advisorApiKey
            ? "Connect Gemini AI"
            : advisorConnection === "answered"
              ? "Google AI responded this visit"
              : advisorConnection === "verified"
                ? "Google connection verified"
                : "Key entered — connection not verified"
        }}
      </summary>
      <label for="advisor-api-key"
        >Gemini API key<input
          id="advisor-api-key"
          v-model="advisorApiKey"
          type="password"
          autocomplete="off"
          placeholder="Your Google AI Studio key" /></label
      ><label for="advisor-model"
        >Model<input
          id="advisor-model"
          v-model="advisorModel"
          placeholder="Gemini model ID"
      /></label>
      <button
        type="button"
        :disabled="!advisorApiKey.trim() || loading || checking"
        @click="checkConnection"
      >
        {{ checking ? "Checking Google…" : "Check Google connection" }}
      </button>
      <p v-if="advisorConnection === 'verified'" role="status" class="ad-muted">
        Google accepted the key and model lookup. Generation quota is checked
        when you ask a question.
      </p>
      <p class="ad-muted">
        Sent directly to Google; the key stays in memory for this visit. Use a
        project without billing for a free setup. Provider quotas and model
        availability apply. No request is sent until you enter a key and check
        the connection or ask a question.
        <a
          href="https://aistudio.google.com/api-keys"
          target="_blank"
          rel="noopener noreferrer"
          >Get a Google AI Studio key</a
        >.
      </p>
      <button
        v-if="advisorApiKey"
        @click="
          cancel();
          advisorApiKey = '';
        "
      >
        Disconnect
      </button>
    </details>
  </section>
</template>
<style scoped>
.ad-chat {
  font-size: 14px;
  line-height: 1.6;
}
.ad-chat label {
  display: block;
  font-size: 12px;
  font-weight: 650;
  margin-top: 12px;
}
.ad-chat textarea,
.ad-chat input {
  display: block;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--ad-line, #cbd5e1);
  background: var(--ad-paper, transparent);
  color: inherit;
  padding: 10px;
  border-radius: 8px;
  margin: 6px 0 12px;
}
.ad-chat button {
  border: 1px solid var(--ad-line, #cbd5e1);
  padding: 7px 12px;
  border-radius: 7px;
  font-size: 12px;
}
.ad-chat .ad-actions {
  margin: 14px 0;
}
.ad-messages {
  max-height: 430px;
  overflow: auto;
}
.ad-message {
  padding: 14px;
  border-radius: 10px;
  background: var(--ad-bg, #f1f5f9);
  margin: 10px 0;
}
.ad-message.user {
  border-left: 3px solid #b62c43;
}
.ad-message p {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.ad-answer {
  line-height: 1.65;
  overflow-wrap: anywhere;
}
.ad-answer :deep(p) {
  white-space: normal;
  margin: 0.65em 0;
}
.ad-answer :deep(h1),
.ad-answer :deep(h2),
.ad-answer :deep(h3),
.ad-answer :deep(h4) {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.4;
  margin: 1.2em 0 0.45em;
}
.ad-answer :deep(ul),
.ad-answer :deep(ol) {
  padding-left: 1.5em;
  margin: 0.65em 0;
}
.ad-answer :deep(ul) { list-style: disc; }
.ad-answer :deep(ol) { list-style: decimal; }
.ad-answer :deep(li) { margin: 0.5em 0; }
.ad-answer :deep(strong) { font-weight: 700; }
.ad-answer :deep(code) {
  font-size: 0.9em;
  background: var(--ad-line, #e2e8f0);
  padding: 0.1em 0.3em;
  border-radius: 4px;
}
.ad-answer :deep(pre) { overflow-x: auto; padding: 0.75em; }
.ad-answer :deep(a) { text-decoration: underline; }
.ad-answer :deep(blockquote) {
  border-left: 3px solid var(--ad-line, #cbd5e1);
  padding-left: 1em;
  margin: 0.75em 0;
}
.ad-message small {
  font-size: 10px;
  color: var(--ad-muted, #64748b);
}
.ad-connection {
  border-top: 1px solid var(--ad-line, #cbd5e1);
  margin-top: 18px;
  padding-top: 14px;
}
.ad-connection summary {
  cursor: pointer;
  font-size: 12px;
}
.ad-chat button:disabled {
  opacity: 0.5;
}
</style>

<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { useStore } from "@/store/store";
import { advisorDrawer } from "./aiSession";
import AdvisorChat from "@/features/rfl/AdvisorChat.vue";
import "./advisor.css";
const dialog = ref<HTMLDialogElement | null>(null),
  store = useStore();
watch(advisorDrawer, async (v) => {
  await nextTick();
  if (v && !dialog.value?.open) dialog.value?.showModal();
  if (!v) dialog.value?.close();
});
watch(
  () => store.currentLeagueId,
  () => {
    advisorDrawer.value = null;
  },
);
</script>
<template>
  <Teleport to="body"
    ><dialog
      ref="dialog"
      class="ad-drawer ad-dashboard"
      aria-labelledby="advisor-drawer-title"
      @cancel="advisorDrawer = null"
      @close="advisorDrawer = null"
    >
      <template v-if="advisorDrawer"
        ><header class="ad-row">
          <div>
            <p class="ad-kicker">LEAGUE INTELLIGENCE</p>
            <h2 id="advisor-drawer-title">Your fantasy advisor</h2>
          </div>
          <button
            autofocus
            aria-label="Close advisor"
            @click="advisorDrawer = null"
          >
            Close ×
          </button>
        </header>
        <AdvisorChat
          :evidence="advisorDrawer.evidence"
          :initial-question="advisorDrawer.question"
      /></template></dialog
  ></Teleport>
</template>
<style scoped>
.ad-drawer {
  position: fixed;
  inset: 0 0 0 auto;
  height: 100dvh;
  max-height: 100dvh;
  width: min(560px, 100%);
  max-width: 100%;
  margin: 0;
  border: 0;
  border-left: 1px solid var(--ad-line);
  border-radius: 0;
  padding: 24px;
  overflow-y: auto;
  box-shadow: -15px 0 80px #0003;
}
.ad-drawer::backdrop {
  background: #0c1c3380;
}
.ad-drawer > header {
  margin-bottom: 20px;
}
</style>

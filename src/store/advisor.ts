import { defineStore } from "pinia";
import { ref, shallowRef } from "vue";
import { loadLeagueSnapshot } from "@/features/rfl/data";
import type { AdvisorSelection, RflSnapshot } from "@/features/rfl/types";
export const useAdvisorStore = defineStore("advisor", () => {
  const selection = ref<AdvisorSelection | null>(null);
  const snapshot = shallowRef<RflSnapshot | null>(null);
  const loading = ref(false),
    error = ref("");
  let generation = 0;
  let controller: AbortController | undefined;
  async function select(
    next: AdvisorSelection,
    loader = loadLeagueSnapshot,
    force = false,
  ) {
    const changed = JSON.stringify(selection.value) !== JSON.stringify(next);
    const current = ++generation;
    controller?.abort();
    controller = new AbortController();
    selection.value = { ...next };
    if (changed) snapshot.value = null;
    loading.value = true;
    error.value = "";
    try {
      const result = await loader(next, controller.signal, force);
      if (current === generation) snapshot.value = result;
    } catch (e) {
      if (current === generation)
        error.value = e instanceof Error ? e.message : "Unable to load league";
    } finally {
      if (current === generation) loading.value = false;
    }
  }
  function clear() {
    generation++;
    controller?.abort();
    snapshot.value = null;
    selection.value = null;
    loading.value = false;
    error.value = "";
  }
  async function refresh() {
    if (selection.value)
      await select(selection.value, loadLeagueSnapshot, true);
  }
  return { selection, snapshot, loading, error, select, refresh, clear };
});

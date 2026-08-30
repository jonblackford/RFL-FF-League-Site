<script setup lang="ts">
import { getLeagueCount } from "@/api/api";
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import Separator from "@/components/ui/separator/Separator.vue";
import PageContainer from "@/components/layout/PageContainer.vue";
import PageHeader from "@/components/layout/PageHeader.vue";
import SectionHeader from "@/components/layout/SectionHeader.vue";

const route = useRoute();
const leagueCount = ref(14000); // initial load current unique league count value 7/28/26

onMounted(async () => {
  const leagueId = route.query.leagueId;
  if (!leagueId) {
    const data = await getLeagueCount();
    const newCount = data?.league_id_count;
    if (newCount) {
      leagueCount.value = newCount;
    }
  }
});
</script>
<template>
  <PageContainer>
    <PageHeader title="About" class="mb-4" />

    <div class="max-w-4xl text-base leading-relaxed">
      <div class="space-y-4">
        <p class="text-base leading-relaxed">
          RFL Agent turns fantasy football leagues into a useful command center
          for stats, charts, recaps, trade ideas, and season-long storylines.
        </p>
        <p class="text-base leading-relaxed">
          This fork is designed to run as a static GitHub Pages app for your
          league or team. Add a Sleeper or ESPN league, then share the hosted
          URL with anyone who should be able to explore the same tools.
        </p>
        <p class="text-base leading-relaxed">
          RFL Agent keeps the core league analyzer and Trade Finder available
          in the browser. Features that depend on private backend services may
          still require additional configuration, but the static build is aimed
          at league analysis that works from the hosted Pages site.
        </p>
      </div>
      <SectionHeader title="League Count" class="mt-6" />
      <div>
        <p class="mt-2 text-xl font-medium">
          {{ leagueCount.toLocaleString() }}
          <span class="text-base font-normal">Fantasy leagues added</span>
        </p>
      </div>
      <Separator class="mt-3" />
      <p class="mt-2 text-sm text-muted-foreground">
        &copy; 2024-2026. RFL Agent
      </p>
    </div>
  </PageContainer>
</template>

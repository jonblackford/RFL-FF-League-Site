<script setup lang="ts">
import { computed, ref, watch } from "vue";

import type { ManagerArchetype } from "@/lib/narratives";
import Card from "@/components/ui/card/Card.vue";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FreeDraftFeatures from "./FreeDraftFeatures.vue";
import AuctionDraftFeatures from "./AuctionDraftFeatures.vue";
import PremiumAuctionDraftFeatures from "./PremiumAuctionDraftFeatures.vue";
import PremiumDraftFeatures from "./PremiumDraftFeatures.vue";

const props = withDefaults(
  defineProps<{
    archetypes: ManagerArchetype[];
    draftRoomArchetypes?: ManagerArchetype[];
    leagueSize?: number;
    draftType?: string;
    auctionBudget?: number;
    isPremium?: boolean;
  }>(),
  { isPremium: false }
);
const isAuction = computed(() => props.draftType?.toLowerCase() === "auction");

const hasDraftHistory = computed(() =>
  props.archetypes.some((manager) =>
    isAuction.value
      ? manager.auctionHistory?.length
      : manager.draftHistory?.length
  )
);
const draftRoomManagers = computed(
  () => props.draftRoomArchetypes ?? props.archetypes
);
const hasDraftRoomData = computed(() =>
  draftRoomManagers.value.some((manager) =>
    isAuction.value
      ? Boolean(manager.auctionHistory?.length)
      : Boolean(manager.draftHistory?.length)
  )
);

const activeView = ref(props.isPremium ? "draft-room" : "tendencies");

const activeTitle = computed(() =>
  activeView.value === "draft-room"
    ? isAuction.value
      ? "Auction Draft Room"
      : "Draft Room"
    : isAuction.value
      ? "Auction Tendencies"
      : "Draft Tendencies"
);

const activeDescription = computed(() => {
  if (activeView.value === "tendencies") {
    return isAuction.value
      ? "Each manager’s budget allocation, premium-player appetite, position spending, and endgame habits."
      : "Each manager’s draft day habits, favorite early-round positions, and historical draft rankings.";
  }
  if (!hasDraftRoomData.value) {
    return isAuction.value
      ? "Auction scouting becomes available after completed auction history is imported for a current league manager."
      : "Draft Room scouting becomes available after completed draft history is imported for a current league manager.";
  }
  if (props.isPremium) {
    return isAuction.value
      ? "Build a budget plan and scout how every league mate spends."
      : "Plan your draft and scout every league mate from one workspace.";
  }
  return isAuction.value
    ? "Your auction history is ready to shape a budget plan and identify position competition."
    : "Your draft history is ready to plan your next draft and scout your league mates.";
});

watch(
  () => props.isPremium,
  (isPremium, wasPremium) => {
    if (isPremium && !wasPremium) activeView.value = "draft-room";
  }
);
</script>

<template>
  <Card class="p-4 md:p-6">
    <div v-if="!hasDraftHistory">
      <h2 class="heading-section">
        {{ isAuction ? "Auction Draft Room" : "Draft Room" }}
      </h2>
      <div class="max-w-2xl p-4 mt-4 border rounded-card bg-muted/30">
        <p class="font-semibold">
          {{ isAuction ? "Auction history needed" : "Draft history needed" }}
        </p>
        <p class="mt-2 text-sm leading-relaxed text-muted-foreground">
          <template v-if="isAuction">
            Once this league has at least one completed imported auction,
            RFL Agent can identify spending patterns and budget tendencies.
            Check back after the auction is complete.
          </template>
          <template v-else>
            Once this league has at least one completed imported draft,
            RFL Agent can identify positional runs and manager tendencies. Check
            back after the draft is complete.
          </template>
        </p>
      </div>
    </div>

    <Tabs v-else v-model="activeView">
      <div
        class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
      >
        <div class="min-w-0">
          <h2 class="heading-section">{{ activeTitle }}</h2>
          <p class="max-w-2xl mt-4 text-sm sm:text-base text-muted-foreground">
            {{ activeDescription }}
          </p>
        </div>
        <TabsList class="self-start">
          <TabsTrigger value="tendencies">
            {{ isAuction ? "Auction Tendencies" : "Draft Tendencies" }}
          </TabsTrigger>
          <TabsTrigger v-if="isPremium" value="draft-room" class="gap-1.5">
            Draft Room
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="tendencies" class="mt-4">
        <AuctionDraftFeatures
          v-if="activeView === 'tendencies' && isAuction"
          :archetypes="archetypes"
          embedded
        />
        <FreeDraftFeatures
          v-else-if="activeView === 'tendencies'"
          :archetypes="archetypes"
          embedded
        />
      </TabsContent>

      <TabsContent value="draft-room" class="mt-4">
        <div
          v-if="activeView === 'draft-room' && !hasDraftRoomData"
          class="max-w-2xl p-4 border rounded-card bg-muted/30"
        >
          <p class="font-semibold">Current manager history needed</p>
          <p class="mt-2 text-sm leading-relaxed text-muted-foreground">
            This league has older draft history, but none of its current
            managers have enough imported data for Draft Room scouting yet.
            Check back after a current manager completes an imported draft.
          </p>
        </div>
        <PremiumAuctionDraftFeatures
          v-else-if="activeView === 'draft-room' && isPremium && isAuction"
          :archetypes="draftRoomManagers"
          :auction-budget="auctionBudget"
          embedded
        />
        <PremiumDraftFeatures
          v-else-if="activeView === 'draft-room' && isPremium"
          :archetypes="archetypes"
          :draft-room-archetypes="draftRoomArchetypes"
          :league-size="leagueSize"
          embedded
        />
      </TabsContent>
    </Tabs>
  </Card>
</template>

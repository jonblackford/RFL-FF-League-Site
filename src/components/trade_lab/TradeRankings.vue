<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Button } from "@/components/ui/button";
import type {
  DynastyPerspective,
  TradeFinderPlayer,
  TradeFinderRoster,
  TradeValuationMode,
} from "@/lib/tradeFinder";
const props = defineProps<{
  rosters: TradeFinderRoster[];
  loading?: boolean;
  valuationMode?: TradeValuationMode;
  access: "preview" | "premium" | "full";
  totalPlayers: number;
  season?: string;
  leagueLastUpdated?: number;
}>();
defineModel<DynastyPerspective>("dynastyPerspective", { required: true });
const emit = defineEmits<{
  (event: "buildTrade", payload: { playerId: string; rosterId: number }): void;
}>();
const search = ref(""),
  manager = ref("ALL"),
  position = ref("ALL"),
  page = ref(1);
const all = computed(() =>
  [
    ...new Map(
      props.rosters.flatMap((r) =>
        r.players.map((p) => [p.playerId, p] as const),
      ),
    ).values(),
  ].sort((a, b) => a.overallRank - b.overallRank),
);
const positions = computed(() =>
  [...new Set(all.value.map((p) => p.position))].sort(),
);
const filtered = computed(() =>
  all.value.filter(
    (p) =>
      (manager.value === "ALL" ||
        props.rosters
          .find((r) => String(r.id) === manager.value)
          ?.players.some((x) => x.playerId === p.playerId)) &&
      (position.value === "ALL" || p.position === position.value) &&
      `${p.name} ${p.team}`
        .toLowerCase()
        .includes(search.value.toLowerCase().trim()),
  ),
);
const visible = computed(() =>
  filtered.value.slice((page.value - 1) * 25, page.value * 25),
);
const pages = computed(() =>
  Math.max(1, Math.ceil(filtered.value.length / 25)),
);
const covered = computed(
  () => all.value.filter((p) => p.dataAvailable !== false).length,
);
const recorded = computed(() =>
  all.value.some((p) => p.observedWeeks !== undefined),
);
watch([search, manager, position, () => props.rosters], () => {
  page.value = 1;
});
watch(
  () => props.rosters,
  () => {
    if (!props.rosters.some((r) => String(r.id) === manager.value))
      manager.value = "ALL";
    if (!positions.value.includes(position.value)) position.value = "ALL";
  },
);
function buildTrade(p: TradeFinderPlayer) {
  const r = props.rosters.find((r) =>
    r.players.some((x) => x.playerId === p.playerId),
  );
  if (r) emit("buildTrade", { playerId: p.playerId, rosterId: r.id });
}
const format = (n: number) => (Number.isFinite(n) ? n.toFixed(1) : "—");
</script>
<template>
  <div class="mt-4 space-y-5">
    <p class="max-w-3xl text-sm leading-6 text-muted-foreground">
      {{
        recorded
          ? "Compare recorded production across your league. The 0–100 value index combines weekly scoring with the advantage over other players at the same position. It is a starting point for a trade conversation, not a market price or a forecast."
          : "Sample rankings for the demo league. Import your league to compare your own players."
      }}
    </p>
    <div class="grid gap-3 sm:grid-cols-3" v-if="!loading">
      <div class="rounded-xl border p-4">
        <p class="text-xs text-muted-foreground">Players in your league</p>
        <p class="mt-1 text-2xl font-bold">{{ all.length }}</p>
      </div>
      <div class="rounded-xl border p-4">
        <p class="text-xs text-muted-foreground">With scoring history</p>
        <p class="mt-1 text-2xl font-bold">
          {{ covered }}
          <span class="text-sm font-normal text-muted-foreground"
            >of {{ all.length }}</span
          >
        </p>
      </div>
      <div class="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <p class="text-xs text-muted-foreground">
          {{ recorded ? "Production leader" : "Demo leader" }}
        </p>
        <p class="mt-1 text-lg font-bold">
          {{ covered ? all[0]?.name : "Awaiting scored weeks" }}
        </p>
      </div>
    </div>
    <div class="grid gap-3 rounded-lg border p-3 md:grid-cols-3">
      <label class="text-xs font-medium"
        >Player<input
          v-model="search"
          aria-label="Search players"
          placeholder="Search players"
          type="search"
          class="mt-1 block w-full rounded-md border bg-background p-2 text-sm"
      /></label>
      <label class="text-xs font-medium"
        >Manager<select
          v-model="manager"
          aria-label="Filter by manager"
          class="mt-1 block w-full rounded-md border bg-background p-2 text-sm"
        >
          <option value="ALL">All managers</option>
          <option v-for="r in rosters" :key="r.id" :value="String(r.id)">
            {{ r.managerName }}
          </option>
        </select></label
      >
      <label class="text-xs font-medium"
        >Position<select
          v-model="position"
          aria-label="Filter by position"
          class="mt-1 block w-full rounded-md border bg-background p-2 text-sm"
        >
          <option value="ALL">All positions</option>
          <option v-for="p in positions" :key="p" :value="p">{{ p }}</option>
        </select></label
      >
    </div>
    <p
      v-if="loading"
      role="status"
      class="p-6 text-center text-muted-foreground"
    >
      Loading your players…
    </p>
    <p
      v-else-if="!filtered.length"
      class="rounded-lg border border-dashed p-6 text-center"
    >
      {{
        all.length
          ? "No matching players. Try another filter."
          : "No rostered players yet. Import or refresh your league to begin."
      }}
    </p>
    <div v-else class="space-y-3" aria-label="League trade value rankings">
      <article
        v-for="player in visible"
        :key="player.playerId"
        class="grid items-center gap-4 rounded-xl border p-4 md:grid-cols-[minmax(0,1fr)_9rem_8rem_auto]"
      >
        <div class="min-w-0">
          <p class="font-semibold">
            <span class="mr-2 text-sm text-muted-foreground"
              >#{{ player.overallRank }}</span
            >{{ player.name }}
          </p>
          <p class="mt-1 text-xs text-muted-foreground">
            {{ player.position }} · {{ player.team || "No NFL team" }}
            <span v-if="player.dataAvailable !== false"
              >· {{ player.position }} rank {{ player.positionRank }}</span
            >
          </p>
        </div>
        <div>
          <p class="text-xs text-muted-foreground">
            Value index
            <strong class="float-right text-foreground">{{
              player.dataAvailable === false
                ? "No data"
                : `${format(player.tradeValue)} / 100`
            }}</strong>
          </p>
          <div class="mt-2 h-2 rounded-full bg-muted">
            <div
              class="h-2 rounded-full bg-primary"
              :style="{
                width: `${player.dataAvailable === false ? 0 : Math.min(100, Math.max(0, player.tradeValue))}%`,
              }"
            ></div>
          </div>
        </div>
        <div>
          <p class="text-xs text-muted-foreground">
            {{ recorded ? "Avg points / week" : "Projected points" }}
          </p>
          <p class="font-semibold tabular-nums">
            {{
              player.dataAvailable === false
                ? "—"
                : format(player.observedAverage ?? player.projectedPoints)
            }}
          </p>
          <p v-if="recorded" class="text-xs text-muted-foreground">
            {{ player.observedWeeks }} recorded weeks
          </p>
        </div>
        <Button variant="outline" size="sm" @click="buildTrade(player)"
          >Build trade</Button
        >
        <details class="text-xs text-muted-foreground md:col-span-4">
          <summary class="cursor-pointer">How to read this value</summary>
          <p class="mt-2 leading-6">
            {{
              player.dataAvailable === false
                ? "No recorded player scores were found in the imported weeks. This does not mean the player has no fantasy value."
                : recorded
                  ? `Average scoring: ${format(player.observedAverage ?? 0)} points across ${player.observedWeeks} recorded roster weeks. Position comparison baseline: ${format(player.replacementPoints)} points; advantage: ${format(player.vorp)} points per week. Recorded zeroes, including byes and inactive weeks, count in the average. Small samples can change quickly.`
                  : "This is illustrative demo data."
            }}
          </p>
        </details>
      </article>
      <nav
        class="flex flex-wrap items-center justify-between gap-3"
        aria-label="Player rankings pagination"
      >
        <p class="text-xs text-muted-foreground">
          {{ filtered.length }} players · Page {{ page }} of {{ pages }}
        </p>
        <div class="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            :disabled="page === 1"
            @click="page--"
            >Previous</Button
          ><Button
            variant="outline"
            size="sm"
            :disabled="page === pages"
            @click="page++"
            >Next</Button
          >
        </div>
      </nav>
    </div>
    <details class="rounded-lg border p-4 text-sm text-muted-foreground">
      <summary class="cursor-pointer font-medium text-foreground">
        Where the values come from
      </summary>
      <p class="mt-3 leading-6">
        Player names come from Sleeper. Recorded fantasy points come from your
        imported league, so they reflect its scoring rules. The positional
        baseline is the next ranked rostered player after the league’s dedicated
        starting slots, with at least one slot per team; flexible slots are not
        modeled. The index scales average points plus any positive advantage
        over that baseline to 100 for the leader. It does not model injuries,
        future schedules, age, or dynasty market demand. Use the advisor to
        discuss those uncertainties.
      </p>
      <p v-if="leagueLastUpdated" class="mt-2">
        League refreshed: {{ new Date(leagueLastUpdated).toLocaleString() }}
      </p>
    </details>
  </div>
</template>

<script setup lang="ts">
import { openWeeklyReportPrint } from "@/lib/weeklyReportDocument";
import { preferenceStorage } from "@/lib/storage";
import { computed, ref, watch } from "vue";
import { useStore } from "@/store/store";
import type { TableDataType } from "@/types/types";
import type { Player } from "@/types/apiTypes";
import { getPlayersByIdsMap } from "@/api/playerApi";
import { buildWeeklyDigest } from "@/lib/weeklyDigest";
import { openAdvisor } from "@/features/advisor/aiSession";
import {
  getWeeklyAwards,
  getWeeklyPerformers,
  getBenchPerformers,
} from "./weeklyReportTransforms";
import WeeklyAwards from "./WeeklyAwards.vue";
import WeeklyPerformers from "./WeeklyPerformers.vue";
import WeeklyPreview from "./WeeklyPreview.vue";
import { Button } from "@/components/ui/button";
import { toPng } from "html-to-image";
import { toast } from "vue-sonner";

const props = defineProps<{
  tableData: TableDataType[];
  regularSeasonLength: number;
}>();
const store = useStore();
const activeTab = ref("Report");
const lastWeek = computed(
  () =>
    store.currentLeague?.lastScoredWeek ??
    Math.max(0, ...props.tableData.map((t) => t.points?.length ?? 0)),
);
const weeks = computed(() =>
  Array.from(
    { length: Math.max(1, lastWeek.value) },
    (_, i) => i + 1,
  ).reverse(),
);
const currentWeek = ref(weeks.value[0]);
const previewWeeks = computed(() =>
  Array.from(
    {
      length: Math.min(
        18,
        Math.max(1, ...props.tableData.map((t) => t.matchups?.length ?? 0)),
      ),
    },
    (_, i) => i + 1,
  ).reverse(),
);
const initialPreviewWeek = () =>
  Math.min(
    previewWeeks.value[0],
    Math.max(1, store.currentLeague?.currentWeek || lastWeek.value + 1),
  );
const selectedPreviewWeek = ref(initialPreviewWeek());
const selectedWeek = computed({
  get: () =>
    activeTab.value === "Report"
      ? currentWeek.value
      : selectedPreviewWeek.value,
  set: (week: number) => {
    if (activeTab.value === "Report") currentWeek.value = week;
    else selectedPreviewWeek.value = week;
  },
});
const selectableWeeks = computed(() =>
  activeTab.value === "Report" ? weeks.value : previewWeeks.value,
);
watch(
  () => store.currentLeagueId,
  () => {
    currentWeek.value = weeks.value[0];
    selectedPreviewWeek.value = initialPreviewWeek();
    activeTab.value = "Report";
  },
  { flush: "sync" },
);
watch(lastWeek, () => {
  if (!weeks.value.includes(currentWeek.value))
    currentWeek.value = weeks.value[0];
});
const digest = computed(() =>
  buildWeeklyDigest(
    lastWeek.value ? props.tableData : [],
    currentWeek.value,
    store.showUsernames,
  ),
);
const leagueName = computed(() => store.currentLeague?.name || "Demo League");
const notes = ref("");
const noteKey = computed(
  () =>
    `weekly-notes:${store.currentLeague?.platform || "sleeper"}:${store.currentLeague?.leagueId || "demo"}:${store.currentLeague?.season || "demo"}:${currentWeek.value}`,
);
watch(
  noteKey,
  () => {
    notes.value = preferenceStorage.getItem(noteKey.value) || "";
  },
  { immediate: true, flush: "sync" },
);
function saveNotes() {
  preferenceStorage.setItem(noteKey.value, notes.value);
}
function savePdf() {
  try {
    openWeeklyReportPrint({
      league: leagueName.value,
      season: store.currentLeague?.season || "Demo",
      week: currentWeek.value,
      teams: digest.value.teams,
      matchups: digest.value.matchups.map((m) => m.summary),
      awards: awards.value,
      notes: notes.value,
      generatedAt: new Date().toLocaleString(),
      performers: performers.value.slice(0, 10).map((p) => ({
        name: p.player.name || "Unknown player",
        team: p.user,
        points: p.points,
      })),
    });
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Unable to open report.");
  }
}
const reportNode = ref<HTMLElement | null>(null);
const exporting = ref(false);
const players = ref(new Map<string, Player>());
const loadingPlayers = ref(false);
const playerError = ref("");
let generation = 0;
async function loadPlayers() {
  const token = ++generation;
  players.value = new Map();
  playerError.value = "";
  loadingPlayers.value = true;
  const i = currentWeek.value - 1;
  const ids = [
    ...new Set(
      props.tableData
        .flatMap((t) => [
          ...(t.starters?.[i] || []),
          ...(t.benchPlayers?.[i] || []),
        ])
        .filter(Boolean),
    ),
  ];
  try {
    const data = await getPlayersByIdsMap(ids);
    if (token === generation) players.value = data;
  } catch {
    if (token === generation)
      playerError.value =
        "Player names could not load. Team results are still available.";
  } finally {
    if (token === generation) loadingPlayers.value = false;
  }
}
watch(
  [() => store.currentLeagueId, currentWeek, () => props.tableData],
  loadPlayers,
  { immediate: true },
);
// Preserve array positions: dropping an unknown name would attach the next player's score to it.
const names = (ids: string[]) =>
  ids.map(
    (id) =>
      players.value.get(id) ?? {
        player_id: id,
        name: `Player ${id}`,
        position: "",
        team: "",
      },
  );
const context = computed(() => ({
  tableData: props.tableData,
  weekIndex: currentWeek.value - 1,
  showUsernames: store.showUsernames,
  playerNames: props.tableData.map((t) =>
    names(t.starters?.[currentWeek.value - 1] || []),
  ),
  benchPlayerNames: props.tableData.map((t) =>
    names(t.benchPlayers?.[currentWeek.value - 1] || []),
  ),
}));
const awards = computed(() =>
  digest.value.teams.length
    ? getWeeklyAwards({
        ...context.value,
        rosterPositions: store.currentLeague?.rosterPositions || [],
      })
    : [],
);
const performers = computed(() =>
  getWeeklyPerformers({ ...context.value, sortDirection: "desc" }),
);
const bench = computed(() => getBenchPerformers(context.value));
const maxScore = computed(() =>
  Math.max(1, ...digest.value.teams.map((t) => t.points)),
);
const reportText = computed(() =>
  [
    `${leagueName.value} — Week ${currentWeek.value}`,
    digest.value.teams[0]
      ? `Top score: ${digest.value.teams[0].name}, ${digest.value.teams[0].points.toFixed(2)} points.`
      : "No scored results yet.",
    ...digest.value.matchups.map((m) => m.summary),
    ...awards.value.map((a) => `${a.title}: ${a.teamName}. ${a.description}`),
  ].join("\n\n"),
);
async function copyReport() {
  try {
    await navigator.clipboard.writeText(reportText.value);
    toast.success("Report copied");
  } catch {
    toast.error("Clipboard unavailable. Use Download text instead.");
  }
}
function download(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
}
function downloadText() {
  const url = URL.createObjectURL(
    new Blob([reportText.value], { type: "text/plain" }),
  );
  download(url, `week-${currentWeek.value}-report.txt`);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function downloadImage() {
  if (!reportNode.value) return;
  exporting.value = true;
  try {
    download(
      await toPng(reportNode.value, {
        pixelRatio: 2,
        backgroundColor: store.darkMode ? "#101827" : "#ffffff",
      }),
      `week-${currentWeek.value}-report.png`,
    );
  } catch {
    toast.error("Image export failed. You can still download the text report.");
  } finally {
    exporting.value = false;
  }
}
function askAdvisor() {
  openAdvisor(
    "Explain this week’s results, key performances and practical takeaways. Clearly distinguish hindsight from next-week advice.",
    {
      provider: store.currentLeague?.platform || "sleeper",
      leagueId: store.currentLeague?.leagueId,
      season: store.currentLeague?.season,
      week: currentWeek.value,
      team: "League report",
      fetchedAt: store.currentLeague?.lastUpdated || Date.now(),
      results: digest.value,
      awards: awards.value,
      topPlayers: performers.value,
      bench: bench.value,
      warnings: [
        "Recorded fantasy scores, not projections. No injury or news claims without evidence.",
      ],
    },
  );
}
</script>

<template>
  <section
    class="my-4 space-y-6 rounded-xl border p-4 md:p-6"
    aria-label="Weekly report"
  >
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p
          class="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
        >
          Your league, explained
        </p>
        <h2 class="heading-section mt-1">Weekly Report</h2>
        <p class="text-sm text-muted-foreground">
          {{ leagueName }} · Recorded results through Week {{ lastWeek }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <label class="text-sm" for="report-week">Week</label
        ><select
          id="report-week"
          v-model="selectedWeek"
          class="rounded-md border bg-background p-2"
        >
          <option v-for="week in selectableWeeks" :key="week" :value="week">
            {{ week }}
          </option>
        </select>
        <Button
          variant="outline"
          @click="activeTab = activeTab === 'Report' ? 'Preview' : 'Report'"
          >{{
            activeTab === "Report" ? "Matchup preview" : "Back to report"
          }}</Button
        >
      </div>
    </header>
    <template v-if="activeTab === 'Report'">
      <div
        v-if="!digest.teams.length"
        class="rounded-lg border border-dashed p-8 text-center"
      >
        <h3 class="font-semibold">Your first recap is on its way</h3>
        <p class="mt-2 text-muted-foreground">
          Weekly reports appear after a scored week is imported. Refresh your
          league after games finish.
        </p>
      </div>
      <template v-else>
        <div class="flex flex-wrap gap-2">
          <Button @click="savePdf">Save PDF / print</Button
          ><Button variant="outline" @click="askAdvisor">Ask advisor</Button
          ><Button variant="outline" @click="copyReport">Copy report</Button
          ><Button variant="outline" @click="downloadText">Download text</Button
          ><Button
            variant="outline"
            :disabled="exporting"
            @click="downloadImage"
            >{{ exporting ? "Creating image…" : "Download image" }}</Button
          >
        </div>
        <div
          ref="reportNode"
          class="space-y-6 rounded-xl bg-background p-2 md:p-4"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="text-xl font-semibold">
              Week {{ currentWeek }} at a glance
            </h3>
            <span class="text-sm text-muted-foreground">{{ leagueName }}</span>
          </div>
          <div class="grid gap-3 md:grid-cols-3">
            <article
              class="rounded-xl border border-primary/30 bg-primary/5 p-5"
            >
              <p class="text-sm text-muted-foreground">Highest score</p>
              <p class="mt-2 text-3xl font-bold tabular-nums">
                {{ digest.teams[0].points.toFixed(2) }}
                <span class="text-sm font-normal">pts</span>
              </p>
              <p class="mt-2 font-medium">{{ digest.teams[0].name }}</p>
            </article>
            <article class="rounded-xl border p-5">
              <p class="text-sm text-muted-foreground">League average</p>
              <p class="mt-2 text-3xl font-bold tabular-nums">
                {{ digest.average?.toFixed(2) }}
                <span class="text-sm font-normal">pts</span>
              </p>
              <p class="mt-2 text-sm text-muted-foreground">
                Across {{ digest.teams.length }} scored teams
              </p>
            </article>
            <article class="rounded-xl border p-5">
              <p class="text-sm text-muted-foreground">Closest matchup</p>
              <p class="mt-2 text-3xl font-bold tabular-nums">
                {{ digest.closest ? digest.closest.margin.toFixed(2) : "—" }}
                <span class="text-sm font-normal">pt gap</span>
              </p>
              <p class="mt-2 text-sm">
                {{
                  digest.closest?.summary || "No head-to-head result available."
                }}
              </p>
            </article>
          </div>
          <section>
            <h3 class="mb-3 text-lg font-semibold">How everyone scored</h3>
            <p class="mb-4 text-sm text-muted-foreground">
              Longer bars mean more fantasy points. Scores use your league’s
              recorded scoring.
            </p>
            <div class="space-y-3">
              <div
                v-for="(team, index) in digest.teams"
                :key="team.id"
                class="grid grid-cols-[minmax(0,1fr)_5rem] items-center gap-3"
              >
                <div class="min-w-0">
                  <div class="mb-1 truncate text-sm">
                    <span class="mr-2 text-muted-foreground"
                      >{{ index + 1 }}.</span
                    >{{ team.name }}
                  </div>
                  <div class="h-2 rounded-full bg-muted">
                    <div
                      class="h-2 rounded-full bg-primary"
                      :style="{
                        width: `${Math.max(0, (team.points / maxScore) * 100)}%`,
                      }"
                    ></div>
                  </div>
                </div>
                <span class="text-right text-sm font-semibold tabular-nums">{{
                  team.points.toFixed(2)
                }}</span>
              </div>
            </div>
          </section>
          <section v-if="digest.matchups.length">
            <h3 class="mb-3 text-lg font-semibold">What happened</h3>
            <div class="grid gap-3 lg:grid-cols-2">
              <article
                v-for="matchup in digest.matchups"
                :key="matchup.id"
                class="rounded-lg border p-4"
              >
                <p class="mb-3 text-sm font-medium">{{ matchup.summary }}</p>
                <div
                  v-for="team in matchup.teams"
                  :key="team.id"
                  class="flex justify-between gap-3 py-1 text-sm"
                >
                  <span>{{ team.name }}</span
                  ><strong class="tabular-nums">{{
                    team.points.toFixed(2)
                  }}</strong>
                </div>
              </article>
            </div>
          </section>
          <WeeklyAwards :awards="awards" />
          <p class="text-xs text-muted-foreground">
            Computed from imported league results. Bench awards describe
            hindsight, not guaranteed lineup advice.
          </p>
        </div>
        <section class="rounded-lg border p-4">
          <label for="report-notes" class="font-semibold"
            >Manager notes & next steps</label
          >
          <p class="my-2 text-sm text-muted-foreground">
            Saved on this device for this league and week. Included in your PDF
            report.
          </p>
          <textarea
            id="report-notes"
            v-model="notes"
            @input="saveNotes"
            maxlength="8000"
            rows="4"
            class="w-full rounded-lg border bg-background p-3 text-sm"
            placeholder="Record your takeaways, waiver priorities, or paste an advisor explanation…"
          ></textarea>
        </section>
        <p
          v-if="playerError"
          role="status"
          class="text-sm text-muted-foreground"
        >
          {{ playerError }}
          <button class="underline" @click="loadPlayers">
            Retry player names
          </button>
        </p>
        <details class="rounded-lg border p-4">
          <summary class="cursor-pointer font-semibold">
            Player performances and bench points
          </summary>
          <div class="mt-4 space-y-6">
            <WeeklyPerformers
              title="Top Performers"
              :performers="performers"
              :loading="loadingPlayers"
              score-class="mt-2 font-semibold"
            /><WeeklyPerformers
              title="Top Benchwarmers"
              :performers="bench"
              :loading="loadingPlayers"
              score-class="mt-2 font-semibold"
            />
          </div>
        </details>
      </template>
    </template>
    <section v-else aria-label="Matchup preview">
      <h3 class="text-xl font-semibold">
        Week {{ selectedPreviewWeek }} matchups
      </h3>
      <p class="mt-1 mb-4 text-sm text-muted-foreground">
        Opponents follow the imported league schedule for the selected week.
        Projections are estimates, not final scores.
      </p>
      <WeeklyPreview
        :table-data="tableData"
        :current-week="selectedPreviewWeek"
        :is-playoffs="selectedPreviewWeek > regularSeasonLength"
      />
    </section>
  </section>
</template>

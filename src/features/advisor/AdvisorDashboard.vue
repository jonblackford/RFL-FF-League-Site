<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStore } from "@/store/store";
import { useAdvisorStore } from "@/store/advisor";
import {
  optimizeLineup,
  recommendWaivers,
  rosterPlayers,
} from "@/features/rfl/recommendations";
import { buildEvidence } from "@/features/rfl/presentation";
import { statLabel } from "@/features/rfl/scoring";
import { readAdvisorPreferences, writeAdvisorPreferences } from "./preferences";
import type { RflPlayer } from "@/features/rfl/types";
import { buildIntelligence } from "./intelligence";
import IntelligencePanel from "./IntelligencePanel.vue";
import AdvisorOverview from "./AdvisorOverview.vue";
import AdvisorPlayers from "./AdvisorPlayers.vue";
import PlayerComparison from "./PlayerComparison.vue";
import { openAdvisor } from "./aiSession";
import "./advisor.css";
import {
  loadEnrichment,
  trendBeforeWeek,
  type EnrichmentFeed,
} from "./enrichment";
import PlayerTrends from "./PlayerTrends.vue";
import LeagueActivity from "./LeagueActivity.vue";
const store = useStore(),
  advisor = useAdvisorStore(),
  route = useRoute(),
  router = useRouter();
const team = ref(1),
  week = ref<number | undefined>(),
  search = ref(""),
  position = ref("ALL"),
  onlyWatched = ref(false),
  compared = ref<string[]>([]),
  watchlist = ref<string[]>([]);
const tabs = ["Overview", "Insights", "Lineup", "Waivers", "Players", "Reports", "League"];
const tab = ref(
  tabs.includes(String(route.query.advisor))
    ? String(route.query.advisor)
    : "Overview",
);
const snapshot = computed(() => advisor.snapshot);
const league = computed(() => store.currentLeague);
const isSleeper = computed(
  () => !!league.value && league.value.platform !== "espn",
);
const prefKey = computed(
  () =>
    `sleeper:${league.value?.leagueId}:${league.value?.season}:${team.value}`,
);
const mine = computed(() =>
  snapshot.value ? rosterPlayers(snapshot.value) : [],
);
const lineup = computed(() =>
  optimizeLineup(mine.value, snapshot.value?.league.roster_positions || []),
);
const waivers = computed(() =>
  snapshot.value ? recommendWaivers(snapshot.value) : [],
);
const enrichment = ref<EnrichmentFeed | null>(null),
  enrichmentError = ref("");
let enrichGeneration = 0;
watch(
  () => snapshot.value?.league.season,
  async (season) => {
    const current = ++enrichGeneration;
    enrichment.value = null;
    enrichmentError.value = "";
    if (!season) return;
    try {
      const data = await loadEnrichment(Number(season));
      if (current === enrichGeneration) enrichment.value = data;
    } catch (e) {
      if (current === enrichGeneration)
        enrichmentError.value =
          e instanceof Error ? e.message : "Usage unavailable";
    }
  },
  { immediate: true },
);
const intelligence = computed(() => snapshot.value ? buildIntelligence(snapshot.value,enrichment.value,league.value?.weeklyPoints || []) : null);
const evidence = computed(() =>
  snapshot.value
    ? {
        ...buildEvidence(snapshot.value, lineup.value, waivers.value),
        historicalUsage: mine.value.slice(0, 30).map((p) => ({
          id: p.id,
          name: p.name,
          trend: trendBeforeWeek(
            enrichment.value?.players[p.id],
            snapshot.value!.week,
          ),
        })),
        historicalFeedGeneratedAt: enrichment.value?.generatedAt,
        historicalFeedError: enrichmentError.value,
        intelligence: intelligence.value,
      }
    : null,
);
const matches = (p: RflPlayer) =>
  (position.value === "ALL" || p.positions.includes(position.value)) &&
  p.name.toLowerCase().includes(search.value.toLowerCase()) &&
  (!onlyWatched.value || watchlist.value.includes(p.id));
const playerResults = computed(() =>
  (snapshot.value?.players || [])
    .filter(matches)
    .sort((a, b) => (b.projection ?? -Infinity) - (a.projection ?? -Infinity))
    .slice(0, 60),
);
const waiverResults = computed(() =>
  waivers.value.filter((w) => matches(w.add)).slice(0, 30),
);
const comparedPlayers = computed(() =>
  (snapshot.value?.players || []).filter((p) => compared.value.includes(p.id)),
);

function ask(question: string, context: Record<string, unknown> | null = null) {
  if (evidence.value) openAdvisor(question, { ...evidence.value, context });
}
function askPlayer(p: RflPlayer) {
  ask(`Explain the value and uncertainty for ${p.name} in this league.`, {
    player: p,
  });
}
const trendPlayers = computed(() => {
  const players = comparedPlayers.value.length
    ? comparedPlayers.value
    : tab.value === "Players"
      ? playerResults.value
      : mine.value;
  return players.flatMap((p) => {
    const trend = trendBeforeWeek(
      enrichment.value?.players[p.id],
      snapshot.value?.week || 1,
    );
    return trend ? [{ id: p.id, name: p.name, trend }] : [];
  });
});
function compare(id: string) {
  compared.value = compared.value.includes(id)
    ? compared.value.filter((x) => x !== id)
    : [...compared.value, id].slice(0, 3);
}
function toggleWatch(id: string) {
  watchlist.value = watchlist.value.includes(id)
    ? watchlist.value.filter((x) => x !== id)
    : [...watchlist.value, id];
  writeAdvisorPreferences(prefKey.value, {
    rosterId: team.value,
    watchlist: watchlist.value,
  });
}
function navigate(value: string) {
  tab.value = value;
  router.replace({
    query: {
      ...route.query,
      destination: "advisor",
      advisor: value,
      team: String(team.value),
      week: week.value ? String(week.value) : undefined,
    },
  });
}
async function load() {
  if (!isSleeper.value) {
    advisor.clear();
    return;
  }
  await advisor.select({
    provider: "sleeper",
    leagueId: league.value.leagueId,
    rosterId: team.value,
    week: week.value,
  });
}
watch(
  () => store.currentLeagueId,
  () => {
    compared.value = [];
    search.value = "";
    week.value = Number(route.query.week) || undefined;
    const ids = league.value?.rosters.map((r) => r.rosterId) || [];
    const requested = Number(route.query.team);
    const saved = readAdvisorPreferences(
      `sleeper:${league.value?.leagueId}:${league.value?.season}:selection`,
    ).rosterId;
    team.value = ids.includes(requested)
      ? requested
      : ids.includes(saved)
        ? saved
        : ids[0] || 1;
    watchlist.value = readAdvisorPreferences(prefKey.value).watchlist;
    void load();
  },
  { immediate: true },
);
async function changeSelection() {
  compared.value = [];
  watchlist.value = readAdvisorPreferences(prefKey.value).watchlist;
  writeAdvisorPreferences(
    `sleeper:${league.value?.leagueId}:${league.value?.season}:selection`,
    { rosterId: team.value, watchlist: [] },
  );
  navigate(tab.value);
  await load();
}
watch(
  () => [route.query.team, route.query.week, route.query.advisor],
  () => {
    if (String(route.query.leagueId) !== league.value?.leagueId) return;
    const nextTeam = Number(route.query.team) || team.value;
    const nextWeek = Number(route.query.week) || undefined;
    const nextTab = String(route.query.advisor || "Overview");
    if (tabs.includes(nextTab)) tab.value = nextTab;
    if (nextTeam === team.value && nextWeek === week.value) return;
    team.value = nextTeam;
    week.value = nextWeek;
    compared.value = [];
    watchlist.value = readAdvisorPreferences(prefKey.value).watchlist;
    void load();
  },
);
function openLegacy(feature: string) {
  store.currentTab = feature;
  try {
    localStorage.setItem("currentTab", feature);
  } catch {}
}
</script>
<template>
  <main class="ad-dashboard">
    <header class="ad-hero">
      <div>
        <p class="ad-kicker">YOUR FANTASY WORKSPACE</p>
        <h1>Every league. A clearer next move.</h1>
        <p>
          Lineups, player research and an advisor that knows your league's
          rules.
        </p>
      </div>
      <span class="ad-live">{{
        advisor.loading ? "Updating…" : "League intelligence"
      }}</span>
    </header>
    <div v-if="!league" class="ad-card ad-empty">
      <h2>Add a league to get started</h2>
      <p>
        Use Add League above to import a Sleeper or ESPN league. Your saved
        leagues stay on this device.
      </p>
    </div>
    <div v-else-if="!isSleeper" class="ad-card">
      <h2>{{ league.name }}</h2>
      <p>
        ESPN league analytics are available. Custom-scored advisor
        recommendations currently support Sleeper leagues.
      </p>
      <div class="ad-actions">
        <button @click="openLegacy('Standings')">Standings</button
        ><button @click="openLegacy('Start/Sit')">ESPN start/sit</button
        ><button @click="openLegacy('Weekly Report')">Weekly report</button>
      </div>
    </div>
    <template v-else>
      <section class="ad-toolbar" aria-label="Advisor selection">
        <div class="ad-league-name">
          <strong>{{ league.name }}</strong
          ><small>{{ league.season }} · Sleeper</small>
        </div>
        <label
          >Team<select
            aria-label="Team"
            v-model.number="team"
            @change="changeSelection"
          >
            <option
              v-for="r in snapshot?.rosters ||
              league.rosters.map((r) => ({
                roster_id: r.rosterId,
                teamName: `Team ${r.rosterId}`,
              }))"
              :key="r.roster_id"
              :value="r.roster_id"
            >
              {{ r.teamName || `Team ${r.roster_id}` }}
            </option>
          </select></label
        ><label
          >Week<select
            aria-label="Week"
            :value="week || snapshot?.week || ''"
            @change="
              week = Number(($event.target as HTMLSelectElement).value);
              changeSelection();
            "
          >
            <option value="" disabled>Current</option>
            <option v-for="w in 18" :key="w" :value="w">Week {{ w }}</option>
          </select></label
        ><button :disabled="advisor.loading" @click="advisor.refresh()">
          ↻ Refresh</button
        ><button
          class="ad-primary"
          :disabled="!snapshot"
          @click="ask('What should I prioritize for this team this week?')"
        >
          ✦ Ask advisor
        </button>
      </section>
      <p v-if="advisor.error" role="alert" class="ad-error">
        {{ advisor.error }}
        {{ snapshot ? "Showing the previous snapshot; it may be stale." : "" }}
      </p>
      <div
        v-if="advisor.loading && !snapshot"
        role="status"
        class="ad-card ad-empty"
      >
        Loading league rules, rosters and player evidence…
      </div>
      <template v-if="snapshot">
        <div class="ad-row ad-meta">
          <span
            >{{ snapshot.roster.teamName || `Team ${team}` }} · Week
            {{ snapshot.week }}</span
          ><span
            >Fetched {{ new Date(snapshot.fetchedAt).toLocaleString() }}</span
          >
        </div>
        <nav class="ad-tabs" aria-label="Advisor sections">
          <button
            v-for="t in tabs"
            :key="t"
            :aria-current="tab === t ? 'page' : undefined"
            @click="navigate(t)"
          >
            {{ t }}
          </button>
        </nav>
        <IntelligencePanel v-if="tab === 'Insights' && intelligence" :insights="intelligence" @ask="ask" />
        <AdvisorOverview
          v-if="tab === 'Overview'"
          :snapshot="snapshot"
          :lineup="lineup"
          :waivers="waivers"
          @navigate="navigate"
          @ask="ask"
        />
        <section v-if="tab === 'Lineup'" class="ad-card">
          <div class="ad-row">
            <div>
              <p class="ad-kicker">LEAGUE-SCORED</p>
              <h2>Recommended starters</h2>
            </div>
            <button
              @click="
                ask(
                  'Explain the recommended lineup and changes from my current starters.',
                )
              "
            >
              Explain lineup
            </button>
          </div>
          <div v-for="(a, i) in lineup.assignments" :key="i" class="ad-lineup">
            <span class="ad-slot">{{ a.slot }}</span>
            <div>
              <strong>{{
                a.player?.name || "No eligible projected player"
              }}</strong>
              <p class="ad-muted">
                {{ a.player?.team }}
                {{ a.player?.opponent ? `vs ${a.player.opponent}` : "" }} ·
                {{
                  a.player && snapshot.roster.starters.includes(a.player.id)
                    ? "Current starter"
                    : "Suggested change"
                }}
              </p>
            </div>
            <strong>{{ a.player?.projection?.toFixed(1) ?? "—" }}</strong
            ><button v-if="a.player" @click="compare(a.player.id)">
              Compare
            </button>
          </div>
          <h3 class="ad-subheading">Your roster</h3>
          <AdvisorPlayers
            :players="mine"
            :watchlist="watchlist"
            :compared="compared"
            @watch="toggleWatch"
            @compare="compare"
            @ask="askPlayer"
          />
        </section>
        <div v-if="['Waivers', 'Players'].includes(tab)">
          <div class="ad-filters">
            <label
              >Search players<input
                v-model="search"
                placeholder="Player name" /></label
            ><label
              >Position<select v-model="position">
                <option>ALL</option>
                <option
                  v-for="p in ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']"
                  :key="p"
                >
                  {{ p }}
                </option>
              </select></label
            ><label class="ad-check"
              ><input v-model="onlyWatched" type="checkbox" /> Watchlist
              only</label
            >
          </div>
          <section v-if="tab === 'Players'" class="ad-card">
            <h2>Player research</h2>
            <p class="ad-muted">
              Top 60 matches by available-stat projection. Search to narrow the
              full player directory.
            </p>
            <AdvisorPlayers
              :players="playerResults"
              :watchlist="watchlist"
              :compared="compared"
              @watch="toggleWatch"
              @compare="compare"
              @ask="askPlayer"
            />
          </section>
          <section v-else class="ad-card">
            <h2>Waiver opportunities</h2>
            <p class="ad-muted">
              Each move is an alternative, not a sequence of claims. Starter
              gain differs from bench depth value.
            </p>
            <article
              v-for="w in waiverResults"
              :key="w.add.id"
              class="ad-waiver"
            >
              <AdvisorPlayers
                :players="[w.add]"
                :watchlist="watchlist"
                :compared="compared"
                @watch="toggleWatch"
                @compare="compare"
                @ask="askPlayer"
              />
              <div class="ad-row">
                <p>
                  Drop <strong>{{ w.drop?.name || "No drop needed" }}</strong> ·
                  Lineup {{ w.gain >= 0 ? "+" : "" }}{{ w.gain.toFixed(1) }} ·
                  Depth {{ w.depthGain.toFixed(1) }}
                </p>
                <button
                  @click="
                    ask(
                      'Explain this waiver alternative and the cost of dropping this player.',
                      { waiver: w },
                    )
                  "
                >
                  Explain move
                </button>
              </div>
            </article>
            <p v-if="!waiverResults.length" class="ad-empty ad-muted">
              No supported upgrades match these filters. Coverage, roster limits
              or available projections may limit recommendations.
            </p>
          </section>
        </div>
        <section v-if="tab === 'League'" class="ad-card">
          <h2>Your league, connected</h2>
          <p class="ad-muted">
            Explore the existing analytics. Some legacy views use standard
            scoring estimates; use this advisor for the displayed custom-scored
            projections.
          </p>
          <div class="ad-link-grid">
            <button
              v-for="feature in [
                'Standings',
                'Weekly Report',
                'Trade Lab',
                'League History',
                'Draft',
                'Manager Profiles',
                'Season Forecast',
              ]"
              :key="feature"
              @click="openLegacy(feature)"
            >
              {{ feature }} →
            </button>
          </div>
        </section>
        <LeagueActivity
          v-if="tab === 'Reports' || tab === 'Overview'"
          :snapshot="snapshot"
        />
        <PlayerTrends
          v-if="enrichment && ['Overview', 'Players', 'Lineup'].includes(tab)"
          :players="trendPlayers"
          :generated-at="enrichment.generatedAt"
        />
        <p v-if="enrichmentError" class="ad-muted">
          Historical usage: {{ enrichmentError }}. Live league recommendations
          remain available.
        </p>
        <PlayerComparison
          v-if="compared.length"
          :players="comparedPlayers"
          @remove="compare"
          @ask="
            ask(
              'Compare these players for the selected league, including scoring gaps.',
              { comparedPlayers },
            )
          "
        />
        <details class="ad-card ad-sources">
          <summary>Scoring rules & data coverage</summary>
          <p v-for="w in snapshot.warnings" :key="w" class="ad-muted">
            {{ w }}
          </p>
          <dl class="ad-breakdown">
            <template
              v-for="(rate, key) in snapshot.league.scoring_settings"
              :key="key"
              ><dt>{{ statLabel(String(key)) }}</dt>
              <dd>{{ rate }}</dd></template
            >
          </dl>
        </details>
      </template>
    </template>
  </main>
</template>

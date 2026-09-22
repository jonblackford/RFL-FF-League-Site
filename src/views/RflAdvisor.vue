<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, shallowRef } from "vue";
import {
  loadRflSnapshot,
  createLatestLoader,
  RFL_LEAGUE_ID,
} from "@/features/rfl/data";
import {
  optimizeLineup,
  recommendWaivers,
  rosterPlayers,
} from "@/features/rfl/recommendations";
import {
  buildEvidence,
  lineupChanges,
  currentLineupTotal,
} from "@/features/rfl/presentation";
import { statLabel } from "@/features/rfl/scoring";
import type { RflSnapshot } from "@/features/rfl/types";
import PlayerCard from "@/features/rfl/PlayerCard.vue";
import AdvisorChat from "@/features/rfl/AdvisorChat.vue";
import "@/features/rfl/advisor.css";
const snapshot = shallowRef<RflSnapshot | null>(null);
const loading = ref(false);
const error = ref("");
const week = ref<number | undefined>();
const tab = ref("lineup");
const waiverPosition = ref("ALL");
const loader = createLatestLoader();
const mine = computed(() =>
  snapshot.value ? rosterPlayers(snapshot.value) : [],
);
const lineup = computed(() =>
  optimizeLineup(mine.value, snapshot.value?.league.roster_positions ?? []),
);
const waivers = computed(() =>
  snapshot.value ? recommendWaivers(snapshot.value) : [],
);
const visibleWaivers = computed(() =>
  waivers.value
    .filter(
      (w) =>
        waiverPosition.value === "ALL" ||
        w.add.position === waiverPosition.value,
    )
    .slice(0, 12),
);
const changes = computed(() =>
  lineupChanges(snapshot.value?.roster.starters ?? [], lineup.value),
);
const evidence = computed(() =>
  snapshot.value
    ? buildEvidence(snapshot.value, lineup.value, waivers.value)
    : null,
);
const currentTotal = computed(() =>
  currentLineupTotal(snapshot.value?.roster.starters ?? [], mine.value),
);
const returnTotal = computed(() =>
  lineup.value.assignments.reduce(
    (sum, a) => sum + (a.player?.returnPoints ?? 0),
    0,
  ),
);
const showScoring = () => {
  const section = document.getElementById("league-scoring");
  const detail = section?.querySelector("details");
  if (detail) detail.open = true;
  section?.scrollIntoView({ behavior: "smooth", block: "start" });
};
const names = (ids: string[]) =>
  ids
    .map((id) => {
      const p = mine.value.find((p) => p.id === id);
      return p ? `${p.name}${p.injury ? ` (${p.injury})` : ""}` : id;
    })
    .join(", ");
const pts = (n: number | null) => (n === null ? "—" : n.toFixed(1));
async function refresh(force = false) {
  loading.value = true;
  error.value = "";
  try {
    await loader.run(
      (signal) => loadRflSnapshot(week.value, signal, force),
      (value) => {
        snapshot.value = value;
        week.value = value.week;
      },
    );
  } catch (e) {
    error.value =
      e instanceof Error
        ? e.message
        : "Unable to load the league. Please retry.";
  } finally {
    loading.value = false;
  }
}
onMounted(() => refresh());
onBeforeUnmount(() => loader.cancel());
</script>
<template>
  <div class="rfl-app">
    <header class="rfl-nav">
      <RouterLink to="/rfl" class="rfl-brand"
        ><span class="brand-emblem">R</span
        ><span
          >RFL<span class="brand-light"> / THE ADVISOR</span></span
        ></RouterLink
      >
      <nav aria-label="Main navigation">
        <a
          href="https://sleeper.com/leagues/1394364555710181376"
          target="_blank"
          rel="noopener noreferrer"
          >Open Sleeper ↗</a
        ><RouterLink :to="{ path: '/', query: { leagueId: RFL_LEAGUE_ID } }"
          >League analytics ↗</RouterLink
        >
      </nav>
    </header>
    <main class="rfl-main">
      <section class="rfl-hero">
        <div class="hero-copy">
          <p class="eyebrow">
            <span class="live-dot" /> THE RED FLAG LEAGUE
            <span v-if="snapshot">/ {{ snapshot.league.season }}</span>
          </p>
          <h1>Your roster.<br /><em>Your rules.</em></h1>
          <p>
            Every decision, built for <strong>Dart Vader.</strong><br />Real
            league scoring. A clearer plan for game day.
          </p>
          <div class="hero-tags">
            <span>Full PPR</span><span>Superflex</span
            ><span>Return yards count</span>
          </div>
        </div>
        <div class="team-card">
          <div class="team-orbit">DV</div>
          <p class="eyebrow">YOUR TEAM</p>
          <h2>Dart Vader</h2>
          <p>JonBlackford42 · Roster 1</p>
          <div class="team-card-bottom">
            <span>14-team RFL</span><span>League-connected</span>
          </div>
        </div>
      </section>
      <div class="dashboard-toolbar">
        <div>
          <p class="eyebrow">WEEKLY GAME PLAN</p>
          <h2>
            {{ snapshot ? `Week ${snapshot.week}` : "Your weekly outlook"
            }}<span v-if="snapshot"> · {{ snapshot.league.season }}</span>
          </h2>
        </div>
        <div class="toolbar-controls">
          <label for="rfl-week" class="sr-only">Analysis week</label
          ><select
            id="rfl-week"
            v-model="week"
            :disabled="loading"
            @change="refresh()"
          >
            <option v-if="!week" :value="undefined">Current week</option>
            <option v-for="n in 18" :key="n" :value="n">
              Week {{ n }}
            </option></select
          ><button
            class="secondary-button"
            :disabled="loading"
            @click="refresh(true)"
          >
            {{ loading ? "Refreshing…" : "↻ Refresh data" }}
          </button>
        </div>
      </div>
      <div v-if="error" class="error-banner" role="alert">
        {{ error }}
        <strong v-if="snapshot"
          >Showing the last loaded snapshot. Data may be stale.</strong
        ><button v-if="!loading" @click="refresh(true)">Retry</button>
      </div>
      <div v-if="loading && !snapshot" class="loading-panel" role="status">
        <span class="loading-orbit" />
        <h2>Reading the RFL playbook</h2>
        <p>
          Loading rosters, exact scoring, projections and recent return
          production.
        </p>
      </div>
      <template v-if="snapshot">
        <div class="metric-grid">
          <article>
            <span>RECOMMENDED LINEUP</span
            ><strong>{{ pts(lineup.total) }}<small> pts</small></strong>
            <p>
              {{ lineup.filled }} / {{ lineup.assignments.length }} slots filled
              · available stats
            </p>
          </article>
          <article>
            <span>VS CURRENT LINEUP</span
            ><strong
              >{{
                currentTotal === null
                  ? "—"
                  : `${lineup.total - currentTotal >= 0 ? "+" : ""}${pts(lineup.total - currentTotal)}`
              }}<small> pts</small></strong
            >
            <p>
              {{
                currentTotal === null
                  ? "Unavailable or missing starter data"
                  : "Projected difference, not a guarantee"
              }}
            </p>
          </article>
          <article class="return-metric">
            <span>RETURN CONTRIBUTION</span
            ><strong>{{ pts(returnTotal) }}<small> pts</small></strong>
            <p>Includes labeled recent-history estimates</p>
          </article>
        </div>
        <div class="scoring-callout">
          <span class="callout-symbol">↗</span>
          <div>
            <strong>Your scoring changes the conversation.</strong>
            <p>
              10 kick return yards =
              {{
                (10 * (snapshot.league.scoring_settings.kr_yd ?? 0)).toFixed(1)
              }}
              points. 10 punt return yards =
              {{
                (10 * (snapshot.league.scoring_settings.pr_yd ?? 0)).toFixed(1)
              }}
              points. Every projection below uses the loaded RFL settings.
            </p>
          </div>
          <button class="rules-link" @click="showScoring">See rules ↓</button>
        </div>
        <div class="data-note">
          <span>Loaded {{ new Date(snapshot.fetchedAt).toLocaleString() }}</span
          ><span>{{ snapshot.source }}</span>
        </div>
        <details class="coverage-panel">
          <summary>
            Read before making a move · data coverage &amp; availability
          </summary>
          <p v-for="warning in snapshot.warnings" :key="warning">
            {{ warning }}
          </p>
          <p>
            Injury status comes from Sleeper. Questionable players remain
            eligible; doubtful, out, suspended and reserve players are excluded.
            Return estimates use up to three completed active games and do not
            establish a future return role.
          </p>
          <p>
            Waiver mode:
            {{
              snapshot.league.settings.waiver_type === 2
                ? "FAAB"
                : snapshot.league.settings.waiver_type === 0
                  ? "Rolling priority"
                  : "League-configured priority"
            }}.
            {{
              snapshot.league.settings.disable_adds
                ? "Adds are disabled."
                : "Claims must be submitted in Sleeper."
            }}
            Position caps are checked conservatively, including reserve players.
          </p>
        </details>
        <div class="workspace-tabs" role="tablist" aria-label="Roster advice">
          <button
            v-for="item in [
              { id: 'lineup', label: 'Start / sit' },
              { id: 'waivers', label: 'Waiver wire' },
              { id: 'roster', label: 'My roster' },
            ]"
            :key="item.id"
            role="tab"
            :aria-selected="tab === item.id"
            :class="{ active: tab === item.id }"
            @click="tab = item.id"
          >
            {{ item.label
            }}<span v-if="item.id === 'waivers'">{{ waivers.length }}</span>
          </button>
        </div>
        <section
          v-if="tab === 'lineup'"
          class="advice-section"
          aria-label="Recommended lineup"
        >
          <div class="section-heading">
            <div>
              <p class="eyebrow">SET YOUR WEEK UP</p>
              <h2>Your recommended lineup</h2>
            </div>
            <span class="quiet-tag">Calculated with RFL rules</span>
          </div>
          <p class="section-intro">
            Best assignment using available stats and eligible roster players.
            Expand any player to see exactly what is included.
          </p>
          <div
            v-if="changes.start.length || changes.sit.length"
            class="swap-note"
          >
            <p v-if="changes.start.length">
              <strong>Move into the lineup:</strong> {{ names(changes.start) }}
            </p>
            <p v-if="changes.sit.length">
              <strong>Move out:</strong> {{ names(changes.sit) }}
            </p>
            <small
              >Review slot assignments below and check game locks before
              changing your lineup.</small
            >
          </div>
          <p v-else class="swap-note">
            Your current starters match this calculation. Keep monitoring injury
            status and return roles.
          </p>
          <div class="player-grid">
            <template
              v-for="(assignment, index) in lineup.assignments"
              :key="index"
              ><PlayerCard
                v-if="assignment.player"
                :player="assignment.player"
                :slot="assignment.slot"
                :current="
                  snapshot.roster.starters.includes(assignment.player.id)
                "
              />
              <article v-else class="player-card empty-slot">
                <span class="position-tag">{{ assignment.slot }}</span>
                <h3>No eligible projected player</h3>
                <p>Check availability and waiver options.</p>
              </article></template
            >
          </div>
        </section>
        <section
          v-if="tab === 'waivers'"
          class="advice-section"
          aria-label="Waiver recommendations"
        >
          <div class="section-heading">
            <div>
              <p class="eyebrow">MAKE YOUR NEXT MOVE COUNT</p>
              <h2>Waiver opportunities</h2>
            </div>
            <label class="position-filter"
              >Position
              <select v-model="waiverPosition">
                <option value="ALL">All positions</option>
                <option
                  v-for="position in ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']"
                  :key="position"
                >
                  {{ position }}
                </option>
              </select></label
            >
          </div>
          <p class="section-intro">
            Unrostered players ranked by feasible lineup gain, then depth value.
            Showing up to 12 per filter. Each suggestion is an alternative; do
            not combine drops automatically.
          </p>
          <p v-if="!visibleWaivers.length" class="swap-note">
            No supported upgrades for this filter. Missing projections, position
            limits or disabled adds may restrict recommendations.
          </p>
          <div class="waiver-grid">
            <article
              v-for="(waiver, index) in visibleWaivers"
              :key="waiver.add.id"
              class="waiver-card"
            >
              <div class="waiver-rank">
                <span>OPPORTUNITY {{ String(index + 1).padStart(2, "0") }}</span
                ><strong>{{
                  waiver.fills
                    ? `Fills ${waiver.fills} slot`
                    : `${waiver.gain >= 0 ? "+" : ""}${pts(waiver.gain)} lineup pts`
                }}</strong>
              </div>
              <PlayerCard :player="waiver.add" />
              <div class="waiver-drop">
                <span>{{
                  waiver.drop ? "SUGGESTED DROP" : "ROSTER SPACE"
                }}</span
                ><strong>{{
                  waiver.drop?.name || "Use your open bench slot"
                }}</strong>
                <p>
                  Depth point difference: {{ waiver.depthGain >= 0 ? "+" : ""
                  }}{{ pts(waiver.depthGain) }} ·
                  {{
                    waiver.gain > 0
                      ? "Improves projected starters"
                      : "Depth option; no projected starter gain"
                  }}
                </p>
              </div>
            </article>
          </div>
        </section>
        <section
          v-if="tab === 'roster'"
          class="advice-section"
          aria-label="Dart Vader roster"
        >
          <div class="section-heading">
            <div>
              <p class="eyebrow">DART VADER</p>
              <h2>Your roster at a glance</h2>
            </div>
            <span class="quiet-tag">{{ mine.length }} players</span>
          </div>
          <p class="section-intro">
            Current roster, including reserve players. Scores are for the
            selected week.
          </p>
          <div class="player-grid">
            <PlayerCard
              v-for="player in mine"
              :key="player.id"
              :player="player"
              :current="snapshot.roster.starters.includes(player.id)"
            />
          </div>
        </section>
        <AdvisorChat
          v-if="evidence"
          :evidence="evidence"
          :disabled="loading || !!error"
        />
        <section id="league-scoring" class="panel scoring-panel">
          <details>
            <summary>
              <span
                ><span class="eyebrow">THE RULEBOOK</span>
                <h2>Your live RFL scoring</h2></span
              ><span>Expand +</span>
            </summary>
            <p>
              Loaded from Sleeper, not the pasted scoring summary. Rates below
              are per recorded stat unit.
            </p>
            <div class="rules-grid">
              <div
                v-for="(rate, key) in snapshot.league.scoring_settings"
                :key="key"
              >
                <span>{{ statLabel(key) }}</span
                ><strong>{{ rate > 0 ? "+" : "" }}{{ rate }}</strong>
              </div>
            </div>
            <h3>Roster limits</h3>
            <p>{{ snapshot.league.roster_positions.join(" · ") }}</p>
            <div class="rules-grid">
              <div
                v-for="position in ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']"
                :key="position"
              >
                <span>{{ position }}</span
                ><strong>{{
                  snapshot.league.settings[
                    `position_limit_${position.toLowerCase()}`
                  ] || "No position cap"
                }}</strong>
              </div>
            </div>
          </details>
        </section>
      </template>
    </main>
    <footer class="rfl-footer">
      <span>RFL / BUILT FOR YOUR LEAGUE</span>
      <p>
        Independent analysis. Sleeper remains the source for transactions and
        official scores.
      </p>
    </footer>
  </div>
</template>

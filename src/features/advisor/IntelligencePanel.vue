<script setup lang="ts">
import type { buildIntelligence } from "./intelligence";
defineProps<{ insights: ReturnType<typeof buildIntelligence> }>();
const emit = defineEmits<{ ask: [question: string] }>();
</script>
<template>
  <section class="ad-card" aria-label="Football intelligence">
    <div class="ad-row">
      <div>
        <p class="ad-kicker">FROM EVIDENCE TO ACTION</p>
        <h2>Your weekly research desk</h2>
      </div>
      <button
        @click="
          emit(
            'ask',
            'Turn the intelligence findings into three prioritized actions. Explain what is observed and what still needs checking.',
          )
        "
      >
        Explain my next steps
      </button>
    </div>
    <p class="ad-muted">
      Start with roster issues, then investigate opportunity. These are research
      signals, not automatic moves.
    </p>
    <div class="ad-grid" style="margin-top: 16px">
      <article class="ad-card">
        <p class="ad-kicker">SCORING COVERAGE</p>
        <h3>
          {{ insights.coverage.completeProjections }} /
          {{ insights.coverage.rosterPlayers }} roster players
        </h3>
        <p class="ad-muted">
          Have projections with all configured scoring categories covered.
        </p>
      </article>
      <article class="ad-card">
        <p class="ad-kicker">CHECK YOUR STARTERS</p>
        <h3>
          {{ insights.alerts.length + insights.emptySlots }} items to review
        </h3>
        <p class="ad-muted">
          Availability concerns and empty starting slots. Verify before kickoff.
        </p>
      </article>
      <article class="ad-card">
        <p class="ad-kicker">WAIVER WATCH</p>
        <h3>{{ insights.waiverWatch.length }} rising-usage players</h3>
        <p class="ad-muted">
          Currently unowned in this league, with more recent targets or carries.
        </p>
      </article>
    </div>
    <div
      v-if="insights.alerts.length || insights.emptySlots"
      class="ad-warning"
      style="margin: 16px 0"
    >
      <p v-if="insights.emptySlots">
        {{ insights.emptySlots }} starting slots are empty.
      </p>
      <p v-for="a in insights.alerts" :key="a.id">
        <strong>{{ a.name }}</strong> — {{ a.reason }}
      </p>
    </div>
    <h3 class="ad-subheading">Opportunities to investigate</h3>
    <div v-if="insights.waiverWatch.length" class="ad-grid">
      <article v-for="p in insights.waiverWatch" :key="p.id" class="ad-card">
        <p class="ad-kicker">{{ p.position }} · CURRENTLY UNOWNED</p>
        <h3>{{ p.name }}</h3>
        <p>
          <strong>{{ p.latestOpportunities }}</strong> targets + carries in Week
          {{ p.throughWeek }}
        </p>
        <p class="ad-muted">
          Previously {{ p.previousAverage.toFixed(1) }} per recorded week.
          {{ p.observedWeeks }}-week sample; usage is not fantasy points.
        </p>
      </article>
    </div>
    <p v-else class="ad-muted">
      No supported rising-usage waiver candidates in the available history. This
      does not mean there are no useful free agents.
    </p>
    <h3 class="ad-subheading">Buy-low / sell-high research</h3>
    <div v-if="insights.tradeSignals.length" class="ad-grid">
      <article v-for="s in insights.tradeSignals" :key="s.id" class="ad-card">
        <p class="ad-kicker">
          {{ s.kind }} signal ·
          {{ s.onMyTeam ? "YOUR ROSTER" : "LEAGUE PLAYER" }}
        </p>
        <h3>{{ s.name }}</h3>
        <p>
          {{ s.latest.toFixed(1) }} points in Week {{ s.throughWeek }}
          <span class="ad-muted"
            >vs {{ s.priorAverage.toFixed(1) }} prior average</span
          >
        </p>
        <p class="ad-muted">
          {{ s.priorWeeks }} previous weeks. Check role, injury status and both
          teams’ needs before proposing a trade.
        </p>
      </article>
    </div>
    <p v-else class="ad-muted">
      Trade signals need a latest scored week and at least two earlier weeks. No
      qualifying scoring change is available yet.
    </p>
    <details style="margin-top: 20px">
      <summary>Understand the evidence</summary>
      <p class="ad-muted">
        Recorded scores and usage describe the past. Projections are estimates.
        Rising usage requires at least eight targets plus carries and a rise of
        at least two over previous available weeks. Trade signals flag a latest
        score more than ten points above, or five below, the earlier average.
        None of these thresholds predicts a future outcome.
      </p>
      <p v-if="insights.coverage.unsupported.length" class="ad-warning">
        Unsupported scoring rules:
        {{ insights.coverage.unsupported.join(", ") }}. Projection comparisons
        may be incomplete.
      </p>
      <p v-if="insights.coverage.missing.length" class="ad-muted">
        Missing projected categories:
        {{ insights.coverage.missing.join(", ") }}.
      </p>
      <p class="ad-muted">
        Usage feed:
        {{
          insights.coverage.usageGeneratedAt
            ? new Date(insights.coverage.usageGeneratedAt).toLocaleString()
            : "Unavailable"
        }}. Only weeks before the selected week are used. Ownership and
        availability reflect the latest snapshot, not archived historical
        rosters.
      </p>
    </details>
  </section>
</template>

<script setup lang="ts">
import type { RflPlayer } from "@/features/rfl/types";
defineProps<{
  players: RflPlayer[];
  watchlist: string[];
  compared: string[];
}>();
defineEmits<{
  watch: [id: string];
  compare: [id: string];
  ask: [player: RflPlayer];
}>();
</script>
<template>
  <div class="ad-player-list">
    <article v-for="p in players" :key="p.id" class="ad-player">
      <span class="ad-position">{{ p.position }}</span>
      <div class="ad-player-name">
        <h3>{{ p.name }}</h3>
        <p class="ad-muted">
          {{ p.team || "No team" }} ·
          {{ p.opponent ? `vs ${p.opponent}` : "No opponent" }}
          <span v-if="p.injury">· {{ p.injury }}</span>
        </p>
        <small v-if="p.score.missing.length" class="ad-warning"
          >{{ p.score.missing.length }} missing scoring categories</small
        >
      </div>
      <div class="ad-points">
        <strong>{{ p.projection?.toFixed(1) ?? "—" }}</strong
        ><small>projected</small>
      </div>
      <div class="ad-actions">
        <button
          :aria-pressed="watchlist.includes(p.id)"
          :aria-label="`Watch ${p.name}`"
          @click="$emit('watch', p.id)"
        >
          {{ watchlist.includes(p.id) ? "★ Watching" : "☆ Watch" }}</button
        ><button
          :aria-pressed="compared.includes(p.id)"
          :disabled="!compared.includes(p.id) && compared.length >= 3"
          @click="$emit('compare', p.id)"
        >
          {{ compared.includes(p.id) ? "Compared" : "Compare" }}</button
        ><button @click="$emit('ask', p)">Ask AI</button>
      </div>
    </article>
    <p v-if="!players.length" class="ad-muted ad-empty">
      No players match these filters.
    </p>
  </div>
</template>

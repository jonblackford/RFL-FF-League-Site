<script setup lang="ts">
import { type Component } from "vue";
import {
  Move3D,
  FlaskConical,
  ChartNoAxesCombined,
  FolderClock,
  TrendingUp,
  Trophy,
} from "@lucide/vue";

type ToolSummary = {
  title: string;
  description: string;
  icon: Component;
};

const toolSummaries: ToolSummary[] = [
  {
    title: "Power rankings and standings",
    description:
      "Compare teams by record, scoring, expected wins, power rankings, and roster strength.",
    icon: ChartNoAxesCombined,
  },
  {
    title: "League news and trends",
    description:
      "Review current storylines, scoring pace, standings movement, and matchup context.",
    icon: TrendingUp,
  },
  {
    title: "Roster and player values",
    description:
      "Compare roster strength and rank every rostered player using league specific context.",
    icon: Move3D,
  },
  {
    title: "Playoff odds",
    description:
      "Calculate each team's path to the bracket with final placement odds and simulated outcomes.",
    icon: Trophy,
  },
  {
    title: "Trade Finder",
    description:
      "Compare packages and discover deals projected to improve both teams.",
    icon: FlaskConical,
  },
  {
    title: "League history",
    description:
      "Review all-time records, H2H matchups, and manager rivalries.",
    icon: FolderClock,
  },
];
</script>

<template>
  <div class="relative z-10 px-4 pt-12 pb-16 sm:px-8 sm:pt-0 lg:px-12">
    <div class="w-full mx-auto text-left space-y-14 max-w-7xl">
      <section
        aria-labelledby="intro-league-heading"
        class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start"
      >
        <div class="max-w-xl mx-auto">
          <h2
            id="intro-league-heading"
            class="text-3xl font-bold md:text-4xl"
          >
            Built around your league, not a public product
          </h2>
          <p class="mt-4 leading-7 sm:text-lg text-muted-foreground">
            RFL Agent is set up for the league members who need quick access to
            standings, player values, manager history, trades, playoffs, and
            weekly context in one place.
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-3">
          <div class="p-4 border rounded-card bg-background/80">
            <p class="text-sm font-semibold">League home base</p>
            <p class="mt-2 text-sm leading-6 text-muted-foreground">
              Open the current RFL league and jump straight into the data that
              matters for the season.
            </p>
          </div>
          <div class="p-4 border rounded-card bg-background/80">
            <p class="text-sm font-semibold">Scoring aware</p>
            <p class="mt-2 text-sm leading-6 text-muted-foreground">
              Player reviews and rankings adjust around league scoring and
              roster settings.
            </p>
          </div>
          <div class="p-4 border rounded-card bg-background/80">
            <p class="text-sm font-semibold">Built for league chat</p>
            <p class="mt-2 text-sm leading-6 text-muted-foreground">
              Use the rankings, matchups, rivalries, and trends as shared
              context for weekly decisions.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="intro-tools-heading" class="pt-4">
        <div class="max-w-3xl mx-auto text-center">
          <h2
            id="intro-tools-heading"
            class="mt-3 text-3xl font-bold md:text-4xl"
          >
            Explore your league from every angle
          </h2>
          <p
            class="max-w-2xl mx-auto mt-4 leading-7 sm:text-lg text-muted-foreground"
          >
            Find out who is actually dominant, who is getting lucky, and which
            teams are closer to a title than their record suggests.
          </p>
        </div>

        <div class="mt-12 bg-transparent tool-grid border-x border-border/80">
          <div
            v-for="tool in toolSummaries"
            :key="tool.title"
            class="p-8 transition-colors tool-cell group hover:bg-muted/20"
          >
            <component :is="tool.icon" class="transition-colors size-6" />
            <h3 class="text-xl font-semibold mt-7">
              {{ tool.title }}
            </h3>
            <p class="max-w-sm mt-4 text-sm leading-6 text-muted-foreground">
              {{ tool.description }}
            </p>
          </div>
          <div class="feature-cell">
            <div class="max-w-3xl">
              <h3 class="mt-2 text-2xl font-semibold">
                League features for members who want more
              </h3>
              <p class="mt-4 text-sm leading-6 text-muted-foreground">
                Use your league's history, scoring settings, matchups, and
                roster data to review manager profiles, player values, trade
                options, start/sit calls, and season trends without account
                upgrade prompts.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.tool-grid {
  display: grid;
  grid-template-columns: 1fr;
}

.tool-cell {
  position: relative;
}

.tool-cell::before {
  content: "";
  position: absolute;
  top: 8rem;
  left: -1px;
  width: 6px;
  height: 2.25rem;
  border-radius: 0 999px 999px 0;
  background: hsl(var(--border));
  transition: background-color 180ms ease;
}

.tool-cell:hover::before {
  background: hsl(var(--foreground) / 0.28);
}

.tool-cell:not(:last-child) {
  border-bottom: 1px solid hsl(var(--border) / 0.8);
}

.feature-cell {
  grid-column: 1 / -1;
  padding: 2rem;
}

@media (min-width: 640px) {
  .tool-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .tool-cell:nth-child(odd) {
    border-right: 1px solid hsl(var(--border) / 0.8);
  }

  .tool-cell:nth-last-child(2) {
    border-bottom: 1px solid hsl(var(--border) / 0.8);
  }
}

@media (min-width: 1024px) {
  .tool-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .tool-cell:nth-child(odd) {
    border-right: 0;
  }

  .tool-cell:not(:nth-child(3n)) {
    border-right: 1px solid hsl(var(--border) / 0.8);
  }

  .tool-cell:nth-child(n + 4) {
    border-bottom: 1px solid hsl(var(--border) / 0.8);
  }
}
</style>

<script setup lang="ts">
import PublicPageShell from '@/components/seo/PublicPageShell.vue';
import { Button } from '@/components/ui/button';
</script>
<template><PublicPageShell><section class="mx-auto max-w-4xl px-4 py-12"><p class="text-sm font-semibold text-primary">RFL Agent</p><h1 class="mt-3 text-4xl font-bold">Find a trade worth discussing</h1><p class="mt-5 text-lg text-muted-foreground">Explore possible trades using your league’s rosters and available player data.</p><div class="my-8 grid gap-4"><p class="rounded-xl border p-5">Browse players, compare both sides and explore trade suggestions.</p><p class="rounded-xl border p-5">See the assumptions behind the comparison before making a decision.</p><p class="rounded-xl border p-5">Ask the advisor to explain the trade. All tools are available without a subscription.</p></div><Button as-child><RouterLink to="/?destination=trade_finder">Open league analyzer</RouterLink></Button></section></PublicPageShell></template>

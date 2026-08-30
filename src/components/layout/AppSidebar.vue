<script setup lang="ts">
import { computed, type Component } from "vue";
import type { SidebarProps } from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  ChartColumn,
  ChartNoAxesCombined,
  FolderClock,
  Gift,
  Home,
  Move3D,
  Newspaper,
  NotebookPen,
  TicketPercent,
  Trophy,
  Users,
  Dices,
  FlaskConical,
  IdCard,
  ListOrdered,
} from "@lucide/vue";
import { Separator } from "../ui/separator";
import { useStore } from "../../store/store";
import { useRoute, useRouter } from "vue-router";
import { clearPendingCheckout } from "@/lib/pendingCheckout";
import { sidebarLeagueFeatures, type LeagueFeature } from "@/lib/features";

const store = useStore();
const route = useRoute();
const router = useRouter();
const props = defineProps<SidebarProps>();
const { isMobile, setOpenMobile } = useSidebar();

const defaultRouteQuery = computed(() => {
  const {
    intent,
    upgrade_source,
    destination,
    tradeMode,
    tradePlayerId,
    tradeRosterId,
    ...query
  } = route.query;
  return query;
});

const closeMobileSidebar = () => {
  if (isMobile.value) {
    setOpenMobile(false);
  }
};

const goBackToHome = () => {
  router.push({ path: "/", query: defaultRouteQuery.value });
};

const changeTab = (tab: LeagueFeature) => {
  clearPendingCheckout();
  if (route.path !== "/") {
    goBackToHome();
  } else if (
    route.query.intent ||
    route.query.upgrade_source ||
    route.query.destination ||
    route.query.tradeMode ||
    route.query.tradePlayerId ||
    route.query.tradeRosterId
  ) {
    router.replace({ path: "/", query: defaultRouteQuery.value });
  }
  store.currentTab = tab;
  localStorage.setItem("currentTab", tab);
  closeMobileSidebar();
};

const featureIcons: Record<LeagueFeature, Component> = {
  Home,
  Standings: ChartColumn,
  "Power Rankings": ChartNoAxesCombined,
  "Expected Wins": TicketPercent,
  "Roster Management": Move3D,
  "Weekly Report": NotebookPen,
  Playoffs: Trophy,
  "Player Values": ListOrdered,
  "Trade Lab": FlaskConical,
  "Start/Sit": Newspaper,
  "Season Forecast": Dices,
  Draft: Users,
  "League History": FolderClock,
  "Manager Profiles": IdCard,
  Wrapped: Gift,
  ESPN: ChartColumn,
};

const data = computed(() => ({
  navMain: [
    {
      items: sidebarLeagueFeatures
        .filter(({ id }) => store.isLeagueFeatureVisible(id))
        .map(({ id: title }) => ({
          title,
          icon: featureIcons[title],
        })),
    },
  ],
}));
</script>

<template>
  <Sidebar v-bind="props">
    <SidebarHeader
      ><SidebarMenu>
        <SidebarMenuItem>
          <div class="flex items-center ml-2 mt-1.5">
            <img
              height="32"
              width="32"
              src="../../assets/logo.webp"
              class="-mx-1"
              alt="RFL Agent logo"
            />
            <span
              class="self-center -mb-1.5 ml-2.5 custom-font whitespace-nowrap"
              >RFL Agent</span
            >
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>

    <Separator
      orientation="horizontal"
      class="mr-2 mt-2 data-[orientation=vertical]:h-4"
    />
    <SidebarContent>
      <SidebarGroup v-for="item in data.navMain">
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem
              v-for="childItem in item.items"
              :key="childItem.title"
            >
              <SidebarMenuButton
                v-if="childItem.title !== 'Home'"
                as-child
                :is-active="
                  route.path === '/' && store.currentTab === childItem.title
                "
                @click="changeTab(childItem.title)"
                class="cursor-pointer"
              >
                <div>
                  <component :is="childItem.icon" v-if="childItem.icon" />
                  <p>
                    {{ childItem.title }}
                  </p>
                </div>
              </SidebarMenuButton>
              <SidebarMenuButton
                v-else-if="
                  !store.currentLeagueId &&
                  !route.query.leagueId &&
                  !store.loadingLeague
                "
                as-child
                :is-active="
                  store.currentTab === childItem.title && route.path === '/'
                "
                @click="changeTab(childItem.title)"
                class="cursor-pointer"
              >
                <div>
                  <component :is="childItem.icon" v-if="childItem.icon" />
                  <p>
                    {{ childItem.title }}
                  </p>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
    <SidebarRail />
  </Sidebar>
</template>
<style scoped>
.custom-font {
  font-family: "Josefin Sans", sans-serif;
  font-optical-sizing: auto;
  font-weight: 600;
  font-style: normal;
  font-size: 1.6rem;
}
</style>

import { preferenceStorage } from "@/lib/storage";
import { ref, watch } from "vue";
import type { DynastyPerspective } from "@/lib/tradeFinder";

const storageKey = "dynastyTradePerspective";
const perspectives: DynastyPerspective[] = [
  "balanced",
  "contender",
  "rebuilder",
];

const getInitialPerspective = (): DynastyPerspective => {
  if (typeof window === "undefined") return "balanced";
  const saved = preferenceStorage.getItem(storageKey) as DynastyPerspective | null;
  return saved && perspectives.includes(saved) ? saved : "balanced";
};

const dynastyTradePerspective = ref<DynastyPerspective>(
  getInitialPerspective()
);

watch(dynastyTradePerspective, (perspective) => {
  if (typeof window !== "undefined") {
    preferenceStorage.setItem(storageKey, perspective);
  }
});

export const useDynastyTradePerspective = () => dynastyTradePerspective;

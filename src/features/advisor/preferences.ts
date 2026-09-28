export type AdvisorPreferences = { rosterId: number; watchlist: string[] };
export function readAdvisorPreferences(key: string): AdvisorPreferences {
  try {
    const v = JSON.parse(localStorage.getItem(`advisor:${key}`) || "{}");
    return {
      rosterId:
        Number.isInteger(v?.rosterId) && v.rosterId > 0 ? v.rosterId : 1,
      watchlist: Array.isArray(v?.watchlist)
        ? [
            ...new Set<string>(
              v.watchlist.filter(
                (s: unknown) => typeof s === "string" && s.length < 40,
              ),
            ),
          ].slice(0, 100)
        : [],
    };
  } catch {
    return { rosterId: 1, watchlist: [] };
  }
}
export function writeAdvisorPreferences(
  key: string,
  value: AdvisorPreferences,
) {
  try {
    localStorage.setItem(
      `advisor:${key}`,
      JSON.stringify({
        ...value,
        watchlist: [...new Set(value.watchlist)].slice(0, 100),
      }),
    );
  } catch {
    /* Preferences remain usable for this visit. */
  }
}

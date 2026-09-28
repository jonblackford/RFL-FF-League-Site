export type AdvisorMessage = {
  role: "user" | "model";
  text: string;
  fetchedAt: number;
};
export function conversationKey(
  selection: {
    provider: string;
    leagueId: string;
    rosterId: number;
    week?: number;
  },
  season: string,
) {
  return [
    selection.provider,
    selection.leagueId,
    season,
    selection.rosterId,
    selection.week,
  ].join(":");
}
export function createConversationSession() {
  const conversations = new Map<string, AdvisorMessage[]>();
  let generation = 0;
  let pending = false;
  function messages(key: string) {
    return conversations.get(key) || [];
  }
  function cancel() {
    generation++;
    pending = false;
  }
  function reset(key: string) {
    cancel();
    conversations.delete(key);
  }
  async function ask(
    key: string,
    question: string,
    fetchedAt: number,
    request: (history: AdvisorMessage[]) => Promise<string>,
  ) {
    if (pending || !question.trim()) return;
    const current = ++generation;
    pending = true;
    const prior = messages(key)
      .slice(-6)
      .map((m) => ({ ...m, text: m.text.slice(0, 4000) }));
    const existing = messages(key);
    conversations.set(key, [
      ...existing,
      { role: "user", text: question.slice(0, 1500), fetchedAt },
    ]);
    if (conversations.size > 20)
      conversations.delete(conversations.keys().next().value!);
    try {
      const text = await request(prior);
      if (current === generation)
        conversations.set(
          key,
          [...messages(key), { role: "model" as const, text, fetchedAt }].slice(
            -30,
          ),
        );
    } finally {
      if (current === generation) pending = false;
    }
  }
  return { messages, ask, cancel, reset };
}

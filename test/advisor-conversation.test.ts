import { expect, it } from "vitest";
import {
  createConversationSession,
  conversationKey,
} from "../src/features/advisor/conversation";
it("isolates answers by team and rejects canceled late results", async () => {
  const s = createConversationSession();
  let finish!: (v: string) => void;
  const a = conversationKey(
    { provider: "sleeper", leagueId: "111", rosterId: 1, week: 3 },
    "2026",
  );
  const b = conversationKey(
    { provider: "sleeper", leagueId: "222", rosterId: 1, week: 3 },
    "2026",
  );
  const pending = s.ask(
    a,
    "question",
    100,
    () => new Promise((r) => (finish = r)),
  );
  s.cancel();
  await s.ask(b, "other", 200, async () => "Answer B");
  finish("Answer A");
  await pending;
  expect(s.messages(a).filter((m) => m.role === "model")).toEqual([]);
  expect(s.messages(b).at(-1)?.text).toBe("Answer B");
});
it("supplies at most six prior messages and deduplicates an in-flight request", async () => {
  const s = createConversationSession();
  for (let i = 0; i < 5; i++)
    await s.ask("x", `q${i}`, 100, async () => `a${i}`);
  let history: any[] = [];
  await s.ask("x", "next", 200, async (h) => {
    history = h;
    return "done";
  });
  expect(history).toHaveLength(6);
  expect(history[0].text).toBe("q2");
});

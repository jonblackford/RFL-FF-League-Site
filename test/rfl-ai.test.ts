import { expect, it, vi } from "vitest";
import { createAdvisorHandler } from "../api/_lib/rflAdvisor";
const body = {
  question: "Who should I start?",
  evidence: {
    leagueId: "1394364555710181376",
    team: "Dart Vader",
    week: 3,
    season: "2026",
    fetchedAt: Date.now(),
    scoring: { kr_yd: 0.1 },
    players: [],
    lineup: [],
    waivers: [],
    warnings: ["Incomplete projections"],
  },
};
async function call(
  handler: ReturnType<typeof createAdvisorHandler>,
  value: unknown = body,
  method = "POST",
  authorization = "Bearer private-test",
) {
  let output = "";
  const headers: Record<string, string> = {};
  const res = {
    statusCode: 200,
    setHeader: (k: string, v: string) => {
      headers[k] = v;
    },
    end: (s?: string) => {
      output = s ?? "";
    },
  };
  await handler({ method, body: value, headers: { authorization } }, res);
  return { status: res.statusCode, body: JSON.parse(output), headers };
}
it("rejects methods, oversized input and wrong league before invoking provider", async () => {
  const handler = createAdvisorHandler({
    apiKey: "test",
    accessToken: "private-test",
    fetch: async () => {
      throw new Error("must not call");
    },
  });
  expect((await call(handler, body, "GET")).status).toBe(405);
  expect(
    (await call(handler, { ...body, question: "a".repeat(1501) })).status,
  ).toBe(400);
  expect(
    (
      await call(handler, {
        ...body,
        evidence: { ...body.evidence, leagueId: "other" },
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await call(handler, {
        ...body,
        evidence: { ...body.evidence, week: NaN },
      })
    ).status,
  ).toBe(400);
});
it("requires private instance access before provider usage", async () => {
  const handler = createAdvisorHandler({
    apiKey: "test",
    accessToken: "private-test",
  });
  expect((await call(handler, body, "POST", "")).status).toBe(401);
});
it("clearly reports missing configuration without fake AI", async () => {
  const result = await call(createAdvisorHandler({}));
  expect(result.status).toBe(503);
  expect(result.body.error).toContain("configured");
});
it("returns provider text with private caching and bounds the request", async () => {
  const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
    const sent = JSON.parse(init?.body as string);
    expect(sent.generationConfig.maxOutputTokens).toBeLessThanOrEqual(2048);
    expect(sent.systemInstruction.parts[0].text).toContain("untrusted");
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: { parts: [{ text: "Start the eligible player." }] },
            finishReason: "STOP",
          },
        ],
      }),
    );
  });
  const handler = createAdvisorHandler({
    apiKey: "test",
    accessToken: "private-test",
    fetch: fetcher,
  });
  const result = await call(handler);
  expect(result.body.answer).toBe("Start the eligible player.");
  expect(result.headers["Cache-Control"]).toContain("no-store");
  await call(handler);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("handles quota, timeout and malformed provider responses", async () => {
  for (const fetcher of [
    async () => new Response("", { status: 429 }),
    async () => {
      throw new Error("timeout");
    },
    async () => new Response("{}"),
  ]) {
    const result = await call(
      createAdvisorHandler({
        apiKey: "test",
        accessToken: "private-test",
        fetch: fetcher,
      }),
    );
    expect(result.status).toBe(503);
    expect(result.body.answer).toBeUndefined();
  }
});
it("throttles distinct questions without sending extra provider requests", async () => {
  const handler = createAdvisorHandler({
    apiKey: "test",
    accessToken: "private-test",
    fetch: async () =>
      new Response(
        JSON.stringify({
          candidates: [
            { content: { parts: [{ text: "Advice" }] }, finishReason: "STOP" },
          ],
        }),
      ),
  });
  for (let n = 0; n < 5; n++)
    expect(
      (await call(handler, { ...body, question: `Question ${n}` })).status,
    ).toBe(200);
  expect(
    (await call(handler, { ...body, question: "Question six" })).status,
  ).toBe(429);
});
it("explains retired models without exposing provider error bodies", async () => {
  const result = await call(
    createAdvisorHandler({
      apiKey: "test",
      accessToken: "private-test",
      fetch: async () =>
        new Response(
          JSON.stringify({ error: { message: "sensitive provider details" } }),
          { status: 404 },
        ),
    }),
  );
  expect(result.body.error).toContain("model");
  expect(result.body.error).not.toContain("sensitive");
});

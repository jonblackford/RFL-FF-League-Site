import { expect, it, vi } from "vitest";
import { requestGeminiAnswer } from "../src/features/rfl/gemini";

it("requests Gemini with the user's browser key", async () => {
  const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(init?.body as string);
    expect(init?.headers).toMatchObject({ "x-goog-api-key": "browser-key" });
    expect(body.contents[0].parts[0].text).toContain("Who should I start?");
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

  await expect(
    requestGeminiAnswer("browser-key", "Who should I start?", {}, { fetcher }),
  ).resolves.toBe("Start the eligible player.");
});

it("maps provider failures without exposing provider response text", async () => {
  for (const status of [400, 404, 429, 503]) {
    const fetcher = vi.fn(
      async () => new Response("secret provider details", { status }),
    );
    await expect(
      requestGeminiAnswer("browser-key", "Question", {}, { fetcher }),
    ).rejects.toThrow(
      status === 429
        ? "quota"
        : status === 404
          ? "model"
          : status === 400
            ? "key"
            : "unavailable",
    );
  }
});